<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAuthLoginPage } from "../assets/scripts/pages/useAuthLoginPage";
import OAuthService from "../services/OAuthService";
import AlertService from "../services/AlertService";
import type {
  OAuthProvider,
  OAuthProviderAvailability,
} from "../types/auth.types";

const { formId, formEl, busy, email, password, submit, passwordVisibility } =
  useAuthLoginPage();
const bindFormEl = (node: unknown): void => {
  formEl.value = node instanceof HTMLFormElement ? node : null;
};

// ! DEV ONLY
const loginDevTitle =
  "Usuários de teste: admin@corp.local / Admin#123, manager@corp.local / Manager#123, member@corp.local / Member#123, viewer@corp.local / Viewer#123";

const oauthProviderOrder: OAuthProvider[] = [
  "google",
  "microsoft",
  "nextcloud",
];
const oauthLabels: Record<OAuthProvider, string> = {
  google: "Google",
  microsoft: "Microsoft",
  nextcloud: "NextCloud",
};
const oauthIcons: Record<OAuthProvider, string> = {
  google: "google.svg",
  microsoft: "ms.svg",
  nextcloud: "nextcloud.svg",
};

const oauthBusyProvider = ref<OAuthProvider | null>(null);
const oauthAvailability = ref<OAuthProviderAvailability[]>([]);

const oauthProviders = computed(() => {
  return oauthProviderOrder.map((provider) => {
    const found = oauthAvailability.value.find(
      (item) => item.provider === provider,
    );
    return {
      provider,
      label: oauthLabels[provider],
      icon: oauthIcons[provider],
      enabled: found ? found.enabled : true,
      reason: found?.reason,
    };
  });
});

const isOAuthDisabled = (provider: OAuthProvider, enabled: boolean) => {
  void provider;
  return busy.value || oauthBusyProvider.value !== null || !enabled;
};

const providerTitle = (
  provider: OAuthProvider,
  enabled: boolean,
  reason?: string,
) => {
  const label = oauthLabels[provider];
  if (!enabled) return reason || `${label} SSO indisponível no momento`;
  return `Entrar com ${label}`;
};

async function loadProviderAvailability(): Promise<void> {
  try {
    oauthAvailability.value = await OAuthService.getProviderAvailability();
  } catch (error) {
    oauthAvailability.value = oauthProviderOrder.map((provider) => ({
      provider,
      enabled: true,
    }));
    await AlertService.info(
      "SSO parcialmente disponível",
      "Não foi possível validar os provedores agora. Tentando com configuração padrão.",
    );
  }
}

async function startOAuth(provider: OAuthProvider): Promise<void> {
  const p = oauthProviders.value.find((item) => item.provider === provider);
  if (!p) return;
  if (!p.enabled) {
    await AlertService.error(
      "SSO indisponível",
      p.reason || "Provedor não configurado",
    );
    return;
  }
  if (oauthBusyProvider.value) return;

  oauthBusyProvider.value = provider;
  await AlertService.info("Redirecionando", `Conectando com ${p.label}...`);
  OAuthService.initiateLogin(provider);
}

onMounted(() => {
  void loadProviderAvailability();
});
</script>

<style lang="scss">
@use "../styles/components/auth-login";
</style>

<template>
  <div class="auth-page">
    <section class="auth-card" aria-label="Autenticação">
      <header class="auth-header">
        <div class="auth-brand">
          <span class="auth-brand-title">CRM de Gerenciamento de Projetos</span>
          <h1 class="auth-title">Entrar na sua conta</h1>
        </div>
      </header>

      <form
        :ref="bindFormEl"
        :id="formId"
        class="auth-form"
        aria-label="Formulário de login"
        @submit.prevent="submit"
      >
        <label class="auth-field">
          <span class="auth-label">E-mail</span>
          <input
            class="auth-input"
            type="email"
            name="email"
            autocomplete="username"
            required
            v-model="email"
            placeholder="admin@corp.local"
            aria-label="E-mail"
          />
        </label>

        <label class="auth-field">
          <span class="auth-label">Senha</span>
          <div class="auth-field-wrapper">
            <input
              class="auth-input auth-input-with-toggle"
              :type="passwordVisibility.inputType.value"
              name="password"
              autocomplete="current-password"
              required
              v-model="password"
              placeholder="Admin#123"
              aria-label="Senha"
            />
            <button
              type="button"
              class="auth-toggle-btn"
              :aria-label="passwordVisibility.ariaLabel.value"
              @click="passwordVisibility.toggleVisibility"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path :d="passwordVisibility.iconPath.value" />
              </svg>
            </button>
          </div>
        </label>

        <div class="auth-actions">
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="busy"
            :aria-disabled="busy"
            :title="loginDevTitle"
          >
            <span v-if="busy" class="auth-spinner"></span>
            {{ busy ? "Entrando..." : "Entrar" }}
          </button>
        </div>

        <p class="auth-links">
          <RouterLink
            class="auth-link"
            to="/forgot-password"
            aria-label="Esqueceu sua senha"
          >
            Esqueceu sua senha?
          </RouterLink>
        </p>
      </form>

      <!-- SSO / OAuth providers -->
      <div class="auth-sso-divider" aria-hidden="true">
        <span>ou entre com</span>
      </div>

      <div
        class="auth-sso-buttons"
        role="group"
        aria-label="Login com provedor externo"
      >
        <button
          v-for="provider in oauthProviders"
          :key="provider.provider"
          type="button"
          class="auth-sso-btn"
          :class="{
            'auth-sso-btn--active': oauthBusyProvider === provider.provider,
            'auth-sso-btn--unavailable': !provider.enabled,
          }"
          :disabled="isOAuthDisabled(provider.provider, provider.enabled)"
          :aria-disabled="isOAuthDisabled(provider.provider, provider.enabled)"
          :aria-label="
            provider.enabled
              ? `Entrar com ${provider.label}`
              : `${provider.label} indisponível`
          "
          :title="
            providerTitle(provider.provider, provider.enabled, provider.reason)
          "
          @click="startOAuth(provider.provider)"
        >
          <img
            class="auth-sso-icon"
            :src="provider.icon"
            :alt="provider.label"
            width="20"
            height="20"
          />
          <!-- // * INSERT ACTUAL SRC PATH FOR IMG HERE (provider logo) -->
          <span>{{ provider.label }}</span>
          <span
            v-if="oauthBusyProvider === provider.provider"
            class="auth-sso-inline-spinner"
            aria-hidden="true"
          ></span>
        </button>
      </div>
    </section>
  </div>
</template>
