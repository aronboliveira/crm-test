/**
 * @fileoverview SweetAlert-based progress tracker for client mass import
 * operations (read → parse → validate → submit).
 *
 * Extends the IntegrationProgressService pattern with additional support for:
 * - Row-by-row progress tracking during bulk operations
 * - Validation error reporting with row details
 * - Batch processing indicators
 *
 * Design:
 * - **SRP**: Only responsible for UI feedback via SweetAlert.
 * - **OCP**: New steps can be added without modifying this service.
 * - **DIP**: Consumers pass step descriptors; no coupling to specific flows.
 * - **ISP**: Exposes only necessary methods for progress tracking.
 *
 * @module services/ClientImportProgressService
 */

export type ImportProgressStep = Readonly<{
  key: string;
  label: string;
}>;

export type ImportStepState = "pending" | "running" | "done" | "error";

interface StepStatus {
  readonly step: ImportProgressStep;
  state: ImportStepState;
  detail?: string;
}

type SwalInstance = {
  getHtmlContainer: () => HTMLElement | null;
  isVisible: () => boolean;
  close: () => void;
};

/**
 * Manages a SweetAlert progress popup specialized for client import operations.
 * Shows step-by-step progress with animated progress bar, row counters, and error details.
 *
 * @example
 * ```ts
 * const progress = new ClientImportProgressService(CLIENT_IMPORT_STEPS.massImport());
 * await progress.open("Importando Clientes");
 * progress.markRunning("read");
 * // ...read file...
 * progress.markDone("read", "arquivo.csv");
 * progress.markRunning("parse");
 * // ...parse rows...
 * progress.markDone("parse", "150 registros");
 * progress.setRowProgress(50, 150);
 * // ...
 * await progress.finish("success", "Importação concluída", "150 clientes importados");
 * ```
 */
export default class ClientImportProgressService {
  private readonly steps: StepStatus[];
  private swalRef: SwalInstance | null = null;
  private containerEl: HTMLElement | null = null;
  private totalRows = 0;
  private processedRows = 0;

  constructor(steps: readonly ImportProgressStep[]) {
    this.steps = steps.map((step) => ({
      step,
      state: "pending" as ImportStepState,
    }));
  }

  /* ----- Lifecycle ------------------------------------------------------ */

  /** Open the progress popup via lazy-loaded SweetAlert2. */
  async open(title: string): Promise<void> {
    const Swal = await ClientImportProgressService.loadSwal();

    const result = Swal.fire({
      title,
      html: this.buildHtml(),
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      showCancelButton: false,
      didOpen: () => {
        this.containerEl = Swal.getHtmlContainer?.() ?? null;
        this.refreshDom();
      },
      customClass: {
        container: "swal-over-modal-container",
        popup: "swal-over-modal client-import-progress-popup",
      },
    });

    this.swalRef = Swal as unknown as SwalInstance;
    void result;
  }

  /** Close the progress popup and show a final success/error alert. */
  async finish(
    outcome: "success" | "error" | "warning",
    message: string,
    detail?: string,
  ): Promise<void> {
    this.close();

    const Swal = await ClientImportProgressService.loadSwal();
    await Swal.fire({
      icon: outcome === "warning" ? "warning" : outcome,
      title: message,
      text: detail,
      timer: outcome === "success" && !detail ? 2000 : undefined,
      showConfirmButton:
        !!detail || outcome === "error" || outcome === "warning",
      customClass: {
        container: "swal-over-modal-container",
        popup: "swal-over-modal",
      },
    });
  }

  /** Show a confirmation dialog for dashboard remount. */
  async confirmRemount(message: string, detail: string): Promise<boolean> {
    this.close();

    const Swal = await ClientImportProgressService.loadSwal();
    const result = await Swal.fire({
      icon: "success",
      title: message,
      text: detail,
      showCancelButton: true,
      confirmButtonText: "Recarregar Dashboard",
      cancelButtonText: "Continuar sem recarregar",
      customClass: {
        container: "swal-over-modal-container",
        popup: "swal-over-modal",
      },
    });

    return !!result.isConfirmed;
  }

