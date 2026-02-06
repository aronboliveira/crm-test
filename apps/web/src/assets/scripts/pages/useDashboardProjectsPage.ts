import { computed, onMounted, ref } from "vue";
import { useProjectsStore } from "../../../pinia/stores/projects.store";

export function useDashboardProjectsPage() {
  const projects = useProjectsStore();
  const rows = computed(() => projects.rows);
  const loading = computed(() => projects.loading);
  const error = computed(() => projects.error ?? null);
  const nextCursor = computed(() => projects.nextCursor);

  const q = ref("");

  const load = async (reset = false) => {
    try {
      if (typeof reset !== "boolean") {
        console.warn(
          "[DashboardProjectsPage] load: reset must be boolean, got:",
          typeof reset,
        );
        reset = false;
      }
      await projects.list({ reset, q: q.value || undefined });
    } catch (e) {
      console.error("[DashboardProjectsPage] load failed:", e);
      throw e;
    }
  };

  const more = async () => {
    try {
      if (!nextCursor.value) {
        console.warn("[DashboardProjectsPage] more: no cursor available");
        return;
      }
      await load(false);
    } catch (e) {
      console.error("[DashboardProjectsPage] more failed:", e);
    }
  };

  onMounted(async () => {
    try {
      await load(true);
    } catch (e) {
      console.error("[DashboardProjectsPage] mount load failed:", e);
    }
  });

  return { rows, loading, error, nextCursor, q, load, more };
}
