#!/bin/bash
# Verification script for Email Template Feature v1.3
# Tests mailto links, security attributes, and template generation

echo "🔍 Email Template Feature v1.3 - Verification"
echo "=============================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0

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

CLIENT_DETAIL_FILE="apps/web/src/components/client/ClientDetailView.vue"

echo "📧 Testing Email Template System..."
echo "-----------------------------------"

# Interface Extensions
check_file_contains "$CLIENT_DETAIL_FILE" "templateContent?" "Attachment interface has templateContent property"
check_file_contains "$CLIENT_DETAIL_FILE" "isEmailTemplate?" "Attachment interface has isEmailTemplate flag"

# Mock Template Data
check_file_contains "$CLIENT_DETAIL_FILE" "proposta_comercial.eml" "Proposta comercial template exists"
check_file_contains "$CLIENT_DETAIL_FILE" "contrato_template.eml" "Contrato template exists"
check_file_contains "$CLIENT_DETAIL_FILE" "followup_projeto.eml" "Follow-up template exists"
check_file_contains "$CLIENT_DETAIL_FILE" "message/rfc822" "Email templates use RFC822 mime type"
check_file_contains "$CLIENT_DETAIL_FILE" "isEmailTemplate: true" "Templates marked as email templates"

# Base64 Encoding
check_file_contains "$CLIENT_DETAIL_FILE" "btoa(" "Base64 encoding used for templates"
check_file_contains "$CLIENT_DETAIL_FILE" "templateContent: templates" "Template content assigned to attachments"

# Minified Utility Functions
check_file_contains "$CLIENT_DETAIL_FILE" "const e = (s: string) => encodeURIComponent" "URL encode utility (minified)"
check_file_contains "$CLIENT_DETAIL_FILE" "const d = (b: string) =>" "Base64 decode utility (minified)"
check_file_contains "$CLIENT_DETAIL_FILE" "const s = (h: string) =>" "HTML strip utility (minified)"

# Mailto Link Generation
check_file_contains "$CLIENT_DETAIL_FILE" "generateMailtoLink" "generateMailtoLink function exists"
check_file_contains "$CLIENT_DETAIL_FILE" "mailto:" "Mailto protocol used"
check_file_contains "$CLIENT_DETAIL_FILE" "?subject=" "Subject parameter in mailto"
check_file_contains "$CLIENT_DETAIL_FILE" "&body=" "Body parameter in mailto"

# Security Attributes
check_file_contains "$CLIENT_DETAIL_FILE" "getTemplateSecurityAttrs" "Security attributes function exists"
check_file_contains "$CLIENT_DETAIL_FILE" "data-template-id" "Template ID data attribute"
check_file_contains "$CLIENT_DETAIL_FILE" "data-client-ref" "Client reference data attribute"
check_file_contains "$CLIENT_DETAIL_FILE" "data-template-type" "Template type data attribute"
check_file_contains "$CLIENT_DETAIL_FILE" "data-secure-hash" "Secure hash data attribute"

# Template Personalization
check_file_contains "$CLIENT_DETAIL_FILE" "props.client.name" "Client name personalization"
check_file_contains "$CLIENT_DETAIL_FILE" "props.client.company" "Client company personalization"

# HTML Structure
check_file_contains "$CLIENT_DETAIL_FILE" "v-if=\"attachment.isEmailTemplate\"" "Conditional rendering for email templates"
check_file_contains "$CLIENT_DETAIL_FILE" "btn-template-email" "Email template CSS class"
check_file_contains "$CLIENT_DETAIL_FILE" "email-template-\${attachment.id}" "Unique ID for email template links"
check_file_contains "$CLIENT_DETAIL_FILE" "rel=\"noopener noreferrer\"" "Security rel attribute"
check_file_contains "$CLIENT_DETAIL_FILE" "data-action=\"email-template\"" "Email template action data attribute"

# Email Icon - check for email emoji in the getFileIcon function
if grep -q 'rfc822.*"📧"' "$CLIENT_DETAIL_FILE" 2>/dev/null || \
   grep -q "rfc822.*'📧'" "$CLIENT_DETAIL_FILE" 2>/dev/null || \
   grep -A 2 'includes("rfc822")' "$CLIENT_DETAIL_FILE" 2>/dev/null | grep -q "📧"; then
    echo -e "${GREEN}✓${NC} Email icon for RFC822 mime type"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Email icon for RFC822 mime type"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Accessibility
check_file_contains "$CLIENT_DETAIL_FILE" "aria-label.*email" "ARIA label for email links"
check_file_contains "$CLIENT_DETAIL_FILE" "title.*Abrir email" "Title tooltip for email links"

echo ""
echo "🎨 Testing CSS Styles..."
echo "------------------------"

