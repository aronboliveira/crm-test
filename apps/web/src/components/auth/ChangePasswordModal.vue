<script setup lang="ts">
import { ref, computed } from "vue";
import ApiClientService from "../../services/ApiClientService";

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", result: unknown): void;
}>();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const busy = ref(false);
const error = ref("");
const success = ref("");

const passwordMatch = computed(
  () => newPassword.value === confirmPassword.value,
);

const canSubmit = computed(
  () =>
    !busy.value &&
    currentPassword.value.length > 0 &&
    newPassword.value.length >= 8 &&
    passwordMatch.value,
);

async function handleSubmit() {
  if (!canSubmit.value) return;

  busy.value = true;
  error.value = "";
  success.value = "";

  try {
    const result = await ApiClientService.auth.changePassword(
      currentPassword.value,
      newPassword.value,
    );

    if (result?.ok) {
      success.value =
        "Senha alterada com sucesso. Você pode precisar fazer login novamente.";
      currentPassword.value = "";
      newPassword.value = "";
      confirmPassword.value = "";
    } else {
      error.value = "Falha ao alterar senha.";
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
  <form class="change-pw-modal" @submit.prevent="handleSubmit">
    <div class="change-pw-modal__field">
      <label class="change-pw-modal__label" for="current-pw-input"
        >Senha atual</label
      >
      <input
        id="current-pw-input"
        v-model="currentPassword"
        class="change-pw-modal__input"
        type="password"
        placeholder="Digite a senha atual"
        autocomplete="current-password"
        required
      />
    </div>

    <div class="change-pw-modal__field">
      <label class="change-pw-modal__label" for="new-pw-input"
        >Nova senha</label
      >
      <input
        id="new-pw-input"
        v-model="newPassword"
        class="change-pw-modal__input"
        type="password"
        placeholder="Mín. 8 caracteres"
        autocomplete="new-password"
        minlength="8"
        required
      />
    </div>

    <div class="change-pw-modal__field">
      <label class="change-pw-modal__label" for="confirm-pw-input"
        >Confirmar nova senha</label
      >
      <input
        id="confirm-pw-input"
        v-model="confirmPassword"
        class="change-pw-modal__input"
        :class="{
          'change-pw-modal__input--mismatch':
            confirmPassword.length > 0 && !passwordMatch,
        }"
        type="password"
        placeholder="Digite novamente a nova senha"
        autocomplete="new-password"
        required
      />
      <span
        v-if="confirmPassword.length > 0 && !passwordMatch"
        class="change-pw-modal__hint"
      >
        As senhas não conferem
      </span>
    </div>

    <p v-if="error" class="change-pw-modal__msg change-pw-modal__msg--error">
      {{ error }}
    </p>
    <p
      v-if="success"
      class="change-pw-modal__msg change-pw-modal__msg--success"
    >
      {{ success }}
    </p>

    <footer class="change-pw-modal__footer">
      <button
        class="btn btn-secondary"
        type="button"
        :disabled="busy"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button class="btn btn-primary" type="submit" :disabled="!canSubmit">
        {{ busy ? "Salvando…" : "Alterar senha" }}
      </button>
    </footer>
  </form>
</template>

<style scoped lang="scss">
.change-pw-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.change-pw-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.change-pw-modal__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.change-pw-modal__input {
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

  &--mismatch {
    border-color: var(--danger, #ef4444);
  }
}

.change-pw-modal__hint {
  font-size: 0.75rem;
  color: var(--danger, #ef4444);
}

.change-pw-modal__msg {
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

.change-pw-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-1);
}
</style>
