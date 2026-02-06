export type PasswordRuleKey =
  | "minLen"
  | "lower"
  | "upper"
  | "digit"
  | "symbol"
  | "match";

export type RuleState = Readonly<{
  key: PasswordRuleKey;
  ok: boolean;
  label: string;
}>;

export default class PasswordPolicyService {
  static #MIN = 10;

  static evaluate(password: string, confirm: string): readonly RuleState[] {
    const p = String(password || "");
    const c = String(confirm || "");

    const a = p.length >= PasswordPolicyService.#MIN;
    const b = /[a-z]/.test(p);
    const d = /[A-Z]/.test(p);
    const e = /\d/.test(p);
    const f = /[^A-Za-z0-9]/.test(p);
    const g = p && c ? p === c : false;

    return [
      {
        key: "minLen",
        ok: a,
        label: `At least ${PasswordPolicyService.#MIN} characters`,
      },
      { key: "lower", ok: b, label: "Contains a lowercase letter" },
      { key: "upper", ok: d, label: "Contains an uppercase letter" },
      { key: "digit", ok: e, label: "Contains a number" },
      { key: "symbol", ok: f, label: "Contains a symbol" },
      { key: "match", ok: g, label: "Passwords match" },
    ] as const;
  }

  static ok(password: string, confirm: string): boolean {
    return PasswordPolicyService.evaluate(password, confirm).every((r) => r.ok)
      ? true
      : false;
  }
}
