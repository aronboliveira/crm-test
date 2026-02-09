<script setup lang="ts">
import { computed, ref } from "vue";
import type { ClientRow } from "../../pinia/types/clients.types";
import ApiClientService from "../../services/ApiClientService";
import AlertService from "../../services/AlertService";

interface Props {
  client?: ClientRow;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", client: ClientRow): void;
}>();

const isEditing = computed(() => !!props.client);
const busy = ref(false);
const error = ref("");

const name = ref(props.client?.name ?? "");
const company = ref(props.client?.company ?? "");
const email = ref(props.client?.email ?? "");
const phone = ref(props.client?.phone ?? "");
const notes = ref(props.client?.notes ?? "");

const emailValid = computed(() => {
  if (!email.value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
});

const formValid = computed(() => {
  return !!name.value.trim() && emailValid.value;
});

const submit = async () => {
  if (!formValid.value) {
    error.value = !name.value.trim()
      ? "Nome é obrigatório."
      : "E-mail inválido.";
    return;
  }

  busy.value = true;
  error.value = "";
  try {
    const payload = {
      name: name.value.trim(),
      company: company.value.trim() || undefined,
      email: email.value.trim() || undefined,
      phone: phone.value.trim() || undefined,
      notes: notes.value.trim() || undefined,
    };

    if (isEditing.value && props.client?.id) {
      await ApiClientService.clients.update(props.client.id, payload);
    } else {
      await ApiClientService.clients.create(payload);
    }

    const now = new Date().toISOString();
    const out: ClientRow = {
      id: props.client?.id ?? crypto.randomUUID(),
      name: payload.name,
      company: payload.company,
      email: payload.email,
      phone: payload.phone,
      notes: payload.notes,
      createdAt: props.client?.createdAt ?? now,
      updatedAt: now,
    };

    await AlertService.success(
      isEditing.value ? "Cliente Atualizado" : "Cliente Criado",
      `"${out.name}" foi ${isEditing.value ? "atualizado" : "criado"} com sucesso.`,
    );

    emit("confirm", out);
    emit("close");
  } catch (e: any) {
    console.error("[ClientFormModal] Submit failed:", e);
    const msg =
      e?.response?.data?.message || "Falha ao salvar cliente. Tente novamente.";
    error.value = msg;
    await AlertService.error("Erro", msg);
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <form class="client-form" novalidate @submit.prevent="submit">
    <div class="form-field">
      <label class="form-label" for="client-name">Nome</label>
      <input
        id="client-name"
        v-model="name"
        class="form-input"
        type="text"
        placeholder="Nome do cliente"
        :disabled="busy"
        required
      />
    </div>

    <div class="form-row">
      <div class="form-field">
        <label class="form-label" for="client-company">Empresa</label>
        <input
          id="client-company"
          v-model="company"
          class="form-input"
          type="text"
          placeholder="Empresa"
          :disabled="busy"
        />
      </div>
      <div class="form-field">
        <label class="form-label" for="client-phone">Telefone</label>
        <input
          id="client-phone"
          v-model="phone"
          class="form-input"
          type="text"
          placeholder="+55 11 9xxxx-xxxx"
          :disabled="busy"
        />
      </div>
    </div>

    <div class="form-field">
      <label class="form-label" for="client-email">E-mail</label>
      <input
        id="client-email"
        v-model="email"
        class="form-input"
        type="email"
        placeholder="cliente@empresa.com"
        :disabled="busy"
      />
      <small v-if="!emailValid" class="form-hint form-hint--error">
        E-mail inválido.
      </small>
    </div>

    <div class="form-field">
      <label class="form-label" for="client-notes">Notas</label>
      <textarea
        id="client-notes"
        v-model="notes"
        class="form-textarea"
        placeholder="Observações importantes"
        rows="4"
        :disabled="busy"
      ></textarea>
    </div>

    <p v-if="error" class="form-hint form-hint--error">{{ error }}</p>

    <div class="form-actions">
      <button
        class="btn btn-ghost"
        type="button"
        :disabled="busy"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button
        class="btn btn-primary"
        type="submit"
        :disabled="busy || !formValid"
        :aria-busy="busy"
        :aria-disabled="busy || !formValid"
      >
        {{
          busy
            ? "Salvando..."
            : isEditing
              ? "Atualizar Cliente"
              : "Criar Cliente"
        }}
      </button>
    </div>
  </form>
</template>

<style scoped lang="scss">
.client-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-1);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: var(--text-1);
  background: var(--surface-2);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 12px);
  outline: none;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;

  &:hover:not(:focus):not(:disabled) {
    border-color: var(--border-hover);
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--focus-ring);
  }

  &::placeholder {
    color: var(--text-muted);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.form-textarea {
  resize: vertical;
  min-height: 110px;
}

.form-hint {
  font-size: 0.85rem;
  color: var(--text-muted);

  &--error {
    color: var(--danger-500, #ef4444);
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
