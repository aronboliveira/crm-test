<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { useRouter } from "vue-router";
import { useDashboardHome } from "../../assets/scripts/dashboard/useDashboardHome";
import DashboardSummaryCards from "./DashboardSummaryCards.vue";
import RecentProjects from "./RecentProjects.vue";
import RecentTasks from "./RecentTasks.vue";
import ActivityFeed from "./ActivityFeed.vue";
import QuickActions from "./QuickActions.vue";
import ModalService from "../../services/ModalService";
import type { ProjectRow } from "../../pinia/types/projects.types";
import type { TaskRow } from "../../pinia/types/tasks.types";

// Lazy-load modal components
const ProjectFormModal = defineAsyncComponent(
  () => import("../forms/ProjectFormModal.vue"),
);
const TaskFormModal = defineAsyncComponent(
  () => import("../forms/TaskFormModal.vue"),
);
const ProjectsTableModal = defineAsyncComponent(
  () => import("./ProjectsTableModal.vue"),
);
const TasksTableModal = defineAsyncComponent(
  () => import("./TasksTableModal.vue"),
);
const InviteUserModal = defineAsyncComponent(
  () => import("./InviteUserModal.vue"),
);

const router = useRouter();
const { stats, projects, tasks, busy, load } = useDashboardHome();

// Computed stats with extended data
const activeProjects = computed(
  () => projects.value.filter((p) => p.status === "active").length,
);

const completedTasks = computed(
  () => tasks.value.filter((t) => t.status === "done").length,
);

// Navigation handlers
const goToProjects = () => router.push("/dashboard/projects");
const goToTasks = () => router.push("/dashboard/tasks");

// Open project details modal
const viewProject = async (project: ProjectRow) => {
  const result = await ModalService.open(ProjectFormModal, {
    title: `Editar Projeto: ${project.name}`,
    size: "md",
    data: { project },
  });
  if (result) {
    // Refresh data after edit
    await load();
  }
};

// Open task details modal
const viewTask = async (task: TaskRow) => {
  const result = await ModalService.open(TaskFormModal, {
    title: `Editar Tarefa: ${task.title}`,
    size: "md",
    data: { task },
  });
  if (result) {
    // Refresh data after edit
    await load();
  }
};

// Quick action handlers
const handleQuickAction = async (action: string) => {
  switch (action) {
    case "new-project": {
      const result = await ModalService.open(ProjectFormModal, {
        title: "Criar Novo Projeto",
        size: "md",
      });
      if (result) {
        await load();
      }
      break;
    }
    case "new-task": {
      const result = await ModalService.open(TaskFormModal, {
        title: "Criar Nova Tarefa",
        size: "md",
      });
      if (result) {
        await load();
      }
      break;
    }
    case "invite-user": {
      await ModalService.open(InviteUserModal, {
        title: "Convidar Usuário",
        size: "sm",
      });
      break;
    }
    case "view-reports":
      router.push("/dashboard/reports");
      break;
  }
};

// Stat card click handlers
const handleStatClick = async (stat: string) => {
  console.log("[DashboardHome] handleStatClick:", stat);
  switch (stat) {
    case "total-projects":
      await ModalService.open(ProjectsTableModal, {
        title: "Todos os Projetos",
        size: "xl",
        data: { filter: "all" },
      });
      break;
    case "active-projects":
      await ModalService.open(ProjectsTableModal, {
        title: "Projetos Ativos",
        size: "xl",
        data: { filter: "active" },
      });
      break;
    case "total-tasks":
      await ModalService.open(TasksTableModal, {
        title: "Todas as Tarefas",
        size: "xl",
      });
      break;
    case "completion-rate":
      router.push("/dashboard/reports");
      break;
  }
};
</script>

