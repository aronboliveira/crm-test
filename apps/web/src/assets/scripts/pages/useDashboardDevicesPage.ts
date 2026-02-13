import { computed } from "vue";
import { useDevicesStore } from "../../../pinia/stores/devices.store";
import type { DeviceListQuery } from "../../../pinia/types/devices.types";

export function useDashboardDevicesPage() {
  const store = useDevicesStore();

  return {
    rows: computed(() => store.rows),
    loading: computed(() => store.loading),
    saving: computed(() => store.saving),
    error: computed(() => store.error),
    total: computed(() => store.total),
    page: computed(() => store.page),
    pageSize: computed(() => store.pageSize),
    sortBy: computed(() => store.sortBy),
    sortDir: computed(() => store.sortDir),
    load: (args?: DeviceListQuery) => store.list(args),
    create: store.create,
    update: store.update,
    remove: store.remove,
  };
}
