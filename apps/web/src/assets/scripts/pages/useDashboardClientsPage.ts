import { computed, onMounted, ref } from "vue";
import { useClientsStore } from "../../../pinia/stores/clients.store";

const CLIENTS_INITIAL_PAGES = 1;
const CLIENTS_BACKGROUND_PAGE_GUARD = 8;
const CLIENTS_BACKGROUND_PAUSE_MS = 40;

const yieldToMainThread = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    window.setTimeout(resolve, CLIENTS_BACKGROUND_PAUSE_MS);
  });
};

export function useDashboardClientsPage() {
  const store = useClientsStore();
  const initialLoaded = ref(store.rows.length > 0);
  const backgroundSyncing = ref(false);

  const loadRemainingInBackground = async (): Promise<void> => {
    if (backgroundSyncing.value || !store.nextCursor) return;
    backgroundSyncing.value = true;
    try {
      let guard = 0;
      while (store.nextCursor && guard < CLIENTS_BACKGROUND_PAGE_GUARD) {
        await store.list({
          maxPages: 1,
        });
        guard += 1;
        await yieldToMainThread();
      }
    } finally {
      backgroundSyncing.value = false;
    }
  };

  const loadInitial = async (): Promise<void> => {
    await store.list({
      reset: true,
      maxPages: CLIENTS_INITIAL_PAGES,
    });
    initialLoaded.value = true;
    void loadRemainingInBackground();
  };

  onMounted(() => {
    if (!store.rows?.length) {
      void loadInitial();
      return;
    }
    if (store.nextCursor) {
      void loadRemainingInBackground();
    }
  });

  return {
    rows: computed(() => store.rows),
    loading: computed(() => !initialLoaded.value && store.loading),
    syncing: computed(
      () => initialLoaded.value && (store.loading || backgroundSyncing.value),
    ),
    error: computed(() => store.error),
    load: async () => {
      await loadInitial();
    },
  };
}
