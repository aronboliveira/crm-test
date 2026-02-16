<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../pinia/stores/auth.store";
import AlertService from "../services/AlertService";
import ApiClientService from "../services/ApiClientService";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const busy = ref(false);
const code = ref("");
const isRecoveryMode = ref(false);
const formEl = ref<HTMLFormElement | null>(null);
const codeInputRef = ref<HTMLInputElement | null>(null);

const twoFactorToken = computed(() => route.query.token as string | undefined);
const email = computed(() => route.query.email as string | undefined);

const bindFormEl = (node: unknown): void => {
  formEl.value = node instanceof HTMLFormElement ? node : null;
};

const bindCodeInput = (node: unknown): void => {
  codeInputRef.value = node instanceof HTMLInputElement ? node : null;
};

const toggleRecoveryMode = () => {
  isRecoveryMode.value = !isRecoveryMode.value;
  code.value = "";
  setTimeout(() => {
    codeInputRef.value?.focus();
  }, 0);
};

const submit = async () => {
  if (busy.value) return;

  busy.value = true;
  try {
    if (!code.value?.trim()) {
      await AlertService.error(
        "Código necessário",
        "Por favor, insira o código 2FA",
      );
      return;
    }

    if (!twoFactorToken.value) {
      await AlertService.error(
        "Sessão inválida",
        "Token de autenticação não encontrado. Por favor, faça login novamente.",
      );
      await router.replace("/login");
      return;
    }

    const response = await ApiClientService.raw.post("/auth/verify-2fa", {
      twoFactorToken: twoFactorToken.value,
      code: code.value.trim(),
    });

    const data = response.data as any;
    const tok = data?.accessToken;

    if (!tok) {
      throw new Error("Token não recebido");
    }

    try {
      sessionStorage.setItem("_auth_token_v1", tok);
    } catch (error) {
      console.warn("Failed to save token:", error);
    }

    if (ApiClientService.setToken) {
      ApiClientService.setToken(tok);
    }

    authStore.token = tok;
    authStore.me = data.user || null;
    authStore.ready = true;

    await AlertService.success("Autenticado!", "Login concluído com sucesso");

    // Warm up dashboard
    await Promise.allSettled([
      import("../pages/DashboardPage.vue"),
      import("../components/dashboard/DashboardHome.vue"),
    ]);

    const next = (route.query.next as string) || "/dashboard";
    await router.replace(next);
  } catch (e: any) {
    console.error("[Auth2FAPage] submit failed:", e);
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "Código inválido. Tente novamente.";
    await AlertService.error("Falha na verificação", msg);
    code.value = "";
    codeInputRef.value?.focus();
  } finally {
    busy.value = false;
  }
};

const backToLogin = () => {
  router.replace("/login");
};

onMounted(() => {
  // Validate we have a token
  if (!twoFactorToken.value) {
    AlertService.warning(
      "Sessão inválida",
      "Redirecionando para login...",
    ).then(() => {
      router.replace("/login");
    });
    return;
  }

  // Auto-focus code input
  setTimeout(() => {
    codeInputRef.value?.focus();
  }, 100);
});
</script>

<style lang="scss">
@use "../styles/components/auth-login";
</style>

<template>
  <div class="auth-page">
    <section class="auth-card" aria-label="Verificação 2FA">
      <header class="auth-header">
        <div class="auth-brand">
          <span class="auth-brand-title">CRM de Gerenciamento de Projetos</span>
          <h1 class="auth-title">Verificação em Duas Etapas</h1>
        </div>
      </header>

      <div class="auth-2fa-info">
        <p v-if="email" class="auth-2fa-email">
          Verificando acesso para <strong>{{ email }}</strong>
        </p>
        <p class="auth-2fa-description">
          Insira o código do seu aplicativo autenticador. Se preferir, use um
          código de recuperação.
        </p>
      </div>

      <form
        :ref="bindFormEl"
        class="auth-form"
        aria-label="Formulário de verificação 2FA"
        @submit.prevent="submit"
      >
        <label class="auth-field">
          <span class="auth-label">
            {{ isRecoveryMode ? "Código de recuperação" : "Código 2FA" }}
          </span>
          <input
            :ref="bindCodeInput"
            class="auth-input auth-input-2fa"
            type="text"
            name="code"
            :autocomplete="isRecoveryMode ? 'off' : 'one-time-code'"
            :inputmode="isRecoveryMode ? 'text' : 'numeric'"
            :pattern="isRecoveryMode ? '[A-Za-z0-9]+' : '[0-9]+'"
            :maxlength="isRecoveryMode ? 32 : 6"
            required
            v-model="code"
            :placeholder="isRecoveryMode ? 'RECOVERY-XXXX' : '000000'"
            :aria-label="
              isRecoveryMode ? 'Código de recuperação' : 'Código de verificação'
            "
            :disabled="busy"
          />
        </label>

        <button
          class="auth-2fa-toggle"
          type="button"
          :disabled="busy"
          @click="toggleRecoveryMode"
        >
          {{
            isRecoveryMode ? "Usar código do app" : "Usar código de recuperação"
          }}
        </button>

        <div class="auth-actions">
          <button
            class="btn btn-secondary"
            type="button"
            :disabled="busy"
            @click="backToLogin"
          >
            Voltar
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="busy"
            :aria-disabled="busy"
          >
            <span v-if="busy" class="auth-spinner"></span>
            {{ busy ? "Verificando..." : "Verificar" }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
