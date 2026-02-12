import type { ProjectRow } from "../pinia/types/projects.types";
import type { TaskPriority, TaskRow } from "../pinia/types/tasks.types";
import SafeJsonService from "./SafeJsonService";
import {
  REPORTS_ASSIGNEE_UNASSIGNED_LABEL,
  REPORTS_DUE_WEEK_WINDOW_DAYS,
  REPORTS_EMPTY_DATE_LABEL,
  REPORTS_EMPTY_VALUE_LABEL,
  REPORTS_WORKLOAD_BAR_COLOR,
  REPORTS_WORKLOAD_LABEL_MAX_LENGTH,
} from "../utils/constants/dashboard-reports.constants";

export type ReportsSlice = {
  label: string;
  value: number;
  color: string;
  pct: number;
};

export type ReportsArc = {
  d: string;
  color: string;
  label: string;
  pct: number;
};

export type ReportsBar = {
  label: string;
  count: number;
  pct: number;
  color: string;
};

export type ReportsAssigneeLoad = {
  email: string;
  count: number;
};

export type ReportsTaskSummary = {
  statusCounts: Record<string, number>;
  priorityCounts: Record<number, number>;
  doneCount: number;
  blockedCount: number;
  overdueCount: number;
  dueThisWeekCount: number;
  uniqueAssigneesCount: number;
  assigneeCounts: Record<string, number>;
  projectCompletionByProjectId: Record<string, { total: number; done: number }>;
};

type ProjectCompletion = { total: number; done: number };

type ProjectStatsInput = {
  status: string;
};

type TaskStatsInput = {
  status: string;
  priority: number;
  assigneeEmail: string;
  dueAt: string | null;
  projectId: string;
};

export default class ReportsMetricsService {
  static normalizeProjects(
    rows: readonly (ProjectRow | null | undefined)[] | null | undefined,
  ): ProjectRow[] {
    return (rows || []).filter(Boolean) as ProjectRow[];
  }

  static normalizeTasks(
    rows: readonly (TaskRow | null | undefined)[] | null | undefined,
  ): TaskRow[] {
    return (rows || []).filter(Boolean) as TaskRow[];
  }

