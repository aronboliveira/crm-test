import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import AdminApiService from "../../../services/AdminApiService";
import AlertService from "../../../services/AlertService";
import KeybindCoordinatorService from "../../../services/KeybindCoordinatorService";
import type {
  AdminUserDetails,
  AdminUserRow,
} from "../../../types/admin.types";
import type { ResetResponse } from "../../../types/auth.types";

export interface AdminUserDetailsDrawerProps {
  open: boolean;
  userId: string | null;
}

export interface AdminUserDetailsDrawerEmits {
  (e: "close"): void;
  (e: "updated"): void;
}

export function useAdminUserDetailsDrawer(
  props: AdminUserDetailsDrawerProps,
  emit: AdminUserDetailsDrawerEmits,
) {
  const busy = ref(false);
  const details = ref<AdminUserDetails | null>(null);

  const user = computed(() => details.value?.user || null);
  const audit = computed(() => details.value?.audit || []);

  const load = async () => {
    try {
      if (!props.open) return;
      const id = props.userId ? String(props.userId) : "";
      if (!id || busy.value) {
        if (!id) {
          console.warn("[AdminUserDetailsDrawer] load: no userId provided");
        }
        return;
      }

      busy.value = true;
      details.value = await AdminApiService.userDetails(id);
    } catch (e) {
      console.error("[AdminUserDetailsDrawer] load failed:", e);
      await AlertService.error("Failed to load user details", e);
      details.value = null;
    } finally {
      busy.value = false;
    }
  };

  const close = () => emit("close");

  const setRole = async (u: AdminUserRow) => {
    try {
      if (!u?.id) {
        console.error("[AdminUserDetailsDrawer] setRole: invalid user object");
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
        inputValue: u.roleKey || "viewer",
        showCancelButton: true,
        confirmButtonText: "Apply",
        cancelButtonText: "Cancel",
      });

      if (!isConfirmed) return;

      await AdminApiService.userSetRole(u.id, String(value || "viewer"));
      await AlertService.success("Role updated");
      emit("updated");
      await load();
    } catch (e) {
      console.error("[AdminUserDetailsDrawer] setRole failed:", e);
      await AlertService.error("Failed to update role", e);
    }
  };

  const forceReset = async (u: AdminUserRow) => {
    try {
      if (!u?.id) {
        console.error(
          "[AdminUserDetailsDrawer] forceReset: invalid user object",
        );
        return;
      }

      const { isConfirmed } = await Swal.fire({
        title: "Force password reset?",
        text: `This will invalidate sessions for "${u.email}".`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Force reset",
        cancelButtonText: "Cancel",
      });

      if (!isConfirmed) return;

      const r: ResetResponse = await AdminApiService.userForceReset(u.id);

      if (r?.devResetToken) {
        await Swal.fire({
          title: "Dev reset token",
          html: `<code style="display:block;word-break:break-all;padding:0.6rem;border-radius:0.6rem;background:rgba(0,0,0,0.06)">${String(r.devResetToken)}</code>`,
          confirmButtonText: "OK",
        });
      } else {
        await AlertService.success("Force reset applied");
      }

      emit("updated");
      await load();
    } catch (e) {
      console.error("[AdminUserDetailsDrawer] forceReset failed:", e);
      await AlertService.error("Failed to force reset", e);
    }
  };

  const kb = (ev: KeyboardEvent) => {
    if (!props.open) return;
    ev.key === "Escape" ? close() : void 0;
  };

  const lockUser = async (u: AdminUserRow) => {
    const { value, isConfirmed } = await Swal.fire({
      title: "Lock account",
      input: "text",
      inputLabel: "Reason (optional)",
      inputPlaceholder: "e.g. suspected compromised account",
      showCancelButton: true,
      confirmButtonText: "Lock",
      cancelButtonText: "Cancel",
    });

    if (!isConfirmed) return;

    try {
      await AdminApiService.userLock(u.id, String(value || "locked"));
      await AlertService.success("User locked");
      emit("updated");
      await load();
    } catch (e) {
      await AlertService.error("Failed to lock user", e);
    }
  };

  const unlockUser = async (u: AdminUserRow) => {
    const { isConfirmed } = await Swal.fire({
      title: "Unlock account?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Unlock",
      cancelButtonText: "Cancel",
    });

    if (!isConfirmed) return;

    try {
      await AdminApiService.userUnlock(u.id);
      await AlertService.success("User unlocked");
      emit("updated");
      await load();
    } catch (e) {
      await AlertService.error("Failed to unlock user", e);
    }
  };

  const reissueInvite = async (u: AdminUserRow) => {
    const { isConfirmed } = await Swal.fire({
      title: "Re-issue invite?",
      text: `A new reset token will be generated for "${u.email}" (rate-limited).`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Re-issue",
      cancelButtonText: "Cancel",
    });

    if (!isConfirmed) return;

    try {
      const r: any = await AdminApiService.userReissueInvite(u.id);
      const url = r?.invite?.resetUrl ? String(r.invite.resetUrl) : "";

      url
        ? await Swal.fire({
            title: "Invite issued",
            html: `<div style="text-align:left">
                    <div><strong>Reset URL:</strong></div>
                    <code style="display:block;word-break:break-all;padding:0.6rem;border-radius:0.6rem;background:rgba(0,0,0,0.06)">${url}</code>
                  </div>`,
            confirmButtonText: "OK",
          })
        : await AlertService.success(
            "Invite issued",
            "Open Admin → Mock Mail to copy the URL.",
          );

      emit("updated");
      await load();
    } catch (e) {
      await AlertService.error("Failed to re-issue invite", e);
    }
  };

  onMounted(() => KeybindCoordinatorService.on(kb));
  onUnmounted(() => KeybindCoordinatorService.off(kb));

  watch(
    () => [props.open, props.userId],
    async () => {
      await load();
    },
    { immediate: true },
  );

  return {
    busy,
    details,
    user,
    audit,
    close,
    setRole,
    forceReset,
    lockUser,
    unlockUser,
    reissueInvite,
  };
}
