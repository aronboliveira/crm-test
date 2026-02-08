import { computed, nextTick, onMounted, ref, watch } from "vue";
import Swal from "sweetalert2";

import AdminApiService from "../../../services/AdminApiService";
import AlertService from "../../../services/AlertService";
import DOMValidator from "../../../services/DOMValidator";
import FormPersistenceService from "../../../services/FormPersistenceService";
import ApiClientService from "../../../services/ApiClientService";

export interface CreateUserModalProps {
  open: boolean;
}

export interface CreateUserModalEmits {
  (e: "close"): void;
  (e: "created"): void;
}

/* ---- Strict regex patterns ---- */
const RE_EMAIL =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const RE_USERNAME = /^[a-zA-Z][a-zA-Z0-9._-]{2,29}$/;

const RE_NAME = /^[\p{L}\s'-]{2,60}$/u;

const RE_PHONE = /^\+?[0-9\s()-]{7,20}$/;

const RE_DEPARTMENT = /^[\p{L}\p{N}\s&/.,()-]{2,80}$/u;

export interface CreateUserModel {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  roleKey: string;
}

export function useCreateUserModal(
  props: CreateUserModalProps,
  emit: CreateUserModalEmits,
) {
  const FORM_ID = "admin-create-user";

  const model = ref<CreateUserModel>({
    email: "",
    username: "",
    firstName: "",
    lastName: "",
    phone: "",
    department: "",
    roleKey: "viewer",
  });
  const busy = ref(false);
  const duplicateError = ref("");
  const fieldErrors = ref<Partial<Record<keyof CreateUserModel, string>>>({});

  /* ---- Field validators ---- */
  const emailOk = computed(() =>
    RE_EMAIL.test(
      String(model.value.email || "")
        .trim()
        .toLowerCase(),
    ),
  );

  const usernameOk = computed(() =>
    RE_USERNAME.test(String(model.value.username || "").trim()),
  );

  const firstNameOk = computed(() => {
    const v = String(model.value.firstName || "").trim();
    return !v || RE_NAME.test(v);
  });

  const lastNameOk = computed(() => {
    const v = String(model.value.lastName || "").trim();
    return !v || RE_NAME.test(v);
  });

  const phoneOk = computed(() => {
    const v = String(model.value.phone || "").trim();
    return !v || RE_PHONE.test(v);
  });

  const departmentOk = computed(() => {
    const v = String(model.value.department || "").trim();
    return !v || RE_DEPARTMENT.test(v);
  });

  const allValid = computed(
    () =>
      emailOk.value &&
      usernameOk.value &&
      firstNameOk.value &&
      lastNameOk.value &&
      phoneOk.value &&
      departmentOk.value &&
      !!String(model.value.roleKey || "").trim(),
  );

  const canSubmit = computed(() => !busy.value && allValid.value);

  const panelRef = ref<HTMLElement | null>(null);

  const hydrate = () =>
    (model.value = FormPersistenceService.read(FORM_ID, model.value));
  const persist = () => FormPersistenceService.write(FORM_ID, model.value);

  const close = () => emit("close");

  /* ---- Duplicate check ---- */
  const checkDuplicate = async (): Promise<boolean> => {
    try {
      const email = model.value.email.trim().toLowerCase();
      const username = model.value.username.trim();
      const res = await ApiClientService.raw.post(
        "/admin/users/check-duplicate",
        {
          email,
          username,
        },
      );
      const data = res.data as {
        emailExists?: boolean;
        usernameExists?: boolean;
      };
      if (data.emailExists) {
        duplicateError.value = "Já existe um usuário com este e-mail.";
        return false;
      }
      if (data.usernameExists) {
        duplicateError.value = "Já existe um usuário com este nome de usuário.";
        return false;
      }
      duplicateError.value = "";
      return true;
    } catch {
      // Endpoint may not exist yet (portfolio demo) — skip check
      duplicateError.value = "";
      return true;
    }
  };

  /* ---- Validate all fields ---- */
  const validateFields = (): boolean => {
    const errs: Partial<Record<keyof CreateUserModel, string>> = {};
    if (!model.value.email.trim()) {
      errs.email = "E-mail é obrigatório.";
    } else if (!emailOk.value) {
      errs.email = "Formato de e-mail inválido.";
    }
    if (!model.value.username.trim()) {
      errs.username = "Nome de usuário é obrigatório.";
    } else if (!usernameOk.value) {
      errs.username =
        "3–30 caracteres. Inicie com letra. Apenas letras, números, . _ -";
    }
    if (!firstNameOk.value) {
      errs.firstName = "Nome inválido (2–60 caracteres, apenas letras).";
    }
    if (!lastNameOk.value) {
      errs.lastName = "Sobrenome inválido (2–60 caracteres, apenas letras).";
    }
    if (!phoneOk.value) {
      errs.phone = "Telefone inválido. Ex.: +55 (11) 99999-0000";
    }
    if (!departmentOk.value) {
      errs.department = "Departamento inválido (2–80 caracteres).";
    }
    if (!model.value.roleKey.trim()) {
      errs.roleKey = "Perfil é obrigatório.";
    }
    fieldErrors.value = errs;
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validateFields()) return;
    if (!canSubmit.value) return;

    busy.value = true;
    try {
      // Duplicate check
      const dupOk = await checkDuplicate();
      if (!dupOk) {
        busy.value = false;
        return;
      }

      const payload: Record<string, string> = {
        email: model.value.email.trim().toLowerCase(),
        username: model.value.username.trim(),
        roleKey: model.value.roleKey,
      };
      if (model.value.firstName.trim())
        payload.firstName = model.value.firstName.trim();
      if (model.value.lastName.trim())
        payload.lastName = model.value.lastName.trim();
      if (model.value.phone.trim()) payload.phone = model.value.phone.trim();
      if (model.value.department.trim())
        payload.department = model.value.department.trim();

      const r = await AdminApiService.userCreate(
        payload as unknown as { email: string; roleKey: string },
      );

      FormPersistenceService.clear(FORM_ID);

      const tok = r?.invite?.devResetToken
        ? String(r.invite.devResetToken)
        : "";
      tok
        ? await Swal.fire({
            title: "Usuário criado (token dev)",
            html: `<div style="text-align:left">
                    <div><strong>E-mail:</strong> ${payload.email}</div>
                    <div><strong>Usuário:</strong> ${payload.username}</div>
                    <div><strong>Perfil:</strong> ${payload.roleKey}</div>
                    <div style="margin-top:8px"><strong>Token de redefinição:</strong></div>
                    <code style="display:block;word-break:break-all;padding:0.6rem;border-radius:0.6rem;background:rgba(0,0,0,0.06)">${tok}</code>
                  </div>`,
            confirmButtonText: "OK",
          })
        : await AlertService.success(
            "Usuário criado",
            "Em produção, envie o convite por e-mail.",
          );

      emit("created");
      close();
    } catch (e) {
      console.error("[CreateUserModal] submit failed:", e);
      await AlertService.error("Falha ao criar usuário", e);
    } finally {
      busy.value = false;
    }
  };

  watch(
    () => props.open,
    async (v) => {
      try {
        if (!v) {
          fieldErrors.value = {};
          duplicateError.value = "";
          return;
        }

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
        if (duplicateError.value) duplicateError.value = "";
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

  return {
    FORM_ID,
    model,
    busy,
    emailOk,
    usernameOk,
    firstNameOk,
    lastNameOk,
    phoneOk,
    departmentOk,
    fieldErrors,
    duplicateError,
    canSubmit,
    panelRef,
    close,
    submit,
  };
}
