import { onMounted, ref } from "vue";
import ApiClientService from "../../../services/ApiClientService";
import AlertService from "../../../services/AlertService";

export function useDashboardHome() {
  const stats = ref({ projects: 0, tasks: 0 });
  const busy = ref(false);

  const load = async () => {
    busy.value = true;
    try {
      const [p, t] = await Promise.all([
        ApiClientService.projects.list(),
        ApiClientService.tasks.list(),
      ]);

      if (!Array.isArray(p) || !Array.isArray(t)) {
        console.warn("[DashboardHome] load: unexpected data format");
        stats.value = { projects: 0, tasks: 0 };
        return;
      }

      stats.value = { projects: p.length, tasks: t.length };
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

  return { stats, busy, load };
}
