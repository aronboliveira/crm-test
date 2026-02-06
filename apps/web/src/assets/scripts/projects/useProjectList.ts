import { onMounted, ref } from "vue";
import type { Project } from "@corp/contracts";
import ApiClientService from "../../../services/ApiClientService";
import AlertService from "../../../services/AlertService";

export function useProjectList() {
  const rows = ref<readonly Project[]>([]);
  const busy = ref(false);

  const load = async () => {
    busy.value = true;
    try {
      const result = await ApiClientService.projects.list();
      rows.value = Array.isArray(result) ? result : [];
    } catch (e) {
      console.error("[ProjectList] load failed:", e);
      await AlertService.error("Failed to load projects", e);
    } finally {
      busy.value = false;
    }
  };

  onMounted(async () => {
    try {
      await load();
    } catch (e) {
      console.error("[ProjectList] mount failed:", e);
    }
  });

  return { rows, busy };
}
