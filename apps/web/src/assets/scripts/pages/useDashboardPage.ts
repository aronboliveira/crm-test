import { computed } from "vue";
import { useRouter } from "vue-router";
import PolicyService from "../../../services/PolicyService";

export function useDashboardPage() {
  const router = useRouter();

  const canProjects = computed(() => PolicyService.can("projects.read"));
  const canTasks = computed(() => PolicyService.can("tasks.read"));

  const goProjects = () => {
    try {
      void router.push({ name: "DashboardProjects" });
    } catch (e) {
      console.error("[DashboardPage] goProjects failed:", e);
    }
  };

  const goTasks = () => {
    try {
      void router.push({ name: "DashboardTasks" });
    } catch (e) {
      console.error("[DashboardPage] goTasks failed:", e);
    }
  };

  return { canProjects, canTasks, goProjects, goTasks };
}
