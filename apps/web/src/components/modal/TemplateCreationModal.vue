<script setup lang="ts">
/**
 * @component TemplateCreationModal
 * @description Modal for creating new email templates with comprehensive frontend validation
 * @version 1.4.0
 * @since 2025-02-09
 *
 * Features:
 * - HTML5 validation attributes (required, minlength, maxlength, pattern)
 * - Dynamic form state via data-* attributes
 * - Fieldset disable on validation failure
 * - Real-time validation feedback
 * - Accessibility (ARIA attributes, focus management)
 * - Security attributes for form tracking
 */
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from "vue";

/**
 * Validation constants matching backend Zod schema
 * @see /apps/api/src/common/validation/template.schema.ts
 */
const VALIDATION = {
  KEY: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 64,
    PATTERN: "^[a-zA-Z][a-zA-Z0-9_-]*$",
    PATTERN_REGEX: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 128,
  },
  DESCRIPTION: {
    MAX_LENGTH: 512,
  },
  SUBJECT: {
    MAX_LENGTH: 256,
  },
  CONTENT: {
    MAX_LENGTH: 65536,
  },
} as const;

type TemplateCategory =
  | "email"
  | "project"
  | "task"
  | "notification"
  | "report";

interface FormData {
  key: string;
  name: string;
  description: string;
  subject: string;
  content: string;
  category: TemplateCategory;
}

interface ValidationError {
  field: string;
  message: string;
}

interface Props {
  isOpen: boolean;
  clientId?: string;
  clientName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  clientId: "",
  clientName: "",
});

const emit = defineEmits<{
  close: [];
  submit: [data: FormData];
  created: [templateId: string, templateKey: string];
}>();

// Form references
const formRef = ref<HTMLFormElement | null>(null);
const fieldsetRef = ref<HTMLFieldSetElement | null>(null);
const keyInputRef = ref<HTMLInputElement | null>(null);

// Form state
const formData = ref<FormData>({
  key: "",
  name: "",
  description: "",
  subject: "",
  content: "",
  category: "email",
});

// Validation state
const validationErrors = ref<ValidationError[]>([]);
const touchedFields = ref<Set<string>>(new Set());
const isFormValid = ref(false);
const isSubmitting = ref(false);
const formBlocked = ref(false);
const submitAttempted = ref(false);

