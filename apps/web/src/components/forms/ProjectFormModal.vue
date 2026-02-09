<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted, watch } from "vue";
import { z } from "zod";
import DOMPurify from "dompurify";
import type {
  ProjectRow,
  ProjectStatus,
} from "../../pinia/types/projects.types";
import ApiClientService from "../../services/ApiClientService";
import AlertService from "../../services/AlertService";
import SmartAutocompleteService from "../../services/SmartAutocompleteService";

const TagPicker = defineAsyncComponent(() => import("../ui/TagPicker.vue"));

interface Props {
  project?: ProjectRow;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", project: ProjectRow): void;
}>();

const isEditing = computed(() => !!props.project);
const busy = ref(false);

// Templates
const templates = ref<{ key: string; name: string }[]>([]);

// All available tag labels for datalist
const allTagLabels = ref<string[]>([]);

// Smart autocomplete
const nameAutocomplete = new SmartAutocompleteService("project-name");
const nameSuggestions = ref<string[]>([]);
const showSuggestions = ref(false);

// Form state
const name = ref(props.project?.name ?? "");
const code = ref(props.project?.code ?? "");
const status = ref<ProjectStatus>(props.project?.status ?? "planned");
const dueAt = ref(props.project?.dueAt?.split("T")[0] ?? "");
const deadlineAt = ref((props.project as any)?.deadlineAt?.split("T")[0] ?? "");
const tags = ref<string[]>((props.project as any)?.tags ?? []);
const templateKey = ref((props.project as any)?.templateKey ?? "");

// Code validation state
const codeError = ref("");
const codeChecking = ref(false);
const codeValid = ref(false);

// Date validation
const dateError = ref("");

onMounted(async () => {
  try {
    const [tplRes, tagRes] = await Promise.all([
      ApiClientService.templates.list().catch(() => ({ data: [] })),
      ApiClientService.tags.list().catch(() => []),
    ]);
    templates.value = ((tplRes as any).data ?? tplRes ?? []).map((t: any) => ({
      key: t.key,
      name: t.name,
    }));
    const tagArr = Array.isArray(tagRes)
      ? tagRes
      : ((tagRes as any)?.data ?? []);
    allTagLabels.value = tagArr
      .map((t: any) => t.label || t.key || "")
      .filter(Boolean);
  } catch {
    templates.value = [];
    allTagLabels.value = [];
  }
});

const onNameInput = () => {
  const v = name.value.trim();
  if (v.length >= 2) {
    nameSuggestions.value = nameAutocomplete.suggest(v, 5);
    showSuggestions.value = nameSuggestions.value.length > 0;
  } else {
    showSuggestions.value = false;
  }
};

const pickSuggestion = (s: string) => {
  name.value = s;
  showSuggestions.value = false;
};

// Validate code format client-side
const CODE_RE = /^[A-Z0-9_-]+$/i;

const validateCode = () => {
  const v = code.value.trim();
  if (!v) {
    codeError.value = "Código é obrigatório";
    codeValid.value = false;
    return;
  }
  if (v.length < 2) {
    codeError.value = "Código deve ter ao menos 2 caracteres";
    codeValid.value = false;
    return;
  }
  if (v.length > 20) {
    codeError.value = "Código deve ter no máximo 20 caracteres";
    codeValid.value = false;
    return;
  }
  if (!CODE_RE.test(v)) {
    codeError.value = "Apenas letras, números, hifens e underscores";
    codeValid.value = false;
    return;
  }
  codeError.value = "";
  codeValid.value = true;
};

// Check if code already exists in DB (debounced)
let codeCheckTimer: ReturnType<typeof setTimeout> | null = null;
const checkCodeExists = async () => {
  validateCode();
  if (codeError.value) return;
  const upperCode = code.value.trim().toUpperCase();
  // Skip check when editing the same project
  if (isEditing.value && props.project?.code?.toUpperCase() === upperCode) {
    codeValid.value = true;
    return;
  }
  codeChecking.value = true;
  try {
    const res = await ApiClientService.projects.list();
    const items: any[] = Array.isArray(res) ? res : ((res as any)?.data ?? []);
    const existing = items.find(
      (p: any) => (p.code || "").toUpperCase() === upperCode,
    );
    if (existing) {
      codeError.value = `Código "${upperCode}" já existe. Deseja editar o projeto existente?`;
      codeValid.value = false;
    } else {
      codeValid.value = true;
    }
  } catch {
    // Network error, allow submission anyway
    codeValid.value = true;
  } finally {
    codeChecking.value = false;
  }
};

