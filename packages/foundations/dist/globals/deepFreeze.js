export default class DeepFreeze {
    static apply(v, seen = new WeakSet()) {
        try {
            if (!v || typeof v !== "object")
                return v;
            if (seen.has(v))
                return v;
            seen.add(v);
            for (const k of Reflect.ownKeys(v)) {
                const child = v[k];
                if (child && typeof child === "object") {
                    DeepFreeze.apply(child, seen);
                }
            }
            return Object.freeze(v);
        }
        catch (error) {
            console.warn("[DeepFreeze] Error freezing object:", error);
            return v;
        }
    }
}
