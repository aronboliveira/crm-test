import ApiClientService from "./ApiClientService";
import StorageService from "./StorageService";
import { STORAGE_KEYS } from "../constants";

type RecoverResp = Readonly<{
  ok?: boolean;
  message?: string;
  devResetToken?: string;
}>;
type ValidateResp = Readonly<{ ok?: boolean; email?: string }>;
type ResetResp = Readonly<{ ok?: boolean; message?: string }>;

/**
 * AuthRecoveryService
 *
 * Handles password recovery flows including:
 * - Request password reset email
 * - Validate reset tokens
 * - Reset password with token
 *
 * Includes retry logic for transient failures.
 */
export default class AuthRecoveryService {
  /**
   * Retrieve last email used for password recovery
   */
  static lastEmail(): string {
    const v = StorageService.session.getStr(STORAGE_KEYS.AUTH.LAST_EMAIL, "");
    return v ? v : "";
  }

  /**
   * Store email for password recovery
   */
  static setLastEmail(email: string): void {
    const e = (email || "").trim().toLowerCase();
    e
      ? StorageService.session.setStr(STORAGE_KEYS.AUTH.LAST_EMAIL, e)
      : StorageService.session.del(STORAGE_KEYS.AUTH.LAST_EMAIL);
  }

  static async requestReset(email: string): Promise<RecoverResp> {
    const e = (email || "").trim().toLowerCase();
    if (!AuthRecoveryService.#isEmail(e))
      return { ok: false, message: "E-mail inválido" };

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
            message:
              "A redefinição de senha ainda não está habilitada neste ambiente.",
          }
        : { ok: false, message: "Falha ao solicitar redefinição de senha." };
    }
  }

  /**
   * Retrieve last password reset token (DEV only)
   */
  static lastToken(): string {
    return StorageService.session.getStr(STORAGE_KEYS.AUTH.LAST_TOKEN, "");
  }

  /**
   * Store password reset token (DEV only)
   */
  static setLastToken(token: string): void {
    const t = (token || "").trim();
    t
      ? StorageService.session.setStr(STORAGE_KEYS.AUTH.LAST_TOKEN, t)
      : StorageService.session.del(STORAGE_KEYS.AUTH.LAST_TOKEN);
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
    if (!t) return { ok: false, message: "Token ausente" };

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
        e?.response?.data?.message || "Falha ao redefinir senha",
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
        await new Promise<void>((r) => setTimeout(r, intervalMs));
      }
      i += 1;
    }
    throw new Error("retry_exhausted");
  }

  static #isEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : false;
  }
}
