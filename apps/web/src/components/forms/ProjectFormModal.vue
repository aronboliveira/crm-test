<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted } from "vue";
import { z } from "zod";
import DOMPurify from "dompurify";
import type {
  ProjectRow,
  ProjectStatus,
} from "../../pinia/types/projects.types";
import { useProjectsStore } from "../../pinia/stores/projects.store";
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

const _projectsStore = useProjectsStore();
const isEditing = computed(() => !!props.project);
const busy = ref(false);

// Templates
const templates = ref<{ key: string; name: string }[]>([]);

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

onMounted(async () => {
  try {
    const res = await ApiClientService.templates.list();
    templates.value = (res.data ?? []).map((t: any) => ({
      key: t.key,
      name: t.name,
    }));
  } catch {
    templates.value = [];
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

// Zod schema for validation
const projectSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be less than 20 characters")
    .regex(
      /^[A-Z0-9_-]+$/i,
      "Code must be alphanumeric with dashes/underscores",
    ),
  status: z.enum(["planned", "active", "blocked", "done", "archived"]),
  dueAt: z.string().optional(),
  deadlineAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  templateKey: z.string().optional(),
});

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
];

const sanitize = (input: string): string => {
  return DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [] });
};

const handleSubmit = async () => {
  if (busy.value) return;

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
        message: "Validation failed",
      };
      await AlertService.error("Validation Error", firstError.message);
      return;
    }

    if (isEditing.value && props.project?.id) {
      // Update existing project via API
      await ApiClientService.projects.update(props.project.id, result.data);
    } else {
      // Create new project via API
      await ApiClientService.projects.create(result.data);
    }

    // Commit name to autocomplete history
    nameAutocomplete.commit(result.data.name);

    const projectData: ProjectRow = {
      id: props.project?.id ?? crypto.randomUUID(),
      ...result.data,
      dueAt: result.data.dueAt ?? null,
      ownerEmail: props.project?.ownerEmail ?? "",
      createdAt: props.project?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await AlertService.success(
      isEditing.value ? "Project Updated" : "Project Created",
      `"${projectData.name}" has been ${isEditing.value ? "updated" : "created"}.`,
    );

    emit("confirm", projectData);
  } catch (e) {
    console.error("[ProjectFormModal] Submit failed:", e);
    await AlertService.error("Error", e);
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <form class="project-form" @submit.prevent="handleSubmit">
    <div class="form-field" style="position: relative">
      <label class="form-label" for="project-name">Project Name</label>
      <input
        id="project-name"
        v-model="name"
        class="form-input"
        type="text"
        placeholder="My Awesome Project"
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
      <label class="form-label" for="project-code">Project Code</label>
      <input
        id="project-code"
        v-model="code"
        class="form-input"
        type="text"
        placeholder="PROJ-001"
        required
        minlength="2"
        maxlength="20"
        pattern="[A-Za-z0-9_-]+"
      />
      <span class="form-hint">Alphanumeric, dashes, underscores only</span>
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
      <label class="form-label" for="project-template">Template</label>
      <select id="project-template" v-model="templateKey" class="form-select">
        <option value="">None</option>
        <option v-for="t in templates" :key="t.key" :value="t.key">
          {{ t.name }}
        </option>
      </select>
      <span class="form-hint">Pre-fills project from a template blueprint</span>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label class="form-label" for="project-due">Due Date</label>
        <input
          id="project-due"
          v-model="dueAt"
          class="form-input"
          type="date"
        />
      </div>

      <div class="form-field">
        <label class="form-label" for="project-deadline">Deadline</label>
        <input
          id="project-deadline"
          v-model="deadlineAt"
          class="form-input"
          type="date"
        />
      </div>
    </div>

    <div class="form-field">
      <label class="form-label">Tags</label>
      <TagPicker v-model="tags" />
    </div>

    <div class="form-actions">
      <button
        class="btn btn-ghost"
        type="button"
        :disabled="busy"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        class="btn btn-primary"
        type="submit"
        :disabled="busy"
        :aria-busy="busy"
      >
        {{
          busy ? "Saving..." : isEditing ? "Update Project" : "Create Project"
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
