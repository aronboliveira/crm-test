import { onMounted, ref } from "vue";
import type { Task } from "@corp/contracts";
import ApiClientService from "../../../services/ApiClientService";
import AlertService from "../../../services/AlertService";

export function useTaskList() {
  const rows = ref<readonly Task[]>([]);
  const busy = ref(false);
  const showCreate = ref(false);

  const load = async () => {
    busy.value = true;
    try {
      const result = await ApiClientService.tasks.list();
      rows.value = Array.isArray(result) ? result : [];
    } catch (e) {
      console.error("[TaskList] load failed:", e);
      await AlertService.error("Failed to load tasks", e);
    } finally {
      busy.value = false;
    }
  };

  onMounted(async () => {
    try {
      await load();
    } catch (e) {
      console.error("[TaskList] mount failed:", e);
    }
  });

  return { rows, busy, showCreate, load };
}
