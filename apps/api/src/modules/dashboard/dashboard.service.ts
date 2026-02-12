import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import ProjectEntity from '../../entities/ProjectEntity';
import TaskEntity from '../../entities/TaskEntity';
import ClientEntity from '../../entities/ClientEntity';

export const DASHBOARD_GROWTH_METRICS = [
  'projects',
  'tasks',
  'clients',
] as const;

export type DashboardGrowthMetric = (typeof DASHBOARD_GROWTH_METRICS)[number];
export type DashboardGrowthWindow = 3 | 6 | 12;
export type DashboardGrowthTrend = 'up' | 'down' | 'neutral';
export type DashboardGrowthFilters = Readonly<{
  owner?: string;
  statuses?: readonly string[];
}>;

type DashboardGrowthBucket = Readonly<{
  key: string;
  label: string;
}>;

type DashboardGrowthMetricPayload = Readonly<{
  counts: readonly number[];
  totalInWindow: number;
  currentMonth: number;
  previousMonth: number;
  momRatePct: number;
  trend: DashboardGrowthTrend;
}>;

export type DashboardGrowthResponse = Readonly<{
  windowMonths: DashboardGrowthWindow;
  buckets: readonly DashboardGrowthBucket[];
  metrics: Readonly<Partial<Record<DashboardGrowthMetric, DashboardGrowthMetricPayload>>>;
  generatedAt: string;
}>;

const MONTH_LABELS_PT_BR = Object.freeze([
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]);

type MonthAggregateRow = Readonly<{
  _id?: unknown;
  count?: unknown;
}>;

type DashboardGrowthCacheEntry = Readonly<{
  expiresAt: number;
  value: DashboardGrowthResponse;
}>;

const DASHBOARD_GROWTH_CACHE_TTL_MS = 30_000;
const DASHBOARD_GROWTH_CACHE_MAX_ENTRIES = 300;

const normalizeMetrics = (
  metrics: readonly DashboardGrowthMetric[],
): DashboardGrowthMetric[] => {
  const seen = new Set<DashboardGrowthMetric>();
  const normalized: DashboardGrowthMetric[] = [];
  for (const metric of metrics) {
    if (!DASHBOARD_GROWTH_METRICS.includes(metric)) {
      continue;
    }
    if (seen.has(metric)) {
      continue;
    }
    seen.add(metric);
    normalized.push(metric);
  }
  return normalized;
};

