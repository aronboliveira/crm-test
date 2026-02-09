<script setup lang="ts">
import { computed, ref } from "vue";
import type { LeadRow, CtaSuggestion } from "../../pinia/types/leads.types";
import ApiClientService from "../../services/ApiClientService";
import AlertService from "../../services/AlertService";

interface Props {
  lead: LeadRow;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "refresh"): void;
}>();

const busy = ref(false);
const suggestions = ref<CtaSuggestion[]>([
  ...(props.lead?.ctaSuggestions || []),
]);

const unusedSuggestions = computed(() =>
  suggestions.value.filter((s) => !s.used),
);
const usedSuggestions = computed(() => suggestions.value.filter((s) => s.used));

const channelIcon = (ch: string) => {
  const map: Record<string, string> = {
    email: "📧",
    whatsapp: "💬",
    sms: "📱",
    linkedin: "🔗",
    call: "📞",
  };
  return map[ch] || "💡";
};

const channelLabel = (ch: string) => {
  const map: Record<string, string> = {
    email: "E-mail",
    whatsapp: "WhatsApp",
    sms: "SMS",
    linkedin: "LinkedIn",
    call: "Ligação",
  };
  return map[ch] || ch;
};

const refreshSuggestions = async () => {
  busy.value = true;
  try {
    const res = await ApiClientService.leads.refreshCta(props.lead.id);
    suggestions.value = res?.ctaSuggestions || [];
  } catch (e) {
    console.error("[CtaPanel] Refresh failed:", e);
    await AlertService.error("Erro", "Falha ao gerar sugestões de CTA.");
  } finally {
    busy.value = false;
  }
};

const markUsed = async (cta: CtaSuggestion) => {
  try {
    await ApiClientService.leads.markCtaUsed(props.lead.id, cta.id);
    const idx = suggestions.value.findIndex((s) => s.id === cta.id);
    if (idx >= 0) suggestions.value[idx] = { ...cta, used: true };
  } catch (e) {
    console.error("[CtaPanel] Mark used failed:", e);
  }
};

const copyMessage = async (msg: string) => {
  try {
    await navigator.clipboard.writeText(msg);
    await AlertService.success(
      "Copiado",
      "Mensagem copiada para a área de transferência.",
    );
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = msg;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
};
</script>

<template>
  <div class="cta-panel">
    <div class="cta-header">
      <h3 class="cta-title">Sugestões de CTA — {{ lead.name }}</h3>
      <button
        class="btn btn-sm btn-outline"
        :disabled="busy"
        @click="refreshSuggestions"
      >
        {{ busy ? "Gerando..." : "🔄 Gerar Novas" }}
      </button>
    </div>

    <div v-if="unusedSuggestions.length" class="cta-list">
      <div v-for="cta in unusedSuggestions" :key="cta.id" class="cta-card">
        <div class="cta-card-header">
          <span class="cta-channel">
            {{ channelIcon(cta.channel) }} {{ channelLabel(cta.channel) }}
          </span>
        </div>
        <p class="cta-message">{{ cta.message }}</p>
        <div class="cta-actions">
          <button
            class="btn btn-xs btn-ghost"
            title="Copiar mensagem"
            @click="copyMessage(cta.message)"
          >
            📋 Copiar
          </button>
          <button
            class="btn btn-xs btn-ghost"
            title="Marcar como usado"
            @click="markUsed(cta)"
          >
            ✓ Usado
          </button>
        </div>
      </div>
    </div>
    <p v-else class="cta-empty">
      Nenhuma sugestão pendente. Clique em "Gerar Novas" para criar.
    </p>

    <details v-if="usedSuggestions.length" class="cta-used-section">
      <summary class="cta-used-toggle">
        CTAs já utilizados ({{ usedSuggestions.length }})
      </summary>
      <div class="cta-list cta-list--faded">
        <div
          v-for="cta in usedSuggestions"
          :key="cta.id"
          class="cta-card cta-card--used"
        >
          <span class="cta-channel">
            {{ channelIcon(cta.channel) }} {{ channelLabel(cta.channel) }}
          </span>
          <p class="cta-message">{{ cta.message }}</p>
        </div>
      </div>
    </details>

    <div class="cta-footer">
      <button class="btn btn-ghost btn-sm" @click="$emit('close')">
        Fechar
      </button>
    </div>
  </div>
</template>

<style scoped>
.cta-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cta-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cta-title {
  font-size: 1rem;
  font-weight: 600;
}

.cta-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cta-card {
  padding: 0.75rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.5rem;
  background: var(--color-bg-secondary, #f8fafc);
}

.cta-card--used {
  opacity: 0.5;
}

.cta-card-header {
  margin-bottom: 0.375rem;
}

.cta-channel {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary, #64748b);
}

.cta-message {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0.25rem 0 0.5rem;
}

.cta-actions {
  display: flex;
  gap: 0.5rem;
}

.cta-empty {
  text-align: center;
  color: var(--color-text-muted, #94a3b8);
  padding: 1.5rem 0;
}

.cta-used-section {
  margin-top: 0.5rem;
}

.cta-used-toggle {
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--color-text-muted, #94a3b8);
}

.cta-list--faded {
  opacity: 0.7;
}

.cta-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--color-border, #e2e8f0);
  padding-top: 0.75rem;
}
</style>
