#!/bin/bash
# Build and verify the web app compiles without errors
# Usage: ./build-web-app.sh

set -e

cd "$(dirname "$0")/../../.."
cd apps/web

echo "🔨 Building web application..."
echo ""

# Type check
echo "📝 Running TypeScript type check..."
npx vue-tsc --noEmit

echo ""
echo "⚡ Running Vite build..."
npm run build

echo ""
echo "✅ Build successful! No compilation errors."
