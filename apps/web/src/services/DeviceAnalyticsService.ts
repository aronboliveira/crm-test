import type {
  DeviceAnalyticsDailyPoint,
  DeviceAnalyticsEntry,
  DeviceKind,
  DeviceRow,
  DeviceStatus,
} from "../pinia/types/devices.types";

export interface DeviceChartSlice {
  label: string;
  value: number;
  color: string;
}

export interface DeviceChartBar {
  label: string;
  value: number;
  color?: string;
}

export interface DeviceTrendPolicyOptions {
  minBars?: number;
  minNonZeroBars?: number;
}

const STATUS_META: Readonly<
  Record<DeviceStatus, Readonly<{ label: string; color: string }>>
> = Object.freeze({
  online: Object.freeze({ label: "Online", color: "#22c55e" }),
  offline: Object.freeze({ label: "Offline", color: "#64748b" }),
  maintenance: Object.freeze({ label: "Manutenção", color: "#f59e0b" }),
});

const KIND_META: Readonly<
  Record<DeviceKind, Readonly<{ label: string; color: string }>>
> = Object.freeze({
  physical: Object.freeze({ label: "Físico", color: "#3b82f6" }),
  virtual: Object.freeze({ label: "Virtual", color: "#8b5cf6" }),
});

const VENDOR_COLORS: readonly string[] = Object.freeze([
  "#60a5fa",
  "#34d399",
  "#f59e0b",
  "#f97316",
  "#a78bfa",
  "#14b8a6",
  "#f43f5e",
  "#84cc16",
]);

const OS_COLORS: readonly string[] = Object.freeze([
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#f59e0b",
  "#f97316",
  "#f43f5e",
  "#84cc16",
  "#22c55e",
]);

const TAG_COLORS: readonly string[] = Object.freeze([
  "#22c55e",
  "#60a5fa",
  "#a78bfa",
  "#f97316",
  "#14b8a6",
  "#f43f5e",
  "#84cc16",
  "#38bdf8",
]);

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toIsoDate = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const clampPositiveInt = (value: number, fallback: number): number => {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : fallback;
  return normalized > 0 ? normalized : fallback;
};

const truncateLabel = (value: string, maxLength: number): string =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;

const toTopBars = (
  counts: ReadonlyMap<string, number>,
  limit: number,
  colors: readonly string[],
): DeviceChartBar[] =>
  [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "pt-BR"))
    .slice(0, clampPositiveInt(limit, 6))
    .map(([label, value], index) => ({
      label: truncateLabel(label, 30),
      value,
      color: colors[index % colors.length],
    }));

const normalizeEntryLabel = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
};

export default class DeviceAnalyticsService {
  static statusSlicesFromTotals(
    totals?: Partial<Record<DeviceStatus, number>>,
  ): DeviceChartSlice[] {
    const counts: Record<DeviceStatus, number> = {
      online: Math.max(0, Number(totals?.online || 0)),
      offline: Math.max(0, Number(totals?.offline || 0)),
      maintenance: Math.max(0, Number(totals?.maintenance || 0)),
    };

    return (Object.keys(STATUS_META) as DeviceStatus[])
      .map((status) => ({
        label: STATUS_META[status].label,
        value: counts[status] ?? 0,
        color: STATUS_META[status].color,
      }))
      .filter((slice) => slice.value > 0);
  }

  static statusSlices(rows: readonly DeviceRow[]): DeviceChartSlice[] {
    const counts: Record<DeviceStatus, number> = {
      online: 0,
      offline: 0,
      maintenance: 0,
    };

    rows.forEach((row) => {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    });

    return this.statusSlicesFromTotals(counts);
  }

  static kindSlicesFromTotals(
    totals?: Partial<Record<DeviceKind, number>>,
  ): DeviceChartSlice[] {
    const counts: Record<DeviceKind, number> = {
      physical: Math.max(0, Number(totals?.physical || 0)),
      virtual: Math.max(0, Number(totals?.virtual || 0)),
    };

    return (Object.keys(KIND_META) as DeviceKind[])
      .map((kind) => ({
        label: KIND_META[kind].label,
        value: counts[kind] ?? 0,
        color: KIND_META[kind].color,
      }))
      .filter((slice) => slice.value > 0);
  }

