import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Swal from "sweetalert2";

import ApiClientService from "../../../services/ApiClientService";
import AlertService from "../../../services/AlertService";
import DOMValidator from "../../../services/DOMValidator";
import FormFieldPersistenceService from "../../../services/FormFieldPersistenceService";

export function useResetPasswordPage() {
  const FORM_ID = "reset-password-form";
  const TOKEN_RE = /^[A-Za-z0-9_-]{20,120}$/;

  const route = useRoute();
  const router = useRouter();

  const formRef = ref<HTMLFormElement | null>(null);

  const token = ref("");
  const password = ref("");
  const confirm = ref("");
  const busy = ref(false);

  const tokenOk = computed(() =>
    TOKEN_RE.test(String(token.value || "").trim()),
  );
  const passOk = computed(() => String(password.value || "").length >= 10);
  const sameOk = computed(
    () => password.value && password.value === confirm.value,
  );
  const canSubmit = computed(
    () => !busy.value && tokenOk.value && passOk.value && sameOk.value,
  );

  const pasteToken = async () => {
    try {
      const t = await navigator.clipboard.readText();
      const s = String(t || "").trim();
      if (s && token.value !== s) {
        token.value = s;
      }
    } catch (e) {
      console.error("[ResetPasswordPage] pasteToken failed:", e);
      await AlertService.error("Falha ao ler a área de transferência", e);
    }
  };

  const submit = async () => {
    if (!canSubmit.value) return;

    busy.value = true;
    try {
      if (!token.value?.trim()) {
        await AlertService.error(
          "Falha na redefinição",
          "O token é obrigatório",
        );
        return;
      }

      if (!password.value?.trim()) {
        await AlertService.error(
          "Falha na redefinição",
          "A senha é obrigatória",
        );
        return;
      }

      const payload = { token: token.value.trim(), password: password.value };
      await ApiClientService.raw.post("/auth/reset-password", payload);

      FormFieldPersistenceService.clear(FORM_ID, "session");

      await Swal.fire({
        title: "Senha atualizada",
        text: "Agora você pode entrar com a nova senha.",
        icon: "success",
        confirmButtonText: "Ir para login",
      });

      await router.push("/login");
    } catch (e) {
      console.error("[ResetPasswordPage] submit failed:", e);
      await AlertService.error("Falha na redefinição", e);
    } finally {
      busy.value = false;
    }
  };

  onMounted(() => {
    try {
      const qTok =
        typeof route.query?.token === "string" ? route.query.token.trim() : "";
      if (qTok && token.value !== qTok) {
        token.value = qTok;
      }

      const fm = formRef.value;
      if (!fm) {
        console.warn("[ResetPasswordPage] mount: no form element");
        return;
      }

      FormFieldPersistenceService.bind(fm, FORM_ID, "session");
      DOMValidator.ensureAttr(
        fm,
        "aria-label",
        "Formulário de redefinição de senha",
      );
    } catch (e) {
      console.error("[ResetPasswordPage] mount failed:", e);
    }
  });

  return {
    FORM_ID,
    formRef,
    token,
    password,
    confirm,
    busy,
    tokenOk,
    passOk,
    sameOk,
    canSubmit,
    pasteToken,
    submit,
  };
}
