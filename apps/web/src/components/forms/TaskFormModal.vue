<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted } from "vue";
import { z } from "zod";
import DOMPurify from "dompurify";
import type {
  TaskRow,
  TaskStatus,
  TaskPriority,
} from "../../pinia/types/tasks.types";
import { useProjectsStore } from "../../pinia/stores/projects.store";
import ApiClientService from "../../services/ApiClientService";
import AlertService from "../../services/AlertService";
import SmartAutocompleteService from "../../services/SmartAutocompleteService";

const TagPicker = defineAsyncComponent(() => import("../ui/TagPicker.vue"));

interface Props {
  task?: TaskRow;
  projectId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", task: TaskRow): void;
}>();

const projectsStore = useProjectsStore();
const isEditing = computed(() => !!props.task);
const busy = ref(false);

// Get projects for dropdown
const projects = computed(() => projectsStore.rows);

// Milestone options (loaded per selected project)
const milestones = ref<{ id: string; title: string }[]>([]);

// Smart autocomplete
const titleAutocomplete = new SmartAutocompleteService("task-title");
const titleSuggestions = ref<string[]>([]);
const showSuggestions = ref(false);

// Form state
const title = ref(props.task?.title ?? "");
const projectId = ref(props.task?.projectId ?? props.projectId ?? "");
const status = ref<TaskStatus>(props.task?.status ?? "todo");
const priority = ref<TaskPriority>(props.task?.priority ?? 3);
const dueAt = ref(props.task?.dueAt?.split("T")[0] ?? "");
const deadlineAt = ref((props.task as any)?.deadlineAt?.split("T")[0] ?? "");
const assigneeEmail = ref(props.task?.assigneeEmail ?? "");
const milestoneId = ref((props.task as any)?.milestoneId ?? "");
const tags = ref<string[]>((props.task as any)?.tags ?? []);

// Load milestones when project changes
const loadMilestones = async (pid: string) => {
  if (!pid) {
    milestones.value = [];
    return;
  }
  try {
    const res = await ApiClientService.milestones.list(pid);
    milestones.value = (res.data ?? []).map((m: any) => ({
      id: m._id ?? m.id,
      title: m.title,
    }));
  } catch {
    milestones.value = [];
  }
};

onMounted(() => {
  if (projectId.value) loadMilestones(projectId.value);
});

const onProjectChange = () => {
  milestoneId.value = "";
  loadMilestones(projectId.value);
};

const onTitleInput = () => {
  const v = title.value.trim();
  if (v.length >= 2) {
    titleSuggestions.value = titleAutocomplete.suggest(v, 5);
    showSuggestions.value = titleSuggestions.value.length > 0;
  } else {
    showSuggestions.value = false;
  }
};

const pickSuggestion = (s: string) => {
  title.value = s;
  showSuggestions.value = false;
};

// Zod schema for validation
const taskSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be less than 200 characters"),
  projectId: z.string().min(1, "Project is required"),
  status: z.enum(["todo", "doing", "blocked", "done", "archived"]),
  priority: z.number().min(1).max(5),
  dueAt: z.string().optional(),
  deadlineAt: z.string().optional(),
  assigneeEmail: z.string().optional(),
  milestoneId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "doing", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 1, label: "Critical" },
  { value: 2, label: "High" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Low" },
  { value: 5, label: "Lowest" },
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
      title: sanitize(title.value),
      projectId: projectId.value,
      status: status.value,
      priority: priority.value,
      dueAt: dueAt.value || undefined,
      deadlineAt: deadlineAt.value || undefined,
      assigneeEmail: assigneeEmail.value.trim() || undefined,
      milestoneId: milestoneId.value || undefined,
      tags: tags.value.length ? tags.value : undefined,
    };

    // Validate with Zod
    const result = taskSchema.safeParse(sanitizedData);
    if (!result.success) {
      const firstError = (result.error as any).errors?.[0] ?? {
        message: "Validation failed",
      };
      await AlertService.error("Validation Error", firstError.message);
      return;
    }

    if (isEditing.value && props.task?.id) {
      await ApiClientService.tasks.update(props.task.id, result.data);
    } else {
      await ApiClientService.tasks.create(result.data);
    }

    // Commit title to autocomplete history
    titleAutocomplete.commit(result.data.title);

    const taskData: TaskRow = {
      id: props.task?.id ?? crypto.randomUUID(),
      ...result.data,
      priority: result.data.priority as TaskPriority,
      dueAt: result.data.dueAt ?? null,
      assigneeEmail:
        result.data.assigneeEmail ?? props.task?.assigneeEmail ?? "",
      createdAt: props.task?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await AlertService.success(
      isEditing.value ? "Task Updated" : "Task Created",
      `"${taskData.title}" has been ${isEditing.value ? "updated" : "created"}.`,
    );

    emit("confirm", taskData);
  } catch (e) {
    console.error("[TaskFormModal] Submit failed:", e);
    await AlertService.error("Error", e);
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <form class="task-form" @submit.prevent="handleSubmit">
    <div class="form-field" style="position: relative">
      <label class="form-label" for="task-title">Task Title</label>
      <input
        id="task-title"
        v-model="title"
        class="form-input"
        type="text"
        placeholder="What needs to be done?"
        required
        minlength="2"
        maxlength="200"
        autocomplete="off"
        @input="onTitleInput"
        @blur="showSuggestions = false"
      />
      <ul v-if="showSuggestions" class="autocomplete-list" role="listbox">
        <li
          v-for="s in titleSuggestions"
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
      <label class="form-label" for="task-project">Project</label>
      <select
        id="task-project"
        v-model="projectId"
        class="form-select"
        required
        @change="onProjectChange"
      >
        <option value="" disabled>Select a project</option>
        <option v-for="proj in projects" :key="proj?.id" :value="proj?.id">
          {{ proj?.code }} - {{ proj?.name }}
        </option>
      </select>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label class="form-label" for="task-status">Status</label>
        <select id="task-status" v-model="status" class="form-select">
          <option
            v-for="opt in statusOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div class="form-field">
        <label class="form-label" for="task-priority">Priority</label>
        <select id="task-priority" v-model="priority" class="form-select">
          <option
            v-for="opt in priorityOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="form-field">
      <label class="form-label" for="task-assignee">Assignee Email</label>
      <input
        id="task-assignee"
        v-model="assigneeEmail"
        class="form-input"
        type="email"
        placeholder="user@example.com"
      />
    </div>

    <div class="form-field" v-if="milestones.length">
      <label class="form-label" for="task-milestone">Milestone</label>
      <select id="task-milestone" v-model="milestoneId" class="form-select">
        <option value="">None</option>
        <option v-for="m in milestones" :key="m.id" :value="m.id">
          {{ m.title }}
        </option>
      </select>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label class="form-label" for="task-due">Due Date</label>
        <input id="task-due" v-model="dueAt" class="form-input" type="date" />
      </div>

      <div class="form-field">
        <label class="form-label" for="task-deadline">Deadline</label>
        <input
          id="task-deadline"
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
        {{ busy ? "Saving..." : isEditing ? "Update Task" : "Create Task" }}
      </button>
    </div>
  </form>
</template>

<style scoped lang="scss">
.task-form {
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
