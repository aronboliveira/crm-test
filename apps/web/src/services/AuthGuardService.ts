import { ref } from "vue";
import ApiClientService from "./ApiClientService";
import AuthService from "./AuthService";

export default class AuthGuardService {
  static #verified = ref(false);
  static #verifying = ref(false);

  static get verified() {
    return AuthGuardService.#verified;
  }

  static async verifyOrLogout(): Promise<boolean> {
    if (AuthGuardService.#verified.value) return true;
    if (AuthGuardService.#verifying.value) return AuthService.isAuthed();

    AuthGuardService.#verifying.value = true;
    try {
      const ok = await AuthGuardService.#retry(
        async () => {
          const me = await ApiClientService.auth.me();
          return me ? true : false;
        },
        6,
        140,
      );

      return ok
        ? ((AuthGuardService.#verified.value = true), true)
        : (AuthService.logout(), false);
    } catch {
      return (AuthService.logout(), false);
    } finally {
      AuthGuardService.#verifying.value = false;
    }
  }

  static async #retry<T>(
    fn: () => Promise<T>,
    tries: number,
    intervalMs: number,
  ): Promise<boolean> {
    let i = 0;
    while (i < tries) {
      try {
        const v = await fn();
        return v ? true : false;
      } catch {
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      i += 1;
    }
    return false;
  }
}
