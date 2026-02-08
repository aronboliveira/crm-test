import { onMounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import AlertService from "../../../services/AlertService";
import FormPersistenceService from "../../../services/FormPersistenceService";
import AuthRecoveryService from "../../../services/AuthRecoveryService";
import { useAuthStore } from "../../../pinia/stores/auth.store";

export function useAuthLoginPage() {
  const router = useRouter();
  const route = useRoute();
  const authStore = useAuthStore();

  const formId = "auth_login_form";
  const formEl = ref<HTMLFormElement | null>(null);

  const busy = ref(false);
  const email = ref("");
  const password = ref("");

  // Sync autofilled values from DOM
  const syncAutofill = () => {
    if (!formEl.value) return;

    const emailInput = formEl.value.querySelector<HTMLInputElement>(
      'input[name="email"], input[type="email"]',
    );
    const passInput = formEl.value.querySelector<HTMLInputElement>(
      'input[name="password"], input[type="password"]',
    );

    if (emailInput && emailInput.value && !email.value) {
      email.value = emailInput.value;
    }
    if (passInput && passInput.value && !password.value) {
      password.value = passInput.value;
    }
  };

  const submit = async () => {
    if (busy.value) return;

    // Sync autofill values before submit
    syncAutofill();

    busy.value = true;
    try {
      if (!email.value?.trim()) {
        await AlertService.error("Falha no login", "O e-mail é obrigatório");
        return;
      }
      if (!password.value?.trim()) {
        await AlertService.error("Falha no login", "A senha é obrigatória");
        return;
      }

      await authStore.login({ email: email.value, password: password.value });

      if (!authStore.isLoggedIn) {
        await AlertService.error("Falha no login", "Token não recebido");
        return;
      }

      // Redirect to next URL or dashboard
      const next = (route.query.next as string) || "/dashboard";
      await router.replace(next);
    } catch (e) {
      console.error("[AuthLoginPage] submit failed:", e);
      await AlertService.error("Falha no login", e);
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

        // Check for autofill after a short delay (browser behavior)
        setTimeout(syncAutofill, 100);
        setTimeout(syncAutofill, 500);
        setTimeout(syncAutofill, 1000);

        // Listen for animation events (Chrome autofill detection)
        formEl.value.addEventListener("animationstart", (e) => {
          if (e.animationName === "onAutoFillStart") {
            syncAutofill();
          }
        });
      }
    } catch (e) {
      console.error("[AuthLoginPage] mount failed:", e);
    }
  });

  return { formId, formEl, busy, email, password, submit };
}
