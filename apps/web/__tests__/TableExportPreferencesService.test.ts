import { beforeEach, describe, expect, it, vi } from "vitest";

const store: Record<string, string> = {};

const storageMock: Storage = {
  getItem: vi.fn((key: string) => (key in store ? store[key]! : null)),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((key) => {
      delete store[key];
    });
  }),
  key: vi.fn((_index: number) => null),
  length: 0,
};

Object.defineProperty(globalThis, "window", {
  value: {
    localStorage: storageMock,
    sessionStorage: storageMock,
  },
  writable: true,
});

let TableExportPreferencesService: (
  typeof import("../src/services/TableExportPreferencesService")
)["default"];

describe("TableExportPreferencesService", () => {
  beforeEach(async () => {
    if (!TableExportPreferencesService) {
      const module = await import("../src/services/TableExportPreferencesService");
      TableExportPreferencesService = module.default;
    }
    vi.clearAllMocks();
    Object.keys(store).forEach((key) => {
      delete store[key];
    });
  });

  it("returns normalized defaults when preset key is missing", () => {
    const loaded = TableExportPreferencesService.load({
      availableColumnKeys: ["nome", "status", "modelo"],
      defaultFormats: ["csv", "xlsx"],
      defaultColumnKeys: ["nome", "status"],
    });

    expect(loaded).toEqual({
      formats: ["csv", "xlsx"],
      columnKeys: ["nome", "status"],
    });
  });

  it("persists and restores sanitized selection for a preset key", () => {
    TableExportPreferencesService.save({
      presetKey: "dashboard.devices",
      formats: ["xlsx"],
      columnKeys: ["status", "inexistente", "nome", ""],
      availableColumnKeys: ["nome", "status", "modelo"],
      defaultFormats: ["csv", "xlsx"],
      defaultColumnKeys: ["nome", "status", "modelo"],
    });

    const loaded = TableExportPreferencesService.load({
      presetKey: "dashboard.devices",
      availableColumnKeys: ["nome", "status", "modelo"],
      defaultFormats: ["csv", "xlsx"],
      defaultColumnKeys: ["nome", "status", "modelo"],
    });

    expect(loaded).toEqual({
      formats: ["xlsx"],
      columnKeys: ["status", "nome"],
    });
  });

  it("falls back safely when persisted store has invalid payload", () => {
    store["corp.admin.table.export.preferences.v1"] = JSON.stringify({
      version: 1,
      presets: {
        "dashboard.devices": {
          formats: ["bad-format"],
          columnKeys: ["nao-existe"],
        },
      },
    });

    const loaded = TableExportPreferencesService.load({
      presetKey: "dashboard.devices",
      availableColumnKeys: ["nome", "status", "modelo"],
      defaultFormats: ["csv", "xlsx"],
      defaultColumnKeys: ["nome", "status"],
    });

    expect(loaded).toEqual({
      formats: ["csv", "xlsx"],
      columnKeys: ["nome", "status"],
    });
  });
});