  static buildStatusCounts<T extends ProjectStatsInput | TaskStatsInput>(
    rows: readonly T[],
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const row of rows) {
      if (!row?.status) continue;
      result[row.status] = (result[row.status] || 0) + 1;
    }
    return result;
  }

  static buildTaskSummary(
    tasks: readonly TaskRow[],
    referenceDate = new Date(),
  ): ReportsTaskSummary {
    const statusCounts = ReportsMetricsService.buildStatusCounts(tasks);
    const priorityCounts: Record<number, number> = {};
    const assigneeCounts: Record<string, number> = {};
    const projectCompletionByProjectId: Record<string, ProjectCompletion> = {};
    const uniqueAssignees = new Set<string>();

    const todayStamp = ReportsMetricsService.toDateStamp(referenceDate);
    const weekEndStamp = ReportsMetricsService.toDateStamp(
      ReportsMetricsService.addDays(referenceDate, REPORTS_DUE_WEEK_WINDOW_DAYS),
    );

    let doneCount = 0;
    let blockedCount = 0;
    let overdueCount = 0;
    let dueThisWeekCount = 0;

    for (const task of tasks) {
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;

      if (task.status === "done") doneCount += 1;
      if (task.status === "blocked") blockedCount += 1;

      if (task.assigneeEmail) {
        uniqueAssignees.add(task.assigneeEmail.toLowerCase());
      }

      const assigneeLabel = task.assigneeEmail || REPORTS_ASSIGNEE_UNASSIGNED_LABEL;
      assigneeCounts[assigneeLabel] = (assigneeCounts[assigneeLabel] || 0) + 1;

      if (task.projectId) {
        if (!projectCompletionByProjectId[task.projectId]) {
          projectCompletionByProjectId[task.projectId] = { total: 0, done: 0 };
        }
        const completion = projectCompletionByProjectId[task.projectId];
        if (completion) {
          completion.total += 1;
          if (task.status === "done") completion.done += 1;
        }
      }

      if (task.status === "done") continue;
      const dueStamp = ReportsMetricsService.extractDateStamp(task.dueAt);
      if (!dueStamp) continue;

      if (dueStamp < todayStamp) overdueCount += 1;
      if (dueStamp >= todayStamp && dueStamp <= weekEndStamp) {
        dueThisWeekCount += 1;
      }
    }

    return {
      statusCounts,
      priorityCounts,
      doneCount,
      blockedCount,
      overdueCount,
      dueThisWeekCount,
      uniqueAssigneesCount: uniqueAssignees.size,
      assigneeCounts,
      projectCompletionByProjectId,
    };
  }

  static calculateCompletionRate(doneCount: number, totalCount: number): number {
    if (totalCount <= 0) return 0;
    return Math.round((doneCount / totalCount) * 100);
  }

  static calculateAverage(
    total: number,
    divisor: number,
    precision = 1,
  ): number {
    if (divisor <= 0) return 0;
    const safePrecision =
      Number.isFinite(precision) && precision >= 0 ? Math.floor(precision) : 0;
    const factor = 10 ** safePrecision;
    return Math.round((total / divisor) * factor) / factor;
  }

  static rankAssigneeWorkload(
    assigneeCounts: Record<string, number>,
    limit = 8,
  ): ReportsAssigneeLoad[] {
    return Object.entries(assigneeCounts)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  static makeSlices(
    map: Record<string, number>,
    colors: Readonly<Record<string, string>>,
    labels?: Readonly<Record<string, string>>,
  ): ReportsSlice[] {
    const total = Object.values(map).reduce((sum, current) => sum + current, 0);
    if (!total) return [];

    return Object.entries(map)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({
        label: labels?.[key] || key,
        value,
        color: colors[key] || "#64748b",
        pct: Math.round((value / total) * 100),
      }));
  }

  static buildArcs(slices: readonly ReportsSlice[]): ReportsArc[] {
    const arcs: ReportsArc[] = [];
    let angle = 0;

    for (const slice of slices) {
      const sweep = (slice.pct / 100) * 360;
      if (sweep < 0.5) continue;

      const clampedSweep = Math.min(sweep, 359.99);
      arcs.push({
        d: ReportsMetricsService.donutPath(angle, angle + clampedSweep),
        color: slice.color,
        label: slice.label,
        pct: slice.pct,
      });
      angle += sweep;
    }

    return arcs;
  }

  static buildPriorityBars(
    priorityCounts: Record<number, number>,
    labels: Readonly<Record<number, string>>,
    colors: Readonly<Record<number, string>>,
  ): ReportsBar[] {
    const entries = Object.entries(priorityCounts)
      .map(([key, count]) => ({
        key: Number(key) as TaskPriority,
        count,
      }))
      .sort((left, right) => left.key - right.key);

    if (!entries.length) return [];
    const max = Math.max(...entries.map((entry) => entry.count), 1);

    return entries.map((entry) => ({
      label: labels[entry.key] || `P${entry.key}`,
      count: entry.count,
      pct: Math.round((entry.count / max) * 100),
      color: colors[entry.key] || "#64748b",
    }));
  }

  static buildWorkloadBars(
    workloads: readonly ReportsAssigneeLoad[],
    color = REPORTS_WORKLOAD_BAR_COLOR,
  ): ReportsBar[] {
    if (!workloads.length) return [];
    const max = Math.max(...workloads.map((workload) => workload.count), 1);

    return workloads.map((workload) => ({
      label: ReportsMetricsService.truncateLabel(
        workload.email,
        REPORTS_WORKLOAD_LABEL_MAX_LENGTH,
      ),
      count: workload.count,
      pct: Math.round((workload.count / max) * 100),
      color,
    }));
  }

  static formatDateLabel(
    isoDate: string | null | undefined,
    locale = "pt-BR",
    fallback = REPORTS_EMPTY_DATE_LABEL,
  ): string {
    if (!isoDate || typeof isoDate !== "string") return fallback;
    try {
      const parsedDate = new Date(isoDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return fallback;
      }
      return parsedDate.toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return fallback;
    }
  }

  static toErrorMessage(
    error: unknown,
    fallback = REPORTS_EMPTY_VALUE_LABEL,
  ): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }

    const serialized = SafeJsonService.stringify(error, "", 0);
    return serialized && serialized !== "{}" ? serialized : fallback;
  }

  static combineErrorMessages(
    errors: readonly unknown[],
    fallback = "Falha ao carregar dados de relatórios.",
  ): string {
    const messages = errors
      .map((error) => ReportsMetricsService.toErrorMessage(error, ""))
      .filter((message) => !!message);

    if (!messages.length) return fallback;
    return messages.join(" | ");
  }

  private static donutPath(
    startAngle: number,
    endAngle: number,
    radius = 70,
    centerX = 90,
    centerY = 90,
  ): string {
    const startRadians = (startAngle - 90) * (Math.PI / 180);
    const endRadians = (endAngle - 90) * (Math.PI / 180);
    const x1 = centerX + radius * Math.cos(startRadians);
    const y1 = centerY + radius * Math.sin(startRadians);
    const x2 = centerX + radius * Math.cos(endRadians);
    const y2 = centerY + radius * Math.sin(endRadians);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  }

  private static addDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  private static toDateStamp(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private static extractDateStamp(rawDate: string | null | undefined): string | null {
    if (!rawDate || typeof rawDate !== "string") return null;

    const directMatch = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (directMatch && directMatch[1]) {
      return directMatch[1];
    }

    const parsedMs = Date.parse(rawDate);
    if (!Number.isFinite(parsedMs)) return null;
    return new Date(parsedMs).toISOString().slice(0, 10);
  }

  private static truncateLabel(input: string, maxLength: number): string {
    if (!input) return REPORTS_EMPTY_VALUE_LABEL;
    if (input.length <= maxLength) return input;
    return `${input.slice(0, maxLength - 1)}…`;
  }
}
