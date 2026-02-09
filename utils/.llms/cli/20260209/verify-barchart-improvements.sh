#!/bin/bash
# Verify bar chart improvements
# Checks for Y-axis labels, grid lines, and max-width constraints

echo "📊 Verifying bar chart improvements..."

BARCHART_FILE="apps/web/src/components/charts/BarChart.vue"

# Check for maxBarWidth prop
if grep -q "maxBarWidth" "$BARCHART_FILE"; then
  echo "✅ maxBarWidth prop exists"
else
  echo "❌ Missing maxBarWidth prop"
  exit 1
fi

# Check for showAxisLabels prop
if grep -q "showAxisLabels" "$BARCHART_FILE"; then
  echo "✅ showAxisLabels prop exists"
else
  echo "❌ Missing showAxisLabels prop"
  exit 1
fi

# Check for Y-axis component
if grep -q "y-axis" "$BARCHART_FILE"; then
  echo "✅ Y-axis labels implemented"
else
  echo "❌ Missing Y-axis labels"
  exit 1
fi

# Check for grid lines
if grep -q "grid-line" "$BARCHART_FILE"; then
  echo "✅ Grid lines implemented"
else
  echo "❌ Missing grid lines"
  exit 1
fi

# Check for gridLines computed property
if grep -q "const gridLines = computed" "$BARCHART_FILE"; then
  echo "✅ Grid line calculation logic exists"
else
  echo "❌ Missing grid line calculation"
  exit 1
fi

echo ""
echo "📊 Bar chart verification complete!"
