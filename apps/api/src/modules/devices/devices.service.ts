import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import DeviceEntity, {
  type DeviceKind,
  type DeviceStatus,
} from '../../entities/DeviceEntity';

const VALID_DEVICE_KINDS: readonly DeviceKind[] = ['physical', 'virtual'];
const VALID_DEVICE_STATUSES: readonly DeviceStatus[] = [
  'online',
  'offline',
  'maintenance',
];
const VALID_DEVICE_SORT_FIELDS = [
  'updatedAt',
  'lastSeenAt',
  'name',
  'status',
  'kind',
  'vendor',
] as const;
type DeviceSortField = (typeof VALID_DEVICE_SORT_FIELDS)[number];
type DeviceSortDirection = 'asc' | 'desc';

interface DeviceAnalyticsEntry {
  label: string;
  value: number;
}

interface DeviceAnalyticsDailyPoint {
  date: string;
  total: number;
  online: number;
  offline: number;
  maintenance: number;
}

export interface DeviceAnalyticsPayload {
  total: number;
  status: Record<DeviceStatus, number>;
  kind: Record<DeviceKind, number>;
  topVendors: DeviceAnalyticsEntry[];
  topOperatingSystems: DeviceAnalyticsEntry[];
  topTags: DeviceAnalyticsEntry[];
  activityByDay: DeviceAnalyticsDailyPoint[];
}

const clampInt = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  const normalized =
    typeof value === 'number'
      ? Math.trunc(value)
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : fallback;
  if (!Number.isFinite(normalized)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, normalized));
};

const sanitizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const sanitizeTags = (tags: unknown): string[] | undefined => {
  if (!Array.isArray(tags)) {
    return undefined;
  }
  const cleaned = tags
    .map((tag) => sanitizeString(tag))
    .filter((tag): tag is string => !!tag);
  return cleaned.length > 0 ? cleaned : [];
};

const sanitizeSortBy = (value: unknown): DeviceSortField => {
  if (
    typeof value === 'string' &&
    VALID_DEVICE_SORT_FIELDS.includes(value as DeviceSortField)
  ) {
    return value as DeviceSortField;
  }
  return 'updatedAt';
};

const sanitizeSortDir = (value: unknown): DeviceSortDirection =>
  typeof value === 'string' && value.toLowerCase() === 'asc' ? 'asc' : 'desc';

const fallbackLabel = (value: unknown, fallback: string): string => {
  const normalized = sanitizeString(value);
  return normalized ?? fallback;
};

const pad2 = (value: number): string => String(value).padStart(2, '0');

const toIsoDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
};

const buildRecentDayKeys = (days: number): string[] => {
  const normalizedDays = clampInt(days, 30, 7, 60);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const keys: string[] = [];
  for (let offset = normalizedDays - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(today);
    cursor.setUTCDate(today.getUTCDate() - offset);
    keys.push(
      `${cursor.getUTCFullYear()}-${pad2(cursor.getUTCMonth() + 1)}-${pad2(cursor.getUTCDate())}`,
    );
  }
  return keys;
};

const sortTopEntries = (
  counts: ReadonlyMap<string, number>,
  limit: number,
): DeviceAnalyticsEntry[] => {
  const normalizedLimit = clampInt(limit, 6, 3, 12);
  return [...counts.entries()]
    .sort(
      (left, right) =>
        right[1] - left[1] || left[0].localeCompare(right[0], 'pt-BR'),
    )
    .slice(0, normalizedLimit)
    .map(([label, value]) => ({ label, value }));
};

