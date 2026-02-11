<script setup lang="ts">
import { computed } from "vue";

interface WhatsAppAnalytics {
  sent?: number;
  delivered?: number;
  read?: number;
  replied?: number;
}

interface EmailAnalytics {
  sent?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
}

interface Props {
  type: "whatsapp" | "email";
  client: { id: string; name: string };
  analytics: WhatsAppAnalytics | EmailAnalytics | null;
  score: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const isWhatsApp = computed(() => props.type === "whatsapp");

const whatsappData = computed(() => {
  if (!isWhatsApp.value) return null;
  const data = props.analytics as WhatsAppAnalytics | null;
  return {
    sent: data?.sent ?? 0,
    delivered: data?.delivered ?? 0,
    read: data?.read ?? 0,
    replied: data?.replied ?? 0,
  };
});

const emailData = computed(() => {
  if (isWhatsApp.value) return null;
  const data = props.analytics as EmailAnalytics | null;
  return {
    sent: data?.sent ?? 0,
    opened: data?.opened ?? 0,
    clicked: data?.clicked ?? 0,
    replied: data?.replied ?? 0,
  };
});

const scoreLevel = computed(() => {
  if (props.score >= 60) return "high";
  if (props.score >= 30) return "medium";
  return "low";
});

const scoreLevelLabel = computed(() => {
  if (props.score >= 60) return "Excelente";
  if (props.score >= 30) return "Regular";
  return "Baixo";
});

const calcRate = (value: number, total: number): string => {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
};
</script>

<template>
  <div class="engagement-modal">
    <div class="engagement-modal__header">
      <div class="engagement-modal__icon">
        {{ isWhatsApp ? "💬" : "📧" }}
      </div>
      <div>
        <h3 class="engagement-modal__title">
          Engajamento {{ isWhatsApp ? "WhatsApp" : "E-mail" }}
        </h3>
        <p class="engagement-modal__subtitle">{{ client.name }}</p>
      </div>
    </div>

    <div class="engagement-modal__score" :class="`score--${scoreLevel}`">
      <div class="score__value">{{ score }}%</div>
      <div class="score__label">{{ scoreLevelLabel }}</div>
    </div>

