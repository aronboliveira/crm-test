<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../pinia/stores/auth.store";
import ApiClientService from "../services/ApiClientService";

const router = useRouter();
const auth = useAuthStore();

const status = ref<"processing" | "error">("processing");
const errorMessage = ref("");

onMounted(async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      status.value = "error";
      errorMessage.value =
        "Token de autenticação não recebido do provedor SSO.";
      return;
    }

    // Persist the token exactly like the normal login flow
    try {
      sessionStorage.setItem("_auth_token_v1", token);
    } catch {
      // sessionStorage blocked
    }

    if (ApiClientService.setToken) {
      ApiClientService.setToken(token);
    }

    auth.$patch({ token, ready: true });

    // Fetch user profile so the store is fully hydrated
    try {
      const res = await ApiClientService.raw.get("/auth/me");
      auth.$patch({ me: res.data as any });
    } catch {
      // non-critical — the guard will re-fetch
    }

    // Pre-warm dashboard chunks (same as normal login)
    await Promise.allSettled([
      import("./DashboardPage.vue"),
      import("../components/dashboard/DashboardHome.vue"),
    ]);

    await router.replace("/dashboard");
  } catch (e: any) {
    console.error("[OAuthCallback] failed:", e);
    status.value = "error";
    errorMessage.value =
      e?.message || "Erro desconhecido durante autenticação SSO.";
  }
});
</script>

<template>
  <div class="oauth-callback-page">
    <div v-if="status === 'processing'" class="oauth-callback-loader">
      <p>Autenticando via SSO&hellip;</p>
    </div>

    <div v-else class="oauth-callback-error">
      <h2>Falha na autenticação SSO</h2>
      <p>{{ errorMessage }}</p>
      <RouterLink to="/login" class="btn btn-primary">
        Voltar ao login
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.oauth-callback-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: inherit;
}
.oauth-callback-loader {
  text-align: center;
  font-size: 1.125rem;
  color: var(--text-secondary, #6b7280);
}
.oauth-callback-error {
  text-align: center;
  max-width: 28rem;
  padding: 2rem;
}
.oauth-callback-error h2 {
  margin-bottom: 0.75rem;
  color: var(--color-danger, #dc2626);
}
.oauth-callback-error p {
  margin-bottom: 1.5rem;
}
</style>
