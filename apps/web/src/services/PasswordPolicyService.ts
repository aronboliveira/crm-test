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
        label: `Mínimo de ${PasswordPolicyService.#MIN} caracteres`,
      },
      { key: "lower", ok: b, label: "Contém uma letra minúscula" },
      { key: "upper", ok: d, label: "Contém uma letra maiúscula" },
      { key: "digit", ok: e, label: "Contém um número" },
      { key: "symbol", ok: f, label: "Contém um símbolo" },
      { key: "match", ok: g, label: "As senhas coincidem" },
    ] as const;
  }

  static ok(password: string, confirm: string): boolean {
    return PasswordPolicyService.evaluate(password, confirm).every((r) => r.ok)
      ? true
      : false;
  }
}