const onCodeInput = () => {
  validateCode();
  if (codeCheckTimer) clearTimeout(codeCheckTimer);
  if (!codeError.value) {
    codeCheckTimer = setTimeout(checkCodeExists, 600);
  }
};

// Date validation
const validateDates = () => {
  if (dueAt.value && deadlineAt.value && dueAt.value > deadlineAt.value) {
    dateError.value = "A data de entrega não pode ser após o prazo final";
  } else {
    dateError.value = "";
  }
};

watch([dueAt, deadlineAt], validateDates);

// Zod schema for validation
const projectSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter ao menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  code: z
    .string()
    .min(2, "Código deve ter ao menos 2 caracteres")
    .max(20, "Código deve ter no máximo 20 caracteres")
    .regex(
      /^[A-Z0-9_-]+$/i,
      "Código deve conter apenas letras, números, hifens e underscores",
    ),
  status: z.enum(["planned", "active", "blocked", "done", "archived"]),
  dueAt: z.string().optional(),
  deadlineAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  templateKey: z.string().optional(),
});

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "planned", label: "Planejado" },
  { value: "active", label: "Ativo" },
  { value: "blocked", label: "Bloqueado" },
  { value: "done", label: "Concluído" },
  { value: "archived", label: "Arquivado" },
];

const sanitize = (input: string): string => {
  return DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [] });
};

// Form validity computed
const formValid = computed(() => {
  return (
    name.value.trim().length >= 2 &&
    code.value.trim().length >= 2 &&
    CODE_RE.test(code.value.trim()) &&
    !codeError.value &&
    !dateError.value &&
    !codeChecking.value
  );
});

