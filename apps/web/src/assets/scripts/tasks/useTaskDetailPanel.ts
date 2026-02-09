import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTasksStore } from "../../../pinia/stores/tasks.store";
import type { TaskRow, SubtaskRow } from "../../../pinia/types/tasks.types";
import ApiClientService from "../../../services/ApiClientService";
import AlertService from "../../../services/AlertService";

export function useTaskDetailPanel() {
  const route = useRoute();
  const router = useRouter();
  const tasksStore = useTasksStore();

  const saving = ref(false);
  const newSubtaskText = ref("");

  const activeTaskId = computed(() =>
    typeof route.query.taskId === "string" ? route.query.taskId : null,
  );

  const activeTask = computed<TaskRow | null>(() => {
    if (!activeTaskId.value) return null;
    return tasksStore.byId[activeTaskId.value] ?? null;
  });

  const isOpen = computed(() => !!activeTask.value);

  const subtasks = computed<SubtaskRow[]>(() =>
    activeTask.value?.subtasks
      ? [...activeTask.value.subtasks].sort((a, b) => a.order - b.order)
      : [],
  );

  const completedCount = computed(
    () => subtasks.value.filter((s) => s.done).length,
  );

  const totalCount = computed(() => subtasks.value.length);

  const progressPercent = computed(() =>
    totalCount.value > 0
      ? Math.round((completedCount.value / totalCount.value) * 100)
      : 0,
  );

  const close = () => {
    const { taskId: _, ...rest } = route.query;
    router.replace({ query: rest });
  };

  const persistSubtasks = async (items: SubtaskRow[]) => {
    if (!activeTaskId.value) return;
    saving.value = true;
    try {
      await ApiClientService.tasks.updateSubtasks(activeTaskId.value, items);
      // Refresh the store to reflect changes
      await tasksStore.list({ reset: true });
    } catch (e) {
      console.error("[TaskDetailPanel] Failed to save subtasks:", e);
      await AlertService.error("Falha ao salvar subtarefas", e);
    } finally {
      saving.value = false;
    }
  };

  const toggleSubtask = async (subtaskId: string) => {
    const items = subtasks.value.map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : { ...s },
    );
    await persistSubtasks(items);
  };

  const addSubtask = async () => {
    const text = newSubtaskText.value.trim();
    if (!text) return;

    const items: SubtaskRow[] = [
      ...subtasks.value.map((s) => ({ ...s })),
      {
        id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text,
        done: false,
        order: subtasks.value.length,
      },
    ];

    newSubtaskText.value = "";
    await persistSubtasks(items);
  };

  const removeSubtask = async (subtaskId: string) => {
    const items = subtasks.value
      .filter((s) => s.id !== subtaskId)
      .map((s, i) => ({ ...s, order: i }));
    await persistSubtasks(items);
  };

  const updateSubtaskText = async (subtaskId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const items = subtasks.value.map((s) =>
      s.id === subtaskId ? { ...s, text: trimmed } : { ...s },
    );
    await persistSubtasks(items);
  };

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      todo: "A Fazer",
      doing: "Em Progresso",
      done: "Concluído",
      blocked: "Bloqueado",
    };
    return map[status] || status;
  };

  const priorityLabel = (priority: number): string => {
    const map: Record<number, string> = {
      1: "P1 — Crítica",
      2: "P2 — Alta",
      3: "P3 — Média",
      4: "P4 — Baixa",
      5: "P5 — Mínima",
    };
    return map[priority] || `P${priority}`;
  };

  return {
    activeTask,
    isOpen,
    subtasks,
    completedCount,
    totalCount,
    progressPercent,
    saving,
    newSubtaskText,
    close,
    toggleSubtask,
    addSubtask,
    removeSubtask,
    updateSubtaskText,
    statusLabel,
    priorityLabel,
  };
}
