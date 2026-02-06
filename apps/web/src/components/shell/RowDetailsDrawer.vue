<script setup lang="ts">
import { useRowDetailsDrawer } from "../../assets/scripts/shell/useRowDetailsDrawer";
import ProjectSelect from "../forms/ProjectSelect.vue";

const {
  busy,
  editing,
  isOpen,
  kind,
  project,
  task,
  canEdit,
  canDelete,
  draftP,
  draftT,
  close,
  toggleEdit,
  save,
  del,
  dueText,
  st,
  DateTimeService,
} = useRowDetailsDrawer();
</script>

<template>
  <div
    class="drawer-backdrop"
    :class="{ 'is-open': isOpen }"
    role="presentation"
    @click.self="close"
  >
    <aside
      ref="panel"
      class="drawer"
      :class="{ 'is-open': isOpen }"
      :aria-hidden="!isOpen"
      :aria-label="st.title"
    >
      <div class="drawer-head">
        <h3 class="drawer-title">{{ st.title }}</h3>

        <div class="drawer-actions">
          <button
            v-if="canDelete"
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="busy"
            :aria-disabled="busy"
            aria-label="Delete"
            @click="del"
          >
            Delete
          </button>

          <button
            v-if="canEdit"
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="busy"
            :aria-disabled="busy"
            :aria-label="editing ? 'Cancel edit' : 'Edit'"
            @click="toggleEdit"
          >
            {{ editing ? "Cancel" : "Edit" }}
          </button>

          <button
            class="btn btn-ghost btn-sm"
            type="button"
            aria-label="Close drawer"
            @click="close"
          >
            ×
          </button>
        </div>
      </div>

      <div class="drawer-body">
        <template v-if="kind === 'project' && project">
          <form
            v-if="editing"
            class="grid gap-3"
            aria-label="Edit project form"
            @submit.prevent="save"
          >
            <label class="grid gap-1">
              <span class="font-semibold">Name</span>
              <input
                class="table-search-input"
                required
                v-model="draftP.name"
                aria-label="Project name"
              />
            </label>

            <label class="grid gap-1">
              <span class="font-semibold">Status</span>
              <select
                class="table-search-input"
                v-model="draftP.status"
                aria-label="Project status"
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </label>

            <label class="grid gap-1">
              <span class="font-semibold">Description</span>
              <textarea
                class="table-search-input min-h-[120px]"
                v-model="draftP.description"
                aria-label="Project description"
              ></textarea>
            </label>

            <div class="flex justify-end gap-2">
              <button
                class="btn btn-primary"
                type="submit"
                :disabled="busy"
                :aria-disabled="busy"
              >
                Save
              </button>
            </div>
          </form>

          <dl v-else class="kv" aria-label="Project details">
            <div class="kv-row">
              <dt class="kv-k">Name</dt>
              <dd class="kv-v">{{ project.name }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Status</dt>
              <dd class="kv-v">{{ project.status }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Updated</dt>
              <dd class="kv-v">
                {{ DateTimeService.short(project.updatedAt) }}
              </dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Created</dt>
              <dd class="kv-v">
                {{ DateTimeService.short(project.createdAt) }}
              </dd>
            </div>
            <div v-if="project.description" class="kv-row">
              <dt class="kv-k">Description</dt>
              <dd class="kv-v kv-v-pre">{{ project.description }}</dd>
            </div>
          </dl>
        </template>

        <template v-else-if="kind === 'task' && task">
          <form
            v-if="editing"
            class="grid gap-3"
            aria-label="Edit task form"
            @submit.prevent="save"
          >
            <label class="grid gap-1">
              <span class="font-semibold">Project Id</span>
              <ProjectSelect
                v-model="draftT.projectId"
                :required="true"
                :disabled="busy"
                aria-label="Project"
              />
            </label>

            <label class="grid gap-1">
              <span class="font-semibold">Title</span>
              <input
                class="table-search-input"
                required
                v-model="draftT.title"
                aria-label="Task title"
              />
            </label>

            <div class="grid grid-cols-2 gap-3">
              <label class="grid gap-1">
                <span class="font-semibold">Status</span>
                <select
                  class="table-search-input"
                  v-model="draftT.status"
                  aria-label="Task status"
                >
                  <option value="todo">todo</option>
                  <option value="doing">doing</option>
                  <option value="done">done</option>
                  <option value="blocked">blocked</option>
                </select>
              </label>

              <label class="grid gap-1">
                <span class="font-semibold">Priority</span>
                <select
                  class="table-search-input"
                  v-model.number="draftT.priority"
                  aria-label="Task priority"
                >
                  <option :value="1">1</option>
                  <option :value="2">2</option>
                  <option :value="3">3</option>
                  <option :value="4">4</option>
                  <option :value="5">5</option>
                </select>
              </label>
            </div>

            <label class="grid gap-1">
              <span class="font-semibold">Due (optional)</span>
              <input
                class="table-search-input"
                type="datetime-local"
                v-model="draftT.dueAt"
                aria-label="Due date"
              />
            </label>

            <label class="grid gap-1">
              <span class="font-semibold">Description</span>
              <textarea
                class="table-search-input min-h-[120px]"
                v-model="draftT.description"
                aria-label="Task description"
              ></textarea>
            </label>

            <div class="flex justify-end gap-2">
              <button
                class="btn btn-primary"
                type="submit"
                :disabled="busy"
                :aria-disabled="busy"
              >
                Save
              </button>
            </div>
          </form>

          <dl v-else class="kv" aria-label="Task details">
            <div class="kv-row">
              <dt class="kv-k">Title</dt>
              <dd class="kv-v">{{ task.title }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Status</dt>
              <dd class="kv-v">{{ task.status }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Priority</dt>
              <dd class="kv-v">{{ task.priority }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Due</dt>
              <dd class="kv-v">{{ dueText }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Updated</dt>
              <dd class="kv-v">{{ DateTimeService.short(task.updatedAt) }}</dd>
            </div>
            <div v-if="task.description" class="kv-row">
              <dt class="kv-k">Description</dt>
              <dd class="kv-v kv-v-pre">{{ task.description }}</dd>
            </div>
          </dl>
        </template>

        <div v-else class="drawer-empty" aria-live="polite">No details.</div>
      </div>
    </aside>
  </div>
</template>
