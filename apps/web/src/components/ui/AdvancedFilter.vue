<script setup lang="ts">
import { ref, computed, watch } from "vue";

export interface FilterState {
  status: string;
  priority: string;
  assignee: string;
  tag: string;
  dueBefore: string;
  dueAfter: string;
}

const props = defineProps<{
  /** Available status options grouped by category */
  statusOptions: { label: string; value: string }[];
  /** Available priority options */
  priorityOptions?: { label: string; value: string }[];
  /** Available tag keys */
  tagOptions?: { label: string; value: string }[];
  /** Show assignee filter */
  showAssignee?: boolean;
}>();

const emit = defineEmits<{
  (e: "filter", state: FilterState): void;
  (e: "reset"): void;
}>();

const status = ref("");
const priority = ref("");
const assignee = ref("");
const tag = ref("");
const dueBefore = ref("");
const dueAfter = ref("");
const expanded = ref(false);

const activeCount = computed(() => {
  let n = 0;
  if (status.value) n++;
  if (priority.value) n++;
  if (assignee.value) n++;
  if (tag.value) n++;
  if (dueBefore.value) n++;
  if (dueAfter.value) n++;
  return n;
});

function apply() {
  emit("filter", {
    status: status.value,
    priority: priority.value,
    assignee: assignee.value,
    tag: tag.value,
    dueBefore: dueBefore.value,
    dueAfter: dueAfter.value,
  });
}

function reset() {
  status.value = "";
  priority.value = "";
  assignee.value = "";
  tag.value = "";
  dueBefore.value = "";
  dueAfter.value = "";
  emit("reset");
}

// Auto-apply on change
watch([status, priority, assignee, tag, dueBefore, dueAfter], apply);
</script>

<template>
  <div class="adv-filter" aria-label="Advanced filters">
    <button
      type="button"
      class="btn btn-ghost btn-sm"
      @click="expanded = !expanded"
    >
      🔍 Filters
      <span v-if="activeCount" class="filter-badge">{{ activeCount }}</span>
    </button>

    <div v-if="expanded" class="filter-grid mt-2">
      <!-- Status -->
      <div class="filter-field">
        <label class="filter-label">Status</label>
        <select
          v-model="status"
          class="filter-select"
          aria-label="Status filter"
        >
          <option value="">All</option>
          <optgroup label="Active">
            <option
              v-for="o in statusOptions.filter((s) =>
                ['active', 'todo', 'doing'].includes(s.value),
              )"
              :key="o.value"
              :value="o.value"
            >
              {{ o.label }}
            </option>
          </optgroup>
          <optgroup label="Closed">
            <option
              v-for="o in statusOptions.filter((s) =>
                ['done', 'archived', 'blocked'].includes(s.value),
              )"
              :key="o.value"
              :value="o.value"
            >
              {{ o.label }}
            </option>
          </optgroup>
        </select>
      </div>

      <!-- Priority -->
      <div v-if="priorityOptions" class="filter-field">
        <label class="filter-label">Priority</label>
        <select
          v-model="priority"
          class="filter-select"
          aria-label="Priority filter"
        >
          <option value="">All</option>
          <optgroup label="Priorities">
            <option
              v-for="o in priorityOptions"
              :key="o.value"
              :value="o.value"
            >
              {{ o.label }}
            </option>
          </optgroup>
        </select>
      </div>

      <!-- Tag -->
      <div v-if="tagOptions?.length" class="filter-field">
        <label class="filter-label">Tag</label>
        <select v-model="tag" class="filter-select" aria-label="Tag filter">
          <option value="">All</option>
          <optgroup label="Tags">
            <option v-for="o in tagOptions" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </optgroup>
        </select>
      </div>

      <!-- Assignee (text input) -->
      <div v-if="showAssignee" class="filter-field">
        <label class="filter-label">Assignee</label>
        <input
          v-model="assignee"
          class="filter-input"
          type="text"
          placeholder="email"
          aria-label="Assignee filter"
          list="filter-assignee-list"
        />
      </div>

      <!-- Due date range -->
      <div class="filter-field">
        <label class="filter-label">Due after</label>
        <input
          v-model="dueAfter"
          class="filter-input"
          type="date"
          aria-label="Due after"
        />
      </div>

      <div class="filter-field">
        <label class="filter-label">Due before</label>
        <input
          v-model="dueBefore"
          class="filter-input"
          type="date"
          aria-label="Due before"
        />
      </div>

      <div class="filter-field flex items-end">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          @click="reset"
          :disabled="activeCount === 0"
        >
          Clear
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.adv-filter {
  position: relative;
}

.filter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary, #6366f1);
  color: #fff;
  font-size: 0.65rem;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 9999px;
  margin-left: 0.25rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.15);
}

.filter-field {
  display: grid;
  gap: 0.2rem;
}

.filter-label {
  font-size: 0.7rem;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-select,
.filter-input {
  font-size: 0.8rem;
  padding: 0.3rem 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;

  &:focus {
    outline: 2px solid var(--color-primary, #6366f1);
    outline-offset: 1px;
  }
}
</style>