// Security tracking
const formSessionId = ref(
  `form_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
);

/**
 * DOMStringMap-compatible data attributes for form state tracking
 */
const formDataAttrs = computed(() => ({
  "data-form-id": formSessionId.value,
  "data-form-state": formBlocked.value
    ? "blocked"
    : isFormValid.value
      ? "valid"
      : "invalid",
  "data-form-touched": touchedFields.value.size > 0,
  "data-form-submitted": submitAttempted.value,
  "data-client-ref": props.clientId || "none",
  "data-validation-mode": "strict",
}));

/**
 * Data attributes for fieldset state
 */
const fieldsetDataAttrs = computed(() => ({
  "data-fieldset-state": formBlocked.value ? "disabled" : "enabled",
  "data-validation-count": validationErrors.value.length,
  "data-touched-count": touchedFields.value.size,
}));

/**
 * Generate input-specific data attributes
 */
const getInputDataAttrs = (fieldName: string) => ({
  "data-field-name": fieldName,
  "data-field-touched": touchedFields.value.has(fieldName),
  "data-field-valid": !validationErrors.value.some(
    (e) => e.field === fieldName,
  ),
  "data-field-error":
    validationErrors.value.find((e) => e.field === fieldName)?.message || "",
});

/**
 * Validate a single field
 */
const validateField = (field: keyof FormData): ValidationError | null => {
  const value = formData.value[field];

  switch (field) {
    case "key": {
      if (!value || value.trim().length === 0) {
        return { field: "key", message: "Chave é obrigatória" };
      }
      if (value.trim().length < VALIDATION.KEY.MIN_LENGTH) {
        return {
          field: "key",
          message: `Chave deve ter no mínimo ${VALIDATION.KEY.MIN_LENGTH} caracteres`,
        };
      }
      if (value.trim().length > VALIDATION.KEY.MAX_LENGTH) {
        return {
          field: "key",
          message: `Chave deve ter no máximo ${VALIDATION.KEY.MAX_LENGTH} caracteres`,
        };
      }
      if (!VALIDATION.KEY.PATTERN_REGEX.test(value.trim())) {
        return {
          field: "key",
          message:
            "Chave deve começar com letra e conter apenas letras, números, underscores ou hífens",
        };
      }
      break;
    }
    case "name": {
      if (!value || value.trim().length === 0) {
        return { field: "name", message: "Nome é obrigatório" };
      }
      if (value.trim().length < VALIDATION.NAME.MIN_LENGTH) {
        return {
          field: "name",
          message: `Nome deve ter no mínimo ${VALIDATION.NAME.MIN_LENGTH} caracteres`,
        };
      }
      if (value.trim().length > VALIDATION.NAME.MAX_LENGTH) {
        return {
          field: "name",
          message: `Nome deve ter no máximo ${VALIDATION.NAME.MAX_LENGTH} caracteres`,
        };
      }
      break;
    }
    case "description": {
      if (value && value.length > VALIDATION.DESCRIPTION.MAX_LENGTH) {
        return {
          field: "description",
          message: `Descrição deve ter no máximo ${VALIDATION.DESCRIPTION.MAX_LENGTH} caracteres`,
        };
      }
      break;
    }
    case "subject": {
      if (value && value.length > VALIDATION.SUBJECT.MAX_LENGTH) {
        return {
          field: "subject",
          message: `Assunto deve ter no máximo ${VALIDATION.SUBJECT.MAX_LENGTH} caracteres`,
        };
      }
      break;
    }
    case "content": {
      if (!value || value.trim().length === 0) {
        return { field: "content", message: "Conteúdo é obrigatório" };
      }
      if (value.length > VALIDATION.CONTENT.MAX_LENGTH) {
        return {
          field: "content",
          message: `Conteúdo deve ter no máximo ${VALIDATION.CONTENT.MAX_LENGTH} caracteres`,
        };
      }
      break;
    }
    case "category": {
      const validCategories: TemplateCategory[] = [
        "email",
        "project",
        "task",
        "notification",
        "report",
      ];
      if (!validCategories.includes(value as TemplateCategory)) {
        return { field: "category", message: "Categoria inválida" };
      }
      break;
    }
  }
  return null;
};

/**
 * Validate entire form
 */
const validateForm = (): boolean => {
  const errors: ValidationError[] = [];
  const fields: (keyof FormData)[] = [
    "key",
    "name",
    "description",
    "subject",
    "content",
    "category",
  ];

  for (const field of fields) {
    const error = validateField(field);
    if (error) {
      errors.push(error);
    }
  }

  validationErrors.value = errors;
  isFormValid.value = errors.length === 0;

  // Block form if there are errors and user has attempted to submit
  if (submitAttempted.value && errors.length > 0) {
    blockForm();
  } else if (errors.length === 0) {
    unblockForm();
  }

  return isFormValid.value;
};

/**
 * Block form and disable fieldset when validation fails
 */
const blockForm = () => {
  formBlocked.value = true;
  if (fieldsetRef.value) {
    fieldsetRef.value.disabled = true;
  }

  // Re-enable after a short delay to allow user to see errors
  setTimeout(() => {
    unblockForm();
    // Focus on first field with error
    const firstError = validationErrors.value[0];
    if (firstError) {
      const input = formRef.value?.querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >(`[name="${firstError.field}"]`);
      input?.focus();
    }
  }, 1500);
};

/**
 * Unblock form and enable fieldset
 */
const unblockForm = () => {
  formBlocked.value = false;
  if (fieldsetRef.value) {
    fieldsetRef.value.disabled = false;
  }
};

/**
 * Handle field blur - mark as touched and validate
 */
const handleFieldBlur = (field: keyof FormData) => {
  touchedFields.value.add(field);
  validateForm();
};

/**
 * Handle field input - validate in real-time if touched
 */
const handleFieldInput = (field: keyof FormData) => {
  if (touchedFields.value.has(field) || submitAttempted.value) {
    validateForm();
  }
};

/**
 * Get error for a specific field
 */
const getFieldError = (field: string): string | undefined => {
  if (!touchedFields.value.has(field) && !submitAttempted.value) {
    return undefined;
  }
  return validationErrors.value.find((e) => e.field === field)?.message;
};

/**
 * Check if field has error (for CSS styling)
 */
const hasFieldError = (field: string): boolean => {
  return (
    (touchedFields.value.has(field) || submitAttempted.value) &&
    validationErrors.value.some((e) => e.field === field)
  );
};

/**
 * Handle form submission
 */
const handleSubmit = async (event: Event) => {
  event.preventDefault();
  submitAttempted.value = true;

  // Mark all fields as touched
  Object.keys(formData.value).forEach((field) => {
    touchedFields.value.add(field);
  });

  // Validate form
  if (!validateForm()) {
    blockForm();
    return;
  }

  // Emit submit event with sanitized data
  isSubmitting.value = true;

  try {
    emit("submit", {
      ...formData.value,
      key: formData.value.key.trim().toLowerCase(),
      name: formData.value.name.trim(),
      description: formData.value.description.trim(),
      subject: formData.value.subject.trim(),
      content: formData.value.content,
    });
  } finally {
    isSubmitting.value = false;
  }
};

/**
 * Reset form state
 */
const resetForm = () => {
  formData.value = {
    key: "",
    name: "",
    description: "",
    subject: "",
    content: "",
    category: "email",
  };
  validationErrors.value = [];
  touchedFields.value.clear();
  isFormValid.value = false;
  submitAttempted.value = false;
  formBlocked.value = false;
  formSessionId.value = `form_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Handle modal close
 */
const handleClose = () => {
  if (isSubmitting.value) return;
  resetForm();
  emit("close");
};

/**
 * Handle escape key
 */
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && !isSubmitting.value) {
    handleClose();
  }
};

