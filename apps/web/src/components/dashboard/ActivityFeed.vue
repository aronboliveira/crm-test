<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

interface ActivityItem {
  id: string;
  type:
    | "project_created"
    | "task_completed"
    | "task_created"
    | "project_updated"
    | "user_joined";
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

interface Props {
  loading?: boolean;
  max?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  max: 8,
});

// Mock activity data for demo - in real app, this would come from an API
const activities = ref<ActivityItem[]>([]);

const generateMockActivities = (): ActivityItem[] => {
  const types: ActivityItem["type"][] = [
    "project_created",
    "task_completed",
    "task_created",
    "project_updated",
    "user_joined",
  ];

  const projectNames = [
    "Website Redesign",
    "Mobile App",
    "API Integration",
    "Dashboard",
    "Analytics",
  ];
  const taskNames = [
    "Design mockups",
    "Fix bugs",
    "Write tests",
    "Code review",
    "Deploy to prod",
  ];
  const users = [
    "alice@corp.local",
    "bob@corp.local",
    "charlie@corp.local",
    "admin@corp.local",
  ];

  const items: ActivityItem[] = [];
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const timestamp = new Date(
      now - i * 3600000 * (1 + Math.random() * 5),
    ).toISOString();

    let title = "";
    let description = "";

    switch (type) {
      case "project_created":
        title = "New project created";
        description =
          projectNames[Math.floor(Math.random() * projectNames.length)];
        break;
      case "task_completed":
        title = "Task completed";
        description = taskNames[Math.floor(Math.random() * taskNames.length)];
        break;
      case "task_created":
        title = "New task added";
        description = taskNames[Math.floor(Math.random() * taskNames.length)];
        break;
      case "project_updated":
        title = "Project updated";
        description =
          projectNames[Math.floor(Math.random() * projectNames.length)];
        break;
      case "user_joined":
        title = "User joined team";
        description = user.split("@")[0];
        break;
    }

    items.push({ id: `act_${i}`, type, title, description, timestamp, user });
  }

  return items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
};

onMounted(() => {
  activities.value = generateMockActivities();
});

const displayActivities = computed(() => activities.value.slice(0, props.max));

const formatTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Unknown";
  }
};

const activityIcons: Record<ActivityItem["type"], string> = {
  project_created: "folder-plus",
  task_completed: "check-circle",
  task_created: "plus-circle",
  project_updated: "edit",
  user_joined: "user-plus",
};

const activityColors: Record<ActivityItem["type"], string> = {
  project_created: "activity--project",
  task_completed: "activity--success",
  task_created: "activity--task",
  project_updated: "activity--info",
  user_joined: "activity--user",
};
</script>

<template>
  <section class="activity-feed card" aria-label="Recent activity">
    <header class="card-head">
      <h3 class="card-title">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="card-title__icon"
        >
          <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
        </svg>
        Recent Activity
      </h3>
    </header>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="activity-loading"
      role="status"
      aria-label="Loading activity"
    >
      <div v-for="i in 4" :key="i" class="skeleton-activity">
        <div class="skeleton skeleton-icon"></div>
        <div class="skeleton-activity__content">
          <div class="skeleton skeleton-text" style="width: 60%"></div>
          <div class="skeleton skeleton-text-sm" style="width: 40%"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!displayActivities.length" class="activity-empty">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="activity-empty__icon"
      >
        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
      </svg>
      <p class="activity-empty__text">No recent activity</p>
    </div>

    <!-- Activity List -->
    <ul v-else class="activity-list" role="list">
      <li
        v-for="activity in displayActivities"
        :key="activity.id"
        class="activity-item"
        :class="activityColors[activity.type]"
        role="listitem"
      >
        <div class="activity-item__icon">
          <!-- Project Created -->
          <svg
            v-if="activity.type === 'project_created'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          <!-- Task Completed -->
          <svg
            v-else-if="activity.type === 'task_completed'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
          <!-- Task Created -->
          <svg
            v-else-if="activity.type === 'task_created'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <!-- Project Updated -->
          <svg
            v-else-if="activity.type === 'project_updated'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
            />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <!-- User Joined -->
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>
        <div class="activity-item__content">
          <span class="activity-item__title">{{ activity.title }}</span>
          <span class="activity-item__desc">{{ activity.description }}</span>
        </div>
        <time class="activity-item__time" :datetime="activity.timestamp">
          {{ formatTime(activity.timestamp) }}
        </time>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.activity-feed {
  min-height: 200px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__icon {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--info);
  }
}

.activity-loading {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-activity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;

  &__content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }
}

.skeleton-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
}

.skeleton-text {
  height: 1rem;
  border-radius: 4px;
}

.skeleton-text-sm {
  height: 0.75rem;
  border-radius: 4px;
}

.activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;

  &__icon {
    width: 3rem;
    height: 3rem;
    color: var(--text-muted);
    opacity: 0.5;
    margin-bottom: 1rem;
  }

  &__text {
    font-weight: 600;
    color: var(--text-2);
    margin: 0;
  }
}

.activity-list {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 340px;
  overflow-y: auto;
  flex: 1;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-1);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    flex-shrink: 0;

    svg {
      width: 1rem;
      height: 1rem;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-1);
  }

  &__desc {
    font-size: 0.8125rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__time {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }
}

// Activity type colors
.activity {
  &--project .activity-item__icon {
    background: color-mix(in oklab, var(--primary) 15%, transparent);
    color: var(--primary);
  }

  &--success .activity-item__icon {
    background: color-mix(in oklab, var(--success) 15%, transparent);
    color: var(--success);
  }

  &--task .activity-item__icon {
    background: color-mix(in oklab, var(--info) 15%, transparent);
    color: var(--info);
  }

  &--info .activity-item__icon {
    background: color-mix(in oklab, var(--warning) 15%, transparent);
    color: var(--warning);
  }

  &--user .activity-item__icon {
    background: color-mix(in oklab, #8b5cf6 15%, transparent);
    color: #8b5cf6;
  }
}
</style>
