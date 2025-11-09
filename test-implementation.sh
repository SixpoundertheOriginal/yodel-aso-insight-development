#!/bin/bash

# Test Implementation Script
# Tests Phase 0 implementation (database + edge functions)
# Usage: ./test-implementation.sh YOUR_PROJECT_URL YOUR_ANON_KEY

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_URL="${1:-}"
ANON_KEY="${2:-}"

if [ -z "$PROJECT_URL" ] || [ -z "$ANON_KEY" ]; then
  echo -e "${RED}❌ Error: Missing required arguments${NC}"
  echo "Usage: $0 YOUR_PROJECT_URL YOUR_ANON_KEY"
  echo ""
  echo "Example:"
  echo "  $0 https://abc123.supabase.co eyJhbG..."
  echo ""
  echo "Find these in Supabase Dashboard → Settings → API"
  exit 1
fi

EDGE_FUNCTION_URL="${PROJECT_URL}/functions/v1/app-store-scraper"

echo "🧪 Testing Phase 0 Implementation"
echo "=================================="
echo ""
echo "Project URL: $PROJECT_URL"
echo "Edge Function: $EDGE_FUNCTION_URL"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper function to run test
run_test() {
  local test_name="$1"
  local test_command="$2"
  local expected_pattern="$3"

  TESTS_TOTAL=$((TESTS_TOTAL + 1))

  echo -n "Test $TESTS_TOTAL: $test_name... "

  # Run command and capture output
  output=$(eval "$test_command" 2>&1)
  exit_code=$?

  # Check if test passed
  if [ $exit_code -eq 0 ] && echo "$output" | grep -q "$expected_pattern"; then
    echo -e "${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Output: $output"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Test 1: Health Check
echo ""
echo "📋 Testing Edge Function Operations"
echo "------------------------------------"
run_test \
  "Health check" \
  "curl -s -X POST $EDGE_FUNCTION_URL \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer $ANON_KEY' \
    -d '{\"op\": \"health\"}'" \
  '"success":true'

# Test 2: App Search
run_test \
  "App search (Instagram)" \
  "curl -s -X POST $EDGE_FUNCTION_URL \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer $ANON_KEY' \
    -d '{\"op\": \"search\", \"searchTerm\": \"Instagram\", \"country\": \"us\"}'" \
  '"success":true'

# Test 3: SERP Operation
run_test \
  "SERP operation (photo editor)" \
  "curl -s -X POST $EDGE_FUNCTION_URL \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer $ANON_KEY' \
    -d '{\"op\": \"serp\", \"term\": \"photo editor\", \"cc\": \"us\", \"limit\": 20}'" \
  '"success":true'

# Test 4: Keyword Discovery
run_test \
  "Keyword discovery (Instagram)" \
  "curl -s -X POST $EDGE_FUNCTION_URL \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer $ANON_KEY' \
    -d '{\"op\": \"discover_keywords\", \"targetApp\": {\"name\": \"Instagram\", \"appId\": \"389801252\", \"category\": \"Photo & Video\"}, \"seedKeywords\": [\"photo\", \"social\"], \"country\": \"us\", \"maxKeywords\": 10}'" \
  '"success":true'

# Test 5: Reviews (CRITICAL)
echo ""
echo "🔥 Critical Test: Reviews Operation"
echo "------------------------------------"
run_test \
  "Reviews fetch (CRITICAL - must pass)" \
  "curl -s -X POST $EDGE_FUNCTION_URL \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer $ANON_KEY' \
    -d '{\"op\": \"reviews\", \"appId\": \"389801252\", \"cc\": \"us\", \"page\": 1}'" \
  '"data"'

# Summary
echo ""
echo "=================================="
echo "📊 Test Results Summary"
echo "=================================="
echo ""
echo "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests:  $TESTS_TOTAL"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed! Implementation working correctly.${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Check database: SELECT COUNT(*) FROM apps_metadata;"
  echo "  2. Test reviews page in browser"
  echo "  3. Check edge function logs"
  echo "  4. Ready to continue with Phase 1!"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Review the output above.${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  - Check Supabase project URL is correct"
  echo "  - Check anon key is valid"
  echo "  - Check edge function is deployed"
  echo "  - Check edge function logs for errors"
  exit 1
fi
