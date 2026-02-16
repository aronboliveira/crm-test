<script setup lang="ts">
import { computed, ref } from "vue";
import type { ClientRow } from "../../pinia/types/clients.types";
import ApiClientService from "../../services/ApiClientService";
import AlertService from "../../services/AlertService";

interface Props {
  client?: ClientRow;
  draft?: Partial<{
    name: string;
    type: "pessoa" | "empresa";
    company: string;
    email: string;
    phone: string;
    cellPhone: string;
    whatsappNumber: string;
    cnpj: string;
    cep: string;
    hasWhatsapp: boolean;
    preferredContact: "email" | "phone" | "whatsapp" | "cellphone";
    notes: string;
  }>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", client: ClientRow): void;
}>();

const isEditing = computed(() => !!props.client);
const busy = ref(false);
const error = ref("");

const name = ref(props.client?.name ?? props.draft?.name ?? "");
const clientType = ref<"pessoa" | "empresa">(
  props.client?.type ?? props.draft?.type ?? "pessoa",
);
const company = ref(props.client?.company ?? props.draft?.company ?? "");
const email = ref(props.client?.email ?? props.draft?.email ?? "");
const phone = ref(props.client?.phone ?? props.draft?.phone ?? "");
const cellPhone = ref(props.client?.cellPhone ?? props.draft?.cellPhone ?? "");
const whatsappNumber = ref(
  props.client?.whatsappNumber ?? props.draft?.whatsappNumber ?? "",
);
const cnpj = ref(props.client?.cnpj ?? props.draft?.cnpj ?? "");
const cep = ref(props.client?.cep ?? props.draft?.cep ?? "");
const hasWhatsapp = ref(
  props.client?.hasWhatsapp ?? props.draft?.hasWhatsapp ?? false,
);
const preferredContact = ref<"email" | "phone" | "whatsapp" | "cellphone">(
  props.client?.preferredContact ?? props.draft?.preferredContact ?? "email",
);
const notes = ref(props.client?.notes ?? props.draft?.notes ?? "");

const CNPJ_PATTERN = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const CEP_PATTERN = /^\d{5}-\d{3}$/;

const normalizeCnpj = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";
  if (digits.length < 14) return value;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
};

const normalizeCep = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  if (digits.length < 8) return value;
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
};

const isCompanyType = computed(() => clientType.value === "empresa");

const emailValid = computed(() => {
  if (!email.value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
});

const cnpjValid = computed(() => {
  if (!isCompanyType.value) return true;
  return CNPJ_PATTERN.test(cnpj.value.trim());
});

const cepValid = computed(() => {
  if (!isCompanyType.value) return true;
  return CEP_PATTERN.test(cep.value.trim());
});

const formValid = computed(() => {
  return (
    !!name.value.trim() &&
    emailValid.value &&
    (!isCompanyType.value || (cnpjValid.value && cepValid.value))
  );
});

const submit = async () => {
  if (!formValid.value) {
    if (!name.value.trim()) {
      error.value = "Nome é obrigatório.";
      return;
    }
    if (!emailValid.value) {
      error.value = "E-mail inválido.";
      return;
    }
    if (isCompanyType.value && !cnpjValid.value) {
      error.value = "CNPJ inválido.";
      return;
    }
    if (isCompanyType.value && !cepValid.value) {
      error.value = "CEP inválido.";
      return;
    }
    return;
  }

  busy.value = true;
  error.value = "";
  try {
    const payload = {
      name: name.value.trim(),
      type: clientType.value,
      company: company.value.trim() || undefined,
      email: email.value.trim() || undefined,
      phone: phone.value.trim() || undefined,
      cellPhone: cellPhone.value.trim() || undefined,
      whatsappNumber: whatsappNumber.value.trim() || undefined,
      cnpj: isCompanyType.value ? normalizeCnpj(cnpj.value.trim()) : undefined,
      cep: isCompanyType.value ? normalizeCep(cep.value.trim()) : undefined,
      hasWhatsapp: hasWhatsapp.value,
      preferredContact: preferredContact.value,
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
      type: payload.type,
      company: payload.company,
      email: payload.email,
      phone: payload.phone,
      cellPhone: payload.cellPhone,
      whatsappNumber: payload.whatsappNumber,
      cnpj: payload.cnpj,
      cep: payload.cep,
      hasWhatsapp: payload.hasWhatsapp,
      preferredContact: payload.preferredContact,
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
        <label class="form-label" for="client-type">Tipo</label>
        <select
          id="client-type"
          v-model="clientType"
          class="form-input"
          :disabled="busy"
          required
        >
          <option value="pessoa">Pessoa</option>
          <option value="empresa">Empresa</option>
        </select>
      </div>
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
    </div>

    <div v-if="isCompanyType" class="form-row">
      <div class="form-field">
        <label class="form-label" for="client-cnpj">CNPJ</label>
        <input
          id="client-cnpj"
          v-model="cnpj"
          class="form-input"
          type="text"
          placeholder="12.345.678/0001-90"
          pattern="\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"
          :disabled="busy"
          :required="isCompanyType"
          autocomplete="off"
          inputmode="numeric"
          @blur="cnpj = normalizeCnpj(cnpj)"
        />
        <small v-if="!cnpjValid" class="form-hint form-hint--error">
          Informe um CNPJ no formato 00.000.000/0000-00.
        </small>
      </div>
      <div class="form-field">
        <label class="form-label" for="client-cep">CEP</label>
        <input
          id="client-cep"
          v-model="cep"
          class="form-input"
          type="text"
          placeholder="00000-000"
          pattern="\d{5}-\d{3}"
          :disabled="busy"
          :required="isCompanyType"
          autocomplete="postal-code"
          inputmode="numeric"
          @blur="cep = normalizeCep(cep)"
        />
        <small v-if="!cepValid" class="form-hint form-hint--error">
          Informe um CEP no formato 00000-000.
        </small>
      </div>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label class="form-label" for="client-phone">Telefone Fixo</label>
        <input
          id="client-phone"
          v-model="phone"
          class="form-input"
          type="text"
          placeholder="+55 11 3xxx-xxxx"
          :disabled="busy"
        />
      </div>
      <div class="form-field">
        <label class="form-label" for="client-cellphone">Celular</label>
        <input
          id="client-cellphone"
          v-model="cellPhone"
          class="form-input"
          type="text"
          placeholder="+55 11 9xxxx-xxxx"
          :disabled="busy"
        />
      </div>
      <div class="form-field">
        <label class="form-label" for="client-whatsapp">WhatsApp</label>
        <input
          id="client-whatsapp"
          v-model="whatsappNumber"
          class="form-input"
          type="text"
          placeholder="+55 11 9xxxx-xxxx"
          :disabled="busy"
        />
        <small class="form-hint">Se diferente do celular</small>
      </div>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label class="form-checkbox">
          <input v-model="hasWhatsapp" type="checkbox" :disabled="busy" />
          <span>WhatsApp Verificado</span>
        </label>
      </div>
      <div class="form-field">
        <label class="form-label" for="client-preferred"
          >Contato Preferido</label
        >
        <select
          id="client-preferred"
          v-model="preferredContact"
          class="form-input"
          :disabled="busy"
        >
          <option value="email">📧 E-mail</option>
          <option value="phone">📞 Telefone</option>
          <option value="cellphone">📱 Celular</option>
          <option value="whatsapp">💬 WhatsApp</option>
        </select>
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

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-1);

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
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
