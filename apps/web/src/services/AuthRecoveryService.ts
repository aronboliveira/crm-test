import ApiClientService from "./ApiClientService";
import StorageService from "./StorageService";

type RecoverResp = Readonly<{
  ok?: boolean;
  message?: string;
  devResetToken?: string;
}>;
type ValidateResp = Readonly<{ ok?: boolean; email?: string }>;
type ResetResp = Readonly<{ ok?: boolean; message?: string }>;

export default class AuthRecoveryService {
  static #LAST_EMAIL = "auth.recovery.last_email";
  static #LAST_TOKEN = "auth.recovery.last_token";

  static lastEmail(): string {
    const v = StorageService.session.getStr(
      AuthRecoveryService.#LAST_EMAIL,
      "",
    );
    return v ? v : "";
  }

  static setLastEmail(email: string): void {
    const e = (email || "").trim().toLowerCase();
    e
      ? StorageService.session.setStr(AuthRecoveryService.#LAST_EMAIL, e)
      : StorageService.session.del(AuthRecoveryService.#LAST_EMAIL);
  }

  static async requestReset(email: string): Promise<RecoverResp> {
    const e = (email || "").trim().toLowerCase();
    if (!AuthRecoveryService.#isEmail(e))
      return { ok: false, message: "Invalid email" };

    AuthRecoveryService.setLastEmail(e);

    const doPost = async () =>
      (await ApiClientService.raw.post("/auth/forgot-password", { email: e }))
        .data as RecoverResp;

    try {
      return await AuthRecoveryService.#retry(doPost, 4, 160);
    } catch (err: any) {
      const st = err?.response?.status;
      return st === 404
        ? {
            ok: true,
            message: "Password reset is not enabled on this environment yet.",
          }
        : { ok: false, message: "Failed to request password reset." };
    }
  }

  static lastToken(): string {
    return StorageService.session.getStr(AuthRecoveryService.#LAST_TOKEN, "");
  }

  static setLastToken(token: string): void {
    const t = (token || "").trim();
    t
      ? StorageService.session.setStr(AuthRecoveryService.#LAST_TOKEN, t)
      : StorageService.session.del(AuthRecoveryService.#LAST_TOKEN);
  }

  static async validateToken(token: string): Promise<ValidateResp> {
    const t = (token || "").trim();
    if (!t) return { ok: false };

    const doGet = async () =>
      (
        await ApiClientService.raw.get("/auth/reset-password/validate", {
          params: { token: t },
        })
      ).data as ValidateResp;

    try {
      return await AuthRecoveryService.#retry(doGet, 4, 160);
    } catch {
      return { ok: false };
    }
  }

  static async resetPassword(
    token: string,
    password: string,
    confirm: string,
  ): Promise<ResetResp> {
    const t = (token || "").trim();
    if (!t) return { ok: false, message: "Missing token" };

    const doPost = async () =>
      (
        await ApiClientService.raw.post("/auth/reset-password", {
          token: t,
          password,
          confirm,
        })
      ).data as ResetResp;

    try {
      return await AuthRecoveryService.#retry(doPost, 4, 160);
    } catch (e: any) {
      const msg = String(
        e?.response?.data?.message || "Failed to reset password",
      );
      return { ok: false, message: msg };
    }
  }

  static async #retry<T>(
    fn: () => Promise<T>,
    tries: number,
    intervalMs: number,
  ): Promise<T> {
    let i = 0;
    while (i < tries) {
      try {
        return await fn();
      } catch (e) {
        i + 1 >= tries
          ? (() => {
              throw e;
            })()
          : void 0;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      i += 1;
    }
    throw new Error("retry_exhausted");
  }

  static #isEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : false;
  }
}
