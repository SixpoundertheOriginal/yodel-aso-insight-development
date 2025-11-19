# AI Dashboard Chat - Setup & Deployment Guide

## Overview

The AI Dashboard Chat feature provides multi-session, encrypted AI chat integrated into the `dashboard-v2` page. Users can ask questions about their analytics data while maintaining privacy and security.

---

## Features

✅ **Multi-session support**: Users can maintain multiple chat conversations
✅ **End-to-end encryption**: Message content encrypted using AES-GCM 256-bit
✅ **24-hour retention**: Sessions auto-expire after 24h (unless pinned)
✅ **Session pinning**: Important conversations can be preserved
✅ **Rate limiting**: 50 messages/user/day (configurable per org)
✅ **Privacy-first**: App names sanitized ("the selected app" instead of real names)
✅ **RLS enforcement**: Organization and user-scoped data access
✅ **Audit logging**: All chat activity tracked in audit_logs table

---

## Architecture

```
Frontend (React)
  ↓
  ├─ DashboardAiChat component (Sheet overlay)
  ├─ useDashboardChat hook
  └─ Context: dateRange, appIds, KPIs
        ↓
Edge Function (ai-dashboard-chat)
  ↓
  ├─ Authentication (JWT validation)
  ├─ Rate limiting check
  ├─ Encryption/Decryption
  ├─ OpenAI API (gpt-4o-mini)
  └─ Supabase (chat_sessions, chat_messages)
        ↓
BigQuery (Analytics Context)
  └─ Passed as sanitized context to OpenAI
```

---

## Prerequisites

Before deploying, ensure you have:

1. **Supabase project** with Edge Functions enabled
2. **OpenAI API key** (already configured: `OPENAI_API_KEY`)
3. **Database migrations** applied
4. **Encryption key** generated and stored in Supabase secrets

---

## Step 1: Generate Encryption Key

Generate a secure 256-bit encryption key:

```bash
openssl rand -base64 32
```

**Example output**:
```
yR8vK3mP9xQ2nT5wL7jH4sG6dF1aZ0cV8bN9mX3kY2=
```

⚠️ **CRITICAL**: Store this key securely. If lost, encrypted messages cannot be decrypted.

---

## Step 2: Add Encryption Key to Supabase Secrets

### Via Supabase Dashboard:

1. Navigate to: **Project Settings > Edge Functions > Secrets**
2. Click **Add new secret**
3. Set:
   - **Name**: `CHAT_ENCRYPTION_KEY`
   - **Value**: `<your-generated-key>`
4. Click **Save**

### Via Supabase CLI:

```bash
supabase secrets set CHAT_ENCRYPTION_KEY=<your-generated-key>
```

---

## Step 3: Apply Database Migrations

Run the chat system migration:

```bash
# Local development
supabase db reset

# Production
supabase db push
```

This creates:
- `chat_sessions` table
- `chat_messages` table
- `chat_rate_limits` table
- RLS policies
- Helper functions
- Audit triggers

---

## Step 4: Deploy Edge Function

Deploy the `ai-dashboard-chat` Edge Function:

```bash
supabase functions deploy ai-dashboard-chat
```

**Expected output**:
```
Deploying ai-dashboard-chat (version xxx)
✓ Deployed ai-dashboard-chat successfully
```

---

## Step 5: Verify Encryption Setup

Test encryption in the Edge Function:

```bash
supabase functions invoke ai-dashboard-chat --body '{
  "action": "validate_encryption"
}'
```

**Expected response**:
```json
{
  "success": true,
  "message": "Encryption validated successfully"
}
```

---

## Step 6: Enable Feature Flag

Add the `dashboard_ai_chat` feature flag to organizations:

```sql
-- Enable for Yodel Mobile (testing)
INSERT INTO public.organization_features (organization_id, feature_key)
SELECT id, 'dashboard_ai_chat'
FROM public.organizations
WHERE name = 'Yodel Mobile'
ON CONFLICT DO NOTHING;

-- Enable for all organizations (production)
INSERT INTO public.organization_features (organization_id, feature_key)
SELECT id, 'dashboard_ai_chat'
FROM public.organizations
ON CONFLICT DO NOTHING;
```

---

## Step 7: Deploy Frontend

Build and deploy the frontend with the new chat components:

```bash
# Build
npm run build

# Deploy (adjust based on your hosting)
# e.g., Vercel, Netlify, etc.
```

---

## Step 8: Setup Cleanup Cron

Deploy the cleanup function for expired sessions:

```bash
supabase functions deploy cleanup-expired-chats
```

Schedule via Supabase Dashboard:
1. Navigate to: **Edge Functions > cleanup-expired-chats**
2. Click **Add cron schedule**
3. Set schedule: `0 */6 * * *` (every 6 hours)
4. Click **Save**

---

## Configuration

### Rate Limits

Update rate limits per organization:

```sql
-- Update for specific organization
INSERT INTO public.chat_rate_limits (
  organization_id,
  messages_per_user_per_day,
  max_active_sessions_per_user
) VALUES (
  '<org-id>',
  100, -- 100 messages/day
  20   -- 20 max sessions
)
ON CONFLICT (organization_id)
DO UPDATE SET
  messages_per_user_per_day = EXCLUDED.messages_per_user_per_day,
  max_active_sessions_per_user = EXCLUDED.max_active_sessions_per_user;

-- Update global default
UPDATE public.chat_rate_limits
SET messages_per_user_per_day = 50
WHERE organization_id IS NULL;
```

### Session Retention

Default: 24 hours (configurable in migration)

To change retention period:

```sql
-- Update default expiration to 48 hours
ALTER TABLE public.chat_sessions
ALTER COLUMN expires_at
SET DEFAULT (now() + interval '48 hours');
```

