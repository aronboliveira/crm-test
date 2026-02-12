import { computed, onMounted, ref } from "vue";
import { useTasksStore } from "../../../pinia/stores/tasks.store";

export function useDashboardTasksPage() {
  const tasks = useTasksStore();
  const rows = computed(() => tasks.rows);

  const q = ref("");

  const loading = computed(() => tasks.loading);
  const error = computed(() => tasks.error);
  const nextCursor = computed(() => tasks.nextCursor);

  const load = async (reset = false) => {
    try {
      if (typeof reset !== "boolean") {
        console.warn(
          "[DashboardTasksPage] load: reset must be boolean, got:",
          typeof reset,
        );
        reset = false;
      }
      await tasks.list({ reset, q: q.value || undefined });
    } catch (e) {
      console.error("[DashboardTasksPage] load failed:", e);
      throw e;
    }
  };

  const more = async () => {
    try {
      if (!nextCursor.value) {
        console.warn("[DashboardTasksPage] more: no cursor available");
        return;
      }
      await load(false);
    } catch (e) {
      console.error("[DashboardTasksPage] more failed:", e);
    }
  };

  onMounted(async () => {
    try {
      await load(true);
    } catch (e) {
      console.error("[DashboardTasksPage] mount load failed:", e);
    }
  });

  return { rows, q, loading, error, nextCursor, load, more };
}
