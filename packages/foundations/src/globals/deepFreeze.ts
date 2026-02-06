export default class DeepFreeze {
  static apply<T>(v: T, seen = new WeakSet<object>()): Readonly<T> {
    try {
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
    } catch (error) {
      console.warn("[DeepFreeze] Error freezing object:", error);
      return v as Readonly<T>;
    }
  }
}
