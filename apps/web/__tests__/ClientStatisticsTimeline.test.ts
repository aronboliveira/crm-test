import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClientStatisticsService from "../src/services/ClientStatisticsService";
import type { ClientRow } from "../src/pinia/types/clients.types";

const buildClient = (
  id: string,
  createdAt: string,
  overrides: Partial<ClientRow> = {},
): ClientRow =>
  ({
    id,
    name: `Client ${id}`,
    company: "ACME",
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as ClientRow;

describe("ClientStatisticsService.calculateTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds a continuous 12-month timeline and preserves cumulative totals", () => {
    const clients: ClientRow[] = [
      buildClient("c-1", "2025-01-10T10:00:00.000Z"), // before 12-month window
      buildClient("c-2", "2025-05-02T10:00:00.000Z"),
      buildClient("c-3", "2025-05-20T10:00:00.000Z"),
      buildClient("c-4", "2025-08-11T10:00:00.000Z"),
      buildClient("c-5", "2026-02-01T10:00:00.000Z"),
    ];

    const timeline = ClientStatisticsService.calculateTimeline(clients);

    expect(timeline).toHaveLength(12);
    expect(timeline[0]).toEqual({
      month: "2025-03",
      newClients: 0,
      totalClients: 1,
    });

    const may = timeline.find((row) => row.month === "2025-05");
    expect(may).toEqual({
      month: "2025-05",
      newClients: 2,
      totalClients: 3,
    });

    const august = timeline.find((row) => row.month === "2025-08");
    expect(august).toEqual({
      month: "2025-08",
      newClients: 1,
      totalClients: 4,
    });

    expect(timeline[11]).toEqual({
      month: "2026-02",
      newClients: 1,
      totalClients: 5,
    });
  });

  it("returns an empty timeline when all client dates are invalid", () => {
    const clients: ClientRow[] = [
      buildClient("invalid-1", "not-a-date"),
      buildClient("invalid-2", "still-not-a-date"),
    ];

    expect(ClientStatisticsService.calculateTimeline(clients)).toEqual([]);
  });
});