---

## Testing Checklist

### Manual Testing

- [ ] Create new chat session
- [ ] Send user message
- [ ] Receive AI response
- [ ] Verify app names are sanitized ("App 1", not real names)
- [ ] Create multiple sessions
- [ ] Switch between sessions
- [ ] Pin a session
- [ ] Verify pinned session doesn't expire
- [ ] Test rate limiting (50 messages/day)
- [ ] Verify RLS (cannot access other org's sessions)
- [ ] Check encryption in database (content_encrypted column)
- [ ] Test on desktop (slide-over panel)
- [ ] Verify audit logs (`audit_logs` table)

### Database Verification

```sql
-- Check session count
SELECT COUNT(*) FROM public.chat_sessions;

-- Check message encryption (should see encrypted content)
SELECT id, role, content_encrypted FROM public.chat_messages LIMIT 5;

-- Check audit logs
SELECT action, resource_type, created_at
FROM public.audit_logs
WHERE action LIKE 'ai_chat%'
ORDER BY created_at DESC
LIMIT 10;

-- Check rate limits
SELECT * FROM public.chat_rate_limits;
```

---

## Monitoring

### Key Metrics to Track

1. **Session count**: `SELECT COUNT(*) FROM chat_sessions WHERE expires_at > now()`
2. **Message count**: `SELECT COUNT(*) FROM chat_messages`
3. **Daily active users**: `SELECT COUNT(DISTINCT user_id) FROM chat_sessions WHERE created_at >= CURRENT_DATE`
4. **Average messages per session**: `SELECT AVG(msg_count) FROM (SELECT session_id, COUNT(*) as msg_count FROM chat_messages GROUP BY session_id) t`
5. **OpenAI token usage**: `SELECT SUM(token_count) FROM chat_messages WHERE created_at >= CURRENT_DATE`

### Audit Queries

```sql
-- Recent chat activity
SELECT
  user_email,
  action,
  metadata->>'session_title' as session_title,
  created_at
FROM public.audit_logs
WHERE action LIKE 'ai_chat%'
ORDER BY created_at DESC
LIMIT 20;

-- Top users by message count
SELECT
  cs.user_id,
  COUNT(cm.id) as total_messages,
  COUNT(DISTINCT cs.id) as total_sessions
FROM public.chat_sessions cs
INNER JOIN public.chat_messages cm ON cm.session_id = cs.id
WHERE cm.created_at >= CURRENT_DATE - interval '7 days'
GROUP BY cs.user_id
ORDER BY total_messages DESC
LIMIT 10;
```

---

## Troubleshooting

### Issue: "CHAT_ENCRYPTION_KEY not configured"

**Cause**: Encryption key not set in Supabase secrets

**Fix**:
```bash
supabase secrets set CHAT_ENCRYPTION_KEY=$(openssl rand -base64 32)
```

### Issue: "Decryption failed"

**Cause**: Encryption key mismatch or corrupted ciphertext

**Fix**:
1. Verify key matches: `supabase secrets list`
2. Check encryption format in DB: `SELECT content_encrypted FROM chat_messages LIMIT 1`
3. Should be format: `iv:ciphertext` (both base64)

### Issue: "Rate limit exceeded"

**Cause**: User exceeded 50 messages/day limit

**Fix**:
1. Check current usage:
   ```sql
   SELECT public.get_user_message_count_today('<user-id>');
   ```
2. Increase limit for organization:
   ```sql
   UPDATE public.chat_rate_limits
   SET messages_per_user_per_day = 100
   WHERE organization_id = '<org-id>';
   ```

### Issue: "Session not found"

**Cause**: Session expired or user lacks access

**Fix**:
1. Check expiration:
   ```sql
   SELECT id, title, expires_at, is_pinned
   FROM public.chat_sessions
   WHERE id = '<session-id>';
   ```
2. Pin session to prevent expiration:
   ```sql
   UPDATE public.chat_sessions
   SET is_pinned = true
   WHERE id = '<session-id>';
   ```

---

## Security Considerations

### Encryption

- ✅ **AES-GCM 256-bit** encryption for all message content
- ✅ **Unique IV** per message (prevents pattern analysis)
- ✅ **Server-side only** (encryption keys never exposed to frontend)
- ✅ **Key rotation ready** (encryption_version column for future key rotation)

### Access Control

- ✅ **RLS policies** enforce organization + user scoping
- ✅ **JWT validation** on every Edge Function call
- ✅ **Immutable messages** (no UPDATE or DELETE policies)
- ✅ **Audit logging** tracks all chat activity

### Privacy

- ✅ **App name sanitization** (AI never sees real app names)
- ✅ **Analytics context sanitized** (generic labels like "App 1")
- ✅ **24-hour retention** (automatic cleanup)
- ✅ **Session pinning** requires explicit user action

---

## Maintenance

### Weekly Tasks

- [ ] Review audit logs for anomalies
- [ ] Check OpenAI token usage vs budget
- [ ] Verify cleanup cron is running (check expired session count)

### Monthly Tasks

- [ ] Review rate limit thresholds
- [ ] Analyze user engagement metrics
- [ ] Check database storage growth
- [ ] Review encryption key rotation plan

---

## Support

For issues or questions:

1. Check **troubleshooting section** above
2. Review **audit logs**: `SELECT * FROM audit_logs WHERE action LIKE 'ai_chat%'`
3. Check **Edge Function logs**: Supabase Dashboard > Edge Functions > ai-dashboard-chat > Logs
4. Verify **encryption setup**: Run validation test

---

**Version**: 1.0.0
**Last Updated**: 2025-11-16
**Maintainer**: Yodel ASO Platform Team
