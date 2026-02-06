<script setup lang="ts">
import { useSidebarNav } from "../../assets/scripts/shell/useSidebarNav";
const { collapsed, items, iconFor, toggle, isActive, route } = useSidebarNav();
</script>

<template>
  <aside
    class="sidebar"
    :class="{ 'is-collapsed': collapsed }"
    role="navigation"
    aria-label="Sidebar"
  >
    <div class="sidebar-head">
      <button
        class="btn btn-ghost"
        type="button"
        :aria-expanded="!collapsed"
        aria-controls="sidebar-links"
        @click="toggle"
      >
        <span class="sr-only">Toggle sidebar</span>
        <span aria-hidden="true">≡</span>
      </button>
      <h1 class="sidebar-title" :class="{ 'sr-only': collapsed }">Admin</h1>
    </div>

    <nav id="sidebar-links" class="sidebar-links">
      <a
        v-for="it in items"
        :key="it.key"
        class="sidebar-link"
        :class="isActive(it.to)"
        :href="it.to"
        @click.prevent="$router.push(it.to)"
        :aria-current="route.path === it.to ? 'page' : undefined"
      >
        <span class="sidebar-link-icon" aria-hidden="true">
          <svg
            v-if="iconFor(it.key) === 'check'"
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 12l3 3 5-6" />
            <path d="M5 5h14v14H5z" />
          </svg>
          <svg
            v-else
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 4h7v7H4z" />
            <path d="M13 4h7v7h-7z" />
            <path d="M4 13h7v7H4z" />
            <path d="M13 13h7v7h-7z" />
          </svg>
        </span>
        <span class="sidebar-link-text" :class="{ 'sr-only': collapsed }">{{
          it.label
        }}</span>
      </a>
    </nav>
  </aside>
</template>
