import { computed, onMounted, ref } from "vue";
import { useTasksStore } from "../../../pinia/stores/tasks.store";
import { useProjectsStore } from "../../../pinia/stores/projects.store";
import { useClientsStore } from "../../../pinia/stores/clients.store";
import { useAuthStore } from "../../../pinia/stores/auth.store";
import {
  MY_WORK_CLIENT_ROLE_POOL,
  MY_WORK_DEFAULT_PROFESSIONAL_ROLE,
  MY_WORK_DEFAULT_TECH_CONTACT_ROLE,
  MY_WORK_PAGINATION_GUARD_LIMIT,
  MY_WORK_PROFESSIONAL_ROLE_POOL,
  MY_WORK_UNKNOWN_CLIENT_LABEL,
  MY_WORK_UNKNOWN_PROJECT_LABEL,
  MY_WORK_UPCOMING_DEADLINE_WINDOW_DAYS,
} from "../../../utils/constants/dashboard-my-work.constants";

const toNonNullableRows = <T>(rows: readonly (T | null | undefined)[]): T[] =>
  rows.filter((row): row is T => !!row);
const MY_WORK_BACKGROUND_PAUSE_MS = 40;

const sumCodePoints = (value: string): number =>
  value.split("").reduce((sum, char) => sum + (char?.charCodeAt(0) ?? 0), 0);