    <!-- WhatsApp Metrics -->
    <div v-if="isWhatsApp && whatsappData" class="engagement-modal__metrics">
      <div class="metric">
        <div class="metric__icon">📤</div>
        <div class="metric__content">
          <div class="metric__label">Enviadas</div>
          <div class="metric__value">{{ whatsappData.sent }}</div>
        </div>
      </div>
      <div class="metric">
        <div class="metric__icon">✅</div>
        <div class="metric__content">
          <div class="metric__label">Entregues</div>
          <div class="metric__value">
            {{ whatsappData.delivered }}
            <span class="metric__rate">{{
              calcRate(whatsappData.delivered, whatsappData.sent)
            }}</span>
          </div>
        </div>
      </div>
      <div class="metric">
        <div class="metric__icon">👀</div>
        <div class="metric__content">
          <div class="metric__label">Lidas</div>
          <div class="metric__value">
            {{ whatsappData.read }}
            <span class="metric__rate">{{
              calcRate(whatsappData.read, whatsappData.sent)
            }}</span>
          </div>
        </div>
      </div>
      <div class="metric">
        <div class="metric__icon">💬</div>
        <div class="metric__content">
          <div class="metric__label">Respondidas</div>
          <div class="metric__value">
            {{ whatsappData.replied }}
            <span class="metric__rate">{{
              calcRate(whatsappData.replied, whatsappData.sent)
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Email Metrics -->
    <div v-if="!isWhatsApp && emailData" class="engagement-modal__metrics">
      <div class="metric">
        <div class="metric__icon">📤</div>
        <div class="metric__content">
          <div class="metric__label">Enviados</div>
          <div class="metric__value">{{ emailData.sent }}</div>
        </div>
      </div>
      <div class="metric">
        <div class="metric__icon">📬</div>
        <div class="metric__content">
          <div class="metric__label">Abertos</div>
          <div class="metric__value">
            {{ emailData.opened }}
            <span class="metric__rate">{{
              calcRate(emailData.opened, emailData.sent)
            }}</span>
          </div>
        </div>
      </div>
      <div class="metric">
        <div class="metric__icon">🔗</div>
        <div class="metric__content">
          <div class="metric__label">Cliques</div>
          <div class="metric__value">
            {{ emailData.clicked }}
            <span class="metric__rate">{{
              calcRate(emailData.clicked, emailData.sent)
            }}</span>
          </div>
        </div>
      </div>
      <div class="metric">
        <div class="metric__icon">↩️</div>
        <div class="metric__content">
          <div class="metric__label">Respondidos</div>
          <div class="metric__value">
            {{ emailData.replied }}
            <span class="metric__rate">{{
              calcRate(emailData.replied, emailData.sent)
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="engagement-modal__footer">
      <p class="engagement-modal__note">
        O score é calculado com base nas taxas de
        {{ isWhatsApp ? "entrega, leitura e resposta" : "abertura, cliques e resposta" }}.
      </p>
    </div>
  </div>
</template>

<style scoped>
.engagement-modal {
  padding: 0;
}

.engagement-modal__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 8px 8px 0 0;
}

@media (prefers-color-scheme: dark) {
  .engagement-modal__header {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  }
}

.engagement-modal__icon {
  font-size: 2.5rem;
}

.engagement-modal__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

@media (prefers-color-scheme: dark) {
  .engagement-modal__title {
    color: #e2e8f0;
  }
}

.engagement-modal__subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

@media (prefers-color-scheme: dark) {
  .engagement-modal__subtitle {
    color: #94a3b8;
  }
}

.engagement-modal__score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  margin: 1.5rem;
  border-radius: 12px;
  background: #f1f5f9;
}

@media (prefers-color-scheme: dark) {
  .engagement-modal__score {
    background: #1e293b;
  }
}

.engagement-modal__score.score--high {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

@media (prefers-color-scheme: dark) {
  .engagement-modal__score.score--high {
    background: linear-gradient(135deg, #14532d 0%, #15803d 100%);
  }
}

.engagement-modal__score.score--medium {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

@media (prefers-color-scheme: dark) {
  .engagement-modal__score.score--medium {
    background: linear-gradient(135deg, #713f12 0%, #854d0e 100%);
  }
}

.engagement-modal__score.score--low {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
}

@media (prefers-color-scheme: dark) {
  .engagement-modal__score.score--low {
    background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
  }
}

.score__value {
  font-size: 3rem;
  font-weight: 800;
  color: #0f172a;
}

@media (prefers-color-scheme: dark) {
  .score__value {
    color: #e2e8f0;
  }
}

.score__label {
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media (prefers-color-scheme: dark) {
  .score__label {
    color: #94a3b8;
  }
}

.engagement-modal__metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 0 1.5rem 1.5rem;
}

.metric {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .metric {
    background: #1e293b;
    border-color: #334155;
  }
}

.metric__icon {
  font-size: 1.5rem;
}

.metric__content {
  flex: 1;
}

.metric__label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 500;
}

@media (prefers-color-scheme: dark) {
  .metric__label {
    color: #94a3b8;
  }
}

.metric__value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  .metric__value {
    color: #e2e8f0;
  }
}

.metric__rate {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
}

@media (prefers-color-scheme: dark) {
  .metric__rate {
    color: #94a3b8;
  }
}

.engagement-modal__footer {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-radius: 0 0 8px 8px;
  border-top: 1px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .engagement-modal__footer {
    background: #0f172a;
    border-top-color: #334155;
  }
}

.engagement-modal__note {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
  text-align: center;
}

@media (prefers-color-scheme: dark) {
  .engagement-modal__note {
    color: #94a3b8;
  }
}
</style>
