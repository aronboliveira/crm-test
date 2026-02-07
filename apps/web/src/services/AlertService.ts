type AnyError = unknown;

// Helper to detect dark mode
function isDarkMode(): boolean {
  return (
    document.documentElement.classList.contains("dark-mode") ||
    document.documentElement.dataset.theme === "dark" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

// Get theme-aware SweetAlert config
function getThemeConfig() {
  const dark = isDarkMode();
  return {
    background: dark ? "#18181b" : "#ffffff",
    color: dark ? "#e4e4e7" : "#0f172a",
    confirmButtonColor: "#3b82f6",
    cancelButtonColor: dark ? "#3f3f46" : "#e2e8f0",
    iconColor: undefined, // use default per icon type
  };
}

export default class AlertService {
  static async success(title: string, text?: string): Promise<void> {
    try {
      if (!title || typeof title !== "string") {
        console.warn("[AlertService] Invalid title for success alert");
        return;
      }
      const detail = typeof text === "string" && text.trim() ? text : undefined;
      const Swal = await AlertService.#swal();
      await Swal.fire({
        icon: "success",
        title,
        text: detail,
        timer: detail ? undefined : 1400,
        showConfirmButton: !!detail,
        ...getThemeConfig(),
      });
    } catch (error) {
      console.error("[AlertService] Failed to show success alert:", error);
    }
  }

  static async error(title: string, err?: AnyError): Promise<void> {
    try {
      if (!title || typeof title !== "string") {
        title = "An error occurred";
      }
      const Swal = await AlertService.#swal();
      const detail =
        err instanceof Error ? err.message : typeof err === "string" ? err : "";
      await Swal.fire({
        icon: "error",
        title,
        text: detail || undefined,
        ...getThemeConfig(),
      });
    } catch (error) {
      console.error("[AlertService] Failed to show error alert:", error);
    }
  }

  static async confirm(title: string, text: string): Promise<boolean> {
    try {
      if (!title || typeof title !== "string") {
        title = "Confirm action";
      }
      if (!text || typeof text !== "string") {
        text = "Are you sure?";
      }
      const Swal = await AlertService.#swal();
      const r = await Swal.fire({
        icon: "warning",
        title,
        text,
        showCancelButton: true,
        confirmButtonText: "Confirm",
        ...getThemeConfig(),
      });
      return !!r.isConfirmed;
    } catch (error) {
      console.error("[AlertService] Failed to show confirm dialog:", error);
      return false;
    }
  }

  static async #swal() {
    try {
      const mod = await import("sweetalert2");
      return mod.default;
    } catch (error) {
      console.error("[AlertService] Failed to load sweetalert2:", error);
      throw new Error("Failed to load alert library");
    }
  }
}
