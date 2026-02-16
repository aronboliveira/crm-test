/**
 * @fileoverview Import blueprint for tasks from CSV/JSON/XML files.
 *
 * Defines validation rules and transformation logic for task imports.
 * Supports fields: title, description, status, priority, assignee, project, milestone, tags, due date, deadline.
 *
 * @module utils/import/blueprints/TaskImportBlueprint
 */

import { ImportBlueprint } from "../ImportBlueprint";
import ImportFieldRules from "../ImportFieldRules";
import type { FieldErrorMap } from "../ImportTypes";

export type TaskStatus = "todo" | "doing" | "done" | "blocked";
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export type TaskImportDraft = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeEmail: string;
  projectId: string;
  milestoneId: string;
  tags: string;
  dueAt: string;
  deadlineAt: string;
};

export type TaskImportPayload = Readonly<{
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeEmail?: string;
  projectId?: string;
  milestoneId?: string;
  tags?: string[];
  dueAt?: string;
  deadlineAt?: string;
}>;

const TASK_STATUS_SET = new Set<TaskStatus>([
  "todo",
  "doing",
  "done",
  "blocked",
]);

const TASK_PRIORITY_SET = new Set<TaskPriority>([1, 2, 3, 4, 5]);

/**
 * Blueprint for validating and transforming task import data.
 *
 * @example
 * ```typescript
 * const blueprint = new TaskImportBlueprint();
 * const draft = blueprint.createDraft();
 * draft.title = "Implement feature X";
 * draft.status = "todo";
 * draft.priority = 3;
 *
 * const errors = await blueprint.validate(draft);
 * if (Object.keys(errors).length === 0) {
 *   const payload = blueprint.toPayload(draft);
 *   await api.tasks.create(payload);
 * }
 * ```
 */
export class TaskImportBlueprint extends ImportBlueprint<
  TaskImportDraft,
  TaskImportPayload
> {
  readonly kind = "tasks" as const;
  readonly label = "Tarefas";

  /**
   * Creates an empty draft with default values.
   */
  createDraft(): TaskImportDraft {
    return {
      title: "",
      description: "",
      status: "todo",
      priority: 3,
      assigneeEmail: "",
      projectId: "",
      milestoneId: "",
      tags: "",
      dueAt: "",
      deadlineAt: "",
    };
  }

  /**
   * Validates a task draft synchronously.
   * Checks title, status, priority, email, dates.
   */
  validateDraftSync(draft: TaskImportDraft): FieldErrorMap<TaskImportDraft> {
    const errors: FieldErrorMap<TaskImportDraft> = {};

    // Title is required
    if (!ImportFieldRules.normalizeText(draft.title)) {
      errors.title = "Título da tarefa é obrigatório.";
    } else if (draft.title.length > 200) {
      errors.title = "Título deve ter no máximo 200 caracteres.";
    }

    // Status validation
    if (!TASK_STATUS_SET.has(draft.status)) {
      errors.status = `Status inválido. Use: ${Array.from(TASK_STATUS_SET).join(", ")}.`;
    }

    // Priority validation
    if (!TASK_PRIORITY_SET.has(draft.priority)) {
      errors.priority = "Prioridade deve ser 1 (baixa) a 5 (crítica).";
    }

    // Assignee email validation (optional)
    if (
      draft.assigneeEmail.trim() &&
      !ImportFieldRules.isValidEmail(draft.assigneeEmail)
    ) {
      errors.assigneeEmail = "E-mail do responsável inválido.";
    }

    // Date validations
    if (draft.dueAt.trim() && !ImportFieldRules.isValidDate(draft.dueAt)) {
      errors.dueAt = "Previsão deve estar em YYYY-MM-DD.";
    }

    if (
      draft.deadlineAt.trim() &&
      !ImportFieldRules.isValidDate(draft.deadlineAt)
    ) {
      errors.deadlineAt = "Prazo deve estar em YYYY-MM-DD.";
    }

    // Check if deadline is before dueAt
    if (
      draft.dueAt.trim() &&
      draft.deadlineAt.trim() &&
      ImportFieldRules.isValidDate(draft.dueAt) &&
      ImportFieldRules.isValidDate(draft.deadlineAt)
    ) {
      const due = new Date(draft.dueAt);
      const deadline = new Date(draft.deadlineAt);
      if (deadline < due) {
        errors.deadlineAt = "Prazo não pode ser anterior à previsão.";
      }
    }

    return errors;
  }

  /**
   * Transforms a validated draft into API payload.
   */
  toPayload(draft: TaskImportDraft): TaskImportPayload {
    return {
      title: ImportFieldRules.normalizeText(draft.title),
      status: draft.status,
      priority: draft.priority,
      description:
        ImportFieldRules.normalizeText(draft.description) || undefined,
      assigneeEmail: draft.assigneeEmail.trim().toLowerCase() || undefined,
      projectId: draft.projectId.trim() || undefined,
      milestoneId: draft.milestoneId.trim() || undefined,
      tags: ImportFieldRules.normalizeTagList(draft.tags).length
        ? ImportFieldRules.normalizeTagList(draft.tags)
        : undefined,
      dueAt: draft.dueAt.trim() || undefined,
      deadlineAt: draft.deadlineAt.trim() || undefined,
    };
  }

  summarize(payload: TaskImportPayload): string {
    return `${payload.title} • ${payload.status} • P${payload.priority}`;
  }
}