@Injectable()
export default class DashboardService {
  private readonly growthCache = new Map<string, DashboardGrowthCacheEntry>();

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepo: MongoRepository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private readonly tasksRepo: MongoRepository<TaskEntity>,
    @InjectRepository(ClientEntity)
    private readonly clientsRepo: MongoRepository<ClientEntity>,
  ) {}

  async getGrowth(input: {
    windowMonths: DashboardGrowthWindow;
    metrics: readonly DashboardGrowthMetric[];
    filters?: DashboardGrowthFilters;
  }): Promise<DashboardGrowthResponse> {
    const metrics = normalizeMetrics(input.metrics);
    const normalizedFilters = this.normalizeFilters(input.filters);
    const cacheKey = this.buildCacheKey(
      input.windowMonths,
      metrics,
      normalizedFilters,
    );
    const nowMs = Date.now();
    const cached = this.growthCache.get(cacheKey);
    if (cached && cached.expiresAt > nowMs) {
      return cached.value;
    }

    const { buckets, rangeStart, rangeEndExclusive } = this.buildBuckets(
      input.windowMonths,
    );

    const metricEntries = await Promise.all(
      metrics.map(async (metric) => {
        const countsByMonth = await this.aggregateMetricCounts(
          metric,
          rangeStart,
          rangeEndExclusive,
          normalizedFilters,
        );
        const counts = buckets.map((bucket) => countsByMonth.get(bucket.key) ?? 0);
        return [metric, this.buildMetricPayload(counts)] as const;
      }),
    );

    const payload: Partial<
      Record<DashboardGrowthMetric, DashboardGrowthMetricPayload>
    > = {};
    for (const [metric, value] of metricEntries) {
      payload[metric] = value;
    }

    const response: DashboardGrowthResponse = {
      windowMonths: input.windowMonths,
      buckets: buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
      })),
      metrics: payload,
      generatedAt: new Date().toISOString(),
    };

    this.pruneGrowthCache(nowMs);
    this.growthCache.set(cacheKey, {
      expiresAt: nowMs + DASHBOARD_GROWTH_CACHE_TTL_MS,
      value: response,
    });

    return response;
  }

  private buildMetricPayload(counts: readonly number[]): DashboardGrowthMetricPayload {
    const currentMonth = counts[counts.length - 1] ?? 0;
    const previousMonth = counts[counts.length - 2] ?? 0;
    const totalInWindow = counts.reduce((sum, value) => sum + value, 0);

    const momRateRaw =
      previousMonth === 0
        ? currentMonth === 0
          ? 0
          : 100
        : ((currentMonth - previousMonth) / previousMonth) * 100;
    const momRatePct = Number.isFinite(momRateRaw)
      ? Number(momRateRaw.toFixed(1))
      : 0;
    const trend: DashboardGrowthTrend =
      momRatePct > 2 ? 'up' : momRatePct < -2 ? 'down' : 'neutral';

    return {
      counts,
      totalInWindow,
      currentMonth,
      previousMonth,
      momRatePct,
      trend,
    };
  }

  private buildBuckets(windowMonths: DashboardGrowthWindow): {
    buckets: DashboardGrowthBucket[];
    rangeStart: Date;
    rangeEndExclusive: Date;
  } {
    const now = new Date();
    const currentMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    const rangeStart = new Date(currentMonthStart);
    rangeStart.setUTCMonth(rangeStart.getUTCMonth() - (windowMonths - 1));

    const rangeEndExclusive = new Date(currentMonthStart);
    rangeEndExclusive.setUTCMonth(rangeEndExclusive.getUTCMonth() + 1);

    const buckets: DashboardGrowthBucket[] = [];
    for (let offset = windowMonths - 1; offset >= 0; offset -= 1) {
      const monthDate = new Date(currentMonthStart);
      monthDate.setUTCMonth(monthDate.getUTCMonth() - offset);
      buckets.push({
        key: this.toBucketKey(monthDate),
        label: this.toBucketLabel(monthDate),
      });
    }

    return { buckets, rangeStart, rangeEndExclusive };
  }

  private async aggregateMetricCounts(
    metric: DashboardGrowthMetric,
    rangeStart: Date,
    rangeEndExclusive: Date,
    filters: Readonly<{ owner?: string; statuses: readonly string[] }>,
  ): Promise<ReadonlyMap<string, number>> {
    const repo = this.repoByMetric(metric);
    const metricMatch = this.buildMetricMatch(metric, filters);
    const cursor = repo.aggregate(
      [
        {
          $addFields: {
            _createdAtDate: {
              $cond: [
                { $eq: [{ $type: '$createdAt' }, 'date'] },
                '$createdAt',
                {
                  $dateFromString: {
                    dateString: '$createdAt',
                    onError: null,
                    onNull: null,
                  },
                },
              ],
            },
          },
        },
        {
          $match: {
            _createdAtDate: {
              $gte: rangeStart,
              $lt: rangeEndExclusive,
            },
            ...metricMatch,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$_createdAtDate',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ] as any,
    );

    const rows = (await cursor.toArray()) as MonthAggregateRow[];
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (typeof row?._id !== 'string') {
        continue;
      }
      const value = Number(row.count ?? 0);
      counts.set(row._id, Number.isFinite(value) ? Math.max(0, value) : 0);
    }
    return counts;
  }

  private repoByMetric(
    metric: DashboardGrowthMetric,
  ): MongoRepository<any> {
    switch (metric) {
      case 'projects':
        return this.projectsRepo;
      case 'tasks':
        return this.tasksRepo;
      case 'clients':
        return this.clientsRepo;
      default:
        return this.projectsRepo;
    }
  }

  private toBucketKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private toBucketLabel(date: Date): string {
    return MONTH_LABELS_PT_BR[date.getUTCMonth()] || 'N/A';
  }

  private normalizeFilters(
    filters?: DashboardGrowthFilters,
  ): Readonly<{ owner?: string; statuses: readonly string[] }> {
    const ownerRaw = typeof filters?.owner === 'string' ? filters.owner.trim() : '';
    const owner = ownerRaw ? ownerRaw : undefined;

    const statusTokens = Array.isArray(filters?.statuses) ? filters.statuses : [];
    const statuses = Array.from(
      new Set(
        statusTokens
          .map((status) =>
            typeof status === 'string' ? status.trim().toLowerCase() : '',
          )
          .filter((status) => status.length > 0),
      ),
    );

    return {
      owner,
      statuses,
    };
  }

  private buildMetricMatch(
    metric: DashboardGrowthMetric,
    filters: Readonly<{ owner?: string; statuses: readonly string[] }>,
  ): Record<string, unknown> {
    const match: Record<string, unknown> = {};

    if (filters.owner) {
      if (metric === 'projects') {
        match.ownerEmail = filters.owner;
      } else if (metric === 'tasks') {
        match.assigneeEmail = filters.owner;
      }
    }

    if (
      filters.statuses.length > 0 &&
      (metric === 'projects' || metric === 'tasks')
    ) {
      match.status = { $in: filters.statuses };
    }

    return match;
  }

  private buildCacheKey(
    windowMonths: DashboardGrowthWindow,
    metrics: readonly DashboardGrowthMetric[],
    filters: Readonly<{ owner?: string; statuses: readonly string[] }>,
  ): string {
    const metricKey = metrics.join(',');
    const ownerKey = (filters.owner || '').toLowerCase();
    const statusesKey = [...filters.statuses].sort().join(',');
    return `${windowMonths}|${metricKey}|${ownerKey}|${statusesKey}`;
  }

  private pruneGrowthCache(nowMs: number): void {
    for (const [key, entry] of this.growthCache.entries()) {
      if (entry.expiresAt <= nowMs) {
        this.growthCache.delete(key);
      }
    }

    if (this.growthCache.size <= DASHBOARD_GROWTH_CACHE_MAX_ENTRIES) {
      return;
    }

    const keys = this.growthCache.keys();
    while (this.growthCache.size > DASHBOARD_GROWTH_CACHE_MAX_ENTRIES) {
      const next = keys.next();
      if (next.done) {
        break;
      }
      this.growthCache.delete(next.value);
    }
  }
}
