<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useRouter } from "vue-router";
import { useDashboardMyWorkPage } from "../assets/scripts/pages/useDashboardMyWorkPage";
import type { TaskRow } from "../pinia/types/tasks.types";

const TaskDetailPanel = defineAsyncComponent(
  () => import("../components/tasks/TaskDetailPanel.vue"),
);

const {
  loading,
  meEmail,
  pendingTasks,
  highPriorityTasks,
  upcomingDeadlines,
  myProjects,
  clientStats,
  bestConnectedClients,
  professionalRole,
  refresh,
  getProjectProgress,
} = useDashboardMyWorkPage();

const router = useRouter();

const openTask = (task: TaskRow) => {
  router.push({
    query: { ...router.currentRoute.value.query, taskId: task.id },
  });
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    todo: "A Fazer",
    doing: "Em Progresso",
    blocked: "Bloqueado",
    done: "Concluído",
  };
  return map[s] || s;
};

const priorityLabel = (p: number) => `P${p}`;
</script>

<template>
  <section class="mw-page" aria-label="Meu Trabalho">
    <header class="mw-header">
      <div>
        <h1 class="text-xl font-black">Meu Trabalho</h1>
        <p class="opacity-70">
          Visão geral de suas tarefas e projetos ativos ({{ meEmail }}).
          <span class="mw-role">Função técnica: {{ professionalRole }}</span>
        </p>
      </div>
      <button
        class="btn btn-ghost"
        type="button"
        :disabled="loading"
        @click="refresh"
      >
        Recarregar
      </button>
    </header>

    <!-- KPI Cards -->
    <div class="mw-stats">
      <div class="mw-stat-card">
        <div class="mw-stat-val">{{ pendingTasks.length }}</div>
        <div class="mw-stat-label">Tarefas Pendentes</div>
      </div>
      <div class="mw-stat-card is-warning" v-if="upcomingDeadlines.length">
        <div class="mw-stat-val">{{ upcomingDeadlines.length }}</div>
        <div class="mw-stat-label">Prazos Próximos (7 dias)</div>
      </div>
      <div class="mw-stat-card is-danger" v-if="highPriorityTasks.length">
        <div class="mw-stat-val">{{ highPriorityTasks.length }}</div>
        <div class="mw-stat-label">Alta Prioridade (P1/P2)</div>
      </div>
      <div class="mw-stat-card">
        <div class="mw-stat-val">{{ myProjects.length }}</div>
        <div class="mw-stat-label">Meus Projetos</div>
      </div>
    </div>

    <div class="mw-grid">
      <!-- High Priority / Upcoming -->
      <div class="mw-col">
        <section class="mw-section card">
          <h2 class="mw-section-title text-danger">Prioridade Alta</h2>
          <div v-if="!highPriorityTasks.length" class="mw-empty">
            Nenhuma tarefa crítica pendente.
          </div>
          <div class="mw-list" v-else>
            <article
              v-for="t in highPriorityTasks"
              :key="t.id"
              class="mw-task-item"
              @click="openTask(t)"
            >
              <div class="mw-task-header">
                <span class="mw-task-p badge-p" :data-p="t.priority">{{
                  priorityLabel(t.priority)
                }}</span>
                <span class="mw-task-status">{{ statusLabel(t.status) }}</span>
              </div>
              <h3 class="mw-task-title">{{ t.title }}</h3>
              <div class="mw-task-meta">
                <span v-if="t.dueAt">Entrega: {{ t.dueAt.slice(0, 10) }}</span>
              </div>
            </article>
          </div>
        </section>

        <section class="mw-section card mt-4">
          <h2 class="mw-section-title text-warning">Próximos Prazos</h2>
          <div v-if="!upcomingDeadlines.length" class="mw-empty">
            Nenhum prazo próximo.
          </div>
          <div class="mw-list" v-else>
            <article
              v-for="t in upcomingDeadlines"
              :key="t.id"
              class="mw-task-item"
              @click="openTask(t)"
            >
              <div class="mw-task-header">
                <span class="mw-task-p badge-p" :data-p="t.priority">{{
                  priorityLabel(t.priority)
                }}</span>
                <span class="mw-task-due text-warning font-bold">{{
                  t.dueAt?.slice(0, 10)
                }}</span>
              </div>
              <h3 class="mw-task-title">{{ t.title }}</h3>
            </article>
          </div>
        </section>
      </div>

      <!-- All Active Tasks -->
      <div class="mw-col flex-2">
        <section class="mw-section card h-full">
          <h2 class="mw-section-title">Minhas Tarefas (Todas)</h2>
          <div v-if="!pendingTasks.length" class="mw-empty">
            Você não tem tarefas pendentes.
          </div>
          <div class="mw-table-wrapper" v-else>
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="opacity-60 border-b border-white/10">
                  <th class="py-2">Título</th>
                  <th class="py-2">Status</th>
                  <th class="py-2">Prioridade</th>
                  <th class="py-2">Projeto</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="t in pendingTasks"
                  :key="t.id"
                  class="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                  @click="openTask(t)"
                >
                  <td class="py-2 pr-2 font-medium">{{ t.title }}</td>
                  <td class="py-2 pr-2">{{ statusLabel(t.status) }}</td>
                  <td class="py-2 pr-2">
                    <span class="badge-p" :data-p="t.priority">{{
                      priorityLabel(t.priority)
                    }}</span>
                  </td>
                  <td class="py-2 opacity-70">{{ t.projectId }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- My Projects -->
      <div class="mw-col">
        <section class="mw-section card h-full">
          <h2 class="mw-section-title">Meus Projetos</h2>

          <!-- Client Stats (New) -->
          <div
            v-if="clientStats.length"
            class="mb-6 p-4 bg-surface-1 rounded border border-white/5"
          >
            <h3
              class="text-xs font-bold uppercase opacity-60 mb-3 tracking-wide"
            >
              Desempenho por Cliente
            </h3>
            <div v-for="c in clientStats" :key="c.name" class="mb-3 last:mb-0">
              <div class="flex justify-between text-xs mb-1">
                <span class="font-medium truncate pr-2">{{ c.name }}</span>
                <span class="opacity-70 whitespace-nowrap"
                  >{{ c.done }}/{{ c.total }} tarefas</span
                >
              </div>
              <div class="text-[11px] opacity-60 mb-1">
                Contato técnico: {{ c.role }}
              </div>
              <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary"
                  :style="{ width: c.pct + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <div
            v-if="bestConnectedClients.length"
            class="mb-6 p-4 bg-surface-1 rounded border border-white/5"
          >
            <h3
              class="text-xs font-bold uppercase opacity-60 mb-3 tracking-wide"
            >
              Clientes Mais Conectados
            </h3>
            <ul class="mw-connected">
              <li v-for="c in bestConnectedClients" :key="c.name">
                <span class="font-medium">{{ c.name }}</span>
                <span class="opacity-60 text-xs">
                  {{ c.total }} interações · {{ c.role }}
                </span>
              </li>
            </ul>
          </div>
          <div v-if="!myProjects.length" class="mw-empty">
            Nenhum projeto sob sua liderança.
          </div>
          <ul class="mw-list" v-else>
            <li v-for="p in myProjects" :key="p.id" class="mw-project-item">
              <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-sm">{{ p.name }}</span>
                <span class="text-xs opacity-60 uppercase">{{ p.status }}</span>
              </div>
              <div class="text-xs opacity-50">{{ p.code }}</div>
              <div class="mt-2 h-1 bg-white/10 rounded overflow-hidden">
                <div
                  class="h-full bg-primary"
                  :style="{ width: getProjectProgress(p.id) + '%' }"
                ></div>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- Task Detail Drawer (Reused) -->
    <div class="mw-panel-row">
      <TaskDetailPanel v-if="$route.query.taskId" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.mw-page {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.mw-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.mw-role {
  display: inline-block;
  margin-left: 0.5rem;
  padding-left: 0.5rem;
  border-left: 1px solid var(--border-1);
  font-size: 0.85rem;
  opacity: 0.7;
}

.mw-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.mw-connected {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.mw-connected li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.mw-panel-row {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.mw-stat-card {
  background: var(--surface-1);
  padding: 1rem;
  border-radius: var(--radius-md, 12px);
  border: 1px solid var(--border-1);
  display: flex;
  flex-direction: column;

  &.is-warning {
    border-color: #f59e0b;
    .mw-stat-val {
      color: #f59e0b;
    }
  }
  &.is-danger {
    border-color: var(--danger);
    .mw-stat-val {
      color: var(--danger);
    }
  }
}

.mw-stat-val {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.mw-stat-label {
  font-size: 0.8125rem;
  opacity: 0.7;
  font-weight: 500;
}

.mw-grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 1rem;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.mw-section {
  padding: 1.25rem;
}

.mw-section-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mw-empty {
  font-size: 0.875rem;
  opacity: 0.5;
  font-style: italic;
  padding: 1rem 0;
}

.mw-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mw-task-item {
  padding: 0.75rem;
  background: var(--surface-2);
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-1px);
  }
}

.mw-task-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 0.375rem;
}

.mw-task-title {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 0.25rem;
}

.mw-task-meta {
  font-size: 0.75rem;
  opacity: 0.6;
}

.badge-p {
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  background: var(--surface-3);
  font-weight: 700;

  &[data-p="1"] {
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 15%, transparent);
  }
  &[data-p="2"] {
    color: #f59e0b;
    background: color-mix(in srgb, #f59e0b 15%, transparent);
  }
}

.mw-project-item {
  padding: 0.75rem;
  background: var(--surface-2);
  border-radius: 8px;
}
</style>
