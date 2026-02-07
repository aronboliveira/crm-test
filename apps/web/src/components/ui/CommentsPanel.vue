<script setup lang="ts">
import { ref, onMounted } from "vue";
import ApiClientService from "../../services/ApiClientService";
import AlertService from "../../services/AlertService";

const props = defineProps<{
  targetType: "task" | "project";
  targetId: string;
}>();

interface Comment {
  id: string;
  authorEmail: string;
  body: string;
  createdAt: string;
}

const items = ref<Comment[]>([]);
const loading = ref(false);
const newBody = ref("");

async function load() {
  try {
    loading.value = true;
    const res = await ApiClientService.comments.list(
      props.targetType,
      props.targetId,
    );
    items.value = res.items ?? [];
  } catch (e) {
    console.error("[CommentsPanel] load failed:", e);
  } finally {
    loading.value = false;
  }
}

async function submit() {
  const body = newBody.value.trim();
  if (!body) return;
  try {
    await ApiClientService.comments.create({
      targetType: props.targetType,
      targetId: props.targetId,
      body,
    });
    newBody.value = "";
    await load();
  } catch (e) {
    console.error("[CommentsPanel] create failed:", e);
    await AlertService.error("Error", "Failed to post comment.");
  }
}

async function remove(id: string) {
  const ok = await AlertService.confirm(
    "Delete Comment",
    "Delete this comment?",
  );
  if (!ok) return;
  try {
    await ApiClientService.comments.remove(id);
    await load();
  } catch (e) {
    console.error("[CommentsPanel] delete failed:", e);
  }
}

onMounted(load);
</script>

<template>
  <section class="comments-panel" aria-label="Comments">
    <h3 class="text-sm font-bold mb-2 opacity-80">
      💬 Comments ({{ items.length }})
    </h3>

    <div v-if="loading" class="text-xs opacity-50 mb-2">Loading…</div>

    <ul class="comment-list" v-if="items.length">
      <li v-for="c in items" :key="c.id" class="comment-item">
        <div class="flex justify-between items-start">
          <span class="text-xs font-semibold">{{ c.authorEmail }}</span>
          <button
            class="text-xs opacity-40 hover:opacity-100"
            type="button"
            @click="remove(c.id)"
          >
            ×
          </button>
        </div>
        <p class="text-sm mt-0.5">{{ c.body }}</p>
        <time class="text-xs opacity-40 block mt-0.5">
          {{ new Date(c.createdAt).toLocaleString() }}
        </time>
      </li>
    </ul>

    <form class="mt-2 flex gap-1" @submit.prevent="submit">
      <input
        v-model="newBody"
        class="flex-1 text-sm px-2 py-1 rounded border border-white/10 bg-transparent"
        placeholder="Write a comment…"
        aria-label="New comment"
      />
      <button
        type="submit"
        class="btn btn-primary btn-sm"
        :disabled="!newBody.trim()"
      >
        Post
      </button>
    </form>
  </section>
</template>

<style lang="scss" scoped>
.comments-panel {
  padding: 0.5rem 0;
}

.comment-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

.comment-item {
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
