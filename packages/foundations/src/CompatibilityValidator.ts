interface UserAgentBrand {
  brand: string;
  version: string;
}

interface UserAgentData {
  brands: UserAgentBrand[];
  mobile: boolean;
  platform: string;
}

export default class CompatibilityValidator {
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

  static isWebkit(): boolean {
    return (
      CompatibilityValidator.isChromium() || CompatibilityValidator.isSafari()
    );
  }

  static isFirefox(): boolean {
    //@ts-ignore
    return navigator.userAgentData
      ? //@ts-ignore
        navigator.userAgentData.brands.some((brand: any) =>
          String(brand.brand).toLowerCase().includes("firefox"),
        )
      : /Firefox/gi.test(navigator.userAgent);
  }

  static isExplorer(): boolean {
    return /MSIE|Trident/gi.test(navigator.userAgent);
  }
}
