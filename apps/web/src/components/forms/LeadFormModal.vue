<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  LeadRow,
  LeadStatus,
  LeadSource,
} from "../../pinia/types/leads.types";
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
} from "../../pinia/types/leads.types";
import ApiClientService from "../../services/ApiClientService";
import AlertService from "../../services/AlertService";

interface Props {
  lead?: LeadRow;
  draft?: Partial<{
    name: string;
    company: string;
    email: string;
    phone: string;
    status: LeadStatus;
    source: LeadSource;
    estimatedValue: number | string;
    assignedTo: string;
    notes: string;
    tags: string[] | string;
  }>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", lead: LeadRow): void;
}>();

const isEditing = computed(() => !!props.lead);
const busy = ref(false);
const error = ref("");
const activeTab = ref<"info" | "campaigns" | "contracts" | "cta">("info");

/* ── Form fields ────────────────────────────────────────── */
const name = ref(props.lead?.name ?? props.draft?.name ?? "");
const company = ref(props.lead?.company ?? props.draft?.company ?? "");
const email = ref(props.lead?.email ?? props.draft?.email ?? "");
const phone = ref(props.lead?.phone ?? props.draft?.phone ?? "");
const status = ref<LeadStatus>(
  props.lead?.status ?? props.draft?.status ?? "new",
);
const source = ref<LeadSource>(
  props.lead?.source ?? props.draft?.source ?? "other",
);
const estimatedValue = ref<number | undefined>(
  props.lead?.estimatedValue ??
    (typeof props.draft?.estimatedValue === "string"
      ? Number(props.draft.estimatedValue)
      : props.draft?.estimatedValue),
);
const assignedTo = ref(props.lead?.assignedTo ?? props.draft?.assignedTo ?? "");
const notes = ref(props.lead?.notes ?? props.draft?.notes ?? "");
const tags = ref(
  props.lead?.tags?.join(", ") ??
    (Array.isArray(props.draft?.tags)
      ? props.draft.tags.join(", ")
      : (props.draft?.tags ?? "")),
);

/* ── Campaign attachment ────────────────────────────────── */
const campName = ref("");
const campChannel = ref("email");
const campaigns = ref([...(props.lead?.campaigns || [])]);

const addCampaign = () => {
  if (!campName.value.trim()) return;
  campaigns.value.push({
    id: Date.now().toString(36),
    name: campName.value.trim(),
    channel: campChannel.value,
    attachedAt: new Date().toISOString(),
  });
  campName.value = "";
};

const removeCampaign = (idx: number) => {
  campaigns.value.splice(idx, 1);
};

/* ── Contract attachment ────────────────────────────────── */
const ctrTitle = ref("");
const ctrValue = ref<number | undefined>();
const contracts = ref([...(props.lead?.contracts || [])]);

const addContract = () => {
  if (!ctrTitle.value.trim()) return;
  contracts.value.push({
    id: Date.now().toString(36),
    title: ctrTitle.value.trim(),
    value: ctrValue.value,
    attachedAt: new Date().toISOString(),
  });
  ctrTitle.value = "";
  ctrValue.value = undefined;
};

const removeContract = (idx: number) => {
  contracts.value.splice(idx, 1);
};

