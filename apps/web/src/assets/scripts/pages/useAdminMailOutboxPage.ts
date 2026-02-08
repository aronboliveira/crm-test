import { onMounted, reactive, ref } from "vue";
import AdminApiService, {
  type MailOutboxItem,
} from "../../../services/AdminApiService";
import AlertService from "../../../services/AlertService";
import DateMapper from "../../../services/DateMapper";

export function useAdminMailOutboxPage() {
  const st = reactive({ q: "", kind: "", cursor: "", limit: 40 });
  const busy = ref(false);
  const items = ref<MailOutboxItem[]>([]);
  const nextCursor = ref<string | null>(null);

  const selected = ref<MailOutboxItem | null>(null);
  const selectedOpen = ref(false);

  const load = async (reset = false) => {
    busy.value = true;
    try {
      if (typeof reset !== "boolean") {
        console.warn(
          "[AdminMailOutboxPage] load: reset must be boolean, got:",
          typeof reset,
        );
        reset = false;
      }

      if (reset) {
        st.cursor = "";
      }

      const r = await AdminApiService.mailOutboxList({
        q: st.q || undefined,
        kind: st.kind || undefined,
        cursor: st.cursor || undefined,
        limit: st.limit,
      });

      const rows = Array.isArray(r?.items) ? r.items : [];
      items.value = reset ? rows : [...items.value, ...rows];
      nextCursor.value = r?.nextCursor || null;
    } catch (e) {
      console.error("[AdminMailOutboxPage] load failed:", e);
      await AlertService.error("Falha ao carregar a caixa de saída", e);
    } finally {
      busy.value = false;
    }
  };

  const more = async () => {
    try {
      if (!nextCursor.value || busy.value) {
        console.warn("[AdminMailOutboxPage] more: no cursor available or busy");
        return;
      }
      st.cursor = String(nextCursor.value);
      await load(false);
    } catch (e) {
      console.error("[AdminMailOutboxPage] more failed:", e);
    }
  };

  const openRow = async (row: MailOutboxItem) => {
    try {
      const id = String(row?._id || "");
      if (!id) {
        console.warn("[AdminMailOutboxPage] openRow: no id provided");
        return;
      }

      selected.value = await AdminApiService.mailOutboxRead(id);
      selectedOpen.value = true;
    } catch (e) {
      console.error("[AdminMailOutboxPage] openRow failed:", e);
      await AlertService.error("Falha ao ler a mensagem", e);
    }
  };

  const close = () => {
    selectedOpen.value = false;
  };

  onMounted(async () => {
    try {
      await load(true);
    } catch (e) {
      console.error("[AdminMailOutboxPage] mount failed:", e);
    }
  });

  return {
    st,
    busy,
    items,
    nextCursor,
    selected,
    selectedOpen,
    load,
    more,
    openRow,
    close,
    DateMapper,
  };
}
