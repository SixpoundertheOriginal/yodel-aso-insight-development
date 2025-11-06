#!/bin/bash

# Create Yodel Mobile user via Supabase Dashboard API
# This script requires SUPABASE_SERVICE_ROLE_KEY environment variable

echo "🌱 Creating Yodel Mobile organization and user"
echo "═══════════════════════════════════════════════════"
echo ""

# Check if service role key is set
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set"
  echo ""
  echo "To get your service role key:"
  echo "1. Go to https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/settings/api"
  echo "2. Copy the 'service_role' key (not the anon key)"
  echo "3. Export it: export SUPABASE_SERVICE_ROLE_KEY='your-key-here'"
  echo "4. Run this script again"
  exit 1
fi

SUPABASE_URL="https://bkbcqocpjahewqjmlgvf.supabase.co"
EMAIL="cli@yodelmobile.com"
PASSWORD="YodelAdmin123!"

# Create auth user
echo "📋 Creating auth user..."
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"first_name\": \"CLI\",
      \"last_name\": \"Admin\"
    }
  }")

echo "$RESPONSE" | jq '.'
USER_ID=$(echo "$RESPONSE" | jq -r '.id // .user.id // empty')

if [ -z "$USER_ID" ]; then
  echo "❌ Failed to create user or user already exists"
  echo ""
  echo "If user already exists, get the user ID and update seed.sql"
  exit 1
fi

echo "✅ Created user: $EMAIL"
echo "   User ID: $USER_ID"
echo ""

# Update seed.sql with the actual user ID
sed -i.bak "s/8920ac57-63da-4f8e-9970-719be1e2569c/$USER_ID/g" supabase/seed.sql
echo "✅ Updated seed.sql with user ID"
echo ""

echo "🎉 Next steps:"
echo "1. Run the seed script to create org and roles:"
echo "   npx supabase db reset (if local)"
echo "   OR manually run: supabase/seed.sql"
echo ""
echo "2. Login credentials:"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
