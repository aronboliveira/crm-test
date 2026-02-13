import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeviceAnalyticsService from "../src/services/DeviceAnalyticsService";
import type { DeviceRow } from "../src/pinia/types/devices.types";

const makeDevice = (
  id: string,
  overrides: Partial<DeviceRow> = {},
): DeviceRow => ({
  id,
  ownerEmail: "admin@corp.local",
  name: `Device ${id}`,
  kind: "physical",
  status: "offline",
  createdAt: "2026-02-10T09:00:00.000Z",
  updatedAt: "2026-02-10T10:00:00.000Z",
  ...overrides,
});

describe("DeviceAnalyticsService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-12T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds status/type slices with expected totals", () => {
    const rows = [
      makeDevice("1", { status: "online", kind: "physical" }),
      makeDevice("2", { status: "online", kind: "virtual" }),
      makeDevice("3", { status: "maintenance", kind: "virtual" }),
      makeDevice("4", { status: "offline", kind: "physical" }),
    ];

    const statusSlices = DeviceAnalyticsService.statusSlices(rows);
    const kindSlices = DeviceAnalyticsService.kindSlices(rows);

    expect(statusSlices.map((slice) => `${slice.label}:${slice.value}`)).toEqual([
      "Online:2",
      "Offline:1",
      "Manutenção:1",
    ]);
    expect(kindSlices.map((slice) => `${slice.label}:${slice.value}`)).toEqual([
      "Físico:2",
      "Virtual:2",
    ]);
  });

  it("builds top vendors and daily activity bars", () => {
    const rows = [
      makeDevice("1", {
        vendor: "Dell",
        updatedAt: "2026-02-10T08:00:00.000Z",
      }),
      makeDevice("2", {
        vendor: "Dell",
        updatedAt: "2026-02-11T08:00:00.000Z",
      }),
      makeDevice("3", {
        vendor: "Lenovo",
        updatedAt: "2026-02-11T12:00:00.000Z",
      }),
      makeDevice("4", {
        vendor: "",
        updatedAt: "2026-02-12T07:00:00.000Z",
      }),
    ];

    const topVendors = DeviceAnalyticsService.topVendors(rows, 3);
    const activity = DeviceAnalyticsService.activityByDay(rows, 3);

    expect(topVendors.map((item) => `${item.label}:${item.value}`)).toEqual([
      "Dell:2",
      "Lenovo:1",
      "Nao informado:1",
    ]);
    expect(activity.map((item) => `${item.label}:${item.value}`)).toEqual([
      "02-10:1",
      "02-11:2",
      "02-12:1",
    ]);
  });

  it("builds bars from analytics payload entries and series", () => {
    const entryBars = DeviceAnalyticsService.barsFromEntries([
      { label: "Windows 11 Pro", value: 4 },
      { label: "Ubuntu 24.04", value: 2 },
      { label: "", value: 1 },
    ]);
    const seriesBars = DeviceAnalyticsService.activityByDayFromSeries([
      { date: "02-10", total: 1, online: 1, offline: 0, maintenance: 0 },
      { date: "02-11", total: 3, online: 2, offline: 1, maintenance: 0 },
    ]);

    expect(entryBars.map((item) => `${item.label}:${item.value}`)).toEqual([
      "Windows 11 Pro:4",
      "Ubuntu 24.04:2",
      "Nao informado:1",
    ]);
    expect(seriesBars.map((item) => `${item.label}:${item.value}`)).toEqual([
      "02-10:1",
      "02-11:3",
    ]);
  });

  it("enforces trend-line rendering policy only when data density is sufficient", () => {
    const sparseSeries = [
      { label: "02-01", value: 0 },
      { label: "02-02", value: 0 },
      { label: "02-03", value: 1 },
      { label: "02-04", value: 0 },
      { label: "02-05", value: 1 },
      { label: "02-06", value: 0 },
      { label: "02-07", value: 0 },
      { label: "02-08", value: 0 },
      { label: "02-09", value: 0 },
      { label: "02-10", value: 1 },
    ];
    const denseSeries = [
      { label: "02-01", value: 1 },
      { label: "02-02", value: 1 },
      { label: "02-03", value: 1 },
      { label: "02-04", value: 2 },
      { label: "02-05", value: 1 },
      { label: "02-06", value: 1 },
      { label: "02-07", value: 2 },
      { label: "02-08", value: 1 },
      { label: "02-09", value: 1 },
      { label: "02-10", value: 2 },
    ];

    expect(
      DeviceAnalyticsService.shouldRenderTrend(sparseSeries, {
        minBars: 10,
        minNonZeroBars: 5,
      }),
    ).toBe(false);
    expect(
      DeviceAnalyticsService.shouldRenderTrend(denseSeries, {
        minBars: 10,
        minNonZeroBars: 5,
      }),
    ).toBe(true);
  });
});
