<script setup lang="ts">
import { useTopBar } from "../../assets/scripts/shell/useTopBar";

const emit = defineEmits<{ (e: "toggle-aside"): void }>();

const { email, logout, toggleTheme, toggleAside } = useTopBar(emit);
</script>

<template>
  <header class="topbar" role="banner" aria-label="Top bar">
    <div class="topbar-left">
      <button
        class="btn btn-ghost md:hidden"
        type="button"
        aria-label="Open navigation"
        @click="toggleAside"
      >
        ≡
      </button>
      <h2 class="topbar-title">Dashboard</h2>
    </div>

    <div class="topbar-right">
      <button
        class="btn btn-primary"
        type="button"
        @click="toggleTheme"
        aria-label="Toggle dark mode"
      >
        Theme
      </button>
    </div>
    <div class="flex items-center gap-2">
      <div class="opacity-80 text-sm" aria-label="Authenticated user">
        {{ email }}
      </div>
      <button
        class="btn btn-ghost"
        type="button"
        aria-label="Logout"
        @click="logout"
      >
        Logout
      </button>
    </div>
  </header>
</template>