const buildWhere = (
  ownerEmail: string,
  args?: Readonly<{
    q?: string;
    status?: string;
    kind?: string;
  }>,
): Record<string, unknown> => {
  const where: Record<string, unknown> = { ownerEmail };
  const search = sanitizeString(args?.q);
  if (search) {
    where.name = { $regex: new RegExp(search, 'i') };
  }
  if (
    typeof args?.status === 'string' &&
    VALID_DEVICE_STATUSES.includes(args.status as DeviceStatus)
  ) {
    where.status = args.status;
  }
  if (
    typeof args?.kind === 'string' &&
    VALID_DEVICE_KINDS.includes(args.kind as DeviceKind)
  ) {
    where.kind = args.kind;
  }
  return where;
};

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(DeviceEntity)
    private readonly repo: MongoRepository<DeviceEntity>,
  ) {}

  async list(
    ownerEmail: string,
    args?: Readonly<{
      q?: string;
      status?: string;
      kind?: string;
      page?: string | number;
      pageSize?: string | number;
      sortBy?: string;
      sortDir?: string;
    }>,
  ): Promise<{
    items: DeviceEntity[];
    total: number;
    page: number;
    pageSize: number;
    nextCursor: string | null;
    sortBy: DeviceSortField;
    sortDir: DeviceSortDirection;
  }> {
    const normalizedOwnerEmail = sanitizeString(ownerEmail)?.toLowerCase();
    if (!normalizedOwnerEmail) {
      throw new BadRequestException('Owner email is required');
    }

    const where = buildWhere(normalizedOwnerEmail, args);

    const requestedPage = clampInt(args?.page, 1, 1, 10_000);
    const pageSize = clampInt(args?.pageSize, 10, 5, 50);
    const sortBy = sanitizeSortBy(args?.sortBy);
    const sortDir = sanitizeSortDir(args?.sortDir);

    const loadPage = (page: number): Promise<[DeviceEntity[], number]> =>
      this.repo.findAndCount({
        where: where as any,
        skip: (page - 1) * pageSize,
        take: pageSize,
        order: {
          [sortBy]: sortDir === 'asc' ? 1 : -1,
        } as any,
      });

    let page = requestedPage;
    let [items, total] = await loadPage(page);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (total > 0 && page > totalPages) {
      page = totalPages;
      [items, total] = await loadPage(page);
    }

    return {
      items,
      total,
      page,
      pageSize,
      nextCursor: page * pageSize < total ? String(page + 1) : null,
      sortBy,
      sortDir,
    };
  }

  async analytics(
    ownerEmail: string,
    args?: Readonly<{
      q?: string;
      status?: string;
      kind?: string;
      days?: string | number;
      top?: string | number;
    }>,
  ): Promise<DeviceAnalyticsPayload> {
    const normalizedOwnerEmail = sanitizeString(ownerEmail)?.toLowerCase();
    if (!normalizedOwnerEmail) {
      throw new BadRequestException('Owner email is required');
    }

    const where = buildWhere(normalizedOwnerEmail, args);
    const dayKeys = buildRecentDayKeys(clampInt(args?.days, 30, 7, 60));
    const topLimit = clampInt(args?.top, 6, 3, 12);

    const dailyTotals = new Map<
      string,
      { total: number; online: number; offline: number; maintenance: number }
    >();
    dayKeys.forEach((dayKey) =>
      dailyTotals.set(dayKey, {
        total: 0,
        online: 0,
        offline: 0,
        maintenance: 0,
      }),
    );

    const status = {
      online: 0,
      offline: 0,
      maintenance: 0,
    } as Record<DeviceStatus, number>;
    const kind = {
      physical: 0,
      virtual: 0,
    } as Record<DeviceKind, number>;
    const vendorCounts = new Map<string, number>();
    const osCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    const bump = (target: Map<string, number>, key: string): void => {
      target.set(key, (target.get(key) ?? 0) + 1);
    };

    const items = await this.repo.find({
      where: where as any,
    });

    items.forEach((item) => {
      const normalizedStatus: DeviceStatus = VALID_DEVICE_STATUSES.includes(
        item.status,
      )
        ? item.status
        : 'offline';
      const normalizedKind: DeviceKind = VALID_DEVICE_KINDS.includes(item.kind)
        ? item.kind
        : 'physical';

      status[normalizedStatus] += 1;
      kind[normalizedKind] += 1;

      bump(vendorCounts, fallbackLabel(item.vendor, 'Nao informado'));
      bump(osCounts, fallbackLabel(item.operatingSystem, 'Nao informado'));

      const tags = Array.isArray(item.tags) ? item.tags : [];
      if (tags.length === 0) {
        bump(tagCounts, 'Sem tag');
      } else {
        tags.forEach((tag) => bump(tagCounts, fallbackLabel(tag, 'Sem tag')));
      }

      const dateKey = toIsoDate(item.lastSeenAt ?? item.updatedAt);
      if (!dateKey || !dailyTotals.has(dateKey)) {
        return;
      }
      const bucket = dailyTotals.get(dateKey);
      if (!bucket) {
        return;
      }
      bucket.total += 1;
      bucket[normalizedStatus] += 1;
    });

    return {
      total: items.length,
      status,
      kind,
      topVendors: sortTopEntries(vendorCounts, topLimit),
      topOperatingSystems: sortTopEntries(osCounts, topLimit),
      topTags: sortTopEntries(tagCounts, topLimit),
      activityByDay: dayKeys.map((dayKey) => {
        const bucket = dailyTotals.get(dayKey) ?? {
          total: 0,
          online: 0,
          offline: 0,
          maintenance: 0,
        };
        return {
          date: dayKey.slice(5),
          total: bucket.total,
          online: bucket.online,
          offline: bucket.offline,
          maintenance: bucket.maintenance,
        };
      }),
    };
  }

  async findOne(id: string, ownerEmail: string): Promise<DeviceEntity> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) {
      throw new BadRequestException('Invalid id');
    }
    const normalizedOwnerEmail = sanitizeString(ownerEmail)?.toLowerCase();
    if (!normalizedOwnerEmail) {
      throw new BadRequestException('Owner email is required');
    }
    const found = await this.repo.findOne({
      where: { _id: oid, ownerEmail: normalizedOwnerEmail } as any,
    });
    if (!found) {
      throw new NotFoundException('Device not found');
    }
    return found;
  }

  async create(ownerEmail: string, dto: any): Promise<DeviceEntity> {
    const normalizedOwnerEmail = sanitizeString(ownerEmail)?.toLowerCase();
    if (!normalizedOwnerEmail) {
      throw new BadRequestException('Owner email is required');
    }
    const name = sanitizeString(dto?.name);
    if (!name) {
      throw new BadRequestException('Name is required');
    }

    const kind: DeviceKind = VALID_DEVICE_KINDS.includes(dto?.kind)
      ? dto.kind
      : 'physical';
    const status: DeviceStatus = VALID_DEVICE_STATUSES.includes(dto?.status)
      ? dto.status
      : 'offline';

    const now = new Date().toISOString();
    const id = new ObjectId().toHexString();

    return this.repo.save({
      id,
      ownerEmail: normalizedOwnerEmail,
      name,
      kind,
      status,
      vendor: sanitizeString(dto?.vendor),
      model: sanitizeString(dto?.model),
      operatingSystem: sanitizeString(dto?.operatingSystem),
      host: sanitizeString(dto?.host),
      ipAddress: sanitizeString(dto?.ipAddress),
      serialNumber: sanitizeString(dto?.serialNumber),
      tags: sanitizeTags(dto?.tags),
      lastSeenAt: sanitizeString(dto?.lastSeenAt),
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  async update(
    id: string,
    ownerEmail: string,
    dto: any,
  ): Promise<DeviceEntity> {
    const current = await this.findOne(id, ownerEmail);

    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    const name = sanitizeString(dto?.name);
    if (name) {
      patch.name = name;
    }
    if (
      typeof dto?.kind === 'string' &&
      VALID_DEVICE_KINDS.includes(dto.kind as DeviceKind)
    ) {
      patch.kind = dto.kind;
    }
    if (
      typeof dto?.status === 'string' &&
      VALID_DEVICE_STATUSES.includes(dto.status as DeviceStatus)
    ) {
      patch.status = dto.status;
    }
    if ('vendor' in (dto || {})) {
      patch.vendor = sanitizeString(dto?.vendor);
    }
    if ('model' in (dto || {})) {
      patch.model = sanitizeString(dto?.model);
    }
    if ('operatingSystem' in (dto || {})) {
      patch.operatingSystem = sanitizeString(dto?.operatingSystem);
    }
    if ('host' in (dto || {})) {
      patch.host = sanitizeString(dto?.host);
    }
    if ('ipAddress' in (dto || {})) {
      patch.ipAddress = sanitizeString(dto?.ipAddress);
    }
    if ('serialNumber' in (dto || {})) {
      patch.serialNumber = sanitizeString(dto?.serialNumber);
    }
    if ('lastSeenAt' in (dto || {})) {
      patch.lastSeenAt = sanitizeString(dto?.lastSeenAt);
    }
    if ('tags' in (dto || {})) {
      patch.tags = sanitizeTags(dto?.tags);
    }

    await this.repo.update(current._id as any, patch as any);
    return (await this.repo.findOne({
      where: { _id: current._id, ownerEmail: current.ownerEmail } as any,
    })) as DeviceEntity;
  }

  async remove(id: string, ownerEmail: string): Promise<void> {
    const current = await this.findOne(id, ownerEmail);
    await this.repo.delete(current._id as any);
  }
}
