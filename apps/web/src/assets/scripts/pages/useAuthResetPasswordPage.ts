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
          "Invalid or expired token",
          "No token provided",
        );
        return;
      }

      AuthRecoveryService.setLastToken(token.value);

      const r = await AuthRecoveryService.validateToken(token.value);
      email.value = r.ok ? String(r.email || "") : "";

      if (!r.ok) {
        await AlertService.error("Invalid or expired token");
      }
    } catch (e) {
      console.error("[AuthResetPasswordPage] load failed:", e);
      await AlertService.error("Failed to validate token", e);
    }
  };

  const submit = async () => {
    if (busy.value || !canSubmit.value) return;

    busy.value = true;
    try {
      if (!tokenEffective.value) {
        await AlertService.error("Reset failed", "No token provided");
        return;
      }

      if (!password.value?.trim() || !confirm.value?.trim()) {
        await AlertService.error(
          "Reset failed",
          "Password fields are required",
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
          "Password updated",
          "You can now login with your new password.",
        );
        await router.replace("/login");
      } else {
        await AlertService.error(
          "Reset failed",
          r.message || "Invalid request",
        );
      }
    } catch (e) {
      console.error("[AuthResetPasswordPage] submit failed:", e);
      await AlertService.error("Reset failed", e);
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