/**
 * Focus trap for accessibility
 */
const focusTrap = (event: KeyboardEvent) => {
  if (event.key !== "Tab" || !formRef.value) return;

  const focusableElements = formRef.value.querySelectorAll<HTMLElement>(
    "input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])",
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement?.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement?.focus();
  }
};

// Watch for modal open to focus first input
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        keyInputRef.value?.focus();
      });
      document.addEventListener("keydown", handleKeydown);
      document.addEventListener("keydown", focusTrap);
    } else {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("keydown", focusTrap);
    }
  },
);

// Cleanup listeners on unmount
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.removeEventListener("keydown", focusTrap);
});

// Character count helpers
const keyCharCount = computed(() => formData.value.key.length);
const nameCharCount = computed(() => formData.value.name.length);
const descriptionCharCount = computed(() => formData.value.description.length);
const subjectCharCount = computed(() => formData.value.subject.length);
const contentCharCount = computed(() => formData.value.content.length);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
        aria-describedby="template-modal-description"
        @click.self="handleClose"
      >
        <div
          class="modal-container"
          data-modal="template-creation"
          :data-client-id="clientId"
        >
          <!-- Modal Header -->
          <header class="modal-header">
            <div class="modal-title-group">
              <h2 id="template-modal-title" class="modal-title">
                ✉️ Criar Novo Template
              </h2>
              <p
                v-if="clientName"
                id="template-modal-description"
                class="modal-subtitle"
              >
                Para: <strong>{{ clientName }}</strong>
              </p>
            </div>
            <button
              type="button"
              class="btn-modal-close"
              :disabled="isSubmitting"
              title="Fechar modal"
              aria-label="Fechar modal"
              @click="handleClose"
            >
              ×
            </button>
          </header>

          <!-- Form -->
          <form
            ref="formRef"
            v-bind="formDataAttrs"
            class="template-form"
            :class="{
              'form--blocked': formBlocked,
              'form--invalid': !isFormValid && submitAttempted,
            }"
            novalidate
            autocomplete="off"
            @submit="handleSubmit"
          >
            <fieldset
              ref="fieldsetRef"
              v-bind="fieldsetDataAttrs"
              class="form-fieldset"
              :disabled="formBlocked || isSubmitting"
            >
              <legend class="sr-only">Dados do Template</legend>

              <!-- Validation Summary -->
              <Transition name="slide-down">
                <div
                  v-if="validationErrors.length > 0 && submitAttempted"
                  class="validation-summary"
                  role="alert"
                  aria-live="polite"
                >
                  <p class="validation-summary-title">
                    ⚠️ Por favor, corrija os seguintes erros:
                  </p>
                  <ul class="validation-summary-list">
                    <li
                      v-for="error in validationErrors"
                      :key="error.field"
                      class="validation-summary-item"
                    >
                      {{ error.message }}
                    </li>
                  </ul>
                </div>
              </Transition>

              <!-- Key Field -->
              <div
                class="form-group"
                :class="{ 'form-group--error': hasFieldError('key') }"
              >
                <label for="template-key" class="form-label">
                  Chave do Template
                  <span class="required-indicator" aria-hidden="true">*</span>
                </label>
                <div class="input-wrapper">
                  <input
                    id="template-key"
                    ref="keyInputRef"
                    v-model="formData.key"
                    v-bind="getInputDataAttrs('key')"
                    type="text"
                    name="key"
                    class="form-input"
                    :class="{ 'input--error': hasFieldError('key') }"
                    placeholder="ex: proposta_comercial"
                    required
                    :minlength="VALIDATION.KEY.MIN_LENGTH"
                    :maxlength="VALIDATION.KEY.MAX_LENGTH"
                    :pattern="VALIDATION.KEY.PATTERN"
                    autocomplete="off"
                    spellcheck="false"
                    aria-required="true"
                    :aria-invalid="hasFieldError('key')"
                    :aria-describedby="
                      hasFieldError('key') ? 'key-error' : 'key-help'
                    "
                    @blur="handleFieldBlur('key')"
                    @input="handleFieldInput('key')"
                  />
                  <span
                    class="char-count"
                    :class="{
                      'char-count--warning':
                        keyCharCount > VALIDATION.KEY.MAX_LENGTH * 0.9,
                    }"
                  >
                    {{ keyCharCount }}/{{ VALIDATION.KEY.MAX_LENGTH }}
                  </span>
                </div>
                <p id="key-help" class="form-help">
                  Identificador único. Apenas letras, números, underscores e
                  hífens.
                </p>
                <Transition name="fade">
                  <p
                    v-if="hasFieldError('key')"
                    id="key-error"
                    class="form-error"
                    role="alert"
                  >
                    {{ getFieldError("key") }}
                  </p>
                </Transition>
              </div>

              <!-- Name Field -->
              <div
                class="form-group"
                :class="{ 'form-group--error': hasFieldError('name') }"
              >
                <label for="template-name" class="form-label">
                  Nome do Template
                  <span class="required-indicator" aria-hidden="true">*</span>
                </label>
                <div class="input-wrapper">
                  <input
                    id="template-name"
                    v-model="formData.name"
                    v-bind="getInputDataAttrs('name')"
                    type="text"
                    name="name"
                    class="form-input"
                    :class="{ 'input--error': hasFieldError('name') }"
                    placeholder="ex: Proposta Comercial Padrão"
                    required
                    :minlength="VALIDATION.NAME.MIN_LENGTH"
                    :maxlength="VALIDATION.NAME.MAX_LENGTH"
                    autocomplete="off"
                    spellcheck="true"
                    aria-required="true"
                    :aria-invalid="hasFieldError('name')"
                    :aria-describedby="
                      hasFieldError('name') ? 'name-error' : 'name-help'
                    "
                    @blur="handleFieldBlur('name')"
                    @input="handleFieldInput('name')"
                  />
                  <span
                    class="char-count"
                    :class="{
                      'char-count--warning':
                        nameCharCount > VALIDATION.NAME.MAX_LENGTH * 0.9,
                    }"
                  >
                    {{ nameCharCount }}/{{ VALIDATION.NAME.MAX_LENGTH }}
                  </span>
                </div>
                <p id="name-help" class="form-help">
                  Nome descritivo para identificação do template.
                </p>
                <Transition name="fade">
                  <p
                    v-if="hasFieldError('name')"
                    id="name-error"
                    class="form-error"
                    role="alert"
                  >
                    {{ getFieldError("name") }}
                  </p>
                </Transition>
              </div>

              <!-- Category Field -->
              <div
                class="form-group"
                :class="{ 'form-group--error': hasFieldError('category') }"
              >
                <label for="template-category" class="form-label">
                  Categoria
                  <span class="required-indicator" aria-hidden="true">*</span>
                </label>
                <select
                  id="template-category"
                  v-model="formData.category"
                  v-bind="getInputDataAttrs('category')"
                  name="category"
                  class="form-select"
                  :class="{ 'input--error': hasFieldError('category') }"
                  required
                  aria-required="true"
                  :aria-invalid="hasFieldError('category')"
                  :aria-describedby="
                    hasFieldError('category')
                      ? 'category-error'
                      : 'category-help'
                  "
                  @blur="handleFieldBlur('category')"
                  @change="handleFieldInput('category')"
                >
                  <option value="email">📧 Email</option>
                  <option value="project">📁 Projeto</option>
                  <option value="task">✅ Tarefa</option>
                  <option value="notification">🔔 Notificação</option>
                  <option value="report">📊 Relatório</option>
                </select>
                <p id="category-help" class="form-help">
                  Tipo de template para organização.
                </p>
                <Transition name="fade">
                  <p
                    v-if="hasFieldError('category')"
                    id="category-error"
                    class="form-error"
                    role="alert"
                  >
                    {{ getFieldError("category") }}
                  </p>
                </Transition>
              </div>

              <!-- Subject Field (for email templates) -->
              <Transition name="slide-down">
                <div
                  v-if="formData.category === 'email'"
                  class="form-group"
                  :class="{ 'form-group--error': hasFieldError('subject') }"
                >
                  <label for="template-subject" class="form-label">
                    Assunto do Email
                  </label>
                  <div class="input-wrapper">
                    <input
                      id="template-subject"
                      v-model="formData.subject"
                      v-bind="getInputDataAttrs('subject')"
                      type="text"
                      name="subject"
                      class="form-input"
                      :class="{ 'input--error': hasFieldError('subject') }"
                      placeholder="ex: Proposta Comercial - [Nome do Cliente]"
                      :maxlength="VALIDATION.SUBJECT.MAX_LENGTH"
                      autocomplete="off"
                      spellcheck="true"
                      :aria-invalid="hasFieldError('subject')"
                      :aria-describedby="
                        hasFieldError('subject')
                          ? 'subject-error'
                          : 'subject-help'
                      "
                      @blur="handleFieldBlur('subject')"
                      @input="handleFieldInput('subject')"
                    />
                    <span
                      class="char-count"
                      :class="{
                        'char-count--warning':
                          subjectCharCount >
                          VALIDATION.SUBJECT.MAX_LENGTH * 0.9,
                      }"
                    >
                      {{ subjectCharCount }}/{{ VALIDATION.SUBJECT.MAX_LENGTH }}
                    </span>
                  </div>
                  <p id="subject-help" class="form-help">
                    Linha de assunto para emails gerados com este template.
                  </p>
                  <Transition name="fade">
                    <p
                      v-if="hasFieldError('subject')"
                      id="subject-error"
                      class="form-error"
                      role="alert"
                    >
                      {{ getFieldError("subject") }}
                    </p>
                  </Transition>
                </div>
              </Transition>

              <!-- Description Field -->
              <div
                class="form-group"
                :class="{ 'form-group--error': hasFieldError('description') }"
              >
                <label for="template-description" class="form-label">
                  Descrição
                </label>
                <div class="input-wrapper">
                  <textarea
                    id="template-description"
                    v-model="formData.description"
                    v-bind="getInputDataAttrs('description')"
                    name="description"
                    class="form-textarea"
                    :class="{ 'input--error': hasFieldError('description') }"
                    placeholder="Descreva quando usar este template..."
                    rows="2"
                    :maxlength="VALIDATION.DESCRIPTION.MAX_LENGTH"
                    spellcheck="true"
                    :aria-invalid="hasFieldError('description')"
                    :aria-describedby="
                      hasFieldError('description')
                        ? 'description-error'
                        : 'description-help'
                    "
                    @blur="handleFieldBlur('description')"
                    @input="handleFieldInput('description')"
                  ></textarea>
                  <span
                    class="char-count char-count--textarea"
                    :class="{
                      'char-count--warning':
                        descriptionCharCount >
                        VALIDATION.DESCRIPTION.MAX_LENGTH * 0.9,
                    }"
                  >
                    {{ descriptionCharCount }}/{{
                      VALIDATION.DESCRIPTION.MAX_LENGTH
                    }}
                  </span>
                </div>
                <p id="description-help" class="form-help">
                  Descrição opcional do propósito do template.
                </p>
                <Transition name="fade">
                  <p
                    v-if="hasFieldError('description')"
                    id="description-error"
                    class="form-error"
                    role="alert"
                  >
                    {{ getFieldError("description") }}
                  </p>
                </Transition>
              </div>

              <!-- Content Field -->
              <div
                class="form-group form-group--large"
                :class="{ 'form-group--error': hasFieldError('content') }"
              >
                <label for="template-content" class="form-label">
                  Conteúdo do Template
                  <span class="required-indicator" aria-hidden="true">*</span>
                </label>
                <div class="input-wrapper">
                  <textarea
                    id="template-content"
                    v-model="formData.content"
                    v-bind="getInputDataAttrs('content')"
                    name="content"
                    class="form-textarea form-textarea--large"
                    :class="{ 'input--error': hasFieldError('content') }"
                    placeholder="<p>Prezado(a) [Nome],</p>&#10;&#10;<p>Segue a proposta conforme conversado...</p>"
                    rows="10"
                    required
                    :maxlength="VALIDATION.CONTENT.MAX_LENGTH"
                    spellcheck="true"
                    aria-required="true"
                    :aria-invalid="hasFieldError('content')"
                    :aria-describedby="
                      hasFieldError('content')
                        ? 'content-error'
                        : 'content-help'
                    "
                    @blur="handleFieldBlur('content')"
                    @input="handleFieldInput('content')"
                  ></textarea>
                  <span
                    class="char-count char-count--textarea"
                    :class="{
                      'char-count--warning':
                        contentCharCount > VALIDATION.CONTENT.MAX_LENGTH * 0.9,
                    }"
                  >
                    {{ contentCharCount.toLocaleString("pt-BR") }}/{{
                      VALIDATION.CONTENT.MAX_LENGTH.toLocaleString("pt-BR")
                    }}
                  </span>
                </div>
                <p id="content-help" class="form-help">
                  Conteúdo HTML do template. Tags seguras são permitidas (p, br,
                  b, i, a, ul, ol, li, h1-h6, etc.)
                </p>
                <Transition name="fade">
                  <p
                    v-if="hasFieldError('content')"
                    id="content-error"
                    class="form-error"
                    role="alert"
                  >
                    {{ getFieldError("content") }}
                  </p>
                </Transition>
              </div>
            </fieldset>

            <!-- Form Actions -->
            <div class="form-actions">
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="isSubmitting"
                @click="handleClose"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isSubmitting || formBlocked"
                :data-submitting="isSubmitting"
              >
                <span
                  v-if="isSubmitting"
                  class="btn-spinner"
                  aria-hidden="true"
                ></span>
                {{ isSubmitting ? "Salvando..." : "Criar Template" }}
              </button>
            </div>

            <!-- Form Blocking Overlay -->
            <Transition name="fade">
              <div
                v-if="formBlocked"
                class="form-block-overlay"
                aria-live="assertive"
              >
                <div class="block-message">
                  <span class="block-icon" aria-hidden="true">⚠️</span>
                  <p>Formulário bloqueado temporariamente.</p>
                  <p class="block-submessage">
                    Por favor, corrija os erros acima.
                  </p>
                </div>
              </div>
            </Transition>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
}

