# AI Dashboard Chat - Quick Reference

**Quick links for common tasks**

## 🚀 Quick Start

### Test the Chat
```bash
# 1. Open app in browser
npm run dev

# 2. Navigate to Reporting v2
# 3. Click chat icon in header
# 4. Create new session and send message
```

### Deploy Changes
```bash
# Deploy Edge Function
npx supabase functions deploy ai-dashboard-chat

# Apply database migrations
npx supabase db push --include-all

# Deploy frontend
npm run build
```

---

## 📊 Adding New Data to AI Context

### Step 1: Update Interface
```typescript
// src/hooks/useDashboardChat.ts

export interface DashboardContext {
  dateRange: { start: string; end: string };
  appIds: string[];
  trafficSources: string[];
  kpiSummary: { ... };

  // ADD YOUR NEW DATA HERE
  topKeywords?: Array<{
    keyword: string;
    impressions: number;
    cvr: number;
  }>;
}
```

### Step 2: Update Frontend Context Builder
```typescript
// src/components/DashboardAiChat.tsx

const buildDashboardContext = (): DashboardContext => {
  return {
    // ... existing fields

    // ADD YOUR NEW DATA HERE
    topKeywords: asoData.keywordData?.slice(0, 20)
  };
};
```

### Step 3: Update Edge Function Context Builder
```typescript
// supabase/functions/ai-dashboard-chat/index.ts:599

function buildAnalyticsContext(context: DashboardContext): string {
  let contextStr = /* existing summary */;

  // ADD YOUR NEW DATA HERE
  if (context.topKeywords?.length > 0) {
    contextStr += `\n\nTop Keywords:\n`;
    context.topKeywords.forEach(kw => {
      contextStr += `- ${kw.keyword}: ${kw.impressions.toLocaleString()} impressions, ${kw.cvr.toFixed(2)}% CVR\n`;
    });
  }

  return contextStr;
}
```

### Step 4: Deploy
```bash
npx supabase functions deploy ai-dashboard-chat
```

---

## 🔧 Common Tasks

### Check Logs
```bash
# Edge Function logs (real-time)
npx supabase functions logs ai-dashboard-chat

# With follow
npx supabase functions logs ai-dashboard-chat --follow

# Database logs
# Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/logs/edge-functions
```

### Manage Secrets
```bash
# List all secrets
npx supabase secrets list

# Set OpenAI key
npx supabase secrets set OPENAI_API_KEY=sk-...

# Set encryption key (DO NOT CHANGE after data exists!)
npx supabase secrets set CHAT_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### Test Encryption
```bash
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/ai-dashboard-chat \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"validate_encryption"}'
```

### Query Database
```sql
-- Get recent sessions
SELECT id, title, created_at, user_id
FROM chat_sessions
ORDER BY created_at DESC
LIMIT 10;

-- Get message count by user
SELECT user_id, COUNT(*) as message_count
FROM chat_messages
WHERE created_at >= CURRENT_DATE
GROUP BY user_id;

-- Check audit logs
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE created_at >= CURRENT_DATE
GROUP BY action;
```

---

## 🐛 Debugging Checklist

### Message not sending?

1. **Check OpenAI billing**
   - https://platform.openai.com/account/billing
   - Ensure payment method added

2. **Check API key**
   ```bash
   npx supabase secrets list | grep OPENAI_API_KEY
   ```

3. **Check Edge Function logs**
   ```bash
   npx supabase functions logs ai-dashboard-chat
   ```

4. **Test with curl**
   ```bash
   curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/ai-dashboard-chat \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "create_session",
       "dashboardContext": {
         "dateRange": {"start": "2024-01-01", "end": "2024-12-31"},
         "appIds": ["test"],
         "trafficSources": ["organic"],
         "kpiSummary": {"impressions": 1000, "downloads": 100, "cvr": 10, "product_page_views": 500}
       }
     }'
   ```

### Session not creating?

1. **Check user has organization**
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'user-id-here';
   ```

2. **Check rate limits**
   ```sql
   SELECT get_user_active_session_count('user-id-here');
   -- Should be < 5
   ```

3. **Check migrations applied**
   ```bash
   npx supabase migration list
   # Ensure all 20251117* migrations show "Remote: applied"
   ```

### Decryption failing?

1. **Check encryption key exists**
   ```bash
   npx supabase secrets list | grep CHAT_ENCRYPTION_KEY
   ```

2. **Test encryption roundtrip**
   ```bash
   curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/ai-dashboard-chat \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"action":"validate_encryption"}'
   ```

---

## 📈 Performance Monitoring

### Key Metrics to Track

```sql
-- Average messages per session
SELECT AVG(message_count)
FROM (
  SELECT session_id, COUNT(*) as message_count
  FROM chat_messages
  GROUP BY session_id
) t;

-- Most active users (last 7 days)
SELECT user_id, user_email, COUNT(*) as messages
FROM audit_logs
WHERE action IN ('ai_chat_message_sent')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id, user_email
ORDER BY messages DESC
LIMIT 10;

-- Average session lifetime
SELECT AVG(EXTRACT(EPOCH FROM (expires_at - created_at))/3600) as avg_hours
FROM chat_sessions
WHERE created_at >= NOW() - INTERVAL '30 days';
```