<template>
  <div class="dashboard-home">
    <!-- Page Header -->
    <header class="dashboard-home__header">
      <div class="dashboard-home__branding">
        <h1 class="dashboard-home__page-title">Painel de Gerenciamento de Projetos</h1>
        <p class="dashboard-home__page-desc">
          Acompanhe, gerencie e colabore em todos os seus projetos e tarefas em
          um só lugar.
        </p>
      </div>
    </header>

    <!-- Welcome Section -->
    <section class="dashboard-home__welcome">
      <div class="dashboard-home__welcome-text">
        <h2 class="dashboard-home__title">Bem-vindo(a) de volta!</h2>
        <p class="dashboard-home__subtitle">
          Veja o que está acontecendo com seus projetos hoje.
        </p>
      </div>
      <button
        class="btn btn-primary"
        type="button"
        title="Atualizar dados do painel"
        @click="load"
        :disabled="busy"
        :aria-busy="busy"
      >
        <svg
          v-if="!busy"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="btn__icon"
        >
          <polyline points="23,4 23,10 17,10" />
          <polyline points="1,20 1,14 7,14" />
          <path
            d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
          />
        </svg>
        <span v-if="busy" class="btn__spinner"></span>
        {{ busy ? "Carregando..." : "Atualizar" }}
      </button>
    </section>

    <!-- Summary Stats Cards -->
    <section class="dashboard-home__section" aria-labelledby="stats-heading">
      <h3 id="stats-heading" class="dashboard-home__section-title">Visão Geral</h3>
      <DashboardSummaryCards
        :projects="stats.projects"
        :tasks="stats.tasks"
        :active-projects="activeProjects"
        :completed-tasks="completedTasks"
        :loading="busy"
        @stat-click="handleStatClick"
      />
    </section>

    <!-- Quick Actions -->
    <section class="dashboard-home__section" aria-labelledby="actions-heading">
      <h3 id="actions-heading" class="dashboard-home__section-title">
        Ações Rápidas
      </h3>
      <QuickActions @action="handleQuickAction" />
    </section>

    <!-- Bento Grid Layout: Projects, Tasks, Activity -->
    <div class="dashboard-home__bento">
      <!-- Projects Column -->
      <section
        class="dashboard-home__bento-item dashboard-home__bento-item--projects"
      >
        <RecentProjects
          :projects="projects"
          :loading="busy"
          :max="5"
          @view-all="goToProjects"
          @view-project="viewProject"
        />
      </section>

      <!-- Tasks Column -->
      <section
        class="dashboard-home__bento-item dashboard-home__bento-item--tasks"
      >
        <RecentTasks
          :tasks="tasks"
          :loading="busy"
          :max="5"
          @view-all="goToTasks"
          @view-task="viewTask"
        />
      </section>

      <!-- Activity Feed -->
      <section
        class="dashboard-home__bento-item dashboard-home__bento-item--activity"
      >
        <ActivityFeed :loading="busy" :max="6" />
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard-home {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  text-align: left;

  &__header {
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-1);
  }

  &__branding {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__page-title {
    margin: 0;
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 800;
    color: var(--text-1);
    letter-spacing: -0.025em;
  }

  &__page-desc {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--text-muted);
  }

  &__welcome {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1.25rem;
    background: var(--surface-1);
    border: 1px solid var(--border-1);
    border-radius: var(--radius-lg, 16px);
  }

  &__welcome-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__title {
    margin: 0;
    font-size: clamp(1.125rem, 3vw, 1.375rem);
    font-weight: 700;
    color: var(--text-1);
  }

  &__subtitle {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--text-muted);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__section-title {
    margin: 0 0 0 0.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  // Notion-style Bento Grid
  &__bento {
    display: grid;
    gap: 1.5rem;

    // Desktop: 3-column bento layout
    @media (min-width: 1024px) {
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: auto;
      grid-template-areas: "projects tasks activity";
    }

    // Tablet: 2-column layout
    @media (min-width: 768px) and (max-width: 1023px) {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "projects tasks"
        "activity activity";
    }

    // Mobile: single column
    @media (max-width: 767px) {
      grid-template-columns: 1fr;
      grid-template-areas:
        "projects"
        "tasks"
        "activity";
    }
  }

  &__bento-item {
    min-width: 0; // Prevent overflow

    &--projects {
      grid-area: projects;
    }

    &--tasks {
      grid-area: tasks;
    }

    &--activity {
      grid-area: activity;
    }
  }
}

.btn__icon {
  width: 1rem;
  height: 1rem;
}

.btn__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
