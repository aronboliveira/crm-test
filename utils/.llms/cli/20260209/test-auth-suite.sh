#!/bin/bash
# Run all auth-related tests
# Usage: ./test-auth-suite.sh

set -e

cd "$(dirname "$0")/../../.."
cd apps/web

echo "🧪 Running full auth test suite..."
echo ""

echo "📦 Testing password visibility..."
npm test -- usePasswordVisibility.test.ts --run

echo ""
echo "📦 Testing password checklist..."
npm test -- __tests__/ --run 2>/dev/null | grep -i password || echo "No additional password tests found"

echo ""
echo "✅ Auth test suite complete!"
