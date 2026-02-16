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
            aria-label="Excluir"
            @click="del"
          >
            Excluir
          </button>

          <button
            v-if="canEdit"
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="busy"
            :aria-disabled="busy"
            :aria-label="editing ? 'Cancelar edição' : 'Editar'"
            @click="toggleEdit"
          >
            {{ editing ? "Cancelar" : "Editar" }}
          </button>

          <button
            class="btn btn-ghost btn-sm"
            type="button"
            aria-label="Fechar painel"
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
            aria-label="Formulário de edição de projeto"
            @submit.prevent="save"
          >
            <label class="grid gap-1">
              <span class="font-semibold">Nome</span>
              <input
                class="table-search-input"
                required
                v-model="draftP.name"
                aria-label="Nome do projeto"
              />
            </label>

            <label class="grid gap-1">
              <span class="font-semibold">Status</span>
              <select
                class="table-search-input"
                v-model="draftP.status"
                aria-label="Status do projeto"
              >
                <option value="active">Ativo</option>
                <option value="archived">Arquivado</option>
              </select>
            </label>

            <label class="grid gap-1">
              <span class="font-semibold">Descrição</span>
              <textarea
                class="table-search-input min-h-[120px]"
                v-model="draftP.description"
                aria-label="Descrição do projeto"
              ></textarea>
            </label>

            <div class="flex justify-end gap-2">
              <button
                class="btn btn-primary"
                type="submit"
                :disabled="busy"
                :aria-disabled="busy"
              >
                Salvar
              </button>
            </div>
          </form>

          <dl v-else class="kv" aria-label="Detalhes do projeto">
            <div class="kv-row">
              <dt class="kv-k">Nome</dt>
              <dd class="kv-v">{{ project.name }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Status</dt>
              <dd class="kv-v">{{ project.status }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Atualizado</dt>
              <dd class="kv-v">
                {{ DateTimeService.short(project.updatedAt) }}
              </dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Criado</dt>
              <dd class="kv-v">
                {{ DateTimeService.short(project.createdAt) }}
              </dd>
            </div>
            <div v-if="project.description" class="kv-row">
              <dt class="kv-k">Descrição</dt>
              <dd class="kv-v kv-v-pre">{{ project.description }}</dd>
            </div>
          </dl>
        </template>

        <template v-else-if="kind === 'task' && task">
          <form
            v-if="editing"
            class="grid gap-3"
            aria-label="Formulário de edição de tarefa"
            @submit.prevent="save"
          >
            <label class="grid gap-1">
              <span class="font-semibold">ID do projeto</span>
              <ProjectSelect
                v-model="draftT.projectId"
                :required="true"
                :disabled="busy"
                aria-label="Projeto"
              />
            </label>

            <label class="grid gap-1">
              <span class="font-semibold">Título</span>
              <input
                class="table-search-input"
                required
                v-model="draftT.title"
                aria-label="Título da tarefa"
              />
            </label>

            <div class="grid grid-cols-2 gap-3">
              <label class="grid gap-1">
                <span class="font-semibold">Status</span>
                <select
                  class="table-search-input"
                  v-model="draftT.status"
                  aria-label="Status da tarefa"
                >
                  <option value="todo">A fazer</option>
                  <option value="doing">Em andamento</option>
                  <option value="done">Concluída</option>
                  <option value="blocked">Bloqueada</option>
                </select>
              </label>

              <label class="grid gap-1">
                <span class="font-semibold">Prioridade</span>
                <select
                  class="table-search-input"
                  v-model.number="draftT.priority"
                  aria-label="Prioridade da tarefa"
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
              <span class="font-semibold">Prazo (opcional)</span>
              <input
                class="table-search-input"
                type="datetime-local"
                v-model="draftT.dueAt"
                aria-label="Data de vencimento"
              />
            </label>

            <label class="grid gap-1">
              <span class="font-semibold">Descrição</span>
              <textarea
                class="table-search-input min-h-[120px]"
                v-model="draftT.description"
                aria-label="Descrição da tarefa"
              ></textarea>
            </label>

            <div class="flex justify-end gap-2">
              <button
                class="btn btn-primary"
                type="submit"
                :disabled="busy"
                :aria-disabled="busy"
              >
                Salvar
              </button>
            </div>
          </form>

          <dl v-else class="kv" aria-label="Detalhes da tarefa">
            <div class="kv-row">
              <dt class="kv-k">Título</dt>
              <dd class="kv-v">{{ task.title }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Status</dt>
              <dd class="kv-v">{{ task.status }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Prioridade</dt>
              <dd class="kv-v">{{ task.priority }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Prazo</dt>
              <dd class="kv-v">{{ dueText }}</dd>
            </div>
            <div class="kv-row">
              <dt class="kv-k">Atualizado</dt>
              <dd class="kv-v">{{ DateTimeService.short(task.updatedAt) }}</dd>
            </div>
            <div v-if="task.description" class="kv-row">
              <dt class="kv-k">Descrição</dt>
              <dd class="kv-v kv-v-pre">{{ task.description }}</dd>
            </div>
          </dl>
        </template>

        <div v-else class="drawer-empty" aria-live="polite">Sem detalhes.</div>
      </div>
    </aside>
  </div>
</template>
