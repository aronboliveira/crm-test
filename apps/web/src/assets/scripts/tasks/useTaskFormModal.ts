import { nextTick, ref, computed, reactive, watch } from "vue";
import AlertService from "../../../services/AlertService";
import ApiClientService from "../../../services/ApiClientService";
import FormPersistenceService from "../../../services/FormPersistenceService";
import FocusableDialogService from "../../../services/FocusableDialogService";

type TaskForm = {
  title: string;
  description: string;
  priority: number;
};

export interface TaskFormModalProps {
  open: boolean;
}

export interface TaskFormModalEmits {
  (e: "update:open", v: boolean): void;
  (e: "created"): void;
}

export function useTaskFormModal(
  props: TaskFormModalProps,
  emit: TaskFormModalEmits,
) {
  const dialogEl = ref<HTMLElement | null>(null);

  const formId = "task-create";
  const persisted = FormPersistenceService.restore(formId);

  const form = reactive<TaskForm>({
    title: typeof persisted.title === "string" ? persisted.title : "",
    description:
      typeof persisted.description === "string" ? persisted.description : "",
    priority: Number.isFinite(Number(persisted.priority))
      ? Number(persisted.priority)
      : 3,
  });

  const canSave = computed(() => form.title.trim().length >= 3);

  watch(
    () => props.open,
    async (v) => {
      try {
        if (!v) {
          FocusableDialogService.close();
          return;
        }

        await nextTick();
        if (dialogEl.value) {
          FocusableDialogService.open(dialogEl.value, { onClose: close });
        } else {
          console.warn("[TaskFormModal] watch: no dialog element");
        }
      } catch (e) {
        console.error("[TaskFormModal] watch open failed:", e);
      }
    },
  );

  watch(
    () => ({ ...form }),
    (v) => FormPersistenceService.persist(formId, v),
    { deep: true },
  );

  const close = () => emit("update:open", false);

  const submit = async () => {
    if (!canSave.value) return;

    try {
      if (!form.title?.trim()) {
        await AlertService.error("Failed to create task", "Title is required");
        return;
      }

      if (
        !Number.isFinite(form.priority) ||
        form.priority < 1 ||
        form.priority > 5
      ) {
        console.warn(
          "[TaskFormModal] submit: invalid priority, using default 3",
        );
        form.priority = 3;
      }

      await ApiClientService.tasks.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
      });

      FormPersistenceService.clear(formId);
      emit("created");
      emit("update:open", false);
      await AlertService.success("Task created");
    } catch (e) {
      console.error("[TaskFormModal] submit failed:", e);
      await AlertService.error("Failed to create task", e);
    }
  };

  return { formId, dialogEl, form, canSave, close, submit };
}