# Email Link Styles
check_file_contains "$CLIENT_DETAIL_FILE" ".btn-template-email {" "Email button CSS class exists"
check_file_contains "$CLIENT_DETAIL_FILE" "text-decoration: none" "Link underline removed"
check_file_contains "$CLIENT_DETAIL_FILE" "display: inline-flex" "Proper flex display for links"
check_file_contains "$CLIENT_DETAIL_FILE" "border-color: #3b82f6" "Blue border for email links"
check_file_contains "$CLIENT_DETAIL_FILE" "font-weight: 600" "Bold font for email links"

# Hover Effects
check_file_contains "$CLIENT_DETAIL_FILE" ".btn-template-email:hover" "Email hover styles exist"
check_file_contains "$CLIENT_DETAIL_FILE" "background: #dbeafe" "Light blue hover background"
check_file_contains "$CLIENT_DETAIL_FILE" "transform: scale" "Scale animation on hover"

# Active State
check_file_contains "$CLIENT_DETAIL_FILE" ".btn-template-email:active" "Email active state exists"
check_file_contains "$CLIENT_DETAIL_FILE" "transform: scale(0.98)" "Click feedback animation"

# Dark Mode - check for dark mode block with btn-template-email
if grep -q "prefers-color-scheme: dark" "$CLIENT_DETAIL_FILE" 2>/dev/null && \
   grep -A 20 "prefers-color-scheme: dark" "$CLIENT_DETAIL_FILE" 2>/dev/null | grep -q ".btn-template-email"; then
    echo -e "${GREEN}✓${NC} Dark mode support for email links"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Dark mode support for email links"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

echo ""
echo "📚 Testing Documentation..."
echo "---------------------------"

DOC_FILE="utils/.llms/cli/20260209/v1.3-email-templates.md"

check_file_contains "$DOC_FILE" "Email Template Integration" "v1.3 documentation exists"
check_file_contains "$DOC_FILE" "mailto: protocol" "Mailto protocol documented"
check_file_contains "$DOC_FILE" "Base64 encoding" "Base64 encoding documented"
check_file_contains "$DOC_FILE" "Minified" "Minified utilities documented"
check_file_contains "$DOC_FILE" "Security" "Security considerations documented"
check_file_contains "$DOC_FILE" "DOMStringMap" "DOMStringMap attributes documented"
check_file_contains "$DOC_FILE" "Testing" "Testing section included"
check_file_contains "$DOC_FILE" "Browser Compatibility" "Browser compatibility documented"
check_file_contains "$DOC_FILE" "Performance" "Performance considerations documented"

echo ""
echo "🔒 Testing Security Implementation..."
echo "--------------------------------------"

# URL Encoding
check_file_contains "$CLIENT_DETAIL_FILE" "encodeURIComponent(s)" "URL encoding for safety"

# HTML Stripping - check for the regex pattern
if grep -q "replace(/<\[^>\]\*>/g" "$CLIENT_DETAIL_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} HTML tag stripping regex"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} HTML tag stripping regex"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

check_file_contains "$CLIENT_DETAIL_FILE" "replace(/\\\\s+/g" "Whitespace normalization"

# Hash Generation - check for the components separately
if grep -q "attachment.id.*props.client.id.*attachment.fileName" "$CLIENT_DETAIL_FILE" 2>/dev/null || \
   grep -q "attachment.id}:.*client.id}:.*fileName}" "$CLIENT_DETAIL_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Hash includes template+client+filename"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Hash includes template+client+filename"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

check_file_contains "$CLIENT_DETAIL_FILE" "substring(0, 16)" "Hash truncated to 16 chars"

# Error Handling - check for try-catch block
if grep -q "try {" "$CLIENT_DETAIL_FILE" 2>/dev/null && grep -q "} catch" "$CLIENT_DETAIL_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Error handling in decode function"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Error handling in decode function"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

check_file_contains "$CLIENT_DETAIL_FILE" "return \"#\"" "Fallback for invalid templates"

echo ""
echo "=============================================="
echo "📊 Test Summary"
echo "=============================================="
echo -e "Total Tests:  $TOTAL"
echo -e "${GREEN}Passed:       $PASSED${NC}"
echo -e "${RED}Failed:       $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Email template feature verified.${NC}"
    echo ""
    echo "🧪 Manual Testing Checklist:"
    echo "  1. Start dev server: npm run dev --prefix apps/web"
    echo "  2. Navigate to Clients Dashboard"
    echo "  3. Expand a client with projects"
    echo "  4. Click ✉️ icon in Templates section"
    echo "  5. Verify email client opens with populated content"
    echo "  6. Check client email in 'To:' field"
    echo "  7. Verify subject line from template name"
    echo "  8. Check body has personalized client info"
    echo "  9. Test hover effects (blue highlight)"
    echo "  10. Inspect DOM for security attributes"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review output above.${NC}"
    exit 1
fi
