#!/bin/bash
# Smoke test script for admin-users edge function

SUPABASE_URL="https://bkbcqocpjahewqjmlgvf.supabase.co"
EDGE_FUNCTION_URL="$SUPABASE_URL/functions/v1/admin-users"

echo "Testing admin-users edge function..."

# Test health check (GET request)
echo "1. Testing GET request (list users):"
curl -X GET "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" | jq '.'

echo ""

# Test error handling (invalid action)
echo "2. Testing error handling (invalid action):"
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "invalid"}' \
  -w "\nStatus: %{http_code}\n" | jq '.'

echo ""

# Test list action (POST)
echo "3. Testing POST list action:"
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}' \
  -w "\nStatus: %{http_code}\n" | jq '.'

echo "Test completed!"