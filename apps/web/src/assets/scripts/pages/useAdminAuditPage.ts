import { computed, onMounted, ref } from "vue";
import { usePolicyStore } from "../../../pinia/stores/policy.store";
import AlertService from "../../../services/AlertService";
import StorageService from "../../../services/StorageService";
import AdminApiService from "../../../services/AdminApiService";
import type { AdminAuditSliceRow } from "../../../types/admin.types";

export function useAdminAuditPage() {
  const policy = usePolicyStore();
  const can = computed(() => policy.can("audit.read"));

  const KEY = "admin.audit.state";
  const st = ref<{
    q: string;
    kind: string;
    cursor: string | null;
    limit: number;
  }>({
    q: "",
    kind: "",
    cursor: null,
    limit: 100,
  });

  const rows = ref<readonly AdminAuditSliceRow[]>([]);
  const busy = ref(false);
  const nextCursor = ref<string | null>(null);

  const saveState = () => {
    try {
      StorageService.session.setJson(KEY, st.value);
    } catch (e) {
      console.error("[AdminAuditPage] saveState failed:", e);
    }
  };

  const loadState = () => {
    try {
      const hasExplicitRouteFilters =
        !!String(st.value.q || "").trim() || !!String(st.value.kind || "").trim();
      if (hasExplicitRouteFilters) {
        return;
      }
      const saved = StorageService.session.getJson(KEY, st.value);
      if (saved) {
        st.value = saved as typeof st.value;
      }
    } catch (e) {
      console.error("[AdminAuditPage] loadState failed:", e);
    }
  };

  const load = async (reset: boolean) => {
    if (!can.value || busy.value) return;

    busy.value = true;
    try {
      if (typeof reset !== "boolean") {
        console.warn(
          "[AdminAuditPage] load: reset must be boolean, got:",
          typeof reset,
        );
        reset = false;
      }

      if (reset) {
        rows.value = [];
        st.value.cursor = null;
      }

      const r = await AdminApiService.auditList({
        q: st.value.q.trim() || undefined,
        kind: st.value.kind.trim() || undefined,
        cursor: st.value.cursor || undefined,
        limit: st.value.limit,
      });

      const normalized = (r.items || []).map((it) => {
        const item: any = it as any;
        return {
          ...item,
          id: (item.id ?? item._id ?? "") as string,
        } as AdminAuditSliceRow;
      });

      rows.value = reset ? normalized : [...rows.value, ...normalized];
      nextCursor.value = r.nextCursor || null;
      st.value.cursor = r.nextCursor || null;

      saveState();
    } catch (e) {
      console.error("[AdminAuditPage] load failed:", e);
      await AlertService.error("Failed to load audit events", e);
    } finally {
      busy.value = false;
    }
  };

  onMounted(() => {
    try {
      loadState();
      void load(true);
    } catch (e) {
      console.error("[AdminAuditPage] mount failed:", e);
    }
  });

  return { can, st, rows, busy, nextCursor, load };
}
