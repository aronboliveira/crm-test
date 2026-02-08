<script setup lang="ts">
import { defineAsyncComponent, ref, computed } from "vue";
import { useDashboardProjectsPage } from "../assets/scripts/pages/useDashboardProjectsPage";
import ModalService from "../services/ModalService";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";
import type { ProjectRow } from "../pinia/types/projects.types";
import type { FilterState } from "../components/ui/AdvancedFilter.vue";

const ProjectFormModal = defineAsyncComponent(
  () => import("../components/forms/ProjectFormModal.vue"),
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

const { rows, loading, error, nextCursor, q, load, more } =
  useDashboardProjectsPage();

const filter = ref<FilterState>({
  status: "",
  priority: "",
  assignee: "",
  tag: "",
  dueBefore: "",
  dueAfter: "",
});

const selectedProject = ref<ProjectRow | null>(null);

const filteredRows = computed(() => {
  let out = rows.value;
  const f = filter.value;
  if (f.status) out = out.filter((p) => p?.status === f.status);
  if (f.tag) out = out.filter((p) => (p as any)?.tags?.includes(f.tag));
  if (f.dueAfter) out = out.filter((p) => (p?.dueAt || "") >= f.dueAfter);
  if (f.dueBefore) out = out.filter((p) => (p?.dueAt || "") <= f.dueBefore);
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

const openCreateProject = async () => {
  const result = await ModalService.open(ProjectFormModal, {
    title: "Criar Novo Projeto",
    size: "md",
  });
  if (result) await load(true);
};

const openEditProject = async (project: ProjectRow) => {
  const result = await ModalService.open(ProjectFormModal, {
    title: `Editar Projeto: ${project.name}`,
    size: "md",
    data: { project },
  });
  if (result) await load(true);
};

const deleteProject = async (project: ProjectRow) => {
  const confirmed = await AlertService.confirm(
    "Excluir Projeto",
    `Tem certeza que deseja excluir "${project.name}"? Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;
  try {
    await ApiClientService.projects.remove(project.id);
    await AlertService.success("Excluído", `"${project.name}" foi excluído.`);
    selectedProject.value = null;
    await load(true);
  } catch (e) {
    console.error("[DashboardProjectsPage] Delete failed:", e);
    await AlertService.error("Erro", "Falha ao excluir projeto.");
  }
};

const projectStatusOptions = [
  { label: "Planejado", value: "planned" },
  { label: "Ativo", value: "active" },
  { label: "Bloqueado", value: "blocked" },
  { label: "Concluído", value: "done" },
  { label: "Arquivado", value: "archived" },
];
</script>

<template>
  <section class="dp-page" aria-label="Projetos">
    <header class="dp-actions">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Projetos</h1>
        <p class="opacity-70">Gerencie seus projetos.</p>
      </div>

      <div class="flex gap-2 items-center flex-wrap">
        <input
          class="table-search-input"
          v-model="q"
          name="q"
          aria-label="Buscar projetos"
          placeholder="buscar"
          @keyup.enter="load(true)"
        />
        <AdvancedFilter
          :status-options="projectStatusOptions"
          @filter="onFilter"
          @reset="onReset"
        />
        <button
          class="btn btn-primary"
          type="button"
          @click="openCreateProject"
        >
          + Novo
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

    <div class="dp-layout mt-3">
      <!-- Table -->
      <div
        class="dp-card card p-2 overflow-auto flex-1"
        role="region"
        aria-label="Tabela de projetos"
      >
        <table class="min-w-[1100px] w-full" role="table" aria-label="Projetos">
          <thead>
            <tr class="text-left opacity-80">
              <th class="py-2 pr-3">Código</th>
              <th class="py-2 pr-3">Nome</th>
              <th class="py-2 pr-3">Responsável</th>
              <th class="py-2 pr-3">Status</th>
              <th class="py-2 pr-3">Tags</th>
              <th class="py-2 pr-3">Prazo</th>
              <th class="py-2 pr-3">Entrega</th>
              <th class="py-2 pr-3">Ações</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="p in filteredRows"
              :key="p?.id || (Math.random() * Math.random()).toString(36)"
              class="border-t border-white/10 cursor-pointer"
              :class="{ 'bg-white/5': selectedProject?.id === p?.id }"
              @click="selectedProject = p ?? null"
            >
              <td class="py-2 pr-3 font-semibold">{{ p?.code ?? "-" }}</td>
              <td class="py-2 pr-3">{{ p?.name ?? "-" }}</td>
              <td class="py-2 pr-3">{{ p?.ownerEmail ?? "-" }}</td>
              <td class="py-2 pr-3">{{ p?.status ?? "-" }}</td>
              <td class="py-2 pr-3">
                <div class="flex gap-0.5 flex-wrap">
                  <span
                    v-for="tag in ((p as any)?.tags ?? []).slice(0, 3)"
                    :key="tag"
                    class="text-xs bg-emerald-500/15 px-1 rounded"
                  >
                    {{ tag }}
                  </span>
                </div>
              </td>
              <td class="py-2 pr-3">
                {{ (p as any)?.deadlineAt?.slice(0, 10) ?? "-" }}
              </td>
              <td class="py-2 pr-3">{{ p?.dueAt?.slice(0, 10) ?? "-" }}</td>
              <td class="py-2 pr-3">
                <div class="flex gap-1">
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Editar projeto"
                    @click.stop="openEditProject(p!)"
                  >
                    Editar
                  </button>
                  <button
                    class="btn btn-ghost btn-sm text-danger"
                    type="button"
                    aria-label="Excluir projeto"
                    @click.stop="deleteProject(p!)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!filteredRows.length && !loading">
              <td colspan="8" class="py-6 opacity-70 text-center">
                {{ error || "Nenhum projeto." }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail sidebar -->
      <aside
        v-if="selectedProject"
        class="dp-detail card p-3 overflow-y-auto"
        aria-label="Detalhes do projeto"
      >
        <div class="flex justify-between items-start mb-2">
          <h2 class="font-bold text-sm">{{ selectedProject.name }}</h2>
          <button
            class="text-xs opacity-40 hover:opacity-100"
            @click="selectedProject = null"
          >
            ✕
          </button>
        </div>

        <div class="text-xs opacity-60 mb-3">
          Status: {{ selectedProject.status }}
          <span v-if="selectedProject.ownerEmail">
            · {{ selectedProject.ownerEmail }}
          </span>
        </div>

        <CommentsPanel
          :target-type="'project'"
          :target-id="selectedProject.id"
        />
        <NotesPanel :target-type="'project'" :target-id="selectedProject.id" />
        <AttachmentsPanel
          :target-type="'project'"
          :target-id="selectedProject.id"
        />
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
@keyframes dpIn {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.dp-actions {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
}

.dp-card {
  animation: dpIn 160ms ease both;

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

.dp-page {
  padding: 1rem;
}

.dp-layout {
  display: flex;
  gap: 1rem;
}

.dp-detail {
  width: 340px;
  min-width: 280px;
  max-height: calc(100vh - 200px);
}

@media (max-width: 960px) {
  .dp-layout {
    flex-direction: column;
  }
  .dp-detail {
    width: 100%;
    max-height: 50vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dp-card {
    animation: none;
  }
}

@starting-style {
  .dp-card {
    opacity: 0;
    transform: translateY(8px);
  }
}

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
