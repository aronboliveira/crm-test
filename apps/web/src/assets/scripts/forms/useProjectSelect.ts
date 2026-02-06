import { computed, onMounted, ref } from "vue";
import type { ProjectOption } from "../../../types/options.types";
import ProjectsOptionsService from "../../../services/ProjectsOptionsService";
import AlertService from "../../../services/AlertService";

export interface ProjectSelectProps {
  modelValue: string;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface ProjectSelectEmits {
  (e: "update:modelValue", v: string): void;
}

export function useProjectSelect(
  props: ProjectSelectProps,
  emit: ProjectSelectEmits,
) {
  const busy = ref(false);
  const options = ref<readonly ProjectOption[]>([]);

  const label = computed(() => props.ariaLabel || "Project");
  const val = computed({
    get: () => props.modelValue,
    set: (v) => emit("update:modelValue", v),
  });

  const load = async () => {
    if (busy.value) return;
    busy.value = true;

    try {
      const result = await ProjectsOptionsService.active();
      options.value = Array.isArray(result) ? result : [];
    } catch (e) {
      console.error("[ProjectSelect] load failed:", e);
      await AlertService.error("Failed to load project options", e);
      options.value = [];
    } finally {
      busy.value = false;
    }
  };

  onMounted(async () => {
    try {
      await load();
    } catch (e) {
      console.error("[ProjectSelect] mount failed:", e);
    }
  });

  return { busy, options, label, val, load };
}
