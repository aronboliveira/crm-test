/**
 * Recursively freezes an object and all nested objects.
 * Safe against circular references via WeakSet tracking.
 */
export default class DeepFreeze {
  static apply<T>(v: T, seen = new WeakSet<object>()): Readonly<T> {
    if (!v || typeof v !== "object") return v as Readonly<T>;
    if (seen.has(v as object)) return v as Readonly<T>;
    seen.add(v as object);

    for (const k of Reflect.ownKeys(v as object)) {
      const child = (v as Record<PropertyKey, unknown>)[k];
      if (child && typeof child === "object") {
        DeepFreeze.apply(child, seen);
      }
    }

    return Object.freeze(v) as Readonly<T>;
  }
}
