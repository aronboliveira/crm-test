import type { ProjectRow, ProjectStatus } from "../types/projects.types";
import type { TaskPriority, TaskRow, TaskStatus } from "../types/tasks.types";

export default class MockRowsFactory {
  static #SALT = "corp-admin-v1";

  static projects(count: number): readonly ProjectRow[] {
    try {
      const n = MockRowsFactory.#clamp(count, 25, 1, 200);
      const out: ProjectRow[] = [];
      for (let i = 0; i < n; i++) {
        const project = MockRowsFactory.#project(i);
        if (project) out.push(project);
      }
      return out;
    } catch (error) {
      console.error("[MockRowsFactory] Error generating projects:", error);
      return [];
    }
  }

  static tasks(
    projectIds: readonly string[],
    count: number,
  ): readonly TaskRow[] {
    try {
      const n = MockRowsFactory.#clamp(count, 60, 1, 400);
      const out: TaskRow[] = [];
      const safeProjectIds = projectIds ?? [];
      for (let i = 0; i < n; i++) {
        const task = MockRowsFactory.#task(i, safeProjectIds);
        if (task) out.push(task);
      }
      return out;
    } catch (error) {
      console.error("[MockRowsFactory] Error generating tasks:", error);
      return [];
    }
  }

  static #project(i: number): ProjectRow {
    const id = `p_${MockRowsFactory.#hash(`${MockRowsFactory.#SALT}:p:${i}`).slice(0, 10)}`;
    const code = `PRJ-${String(1000 + i)}`;
    const name = `Project ${i + 1}`;
    const ownerEmail = `owner${(i % 8) + 1}@corp.local`;
    const status = MockRowsFactory.#pick<ProjectStatus>(
      ["planned", "active", "blocked", "done"],
      i,
    );

    const createdAt = MockRowsFactory.#isoDaysAgo(18 + (i % 35));
    const updatedAt = MockRowsFactory.#isoDaysAgo(i % 9);
    const dueAt =
      i % 5 === 0 ? null : MockRowsFactory.#isoDaysFromNow((i % 40) + 2);

    return { id, code, name, ownerEmail, status, dueAt, createdAt, updatedAt };
  }

  static #task(i: number, projectIds: readonly string[]): TaskRow {
    const id = `t_${MockRowsFactory.#hash(`${MockRowsFactory.#SALT}:t:${i}`).slice(0, 10)}`;
    const pid = projectIds.length
      ? projectIds[i % projectIds.length]
      : "p_unknown";

    const title = `Task ${i + 1}`;
    const assigneeEmail = `user${(i % 12) + 1}@corp.local`;
    const status = MockRowsFactory.#pick<TaskStatus>(
      ["todo", "doing", "blocked", "done"],
      i + 3,
    );
    const priority = MockRowsFactory.#pick<TaskPriority>(
      [1, 2, 3, 4, 5],
      i + 7,
    );

    const createdAt = MockRowsFactory.#isoDaysAgo(10 + (i % 25));
    const updatedAt = MockRowsFactory.#isoDaysAgo(i % 6);
    const dueAt =
      i % 6 === 0 ? null : MockRowsFactory.#isoDaysFromNow((i % 20) + 1);

    return {
      id,
      projectId: pid || "",
      title,
      assigneeEmail,
      status,
      priority,
      dueAt,
      createdAt,
      updatedAt,
    };
  }

  static #pick<T>(arr: readonly T[], seed: number): T {
    const i = Math.abs(seed) % arr.length;
    return arr[i] as T;
  }

  static #isoDaysAgo(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
  }

  static #isoDaysFromNow(days: number): string {
    return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
  }

  static #hash(s: string): string {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  static #clamp(v: number, fallback: number, min: number, max: number): number {
    const n = Number.isFinite(v) ? Math.trunc(v) : fallback;
    return n < min ? min : n > max ? max : n;
  }
}
