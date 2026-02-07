<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from "vue";
import ModalService from "../../services/ModalService";

const state = ModalService.state;

const isOpen = computed(() => state.value.isOpen);
const modalComponent = computed(() => state.value.component);
const options = computed(() => state.value.options);

const sizeClass = computed(() => {
  const size = options.value.size || "md";
  return `modal-container--${size}`;
});

const handleBackdropClick = () => {
  if (options.value.closable !== false) {
    ModalService.cancel();
  }
};

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === "Escape" && isOpen.value && options.value.closable !== false) {
    ModalService.cancel();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleEscape);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleEscape);
});

// Lock body scroll when modal is open
watch(isOpen, (open) => {
  if (open) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="options.title || 'Modal dialog'"
        @click.self="handleBackdropClick"
      >
        <div class="modal-container" :class="sizeClass">
          <!-- Header -->
          <header
            v-if="options.title || options.closable !== false"
            class="modal-header"
          >
            <h2 v-if="options.title" class="modal-title">
              {{ options.title }}
            </h2>
            <button
              v-if="options.closable !== false"
              class="modal-close btn btn-ghost"
              type="button"
              aria-label="Close modal"
              @click="ModalService.cancel()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="modal-close__icon"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <!-- Content -->
          <div class="modal-body">
            <component
              :is="modalComponent"
              v-bind="options.data"
              @close="ModalService.cancel()"
              @confirm="ModalService.confirm"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: var(--overlay);
  backdrop-filter: blur(4px);
}

.modal-container {
  width: 100%;
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-4);

  &--sm {
    max-width: 400px;
  }

  &--md {
    max-width: 560px;
  }

  &--lg {
    max-width: 720px;
  }

  &--xl {
    max-width: 960px;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-1);
}

.modal-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-1);
}

.modal-close {
  flex-shrink: 0;
  padding: 0.5rem;
  margin: -0.5rem -0.5rem -0.5rem 0;

  &__icon {
    width: 1.25rem;
    height: 1.25rem;
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

// Transitions
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;

  .modal-container {
    transition:
      transform 200ms ease,
      opacity 200ms ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal-container {
    transform: scale(0.95) translateY(-10px);
    opacity: 0;
  }
}
</style>
