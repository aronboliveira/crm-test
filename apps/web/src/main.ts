import { createApp } from "vue";
import App from "./App.vue";
import router from "./app/router";

import pinia from "./pinia";
import { useAuthStore } from "./pinia/stores/auth.store";
import { usePolicyStore } from "./pinia/stores/policy.store";
import { useBootstrapStore } from "./pinia/stores/bootstrap.store";

const mount = async (): Promise<void> => {
  try {
    const app = createApp(App);
    app.use(pinia);
    app.use(router);

    const auth = useAuthStore();
    const policy = usePolicyStore();
    const boot = useBootstrapStore();

    await auth.bootstrap();
    if (auth.isLoggedIn) {
      await policy.bootstrap();
    } else {
      policy.reset();
    }

    boot.markReady();

    await router.isReady();
    app.mount("#app");
  } catch (error) {
    console.error("[main] Application mount failed:", error);
    // Display user-friendly error message
    const root = document.getElementById("app");
    if (root) {
      root.innerHTML =
        '<div style="padding: 20px; color: #c00;">Failed to load application. Please refresh the page.</div>';
    }
  }
};

void mount();
