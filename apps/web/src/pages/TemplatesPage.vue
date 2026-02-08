<script setup lang="ts">
import { ref, onMounted } from "vue";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";

interface TemplateTask {
  title: string;
  description: string;
  priority: number;
  offsetDays: number;
}

interface ProjectTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  tasks: TemplateTask[];
  defaultTags: string[];
}

const templates = ref<ProjectTemplate[]>([]);
const loading = ref(false);
const expanded = ref<string | null>(null);

onMounted(async () => {
  try {
    loading.value = true;
    const res = await ApiClientService.templates.list();
    templates.value = res.items ?? [];
  } catch (e) {
    console.error("[TemplatesPage] Load failed:", e);
  } finally {
    loading.value = false;
  }
});

async function applyTemplate(tmpl: ProjectTemplate) {
  const ok = await AlertService.confirm(
    "Criar a partir do Modelo",
    `Criar um novo projeto usando "${tmpl.name}"? Serão criadas ${tmpl.tasks.length} tarefas.`,
  );
  if (!ok) return;

  try {
    // Create the project
    const proj = await ApiClientService.projects.create({
      name: `${tmpl.name} — ${new Date().toLocaleDateString()}`,
      description: tmpl.description,
      status: "planned",
      tags: tmpl.defaultTags,
      templateKey: tmpl.key,
    } as any);

    // Create each task from the blueprint
    const baseDate = Date.now();
    for (const t of tmpl.tasks) {
      const dueAt = new Date(
        baseDate + t.offsetDays * 86_400_000,
      ).toISOString();
      await ApiClientService.tasks.create({
        projectId: proj.id,
        title: t.title,
        description: t.description || undefined,
        priority: t.priority,
        dueAt,
        status: "todo",
        tags: tmpl.defaultTags,
      } as any);
    }

    await AlertService.success(
      "Criado",
      `Projeto e ${tmpl.tasks.length} tarefas criados a partir de "${tmpl.name}".`,
    );
  } catch (e) {
    console.error("[TemplatesPage] Apply failed:", e);
    await AlertService.error("Erro", "Falha ao criar a partir do modelo.");
  }
}

function toggle(key: string) {
  expanded.value = expanded.value === key ? null : key;
}
</script>

<template>
  <section class="templates-page" aria-label="Modelos de Projeto">
    <header class="mb-4">
      <h1 class="text-xl font-black">Modelos de Projeto</h1>
      <p class="opacity-70 mt-1">
        Inicie um novo projeto a partir de um modelo com tarefas pré-definidas.
      </p>
    </header>

    <div v-if="loading" class="opacity-50">Carregando…</div>

    <div v-else class="grid gap-3 max-w-3xl">
      <div
        v-for="tmpl in templates"
        :key="tmpl.key"
        class="card p-3"
        role="article"
      >
        <div class="flex justify-between items-start">
          <div>
            <h2 class="font-bold text-sm">{{ tmpl.name }}</h2>
            <p class="text-xs opacity-60 mt-0.5">{{ tmpl.description }}</p>
            <div class="flex gap-1 mt-1">
              <span class="text-xs bg-white/10 px-1.5 py-0.5 rounded">
                {{ tmpl.category }}
              </span>
              <span class="text-xs bg-white/10 px-1.5 py-0.5 rounded">
                {{ tmpl.tasks.length }} tarefas
              </span>
              <span
                v-for="tag in tmpl.defaultTags.slice(0, 3)"
                :key="tag"
                class="text-xs bg-indigo-500/15 px-1.5 py-0.5 rounded"
              >
                {{ tag }}
              </span>
            </div>
          </div>
          <div class="flex gap-1">
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              @click="toggle(tmpl.key)"
            >
              {{ expanded === tmpl.key ? "Ocultar" : "Visualizar" }}
            </button>
            <button
              class="btn btn-primary btn-sm"
              type="button"
              @click="applyTemplate(tmpl)"
            >
              Usar
            </button>
          </div>
        </div>

        <div
          v-if="expanded === tmpl.key"
          class="mt-2 border-t border-white/10 pt-2"
        >
          <table class="w-full text-xs">
            <thead>
              <tr class="opacity-60">
                <th class="text-left py-1">Tarefa</th>
                <th class="text-left py-1">Prioridade</th>
                <th class="text-left py-1">Deslocamento</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(t, i) in tmpl.tasks"
                :key="i"
                class="border-t border-white/5"
              >
                <td class="py-1">{{ t.title }}</td>
                <td class="py-1">P{{ t.priority }}</td>
                <td class="py-1">+{{ t.offsetDays }}d</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.templates-page {
  padding: 1rem;
}
</style>
