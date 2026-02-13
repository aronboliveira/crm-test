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
  showTrendLine?: boolean;
  trendLineColor?: string;
  trendLineWidth?: number;
  showTrendDots?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultColor: "#3b82f6",
  height: 300,
  showValues: true,
  horizontal: false,
  maxBarWidth: 80,
  showAxisLabels: true,
  showTrendLine: false,
  trendLineColor: "#93c5fd",
  trendLineWidth: 2,
  showTrendDots: true,
});

const maxValue = computed(() => Math.max(...props.bars.map((b) => b.value), 1));
const normalizedHeight = computed(() =>
  Math.max(120, Math.trunc(props.height || 0) || 120),
);
const normalizedMaxBarWidth = computed(() =>
  Math.max(12, Math.trunc(props.maxBarWidth || 0) || 12),
);
const chartStyle = computed(() => ({
  "--bar-chart-height": `${normalizedHeight.value}px`,
  "--bar-column-width": `${normalizedMaxBarWidth.value}px`,
}));

const barsWithPercentage = computed(() =>
  props.bars.map((b) => ({
    ...b,
    pct: Math.round((b.value / maxValue.value) * 100),
    color: b.color || props.defaultColor,
  })),
);

const gridLines = computed(() => {
  const lines = [];
  const segments = Math.min(5, Math.max(1, maxValue.value));
  for (let i = 0; i <= segments; i++) {
    const ratio = i / segments;
    lines.push({
      value: Math.round(maxValue.value * ratio),
      position: ratio * 100,
    });
  }
  return lines;
});

const trendPoints = computed(() => {
  if (
    props.horizontal ||
    !props.showTrendLine ||
    barsWithPercentage.value.length === 0
  ) {
    return "";
  }

  const bars = barsWithPercentage.value;
  if (bars.length === 1) {
    const singleY = Math.max(0, 100 - bars[0]!.pct);
    return `50,${singleY}`;
  }

  return bars
    .map((bar, index) => {
      const x = (index / Math.max(bars.length - 1, 1)) * 100;
      const y = Math.max(0, 100 - bar.pct);
      return `${x},${y}`;
    })
    .join(" ");
});

const trendDots = computed(() => {
  if (!props.showTrendDots || !props.showTrendLine || props.horizontal) {
    return [];
  }

  const bars = barsWithPercentage.value;
  if (bars.length === 0) {
    return [];
  }

  if (bars.length === 1) {
    return [{ x: 50, y: Math.max(0, 100 - bars[0]!.pct) }];
  }

  return bars.map((bar, index) => ({
    x: (index / Math.max(bars.length - 1, 1)) * 100,
    y: Math.max(0, 100 - bar.pct),
  }));
});
</script>

<template>
  <div class="bar-chart-wrapper" :style="chartStyle">
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

      <svg
        v-if="!horizontal && showTrendLine && trendPoints.length > 0"
        class="trend-line-overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          class="trend-line-path"
          vector-effect="non-scaling-stroke"
          :points="trendPoints"
          :style="{
            stroke: trendLineColor,
            strokeWidth: `${trendLineWidth}`,
          }"
        />
        <circle
          v-for="(dot, dotIndex) in trendDots"
          :key="dotIndex"
          class="trend-line-dot"
          :cx="dot.x"
          :cy="dot.y"
          r="1.8"
          :style="{ fill: trendLineColor }"
        />
      </svg>

      <div v-for="(bar, i) in barsWithPercentage" :key="i" class="bar-item">
        <span class="bar-label">{{ bar.label }}</span>
        <div class="bar-container">
          <div
            class="bar-fill"
            :style="{
              [horizontal ? 'width' : 'height']: `${bar.pct}%`,
              maxWidth: horizontal ? '100%' : `${normalizedMaxBarWidth}px`,
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
  --bar-chart-height: 200px;
  --bar-column-width: 28px;
}

.y-axis {
  position: relative;
  width: 40px;
  min-height: var(--bar-chart-height);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.y-axis-label {
  position: absolute;
  right: 8px;
  font-size: 0.75rem;
  color: var(--text-3);
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
  background-color: color-mix(in oklab, var(--text-1) 10%, transparent);
}

.trend-line-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: var(--bar-chart-height);
  z-index: 2;
  pointer-events: none;
}

.trend-line-path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 1;
}

.trend-line-dot {
  opacity: 0.95;
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
  gap: 0.3rem;
  flex: 1;
  align-items: center;
  position: relative;
  z-index: 1;
}

.bar-chart:not(.bar-chart--horizontal) .bar-container {
  height: var(--bar-chart-height);
  width: min(100%, var(--bar-column-width));
  display: flex;
  align-items: flex-end;
  justify-content: center;
  order: 1;
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
  order: 2;
}

.bar-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-2);
}

.bar-container {
  background-color: color-mix(in oklab, var(--text-1) 8%, transparent);
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
