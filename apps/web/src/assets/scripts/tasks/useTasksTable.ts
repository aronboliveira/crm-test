import { onMounted, ref, computed } from "vue";
import type { Task } from "@corp/contracts";
import ApiClientService from "../../../services/ApiClientService";
import AlertService from "../../../services/AlertService";
import EntityNormalizerService from "../../../services/EntityNormalizerService";
import PolicyService from "../../../services/PolicyService";
import EntityPromptService from "../../../services/EntityPromptService";

import useDataTable from "../../../components/tables/useDataTable";
import ColumnRegistry from "../../../components/tables/ColumnRegistry";

export function useTasksTable() {
  const rows = ref<readonly Task[]>([]);
  const spec = ColumnRegistry.tasks();

  const canCreate = computed(() => PolicyService.can("tasks.write"));

  const load = async () => {
    try {
      const raw = await ApiClientService.tasks.list();
      rows.value = EntityNormalizerService.tasks(raw);
    } catch (e) {
      console.error("[TasksTable] load failed:", e);
      await AlertService.error("Failed to load tasks", e);
    }
  };

  const create = async () => {
    try {
      if (!canCreate.value) {
        console.warn("[TasksTable] create: no permission");
        return;
      }
      const success = await EntityPromptService.createTask();
      if (success) {
        await load();
      }
    } catch (e) {
      console.error("[TasksTable] create failed:", e);
    }
  };

  const table = useDataTable<Task>({
    rows,
    columns: spec.columns,
    actions: spec.actions,
    caption: "Tasks",
    ariaLabel: "Tasks table",
    rowId: (t) => String(t.id),
    pageSizes: [10, 20, 50],
    initialPageSize: 10,
  });

  onMounted(async () => {
    try {
      await load();
    } catch (e) {
      console.error("[TasksTable] mount failed:", e);
    }
  });

  return { rows, canCreate, create, load, table };
}