  /** Show validation errors in a detailed popup. */
  async showValidationErrors(
    errors: ReadonlyArray<{ row: number; field: string; message: string }>,
  ): Promise<void> {
    this.close();

    const Swal = await ClientImportProgressService.loadSwal();

    const errorHtml = errors
      .slice(0, 10)
      .map(
        (err) =>
          `<div class="validation-error-row">
            <span class="validation-error-row__num">Linha ${err.row}</span>
            <span class="validation-error-row__field">${err.field}</span>
            <span class="validation-error-row__msg">${err.message}</span>
          </div>`,
      )
      .join("");

    const moreMsg =
      errors.length > 10
        ? `<p class="validation-error-more">E mais ${errors.length - 10} erros...</p>`
        : "";

    await Swal.fire({
      icon: "error",
      title: "Erros de Validação",
      html: `
        <div class="validation-errors-container">
          ${errorHtml}
          ${moreMsg}
        </div>
      `,
      width: "600px",
      customClass: {
        container: "swal-over-modal-container",
        popup: "swal-over-modal",
      },
    });
  }

  /** Close without showing a final alert. */
  close(): void {
    try {
      this.swalRef?.close();
    } catch {
      // SweetAlert may already be closed
    }
    this.swalRef = null;
    this.containerEl = null;
  }

  /* ----- Step state transitions ----------------------------------------- */

  markRunning(key: string, detail?: string): void {
    this.setStepState(key, "running", detail);
  }

  markDone(key: string, detail?: string): void {
    this.setStepState(key, "done", detail);
  }

  markError(key: string, detail?: string): void {
    this.setStepState(key, "error", detail);
  }

  /* ----- Row progress tracking ------------------------------------------ */

  setTotalRows(total: number): void {
    this.totalRows = total;
    this.processedRows = 0;
    this.refreshRowProgress();
  }

  incrementProcessed(count = 1): void {
    this.processedRows = Math.min(this.processedRows + count, this.totalRows);
    this.refreshRowProgress();
  }

  setRowProgress(processed: number, total: number): void {
    this.processedRows = processed;
    this.totalRows = total;
    this.refreshRowProgress();
  }

  /* ----- Internals ------------------------------------------------------ */

  private setStepState(
    key: string,
    state: ImportStepState,
    detail?: string,
  ): void {
    const entry = this.steps.find((s) => s.step.key === key);
    if (entry) {
      entry.state = state;
      entry.detail = detail;
    }
    this.refreshDom();
  }

  /** Compute 0–100 progress based on step completion + row progress. */
  private getProgressPercent(): number {
    const stepWeight = 0.6;
    const rowWeight = 0.4;

    const doneSteps = this.steps.filter((s) => s.state === "done").length;
    const runningSteps = this.steps.filter((s) => s.state === "running").length;
    const stepProgress =
      ((doneSteps + runningSteps * 0.5) / this.steps.length) * 100;

    const rowProgress =
      this.totalRows > 0 ? (this.processedRows / this.totalRows) * 100 : 0;

    // If we're in a row-processing step, weight row progress more
    const hasRowStep = this.steps.some(
      (s) =>
        s.state === "running" &&
        (s.step.key === "validate" || s.step.key === "submit"),
    );

    if (hasRowStep && this.totalRows > 0) {
      return Math.round(stepProgress * stepWeight + rowProgress * rowWeight);
    }

    return Math.round(stepProgress);
  }

  /** Build the initial HTML structure for steps + progress bar. */
  private buildHtml(): string {
    const stepsHtml = this.steps
      .map(
        (s) => `
      <div class="client-import-step" data-step-key="${s.step.key}" data-step-state="${s.state}">
        <span class="client-import-step__icon">${this.stateIcon(s.state)}</span>
        <span class="client-import-step__label">${s.step.label}</span>
        <span class="client-import-step__detail"></span>
      </div>`,
      )
      .join("");

    return `
      <div class="client-import-progress" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
        <div class="client-import-progress__bar" style="width: 0%"></div>
        <span class="client-import-progress__text">0%</span>
      </div>
      <div class="client-import-row-counter" style="display: none;">
        <span class="client-import-row-counter__current">0</span>
        <span class="client-import-row-counter__sep">/</span>
        <span class="client-import-row-counter__total">0</span>
        <span class="client-import-row-counter__label">registros</span>
      </div>
      <div class="client-import-steps">${stepsHtml}</div>
    `;
  }

