import { ref, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * Safe client query parameter management
 * Handles encoding/decoding and validation of client IDs in URL
 */
export function useClientQuery() {
  const route = useRoute();
  const router = useRouter();

  const selectedClientId = ref<string | null>(null);

  const isValidClientId = (id: string): boolean => {
    return /^c_[a-f0-9]{10}$/.test(id);
  };

  const setClientQuery = async (clientId: string | null) => {
    if (!clientId) {
      await router.replace({
        query: { ...route.query, client: undefined },
      });
      selectedClientId.value = null;
      return;
    }

    if (!isValidClientId(clientId)) {
      console.warn("[useClientQuery] Invalid client ID format:", clientId);
      return;
    }

    await router.replace({
      query: { ...route.query, client: encodeURIComponent(clientId) },
    });
    selectedClientId.value = clientId;
  };

  const getClientFromQuery = (): string | null => {
    const clientParam = route.query.client;
    if (!clientParam || typeof clientParam !== "string") {
      return null;
    }

    const decodedId = decodeURIComponent(clientParam);
    if (!isValidClientId(decodedId)) {
      console.warn(
        "[useClientQuery] Invalid client ID in query param:",
        decodedId,
      );
      return null;
    }

    return decodedId;
  };

  watch(
    () => route.query.client,
    () => {
      selectedClientId.value = getClientFromQuery();
    },
    { immediate: true },
  );

  const clearClientQuery = async () => {
    await setClientQuery(null);
  };

  return {
    selectedClientId: computed(() => selectedClientId.value),
    setClientQuery,
    clearClientQuery,
    isValidClientId,
  };
}
