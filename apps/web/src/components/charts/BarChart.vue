<script setup lang="ts">
import { computed } from "vue";

export interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  bars: BarData[];
  defaultColor?: string;
  height?: number;
  showValues?: boolean;
  horizontal?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultColor: "#3b82f6",
  height: 300,
  showValues: true,
  horizontal: false,
});

const maxValue = computed(() => 
  Math.max(...props.bars.map(b => b.value), 1)
);

const barsWithPercentage = computed(() =>
  props.bars.map(b => ({
    ...b,
    pct: Math.round((b.value / maxValue.value) * 100),
    color: b.color || props.defaultColor,
  }))
);
</script>

<template>
  <div class="bar-chart" :class="{ 'bar-chart--horizontal': horizontal }">
    <div 
      v-for="(bar, i) in barsWithPercentage" 
      :key="i" 
      class="bar-item"
    >
      <span class="bar-label">{{ bar.label }}</span>
      <div class="bar-container">
        <div
          class="bar-fill"
          :style="{
            [horizontal ? 'width' : 'height']: `${bar.pct}%`,
            backgroundColor: bar.color,
          }"
        >
          <span v-if="showValues" class="bar-value">{{ bar.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.bar-chart--horizontal .bar-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
}

.bar-chart--horizontal .bar-label {
  min-width: 100px;
  text-align: right;
}

.bar-chart--horizontal .bar-container {
  flex: 1;
  height: 24px;
}

.bar-chart:not(.bar-chart--horizontal) .bar-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-chart:not(.bar-chart--horizontal) .bar-container {
  height: 200px;
  display: flex;
  align-items: flex-end;
}

.bar-chart:not(.bar-chart--horizontal) .bar-fill {
  width: 100%;
}

.bar-label {
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0.9;
}

.bar-container {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  background-color: #3b82f6;
  border-radius: 4px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.bar-chart--horizontal .bar-fill {
  height: 100%;
  min-width: 2%;
}

.bar-chart:not(.bar-chart--horizontal) .bar-fill {
  min-height: 2%;
}

.bar-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  padding: 0 0.5rem;
}

.bar-item:hover .bar-fill {
  opacity: 0.9;
  filter: brightness(1.1);
}
</style>
