#!/bin/bash

set -e

echo "=================================================="
echo "🚀 AI Dashboard Chat - Quick Deployment"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo ""
    echo "Install it with:"
    echo "  brew install supabase/tap/supabase"
    echo "  OR"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

# Check if linked to project
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${YELLOW}⚠️  Not linked to Supabase project${NC}"
    echo ""
    echo "Linking to project bkbcqocpjahewqjmlgvf..."
    supabase link --project-ref bkbcqocpjahewqjmlgvf
fi

echo ""
echo "Step 1/5: Generating encryption key..."
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo -e "${GREEN}✅ Generated encryption key${NC}"
echo "Key: $ENCRYPTION_KEY"
echo ""

echo "Step 2/5: Setting encryption key in Supabase secrets..."
supabase secrets set CHAT_ENCRYPTION_KEY=$ENCRYPTION_KEY
echo -e "${GREEN}✅ Encryption key set${NC}"
echo ""

echo "Step 3/5: Applying database migrations..."
supabase db push
echo -e "${GREEN}✅ Database migrations applied${NC}"
echo ""

echo "Step 4/5: Deploying Edge Functions..."
echo "  - Deploying ai-dashboard-chat..."
supabase functions deploy ai-dashboard-chat
echo "  - Deploying cleanup-expired-chats..."
supabase functions deploy cleanup-expired-chats
echo -e "${GREEN}✅ Edge Functions deployed${NC}"
echo ""

echo "Step 5/5: Testing encryption setup..."
RESPONSE=$(curl -s -X POST \
  https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/ai-dashboard-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek" \
  -d '{"action":"validate_encryption"}')

if echo "$RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Encryption validation successful${NC}"
else
    echo -e "${RED}❌ Encryption validation failed${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo "🔑 Encryption key: $ENCRYPTION_KEY"
echo "💡 Save this key securely!"
echo ""
echo "Next steps:"
echo "  1. npm install  (if not done yet)"
echo "  2. npm run dev"
echo "  3. Navigate to /dashboard-v2"
echo "  4. Click the orange chat button"
echo ""
echo "Troubleshooting: See docs/QUICKSTART_CHAT.md"
echo ""
