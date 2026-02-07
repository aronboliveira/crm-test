import { DomGuard } from "@corp/foundations";
import StorageService from "./StorageService";

type BootstrapOpts = Readonly<{ preferWebkitTransitions: boolean }>;

export default class ThemeService {
  static #KEY = "ui.theme.dark";
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

      const prefersDark =
        window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
      const stored = StorageService.local.getBool(
        ThemeService.#KEY,
        prefersDark,
      );

      ThemeService.#apply(stored);

      const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
      if (mediaQuery) {
        mediaQuery.addEventListener("change", (e) => {
          try {
            const isStored = StorageService.local.getBool(
              ThemeService.#KEY,
              prefersDark,
            );
            if (!isStored) {
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
      StorageService.local.setBool(ThemeService.#KEY, !on);
      ThemeService.#apply(!on);
    } catch (error) {
      console.error("[ThemeService] Toggle failed:", error);
    }
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
