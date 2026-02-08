import { describe, it, expect, vi, beforeEach } from "vitest";

/* ─── mock sessionStorage & localStorage ───────────────── */

const store: Record<string, string> = {};

const storageMock: Storage = {
  getItem: vi.fn((k: string) => store[k] ?? null),
  setItem: vi.fn((k: string, v: string) => {
    store[k] = v;
  }),
  removeItem: vi.fn((k: string) => {
    delete store[k];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  }),
  key: vi.fn((_i: number) => null),
  length: 0,
};

Object.defineProperty(globalThis, "window", {
  value: {
    localStorage: storageMock,
    sessionStorage: storageMock,
  },
  writable: true,
});

import StorageService from "../src/services/StorageService";

describe("StorageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(store).forEach((k) => delete store[k]);
  });

  describe("session facade", () => {
    it("should get/set string values", () => {
      StorageService.session.setStr("name", "Alice");
      const result = StorageService.session.getStr("name", "fallback");
      expect(result).toBe("Alice");
    });

    it("should return fallback when key does not exist", () => {
      const result = StorageService.session.getStr("missing", "default");
      expect(result).toBe("default");
    });

    it("should get/set JSON values", () => {
      const data = { id: 1, tags: ["a", "b"] };
      StorageService.session.setJson("data", data);
      const result = StorageService.session.getJson("data", null);
      expect(result).toEqual(data);
    });

    it("should get/set boolean values", () => {
      StorageService.session.setBool("flag", true);
      expect(StorageService.session.getBool("flag", false)).toBe(true);

      StorageService.session.setBool("flag", false);
      expect(StorageService.session.getBool("flag", true)).toBe(false);
    });

    it("should delete values", () => {
      StorageService.session.setStr("temp", "val");
      StorageService.session.del("temp");
      const result = StorageService.session.getStr("temp", "gone");
      expect(result).toBe("gone");
    });

    it("should prefix keys with corp.admin.", () => {
      const key = StorageService.session.key("test");
      expect(key).toBe("corp.admin.test");
    });

    it("should handle invalid keys gracefully in getJson", () => {
      const result = StorageService.session.getJson("", { fallback: true });
      expect(result).toEqual({ fallback: true });
    });
  });

  describe("local facade", () => {
    it("should get/set string values the same as session", () => {
      StorageService.local.setStr("localKey", "localValue");
      const result = StorageService.local.getStr("localKey", "");
      expect(result).toBe("localValue");
    });
  });
});
