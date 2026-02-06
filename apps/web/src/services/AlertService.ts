type AnyError = unknown;

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
