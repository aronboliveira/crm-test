export default class DeepSeal {
    static apply(v, opts, seen = new WeakSet()) {
        try {
            if (!v || typeof v !== "object")
                return v;
            if (seen.has(v))
                return v;
            seen.add(v);
            const except = new Set(opts?.exceptKeys ?? []);
            for (const k of Reflect.ownKeys(v)) {
                const ks = String(k);
                if (except.has(ks))
                    continue;
                try {
                    const child = v[k];
                    if (child && typeof child === "object") {
                        DeepSeal.apply(child, opts, seen);
                    }
                }
                catch (error) {
                    console.warn(`[DeepSeal] Error sealing property "${ks}":`, error);
                }
            }
            return Object.seal(v);
        }
        catch (error) {
            console.warn("[DeepSeal] Error sealing object:", error);
            return v;
        }
    }
}
