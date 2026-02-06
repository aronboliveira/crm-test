<script setup lang="ts">
import { useProjectSelect } from "../../assets/scripts/forms/useProjectSelect";

const props = defineProps<{
  modelValue: string;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}>();

const emit = defineEmits<{ (e: "update:modelValue", v: string): void }>();

const { busy, options, label, val, load } = useProjectSelect(props, emit);
</script>

<template>
  <div class="project-select" role="group" :aria-label="label">
    <label class="project-select__label">
      <span class="project-select__text">{{ label }}</span>

      <select
        class="project-select__control"
        :value="val"
        :disabled="disabled || busy"
        :required="required"
        :aria-label="label"
        @change="val = ($event.target as HTMLSelectElement).value"
      >
        <option value="" disabled>Select a project</option>
        <option v-for="p in options" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
      </select>
    </label>

    <button
      class="project-select__refresh"
      type="button"
      :disabled="disabled || busy"
      :aria-disabled="disabled || busy"
      aria-label="Refresh projects"
      @click="load"
    >
      Refresh
    </button>
  </div>
</template>
