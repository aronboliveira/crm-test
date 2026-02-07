import ApiClientService from "./ApiClientService";
import AuthService from "./AuthService";

/**
 * Mobile-safe version: no Vue refs.
 *
 * - verified(): readonly boolean accessor
 * - verifyOrLogout(): same semantics
 */
export default class AuthGuardService {
  static #verified = false;
  static #verifying = false;

  static get verified(): boolean {
    return AuthGuardService.#verified;
  }

  static async verifyOrLogout(): Promise<boolean> {
    if (AuthGuardService.#verified) return true;
    if (AuthGuardService.#verifying) return AuthService.isAuthed();

    AuthGuardService.#verifying = true;

    try {
      const ok = await AuthGuardService.#retry(
        async () => {
          const me = await ApiClientService.auth.me();
          return !!me;
        },
        6,
        140,
      );

      if (ok) {
        AuthGuardService.#verified = true;
        return true;
      }

      AuthService.logout();
      return false;
    } catch {
      AuthService.logout();
      return false;
    } finally {
      AuthGuardService.#verifying = false;
    }
  }

  static resetVerified(): void {
    // Optional helper for logout flows or dev hot reload
    AuthGuardService.#verified = false;
    AuthGuardService.#verifying = false;
  }

  static async #retry(
    fn: () => Promise<boolean>,
    tries: number,
    intervalMs: number,
  ): Promise<boolean> {
    let i = 0;
    while (i < tries) {
      try {
        const v = await fn();
        if (v) return true;
      } catch {
        // swallow and retry
      }
      await new Promise((r) => setTimeout(r, intervalMs));
      i += 1;
    }
    return false;
  }
}
