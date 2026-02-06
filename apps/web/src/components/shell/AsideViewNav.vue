<script setup lang="ts">
import { useAsideViewNav } from "../../assets/scripts/shell/useAsideViewNav";
import type MainViewController from "./MainViewController";
import type { MainViewKey } from "./MainViewRegistry";

const props = defineProps<{ controller: MainViewController<MainViewKey> }>();

const { onPick, toggle, close, isActive } = useAsideViewNav(props);
</script>

<template>
  <div
    class="aside-backdrop"
    :class="{ 'is-open': controller.open.value }"
    role="presentation"
    @click.self="close"
  >
    <aside
      class="aside"
      :class="{
        'is-collapsed': controller.collapsed.value,
        'is-open': controller.open.value,
      }"
      role="navigation"
      aria-label="Main navigation"
    >
      <div class="aside-head">
        <div
          class="aside-brand"
          :class="{ 'sr-only': controller.collapsed.value }"
        >
          Admin
        </div>

        <div class="aside-actions">
          <button
            class="btn btn-ghost"
            type="button"
            aria-label="Collapse navigation"
            :aria-pressed="controller.collapsed.value"
            @click="toggle"
          >
            ⟷
          </button>

          <button
            class="btn btn-ghost md:hidden"
            type="button"
            aria-label="Close navigation"
            @click="close"
          >
            ×
          </button>
        </div>
      </div>

      <nav class="aside-nav" aria-label="Views">
        <button
          v-for="it in controller.items.value"
          :key="it.key"
          class="nav-btn"
          :class="isActive(it.key)"
          type="button"
          :aria-label="it.ariaLabel"
          :aria-current="
            controller.activeKey.value === it.key ? 'page' : undefined
          "
          @click="onPick(it.key)"
        >
          <span
            class="nav-btn-text"
            :class="{ 'sr-only': controller.collapsed.value }"
          >
            {{ it.label }}
          </span>
        </button>
      </nav>
    </aside>
  </div>
</template>
