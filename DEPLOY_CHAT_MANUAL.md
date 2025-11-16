# Manual Deployment Guide for AI Dashboard Chat

Since we're in a non-interactive environment, you'll need to deploy the chat feature manually. Here's how:

---

## Option 1: Deploy via Supabase Dashboard (Easiest)

### Step 1: Apply Database Migrations

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/sql)

2. Copy and paste the contents of these files (in order):

**First migration** (`supabase/migrations/20251116000001_create_dashboard_chat_system.sql`):
```bash
# Copy contents from:
cat supabase/migrations/20251116000001_create_dashboard_chat_system.sql
```

3. Click **Run** in the SQL Editor

**Second migration** (`supabase/migrations/20251116000002_add_dashboard_chat_feature_flag.sql`):
```bash
# Copy contents from:
cat supabase/migrations/20251116000002_add_dashboard_chat_feature_flag.sql
```

4. Click **Run** in the SQL Editor

### Step 2: Generate and Set Encryption Key

1. Generate a key in your local terminal:
```bash
openssl rand -base64 32
```

2. Copy the output (example: `yR8vK3mP9xQ2nT5wL7jH4sG6dF1aZ0cV8bN9mX3kY2=`)

3. Go to [Project Settings > Edge Functions > Secrets](https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/settings/functions)

4. Click **Add new secret**:
   - Name: `CHAT_ENCRYPTION_KEY`
   - Value: `<paste-your-generated-key>`

5. Click **Save**

### Step 3: Deploy Edge Functions

#### Deploy ai-dashboard-chat

1. Go to [Edge Functions](https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions)

2. Click **Create function**

3. Name: `ai-dashboard-chat`

4. Paste the contents of:
```bash
cat supabase/functions/ai-dashboard-chat/index.ts
```

5. Click **Deploy function**

#### Deploy encryption service (shared dependency)

Before deploying, you need to manually copy the encryption service into the ai-dashboard-chat function since Supabase Dashboard doesn't support shared modules.

**Alternative**: Use Supabase CLI from your local machine (see Option 2 below)

#### Deploy cleanup-expired-chats

1. Click **Create function**

2. Name: `cleanup-expired-chats`

3. Paste contents of:
```bash
cat supabase/functions/cleanup-expired-chats/index.ts
```

4. Click **Deploy function**

5. After deploying, click on the function and add a cron schedule:
   - Schedule: `0 */6 * * *` (every 6 hours)

### Step 4: Verify

Test encryption in your terminal:

```bash
curl -X POST \
  https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/ai-dashboard-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek" \
  -d '{"action":"validate_encryption"}'
```

Expected response:
```json
{"success":true,"message":"Encryption validated successfully"}
```

---

## Option 2: Deploy via Supabase CLI (Recommended)

If you have Supabase CLI on your **local machine** (not this container):

### Step 1: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows
scoop install supabase

# Linux
# Download from: https://github.com/supabase/cli/releases
```

### Step 2: Login and Link

```bash
supabase login
supabase link --project-ref bkbcqocpjahewqjmlgvf
```

### Step 3: Generate Encryption Key

```bash
openssl rand -base64 32
# Copy the output
```

### Step 4: Set Secrets

```bash
supabase secrets set CHAT_ENCRYPTION_KEY=<paste-key-here>
```

### Step 5: Apply Migrations

```bash
cd /path/to/yodel-aso-insight-development
supabase db push
```

### Step 6: Deploy Edge Functions

```bash
supabase functions deploy ai-dashboard-chat
supabase functions deploy cleanup-expired-chats
```

### Step 7: Verify

```bash
curl -X POST \
  https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/ai-dashboard-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek" \
  -d '{"action":"validate_encryption"}'
```

---

## After Deployment

Once backend is deployed:

1. **Start dev server**:
```bash
npm run dev
```

2. **Navigate to** `/dashboard-v2`

3. **Click the orange chat button** (bottom-right corner)

4. **Create a chat** and test!

---

## Troubleshooting

### Dashboard deployment issues

**Problem**: Encryption service not found when deploying via dashboard

**Solution**: The dashboard doesn't support `_shared` modules. You have two options:

1. Copy the encryption service code directly into `ai-dashboard-chat/index.ts` (inline it)
2. Use Supabase CLI from your local machine instead

### CLI deployment issues

**Problem**: "Not linked to project"

```bash
supabase link --project-ref bkbcqocpjahewqjmlgvf
```

**Problem**: "Permission denied"

Make sure you're logged in:
```bash
supabase login
```

---

## Quick Check - What You Need

Before testing the chat:

- [x] Database migrations applied (check `chat_sessions` table exists)
- [x] `CHAT_ENCRYPTION_KEY` secret set
- [x] `OPENAI_API_KEY` secret set (should already exist)
- [x] `ai-dashboard-chat` function deployed
- [x] `cleanup-expired-chats` function deployed
- [x] Frontend running (`npm run dev`)

---

Let me know which option you'd like to use or if you need help with any step!
