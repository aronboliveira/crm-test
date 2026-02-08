<script setup lang="ts">
import { usePasswordChecklist } from "../../assets/scripts/auth/usePasswordChecklist";

const props = defineProps<{
  password: string;
  confirm: string;
}>();

const { rules, okAll } = usePasswordChecklist(props);
</script>

<template>
  <section
    class="pw-check"
    :class="{ 'is-ok': okAll }"
    aria-label="Regras de senha"
  >
    <h2 class="pw-check__title" aria-label="Política de senha">
      Política de senha
    </h2>

    <ul class="pw-check__list" role="list" aria-label="Lista de verificação">
      <li
        v-for="r in rules"
        :key="r.key"
        class="pw-check__item"
        :class="{ 'is-ok': r.ok, 'is-bad': !r.ok }"
        :aria-label="r.label"
      >
        <span class="pw-check__dot" aria-hidden="true"></span>
        <span class="pw-check__text">{{ r.label }}</span>
      </li>
    </ul>
  </section>
</template>

<style lang="scss">
@keyframes pwDotPop {
  0% {
    transform: scale(0.85);
  }
  100% {
    transform: scale(1);
  }
}

.pw-check {
  border-radius: 0.9rem;
  border: 1px solid rgba(120, 120, 140, 0.25);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
  container-type: inline-size;
  padding: 0.85rem;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease,
    transform 140ms ease;

  &:hover {
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(1px);
  }
}

.pw-check__item {
  align-items: center;
  display: grid;
  gap: 0.6rem;
  grid-template-columns: auto 1fr;
  padding: 0.35rem 0.25rem;

  &.is-bad:hover {
    filter: brightness(1.02);
  }

  &.is-ok:hover {
    filter: brightness(1.03);
  }

  &::marker {
    color: transparent;
  }
}

.pw-check__dot {
  animation: pwDotPop 140ms ease both;
  border-radius: 999px;
  display: inline-block;
  height: 0.75rem;
  width: 0.75rem;
}

.pw-check__list {
  display: grid;
  gap: 0.15rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.pw-check__text {
  opacity: 0.92;

  &::first-letter {
    text-transform: uppercase;
  }

  &::selection {
    background: rgba(120, 120, 200, 0.22);
  }
}

.pw-check__title {
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  margin: 0 0 0.55rem 0;

  &::first-line {
    letter-spacing: 0.02em;
  }
}

.pw-check__item.is-ok .pw-check__dot {
  background: rgba(80, 160, 120, 0.85);
  box-shadow: 0 0 0 4px rgba(80, 160, 120, 0.14);
}

.pw-check__item.is-bad .pw-check__dot {
  background: rgba(220, 80, 80, 0.78);
  box-shadow: 0 0 0 4px rgba(220, 80, 80, 0.12);
}

@container (max-width: 520px) {
  .pw-check {
    padding: 0.75rem;
  }
}

@starting-style {
  .pw-check {
    opacity: 0;
    transform: translateY(8px);
  }
}
</style>