const handleSubmit = async () => {
  if (busy.value || !formValid.value) return;

  busy.value = true;
  try {
    // Sanitize inputs
    const sanitizedData = {
      name: sanitize(name.value),
      code: sanitize(code.value).toUpperCase(),
      status: status.value,
      dueAt: dueAt.value || undefined,
      deadlineAt: deadlineAt.value || undefined,
      tags: tags.value.length ? tags.value : undefined,
      templateKey: templateKey.value || undefined,
    };

    // Validate with Zod
    const result = projectSchema.safeParse(sanitizedData);
    if (!result.success) {
      const firstError = (result.error as any).errors?.[0] ?? {
        message: "Falha na validação",
      };
      await AlertService.error("Erro de Validação", firstError.message);
      return;
    }

    // Date consistency check
    if (
      result.data.dueAt &&
      result.data.deadlineAt &&
      result.data.dueAt > result.data.deadlineAt
    ) {
      await AlertService.error(
        "Erro de Data",
        "A data de entrega não pode ser após o prazo final.",
      );
      return;
    }

    if (isEditing.value && props.project?.id) {
      await ApiClientService.projects.update(props.project.id, result.data);
    } else {
      await ApiClientService.projects.create(result.data);
    }

    // Commit name to autocomplete history
    nameAutocomplete.commit(result.data.name);

    const projectData: ProjectRow = {
      id: props.project?.id ?? crypto.randomUUID(),
      ...result.data,
      dueAt: result.data.dueAt ?? null,
      deadlineAt: result.data.deadlineAt ?? null,
      tags: result.data.tags ?? [],
      templateKey: result.data.templateKey ?? null,
      ownerEmail: props.project?.ownerEmail ?? "",
      createdAt: props.project?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await AlertService.success(
      isEditing.value ? "Projeto Atualizado" : "Projeto Criado",
      `"${projectData.name}" foi ${isEditing.value ? "atualizado" : "criado"} com sucesso.`,
    );

    emit("confirm", projectData);
    emit("close");
  } catch (e) {
    console.error("[ProjectFormModal] Submit failed:", e);
    await AlertService.error("Erro", e);
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <form class="project-form" novalidate @submit.prevent="handleSubmit">
    <div class="form-field" style="position: relative">
      <label class="form-label" for="project-name">Nome do Projeto</label>
      <input
        id="project-name"
        v-model="name"
        class="form-input"
        type="text"
        placeholder="Meu Projeto Incrível"
        required
        minlength="2"
        maxlength="100"
        autocomplete="off"
        @input="onNameInput"
        @blur="showSuggestions = false"
      />
      <ul v-if="showSuggestions" class="autocomplete-list" role="listbox">
        <li
          v-for="s in nameSuggestions"
          :key="s"
          class="autocomplete-item"
          role="option"
          @mousedown.prevent="pickSuggestion(s)"
        >
          {{ s }}
        </li>
      </ul>
    </div>

    <div class="form-field">
      <label class="form-label" for="project-code">Código do Projeto</label>
      <input
        id="project-code"
        v-model="code"
        class="form-input"
        :class="{
          'form-input--error': codeError,
          'form-input--valid':
            codeValid && !codeError && code.trim().length >= 2,
        }"
        type="text"
        placeholder="PROJ-001"
        required
        minlength="2"
        maxlength="20"
        autocomplete="off"
        @input="onCodeInput"
        @blur="checkCodeExists"
      />
      <span v-if="codeChecking" class="form-hint form-hint--info">
        Verificando código...
      </span>
      <span v-else-if="codeError" class="form-hint form-hint--error">
        {{ codeError }}
      </span>
      <span
        v-else-if="codeValid && code.trim().length >= 2"
        class="form-hint form-hint--success"
      >
        Código disponível ✓
      </span>
      <span v-else class="form-hint"
        >Apenas letras, números, hifens e underscores</span
      >
    </div>

    <div class="form-field">
      <label class="form-label" for="project-status">Status</label>
      <select id="project-status" v-model="status" class="form-select">
        <option
          v-for="opt in statusOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
    </div>

    <div class="form-field" v-if="templates.length && !isEditing">
      <label class="form-label" for="project-template">Modelo</label>
      <select id="project-template" v-model="templateKey" class="form-select">
        <option value="">Nenhum</option>
        <option v-for="t in templates" :key="t.key" :value="t.key">
          {{ t.name }}
        </option>
      </select>
      <span class="form-hint">Preenche o projeto a partir de um modelo</span>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label class="form-label" for="project-due">Data de Entrega</label>
        <input
          id="project-due"
          v-model="dueAt"
          class="form-input"
          type="date"
        />
      </div>

      <div class="form-field">
        <label class="form-label" for="project-deadline">Prazo Final</label>
        <input
          id="project-deadline"
          v-model="deadlineAt"
          class="form-input"
          type="date"
        />
      </div>
    </div>
    <span v-if="dateError" class="form-hint form-hint--error">{{
      dateError
    }}</span>

    <div class="form-field">
      <label class="form-label">Tags</label>
      <TagPicker v-model="tags" />
      <datalist id="tag-suggestions">
        <option v-for="t in allTagLabels" :key="t" :value="t" />
      </datalist>
    </div>

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
              ? "Atualizar Projeto"
              : "Criar Projeto"
        }}
      </button>
    </div>
  </form>
</template>

<style scoped lang="scss">
.project-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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
.form-select {
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
}

.form-select {
  cursor: pointer;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.form-hint--error {
  color: var(--danger, #ef4444);
  font-weight: 600;
}

.form-hint--success {
  color: var(--success, #16a34a);
  font-weight: 600;
}

.form-hint--info {
  color: var(--info, #0ea5e9);
  font-style: italic;
}

.form-input--error {
  border-color: var(--danger, #ef4444) !important;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.18);
}

.form-input--valid {
  border-color: var(--success, #16a34a) !important;
  box-shadow: 0 0 0 2px rgba(22, 163, 106, 0.15);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-1);
}

.autocomplete-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
  background: var(--surface-2, #1e1e2e);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 12px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  max-height: 180px;
  overflow-y: auto;
}

.autocomplete-item {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;

  &:hover {
    background: var(--primary, #6366f1);
    color: #fff;
  }
}
</style>
