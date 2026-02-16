<script setup lang="ts">
import { ref, onMounted } from "vue";
import ApiClientService from "../../services/ApiClientService";
import AlertService from "../../services/AlertService";

const props = defineProps<{
  targetType: "task" | "project";
  targetId: string;
}>();

interface Note {
  id: string;
  authorEmail: string;
  title: string;
  body: string;
  createdAt: string;
}

const items = ref<Note[]>([]);
const loading = ref(false);
const newTitle = ref("");
const newBody = ref("");

async function load() {
  try {
    loading.value = true;
    const res = await ApiClientService.notes.list(
      props.targetType,
      props.targetId,
    );
    items.value = res.items ?? [];
  } catch (e) {
    console.error("[NotesPanel] load failed:", e);
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!newBody.value.trim()) return;
  try {
    await ApiClientService.notes.create({
      targetType: props.targetType,
      targetId: props.targetId,
      title: newTitle.value.trim() || "Untitled",
      body: newBody.value.trim(),
    });
    newTitle.value = "";
    newBody.value = "";
    await load();
  } catch (e) {
    console.error("[NotesPanel] create failed:", e);
    await AlertService.error("Erro", "Falha ao salvar nota.");
  }
}

async function remove(id: string) {
  const ok = await AlertService.confirm(
    "Excluir nota",
    "Deseja excluir esta nota?",
  );
  if (!ok) return;
  try {
    await ApiClientService.notes.remove(id);
    await load();
  } catch (e) {
    console.error("[NotesPanel] delete failed:", e);
  }
}

onMounted(load);
</script>

<template>
  <section class="notes-panel" aria-label="Notas">
    <h3 class="text-sm font-bold mb-2 opacity-80">
      📝 Notas ({{ items.length }})
    </h3>

    <div v-if="loading" class="text-xs opacity-50 mb-2">Carregando…</div>

    <ul class="notes-list" v-if="items.length">
      <li v-for="n in items" :key="n.id" class="note-item">
        <div class="flex justify-between items-start">
          <span class="text-xs font-semibold">{{ n.title }}</span>
          <button
            class="text-xs opacity-40 hover:opacity-100"
            type="button"
            @click="remove(n.id)"
          >
            ×
          </button>
        </div>
        <p class="text-sm mt-0.5 opacity-90">{{ n.body }}</p>
        <div class="flex gap-2 text-xs opacity-40 mt-0.5">
          <span>{{ n.authorEmail }}</span>
          <time>{{ new Date(n.createdAt).toLocaleString() }}</time>
        </div>
      </li>
    </ul>

    <form class="mt-2 grid gap-1" @submit.prevent="submit">
      <input
        v-model="newTitle"
        class="text-sm px-2 py-1 rounded border border-white/10 bg-transparent"
        placeholder="Título da nota (opcional)"
        aria-label="Título da nota"
      />
      <textarea
        v-model="newBody"
        class="text-sm px-2 py-1 rounded border border-white/10 bg-transparent resize-y"
        rows="2"
        placeholder="Escreva uma nota…"
        aria-label="Corpo da nota"
      />
      <button
        type="submit"
        class="btn btn-primary btn-sm justify-self-end"
        :disabled="!newBody.trim()"
      >
        Salvar nota
      </button>
    </form>
  </section>
</template>

<style lang="scss" scoped>
.notes-panel {
  padding: 0.5rem 0;
}

.notes-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

.note-item {
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
