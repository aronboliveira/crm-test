import { onMounted, ref, computed } from "vue";
import { useProjectsStore } from "../../../pinia/stores/projects.store";
import { useTasksStore } from "../../../pinia/stores/tasks.store";
import AlertService from "../../../services/AlertService";

export function useDashboardHome() {
  const projectsStore = useProjectsStore();
  const tasksStore = useTasksStore();
  const stats = ref({ projects: 0, tasks: 0 });
  const busy = ref(false);

  // Computed arrays from stores (filter out undefined from byId lookups)
  const projects = computed(() =>
    projectsStore.rows.filter((p): p is NonNullable<typeof p> => !!p),
  );
  const tasks = computed(() =>
    tasksStore.rows.filter((t): t is NonNullable<typeof t> => !!t),
  );

  const load = async () => {
    busy.value = true;
    try {
      await Promise.all([
        projectsStore.list({ reset: true }),
        tasksStore.list({ reset: true }),
      ]);

      stats.value = {
        projects: projectsStore.rows.length,
        tasks: tasksStore.rows.length,
      };
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

  return { stats, projects, tasks, busy, load };
}
