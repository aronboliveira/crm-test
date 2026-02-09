<script setup lang="ts">
interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "blue" | "green" | "amber" | "red" | "gray";
}

withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  icon: undefined,
  trend: undefined,
  trendValue: undefined,
  color: "blue",
});

const colorClasses = {
  blue: "stat-card--blue",
  green: "stat-card--green",
  amber: "stat-card--amber",
  red: "stat-card--red",
  gray: "stat-card--gray",
};
</script>

<template>
  <div class="stat-card card" :class="colorClasses[color]">
    <div class="stat-card__header">
      <span v-if="icon" class="stat-card__icon">{{ icon }}</span>
      <h3 class="stat-card__title">{{ title }}</h3>
    </div>
    <div class="stat-card__body">
      <p class="stat-card__value">{{ value }}</p>
      <p v-if="subtitle" class="stat-card__subtitle">{{ subtitle }}</p>
      <div v-if="trend && trendValue" class="stat-card__trend" :class="`stat-card__trend--${trend}`">
        <span class="trend-indicator">
          {{ trend === "up" ? "↑" : trend === "down" ? "↓" : "→" }}
        </span>
        <span class="trend-value">{{ trendValue }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid var(--accent-color, #3b82f6);
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card--blue {
  --accent-color: #3b82f6;
}

.stat-card--green {
  --accent-color: #16a34a;
}

.stat-card--amber {
  --accent-color: #f59e0b;
}

.stat-card--red {
  --accent-color: #ef4444;
}

.stat-card--gray {
  --accent-color: #64748b;
}

.stat-card__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.stat-card__icon {
  font-size: 1.25rem;
  opacity: 0.8;
}

.stat-card__title {
  font-size: 0.875rem;
  font-weight: 600;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin: 0;
}

.stat-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-card__value {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--accent-color);
}

.stat-card__subtitle {
  font-size: 0.875rem;
  opacity: 0.6;
  margin: 0;
}

.stat-card__trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.stat-card__trend--up {
  color: #16a34a;
}

.stat-card__trend--down {
  color: #ef4444;
}

.stat-card__trend--neutral {
  color: #64748b;
}

.trend-indicator {
  font-size: 1rem;
}
</style>
