import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AlertService from "../../../services/AlertService";
import AuthRecoveryService from "../../../services/AuthRecoveryService";
import FormPersistenceService from "../../../services/FormPersistenceService";
import PasswordPolicyService from "../../../services/PasswordPolicyService";

export function useAuthResetPasswordPage() {
  const route = useRoute();
  const router = useRouter();

  const formId = "auth_reset_password_form";
  const formEl = ref<HTMLFormElement | null>(null);

  const busy = ref(false);
  const token = ref("");
  const email = ref("");

  const password = ref("");
  const confirm = ref("");

  const tokenFromQuery = computed(() => String(route.query.token || ""));
  const tokenEffective = computed(() =>
    (
      token.value ||
      tokenFromQuery.value ||
      AuthRecoveryService.lastToken()
    ).trim(),
  );
  const canSubmit = computed(
    () =>
      !busy.value &&
      !!email.value &&
      PasswordPolicyService.ok(password.value, confirm.value),
  );

  const load = async () => {
    try {
      token.value = tokenEffective.value;

      if (!token.value) {
        console.warn("[AuthResetPasswordPage] load: no token available");
        await AlertService.error(
          "Token inválido ou expirado",
          "Nenhum token fornecido",
        );
        return;
      }

      AuthRecoveryService.setLastToken(token.value);

      const r = await AuthRecoveryService.validateToken(token.value);
      email.value = r.ok ? String(r.email || "") : "";

      if (!r.ok) {
        await AlertService.error("Token inválido ou expirado");
      }
    } catch (e) {
      console.error("[AuthResetPasswordPage] load failed:", e);
      await AlertService.error("Falha ao validar token", e);
    }
  };

  const submit = async () => {
    if (busy.value || !canSubmit.value) return;

    busy.value = true;
    try {
      if (!tokenEffective.value) {
        await AlertService.error("Falha na redefinição", "Nenhum token fornecido");
        return;
      }

      if (!password.value?.trim() || !confirm.value?.trim()) {
        await AlertService.error(
          "Falha na redefinição",
          "Os campos de senha são obrigatórios",
        );
        return;
      }

      const r = await AuthRecoveryService.resetPassword(
        tokenEffective.value,
        password.value,
        confirm.value,
      );

      if (r.ok) {
        await AlertService.success(
          "Senha atualizada",
          "Agora você pode entrar com sua nova senha.",
        );
        await router.replace("/login");
      } else {
        await AlertService.error(
          "Falha na redefinição",
          r.message || "Solicitação inválida",
        );
      }
    } catch (e) {
      console.error("[AuthResetPasswordPage] submit failed:", e);
      await AlertService.error("Falha na redefinição", e);
    } finally {
      busy.value = false;
    }
  };

  onMounted(async () => {
    try {
      if (formEl.value) {
        FormPersistenceService.bind(formEl.value, formId);
      }
      await load();
    } catch (e) {
      console.error("[AuthResetPasswordPage] mount failed:", e);
    }
  });

  watch(
    () => tokenEffective.value,
    async (v) => {
      try {
        if (!v) {
          console.warn("[AuthResetPasswordPage] watch: no token value");
          return;
        }
        const r = await AuthRecoveryService.validateToken(v);
        email.value = r.ok ? String(r.email || "") : "";
      } catch (e) {
        console.error("[AuthResetPasswordPage] token watch failed:", e);
      }
    },
  );

  return {
    formId,
    busy,
    token,
    email,
    password,
    confirm,
    canSubmit,
    submit,
    tokenEffective,
  };
}
