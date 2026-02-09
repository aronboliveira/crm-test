#!/bin/bash
# Test password visibility composable
# Usage: ./test-password-visibility.sh

set -e

cd "$(dirname "$0")/../../.."
cd apps/web

echo "🧪 Running password visibility composable tests..."
npm test -- usePasswordVisibility.test.ts --run

echo ""
echo "✅ All tests passed!"
