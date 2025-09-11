#!/bin/bash

# Debug test script for /whoami endpoint using curl
# Usage: ./debug-whoami-curl.sh

echo "=== WHOAMI DEBUG TEST (CURL) ==="
echo "This will test the /whoami endpoint with debug logging"
echo ""

if [ -z "$SUPABASE_AUTH_TOKEN" ]; then
    echo "❌ Missing SUPABASE_AUTH_TOKEN environment variable"
    echo "Steps to get it:"
    echo "1. Log in as demo@next-demo.com in your browser"
    echo "2. Open browser dev tools > Application > Cookies"
    echo "3. Copy the sb-bkbcqocpjahewqjmlgvf-auth-token value"
    echo "4. Run: export SUPABASE_AUTH_TOKEN='paste-token-here'"
    echo "5. Then run this script again"
    exit 1
fi

echo "✅ Found auth token, length: ${#SUPABASE_AUTH_TOKEN}"
echo ""

echo "=== MAKING REQUEST ==="
curl -v \
  -H "Authorization: Bearer $SUPABASE_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-whoami"

echo ""
echo ""
echo "=== NEXT: CHECK SUPABASE LOGS ==="
echo "1. Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions"
echo "2. Click on 'admin-whoami' function"
echo "3. Go to 'Logs' tab"
echo "4. Look for [DEBUG/WHOAMI] entries from the last few minutes"
echo "5. Paste ALL [DEBUG/WHOAMI] log lines for analysis"