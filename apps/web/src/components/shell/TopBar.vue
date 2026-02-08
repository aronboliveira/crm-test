<script setup lang="ts">
import { useTopBar } from "../../assets/scripts/shell/useTopBar";

const emit = defineEmits<{ (e: "toggle-aside"): void }>();

const {
  email,
  displayName,
  logout,
  toggleTheme,
  toggleAside,
  isDark,
  openProfile,
} = useTopBar(emit);
</script>

<template>
  <header class="topbar" role="banner" aria-label="Top bar">
    <div class="topbar-left">
      <button
        class="topbar-menu-btn btn btn-ghost"
        type="button"
        title="Abrir menu de navegação"
        aria-label="Abrir navegação"
        @click="toggleAside"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="topbar-icon"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div class="topbar-brand">
        <h1 class="topbar-title">Gerenciador de Projetos</h1>
        <span class="topbar-subtitle">Painel CRM</span>
      </div>
    </div>

    <div class="topbar-right">
      <!-- Theme Toggle -->
      <button
        class="btn btn-ghost topbar-action"
        type="button"
        @click="toggleTheme"
        :title="
          isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'
        "
        :aria-label="
          isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'
        "
      >
        <svg
          v-if="isDark"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="topbar-icon"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="topbar-icon"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>

      <!-- User Profile -->
      <button
        class="topbar-user"
        type="button"
        title="Ver seu perfil"
        aria-label="Ver seu perfil"
        @click="openProfile"
      >
        <div class="topbar-user__avatar" :title="displayName">
          {{ displayName.charAt(0).toUpperCase() }}
        </div>
        <div class="topbar-user__info">
          <span class="topbar-user__name" :title="displayName">{{
            displayName
          }}</span>
          <span class="topbar-user__email" :title="email">{{ email }}</span>
        </div>
      </button>

      <!-- Logout -->
      <button
        class="btn btn-ghost topbar-action topbar-logout"
        type="button"
        title="Sair da sua conta"
        aria-label="Sair"
        @click="logout"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="topbar-icon"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16,17 21,12 16,7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span class="topbar-logout__text">Sair</span>
      </button>
    </div>
  </header>
</template>

<style scoped lang="scss">
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: var(--topbar-height, 64px);
  padding: 0 1.25rem;
  background: var(--surface-1);
  border-bottom: 1px solid var(--border-1);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.topbar-menu-btn {
  display: none;
  padding: 0.5rem;

  @media (max-width: 920px) {
    display: flex;
  }
}

.topbar-brand {
  display: flex;
  flex-direction: column;
  gap: 0;
  text-align: left;
}

.topbar-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-1);
  line-height: 1.2;
}

.topbar-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.2;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.topbar-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.topbar-action {
  padding: 0.5rem;
  border-radius: var(--radius-md, 12px);
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0.75rem;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--radius-md, 12px);
  cursor: pointer;
  transition:
    background-color 150ms ease,
    border-color 150ms ease;

  &:hover {
    background: var(--surface-3, var(--surface-2));
    border-color: var(--border-1);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  @media (max-width: 600px) {
    padding: 0.375rem;

    .topbar-user__info {
      display: none;
    }
  }
}

.topbar-user__avatar {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary-fg, #fff);
  background: var(--primary);
  border-radius: var(--radius-full, 9999px);
}

.topbar-user__info {
  display: flex;
  flex-direction: column;
  gap: 0;
  text-align: left;
}

.topbar-user__name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-1);
  line-height: 1.2;
}

.topbar-user__email {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.2;
}

.topbar-logout {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--danger);

  &:hover {
    background: var(--danger-soft);
  }

  &__text {
    @media (max-width: 768px) {
      display: none;
    }
  }
}
</style>