  static kindSlices(rows: readonly DeviceRow[]): DeviceChartSlice[] {
    const counts: Record<DeviceKind, number> = {
      physical: 0,
      virtual: 0,
    };

    rows.forEach((row) => {
      counts[row.kind] = (counts[row.kind] ?? 0) + 1;
    });

    return this.kindSlicesFromTotals(counts);
  }

  static topVendors(rows: readonly DeviceRow[], limit = 6): DeviceChartBar[] {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
      const vendor = normalizeEntryLabel(row.vendor, "Nao informado");
      counts.set(vendor, (counts.get(vendor) ?? 0) + 1);
    });

    return toTopBars(counts, limit, VENDOR_COLORS);
  }

  static topOperatingSystems(rows: readonly DeviceRow[], limit = 6): DeviceChartBar[] {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
      const os = normalizeEntryLabel(row.operatingSystem, "Nao informado");
      counts.set(os, (counts.get(os) ?? 0) + 1);
    });

    return toTopBars(counts, limit, OS_COLORS);
  }

  static topTags(rows: readonly DeviceRow[], limit = 6): DeviceChartBar[] {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
      const tags = Array.isArray(row.tags) ? row.tags : [];
      if (tags.length === 0) {
        counts.set("Sem tag", (counts.get("Sem tag") ?? 0) + 1);
        return;
      }
      tags.forEach((tag) => {
        const normalized = normalizeEntryLabel(tag, "Sem tag");
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });
    });

    return toTopBars(counts, limit, TAG_COLORS);
  }

  static barsFromEntries(
    entries: readonly DeviceAnalyticsEntry[] | undefined,
    colors: readonly string[] = VENDOR_COLORS,
  ): DeviceChartBar[] {
    if (!Array.isArray(entries)) {
      return [];
    }
    return entries
      .map((entry, index) => ({
        label: truncateLabel(normalizeEntryLabel(entry.label, "Nao informado"), 30),
        value: Math.max(0, Math.trunc(Number(entry.value || 0))),
        color: colors[index % colors.length],
      }))
      .filter((entry) => entry.value > 0);
  }

  static activityByDayFromSeries(
    series: readonly DeviceAnalyticsDailyPoint[] | undefined,
  ): DeviceChartBar[] {
    if (!Array.isArray(series)) {
      return [];
    }
    return series.map((point) => ({
      label: normalizeEntryLabel(point.date, "00-00"),
      value: Math.max(0, Math.trunc(Number(point.total || 0))),
      color: "#22c55e",
    }));
  }

  static activityByDay(rows: readonly DeviceRow[], days = 7): DeviceChartBar[] {
    const windowDays = clampPositiveInt(days, 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayKeys: string[] = [];
    const countByDay = new Map<string, number>();
    for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - offset);
      const key = `${day.getFullYear()}-${pad2(day.getMonth() + 1)}-${pad2(day.getDate())}`;
      dayKeys.push(key);
      countByDay.set(key, 0);
    }

    rows.forEach((row) => {
      const key = toIsoDate(row.lastSeenAt || row.updatedAt);
      if (!key || !countByDay.has(key)) {
        return;
      }
      countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    });

    return dayKeys.map((key) => ({
      label: key.slice(5),
      value: countByDay.get(key) ?? 0,
      color: "#22c55e",
    }));
  }

  static shouldRenderTrend(
    bars: readonly DeviceChartBar[],
    options: DeviceTrendPolicyOptions = {},
  ): boolean {
    const minBars = clampPositiveInt(options.minBars ?? 10, 10);
    const minNonZeroBars = clampPositiveInt(
      options.minNonZeroBars ?? 5,
      5,
    );

    if (!Array.isArray(bars) || bars.length < minBars) {
      return false;
    }

    const nonZeroBars = bars.filter((bar) => Number(bar?.value || 0) > 0).length;
    return nonZeroBars >= minNonZeroBars;
  }

  static osPalette(): readonly string[] {
    return OS_COLORS;
  }

  static tagPalette(): readonly string[] {
    return TAG_COLORS;
  }

  static vendorPalette(): readonly string[] {
    return VENDOR_COLORS;
  }
}