/* Modal Container */
.modal-container {
  background: var(--color-bg-primary, #ffffff);
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-bg-secondary, #f9fafb);
}

.modal-title-group {
  flex: 1;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

.modal-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.btn-modal-close {
  padding: 0.25rem 0.5rem;
  font-size: 1.5rem;
  line-height: 1;
  background: transparent;
  border: none;
  color: var(--color-text-tertiary, #9ca3af);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.btn-modal-close:hover:not(:disabled) {
  background: var(--color-bg-hover, #f3f4f6);
  color: var(--color-text-primary, #111827);
}

.btn-modal-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Form */
.template-form {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.template-form.form--blocked {
  pointer-events: none;
}

.form-fieldset {
  border: none;
  margin: 0;
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.form-fieldset:disabled {
  opacity: 0.6;
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Validation Summary */
.validation-summary {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.validation-summary-title {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #dc2626;
}

.validation-summary-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  color: #b91c1c;
}

.validation-summary-item {
  margin: 0.25rem 0;
}

/* Form Group */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group--error .form-label {
  color: #dc2626;
}

.form-group--large {
  margin-bottom: 1.5rem;
}

/* Form Label */
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary, #374151);
}

.required-indicator {
  color: #dc2626;
  margin-left: 0.125rem;
}

/* Input Wrapper */
.input-wrapper {
  position: relative;
}

/* Form Input */
.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-text-primary, #111827);
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  transition: all 0.15s ease;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-input.input--error,
.form-textarea.input--error,
.form-select.input--error {
  border-color: #dc2626;
  background: #fef2f2;
}

.form-input.input--error:focus,
.form-textarea.input--error:focus,
.form-select.input--error:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-textarea--large {
  min-height: 200px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

/* Character Count */
.char-count {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--color-text-tertiary, #9ca3af);
  pointer-events: none;
}

.char-count--textarea {
  top: auto;
  bottom: 0.5rem;
  transform: none;
}

.char-count--warning {
  color: #d97706;
}

/* Form Help */
.form-help {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-tertiary, #6b7280);
}

/* Form Error */
.form-error {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  color: #dc2626;
  font-weight: 500;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-bg-secondary, #f9fafb);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: #ffffff;
  border: 1px solid #3b82f6;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-secondary {
  background: var(--color-bg-primary, #ffffff);
  color: var(--color-text-secondary, #374151);
  border: 1px solid var(--color-border, #d1d5db);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-hover, #f3f4f6);
}

/* Button Spinner */
.btn-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Form Block Overlay */
.form-block-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.block-message {
  text-align: center;
  padding: 2rem;
}

.block-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.75rem;
}

.block-message p {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text-primary, #374151);
  font-weight: 500;
}

.block-submessage {
  font-size: 0.875rem !important;
  color: var(--color-text-secondary, #6b7280) !important;
  font-weight: 400 !important;
  margin-top: 0.25rem !important;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.95);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .modal-container {
    --color-bg-primary: #1f2937;
    --color-bg-secondary: #111827;
    --color-bg-hover: #374151;
    --color-text-primary: #f9fafb;
    --color-text-secondary: #d1d5db;
    --color-text-tertiary: #9ca3af;
    --color-border: #374151;
  }

  .validation-summary {
    background: #450a0a;
    border-color: #7f1d1d;
  }

  .validation-summary-title {
    color: #fca5a5;
  }

  .validation-summary-list {
    color: #fecaca;
  }

  .form-input.input--error,
  .form-textarea.input--error,
  .form-select.input--error {
    background: #450a0a;
  }

  .form-block-overlay {
    background: rgba(17, 24, 39, 0.9);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .modal-container {
    max-height: 95vh;
    border-radius: 8px;
  }

  .modal-header {
    padding: 1rem;
  }

  .form-fieldset {
    padding: 1rem;
  }

  .form-actions {
    padding: 0.75rem 1rem;
    flex-direction: column-reverse;
  }

  .btn {
    width: 100%;
  }
}
</style>
