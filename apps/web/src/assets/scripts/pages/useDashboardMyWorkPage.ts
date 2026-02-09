import { computed, onMounted } from "vue";
import { useTasksStore } from "../../../pinia/stores/tasks.store";
import { useProjectsStore } from "../../../pinia/stores/projects.store";
import { useClientsStore } from "../../../pinia/stores/clients.store";
import { useAuthStore } from "../../../pinia/stores/auth.store";
import type { TaskRow } from "../../../pinia/types/tasks.types";
import type { ProjectRow } from "../../../pinia/types/projects.types";

export function useDashboardMyWorkPage() {
  const tasksStore = useTasksStore();
  const projectsStore = useProjectsStore();
  const clientsStore = useClientsStore();
  const authStore = useAuthStore();

  const loading = computed(
    () => tasksStore.loading || projectsStore.loading || clientsStore.loading,
  );
  const error = computed(
    () => tasksStore.error || projectsStore.error || clientsStore.error,
  );

  const meEmail = computed(() => authStore.me?.email?.toLowerCase() || "");

  const myTasks = computed(() => {
    const email = meEmail.value;
    if (!email) return [];
    return tasksStore.rows
      .filter((t): t is NonNullable<typeof t> => !!t)
      .filter((t) => (t.assigneeEmail || "").toLowerCase() === email);
  });

  const myProjects = computed(() => {
    const email = meEmail.value;
    if (!email) return [];
    return projectsStore.rows
      .filter((p): p is NonNullable<typeof p> => !!p)
      .filter((p) => (p.ownerEmail || "").toLowerCase() === email);
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
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    return pendingTasks.value.filter((t) => {
      if (!t.dueAt) return false;
      const d = new Date(t.dueAt);
      return d >= now && d <= sevenDaysFromNow;
    });
  });

  const clientStats = computed(() => {
    const rolePool = [
      "CTO",
      "Tech Lead",
      "Engenheiro Principal",
      "Head de Produto",
      "Arquiteto de Soluções",
      "DevOps Lead",
      "Coordenador Técnico",
    ];
    const stats = new Map<
      string,
      { total: number; done: number; name: string; role: string }
    >();
    const clientsMap = new Map(clientsStore.rows.map((c) => [c.id, c.name]));

    // Tasks assigned to me, grouped by Client
    for (const t of myTasks.value) {
      if (!t.projectId) continue;
      const p = projectsStore.byId[t.projectId];
      if (!p || !p.clientId) continue;

      const clientName = clientsMap.get(p.clientId) || "Unknown";
      const role =
        rolePool[
          Math.abs(
            p.clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
          ) % rolePool.length
        ];
      const entry = stats.get(p.clientId) || {
        total: 0,
        done: 0,
        name: clientName,
        role,
      };

      entry.total++;
      if (t.status === "done") entry.done++;
      stats.set(p.clientId, entry);
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
    const roles = [
      "Engenheiro de Software",
      "Arquiteto de Soluções",
      "Tech Lead",
      "Engenheiro DevOps",
      "Analista de Sistemas",
      "Engenheiro de Dados",
    ];
    const idx =
      Math.abs(email.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
      roles.length;
    return roles[idx];
  });

  /* ── Initialization ───────────────────────────────── */

  const load = async () => {
    // We try to load all tasks/projects to filter locally.
    const p1 = tasksStore.rows.length
      ? Promise.resolve()
      : tasksStore.list({ reset: true });

    const p2 = projectsStore.rows.length
      ? Promise.resolve()
      : projectsStore.list({ reset: true });

    const p3 = clientsStore.rows.length
      ? Promise.resolve()
      : clientsStore.list({ reset: true });

    await Promise.all([p1, p2, p3]);
  };

  onMounted(() => {
    load();
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
    refresh: async () => {
      await Promise.all([
        tasksStore.list({ reset: true }),
        projectsStore.list({ reset: true }),
        clientsStore.list({ reset: true }),
      ]);
    },
    getProjectProgress: (projectId: string) => {
      const tasks = tasksStore.byProject(projectId);
      if (!tasks.length) return 0;
      const done = tasks.filter((t) => t.status === "done").length;
      return Math.round((done / tasks.length) * 100);
    },
  };
}
