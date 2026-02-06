import DeepFreeze from "../src/globals/deepFreeze";

describe("DeepFreeze", () => {
  test("freezes simple object", () => {
    const obj = { a: 1, b: 2 };
    const frozen = DeepFreeze.apply(obj);

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(() => {
      (frozen as any).a = 10;
    }).toThrow();
  });

  test("freezes nested objects", () => {
    const obj = { a: { b: { c: 1 } } };
    const frozen = DeepFreeze.apply(obj);

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.a.b)).toBe(true);
  });

  test("handles arrays", () => {
    const arr = [1, 2, { a: 3 }];
    const frozen = DeepFreeze.apply(arr);

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen[2])).toBe(true);
  });

  test("handles circular references", () => {
    const obj: any = { a: 1 };
    obj.self = obj;

    const frozen = DeepFreeze.apply(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  test("handles primitives", () => {
    expect(DeepFreeze.apply(42)).toBe(42);
    expect(DeepFreeze.apply("test")).toBe("test");
    expect(DeepFreeze.apply(null)).toBe(null);
  });
});
