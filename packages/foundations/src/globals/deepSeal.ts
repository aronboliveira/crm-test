export default class DeepSeal {
  static apply<T>(
    v: T,
    opts?: { exceptKeys?: readonly string[] },
    seen = new WeakSet<object>(),
  ): T {
    try {
      if (!v || typeof v !== "object") return v;
      if (seen.has(v as object)) return v;
      seen.add(v as object);

      const except = new Set(opts?.exceptKeys ?? []);
      for (const k of Reflect.ownKeys(v as object)) {
        const ks = String(k);
        if (except.has(ks)) continue;

        try {
          const child = (v as Record<PropertyKey, unknown>)[k];
          if (child && typeof child === "object") {
            DeepSeal.apply(child, opts, seen);
          }
        } catch (error) {
          console.warn(`[DeepSeal] Error sealing property "${ks}":`, error);
        }
      }

      return Object.seal(v);
    } catch (error) {
      console.warn("[DeepSeal] Error sealing object:", error);
      return v;
    }
  }
}
