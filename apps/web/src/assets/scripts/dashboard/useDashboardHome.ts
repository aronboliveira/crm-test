import { onMounted, ref, computed } from "vue";
import { useProjectsStore } from "../../../pinia/stores/projects.store";
import { useTasksStore } from "../../../pinia/stores/tasks.store";
import { useClientsStore } from "../../../pinia/stores/clients.store";
import AlertService from "../../../services/AlertService";

export function useDashboardHome() {
  const projectsStore = useProjectsStore();
  const tasksStore = useTasksStore();
  const clientsStore = useClientsStore();
  const stats = ref({ projects: 0, tasks: 0, clients: 0 });
  const busy = ref(false);
  const DASHBOARD_LIST_LIMIT = 20;
  const DASHBOARD_CLIENTS_LIMIT = 24;

  // Computed arrays from stores (filter out undefined from byId lookups)
  const projects = computed(() =>
    projectsStore.rows.filter((p): p is NonNullable<typeof p> => !!p),
  );
  const tasks = computed(() =>
    tasksStore.rows.filter((t): t is NonNullable<typeof t> => !!t),
  );
  const clients = computed(() =>
    clientsStore.rows.filter((c): c is NonNullable<typeof c> => !!c),
  );

  const load = async () => {
    busy.value = true;
    try {
      await Promise.all([
        projectsStore.list({ reset: true, limit: DASHBOARD_LIST_LIMIT }),
        tasksStore.list({ reset: true, limit: DASHBOARD_LIST_LIMIT }),
      ]);

      stats.value = {
        projects: projectsStore.rows.length,
        tasks: tasksStore.rows.length,
        clients: clientsStore.rows.length,
      };

      // Keep clients load outside the first critical paint.
      const scheduleBackground = (task: () => void) => {
        if (typeof window === "undefined") {
          task();
          return;
        }

        const win = window as Window & {
          requestIdleCallback?: (
            cb: () => void,
            options?: { timeout?: number },
          ) => number;
        };
        if (typeof win.requestIdleCallback === "function") {
          win.requestIdleCallback(task, { timeout: 1200 });
          return;
        }
        window.setTimeout(task, 260);
      };

      scheduleBackground(() => {
        void clientsStore
          .list({ reset: true, maxPages: 1, limit: DASHBOARD_CLIENTS_LIMIT })
          .then(() => {
            stats.value = {
              projects: projectsStore.rows.length,
              tasks: tasksStore.rows.length,
              clients: clientsStore.rows.length,
            };
          })
          .catch((error) => {
            console.warn("[DashboardHome] clients background load failed:", error);
          });
      });
    } catch (e) {
      console.error("[DashboardHome] load failed:", e);
      await AlertService.error("Failed to load dashboard stats", e);
    } finally {
      busy.value = false;
    }
  };

  onMounted(async () => {
    try {
      await load();
    } catch (e) {
      console.error("[DashboardHome] mount failed:", e);
    }
  });

  return { stats, projects, tasks, clients, busy, load };
}
