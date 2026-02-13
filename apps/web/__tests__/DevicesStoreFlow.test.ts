import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { DeviceRow } from "../src/pinia/types/devices.types";
import { useDevicesStore } from "../src/pinia/stores/devices.store";
import ApiClientService from "../src/services/ApiClientService";

vi.mock("../src/services/ApiClientService", () => ({
  default: {
    devices: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
  },
}));

const apiDevices = (ApiClientService as any).devices as {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

const makeRow = (
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

describe("Devices store flow", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("keeps list query and reloads it after create/update/remove", async () => {
    const store = useDevicesStore();
    const baseRow = makeRow("1", { status: "online", kind: "virtual" });

    apiDevices.list.mockResolvedValueOnce({
      items: [baseRow],
      total: 1,
      page: 1,
      pageSize: 10,
      nextCursor: null,
      sortBy: "updatedAt",
      sortDir: "desc",
    });

    await store.list({
      q: "ws-001",
      status: "online",
      kind: "virtual",
      page: 1,
      pageSize: 10,
      sortBy: "updatedAt",
      sortDir: "desc",
    });

    apiDevices.create.mockResolvedValueOnce({ id: "2" });
    apiDevices.list.mockResolvedValueOnce({
      items: [baseRow, makeRow("2", { name: "New VM", kind: "virtual", status: "online" })],
      total: 2,
      page: 1,
      pageSize: 10,
      nextCursor: null,
      sortBy: "updatedAt",
      sortDir: "desc",
    });

    await store.create({
      name: "New VM",
      kind: "virtual",
      status: "online",
    });

    apiDevices.update.mockResolvedValueOnce({ id: "2" });
    apiDevices.list.mockResolvedValueOnce({
      items: [baseRow, makeRow("2", { status: "maintenance" })],
      total: 2,
      page: 1,
      pageSize: 10,
      nextCursor: null,
      sortBy: "updatedAt",
      sortDir: "desc",
    });

    await store.update("2", { status: "maintenance" });

    apiDevices.remove.mockResolvedValueOnce({ ok: true });
    apiDevices.list.mockResolvedValueOnce({
      items: [baseRow],
      total: 1,
      page: 1,
      pageSize: 10,
      nextCursor: null,
      sortBy: "updatedAt",
      sortDir: "desc",
    });

    await store.remove("2");

    expect(apiDevices.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New VM", kind: "virtual" }),
    );
    expect(apiDevices.update).toHaveBeenCalledWith(
      "2",
      expect.objectContaining({ status: "maintenance" }),
    );
    expect(apiDevices.remove).toHaveBeenCalledWith("2");

    expect(apiDevices.list).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ q: "ws-001", status: "online", kind: "virtual" }),
    );
    expect(apiDevices.list).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ q: "ws-001", status: "online", kind: "virtual" }),
    );
    expect(apiDevices.list).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ q: "ws-001", status: "online", kind: "virtual" }),
    );
  });

  it("normalizes malformed payload fields and metadata bounds", async () => {
    const store = useDevicesStore();
    apiDevices.list.mockResolvedValueOnce({
      items: [
        {
          _id: { toString: () => "507f1f77bcf86cd799439011" },
          ownerEmail: "ADMIN@corp.local",
          name: "Host X",
          kind: "invalid-kind",
          status: "broken-status",
          tags: ["ops", 42, "infra"],
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-12T00:00:00.000Z",
        },
      ],
      total: 77,
      page: 8,
      pageSize: 999,
      nextCursor: 9,
      sortBy: "invalid-sort",
      sortDir: "invalid-dir",
    });

    await store.list({ page: 1, pageSize: 10 });

    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({
      id: "507f1f77bcf86cd799439011",
      ownerEmail: "admin@corp.local",
      kind: "physical",
      status: "offline",
      tags: ["ops", "infra"],
    });
    expect(store.pageSize).toBe(50);
    expect(store.page).toBe(2);
    expect(store.sortBy).toBe("updatedAt");
    expect(store.sortDir).toBe("desc");
  });
});
