import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AlertService from "../../../services/AlertService";
import AuthService from "../../../services/AuthService";
import FormPersistenceService from "../../../services/FormPersistenceService";
import AuthRecoveryService from "../../../services/AuthRecoveryService";

export function useAuthLoginPage() {
  const router = useRouter();

  const formId = "auth_login_form";
  const formEl = ref<HTMLFormElement | null>(null);

  const busy = ref(false);
  const email = ref("");
  const password = ref("");

  const submit = async () => {
    if (busy.value) return;

    busy.value = true;
    try {
      if (!email.value?.trim()) {
        await AlertService.error("Login failed", "Email is required");
        return;
      }
      if (!password.value?.trim()) {
        await AlertService.error("Login failed", "Password is required");
        return;
      }

      await AuthService.login(email.value, password.value);

      if (!AuthService.isAuthed()) {
        await AlertService.error("Login failed", "Token not received");
        return;
      }

      await router.replace("/");
    } catch (e) {
      console.error("[AuthLoginPage] submit failed:", e);
      await AlertService.error("Login failed", e);
    } finally {
      busy.value = false;
    }
  };

  onMounted(() => {
    try {
      const last = AuthRecoveryService.lastEmail();
      if (last && !email.value) {
        email.value = last;
      }

      if (formEl.value) {
        FormPersistenceService.bind(formEl.value, formId);
      }
    } catch (e) {
      console.error("[AuthLoginPage] mount failed:", e);
    }
  });

  return { formId, busy, email, password, submit };
}
