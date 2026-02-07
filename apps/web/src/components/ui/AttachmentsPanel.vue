<script setup lang="ts">
import { ref, onMounted } from "vue";
import ApiClientService from "../../services/ApiClientService";
import AlertService from "../../services/AlertService";

const props = defineProps<{
  targetType: "task" | "project";
  targetId: string;
}>();

interface Attachment {
  id: string;
  uploaderEmail: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

const items = ref<Attachment[]>([]);
const loading = ref(false);
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

async function load() {
  try {
    loading.value = true;
    const res = await ApiClientService.attachments.list(
      props.targetType,
      props.targetId,
    );
    items.value = res.items ?? [];
  } catch (e) {
    console.error("[AttachmentsPanel] load failed:", e);
  } finally {
    loading.value = false;
  }
}

async function upload(ev: Event) {
  const file = (ev.target as HTMLInputElement)?.files?.[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    await AlertService.error("Too Large", "Max file size is 10 MB.");
    return;
  }

  try {
    uploading.value = true;
    await ApiClientService.attachments.upload(
      file,
      props.targetType,
      props.targetId,
    );
    await load();
  } catch (e) {
    console.error("[AttachmentsPanel] upload failed:", e);
    await AlertService.error("Error", "Upload failed.");
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

function download(att: Attachment) {
  const url = ApiClientService.attachments.downloadUrl(att.id);
  window.open(url, "_blank");
}

async function remove(id: string) {
  const ok = await AlertService.confirm(
    "Delete Attachment",
    "Delete this file?",
  );
  if (!ok) return;
  try {
    await ApiClientService.attachments.remove(id);
    await load();
  } catch (e) {
    console.error("[AttachmentsPanel] delete failed:", e);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

onMounted(load);
</script>

<template>
  <section class="attachments-panel" aria-label="Attachments">
    <h3 class="text-sm font-bold mb-2 opacity-80">
      📎 Attachments ({{ items.length }})
    </h3>

    <div v-if="loading" class="text-xs opacity-50 mb-2">Loading…</div>

    <ul class="att-list" v-if="items.length">
      <li v-for="a in items" :key="a.id" class="att-item">
        <div class="flex justify-between items-center">
          <button
            type="button"
            class="text-sm font-medium underline cursor-pointer truncate max-w-[200px]"
            :title="a.fileName"
            @click="download(a)"
          >
            {{ a.fileName }}
          </button>
          <div class="flex gap-2 items-center">
            <span class="text-xs opacity-50">{{
              formatSize(a.sizeBytes)
            }}</span>
            <button
              type="button"
              class="text-xs opacity-40 hover:opacity-100"
              @click="remove(a.id)"
            >
              ×
            </button>
          </div>
        </div>
        <div class="text-xs opacity-40">
          {{ a.uploaderEmail }} · {{ new Date(a.createdAt).toLocaleString() }}
        </div>
      </li>
    </ul>

    <div class="mt-2">
      <label
        class="btn btn-ghost btn-sm cursor-pointer inline-flex items-center gap-1"
      >
        {{ uploading ? "Uploading…" : "Upload file" }}
        <input
          ref="fileInput"
          type="file"
          class="sr-only"
          :disabled="uploading"
          @change="upload"
        />
      </label>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.attachments-panel {
  padding: 0.5rem 0;
}

.att-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 160px;
  overflow-y: auto;
}

.att-item {
  padding: 0.35rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
