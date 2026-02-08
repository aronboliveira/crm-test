<script setup lang="ts">
import { defineAsyncComponent, ref, computed } from "vue";
import { useDashboardTasksPage } from "../assets/scripts/pages/useDashboardTasksPage";
import ModalService from "../services/ModalService";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";
import type { TaskRow } from "../pinia/types/tasks.types";
import type { FilterState } from "../components/ui/AdvancedFilter.vue";

const TaskFormModal = defineAsyncComponent(
  () => import("../components/forms/TaskFormModal.vue"),
);

const AdvancedFilter = defineAsyncComponent(
  () => import("../components/ui/AdvancedFilter.vue"),
);

const CommentsPanel = defineAsyncComponent(
  () => import("../components/ui/CommentsPanel.vue"),
);

const NotesPanel = defineAsyncComponent(
  () => import("../components/ui/NotesPanel.vue"),
);

const AttachmentsPanel = defineAsyncComponent(
  () => import("../components/ui/AttachmentsPanel.vue"),
);

const { rows, q, loading, error, nextCursor, load, more } =
  useDashboardTasksPage();

const filter = ref<FilterState>({
  status: "",
  priority: "",
  assignee: "",
  tag: "",
  dueBefore: "",
  dueAfter: "",
});

const selectedTask = ref<TaskRow | null>(null);

const filteredRows = computed(() => {
  let out = rows.value;
  const f = filter.value;
  if (f.status) out = out.filter((t) => t?.status === f.status);
  if (f.priority) out = out.filter((t) => String(t?.priority) === f.priority);
  if (f.assignee)
    out = out.filter((t) =>
      (t?.assigneeEmail || "").toLowerCase().includes(f.assignee.toLowerCase()),
    );
  if (f.tag) out = out.filter((t) => (t as any)?.tags?.includes(f.tag));
  if (f.dueAfter) out = out.filter((t) => (t?.dueAt || "") >= f.dueAfter);
  if (f.dueBefore) out = out.filter((t) => (t?.dueAt || "") <= f.dueBefore);
  return out;
});

const onFilter = (s: FilterState) => {
  filter.value = s;
};

const onReset = () => {
  filter.value = {
    status: "",
    priority: "",
    assignee: "",
    tag: "",
    dueBefore: "",
    dueAfter: "",
  };
};

const openCreateTask = async () => {
  const result = await ModalService.open(TaskFormModal, {
    title: "Criar Nova Tarefa",
    size: "md",
  });
  if (result) await load(true);
};

const openEditTask = async (task: TaskRow) => {
  const result = await ModalService.open(TaskFormModal, {
    title: `Editar Tarefa: ${task.title}`,
    size: "md",
    data: { task },
  });
  if (result) await load(true);
};

