#!/bin/bash
# Verification script for Client Dashboard v1.2 features
# Tests templates, tasks, and accessibility improvements

echo "🔍 Client Dashboard v1.2 - Feature Verification"
echo "================================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter for tests
TOTAL=0
PASSED=0
FAILED=0

# Function to check file content
check_file_contains() {
    local file=$1
    local pattern=$2
    local description=$3
    
    TOTAL=$((TOTAL + 1))
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} $description"
        FAILED=$((FAILED + 1))
    fi
}

# Function to check multiple patterns
check_multiple_patterns() {
    local file=$1
    local description=$2
    shift 2
    local patterns=("$@")
    
    TOTAL=$((TOTAL + 1))
    local all_found=true
    
    for pattern in "${patterns[@]}"; do
        if ! grep -q "$pattern" "$file" 2>/dev/null; then
            all_found=false
            break
        fi
    done
    
    if $all_found; then
        echo -e "${GREEN}✓${NC} $description"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} $description"
        FAILED=$((FAILED + 1))
    fi
}

echo "📋 Testing ClientDetailView.vue..."
echo "-----------------------------------"

CLIENT_DETAIL_FILE="apps/web/src/components/client/ClientDetailView.vue"

# Templates Section Tests
check_file_contains "$CLIENT_DETAIL_FILE" "mockAttachments" "Mock attachments computed property exists"
check_file_contains "$CLIENT_DETAIL_FILE" "formatFileSize" "File size formatter function exists"
check_file_contains "$CLIENT_DETAIL_FILE" "getFileIcon" "File icon mapper function exists"
check_file_contains "$CLIENT_DETAIL_FILE" "Meus Templates" "Templates section header exists"
check_file_contains "$CLIENT_DETAIL_FILE" "template-item" "Template item component exists"
check_file_contains "$CLIENT_DETAIL_FILE" "Adicionar Template" "Add template button exists"

# Tasks Section Tests
check_file_contains "$CLIENT_DETAIL_FILE" "mockTasks" "Mock tasks computed property exists"
check_file_contains "$CLIENT_DETAIL_FILE" "showRecentActivity" "Recent activity toggle state exists"
check_file_contains "$CLIENT_DETAIL_FILE" "toggleRecentActivity" "Toggle recent activity function exists"
check_file_contains "$CLIENT_DETAIL_FILE" "getTaskStatusLabel" "Task status label function exists"
check_file_contains "$CLIENT_DETAIL_FILE" "getTaskStatusColor" "Task status color function exists"
check_file_contains "$CLIENT_DETAIL_FILE" "getPriorityLabel" "Task priority label function exists"
check_file_contains "$CLIENT_DETAIL_FILE" "Atividade Recente" "Recent activity section header exists"
check_file_contains "$CLIENT_DETAIL_FILE" "task-item" "Task item component exists"

# Accessibility Tests
check_file_contains "$CLIENT_DETAIL_FILE" 'role="list"' "List ARIA role exists"
check_file_contains "$CLIENT_DETAIL_FILE" 'role="listitem"' "List item ARIA role exists"
check_file_contains "$CLIENT_DETAIL_FILE" 'role="region"' "Region ARIA role exists"
check_file_contains "$CLIENT_DETAIL_FILE" "aria-labelledby" "ARIA labelledby attribute exists"
check_file_contains "$CLIENT_DETAIL_FILE" "aria-expanded" "ARIA expanded attribute exists"
check_file_contains "$CLIENT_DETAIL_FILE" "aria-controls" "ARIA controls attribute exists"
check_file_contains "$CLIENT_DETAIL_FILE" "data-attachment-id" "Data attachment ID attribute exists"
check_file_contains "$CLIENT_DETAIL_FILE" "data-task-id" "Data task ID attribute exists"
check_file_contains "$CLIENT_DETAIL_FILE" "data-task-status" "Data task status attribute exists"

# CSS Tests
check_file_contains "$CLIENT_DETAIL_FILE" ".templates-list" "Templates list styles exist"
check_file_contains "$CLIENT_DETAIL_FILE" ".template-item" "Template item styles exist"
check_file_contains "$CLIENT_DETAIL_FILE" ".task-item" "Task item styles exist"
check_file_contains "$CLIENT_DETAIL_FILE" ".status-todo" "Status todo styles exist"
check_file_contains "$CLIENT_DETAIL_FILE" ".status-doing" "Status doing styles exist"
check_file_contains "$CLIENT_DETAIL_FILE" ".status-done" "Status done styles exist"
check_file_contains "$CLIENT_DETAIL_FILE" ".btn-toggle-section" "Toggle section button styles exist"

