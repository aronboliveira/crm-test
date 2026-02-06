import { computed, nextTick, ref, watch } from "vue";
import type { Project, Task } from "@corp/contracts";
import DrawerService from "../../../services/DrawerService";
import DrawerA11yService from "../../../services/DrawerA11yService";
import DateTimeService from "../../../services/DateTimeService";
import { DateValidator } from "@corp/foundations";

import PolicyService from "../../../services/PolicyService";
import EntityPromptService from "../../../services/EntityPromptService";
import AppEventsService from "../../../services/AppEventService";
import AlertService from "../../../services/AlertService";

export function useRowDetailsDrawer() {
  const panel = ref<HTMLElement | null>(null);
  const st = DrawerService.state;

  const busy = ref(false);
  const editing = ref(false);

  const isOpen = computed(() => st.open);
  const kind = computed(() => st.kind);

  const project = computed<Project | null>(() =>
    st.kind === "project" ? (st.payload as Project) : null,
  );
  const task = computed<Task | null>(() =>
    st.kind === "task" ? (st.payload as Task) : null,
  );

  const canEdit = computed(() =>
    kind.value === "project"
      ? PolicyService.can("projects.write")
      : kind.value === "task"
        ? PolicyService.can("tasks.write")
        : false,
  );

  const canDelete = computed(() =>
    kind.value === "project"
      ? PolicyService.can("projects.manage")
      : kind.value === "task"
        ? PolicyService.can("tasks.manage")
        : false,
  );

  const draftP = ref<{ name: string; status: string; description?: string }>({
    name: "",
    status: "active",
    description: "",
  });
  const draftT = ref<{
    projectId: string;
    title: string;
    status: string;
    priority: number;
    dueAt?: string;
    description?: string;
  }>({
    projectId: "",
    title: "",
    status: "todo",
    priority: 3,
    dueAt: "",
    description: "",
  });

  const close = () => {
    try {
      DrawerService.close();
      DrawerA11yService.close();
      editing.value = false;
    } catch (e) {
      console.error("[RowDetailsDrawer] close failed:", e);
    }
  };

  watch(
    () => st.open,
    async (v) => {
      try {
        if (!v) return;

        await nextTick();
        if (panel.value) {
          DrawerA11yService.open(panel.value, close);
        } else {
          console.warn("[RowDetailsDrawer] watch open: no panel element");
        }
      } catch (e) {
        console.error("[RowDetailsDrawer] watch open failed:", e);
      }
    },
  );

  watch(
    () => st.payload,
    () => {
      try {
        editing.value = false;

        if (kind.value === "project" && project.value) {
          const p = project.value as Project;
          draftP.value = {
            name: String(p.name ?? ""),
            status: String(p.status ?? "active"),
            description: String(p.description ?? ""),
          };
        }

        if (kind.value === "task" && task.value) {
          const t = task.value as Task;
          const d = t.dueAt;
          draftT.value = {
            projectId: String(t.projectId ?? ""),
            title: String(t.title ?? ""),
            status: String(t.status ?? "todo"),
            priority: Number(t.priority ?? 3),
            dueAt:
              d && DateValidator.isIso(d)
                ? new Date(d).toISOString().slice(0, 16)
                : "",
            description: String(t.description ?? ""),
          };
        }
      } catch (e) {
        console.error("[RowDetailsDrawer] watch payload failed:", e);
      }
    },
    { immediate: true },
  );

  const toggleEdit = () => {
    try {
      if (canEdit.value) {
        editing.value = !editing.value;
      }
    } catch (e) {
      console.error("[RowDetailsDrawer] toggleEdit failed:", e);
    }
  };

  const save = async () => {
    if (!canEdit.value || busy.value) return;
    busy.value = true;

    try {
      if (kind.value === "project" && project.value) {
        const p = project.value as Project;
        const id = String(p.id);

        if (!id) {
          console.error("[RowDetailsDrawer] save project: no id");
          return;
        }

        const dto = {
          name: draftP.value.name.trim(),
          status: draftP.value.status === "archived" ? "archived" : "active",
          description: draftP.value.description?.trim() || undefined,
        };

        if (!dto.name) {
          await AlertService.error(
            "Failed to save project",
            "Name is required",
          );
          return;
        }

        const success = await EntityPromptService.saveProject(id, dto);
        if (success) {
          editing.value = false;
          AppEventsService.emit("projects:changed");
        }

        return;
      }

      if (kind.value === "task" && task.value) {
        const t = task.value as Task;
        const id = String(t.id);

        if (!id) {
          console.error("[RowDetailsDrawer] save task: no id");
          return;
        }

        const dueIso = draftT.value.dueAt
          ? new Date(draftT.value.dueAt).toISOString()
          : undefined;

        const pr = Number(draftT.value.priority);
        const priority =
          pr === 1 || pr === 2 || pr === 3 || pr === 4 || pr === 5 ? pr : 3;

        const dto = {
          projectId: draftT.value.projectId.trim(),
          title: draftT.value.title.trim(),
          status: draftT.value.status,
          priority,
          dueAt: dueIso && DateValidator.isIso(dueIso) ? dueIso : undefined,
          description: draftT.value.description?.trim() || undefined,
        };

        if (!dto.projectId || !dto.title) return;

        (await EntityPromptService.saveTask(id, dto))
          ? ((editing.value = false), AppEventsService.emit("tasks:changed"))
          : void 0;

        return;
      }
    } finally {
      busy.value = false;
    }
  };

  const del = async () => {
    if (!canDelete.value || busy.value) return;
    busy.value = true;

    try {
      if (kind.value === "project" && project.value) {
        const id = String(project.value.id);
        (await EntityPromptService.confirmDeleteProject(id, project.value.name))
          ? (AppEventsService.emit("projects:changed"), close())
          : void 0;

        return;
      }

      if (kind.value === "task" && task.value) {
        const id = String(task.value.id);
        (await EntityPromptService.confirmDeleteTask(id, task.value.title))
          ? (AppEventsService.emit("tasks:changed"), close())
          : void 0;

        return;
      }
    } finally {
      busy.value = false;
    }
  };

  const dueText = computed(() =>
    task.value?.dueAt && DateValidator.isIso(task.value.dueAt)
      ? DateTimeService.short(task.value.dueAt)
      : "-",
  );

  return {
    panel,
    busy,
    editing,
    isOpen,
    kind,
    project,
    task,
    canEdit,
    canDelete,
    draftP,
    draftT,
    close,
    toggleEdit,
    save,
    del,
    dueText,
    st,
    DateTimeService,
  };
}
