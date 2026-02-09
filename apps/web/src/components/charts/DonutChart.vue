<script setup lang="ts">
import { computed } from "vue";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: DonutSlice[];
  centerValue?: string | number;
  centerLabel?: string;
  size?: number;
  strokeWidth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  size: 180,
  strokeWidth: 30,
  centerValue: undefined,
  centerLabel: undefined,
});

const radius = computed(() => props.size / 2 - props.strokeWidth / 2);
const cx = computed(() => props.size / 2);
const cy = computed(() => props.size / 2);

const total = computed(
  () => props.slices.reduce((sum, s) => sum + s.value, 0) || 1,
);

const slicesWithPercentage = computed(() =>
  props.slices.map((s) => ({
    ...s,
    pct: Math.round((s.value / total.value) * 100),
  })),
);

function donutPath(startAngle: number, endAngle: number): string {
  const r = radius.value;
  const cx_ = cx.value;
  const cy_ = cy.value;
  const sr = (startAngle - 90) * (Math.PI / 180);
  const er = (endAngle - 90) * (Math.PI / 180);
  const x1 = cx_ + r * Math.cos(sr);
  const y1 = cy_ + r * Math.sin(sr);
  const x2 = cx_ + r * Math.cos(er);
  const y2 = cy_ + r * Math.sin(er);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

const arcs = computed(() => {
  const result: Array<{
    d: string;
    color: string;
    label: string;
    pct: number;
  }> = [];
  let angle = 0;

  for (const slice of slicesWithPercentage.value) {
    const sweep = (slice.pct / 100) * 360;
    if (sweep < 0.5) continue;
    const clampedSweep = Math.min(sweep, 359.99);

    result.push({
      d: donutPath(angle, angle + clampedSweep),
      color: slice.color,
      label: slice.label,
      pct: slice.pct,
    });

    angle += sweep;
  }

  return result;
});
</script>

<template>
  <div class="donut-chart-container">
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="donut-chart"
    >
      <g>
        <path
          v-for="(arc, i) in arcs"
          :key="i"
          :d="arc.d"
          fill="none"
          :stroke="arc.color"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
          class="donut-arc"
        />
        <text
          v-if="centerValue !== undefined"
          :x="cx"
          :y="cy - 8"
          text-anchor="middle"
          class="donut-chart__center-value"
        >
          {{ centerValue }}
        </text>
        <text
          v-if="centerLabel"
          :x="cx"
          :y="cy + 12"
          text-anchor="middle"
          class="donut-chart__center-label"
        >
          {{ centerLabel }}
        </text>
      </g>
    </svg>
    <ul class="chart-legend">
      <li v-for="(arc, i) in arcs" :key="i" class="chart-legend__item">
        <span
          class="chart-legend__dot"
          :style="{ backgroundColor: arc.color }"
        />
        <span class="chart-legend__label">{{ arc.label }}</span>
        <span class="chart-legend__value">{{ arc.pct }}%</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.donut-chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.donut-chart {
  display: block;
}

.donut-arc {
  transition: opacity 0.2s;
}

.donut-arc:hover {
  opacity: 0.8;
}

.donut-chart__center-value {
  font-size: 1.5rem;
  font-weight: 700;
  fill: currentColor;
}

.donut-chart__center-label {
  font-size: 0.75rem;
  opacity: 0.7;
  fill: currentColor;
}

.chart-legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.chart-legend__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.chart-legend__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chart-legend__label {
  flex: 1;
}

.chart-legend__value {
  font-weight: 600;
  opacity: 0.8;
}
</style>
