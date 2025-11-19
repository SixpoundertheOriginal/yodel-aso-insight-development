# Quick Setup Guide for AI Dashboard Chat (Local Dev)

## Issue: Chat fails when starting new session

**Root cause**: Backend Edge Functions and database migrations need to be deployed to your Supabase project.

---

## Quick Fix Steps

### 1. Install Dependencies (if needed)

```bash
npm install
```

### 2. Deploy Database Migrations

You need Supabase CLI. Install it:

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

Then login and link to your project:

```bash
supabase login

# Link to your project (bkbcqocpjahewqjmlgvf)
supabase link --project-ref bkbcqocpjahewqjmlgvf
```

Apply migrations:

```bash
supabase db push
```

### 3. Generate Encryption Key

```bash
openssl rand -base64 32
```

Copy the output (example: `yR8vK3mP9xQ2nT5wL7jH4sG6dF1aZ0cV8bN9mX3kY2=`)

### 4. Add Encryption Key to Supabase

```bash
supabase secrets set CHAT_ENCRYPTION_KEY=<your-key-from-step-3>
```

### 5. Deploy Edge Functions

```bash
# Deploy the main chat function
supabase functions deploy ai-dashboard-chat

# Deploy the cleanup cron
supabase functions deploy cleanup-expired-chats
```

### 6. Verify Encryption Setup

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

### 7. Start Dev Server

```bash
npm install  # If you haven't already
npm run dev
```

---

## Alternative: Quick Deploy Script

Create a file `deploy-chat.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying AI Dashboard Chat..."

# 1. Generate encryption key
echo "📝 Generating encryption key..."
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "Generated key: $ENCRYPTION_KEY"

# 2. Set encryption key
echo "🔐 Setting encryption key in Supabase..."
supabase secrets set CHAT_ENCRYPTION_KEY=$ENCRYPTION_KEY

# 3. Apply database migrations
echo "📊 Applying database migrations..."
supabase db push

# 4. Deploy Edge Functions
echo "⚡ Deploying Edge Functions..."
supabase functions deploy ai-dashboard-chat
supabase functions deploy cleanup-expired-chats

# 5. Test encryption
echo "✅ Testing encryption setup..."
curl -X POST \
  https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/ai-dashboard-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek" \
  -d '{"action":"validate_encryption"}'

echo ""
echo "✅ Deployment complete!"
echo "🔑 Encryption key: $ENCRYPTION_KEY"
echo "💡 Save this key securely!"
```

Make it executable and run:

```bash
chmod +x deploy-chat.sh
./deploy-chat.sh
```

---

## Troubleshooting

### Error: "Supabase CLI not found"

Install Supabase CLI:
```bash
brew install supabase/tap/supabase
# or
npm install -g supabase
```

### Error: "Not linked to project"

Link to your project:
```bash
supabase link --project-ref bkbcqocpjahewqjmlgvf
```

### Error: "Failed to create session"

Check browser console for the exact error. Common issues:
- Edge Function not deployed → Deploy with `supabase functions deploy ai-dashboard-chat`
- Encryption key missing → Run `supabase secrets set CHAT_ENCRYPTION_KEY=...`
- Migrations not applied → Run `supabase db push`

### Error: "OPENAI_API_KEY not configured"

The OpenAI key should already be set. Verify:
```bash
supabase secrets list
```

If missing, set it:
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

---

## Verify Deployment

After deployment, check:

1. **Database tables exist**:
   - Go to Supabase Dashboard → Table Editor
   - Look for: `chat_sessions`, `chat_messages`, `chat_rate_limits`

2. **Edge Functions deployed**:
   - Go to Supabase Dashboard → Edge Functions
   - Should see: `ai-dashboard-chat`, `cleanup-expired-chats`

3. **Secrets configured**:
   ```bash
   supabase secrets list
   ```
   Should show: `CHAT_ENCRYPTION_KEY`, `OPENAI_API_KEY`

---

## Next Steps

Once deployed:

1. Start dev server: `npm run dev`
2. Navigate to `/dashboard-v2`
3. Click orange chat button (bottom-right)
4. Click "New Chat"
5. Send a message!

---

## Need Help?

Common error messages and fixes:

**"Maximum active sessions reached"**
→ Delete old sessions or wait for them to expire (24h)

**"Daily message limit reached"**
→ Wait until tomorrow or increase limit in `chat_rate_limits` table

**"Session not found"**
→ Session may have expired (24h retention)

**"Encryption failed"**
→ Verify `CHAT_ENCRYPTION_KEY` is set correctly

---

Let me know which error you're seeing in the browser console!
