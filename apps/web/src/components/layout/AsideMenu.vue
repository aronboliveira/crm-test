<script setup lang="ts">
import { useAsideMenu } from "../../assets/scripts/layout/useAsideMenu";
const { sections, go } = useAsideMenu();
</script>

<template>
  <aside class="aside" aria-label="Sidebar navigation">
    <nav class="aside__nav" aria-label="Main navigation">
      <section
        v-for="s in sections"
        :key="s.id"
        class="aside__sec"
        :aria-label="s.label"
      >
        <h3 class="aside__h">{{ s.label }}</h3>

        <ul class="aside__list" role="list" :aria-label="`${s.label} links`">
          <li v-for="i in s.items" :key="i.id" class="aside__li">
            <button
              class="aside__btn"
              type="button"
              :aria-label="i.label"
              @click="go(i.to)"
            >
              {{ i.label }}
            </button>
          </li>
        </ul>
      </section>
    </nav>
  </aside>
</template>

<style lang="scss">
@keyframes asideIn {
  0% {
    opacity: 0;
    transform: translateX(-10px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.aside {
  animation: asideIn 160ms ease both;
  container-type: inline-size;
  display: grid;
  height: 100%;
  padding: 0.75rem;
}

.aside__btn {
  align-items: center;
  border-radius: 0.75rem;
  display: flex;
  font-weight: 800;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  text-align: left;
  transition:
    background 140ms ease,
    transform 140ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.5;
  }
}

.aside__h {
  font-size: 0.85rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  margin: 0.75rem 0 0.35rem 0;

  &::first-line {
    letter-spacing: 0.03em;
  }
  &::selection {
    background: rgba(120, 120, 200, 0.22);
  }
}

.aside__li {
  list-style: none;

  &::marker {
    color: transparent;
  }
}

.aside__list {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
}

.aside__nav {
  display: grid;
  gap: 0.9rem;
}

.aside__sec {
  border: 1px solid rgba(120, 120, 140, 0.22);
  border-radius: 1rem;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
  padding: 0.75rem;
}

@container (max-width: 520px) {
  .aside {
    padding: 0.5rem;
  }
  .aside__sec {
    padding: 0.6rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aside {
    animation: none;
  }
  .aside__btn {
    transition: none;
  }
}

@starting-style {
  .aside {
    opacity: 0;
    transform: translateX(-10px);
  }
}

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
