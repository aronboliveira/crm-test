var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _DateValidator_ISO;
class DateValidator {
    static isIso(v) {
        return typeof v === "string" && __classPrivateFieldGet(_a, _a, "f", _DateValidator_ISO).test(v.trim())
            ? true
            : false;
    }
    static parseIso(v) {
        if (!_a.isIso(v))
            return null;
        const d = new Date(v);
        return Number.isFinite(d.getTime()) ? d : null;
    }
    static normalizeIso(v) {
        const d = _a.parseIso(v);
        return d ? d.toISOString() : null;
    }
    static compareIso(a, b) {
        const da = _a.parseIso(a);
        const db = _a.parseIso(b);
        if (!da && !db)
            return 0;
        if (!da)
            return 1;
        if (!db)
            return -1;
        const ta = da.getTime();
        const tb = db.getTime();
        return ta === tb ? 0 : ta < tb ? -1 : 1;
    }
    static ms(iso) {
        return _a.isIso(iso) ? Date.parse(iso) : 0;
    }
}
_a = DateValidator;
_DateValidator_ISO = { value: /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+\-]\d{2}:\d{2})?)?$/ };
export default DateValidator;
