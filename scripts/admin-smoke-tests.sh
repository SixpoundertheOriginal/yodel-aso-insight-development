#!/bin/bash

# Admin API Smoke Tests
# Usage: ./scripts/admin-smoke-tests.sh [SUPER_ADMIN_TOKEN] [ORG_ADMIN_TOKEN]

set -e

BASE_URL="http://localhost:8080"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="docs/admin-smoke/${TIMESTAMP}"
mkdir -p "$RESULTS_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "$1" | tee -a "$RESULTS_DIR/smoke_test.log"
}

# Test function
test_api() {
    local description="$1"
    local method="$2"
    local endpoint="$3"
    local token="$4"
    local data="$5"
    local expected_status="$6"
    
    log "\n🧪 Testing: $description"
    
    local curl_cmd="curl -s -w 'STATUS:%{http_code}\n' -X $method"
    
    if [ ! -z "$token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $token'"
    fi
    
    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd $BASE_URL$endpoint"
    
    local response=$(eval $curl_cmd)
    local status=$(echo "$response" | grep "STATUS:" | cut -d: -f2)
    local body=$(echo "$response" | sed '/STATUS:/d')
    
    # Save detailed response
    echo "=== $description ===" >> "$RESULTS_DIR/detailed_responses.log"
    echo "Command: $curl_cmd" >> "$RESULTS_DIR/detailed_responses.log"
    echo "Status: $status" >> "$RESULTS_DIR/detailed_responses.log"
    echo "Body: $body" >> "$RESULTS_DIR/detailed_responses.log"
    echo "" >> "$RESULTS_DIR/detailed_responses.log"
    
    if [ "$status" = "$expected_status" ]; then
        log "${GREEN}✅ PASS${NC} - Status: $status"
        return 0
    else
        log "${RED}❌ FAIL${NC} - Expected: $expected_status, Got: $status"
        log "   Response: $body"
        return 1
    fi
}

# Main test execution
main() {
    local super_admin_token="$1"
    local org_admin_token="$2"
    
    log "🚀 Starting Admin API Smoke Tests - $TIMESTAMP"
    log "Results will be saved to: $RESULTS_DIR"
    
    local total_tests=0
    local passed_tests=0
    
    # Health and system endpoints (no auth required)
    log "\n📊 Testing System Health Endpoints"
    
    if test_api "Health Check" "GET" "/api/health" "" "" "200"; then
        ((passed_tests++))
    fi
    ((total_tests++))
    
    # Test with invalid token
    log "\n🔒 Testing Authentication"
    
    if test_api "Invalid Token - Organizations" "GET" "/api/admin/organizations" "invalid-token" "" "401"; then
        ((passed_tests++))
    fi
    ((total_tests++))
    
    # Test with SUPER_ADMIN token
    if [ ! -z "$super_admin_token" ]; then
        log "\n👑 Testing SUPER_ADMIN Access"
        
        if test_api "SUPER_ADMIN - Whoami" "GET" "/api/whoami" "$super_admin_token" "" "200"; then
            ((passed_tests++))
        fi
        ((total_tests++))
        
        if test_api "SUPER_ADMIN - List Organizations" "GET" "/api/admin/organizations" "$super_admin_token" "" "200"; then
            ((passed_tests++))
        fi
        ((total_tests++))
        
        if test_api "SUPER_ADMIN - List Users" "GET" "/api/admin/users" "$super_admin_token" "" "200"; then
            ((passed_tests++))
        fi
        ((total_tests++))
        
        # Test organization creation
        local org_data='{"name":"Test Org '$(date +%s)'","slug":"test-org-'$(date +%s)'","domain":"test.example.com"}'
        if test_api "SUPER_ADMIN - Create Organization" "POST" "/api/admin/organizations" "$super_admin_token" "$org_data" "201"; then
            ((passed_tests++))
        fi
        ((total_tests++))
        
        # Test user invitation
        local invite_data='{"email":"test-'$(date +%s)'@example.com","org_id":"some-org-id","role":"VIEWER"}'
        if test_api "SUPER_ADMIN - Invite User" "POST" "/api/admin/users/invite" "$super_admin_token" "$invite_data" "200"; then
            ((passed_tests++))
        fi
        ((total_tests++))
    else
        log "${YELLOW}⚠️  SUPER_ADMIN token not provided, skipping SUPER_ADMIN tests${NC}"
    fi
    
    # Test with ORG_ADMIN token
    if [ ! -z "$org_admin_token" ]; then
        log "\n🏢 Testing ORG_ADMIN Access"
        
        if test_api "ORG_ADMIN - Whoami" "GET" "/api/whoami" "$org_admin_token" "" "200"; then
            ((passed_tests++))
        fi
        ((total_tests++))
        
        if test_api "ORG_ADMIN - List Organizations (Scoped)" "GET" "/api/admin/organizations" "$org_admin_token" "" "200"; then
            ((passed_tests++))
        fi
        ((total_tests++))
        
        if test_api "ORG_ADMIN - List Users (Scoped)" "GET" "/api/admin/users" "$org_admin_token" "" "200"; then
            ((passed_tests++))
        fi
        ((total_tests++))
        
        # Test cross-org access (should fail)
        if test_api "ORG_ADMIN - Create Organization (Should Fail)" "POST" "/api/admin/organizations" "$org_admin_token" '{"name":"Unauthorized Org","slug":"unauth-org"}' "403"; then
            ((passed_tests++))
        fi
        ((total_tests++))
    else
        log "${YELLOW}⚠️  ORG_ADMIN token not provided, skipping ORG_ADMIN tests${NC}"
    fi
    
    # Summary
    log "\n📋 Test Summary"
    log "=================="
    log "Total Tests: $total_tests"
    log "Passed: $passed_tests"
    log "Failed: $((total_tests - passed_tests))"
    
    if [ $passed_tests -eq $total_tests ]; then
        log "${GREEN}🎉 All tests passed!${NC}"
        echo "PASS" > "$RESULTS_DIR/result.txt"
        exit 0
    else
        log "${RED}💥 Some tests failed!${NC}"
        echo "FAIL" > "$RESULTS_DIR/result.txt"
        exit 1
    fi
}

# Check if dev server is running
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    log "${RED}❌ Dev server not running at $BASE_URL${NC}"
    log "Please start the dev server with: npm run dev"
    exit 1
fi

main "$1" "$2"