const deleteTask = async (task: TaskRow) => {
  const confirmed = await AlertService.confirm(
    "Excluir Tarefa",
    `Tem certeza que deseja excluir "${task.title}"? Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;
  try {
    await ApiClientService.tasks.remove(task.id);
    await AlertService.success("Excluída", `"${task.title}" foi excluída.`);
    selectedTask.value = null;
    await load(true);
  } catch (e) {
    console.error("[DashboardTasksPage] Delete failed:", e);
    await AlertService.error("Erro", "Falha ao excluir tarefa.");
  }
};

const taskStatusOptions = [
  { label: "A Fazer", value: "todo" },
  { label: "Em Progresso", value: "doing" },
  { label: "Concluído", value: "done" },
  { label: "Bloqueado", value: "blocked" },
];

const taskPriorityOptions = [
  { label: "P1 — Crítica", value: "1" },
  { label: "P2 — Alta", value: "2" },
  { label: "P3 — Média", value: "3" },
  { label: "P4 — Baixa", value: "4" },
  { label: "P5 — Mínima", value: "5" },
];
</script>

<template>
  <section class="dt-page" aria-label="Tarefas">
    <header class="dt-actions">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Tarefas</h1>
        <p class="opacity-70">Gerencie tarefas em todos os projetos.</p>
      </div>

      <div class="flex gap-2 items-center flex-wrap">
        <input
          class="table-search-input"
          v-model="q"
          name="q"
          aria-label="Buscar tarefas"
          placeholder="buscar"
          @keyup.enter="load(true)"
        />
        <AdvancedFilter
          :status-options="taskStatusOptions"
          :priority-options="taskPriorityOptions"
          show-assignee
          @filter="onFilter"
          @reset="onReset"
        />
        <button class="btn btn-primary" type="button" @click="openCreateTask">
          + Nova
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="loading"
          :aria-disabled="loading"
          @click="load(true)"
        >
          Recarregar
        </button>
      </div>
    </header>

    <div class="dt-layout mt-3">
      <!-- Table -->
      <div
        class="dt-card card p-2 overflow-auto flex-1"
        role="region"
        aria-label="Tabela de tarefas"
      >
        <table class="min-w-[1200px] w-full" role="table" aria-label="Tarefas">
          <thead>
            <tr class="text-left opacity-80">
              <th class="py-2 pr-3">Título</th>
              <th class="py-2 pr-3">Projeto</th>
              <th class="py-2 pr-3">Responsável</th>
              <th class="py-2 pr-3">Status</th>
              <th class="py-2 pr-3">Prioridade</th>
              <th class="py-2 pr-3">Tags</th>
              <th class="py-2 pr-3">Entrega</th>
              <th class="py-2 pr-3">Ações</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="t in filteredRows"
              :key="t?.id || (Math.random() * Math.random()).toString(36)"
              class="border-t border-white/10 cursor-pointer"
              :class="{ 'bg-white/5': selectedTask?.id === t?.id }"
              @click="selectedTask = t ?? null"
            >
              <td class="py-2 pr-3 font-semibold">{{ t?.title ?? "-" }}</td>
              <td class="py-2 pr-3">{{ t?.projectId ?? "-" }}</td>
              <td class="py-2 pr-3">{{ t?.assigneeEmail ?? "-" }}</td>
              <td class="py-2 pr-3">{{ t?.status ?? "-" }}</td>
              <td class="py-2 pr-3">{{ t?.priority ?? "-" }}</td>
              <td class="py-2 pr-3">
                <div class="flex gap-0.5 flex-wrap">
                  <span
                    v-for="tag in ((t as any)?.tags ?? []).slice(0, 3)"
                    :key="tag"
                    class="text-xs bg-indigo-500/15 px-1 rounded"
                  >
                    {{ tag }}
                  </span>
                </div>
              </td>
              <td class="py-2 pr-3">{{ t?.dueAt?.slice(0, 10) ?? "-" }}</td>
              <td class="py-2 pr-3">
                <div class="flex gap-1">
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Editar tarefa"
                    @click.stop="openEditTask(t!)"
                  >
                    Editar
                  </button>
                  <button
                    class="btn btn-ghost btn-sm text-danger"
                    type="button"
                    aria-label="Excluir tarefa"
                    @click.stop="deleteTask(t!)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!filteredRows.length && !loading">
              <td colspan="8" class="py-6 opacity-70 text-center">
                {{ error || "Nenhuma tarefa." }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail sidebar -->
      <aside
        v-if="selectedTask"
        class="dt-detail card p-3 overflow-y-auto"
        aria-label="Detalhes da tarefa"
      >
        <div class="flex justify-between items-start mb-2">
          <h2 class="font-bold text-sm">{{ selectedTask.title }}</h2>
          <button
            class="text-xs opacity-40 hover:opacity-100"
            @click="selectedTask = null"
          >
            ✕
          </button>
        </div>

        <div class="text-xs opacity-60 mb-3">
          Status: {{ selectedTask.status }} · P{{ selectedTask.priority }}
          <span v-if="selectedTask.assigneeEmail">
            · {{ selectedTask.assigneeEmail }}
          </span>
        </div>

        <CommentsPanel :target-type="'task'" :target-id="selectedTask.id" />
        <NotesPanel :target-type="'task'" :target-id="selectedTask.id" />
        <AttachmentsPanel :target-type="'task'" :target-id="selectedTask.id" />
      </aside>
    </div>

    <div class="mt-3 flex justify-end">
      <button
        class="btn btn-ghost"
        type="button"
        aria-label="Carregar mais"
        :disabled="!nextCursor || loading"
        :aria-disabled="!nextCursor || loading"
        @click="more"
      >
        Carregar mais
      </button>
    </div>
  </section>
</template>

<style lang="scss">
@keyframes dtIn {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.dt-actions {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
}

.dt-card {
  animation: dtIn 160ms ease both;

  &:hover {
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.14);
  }
  &:active {
    transform: translateY(1px);
  }

  ::selection {
    background: rgba(120, 120, 200, 0.22);
  }
}

.dt-page {
  padding: 1rem;
}

.dt-layout {
  display: flex;
  gap: 1rem;
}

.dt-detail {
  width: 340px;
  min-width: 280px;
  max-height: calc(100vh - 200px);
}

@media (max-width: 960px) {
  .dt-layout {
    flex-direction: column;
  }
  .dt-detail {
    width: 100%;
    max-height: 50vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dt-card {
    animation: none;
  }
}

@starting-style {
  .dt-card {
    opacity: 0;
    transform: translateY(8px);
  }
}

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