  /** Update DOM elements in-place to reflect current state. */
  private refreshDom(): void {
    if (!this.containerEl) return;

    const percent = this.getProgressPercent();

    const progress = this.containerEl.querySelector(".client-import-progress");
    const bar = this.containerEl.querySelector(".client-import-progress__bar");
    const text = this.containerEl.querySelector(
      ".client-import-progress__text",
    );

    if (bar instanceof HTMLElement) {
      bar.style.width = `${percent}%`;
    }
    if (text) {
      text.textContent = `${percent}%`;
    }
    if (progress instanceof HTMLElement) {
      progress.setAttribute("aria-valuenow", String(percent));
    }

    for (const s of this.steps) {
      const el = this.containerEl.querySelector(
        `[data-step-key="${s.step.key}"]`,
      );
      if (!el) continue;
      el.setAttribute("data-step-state", s.state);

      const iconEl = el.querySelector(".client-import-step__icon");
      if (iconEl) iconEl.innerHTML = this.stateIcon(s.state);

      const detailEl = el.querySelector(".client-import-step__detail");
      if (detailEl) detailEl.textContent = s.detail ?? "";
    }
  }

  /** Update row progress display. */
  private refreshRowProgress(): void {
    if (!this.containerEl) return;

    const counter = this.containerEl.querySelector(
      ".client-import-row-counter",
    );
    if (!counter || !(counter instanceof HTMLElement)) return;

    if (this.totalRows > 0) {
      counter.style.display = "flex";
      const currentEl = counter.querySelector(
        ".client-import-row-counter__current",
      );
      const totalEl = counter.querySelector(
        ".client-import-row-counter__total",
      );

      if (currentEl) currentEl.textContent = String(this.processedRows);
      if (totalEl) totalEl.textContent = String(this.totalRows);
    } else {
      counter.style.display = "none";
    }

    // Also refresh the progress bar
    this.refreshDom();
  }

  private stateIcon(state: ImportStepState): string {
    switch (state) {
      case "pending":
        return '<i class="bi bi-circle" aria-hidden="true"></i>';
      case "running":
        return '<span class="client-import-spinner" aria-hidden="true"></span>';
      case "done":
        return '<i class="bi bi-check-circle-fill text-success" aria-hidden="true"></i>';
      case "error":
        return '<i class="bi bi-x-circle-fill text-danger" aria-hidden="true"></i>';
    }
  }

  /* ----- Lazy SweetAlert loader ----------------------------------------- */

  private static async loadSwal() {
    const mod = await import("sweetalert2");
    return mod.default;
  }
}

/**
 * Factory helpers for client import step sequences.
 */
export const CLIENT_IMPORT_STEPS = {
  /** Mass import flow (CSV/JSON/XML → parse → validate → submit). */
  massImport: (): ImportProgressStep[] => [
    { key: "read", label: "Lendo arquivo" },
    { key: "parse", label: "Interpretando conteúdo" },
    { key: "validate", label: "Validando registros" },
    { key: "preview", label: "Preparando prévia" },
    { key: "submit", label: "Enviando para o servidor" },
    { key: "refresh", label: "Atualizando dashboard" },
  ],

  /** Single client import flow (file → parse → fill form). */
  singleImport: (): ImportProgressStep[] => [
    { key: "read", label: "Lendo arquivo" },
    { key: "parse", label: "Interpretando conteúdo" },
    { key: "map", label: "Mapeando campos" },
    { key: "fill", label: "Preenchendo formulário" },
  ],
} as const;
