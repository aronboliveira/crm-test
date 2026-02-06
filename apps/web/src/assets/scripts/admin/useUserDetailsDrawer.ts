import { computed, onMounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import AdminApiService from "../../../services/AdminApiService";
import AlertService from "../../../services/AlertService";
import DateMapper from "../../../services/DateMapper";
import DOMValidator from "../../../services/DOMValidator";
import type { AdminUserRow } from "../../../types/admin.types";
import type { ResetResponse } from "../../../types/auth.types";

export interface UserDetailsDrawerProps {
  open: boolean;
  user: AdminUserRow | null;
}

export interface UserDetailsDrawerEmits {
  (e: "close"): void;
  (e: "changed"): void;
}

export function useUserDetailsDrawer(
  props: UserDetailsDrawerProps,
  emit: UserDetailsDrawerEmits,
) {
  const busy = ref(false);
  const auditRows = ref<readonly any[]>([]);

  const title = computed(() =>
    props.user ? `User: ${props.user.email}` : "User",
  );
  const canAct = computed(() => !!props.user);

  const close = () => emit("close");

  const loadAudit = async () => {
    try {
      if (!props.user || busy.value) {
        if (!props.user) {
          console.warn("[UserDetailsDrawer] loadAudit: no user");
        }
        return;
      }

      busy.value = true;
      const r = await AdminApiService.auditForTargetUser(props.user.id, 80);
      auditRows.value = Array.isArray(r?.items) ? r.items : [];
    } catch (e) {
      console.error("[UserDetailsDrawer] loadAudit failed:", e);
      await AlertService.error("Failed to load user audit", e);
      auditRows.value = [];
    } finally {
      busy.value = false;
    }
  };

  const changeRole = async () => {
    try {
      if (!props.user?.id) {
        console.error("[UserDetailsDrawer] changeRole: no user");
        return;
      }

      const { value, isConfirmed } = await Swal.fire({
        title: "Change role",
        input: "select",
        inputOptions: {
          viewer: "viewer",
          member: "member",
          manager: "manager",
          admin: "admin",
        },
        inputValue: props.user.roleKey || "viewer",
        showCancelButton: true,
        confirmButtonText: "Apply",
        cancelButtonText: "Cancel",
        didOpen: () => {
          try {
            const root = Swal.getHtmlContainer();
            if (root) {
              DOMValidator.ensureAttr(root, "aria-label", "Change role dialog");
            }
          } catch (e) {
            console.error("[UserDetailsDrawer] changeRole didOpen failed:", e);
          }
        },
      });

      if (!isConfirmed) return;

      await AdminApiService.userSetRole(
        props.user.id,
        String(value || "viewer"),
      );
      await AlertService.success("Role updated");
      emit("changed");
      await loadAudit();
    } catch (e) {
      console.error("[UserDetailsDrawer] changeRole failed:", e);
      await AlertService.error("Failed to update role", e);
    }
  };

  const forceReset = async () => {
    try {
      if (!props.user?.id) {
        console.error("[UserDetailsDrawer] forceReset: no user");
        return;
      }

      const { isConfirmed } = await Swal.fire({
        title: "Force password reset?",
        text: `This invalidates sessions for "${props.user.email}".`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Force reset",
        cancelButtonText: "Cancel",
      });

      if (!isConfirmed) return;

      const r: ResetResponse = await AdminApiService.userForceReset(
        props.user.id,
      );

      if (r?.devResetToken) {
        await Swal.fire({
          title: "Dev reset token",
          html: `<code style="display:block;word-break:break-all;padding:0.6rem;border-radius:0.6rem;background:rgba(0,0,0,0.06)">${String(r.devResetToken)}</code>`,
          confirmButtonText: "OK",
        });
      } else {
        await AlertService.success("Force reset applied");
      }

      emit("changed");
      await loadAudit();
    } catch (e) {
      console.error("[UserDetailsDrawer] forceReset failed:", e);
      await AlertService.error("Failed to force reset", e);
    }
  };

  watch(
    () => props.open,
    async (v) => {
      try {
        if (v) {
          await loadAudit();
        }
      } catch (e) {
        console.error("[UserDetailsDrawer] watch open failed:", e);
      }
    },
  );

  onMounted(async () => {
    try {
      if (props.open) {
        await loadAudit();
      }
    } catch (e) {
      console.error("[UserDetailsDrawer] mount failed:", e);
    }
  });

  return {
    busy,
    auditRows,
    title,
    canAct,
    close,
    changeRole,
    forceReset,
    DateMapper,
  };
}
