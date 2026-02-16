import { DomGuard } from "@corp/foundations";
import StorageService from "./StorageService";

type BootstrapOpts = Readonly<{ preferWebkitTransitions: boolean }>;
export type ThemeMode = "light" | "dark" | "system";

export default class ThemeService {
  static #LEGACY_KEY = "ui.theme.dark";
  static #MODE_KEY = "ui.theme.mode";
  static #CLS = "dark-mode";
  static #DATASET_FLAG = "data-theme-wired";

  static bootstrap(_opts?: BootstrapOpts): void {
    try {
      const html = document.documentElement;
      if (!html) {
        console.error("[ThemeService] Document root not found");
        return;
      }

      if (!DomGuard.attr(html, ThemeService.#DATASET_FLAG)) return;

      ThemeService.#applyMode(ThemeService.getMode());

      const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
      if (mediaQuery) {
        mediaQuery.addEventListener("change", (e) => {
          try {
            if (ThemeService.getMode() === "system") {
              ThemeService.#apply(!!e.matches);
            }
          } catch (error) {
            console.error(
              "[ThemeService] Media query change handler failed:",
              error,
            );
          }
        });
      }
    } catch (error) {
      console.error("[ThemeService] Bootstrap failed:", error);
    }
  }

  static toggle(): void {
    try {
      const html = document.documentElement;
      if (!html) {
        console.error("[ThemeService] Document root not found");
        return;
      }

      const on = html.classList.contains(ThemeService.#CLS);
      ThemeService.setMode(on ? "light" : "dark");
    } catch (error) {
      console.error("[ThemeService] Toggle failed:", error);
    }
  }

  static setMode(mode: ThemeMode): void {
    try {
      StorageService.local.setStr(ThemeService.#MODE_KEY, mode);
      ThemeService.#applyMode(mode);
    } catch (error) {
      console.error("[ThemeService] setMode failed:", error);
    }
  }

  static getMode(): ThemeMode {
    try {
      const raw = StorageService.local.getStr(ThemeService.#MODE_KEY, "");
      if (raw === "light" || raw === "dark" || raw === "system") {
        return raw;
      }

      const prefersDark =
        window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
      const legacyDark = StorageService.local.getBool(
        ThemeService.#LEGACY_KEY,
        prefersDark,
      );
      return legacyDark ? "dark" : "light";
    } catch {
      return "system";
    }
  }

  static isDark(): boolean {
    return (
      document.documentElement.classList.contains(ThemeService.#CLS) ||
      document.documentElement.dataset.theme === "dark"
    );
  }

  static #applyMode(mode: ThemeMode): void {
    if (mode === "system") {
      const prefersDark =
        window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
      ThemeService.#apply(prefersDark);
      return;
    }

    ThemeService.#apply(mode === "dark");
  }

  static #apply(on: boolean): void {
    try {
      const html = document.documentElement;
      if (!html) return;

      if (on) {
        DomGuard.classOnce(html, ThemeService.#CLS);
      } else {
        if (html.classList.contains(ThemeService.#CLS)) {
          html.classList.remove(ThemeService.#CLS);
        }
      }
      html.setAttribute("data-theme", on ? "dark" : "light");
    } catch (error) {
      console.error("[ThemeService] Apply theme failed:", error);
    }
  }
}
