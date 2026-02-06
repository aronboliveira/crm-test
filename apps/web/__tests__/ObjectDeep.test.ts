import { describe, it, expect } from "vitest";
import ObjectDeep from "../src/utils/ObjectDeep";

describe("ObjectDeep", () => {
  describe("freeze", () => {
    it("should freeze a simple object", () => {
      const obj = { a: 1, b: 2 };
      const frozen = ObjectDeep.freeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it("should freeze nested objects", () => {
      const obj = { a: { b: { c: 1 } } };
      const frozen = ObjectDeep.freeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.a)).toBe(true);
      expect(Object.isFrozen(frozen.a.b)).toBe(true);
    });

    it("should handle arrays", () => {
      const arr = [1, 2, { a: 3 }];
      const frozen = ObjectDeep.freeze(arr);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen[2])).toBe(true);
    });

    it("should handle primitives", () => {
      expect(ObjectDeep.freeze(42)).toBe(42);
      expect(ObjectDeep.freeze("test")).toBe("test");
      expect(ObjectDeep.freeze(null)).toBe(null);
      expect(ObjectDeep.freeze(undefined)).toBe(undefined);
    });

    it("should not throw on already frozen objects", () => {
      const obj = Object.freeze({ a: 1 });
      expect(() => ObjectDeep.freeze(obj)).not.toThrow();
    });

    it("should handle circular references gracefully", () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      expect(() => ObjectDeep.freeze(obj)).not.toThrow();
    });
  });
});
