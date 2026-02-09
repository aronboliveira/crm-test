import { computed, onMounted } from "vue";
import { useLeadsStore } from "../../../pinia/stores/leads.store";

export function useDashboardLeadsPage() {
  const store = useLeadsStore();

  onMounted(() => {
    if (!store.rows?.length) store.list();
  });

  return {
    rows: computed(() => store.rows),
    byStatus: computed(() => store.byStatus),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    totalEstimatedValue: computed(() => store.totalEstimatedValue),
    conversionRate: computed(() => store.conversionRate),
    load: (args?: { status?: string }) => store.list({ reset: true, ...args }),
  };
}
