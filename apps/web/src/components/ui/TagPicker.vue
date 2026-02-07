<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import ApiClientService from "../../services/ApiClientService";

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: string[]): void;
}>();

interface Tag {
  id: string;
  key: string;
  label: string;
  color: string;
}

const allTags = ref<Tag[]>([]);
const search = ref("");
const loading = ref(false);

onMounted(async () => {
  try {
    loading.value = true;
    const res = await ApiClientService.tags.list();
    allTags.value = res.items ?? [];
  } catch (e) {
    console.error("[TagPicker] Failed to load tags:", e);
  } finally {
    loading.value = false;
  }
});

const filtered = computed(() => {
  const q = search.value.toLowerCase();
  return allTags.value.filter(
    (t) =>
      !props.modelValue.includes(t.key) &&
      (t.label.toLowerCase().includes(q) || t.key.includes(q)),
  );
});

const selectedTags = computed(() =>
  allTags.value.filter((t) => props.modelValue.includes(t.key)),
);

function add(key: string) {
  emit("update:modelValue", [...props.modelValue, key]);
  search.value = "";
}

function remove(key: string) {
  emit(
    "update:modelValue",
    props.modelValue.filter((k) => k !== key),
  );
}
</script>

<template>
  <div class="tag-picker" aria-label="Tag picker">
    <!-- selected tags -->
    <div class="flex flex-wrap gap-1 mb-1">
      <span
        v-for="tag in selectedTags"
        :key="tag.key"
        class="tag-chip"
        :style="{ backgroundColor: tag.color + '22', borderColor: tag.color }"
      >
        {{ tag.label }}
        <button
          type="button"
          class="ml-1 opacity-60 hover:opacity-100"
          @click="remove(tag.key)"
          :aria-label="`Remove tag ${tag.label}`"
        >
          ×
        </button>
      </span>
    </div>

    <!-- search / add -->
    <div class="relative">
      <input
        v-model="search"
        class="tag-search-input"
        type="text"
        placeholder="Add tag…"
        aria-label="Search tags"
        autocomplete="off"
      />
      <ul v-if="search && filtered.length" class="tag-dropdown" role="listbox">
        <li
          v-for="t in filtered.slice(0, 10)"
          :key="t.key"
          role="option"
          class="tag-option"
          @click="add(t.key)"
        >
          <span
            class="inline-block w-3 h-3 rounded-full mr-2"
            :style="{ backgroundColor: t.color }"
          ></span>
          {{ t.label }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tag-picker {
  width: 100%;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid;
}

.tag-search-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;

  &:focus {
    outline: 2px solid var(--color-primary, #6366f1);
    outline-offset: 1px;
  }
}

.tag-dropdown {
  position: absolute;
  z-index: 50;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 160px;
  overflow-y: auto;
  background: var(--color-surface, #1e1e2e);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.375rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.tag-option {
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 0.85rem;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}
</style>
