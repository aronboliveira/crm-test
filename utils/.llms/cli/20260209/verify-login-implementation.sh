#!/bin/bash
# Verify login page implementation
# Usage: ./verify-login-implementation.sh

set -e

# Navigate to project root (3 levels up from utils/.llms/cli/20260209/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
cd ../../../..
PROJECT_ROOT="$(pwd)"

echo "🔍 Verifying login page password toggle implementation..."
echo "📂 Working from: $PROJECT_ROOT"
echo ""

# Check if composable exists
COMPOSABLE_PATH="apps/web/src/assets/scripts/auth/usePasswordVisibility.ts"
if [ -f "$COMPOSABLE_PATH" ]; then
    echo "✅ usePasswordVisibility composable exists"
else
    echo "❌ usePasswordVisibility composable missing at: $COMPOSABLE_PATH"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Check if styles exist
STYLES_PATH="apps/web/src/styles/components/_auth-login.scss"
if [ -f "$STYLES_PATH" ]; then
    echo "✅ Auth login styles file exists"
else
    echo "❌ Auth login styles file missing at: $STYLES_PATH"
    exit 1
fi

# Check if tests exist
TESTS_PATH="apps/web/__tests__/usePasswordVisibility.test.ts"
if [ -f "$TESTS_PATH" ]; then
    echo "✅ Unit tests exist"
else
    echo "❌ Unit tests missing at: $TESTS_PATH"
    exit 1
fi

# Check if login page is updated
LOGIN_PAGE="apps/web/src/pages/AuthLoginPage.vue"
if grep -q "passwordVisibility" "$LOGIN_PAGE"; then
    echo "✅ Login page integrated with password visibility"
else
    echo "❌ Login page not using password visibility"
    exit 1
fi

# Check if login composable exports password visibility
LOGIN_COMPOSABLE="apps/web/src/assets/scripts/pages/useAuthLoginPage.ts"
if grep -q "passwordVisibility" "$LOGIN_COMPOSABLE"; then
    echo "✅ useAuthLoginPage exports passwordVisibility"
else
    echo "❌ useAuthLoginPage missing passwordVisibility export"
    exit 1
fi

echo ""
echo "🎉 All verification checks passed!"
echo ""
echo "📊 Implementation Summary:"
echo "   - Composable: $COMPOSABLE_PATH"
echo "   - Styles: $STYLES_PATH"
echo "   - Tests: $TESTS_PATH"
echo "   - Integration: $LOGIN_PAGE"
