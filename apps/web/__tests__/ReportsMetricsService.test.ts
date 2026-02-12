import { describe, expect, it } from "vitest";
import ReportsMetricsService from "../src/services/ReportsMetricsService";
import type { ProjectRow } from "../src/pinia/types/projects.types";
import type { TaskRow } from "../src/pinia/types/tasks.types";

const createTask = (overrides: Partial<TaskRow> = {}): TaskRow =>
  ({
    id: "task-1",
    projectId: "project-1",
    title: "Task",
    assigneeEmail: "user@corp.local",
    assigneeId: "assignee-1",
    milestoneId: null,
    tags: [],
    subtasks: [],
    status: "todo",
    priority: 3,
    dueAt: null,
    deadlineAt: null,
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  }) as TaskRow;

const createProject = (overrides: Partial<ProjectRow> = {}): ProjectRow =>
  ({
    id: "project-1",
    code: "PRJ-1",
    name: "Project",
    ownerEmail: "owner@corp.local",
    status: "active",
    dueAt: null,
    deadlineAt: null,
    tags: [],
    templateKey: null,
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  }) as ProjectRow;

describe("ReportsMetricsService", () => {
  it("normalizes nullish rows safely", () => {
    const projects = ReportsMetricsService.normalizeProjects([
      createProject(),
      null,
      undefined,
    ]);
    const tasks = ReportsMetricsService.normalizeTasks([
      createTask(),
      null,
      undefined,
    ]);

    expect(projects).toHaveLength(1);
    expect(tasks).toHaveLength(1);
  });

  it("builds task summary with overdue and due-this-week stats", () => {
    const now = new Date("2026-02-12T10:00:00.000Z");
    const tasks = [
      createTask({
        id: "done",
        status: "done",
        priority: 1,
        dueAt: "2026-02-10T12:00:00.000Z",
        assigneeEmail: "ana@corp.local",
        projectId: "p1",
      }),
      createTask({
        id: "blocked-overdue",
        status: "blocked",
        priority: 2,
        dueAt: "2026-02-11T12:00:00.000Z",
        assigneeEmail: "bia@corp.local",
        projectId: "p1",
      }),
      createTask({
        id: "todo-week",
        status: "todo",
        priority: 3,
        dueAt: "2026-02-15T12:00:00.000Z",
        assigneeEmail: "",
        projectId: "p2",
      }),
      createTask({
        id: "doing-late-week",
        status: "doing",
        priority: 4,
        dueAt: "2026-02-25T12:00:00.000Z",
        assigneeEmail: "ana@corp.local",
        projectId: "p2",
      }),
      createTask({
        id: "todo-invalid-date",
        status: "todo",
        priority: 5,
        dueAt: "invalid-date",
        assigneeEmail: "cai@corp.local",
        projectId: "p3",
      }),
    ];

    const summary = ReportsMetricsService.buildTaskSummary(tasks, now);

    expect(summary.doneCount).toBe(1);
    expect(summary.blockedCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
    expect(summary.dueThisWeekCount).toBe(1);
    expect(summary.uniqueAssigneesCount).toBe(3);
    expect(summary.statusCounts.done).toBe(1);
    expect(summary.statusCounts.todo).toBe(2);
    expect(summary.priorityCounts[1]).toBe(1);
    expect(summary.priorityCounts[5]).toBe(1);
    expect(summary.assigneeCounts["Não atribuído"]).toBe(1);
    expect(summary.projectCompletionByProjectId.p1).toEqual({ total: 2, done: 1 });
  });

  it("builds slices and arcs without throwing", () => {
    const slices = ReportsMetricsService.makeSlices(
      { active: 3, blocked: 1 },
      { active: "#0f0", blocked: "#f00" },
      { active: "Ativo", blocked: "Bloqueado" },
    );
    const arcs = ReportsMetricsService.buildArcs(slices);

    expect(slices).toHaveLength(2);
    expect(arcs).toHaveLength(2);
    expect(arcs[0]?.d).toContain("A 70 70");
  });

  it("formats invalid dates and unknown errors safely", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(ReportsMetricsService.formatDateLabel("invalid")).toBe("—");
    expect(ReportsMetricsService.toErrorMessage(circular, "erro-fallback")).toBe(
      "erro-fallback",
    );
    expect(
      ReportsMetricsService.combineErrorMessages([new Error("x"), "y"], "z"),
    ).toBe("x | y");
  });
});
