import type { Project, Task } from "@corp/contracts";
import { DeepFreeze, DateValidator } from "@corp/foundations";

type Dict = Readonly<{
  projectStatuses: readonly Project["status"][];
  taskStatuses: readonly Task["status"][];
  priorities: readonly Task["priority"][];
}>;

export default class EntityNormalizerService {
  static #DICT: Dict = DeepFreeze.apply({
    projectStatuses: ["active", "archived"],
    taskStatuses: ["todo", "doing", "done", "blocked"],
    priorities: [1, 2, 3, 4, 5],
  });

  static projects(v: unknown): readonly Project[] {
    return Array.isArray(v)
      ? (v.map(EntityNormalizerService.#project).filter(Boolean) as Project[])
      : [];
  }

  static tasks(v: unknown): readonly Task[] {
    return Array.isArray(v)
      ? (v.map(EntityNormalizerService.#task).filter(Boolean) as Task[])
      : [];
  }

  static #rec(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === "object" && !Array.isArray(v) ? true : false;
  }

  static #id(v: unknown): string | null {
    if (typeof v === "string" && v.trim()) return v.trim();

    if (
      EntityNormalizerService.#rec(v) &&
      typeof v.$oid === "string" &&
      v.$oid.trim()
    )
      return v.$oid.trim();

    try {
      const s = (v as any)?.toString?.();
      return typeof s === "string" && s !== "[object Object]" && s.trim()
        ? s.trim()
        : null;
    } catch {
      return null;
    }
  }

  static #iso(v: unknown): string {
    const n = DateValidator.normalizeIso(v);
    return n ?? new Date(0).toISOString();
  }

  static #project(v: unknown): Project | null {
    if (!EntityNormalizerService.#rec(v)) return null;

    const id = EntityNormalizerService.#id(v.id);
    const name = typeof v.name === "string" ? v.name.trim() : "";
    const status = EntityNormalizerService.#DICT.projectStatuses.includes(
      v.status as any,
    )
      ? (v.status as Project["status"])
      : null;

    if (!id || !name || !status) return null;

    return {
      id: id as any,
      name,
      description:
        typeof v.description === "string" && v.description.trim()
          ? v.description.trim()
          : undefined,
      status,
      createdAt: EntityNormalizerService.#iso(v.createdAt),
      updatedAt: EntityNormalizerService.#iso(v.updatedAt),
    };
  }

  static #task(v: unknown): Task | null {
    if (!EntityNormalizerService.#rec(v)) return null;

    const id = EntityNormalizerService.#id(v.id);
    const projectId = EntityNormalizerService.#id(v.projectId);
    const title = typeof v.title === "string" ? v.title.trim() : "";
    const status = EntityNormalizerService.#DICT.taskStatuses.includes(
      v.status as any,
    )
      ? (v.status as Task["status"])
      : null;

    const pr = typeof v.priority === "number" ? v.priority : Number(v.priority);
    const priority = EntityNormalizerService.#DICT.priorities.includes(
      pr as any,
    )
      ? (pr as Task["priority"])
      : null;

    if (!id || !projectId || !title || !status || !priority) return null;

    return {
      id: id as any,
      projectId: projectId as any,
      title,
      description:
        typeof v.description === "string" && v.description.trim()
          ? v.description.trim()
          : undefined,
      status,
      priority,
      dueAt: DateValidator.isIso(v.dueAt) ? v.dueAt : undefined,
      createdAt: EntityNormalizerService.#iso(v.createdAt),
      updatedAt: EntityNormalizerService.#iso(v.updatedAt),
    };
  }
}
