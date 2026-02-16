<script setup lang="ts">
import { computed, ref } from "vue";
import { useAuthStore } from "../pinia/stores/auth.store";
import DevicesCustomerCriteriaService, {
  type CustomerDeviceCriteria,
} from "../services/DevicesCustomerCriteriaService";

const auth = useAuthStore();
const criteria = ref<CustomerDeviceCriteria>(
  DevicesCustomerCriteriaService.load(),
);
const options = DevicesCustomerCriteriaService.options();
const statusMessage = ref("");

const currentUserEmail = computed(() => {
  const email = auth.me?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
});

const onCriteriaChange = (): void => {
  criteria.value = DevicesCustomerCriteriaService.save(criteria.value);
  statusMessage.value =
    "Critério salvo. A seção de clientes em Meus dispositivos foi atualizada.";
};
</script>

<template>
  <section class="settings-page" aria-label="Configurações">
    <header class="settings-header">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Configurações</h1>
        <p class="opacity-70">
          Defina como o dashboard identifica dispositivos de clientes.
        </p>
      </div>
    </header>

    <section
      class="card settings-card"
      aria-label="Critérios de dispositivos de clientes"
    >
      <fieldset class="settings-fieldset">
        <legend class="settings-legend">Dispositivos de clientes</legend>

        <label class="settings-field" for="customer-device-criteria">
          <span class="settings-label">Critério de identificação</span>
          <select
            id="customer-device-criteria"
            v-model="criteria"
            class="table-search-input"
            data-testid="settings-customer-device-criteria"
            @change="onCriteriaChange"
          >
            <option
              v-for="option in options"
              :key="`customer-criteria-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <p class="settings-help" aria-live="polite">
          {{ options.find((option) => option.value === criteria)?.description }}
        </p>

        <p v-if="currentUserEmail" class="settings-help">
          Usuário atual: <strong>{{ currentUserEmail }}</strong>
        </p>

        <p v-if="statusMessage" class="settings-feedback" aria-live="polite">
          {{ statusMessage }}
        </p>
      </fieldset>
    </section>
  </section>
</template>

<style scoped lang="scss">
.settings-page {
  display: grid;
  gap: 1rem;
}

.settings-card {
  padding: 1rem;
}

.settings-fieldset {
  border: 1px solid color-mix(in oklab, var(--border-1) 82%, transparent);
  border-radius: 0.75rem;
  display: grid;
  gap: 0.8rem;
  margin: 0;
  padding: 1rem;
  background: color-mix(in oklab, var(--surface-2) 35%, transparent);
}

.settings-legend {
  color: var(--text-2);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.035em;
  padding: 0 0.3rem;
  text-transform: uppercase;
}

.settings-field {
  display: grid;
  gap: 0.45rem;
}

.settings-label {
  color: var(--text-2);
  font-size: 0.74rem;
  font-weight: 700;
}

.settings-help {
  color: var(--text-2);
  font-size: 0.84rem;
  line-height: 1.35;
  margin: 0;
}

.settings-feedback {
  color: var(--text-2);
  font-size: 0.82rem;
  font-weight: 600;
  margin: 0;
}
</style>
