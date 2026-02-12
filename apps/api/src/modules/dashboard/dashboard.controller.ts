import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { PermissionKey } from '../../types/permissions';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import DashboardService, {
  DASHBOARD_GROWTH_METRICS,
  type DashboardGrowthMetric,
  type DashboardGrowthWindow,
} from './dashboard.service';

type DashboardGrowthQuery = Readonly<{
  window?: string | string[];
  metrics?: string | string[];
  owner?: string | string[];
  ownerEmail?: string | string[];
  status?: string | string[];
}>;

const DEFAULT_GROWTH_WINDOW: DashboardGrowthWindow = 6;
const DEFAULT_GROWTH_METRICS: readonly DashboardGrowthMetric[] =
  DASHBOARD_GROWTH_METRICS;

const PERMISSION_BY_GROWTH_METRIC: Readonly<
  Record<DashboardGrowthMetric, PermissionKey>
> = Object.freeze({
  projects: 'projects.read',
  tasks: 'tasks.read',
  clients: 'clients.read',
});

const toQueryString = (raw: unknown): string => {
  if (Array.isArray(raw)) {
    return typeof raw[0] === 'string' ? raw[0].trim() : '';
  }
  return typeof raw === 'string' ? raw.trim() : '';
};

const parseGrowthWindow = (raw: unknown): DashboardGrowthWindow => {
  const value = Number.parseInt(toQueryString(raw), 10);
  if (value === 3 || value === 6 || value === 12) {
    return value;
  }
  return DEFAULT_GROWTH_WINDOW;
};

const toGrowthMetric = (token: string): DashboardGrowthMetric | null => {
  const normalized = token.trim().toLowerCase();
  if (
    normalized === 'projects' ||
    normalized === 'tasks' ||
    normalized === 'clients'
  ) {
    return normalized;
  }
  return null;
};

const parseGrowthMetrics = (raw: unknown): DashboardGrowthMetric[] => {
  const value = toQueryString(raw);
  if (!value) {
    return [...DEFAULT_GROWTH_METRICS];
  }

  const seen = new Set<DashboardGrowthMetric>();
  const metrics: DashboardGrowthMetric[] = [];
  const parts = value.split(',');
  for (const part of parts) {
    const metric = toGrowthMetric(part);
    if (!metric || seen.has(metric)) {
      continue;
    }
    seen.add(metric);
    metrics.push(metric);
  }

  return metrics.length ? metrics : [...DEFAULT_GROWTH_METRICS];
};

const parseOwnerFilter = (
  ownerRaw: unknown,
  ownerEmailRaw: unknown,
): string | undefined => {
  const owner = toQueryString(ownerRaw);
  if (owner) {
    return owner;
  }
  const ownerEmail = toQueryString(ownerEmailRaw);
  return ownerEmail || undefined;
};

const parseStatusFilters = (raw: unknown): string[] => {
  const value = toQueryString(raw);
  if (!value) {
    return [];
  }

  const statuses = new Set<string>();
  for (const token of value.split(',')) {
    const normalized = token.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    statuses.add(normalized);
  }

  return [...statuses];
};

@Controller('/dashboard')
@UseGuards(JwtAuthGuard)
export default class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('/growth')
  async growth(
    @Req()
    req: Request &
      Readonly<{
        user?: Readonly<{
          perms?: readonly string[];
        }>;
      }>,
    @Query() query: DashboardGrowthQuery,
  ) {
    const windowMonths = parseGrowthWindow(query?.window);
    const requestedMetrics = parseGrowthMetrics(query?.metrics);
    const ownerFilter = parseOwnerFilter(query?.owner, query?.ownerEmail);
    const statusFilters = parseStatusFilters(query?.status);

    const userPerms = new Set<string>(
      Array.isArray(req?.user?.perms)
        ? req.user.perms.map((perm) => String(perm))
        : [],
    );

    const availableMetrics = requestedMetrics.filter((metric) =>
      userPerms.has(PERMISSION_BY_GROWTH_METRIC[metric]),
    );
    const unavailableMetrics = requestedMetrics.filter(
      (metric) => !userPerms.has(PERMISSION_BY_GROWTH_METRIC[metric]),
    );

    if (!availableMetrics.length) {
      throw new ForbiddenException(
        'Insufficient permissions for requested growth metrics',
      );
    }

    const data = await this.dashboardService.getGrowth({
      windowMonths,
      metrics: availableMetrics,
      filters: {
        owner: ownerFilter,
        statuses: statusFilters,
      },
    });

    return {
      ...data,
      requestedMetrics,
      availableMetrics,
      unavailableMetrics,
      appliedFilters: {
        owner: ownerFilter ?? null,
        statuses: statusFilters,
      },
    };
  }
}
