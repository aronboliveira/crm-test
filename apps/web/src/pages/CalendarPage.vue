<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import ApiClientService from "../services/ApiClientService";

interface CalendarTask {
  id: string;
  title: string;
  projectId: string;
  status: string;
  priority: number;
  dueAt: string | null;
  deadlineAt: string | null;
  assigneeEmail: string | null;
}

const tasks = ref<CalendarTask[]>([]);
const loading = ref(false);
const currentDate = ref(new Date());

onMounted(async () => {
  try {
    loading.value = true;
    const res = await ApiClientService.tasks.list();
    tasks.value = (res.items ?? []) as CalendarTask[];
  } catch (e) {
    console.error("[CalendarPage] Failed to load tasks:", e);
  } finally {
    loading.value = false;
  }
});

const year = computed(() => currentDate.value.getFullYear());
const month = computed(() => currentDate.value.getMonth());

const monthLabel = computed(() =>
  currentDate.value.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  }),
);

const daysInMonth = computed(() =>
  new Date(year.value, month.value + 1, 0).getDate(),
);

const firstDayOfWeek = computed(() =>
  new Date(year.value, month.value, 1).getDay(),
);

/** Map of "YYYY-MM-DD" → tasks[] */
const tasksByDate = computed(() => {
  const map: Record<string, CalendarTask[]> = {};
  for (const t of tasks.value) {
    const dateStr = t.dueAt || t.deadlineAt;
    if (!dateStr) continue;
    const key = dateStr.slice(0, 10);
    (map[key] ??= []).push(t);
  }
  return map;
});

function prev() {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() - 1);
  currentDate.value = d;
}

function next() {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() + 1);
  currentDate.value = d;
}

function today() {
  currentDate.value = new Date();
}

function dateKey(day: number): string {
  const m = String(month.value + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year.value}-${m}-${d}`;
}

function isToday(day: number): boolean {
  const now = new Date();
  return (
    now.getFullYear() === year.value &&
    now.getMonth() === month.value &&
    now.getDate() === day
  );
}

const priorityColors: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#22c55e",
  5: "#6b7280",
};

const statusIcons: Record<string, string> = {
  todo: "○",
  doing: "◑",
  done: "●",
  blocked: "✕",
};
</script>

<template>
  <section class="cal-page" aria-label="Visualização do Calendário">
    <header class="cal-header">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Calendário</h1>
        <p class="opacity-70">Tarefas por data de entrega.</p>
      </div>

      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="prev">
          ← Anterior
        </button>
        <span class="font-semibold text-sm min-w-[150px] text-center">
          {{ monthLabel }}
        </span>
        <button class="btn btn-ghost btn-sm" type="button" @click="next">
          Próximo →
        </button>
        <button class="btn btn-ghost btn-sm" type="button" @click="today">
          Hoje
        </button>
      </div>
    </header>

    <div v-if="loading" class="text-center opacity-50 py-8">Carregando…</div>

    <div v-else class="cal-grid mt-4">
      <!-- Week day headers -->
      <div
        v-for="wd in ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']"
        :key="wd"
        class="cal-wd"
      >
        {{ wd }}
      </div>

      <!-- Empty cells before first day -->
      <div
        v-for="_ in firstDayOfWeek"
        :key="'e' + _"
        class="cal-cell cal-empty"
      />

      <!-- Day cells -->
      <div
        v-for="day in daysInMonth"
        :key="day"
        class="cal-cell"
        :class="{ 'cal-today': isToday(day) }"
      >
        <span class="cal-day-num">{{ day }}</span>
        <div class="cal-tasks">
          <div
            v-for="t in (tasksByDate[dateKey(day)] ?? []).slice(0, 3)"
            :key="t.id"
            class="cal-task-chip"
            :title="`[${t.status}] ${t.title}`"
          >
            <span class="mr-0.5">{{ statusIcons[t.status] || "○" }}</span>
            <span
              class="cal-dot"
              :style="{ background: priorityColors[t.priority] || '#6b7280' }"
            />
            <span class="truncate">{{ t.title }}</span>
          </div>
          <div
            v-if="(tasksByDate[dateKey(day)]?.length ?? 0) > 3"
            class="cal-more"
          >
            +{{ (tasksByDate[dateKey(day)]?.length ?? 0) - 3 }} mais
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.cal-page {
  padding: 1rem;
}

.cal-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 0.75rem;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.cal-wd {
  text-align: center;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.5;
  padding: 0.5rem 0;
  background: rgba(0, 0, 0, 0.2);
}

.cal-cell {
  min-height: 90px;
  padding: 0.3rem;
  background: rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  position: relative;

  &.cal-today {
    background: rgba(99, 102, 241, 0.08);
    box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.3);
  }

  &.cal-empty {
    background: rgba(0, 0, 0, 0.15);
  }
}

.cal-day-num {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.7;
}

.cal-tasks {
  margin-top: 0.15rem;
}

.cal-task-chip {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.65rem;
  padding: 0.1rem 0.25rem;
  border-radius: 0.2rem;
  background: rgba(255, 255, 255, 0.06);
  margin-bottom: 1px;
  cursor: default;
  overflow: hidden;
}

.cal-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.cal-more {
  font-size: 0.6rem;
  opacity: 0.5;
  padding: 0.1rem 0.25rem;
}
</style>