/* ── Validation ─────────────────────────────────────────── */
const emailValid = computed(() => {
  if (!email.value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
});

const formValid = computed(() => !!name.value.trim() && emailValid.value);

const statusOptions = Object.entries(LEAD_STATUS_LABELS) as [
  LeadStatus,
  string,
][];
const sourceOptions = Object.entries(LEAD_SOURCE_LABELS) as [
  LeadSource,
  string,
][];

/* ── Submit ─────────────────────────────────────────────── */
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
    const payload: any = {
      name: name.value.trim(),
      company: company.value.trim() || undefined,
      email: email.value.trim() || undefined,
      phone: phone.value.trim() || undefined,
      status: status.value,
      source: source.value,
      estimatedValue: estimatedValue.value ?? undefined,
      assignedTo: assignedTo.value.trim() || undefined,
      notes: notes.value.trim() || undefined,
      tags: tags.value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (isEditing.value && props.lead?.id) {
      await ApiClientService.leads.update(props.lead.id, payload);

      // Sync campaigns & contracts via API
      for (const c of campaigns.value) {
        if (!(props.lead?.campaigns || []).find((ec) => ec.id === c.id)) {
          await ApiClientService.leads.attachCampaign(props.lead!.id, c);
        }
      }
      for (const c of contracts.value) {
        if (!(props.lead?.contracts || []).find((ec) => ec.id === c.id)) {
          await ApiClientService.leads.attachContract(props.lead!.id, c);
        }
      }
    } else {
      await ApiClientService.leads.create(payload);
    }

    const now = new Date().toISOString();
    const out: LeadRow = {
      id: props.lead?.id ?? crypto.randomUUID(),
      ...payload,
      campaigns: campaigns.value,
      contracts: contracts.value,
      ctaSuggestions: props.lead?.ctaSuggestions ?? [],
      createdAt: props.lead?.createdAt ?? now,
      updatedAt: now,
    };

    await AlertService.success(
      isEditing.value ? "Lead Atualizado" : "Lead Criado",
      `"${out.name}" foi ${isEditing.value ? "atualizado" : "criado"} com sucesso.`,
    );

    emit("confirm", out);
    emit("close");
  } catch (e: any) {
    console.error("[LeadFormModal] Submit failed:", e);
    const msg =
      e?.response?.data?.message || "Falha ao salvar lead. Tente novamente.";
    error.value = msg;
    await AlertService.error("Erro", msg);
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <form class="lead-form" novalidate @submit.prevent="submit">
    <!-- Tabs -->
    <div class="lead-tabs">
      <button
        type="button"
        class="lead-tab"
        :class="{ active: activeTab === 'info' }"
        @click="activeTab = 'info'"
      >
        Informações
      </button>
      <button
        type="button"
        class="lead-tab"
        :class="{ active: activeTab === 'campaigns' }"
        @click="activeTab = 'campaigns'"
      >
        Campanhas ({{ campaigns.length }})
      </button>
      <button
        type="button"
        class="lead-tab"
        :class="{ active: activeTab === 'contracts' }"
        @click="activeTab = 'contracts'"
      >
        Contratos ({{ contracts.length }})
      </button>
    </div>

    <!-- Info tab -->
    <div v-show="activeTab === 'info'" class="lead-tab-content">
      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="lead-name">Nome *</label>
          <input
            id="lead-name"
            v-model="name"
            class="form-input"
            type="text"
            required
            placeholder="Nome do lead"
          />
        </div>
        <div class="form-field">
          <label class="form-label" for="lead-company">Empresa</label>
          <input
            id="lead-company"
            v-model="company"
            class="form-input"
            type="text"
            placeholder="Nome da empresa"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="lead-email">E-mail</label>
          <input
            id="lead-email"
            v-model="email"
            class="form-input"
            type="email"
            placeholder="contato@empresa.com"
          />
          <p v-if="!emailValid" class="form-error">E-mail inválido</p>
        </div>
        <div class="form-field">
          <label class="form-label" for="lead-phone">Telefone</label>
          <input
            id="lead-phone"
            v-model="phone"
            class="form-input"
            type="tel"
            placeholder="+55 11 99999-0000"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="lead-status">Status</label>
          <select id="lead-status" v-model="status" class="form-input">
            <option
              v-for="[val, label] in statusOptions"
              :key="val"
              :value="val"
            >
              {{ label }}
            </option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label" for="lead-source">Origem</label>
          <select id="lead-source" v-model="source" class="form-input">
            <option
              v-for="[val, label] in sourceOptions"
              :key="val"
              :value="val"
            >
              {{ label }}
            </option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="lead-value">Valor Estimado (R$)</label>
          <input
            id="lead-value"
            v-model.number="estimatedValue"
            class="form-input"
            type="number"
            min="0"
            step="100"
            placeholder="0"
          />
        </div>
        <div class="form-field">
          <label class="form-label" for="lead-assigned">Responsável</label>
          <input
            id="lead-assigned"
            v-model="assignedTo"
            class="form-input"
            type="text"
            placeholder="email@corp.local"
          />
        </div>
      </div>

      <div class="form-field">
        <label class="form-label" for="lead-tags">Tags</label>
        <input
          id="lead-tags"
          v-model="tags"
          class="form-input"
          type="text"
          placeholder="empresa, saas, fintech"
        />
        <p class="form-hint">Separe tags por vírgula</p>
      </div>

      <div class="form-field">
        <label class="form-label" for="lead-notes">Observações</label>
        <textarea
          id="lead-notes"
          v-model="notes"
          class="form-input form-textarea"
          rows="3"
          placeholder="Notas sobre o lead..."
        />
      </div>
    </div>

    <!-- Campaigns tab -->
    <div v-show="activeTab === 'campaigns'" class="lead-tab-content">
      <div class="attachment-list" v-if="campaigns.length">
        <div v-for="(c, i) in campaigns" :key="c.id" class="attachment-item">
          <div class="attachment-info">
            <strong>{{ c.name }}</strong>
            <span class="attachment-meta"
              >{{ c.channel }} ·
              {{ new Date(c.attachedAt).toLocaleDateString("pt-BR") }}</span
            >
          </div>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            title="Remover"
            @click="removeCampaign(i)"
          >
            ✕
          </button>
        </div>
      </div>
      <p v-else class="empty-text">Nenhuma campanha vinculada.</p>

      <div class="attachment-add">
        <input
          v-model="campName"
          class="form-input"
          type="text"
          placeholder="Nome da campanha"
        />
        <select v-model="campChannel" class="form-input form-input-sm">
          <option value="email">E-mail</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
          <option value="linkedin">LinkedIn</option>
          <option value="call">Ligação</option>
        </select>
        <button
          type="button"
          class="btn btn-sm btn-outline"
          :disabled="!campName.trim()"
          @click="addCampaign"
        >
          + Adicionar
        </button>
      </div>
    </div>

    <!-- Contracts tab -->
    <div v-show="activeTab === 'contracts'" class="lead-tab-content">
      <div class="attachment-list" v-if="contracts.length">
        <div v-for="(c, i) in contracts" :key="c.id" class="attachment-item">
          <div class="attachment-info">
            <strong>{{ c.title }}</strong>
            <span class="attachment-meta">
              {{ c.value ? `R$ ${c.value.toLocaleString("pt-BR")}` : "—" }}
              · {{ new Date(c.attachedAt).toLocaleDateString("pt-BR") }}
            </span>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            title="Remover"
            @click="removeContract(i)"
          >
            ✕
          </button>
        </div>
      </div>
      <p v-else class="empty-text">Nenhum contrato vinculado.</p>

      <div class="attachment-add">
        <input
          v-model="ctrTitle"
          class="form-input"
          type="text"
          placeholder="Título do contrato"
        />
        <input
          v-model.number="ctrValue"
          class="form-input form-input-sm"
          type="number"
          min="0"
          step="100"
          placeholder="Valor (R$)"
        />
        <button
          type="button"
          class="btn btn-sm btn-outline"
          :disabled="!ctrTitle.trim()"
          @click="addContract"
        >
          + Adicionar
        </button>
      </div>
    </div>

    <!-- Error & actions -->
    <p v-if="error" class="form-error mt-4">{{ error }}</p>
    <div class="form-actions">
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="busy"
        @click="$emit('close')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="!formValid || busy"
      >
        {{ busy ? "Salvando..." : isEditing ? "Atualizar" : "Criar Lead" }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.lead-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lead-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--color-border, #e2e8f0);
  margin-bottom: 1rem;
}

.lead-tab {
  background: none;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary, #64748b);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.15s;
}

.lead-tab.active {
  color: var(--color-primary, #3b82f6);
  border-bottom-color: var(--color-primary, #3b82f6);
}

.lead-tab-content {
  min-height: 200px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;
}

.form-textarea {
  resize: vertical;
}

.form-input-sm {
  max-width: 140px;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted, #94a3b8);
}

.form-error {
  color: var(--color-error, #ef4444);
  font-size: 0.8rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

/* ── Attachment list ──────────────────────────────── */

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-secondary, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.375rem;
}

.attachment-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.attachment-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted, #94a3b8);
}

.attachment-add {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.empty-text {
  color: var(--color-text-muted, #94a3b8);
  font-size: 0.85rem;
  text-align: center;
  padding: 1.5rem 0;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .attachment-add {
    flex-direction: column;
  }
}
</style>
