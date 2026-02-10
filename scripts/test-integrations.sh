#!/bin/bash
# Integration API Curl Tests
# Run with: bash test-integrations.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"
CONTENT_TYPE="Content-Type: application/json"

echo "========================================"
echo "CRM Integration API Tests"
echo "Base URL: $BASE_URL"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -e "${YELLOW}Testing:${NC} $description"
    echo "  $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "$CONTENT_TYPE" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((TESTS_PASSED++))
    else
        echo -e "  ${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
        ((TESTS_FAILED++))
    fi
    
    # Pretty print JSON if jq is available
    if command -v jq &> /dev/null && [ -n "$body" ]; then
        echo "  Response: $(echo "$body" | jq -c '.' 2>/dev/null || echo "$body")"
    else
        echo "  Response: $body"
    fi
    echo ""
}

echo "========================================"
echo "1. LIST INTEGRATIONS"
echo "========================================"

test_endpoint "GET" "/integrations" "" "200" "List all integrations"

echo "========================================"
echo "2. GET SPECIFIC INTEGRATIONS"
echo "========================================"

test_endpoint "GET" "/integrations/glpi" "" "200" "Get GLPI integration"
test_endpoint "GET" "/integrations/sat" "" "200" "Get SAT integration"
test_endpoint "GET" "/integrations/nextcloud" "" "200" "Get NextCloud integration"
test_endpoint "GET" "/integrations/zimbra" "" "200" "Get Zimbra integration"
test_endpoint "GET" "/integrations/outlook" "" "200" "Get Outlook integration"
test_endpoint "GET" "/integrations/nonexistent" "" "404" "Get non-existent integration (expect 404)"

echo "========================================"
echo "3. TEST CONNECTIONS"
echo "========================================"

test_endpoint "POST" "/integrations/glpi/test" "" "200" "Test GLPI connection"
test_endpoint "POST" "/integrations/sat/test" "" "200" "Test SAT connection"
test_endpoint "POST" "/integrations/nextcloud/test" "" "200" "Test NextCloud connection"
test_endpoint "POST" "/integrations/zimbra/test" "" "200" "Test Zimbra connection"
test_endpoint "POST" "/integrations/outlook/test" "" "200" "Test Outlook connection"

echo "========================================"
echo "4. CONFIGURE INTEGRATIONS"
echo "========================================"

# GLPI Configuration
glpi_config='{
  "apiUrl": "https://glpi.example.com/apirest.php",
  "appToken": "test-app-token",
  "userToken": "test-user-token"
}'
test_endpoint "POST" "/integrations/glpi/configure" "$glpi_config" "200" "Configure GLPI"

# SAT Configuration
sat_config='{
  "apiUrl": "https://api.sat.example.com",
  "clientId": "test-client-id",
  "clientSecret": "test-client-secret",
  "companyId": "12345"
}'
test_endpoint "POST" "/integrations/sat/configure" "$sat_config" "200" "Configure SAT"

# NextCloud Configuration
nextcloud_config='{
  "serverUrl": "https://cloud.example.com",
  "username": "crm-service",
  "password": "test-password",
  "basePath": "/CRM"
}'
test_endpoint "POST" "/integrations/nextcloud/configure" "$nextcloud_config" "200" "Configure NextCloud"

# Zimbra Configuration
zimbra_config='{
  "serverUrl": "https://mail.example.com",
  "email": "user@example.com",
  "password": "test-password"
}'
test_endpoint "POST" "/integrations/zimbra/configure" "$zimbra_config" "200" "Configure Zimbra"

# Outlook Configuration
outlook_config='{
  "clientId": "azure-client-id",
  "tenantId": "azure-tenant-id",
  "clientSecret": "azure-client-secret"
}'
test_endpoint "POST" "/integrations/outlook/configure" "$outlook_config" "200" "Configure Outlook"

echo "========================================"
echo "5. TRIGGER SYNC"
echo "========================================"

test_endpoint "POST" "/integrations/glpi/sync" "" "202" "Trigger GLPI sync"
test_endpoint "POST" "/integrations/sat/sync" "" "202" "Trigger SAT sync"
test_endpoint "POST" "/integrations/nextcloud/sync" "" "202" "Trigger NextCloud sync"
test_endpoint "POST" "/integrations/zimbra/sync" "" "202" "Trigger Zimbra sync"
test_endpoint "POST" "/integrations/outlook/sync" "" "202" "Trigger Outlook sync"

echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
