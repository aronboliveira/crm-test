import { computed, onMounted } from "vue";
import { useClientsStore } from "../../../pinia/stores/clients.store";

export function useDashboardClientsPage() {
  const store = useClientsStore();

  onMounted(() => {
    if (!store.rows?.length) store.list();
  });

  return {
    rows: computed(() => store.rows),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    load: () => store.list({ reset: true }),
  };
}