### OpenAI Cost Tracking

```sql
-- Total tokens used (last 30 days)
SELECT
  SUM(CAST(details->>'token_count' AS INT)) as total_tokens,
  (SUM(CAST(details->>'token_count' AS INT)) * 0.00033 / 1000) as estimated_cost_usd
FROM audit_logs
WHERE action = 'ai_chat_response_received'
  AND created_at >= NOW() - INTERVAL '30 days'
  AND details->>'token_count' IS NOT NULL;
```

---

## 🔐 Security Checklist

### Before Production Deploy

- [ ] OpenAI API key configured
- [ ] Encryption key generated and set
- [ ] RLS policies enabled on all tables
- [ ] Audit logging tested and working
- [ ] Rate limits configured appropriately
- [ ] CORS headers configured correctly
- [ ] Service role key secured (not in git)

### Regular Maintenance

- [ ] Review audit logs weekly
- [ ] Monitor OpenAI costs monthly
- [ ] Check for expired sessions to clean up
- [ ] Review rate limit violations
- [ ] Update dependencies quarterly

---

## 📝 Code Snippets

### Custom System Prompt
```typescript
// supabase/functions/ai-dashboard-chat/index.ts:636

function buildDashboardChatSystemPrompt(analyticsContext: string): string {
  return `You are an ASO analytics expert at Yodel Mobile.

${analyticsContext}

Your role:
- Provide actionable insights based on the data
- Explain trends and patterns
- Suggest optimization strategies
- Keep responses concise (2-3 sentences)

Style:
- Professional but friendly
- Data-driven
- Action-oriented
`;
}
```

### Rate Limit Check
```typescript
// Check before expensive operations
const { data: messageCount } = await supabase
  .rpc('get_user_message_count_today', { p_user_id: user.id });

if (messageCount >= 50) {
  throw new Error('Daily message limit reached');
}
```

### Custom Error Messages
```typescript
// Frontend: src/hooks/useDashboardChat.ts

if (error.message?.includes('billing')) {
  toast.error('AI service unavailable. Contact admin.');
} else if (error.message?.includes('rate limit')) {
  toast.error('Daily limit reached. Try tomorrow.');
} else {
  toast.error('Something went wrong. Please try again.');
}
```

---

## 🎯 Quick Wins (Easy Enhancements)

### 1. Add Date Range to Context (15 min)
```typescript
// Already passed, just need to mention in prompt
const systemPrompt = `
Current date range: ${context.dateRange.start} to ${context.dateRange.end}
Keep this timeframe in mind when providing insights.
`;
```

### 2. Add User Name to Messages (30 min)
```typescript
// Get user name from auth
const { data: { user } } = await supabase.auth.getUser();
const userName = user.user_metadata?.full_name || user.email;

// Include in system prompt
const systemPrompt = `You're helping ${userName}...`;
```

### 3. Add Message Timestamp Display (15 min)
```typescript
// Frontend: DashboardAiChat.tsx
<div className="text-xs text-gray-500">
  {formatDistance(new Date(message.timestamp), new Date(), { addSuffix: true })}
</div>
```

### 4. Add Keyboard Shortcuts (30 min)
```typescript
// Ctrl+Enter to send
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'Enter') {
    handleSendMessage();
  }
};
```

### 5. Add Message Copy Button (20 min)
```typescript
// Add copy icon to each message
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
};
```

---

## 📚 Resources

### Documentation
- Main docs: `docs/AI_DASHBOARD_CHAT.md`
- Quickstart: `docs/QUICKSTART_CHAT.md`
- This guide: `docs/AI_CHAT_QUICK_REFERENCE.md`

### External Resources
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Supabase Functions](https://supabase.com/docs/guides/functions)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

### Dashboards
- [Supabase Console](https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf)
- [OpenAI Usage](https://platform.openai.com/usage)

---

## ⚡ Hot Reload Development

### Local Development Setup
```bash
# Terminal 1: Run Supabase locally
npx supabase start

# Terminal 2: Serve functions locally
npx supabase functions serve ai-dashboard-chat --env-file .env.local

# Terminal 3: Run frontend
npm run dev
```

### Update .env.local for local development
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-local-anon-key
OPENAI_API_KEY=sk-your-key
CHAT_ENCRYPTION_KEY=your-hex-key
```

---

## 🚨 Emergency Procedures

### OpenAI API Down
```typescript
// Add fallback in Edge Function
try {
  const response = await fetch('https://api.openai.com/...');
} catch (error) {
  // Return graceful error
  return new Response(JSON.stringify({
    error: 'AI service temporarily unavailable. Please try again later.'
  }), { status: 503 });
}
```

### Database Connection Issues
```typescript
// Check if connected
const { data, error } = await supabase.from('chat_sessions').select('id').limit(1);
if (error) {
  return new Response(JSON.stringify({
    error: 'Database temporarily unavailable.'
  }), { status: 503 });
}
```

### Encryption Key Lost
**⚠️ CRITICAL: Encrypted messages are UNRECOVERABLE**

1. Generate new key
2. Deploy with new key
3. Old messages will fail to decrypt
4. Option 1: Delete old messages
5. Option 2: Keep old key for reads, use new for writes (dual-key system)

---

*Last updated: 2025-11-17*
