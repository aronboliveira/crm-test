import { computed, nextTick, onMounted, ref, watch } from "vue";
import Swal from "sweetalert2";

import AdminApiService from "../../../services/AdminApiService";
import AlertService from "../../../services/AlertService";
import DOMValidator from "../../../services/DOMValidator";
import FormPersistenceService from "../../../services/FormPersistenceService";

export interface CreateUserModalProps {
  open: boolean;
}

export interface CreateUserModalEmits {
  (e: "close"): void;
  (e: "created"): void;
}

export function useCreateUserModal(
  props: CreateUserModalProps,
  emit: CreateUserModalEmits,
) {
  const FORM_ID = "admin-create-user";

  const model = ref<{ email: string; roleKey: string }>({
    email: "",
    roleKey: "viewer",
  });
  const busy = ref(false);

  const emailOk = computed(() =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      String(model.value.email || "")
        .trim()
        .toLowerCase(),
    ),
  );
  const canSubmit = computed(
    () =>
      !busy.value &&
      emailOk.value &&
      !!String(model.value.roleKey || "").trim(),
  );

  const panelRef = ref<HTMLElement | null>(null);

  const hydrate = () =>
    (model.value = FormPersistenceService.read(FORM_ID, model.value));
  const persist = () => FormPersistenceService.write(FORM_ID, model.value);

  const close = () => emit("close");

  const submit = async () => {
    if (!canSubmit.value) return;

    busy.value = true;
    try {
      if (!model.value.email?.trim()) {
        await AlertService.error("Failed to create user", "Email is required");
        return;
      }
      if (!model.value.roleKey?.trim()) {
        await AlertService.error("Failed to create user", "Role is required");
        return;
      }

      const payload = {
        email: model.value.email.trim().toLowerCase(),
        roleKey: model.value.roleKey,
      };
      const r = await AdminApiService.userCreate(payload);

      FormPersistenceService.clear(FORM_ID);

      const tok = r?.invite?.devResetToken
        ? String(r.invite.devResetToken)
        : "";
      tok
        ? await Swal.fire({
            title: "User created (dev invite token)",
            html: `<div style="text-align:left">
                    <div><strong>Email:</strong> ${payload.email}</div>
                    <div><strong>Role:</strong> ${payload.roleKey}</div>
                    <div style="margin-top:8px"><strong>Reset token:</strong></div>
                    <code style="display:block;word-break:break-all;padding:0.6rem;border-radius:0.6rem;background:rgba(0,0,0,0.06)">${tok}</code>
                  </div>`,
            confirmButtonText: "OK",
          })
        : await AlertService.success(
            "User created",
            "In production, deliver the invite via email.",
          );

      emit("created");
      close();
    } catch (e) {
      console.error("[CreateUserModal] submit failed:", e);
      await AlertService.error("Failed to create user", e);
    } finally {
      busy.value = false;
    }
  };

  watch(
    () => props.open,
    async (v) => {
      try {
        if (!v) return;

        hydrate();
        await nextTick();

        const el = panelRef.value;
        if (el) {
          DOMValidator.ensureAttr(el, "aria-label", "Create user modal");
          DOMValidator.ensureData(el, "modal", "create-user");
        }
      } catch (e) {
        console.error("[CreateUserModal] watch open failed:", e);
      }
    },
    { immediate: true },
  );

  watch(
    model,
    () => {
      try {
        persist();
      } catch (e) {
        console.error("[CreateUserModal] persist failed:", e);
      }
    },
    { deep: true },
  );

  onMounted(() => {
    try {
      if (props.open) {
        hydrate();
      }
    } catch (e) {
      console.error("[CreateUserModal] mount failed:", e);
    }
  });

  return { FORM_ID, model, busy, emailOk, canSubmit, panelRef, close, submit };
}
