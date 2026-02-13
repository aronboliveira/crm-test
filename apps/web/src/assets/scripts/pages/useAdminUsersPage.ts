import { computed, onMounted, ref } from "vue";
import Swal from "sweetalert2";
import { usePolicyStore } from "../../../pinia/stores/policy.store";
import AlertService from "../../../services/AlertService";
import StorageService from "../../../services/StorageService";
import AdminApiService from "../../../services/AdminApiService";
import type { AdminUserRow } from "../../../types/admin.types";
import type { ResetResponse } from "../../../types/auth.types";

export function useAdminUsersPage() {
  const policy = usePolicyStore();
  const createOpen = ref(false);
  const openCreate = () => (createOpen.value = true);
  const closeCreate = () => (createOpen.value = false);

  const can = computed(() => policy.can("users.manage"));

  const KEY = "admin.users.state";
  const st = ref<{
    q: string;
    roleKey: string;
    cursor: string | null;
    limit: number;
  }>({
    q: "",
    roleKey: "",
    cursor: null,
    limit: 50,
  });

  const rows = ref<readonly AdminUserRow[]>([]);
  const busy = ref(false);
  const nextCursor = ref<string | null>(null);
  const drawerOpen = ref(false);
  const drawerUserId = ref<string | null>(null);

  const openDrawer = (u: AdminUserRow) => (
    (drawerUserId.value = u.id),
    (drawerOpen.value = true)
  );
  const closeDrawer = () => (drawerOpen.value = false);

  const saveState = () => {
    try {
      StorageService.session.setJson(KEY, st.value);
    } catch (e) {
      console.error("[AdminUsersPage] saveState failed:", e);
    }
  };

  const loadState = () => {
    try {
      const hasExplicitRouteFilters =
        !!String(st.value.q || "").trim() || !!String(st.value.roleKey || "").trim();
      if (hasExplicitRouteFilters) {
        return;
      }
      const saved = StorageService.session.getJson(KEY, st.value);
      if (saved) {
        st.value = saved as typeof st.value;
      }
    } catch (e) {
      console.error("[AdminUsersPage] loadState failed:", e);
    }
  };

  const load = async (reset: boolean) => {
    if (!can.value || busy.value) return;

    busy.value = true;
    try {
      if (typeof reset !== "boolean") {
        console.warn(
          "[AdminUsersPage] load: reset must be boolean, got:",
          typeof reset,
        );
        reset = false;
      }

      if (reset) {
        rows.value = [];
        st.value.cursor = null;
      }

      const r = await AdminApiService.usersList({
        q: st.value.q.trim() || undefined,
        roleKey: st.value.roleKey.trim() || undefined,
        cursor: st.value.cursor || undefined,
        limit: st.value.limit,
      });

      rows.value = reset ? r.items : [...rows.value, ...r.items];
      nextCursor.value = r.nextCursor || null;
      st.value.cursor = r.nextCursor || null;

      saveState();
    } catch (e) {
      console.error("[AdminUsersPage] load failed:", e);
      await AlertService.error("Falha ao carregar usuários", e);
    } finally {
      busy.value = false;
    }
  };

  const setRole = async (u: AdminUserRow) => {
    if (!can.value) return;

    try {
      if (!u?.id) {
        console.error("[AdminUsersPage] setRole: invalid user object");
        return;
      }

      const { value, isConfirmed } = await Swal.fire({
        title: "Alterar perfil",
        input: "select",
        inputOptions: {
          viewer: "Visualizador",
          member: "Membro",
          manager: "Gerente",
          admin: "Administrador",
        },
        inputValue: u.roleKey || "viewer",
        showCancelButton: true,
        confirmButtonText: "Aplicar",
        cancelButtonText: "Cancelar",
      });

      if (!isConfirmed) return;

      await AdminApiService.userSetRole(u.id, String(value || "viewer"));
      await AlertService.success("Perfil atualizado");
      await load(true);
    } catch (e) {
      console.error("[AdminUsersPage] setRole failed:", e);
      await AlertService.error("Falha ao atualizar perfil", e);
    }
  };

  const forceReset = async (u: AdminUserRow) => {
    if (!can.value) return;

    try {
      if (!u?.id) {
        console.error("[AdminUsersPage] forceReset: invalid user object");
        return;
      }

      const { isConfirmed } = await Swal.fire({
        title: "Forçar redefinição de senha?",
        text: `Isso invalidará as sessões de "${u.email}".`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Forçar redefinição",
        cancelButtonText: "Cancelar",
      });

      if (!isConfirmed) return;

      const r: ResetResponse = await AdminApiService.userForceReset(u.id);

      if (r?.devResetToken) {
        const tok = String(r.devResetToken);
        await Swal.fire({
          title: "Token de redefinição (dev)",
          html: `<code style="display:block;word-break:break-all;padding:0.6rem;border-radius:0.6rem;background:rgba(0,0,0,0.06)">${tok}</code>`,
          confirmButtonText: "OK",
        });
      } else {
        await AlertService.success(
          "Redefinição forçada aplicada",
          "Em produção, um e-mail de recuperação deve ser enviado.",
        );
      }

      await load(true);
    } catch (e) {
      console.error("[AdminUsersPage] forceReset failed:", e);
      await AlertService.error("Falha ao forçar redefinição", e);
    }
  };

  onMounted(() => {
    try {
      loadState();
      void load(true);
    } catch (e) {
      console.error("[AdminUsersPage] mount failed:", e);
    }
  });

  return {
    createOpen,
    openCreate,
    closeCreate,
    can,
    st,
    rows,
    busy,
    nextCursor,
    drawerOpen,
    drawerUserId,
    openDrawer,
    closeDrawer,
    load,
    setRole,
    forceReset,
  };
}
