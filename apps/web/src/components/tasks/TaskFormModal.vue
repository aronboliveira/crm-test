<script setup lang="ts">
import { useTaskFormModal } from "../../assets/scripts/tasks/useTaskFormModal";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "created"): void;
}>();

const { formId, form, canSave, close, submit } = useTaskFormModal(props, emit);
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop"
    role="presentation"
    @click.self="close"
  >
    <div
      ref="dialogEl"
      class="modal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`${formId}-title`"
      tabindex="-1"
    >
      <div class="modal-head">
        <h3 :id="`${formId}-title`" class="modal-title">Nova tarefa</h3>
        <button
          class="btn btn-ghost"
          type="button"
          aria-label="Fechar"
          @click="close"
        >
          ×
        </button>
      </div>

      <form
        :id="formId"
        class="modal-body"
        @submit.prevent="submit"
        aria-label="Formulário de criação de tarefa"
      >
        <label class="field">
          <span class="field-label">Título</span>
          <input
            class="field-input"
            name="title"
            type="text"
            autocomplete="off"
            required
            minlength="3"
            v-model="form.title"
            aria-required="true"
          />
        </label>

        <label class="field">
          <span class="field-label">Descrição</span>
          <textarea
            class="field-input"
            name="description"
            rows="3"
            v-model="form.description"
          ></textarea>
        </label>

        <label class="field">
          <span class="field-label">Prioridade</span>
          <input
            class="field-input"
            name="priority"
            type="range"
            min="1"
            max="5"
            v-model.number="form.priority"
          />
        </label>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="close">
            Cancelar
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="!canSave"
            :aria-disabled="!canSave"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
