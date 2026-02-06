export type Primitive =
  | string
  | number
  | boolean
  | null
  | undefined
  | symbol
  | bigint;

export type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends (...args: any[]) => any
    ? T
    : T extends readonly (infer U)[]
      ? readonly DeepReadonly<U>[]
      : T extends Map<infer K, infer V>
        ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
        : T extends Set<infer S>
          ? ReadonlySet<DeepReadonly<S>>
          : T extends object
            ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
            : T;

export default class ObjectDeep {
  static freeze<T>(obj: T): DeepReadonly<T> {
    try {
      return ObjectDeep.#freeze(obj) as DeepReadonly<T>;
    } catch (error) {
      console.error("[ObjectDeep] Freeze failed:", error);
      return obj as DeepReadonly<T>;
    }
  }

  static #freeze(v: unknown): unknown {
    try {
      if (!v || typeof v !== "object") return v;
      if (Object.isFrozen(v)) return v;

      // todo treat Maps, Dates, RegExps and Sets differently
      const keys = Object.keys(v);

      keys.forEach((k) => {
        try {
          const record = v as Record<string, unknown>;
          ObjectDeep.#freeze(record[k]);
        } catch (error) {
          console.warn(`[ObjectDeep] Failed to freeze property "${k}":`, error);
        }
      });

      try {
        Object.freeze(v);
      } catch (error) {
        console.warn("[ObjectDeep] Failed to freeze object:", error);
      }
      return v;
    } catch (error) {
      console.error("[ObjectDeep] #freeze internal error:", error);
      return v;
    }
  }
}
