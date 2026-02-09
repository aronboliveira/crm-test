/** User agent brand information from Navigator API. */
interface UserAgentBrand {
  brand: string;
  version: string;
}

/** User agent data from Navigator API. */
interface UserAgentData {
  brands: UserAgentBrand[];
  mobile: boolean;
  platform: string;
}

/**
 * Utility class for detecting browser types and capabilities.
 * Uses modern User-Agent Client Hints API with fallback to user agent string parsing.
 *
 * @example
 * ```typescript
 * if (CompatibilityValidator.isChromium()) {
 *   // Use Chromium-specific features
 * }
 * ```
 */
export default class CompatibilityValidator {
  /**
   * Checks if the browser is Chromium-based (Chrome, Edge, Opera, Brave, etc.).
   * @returns True if running in a Chromium-based browser
   */
  static isChromium(): boolean {
    try {
      const nav = navigator as Navigator & { userAgentData?: UserAgentData };
      if (nav.userAgentData?.brands) {
        return nav.userAgentData.brands.some((brand) =>
          ["chrome", "edge", "samsung", "opera", "vivaldi", "brave"].some(
            (name) => brand.brand?.toLowerCase().includes(name) ?? false,
          ),
        );
      }
      return /Chrome|CriOS|EdgA|Edg|SamsungBrowser|OPR|Vivaldi|Brave/i.test(
        navigator.userAgent ?? "",
      );
    } catch (error) {
      console.warn("[CompatibilityValidator] Error in isChromium:", error);
      return false;
    }
  }

  /**
   * Checks if the browser is Safari.
   * @returns True if running in Safari (not Chromium-based)
   */
  static isSafari(): boolean {
    try {
      const nav = navigator as Navigator & { userAgentData?: UserAgentData };
      if (nav.userAgentData?.brands) {
        return nav.userAgentData.brands.some((brand) =>
          /safari/i.test(brand.brand ?? ""),
        );
      }

      const ua = navigator.userAgent ?? "";
      return /safari/i.test(ua) && !/chrome|crios|chromium/i.test(ua);
    } catch (error) {
      console.warn("[CompatibilityValidator] Error in isSafari:", error);
      return false;
    }
  }

  /**
   * Checks if the browser uses WebKit engine.
   * @returns True if Chromium-based or Safari
   */
  static isWebkit(): boolean {
    return (
      CompatibilityValidator.isChromium() || CompatibilityValidator.isSafari()
    );
  }

  /**
   * Checks if the browser is Firefox.
   * @returns True if running in Firefox
   */
  static isFirefox(): boolean {
    //@ts-ignore
    return navigator.userAgentData
      ? //@ts-ignore
        navigator.userAgentData.brands.some((brand: any) =>
          String(brand.brand).toLowerCase().includes("firefox"),
        )
      : /Firefox/gi.test(navigator.userAgent);
  }

  /**
   * Checks if the browser is Internet Explorer.
   * @returns True if running in IE or Edge Legacy
   */
  static isExplorer(): boolean {
    return /MSIE|Trident/gi.test(navigator.userAgent);
  }
}
