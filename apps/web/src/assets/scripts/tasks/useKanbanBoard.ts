import { computed, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useTasksStore } from "../../../pinia/stores/tasks.store";
import type { TaskRow, TaskStatus } from "../../../pinia/types/tasks.types";
import ApiClientService from "../../../services/ApiClientService";
import AlertService from "../../../services/AlertService";

export interface KanbanColumn {
  id: TaskStatus;
  label: string;
  color: string;
  items: TaskRow[];
}

const COLUMN_DEFS: ReadonlyArray<{
  id: TaskStatus;
  label: string;
  color: string;
}> = [
  { id: "todo", label: "A Fazer", color: "var(--text-muted, #94a3b8)" },
  { id: "doing", label: "Em Progresso", color: "var(--primary, #6366f1)" },
  { id: "done", label: "Concluído", color: "var(--success, #22c55e)" },
  { id: "blocked", label: "Bloqueado", color: "var(--danger, #ef4444)" },
];

export function useKanbanBoard() {
  const store = useTasksStore();
  const router = useRouter();
  const route = useRoute();

  const dragging = ref<string | null>(null);
  const dragOverCol = ref<TaskStatus | null>(null);
  const updating = ref(false);

  /* ── Computed columns ─────────────────────────────── */

  const columns = computed<KanbanColumn[]>(() =>
    COLUMN_DEFS.map((def) => ({
      ...def,
      items: store.rows.filter(
        (t) => (t?.status ?? "todo") === def.id,
      ) as TaskRow[],
    })),
  );

  const totalTasks = computed(() => store.rows.length);

  /* ── Drag & Drop ──────────────────────────────────── */

  function onDragStart(ev: DragEvent, taskId: string) {
    if (!ev.dataTransfer) return;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", taskId);
    dragging.value = taskId;
  }

  function onDragOver(ev: DragEvent, colId: TaskStatus) {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
    dragOverCol.value = colId;
  }

  function onDragLeave(_ev: DragEvent, colId: TaskStatus) {
    if (dragOverCol.value === colId) dragOverCol.value = null;
  }

  async function onDrop(ev: DragEvent, targetStatus: TaskStatus) {
    ev.preventDefault();
    dragOverCol.value = null;

    const taskId = ev.dataTransfer?.getData("text/plain") || dragging.value;
    dragging.value = null;
    if (!taskId) return;

    const task = store.byId[taskId];
    if (!task || task.status === targetStatus) return;

    updating.value = true;
    try {
      await ApiClientService.tasks.update(taskId, { status: targetStatus });
      // Optimistic update in store
      store.byId[taskId] = { ...task, status: targetStatus } as TaskRow;
    } catch (e: unknown) {
      console.error("[KanbanBoard] Status update failed:", e);
      await AlertService.error(
        "Erro",
        `Falha ao mover "${task.title}" para ${targetStatus}.`,
      );
    } finally {
      updating.value = false;
    }
  }

  /* ── Card click ───────────────────────────────────── */

  function openTask(id: string) {
    router.push({
      path: route.path,
      query: { ...route.query, taskId: id },
    });
  }

  /* ── Priority helpers ─────────────────────────────── */

  const PRIORITY_LABELS: Record<number, string> = {
    1: "P1",
    2: "P2",
    3: "P3",
    4: "P4",
    5: "P5",
  };

  function priorityTag(p: number): string {
    return PRIORITY_LABELS[p] ?? `P${p}`;
  }

  function subtaskProgress(task: TaskRow): string {
    const arr = task.subtasks ?? [];
    if (!arr.length) return "";
    const done = arr.filter((s) => s.done).length;
    return `${done}/${arr.length}`;
  }

  return {
    columns,
    totalTasks,
    dragging,
    dragOverCol,
    updating,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    openTask,
    priorityTag,
    subtaskProgress,
  };
}
