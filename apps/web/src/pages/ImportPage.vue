<script setup lang="ts">
import { ref } from "vue";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";

const file = ref<File | null>(null);
const uploading = ref(false);
const resultMsg = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

function onFileChange(ev: Event) {
  const f = (ev.target as HTMLInputElement)?.files?.[0] ?? null;
  file.value = f;
  resultMsg.value = "";
}

async function submit() {
  if (!file.value) return;

  const ext = file.value.name.split(".").pop()?.toLowerCase();
  if (!["csv", "yml", "yaml", "xml"].includes(ext || "")) {
    await AlertService.error(
      "Invalid Format",
      "Only .csv, .yml, and .xml files are supported.",
    );
    return;
  }

  try {
    uploading.value = true;
    const res = await ApiClientService.import.upload(file.value);
    resultMsg.value = res.message || "Import complete.";
    await AlertService.success("Import Complete", resultMsg.value);
    file.value = null;
    if (fileInput.value) fileInput.value.value = "";
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || "Import failed.";
    resultMsg.value = msg;
    await AlertService.error("Import Failed", msg);
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <section class="import-page" aria-label="Import Data">
    <header class="mb-4">
      <h1 class="text-xl font-black">Import</h1>
      <p class="opacity-70 mt-1">
        Upload a CSV, YML, or XML file to bulk-create projects and tasks.
      </p>
    </header>

    <div class="card p-4 max-w-xl" role="region" aria-label="Import form">
      <div class="mb-3">
        <h2 class="font-semibold text-sm mb-1">Expected formats</h2>
        <details class="text-xs opacity-70 mb-2">
          <summary class="cursor-pointer">CSV</summary>
          <pre class="mt-1 bg-black/20 p-2 rounded text-xs overflow-x-auto">
type,name,description,status,priority,dueAt,tags
project,My Project,Description,planned,3,,frontend;backend
task,My Task,Task desc,todo,2,2025-09-01,api</pre
          >
        </details>
        <details class="text-xs opacity-70 mb-2">
          <summary class="cursor-pointer">YML</summary>
          <pre class="mt-1 bg-black/20 p-2 rounded text-xs overflow-x-auto">
- type: project
  name: My Project
  status: planned
- type: task
  name: My Task
  priority: 2</pre
          >
        </details>
        <details class="text-xs opacity-70">
          <summary class="cursor-pointer">XML</summary>
          <pre class="mt-1 bg-black/20 p-2 rounded text-xs overflow-x-auto">
&lt;items&gt;
  &lt;item type="project"&gt;&lt;name&gt;My Project&lt;/name&gt;&lt;/item&gt;
  &lt;item type="task"&gt;&lt;name&gt;My Task&lt;/name&gt;&lt;/item&gt;
&lt;/items&gt;</pre
          >
        </details>
      </div>

      <form @submit.prevent="submit" class="grid gap-3">
        <div>
          <label class="block text-sm font-medium mb-1">Select file</label>
          <input
            ref="fileInput"
            type="file"
            accept=".csv,.yml,.yaml,.xml"
            @change="onFileChange"
            class="text-sm"
          />
        </div>

        <div v-if="file" class="text-xs opacity-70">
          {{ file.name }} ({{ (file.size / 1024).toFixed(1) }} KB)
        </div>

        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!file || uploading"
        >
          {{ uploading ? "Importing…" : "Import" }}
        </button>

        <div
          v-if="resultMsg"
          class="text-sm p-2 rounded"
          :class="
            resultMsg.includes('failed') || resultMsg.includes('Error')
              ? 'bg-red-500/10 text-red-300'
              : 'bg-green-500/10 text-green-300'
          "
        >
          {{ resultMsg }}
        </div>
      </form>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.import-page {
  padding: 1rem;
}
</style>