export function useDashboardMyWorkPage() {
  const tasksStore = useTasksStore();
  const projectsStore = useProjectsStore();
  const clientsStore = useClientsStore();
  const authStore = useAuthStore();
  const hasInitialSnapshot = ref(
    tasksStore.rows.length > 0 || projectsStore.rows.length > 0,
  );
  const backgroundHydrationRunning = ref(false);

  const loading = computed(
    () =>
      !hasInitialSnapshot.value &&
      (tasksStore.loading || projectsStore.loading || clientsStore.loading),
  );
  const syncing = computed(
    () =>
      hasInitialSnapshot.value &&
      (tasksStore.loading ||
        projectsStore.loading ||
        clientsStore.loading ||
        backgroundHydrationRunning.value),
  );
  const error = computed(
    () => tasksStore.error || projectsStore.error || clientsStore.error,
  );

  const meEmail = computed(() => authStore.me?.email?.toLowerCase() || "");
  const taskRows = computed(() => toNonNullableRows(tasksStore.rows));
  const projectRows = computed(() => toNonNullableRows(projectsStore.rows));
  const clientRows = computed(() => toNonNullableRows(clientsStore.rows));

  const projectById = computed(() => {
    const map = new Map<string, (typeof projectRows.value)[number]>();
    for (const project of projectRows.value) {
      const id = String(project.id || "").trim();
      if (!id) {
        continue;
      }
      map.set(id, project);
    }
    return map;
  });

  const projectLabelById = computed(() => {
    const map = new Map<string, string>();
    for (const project of projectRows.value) {
      const id = String(project.id || "").trim();
      if (!id) {
        continue;
      }
      map.set(id, project.name || project.code || id);
    }
    return map;
  });

  const clientNameById = computed(() => {
    const map = new Map<string, string>();
    for (const client of clientRows.value) {
      const id = String(client.id || "").trim();
      if (!id) {
        continue;
      }
      map.set(id, client.name || MY_WORK_UNKNOWN_CLIENT_LABEL);
    }
    return map;
  });

  const projectProgressById = computed(() => {
    const counters = new Map<string, { total: number; done: number }>();

    for (const task of taskRows.value) {
      const projectId = String(task.projectId || "").trim();
      if (!projectId) {
        continue;
      }
      const counter = counters.get(projectId) ?? { total: 0, done: 0 };
      counter.total += 1;
      if (task.status === "done") {
        counter.done += 1;
      }
      counters.set(projectId, counter);
    }

    const progress = new Map<string, number>();
    for (const [projectId, counter] of counters) {
      if (!counter.total) {
        progress.set(projectId, 0);
        continue;
      }
      progress.set(projectId, Math.round((counter.done / counter.total) * 100));
    }
    return progress;
  });

  const myTasks = computed(() => {
    const email = meEmail.value;
    if (!email) return [];
    return taskRows.value.filter(
      (task) => (task.assigneeEmail || "").toLowerCase() === email,
    );
  });

  const myProjects = computed(() => {
    const email = meEmail.value;
    if (!email) return [];
    return projectRows.value.filter(
      (project) => (project.ownerEmail || "").toLowerCase() === email,
    );
  });

  /* ── Stats ────────────────────────────────────────── */

  const pendingTasks = computed(() =>
    myTasks.value.filter((t) => t.status !== "done" && t.status !== "archived"),
  );

  const highPriorityTasks = computed(() =>
    pendingTasks.value.filter((t) => t.priority <= 2),
  );

  const upcomingDeadlines = computed(() => {
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(now.getDate() + MY_WORK_UPCOMING_DEADLINE_WINDOW_DAYS);

    return pendingTasks.value.filter((task) => {
      if (!task.dueAt) return false;
      const dueDate = new Date(task.dueAt);
      return dueDate >= now && dueDate <= windowEnd;
    });
  });

  const clientStats = computed(() => {
    const stats = new Map<
      string,
      { total: number; done: number; name: string; role: string }
    >();

    // Tasks assigned to me, grouped by Client
    for (const task of myTasks.value) {
      const projectId = String(task.projectId || "").trim();
      if (!projectId) continue;

      const project = projectById.value.get(projectId);
      const clientId = String(project?.clientId || "").trim();
      if (!project || !clientId) continue;

      const clientName =
        clientNameById.value.get(clientId) ?? MY_WORK_UNKNOWN_CLIENT_LABEL;
      const roleIndex = Math.abs(sumCodePoints(clientId)) % MY_WORK_CLIENT_ROLE_POOL.length;
      const role = MY_WORK_CLIENT_ROLE_POOL[roleIndex] ?? MY_WORK_DEFAULT_TECH_CONTACT_ROLE;
      const entry = stats.get(clientId) || {
        total: 0,
        done: 0,
        name: clientName,
        role,
      };

      entry.total++;
      if (task.status === "done") entry.done++;
      stats.set(clientId, entry);
    }

    return Array.from(stats.values())
      .map((s) => ({
        name: s.name,
        total: s.total,
        done: s.done,
        pct: s.total ? Math.round((s.done / s.total) * 100) : 0,
        role: s.role,
      }))
      .sort((a, b) => b.total - a.total);
  });

  const bestConnectedClients = computed(() => clientStats.value.slice(0, 4));

  const professionalRole = computed(() => {
    const email = meEmail.value || "user@corp.local";
    const idx = Math.abs(sumCodePoints(email)) % MY_WORK_PROFESSIONAL_ROLE_POOL.length;
    return MY_WORK_PROFESSIONAL_ROLE_POOL[idx] ?? MY_WORK_DEFAULT_PROFESSIONAL_ROLE;
  });

  /* ── Initialization ───────────────────────────────── */

  const yieldToMainThread = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      if (typeof window === "undefined") {
        resolve();
        return;
      }
      window.setTimeout(resolve, MY_WORK_BACKGROUND_PAUSE_MS);
    });
  };

  const hydrateRemainingPagesInBackground = async (): Promise<void> => {
    if (backgroundHydrationRunning.value) {
      return;
    }
    backgroundHydrationRunning.value = true;
    try {
      let taskGuard = 0;
      while (
        tasksStore.nextCursor &&
        taskGuard < MY_WORK_PAGINATION_GUARD_LIMIT
      ) {
        await tasksStore.list();
        taskGuard += 1;
        await yieldToMainThread();
      }

      let projectGuard = 0;
      while (
        projectsStore.nextCursor &&
        projectGuard < MY_WORK_PAGINATION_GUARD_LIMIT
      ) {
        await projectsStore.list();
        projectGuard += 1;
        await yieldToMainThread();
      }

      let clientsGuard = 0;
      while (
        clientsStore.nextCursor &&
        clientsGuard < MY_WORK_PAGINATION_GUARD_LIMIT
      ) {
        await clientsStore.list({ maxPages: 1 });
        clientsGuard += 1;
        await yieldToMainThread();
      }
    } finally {
      backgroundHydrationRunning.value = false;
    }
  };

  const load = async () => {
    const tasksPromise = tasksStore.rows.length
      ? Promise.resolve()
      : tasksStore.list({ reset: true });
    const projectsPromise = projectsStore.rows.length
      ? Promise.resolve()
      : projectsStore.list({ reset: true });
    const clientsPromise = clientsStore.rows.length
      ? Promise.resolve()
      : clientsStore.list({ reset: true, maxPages: 1 });

    await Promise.all([tasksPromise, projectsPromise, clientsPromise]);
    hasInitialSnapshot.value = true;
    void hydrateRemainingPagesInBackground();
  };

  onMounted(() => {
    void load();
  });

  return {
    loading,
    error,
    meEmail,
    myTasks,
    myProjects,
    pendingTasks,
    highPriorityTasks,
    upcomingDeadlines,
    clientStats,
    bestConnectedClients,
    professionalRole,
    syncing,
    refresh: async () => {
      await Promise.all([
        tasksStore.list({ reset: true }),
        projectsStore.list({ reset: true }),
        clientsStore.list({ reset: true, maxPages: 1 }),
      ]);
      hasInitialSnapshot.value = true;
      void hydrateRemainingPagesInBackground();
    },
    getProjectProgress: (projectId: string) => {
      const normalizedId = String(projectId || "").trim();
      if (!normalizedId) {
        return 0;
      }
      return projectProgressById.value.get(normalizedId) ?? 0;
    },
    getProjectLabel: (projectId: string) => {
      const normalizedId = String(projectId || "").trim();
      if (!normalizedId) {
        return MY_WORK_UNKNOWN_PROJECT_LABEL;
      }
      return projectLabelById.value.get(normalizedId) ?? normalizedId;
    },
  };
}
