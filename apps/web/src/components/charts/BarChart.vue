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
  maxBarWidth?: number;
  showAxisLabels?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultColor: "#3b82f6",
  height: 300,
  showValues: true,
  horizontal: false,
  maxBarWidth: 80,
  showAxisLabels: true,
});

const maxValue = computed(() => Math.max(...props.bars.map((b) => b.value), 1));

const barsWithPercentage = computed(() =>
  props.bars.map((b) => ({
    ...b,
    pct: Math.round((b.value / maxValue.value) * 100),
    color: b.color || props.defaultColor,
  })),
);

const gridLines = computed(() => {
  const lines = [];
  const step = Math.ceil(maxValue.value / 5);
  for (let i = 0; i <= 5; i++) {
    lines.push({
      value: i * step,
      position: i * 20,
    });
  }
  return lines;
});
</script>

<template>
  <div class="bar-chart-wrapper">
    <!-- Y-axis labels for vertical charts -->
    <div v-if="!horizontal && showAxisLabels" class="y-axis">
      <div
        v-for="line in gridLines"
        :key="line.value"
        class="y-axis-label"
        :style="{ bottom: `${line.position}%` }"
      >
        {{ line.value }}
      </div>
    </div>

    <div class="bar-chart" :class="{ 'bar-chart--horizontal': horizontal }">
      <!-- Grid lines for vertical charts -->
      <div v-if="!horizontal && showAxisLabels" class="grid-lines">
        <div
          v-for="line in gridLines"
          :key="line.value"
          class="grid-line"
          :style="{ bottom: `${line.position}%` }"
        />
      </div>

      <div v-for="(bar, i) in barsWithPercentage" :key="i" class="bar-item">
        <span class="bar-label">{{ bar.label }}</span>
        <div class="bar-container">
          <div
            class="bar-fill"
            :style="{
              [horizontal ? 'width' : 'height']: `${bar.pct}%`,
              [horizontal ? 'maxWidth' : 'maxWidth']: horizontal
                ? '100%'
                : `${maxBarWidth}px`,
              backgroundColor: bar.color,
            }"
          >
            <span v-if="showValues" class="bar-value">{{ bar.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar-chart-wrapper {
  position: relative;
  display: flex;
  width: 100%;
  gap: 0.5rem;
}

.y-axis {
  position: relative;
  width: 40px;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.y-axis-label {
  position: absolute;
  right: 8px;
  font-size: 0.75rem;
  opacity: 0.6;
  transform: translateY(50%);
  white-space: nowrap;
}

.bar-chart {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  flex: 1;
}

.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background-color: rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  .grid-line {
    background-color: rgba(255, 255, 255, 0.05);
  }
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

.bar-chart:not(.bar-chart--horizontal) {
  flex-direction: row;
  align-items: flex-end;
  gap: 0.5rem;
}

.bar-chart:not(.bar-chart--horizontal) .bar-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  align-items: center;
  position: relative;
  z-index: 1;
}

.bar-chart:not(.bar-chart--horizontal) .bar-container {
  height: 200px;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar-chart:not(.bar-chart--horizontal) .bar-fill {
  width: 100%;
}

.bar-chart:not(.bar-chart--horizontal) .bar-label {
  font-size: 0.75rem;
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
