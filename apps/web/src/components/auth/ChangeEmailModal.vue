<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "../../pinia/stores/auth.store";
import ApiClientService from "../../services/ApiClientService";

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", result: unknown): void;
}>();

const auth = useAuthStore();
const currentEmail = computed(() => auth.me?.email ?? "—");

const newEmail = ref("");
const password = ref("");
const busy = ref(false);
const error = ref("");
const success = ref("");

const canSubmit = computed(
  () =>
    !busy.value &&
    newEmail.value.trim().length > 0 &&
    password.value.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.value.trim()),
);

async function handleSubmit() {
  if (!canSubmit.value) return;

  busy.value = true;
  error.value = "";
  success.value = "";

  try {
    const result = await ApiClientService.auth.changeEmail(
      newEmail.value.trim().toLowerCase(),
      password.value,
    );

    if (result?.ok) {
      success.value =
        result.message ||
        "Solicitação de alteração de e-mail enviada com sucesso.";
    } else {
      error.value =
        result?.message || "Falha na solicitação de alteração de e-mail.";
    }
  } catch (err: any) {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Ocorreu um erro. Tente novamente.";
    error.value = msg;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="change-email-modal" @submit.prevent="handleSubmit">
    <div class="change-email-modal__field">
      <label class="change-email-modal__label">E-mail atual</label>
      <span class="change-email-modal__current">{{ currentEmail }}</span>
    </div>

    <div class="change-email-modal__field">
      <label class="change-email-modal__label" for="new-email-input"
        >Novo e-mail</label
      >
      <input
        id="new-email-input"
        v-model="newEmail"
        class="change-email-modal__input"
        type="email"
        placeholder="new.email@example.com"
        autocomplete="email"
        required
      />
    </div>

    <div class="change-email-modal__field">
      <label class="change-email-modal__label" for="confirm-password-input"
        >Confirme a senha</label
      >
      <input
        id="confirm-password-input"
        v-model="password"
        class="change-email-modal__input"
        type="password"
        placeholder="Digite sua senha atual"
        autocomplete="current-password"
        required
      />
    </div>

    <p
      v-if="error"
      class="change-email-modal__msg change-email-modal__msg--error"
    >
      {{ error }}
    </p>
    <p
      v-if="success"
      class="change-email-modal__msg change-email-modal__msg--success"
    >
      {{ success }}
    </p>

    <footer class="change-email-modal__footer">
      <button
        class="btn btn-secondary"
        type="button"
        :disabled="busy"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button class="btn btn-primary" type="submit" :disabled="!canSubmit">
        {{ busy ? "Enviando…" : "Solicitar alteração" }}
      </button>
    </footer>
  </form>
</template>

<style scoped lang="scss">
.change-email-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.change-email-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.change-email-modal__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.change-email-modal__current {
  font-size: 0.9375rem;
  color: var(--text-2);
}

.change-email-modal__input {
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  color: var(--text-1);
  background: var(--surface-2);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 8px);
  outline: none;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: var(--primary);
  }
}

.change-email-modal__msg {
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  border-radius: var(--radius-sm, 6px);

  &--error {
    background: var(
      --danger-soft,
      color-mix(in oklab, var(--danger) 15%, transparent)
    );
    color: var(--danger, #ef4444);
  }

  &--success {
    background: var(
      --success-soft,
      color-mix(in oklab, var(--success) 15%, transparent)
    );
    color: var(--success, #16a34a);
  }
}

.change-email-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-1);
}
</style>
