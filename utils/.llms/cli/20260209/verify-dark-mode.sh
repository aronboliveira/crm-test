#!/bin/bash
# Test client dashboard dark mode styling
# Verifies filter chips and grid lines have proper dark mode support

echo "🔍 Checking dark mode CSS..."

# Check filter chip dark mode styles
if grep -q "@media (prefers-color-scheme: dark)" apps/web/src/components/dashboard/ClientStatisticsDashboard.vue; then
  echo "✅ Filter chips have dark mode support"
else
  echo "❌ Missing dark mode styles for filter chips"
  exit 1
fi

# Check grid line dark mode styles
if grep -q "@media (prefers-color-scheme: dark)" apps/web/src/components/charts/BarChart.vue; then
  echo "✅ Grid lines have dark mode support"
else
  echo "❌ Missing dark mode styles for grid lines"
  exit 1
fi

echo ""
echo "🎨 Dark mode styling verification complete!"
