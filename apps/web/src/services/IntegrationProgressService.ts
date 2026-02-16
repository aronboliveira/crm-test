/**
 * @fileoverview SweetAlert-based progress tracker for multi-step integration
 * operations (configure → test → sync).
 *
 * Uses a single SweetAlert popup with an HTML progress bar and step list,
 * updated in-place as each step completes, leveraging the vanilla JS
 * `ProgressEvent`-compatible percentage model.
 *
 * Design:
 * - **SRP**: Only responsible for UI feedback via SweetAlert.
 * - **OCP**: New steps can be added without modifying this service.
 * - **DIP**: Consumers pass step descriptors; no coupling to specific flows.
 *
 * @module services/IntegrationProgressService
 */

type ProgressStep = {
  readonly key: string;
  readonly label: string;
};

type StepState = "pending" | "running" | "done" | "error";

interface StepStatus {
  readonly step: ProgressStep;
  state: StepState;
  detail?: string;
}

type SwalInstance = {
  getHtmlContainer: () => HTMLElement | null;
  isVisible: () => boolean;
  close: () => void;
};

/**
 * Manages a SweetAlert progress popup that shows step-by-step progress
 * with an animated progress bar and checkmarks.
 *
 * Usage:
 * ```ts
 * const progress = new IntegrationProgressService([
 *   { key: "validate", label: "Validando campos" },
 *   { key: "save",     label: "Salvando configuração" },
 *   { key: "test",     label: "Testando conexão" },
 * ]);
 * await progress.open("Configurando GLPI");
 * progress.markRunning("validate");
 * // ...do work...
 * progress.markDone("validate");
 * progress.markRunning("save");
 * // ...
 * await progress.finish("success", "GLPI configurado com sucesso!");
 * ```
 */
export default class IntegrationProgressService {
  private readonly steps: StepStatus[];
  private swalRef: SwalInstance | null = null;
  private containerEl: HTMLElement | null = null;

  constructor(steps: readonly ProgressStep[]) {
    this.steps = steps.map((step) => ({ step, state: "pending" as StepState }));
  }

  /* ----- Lifecycle ------------------------------------------------------ */

  /** Open the progress popup via lazy-loaded SweetAlert2. */
  async open(title: string): Promise<void> {
    const Swal = await IntegrationProgressService.loadSwal();

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
        popup: "swal-over-modal integration-progress-popup",
      },
    });

    // SweetAlert returns a promise but we don't await it — we control closing.
    this.swalRef = Swal as unknown as SwalInstance;
    void result; // intentionally not awaited
  }

  /** Close the progress popup and show a final success/error alert. */
  async finish(
    outcome: "success" | "error",
    message: string,
    detail?: string,
  ): Promise<void> {
    this.close();

    const Swal = await IntegrationProgressService.loadSwal();
    await Swal.fire({
      icon: outcome,
      title: message,
      text: detail,
      timer: outcome === "success" && !detail ? 1800 : undefined,
      showConfirmButton: !!detail || outcome === "error",
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

  /* ----- Internals ------------------------------------------------------ */

  private setStepState(key: string, state: StepState, detail?: string): void {
    const entry = this.steps.find((s) => s.step.key === key);
    if (entry) {
      entry.state = state;
      entry.detail = detail;
    }
    this.refreshDom();
  }

  /** Compute 0–100 progress based on step completion. */
  private getProgressPercent(): number {
    const done = this.steps.filter((s) => s.state === "done").length;
    const running = this.steps.filter((s) => s.state === "running").length;
    return Math.round(((done + running * 0.5) / this.steps.length) * 100);
  }

  /** Build the initial HTML structure for steps + progress bar. */
  private buildHtml(): string {
    const stepsHtml = this.steps
      .map(
        (s) => `
      <div class="integration-progress-step" data-step-key="${s.step.key}" data-step-state="${s.state}">
        <span class="integration-progress-step__icon">${this.stateIcon(s.state)}</span>
        <span class="integration-progress-step__label">${s.step.label}</span>
        <span class="integration-progress-step__detail"></span>
      </div>`,
      )
      .join("");

    return `
      <div class="integration-progress-bar-container" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
        <div class="integration-progress-bar" style="width: 0%"></div>
      </div>
      <div class="integration-progress-steps">${stepsHtml}</div>
    `;
  }

  /** Update DOM elements in-place to reflect current state. */
  private refreshDom(): void {
    if (!this.containerEl) return;

    const percent = this.getProgressPercent();

    const barContainer = this.containerEl.querySelector(
      ".integration-progress-bar-container",
    );
    const bar = this.containerEl.querySelector(".integration-progress-bar");
    if (bar instanceof HTMLElement) {
      bar.style.width = `${percent}%`;
    }
    if (barContainer instanceof HTMLElement) {
      barContainer.setAttribute("aria-valuenow", String(percent));
    }

    for (const s of this.steps) {
      const el = this.containerEl.querySelector(
        `[data-step-key="${s.step.key}"]`,
      );
      if (!el) continue;
      el.setAttribute("data-step-state", s.state);

      const iconEl = el.querySelector(".integration-progress-step__icon");
      if (iconEl) iconEl.innerHTML = this.stateIcon(s.state);

      const detailEl = el.querySelector(".integration-progress-step__detail");
      if (detailEl) detailEl.textContent = s.detail ?? "";
    }
  }

  private stateIcon(state: StepState): string {
    switch (state) {
      case "pending":
        return "○";
      case "running":
        return '<span class="integration-progress-spinner"></span>';
      case "done":
        return "✓";
      case "error":
        return "✗";
    }
  }

  /* ----- Lazy SweetAlert loader ----------------------------------------- */

  private static async loadSwal() {
    const mod = await import("sweetalert2");
    return mod.default;
  }
}

/**
 * Factory helpers for common integration step sequences.
 * Keeps step definitions DRY across all integrations.
 */
export const INTEGRATION_STEPS = {
  /** Standard configure + test flow (most integrations). */
  configureAndTest: (integrationName: string): ProgressStep[] => [
    { key: "validate", label: "Validando campos do formulário" },
    { key: "save", label: `Salvando configuração ${integrationName}` },
    { key: "test", label: "Testando conexão com o serviço" },
    { key: "refresh", label: "Atualizando status das integrações" },
  ],

  /** Import flow (file → parse → fill form). */
  fileImport: (): ProgressStep[] => [
    { key: "read", label: "Lendo arquivo" },
    { key: "parse", label: "Interpretando conteúdo" },
    { key: "map", label: "Mapeando campos para o formulário" },
    { key: "fill", label: "Preenchendo formulário" },
  ],

  /** Sync flow (WhatsApp). */
  sync: (integrationName: string): ProgressStep[] => [
    { key: "trigger", label: `Iniciando sincronização ${integrationName}` },
    { key: "poll", label: "Acompanhando progresso do job" },
    { key: "refresh", label: "Atualizando dados da integração" },
  ],
} as const;
