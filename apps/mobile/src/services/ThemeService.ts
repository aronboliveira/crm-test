import { Appearance } from "react-native";
import StorageService from "./StorageService";

export default class ThemeService {
  static #KEY = "ui.theme.dark";

  static bootstrap(): void {
    try {
      const systemDark = Appearance.getColorScheme() === "dark";
      const stored = StorageService.local.getBool(
        ThemeService.#KEY,
        systemDark,
      );
      ThemeService.#apply(stored);

      Appearance.addChangeListener(({ colorScheme }) => {
        try {
          const isManuallySet = StorageService.local.getBool(
            ThemeService.#KEY,
            false,
          );
          if (!isManuallySet) {
            ThemeService.#apply(colorScheme === "dark");
          }
        } catch (error) {
          console.error("[ThemeService] Color scheme change failed:", error);
        }
      });
    } catch (error) {
      console.error("[ThemeService] Bootstrap failed:", error);
    }
  }

  static toggle(): void {
    try {
      const current = ThemeService.isDark();
      StorageService.local.setBool(ThemeService.#KEY, !current);
      ThemeService.#apply(!current);
    } catch (error) {
      console.error("[ThemeService] Toggle failed:", error);
    }
  }

  static isDark(): boolean {
    const systemDark = Appearance.getColorScheme() === "dark";
    return StorageService.local.getBool(ThemeService.#KEY, systemDark);
  }

  static #apply(on: boolean): void {
    try {
      Appearance.setColorScheme(on ? "dark" : "light");
    } catch {
      // Appearance.setColorScheme may not be available on all RN versions
    }
  }
}
