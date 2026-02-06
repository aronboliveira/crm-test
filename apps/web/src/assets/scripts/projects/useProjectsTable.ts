import { onMounted, onUnmounted, ref, computed } from "vue";
import type { Project } from "@corp/contracts";
import ApiClientService from "../../../services/ApiClientService";
import AlertService from "../../../services/AlertService";
import EntityNormalizerService from "../../../services/EntityNormalizerService";
import PolicyService from "../../../services/PolicyService";
import EntityPromptService from "../../../services/EntityPromptService";

import useDataTable from "../../../components/tables/useDataTable";
import ColumnRegistry from "../../../components/tables/ColumnRegistry";
import AppEventsService from "../../../services/AppEventService";

export function useProjectsTable() {
  const rows = ref<readonly Project[]>([]);
  const spec = ColumnRegistry.projects();

  const canCreate = computed(() => PolicyService.can("projects.write"));

  const load = async () => {
    try {
      const raw = await ApiClientService.projects.list();
      rows.value = EntityNormalizerService.projects(raw);
    } catch (e) {
      console.error("[ProjectsTable] load failed:", e);
      await AlertService.error("Failed to load projects", e);
    }
  };

  const create = async () => {
    try {
      if (!canCreate.value) {
        console.warn("[ProjectsTable] create: no permission");
        return;
      }
      const success = await EntityPromptService.createProject();
      if (success) {
        await load();
      }
    } catch (e) {
      console.error("[ProjectsTable] create failed:", e);
    }
  };

  const table = useDataTable<Project>({
    rows,
    columns: spec.columns,
    actions: spec.actions,
    caption: "Projects",
    ariaLabel: "Projects table",
    rowId: (p) => String(p.id),
    pageSizes: [10, 20, 50],
    initialPageSize: 10,
  });

  let off: null | (() => void) = null;

  onMounted(() => {
    try {
      off = AppEventsService.on("projects:changed", () => void load());
      void load();
    } catch (e) {
      console.error("[ProjectsTable] mount failed:", e);
    }
  });

  onUnmounted(() => {
    try {
      if (off) {
        off();
      }
    } catch (e) {
      console.error("[ProjectsTable] unmount failed:", e);
    }
  });

  return { rows, canCreate, create, load, table };
}
