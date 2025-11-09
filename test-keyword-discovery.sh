#!/bin/bash

# Test Keyword Discovery API
# Usage: ./test-keyword-discovery.sh YOUR_PROJECT_URL YOUR_ANON_KEY

PROJECT_URL="${1:-https://bkbcqocpjahewqjmlgvf.supabase.co}"
ANON_KEY="${2:-}"

if [ -z "$ANON_KEY" ]; then
  echo "❌ Error: Missing ANON_KEY"
  echo "Usage: $0 YOUR_PROJECT_URL YOUR_ANON_KEY"
  exit 1
fi

EDGE_FUNCTION_URL="${PROJECT_URL}/functions/v1/app-store-scraper"

echo "🔍 Testing Keyword Discovery API"
echo "=================================="
echo ""

# Test 1: Discover keywords for Instagram
echo "Test 1: Discover keywords for Instagram..."
echo ""

RESPONSE=$(curl -s -X POST "$EDGE_FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "op": "discover_keywords",
    "targetApp": {
      "name": "Instagram",
      "appId": "389801252",
      "category": "Photo & Video"
    },
    "seedKeywords": ["photo", "social", "camera"],
    "country": "us",
    "maxKeywords": 20
  }')

echo "$RESPONSE" | jq '.'
echo ""

# Check if successful
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  KEYWORD_COUNT=$(echo "$RESPONSE" | jq '.keywords | length')
  echo "✅ Success! Discovered $KEYWORD_COUNT keywords"
  echo ""
  echo "Top 5 keywords:"
  echo "$RESPONSE" | jq -r '.keywords[0:5][] | "  - \(.keyword) (volume: \(.estimatedVolume), relevance: \(.relevanceScore))"'
else
  echo "❌ Failed to discover keywords"
  echo "Response: $RESPONSE"
fi

echo ""
echo "=================================="
echo "Test complete!"
