import DeepSeal from "../src/globals/deepSeal";

describe("DeepSeal", () => {
  test("seals simple object", () => {
    const obj = { a: 1, b: 2 };
    const sealed = DeepSeal.apply(obj);

    expect(Object.isSealed(sealed)).toBe(true);
    sealed.a = 10; // Can modify existing properties
    expect(sealed.a).toBe(10);
  });

  test("prevents adding new properties", () => {
    const obj = { a: 1 };
    const sealed = DeepSeal.apply(obj);

    expect(() => {
      (sealed as any).newProp = 5;
    }).toThrow();
  });

  test("seals nested objects", () => {
    const obj = { a: { b: { c: 1 } } };
    const sealed = DeepSeal.apply(obj);

    expect(Object.isSealed(sealed)).toBe(true);
    expect(Object.isSealed(sealed.a)).toBe(true);
    expect(Object.isSealed(sealed.a.b)).toBe(true);
  });

  test("respects exceptKeys option", () => {
    const obj = { a: { x: 1 }, b: { y: 2 } };
    const sealed = DeepSeal.apply(obj, { exceptKeys: ["a"] });

    expect(Object.isSealed(sealed)).toBe(true);
    expect(Object.isSealed(sealed.b)).toBe(true);
    // Key 'a' should not be sealed at top level
  });

  test("handles circular references", () => {
    const obj: any = { a: 1 };
    obj.self = obj;

    const sealed = DeepSeal.apply(obj);
    expect(Object.isSealed(sealed)).toBe(true);
  });
});
