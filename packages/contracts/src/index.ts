/**
 * @packageDocumentation
 * Shared type contracts for the CRM application.
 * Provides type definitions used across backend and frontend.
 * @module @crm/contracts
 */

export type { Project } from "./interfaces/project.d.ts";
export type { Task, Subtask } from "./interfaces/task.d.ts";

export type { EntityId, ProjectId, TaskId, Brand } from "./types/ids.d.ts";
export type {
  DeepMutable,
  DeepReadonly,
  JsonValue,
  Narrow,
} from "./types/utility.d.ts";

export type * from "./types/ids.js";
export type * from "./types/utility.js";