echo ""
echo "📊 Testing DashboardClientsPage.vue..."
echo "---------------------------------------"

DASHBOARD_FILE="apps/web/src/pages/DashboardClientsPage.vue"

# Table Layout Tests
check_file_contains "$DASHBOARD_FILE" "table-layout: auto" "Table layout changed to auto"
check_file_contains "$DASHBOARD_FILE" "min-width: 900px" "Table minimum width set"
check_file_contains "$DASHBOARD_FILE" "width: 22%" "Column percentage widths set"
check_file_contains "$DASHBOARD_FILE" "min-width: 150px" "Column minimum widths set"

# Accessibility Tests
check_file_contains "$DASHBOARD_FILE" 'role="table"' "Table ARIA role exists"
check_file_contains "$DASHBOARD_FILE" 'role="row"' "Row ARIA role exists"
check_file_contains "$DASHBOARD_FILE" 'role="columnheader"' "Column header ARIA role exists"
check_file_contains "$DASHBOARD_FILE" 'role="cell"' "Cell ARIA role exists"
check_file_contains "$DASHBOARD_FILE" 'aria-label="Tabela de clientes"' "Table ARIA label exists"
check_file_contains "$DASHBOARD_FILE" 'aria-sort=' "Column sort ARIA attribute exists"
check_file_contains "$DASHBOARD_FILE" "data-client-id" "Data client ID attribute exists"
check_file_contains "$DASHBOARD_FILE" "data-column" "Data column attribute exists"
check_file_contains "$DASHBOARD_FILE" "data-action" "Data action attribute exists"
check_file_contains "$DASHBOARD_FILE" "data-sort-key" "Data sort key attribute exists"

echo ""
echo "🎯 Testing ClientHighlightsModal.vue..."
echo "----------------------------------------"

MODAL_FILE="apps/web/src/components/modal/ClientHighlightsModal.vue"

# Modal Accessibility Tests
check_file_contains "$MODAL_FILE" 'role="dialog"' "Dialog ARIA role exists"
check_file_contains "$MODAL_FILE" 'aria-modal="true"' "Modal ARIA attribute exists"
check_file_contains "$MODAL_FILE" "aria-labelledby" "Modal ARIA labelledby exists"
check_file_contains "$MODAL_FILE" "aria-describedby" "Modal ARIA describedby exists"
check_file_contains "$MODAL_FILE" 'id="highlights-modal-title"' "Modal title ID exists"
check_file_contains "$MODAL_FILE" 'id="highlights-modal-description"' "Modal description ID exists"
check_file_contains "$MODAL_FILE" "data-client-id" "Highlight data client ID exists"
check_file_contains "$MODAL_FILE" "data-score" "Highlight data score exists"
check_file_contains "$MODAL_FILE" "data-rank" "Highlight data rank exists"
check_file_contains "$MODAL_FILE" 'role="status"' "Status ARIA role exists"

echo ""
echo "📚 Testing Documentation..."
echo "---------------------------"

DOC_FILE="utils/.llms/cli/20260209/v1.2-templates-tasks-accessibility.md"

check_file_contains "$DOC_FILE" "Templates Section" "Templates section documented"
check_file_contains "$DOC_FILE" "Recent Activity Section" "Recent activity section documented"
check_file_contains "$DOC_FILE" "Table Layout & Responsiveness" "Table improvements documented"
check_file_contains "$DOC_FILE" "Accessibility Improvements" "Accessibility improvements documented"
check_file_contains "$DOC_FILE" "API Integration Roadmap" "API integration plan documented"
check_file_contains "$DOC_FILE" "Testing Checklist" "Testing checklist included"
check_file_contains "$DOC_FILE" "Performance Considerations" "Performance notes included"
check_file_contains "$DOC_FILE" "Known Limitations" "Limitations documented"

echo ""
echo "================================================"
echo "📊 Test Summary"
echo "================================================"
echo -e "Total Tests:  $TOTAL"
echo -e "${GREEN}Passed:       $PASSED${NC}"
echo -e "${RED}Failed:       $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! v1.2 implementation verified.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi
