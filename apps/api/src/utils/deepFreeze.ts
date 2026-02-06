type AnyRec = Record<string, any>;

const isObj = (v: unknown): v is AnyRec =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export default class DeepFreeze {
  static apply<T>(v: T): Readonly<T> {
    try {
      // Handle primitives and non-objects
      if (!isObj(v) && !Array.isArray(v)) return v as Readonly<T>;

      const seen = new WeakSet<object>();

      const walk = (x: any): any => {
        try {
          if (!x || typeof x !== 'object') return x;
          if (seen.has(x)) return x;

          seen.add(x);

          if (Array.isArray(x)) {
            x.forEach((item) => walk(item));
          } else {
            Object.keys(x).forEach((k) => {
              try {
                walk(x[k]);
              } catch (e) {
                console.error('[DeepFreeze] walk key failed:', k, e);
              }
            });
          }

          return Object.freeze(x);
        } catch (e) {
          console.error('[DeepFreeze] walk failed:', e);
          return x;
        }
      };

      return walk(v) as Readonly<T>;
    } catch (e) {
      console.error('[DeepFreeze] apply failed:', e);
      return v as Readonly<T>;
    }
  }
}
