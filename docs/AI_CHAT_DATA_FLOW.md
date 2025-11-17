# AI Dashboard Chat - Data Flow Diagrams

Visual representation of how data flows through the AI chat system.

---

## 1. Message Sending Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ User types message
                                  │ "What's my CVR trend?"
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (DashboardAiChat.tsx)                    │
│                                                                      │
│  1. Get current dashboard state from ASODataContext                 │
│     ┌──────────────────────────────────────────────────┐            │
│     │ dateRange: { start: "2024-01-01", end: "..." }   │            │
│     │ appIds: ["app-123"]                              │            │
│     │ trafficSources: ["organic"]                      │            │
│     │ kpiSummary: {                                    │            │
│     │   impressions: 1000000,                          │            │
│     │   downloads: 50000,                              │            │
│     │   cvr: 5.0,                                      │            │
│     │   product_page_views: 200000                     │            │
│     │ }                                                │            │
│     └──────────────────────────────────────────────────┘            │
│                                                                      │
│  2. Call useDashboardChat.sendMessage(sessionId, message, context)  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTPS POST
                                  │ supabase.functions.invoke('ai-dashboard-chat')
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION (ai-dashboard-chat/index.ts)              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ STEP 1: Authentication                                         │ │
│  │  - Verify JWT token                                            │ │
│  │  - Get user ID from token                                      │ │
│  │  - Lookup organization_id from user_roles table                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ STEP 2: Rate Limiting                                          │ │
│  │  - Check user's message count today                            │ │
│  │  - Query: get_user_message_count_today(user_id)                │ │
│  │  - Limit: 50 messages/day (configurable)                       │ │
│  │  - Reject if exceeded                                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ STEP 3: Load Conversation History                              │ │
│  │  - Query last 10 messages from session                         │ │
│  │  - Decrypt each message                                        │ │
│  │  - Build conversation array: [{role, content}, ...]            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ STEP 4: Build AI Context                                       │ │
│  │  buildAnalyticsContext(dashboardContext)                       │ │
│  │                                                                │ │
│  │  Output:                                                       │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │ Current Dashboard Filters:                               │ │ │
│  │  │ - Date Range: 2024-01-01 to 2024-12-31                  │ │ │
│  │  │ - Apps: app-123                                          │ │ │
│  │  │ - Traffic Sources: organic                               │ │ │
│  │  │                                                           │ │ │
│  │  │ Current KPIs:                                            │ │ │
│  │  │ - Impressions: 1,000,000                                 │ │ │
│  │  │ - Downloads: 50,000                                      │ │ │
│  │  │ - Conversion Rate: 5.00%                                 │ │ │
│  │  │ - Product Page Views: 200,000                            │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ STEP 5: Build System Prompt                                    │ │
│  │  buildDashboardChatSystemPrompt(analyticsContext)              │ │
│  │                                                                │ │
│  │  Output:                                                       │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │ You are an ASO analytics assistant...                    │ │ │
│  │  │                                                           │ │ │
│  │  │ [Analytics Context injected here]                        │ │ │
│  │  │                                                           │ │ │
│  │  │ Guidelines:                                              │ │ │
│  │  │ - Provide insights based on current metrics              │ │ │
│  │  │ - Suggest optimizations for CVR and impressions          │ │ │
│  │  │ - Keep responses concise and actionable                  │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ STEP 6: Call OpenAI API                                        │ │
│  │  POST https://api.openai.com/v1/chat/completions              │ │
│  │                                                                │ │
│  │  Request:                                                      │ │
│  │  {                                                             │ │
│  │    model: "gpt-4o-mini",                                       │ │
│  │    messages: [                                                 │ │
│  │      { role: "system", content: systemPrompt },                │ │
│  │      ...conversationHistory,                                   │ │
│  │      { role: "user", content: "What's my CVR trend?" }         │ │
│  │    ],                                                          │ │
│  │    temperature: 0.7,                                           │ │
│  │    max_tokens: 1500                                            │ │
│  │  }                                                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTPS Response
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         OPENAI API RESPONSE                          │
│                                                                      │
│  {                                                                   │
│    choices: [{                                                       │
│      message: {                                                      │
│        role: "assistant",                                            │
│        content: "Based on your 5.0% CVR with 1M impressions..."      │
│      }                                                               │
│    }],                                                               │
│    usage: {                                                          │
│      total_tokens: 1234                                              │
│    }                                                                 │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION (Continued)                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ STEP 7: Encrypt Messages                                       │ │
│  │  - Encrypt user message: "What's my CVR trend?"                │ │
│  │  - Encrypt AI response: "Based on your 5.0% CVR..."           │ │
│  │  - Format: "iv_hex:ciphertext_hex"                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ STEP 8: Store in Database                                      │ │
│  │  INSERT INTO chat_messages (                                   │ │
│  │    session_id, organization_id, role, content_encrypted,       │ │
│  │    token_count, model                                          │ │
│  │  ) VALUES                                                      │ │
│  │    -- User message                                             │ │
│  │    (..., 'user', 'a1b2c3:encrypted...', null, null),           │ │
│  │    -- AI message                                               │ │
│  │    (..., 'assistant', 'x9y8z7:encrypted...', 1234, 'gpt-4o-mini') │
│  │                                                                │ │
│  │  ✓ Triggers fire: log_chat_activity()                         │ │
│  │  ✓ Audit logs created automatically                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ STEP 9: Return Response                                        │ │
│  │  {                                                             │ │
│  │    message: { id, role, content, timestamp },                 │ │
│  │    tokenCount: 1234                                            │ │
│  │  }                                                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTPS Response
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (useDashboardChat.ts)                    │
│                                                                      │
│  1. Receive response                                                │
│  2. Reload session to get all messages (decrypted)                  │
│  3. Update UI with new messages                                     │
│  4. Show toast: "Message sent (1234 tokens)"                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         USER SEES RESPONSE                           │
│                                                                      │
│  AI: "Based on your 5.0% CVR with 1M impressions, your conversion   │
│       rate is performing well above the industry average of 3-4%.   │
│       To maintain this, focus on..."                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Trigger Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INSERT INTO chat_sessions                         │
│                    or chat_messages                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ AFTER INSERT
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              TRIGGER: trg_audit_chat_*_create                        │
│              EXECUTES: log_chat_activity()                           │
│                                                                      │
│  DECLARE                                                             │
│    v_user_email text;                                                │
│    v_session_title text;                                             │
│    v_action text;                                                    │
│    v_model text;                                                     │
│    v_token_count int;                                                │
│    v_role text;                                                      │
│    v_resource_id uuid;                                               │
│    v_organization_id uuid;                                           │
│    v_user_id uuid;                                                   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Step 1: Extract fields using dynamic SQL                       │ │
│  │  EXECUTE format('SELECT ($1).%I', 'organization_id')           │ │
│  │    INTO v_organization_id USING NEW;                           │ │
│  │                                                                │ │
│  │  Why dynamic SQL?                                              │ │
│  │  - Different tables have different fields                      │ │
│  │  - chat_sessions has 'id', 'title'                            │ │
│  │  - chat_messages has 'session_id', 'role', 'model'            │ │
│  │  - Static access like NEW.role fails on chat_sessions         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Step 2: Get user email                                         │ │
│  │  SELECT email INTO v_user_email                                │ │
│  │  FROM auth.users                                               │ │
│  │  WHERE id = COALESCE(auth.uid(), v_user_id);                  │ │
│  │                                                                │ │
│  │  Note: COALESCE handles service role inserts                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Step 3: Determine action based on table                       │ │
│  │                                                                │ │
│  │  IF TG_TABLE_NAME = 'chat_sessions' THEN                      │ │
│  │    v_action := 'ai_chat_session_created'                      │ │
│  │    v_resource_id := NEW.id                                     │ │
│  │    v_session_title := NEW.title                                │ │
│  │                                                                │ │
│  │  ELSIF TG_TABLE_NAME = 'chat_messages' THEN                   │ │
│  │    v_role := NEW.role                                          │ │
│  │    v_action := CASE v_role                                     │ │
│  │      WHEN 'user' THEN 'ai_chat_message_sent'                  │ │
│  │      WHEN 'assistant' THEN 'ai_chat_response_received'        │ │
│  │    END                                                         │ │
│  │    v_resource_id := NEW.session_id                             │ │
│  │    v_model := NEW.model                                        │ │
│  │    v_token_count := NEW.token_count                            │ │
│  │  END IF                                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Step 4: Insert audit log                                       │ │
│  │  INSERT INTO audit_logs (                                      │ │
│  │    user_id,                                                    │ │
│  │    organization_id,                                            │ │
│  │    user_email,                                                 │ │
│  │    action,                                                     │ │
│  │    resource_type,                                              │ │
│  │    resource_id,                                                │ │
│  │    details,          ← IMPORTANT: Not 'metadata'!             │ │
│  │    ip_address,                                                 │ │
│  │    user_agent                                                  │ │
│  │  ) VALUES (                                                    │ │
│  │    v_user_id,                                                  │ │
│  │    v_organization_id,                                          │ │
│  │    v_user_email,                                               │ │
│  │    v_action,                                                   │ │
│  │    TG_TABLE_NAME,                                              │ │
│  │    v_resource_id,                                              │ │
│  │    jsonb_build_object(                                         │ │
│  │      'session_title', v_session_title,                         │ │
│  │      'model', v_model,                                         │ │
│  │      'token_count', v_token_count                              │ │
│  │    ),                                                          │ │
│  │    NULL,                                                       │ │
│  │    NULL                                                        │ │
│  │  );                                                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     AUDIT LOG CREATED                                │
│                                                                      │
│  id: uuid-generated                                                  │
│  user_id: 8920ac57-63da-4f8e-9970-719be1e2569c                       │
│  organization_id: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b              │
│  user_email: cli@yodelmobile.com                                     │
│  action: ai_chat_message_sent                                        │
│  resource_type: chat_messages                                        │
│  resource_id: ba3b5388-7c50-438c-8276-f59c96b264b7                   │
│  details: {                                                          │
│    "session_title": "CVR Analysis",                                  │
│    "model": null,                                                    │
│    "token_count": null                                               │
│  }                                                                   │
│  created_at: 2025-11-17 12:34:56                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Current Data Available vs. What AI Receives

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      ASODataContext (Frontend State)                       │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ ✅ CURRENTLY SENT TO AI                                             │  │
│  │                                                                      │  │
│  │  dateRange: { start, end }                                          │  │
│  │  appIds: string[]                                                   │  │
│  │  trafficSources: string[]                                           │  │
│  │  kpiSummary: {                                                      │  │
│  │    impressions: number                                              │  │
│  │    downloads: number                                                │  │
│  │    cvr: number                                                      │  │
│  │    product_page_views: number                                       │  │
│  │  }                                                                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ ❌ AVAILABLE BUT NOT SENT (Enhancement Opportunity!)                │  │
│  │                                                                      │  │
│  │  dailyData: Array<{                   ← TREND ANALYSIS              │  │
│  │    date: string                                                     │  │
│  │    impressions: number                                              │  │
│  │    downloads: number                                                │  │
│  │    cvr: number                                                      │  │
│  │    product_page_views: number                                       │  │
│  │    taps: number                                                     │  │
│  │    ... 20+ more metrics                                            │  │
│  │  }>                                                                 │  │
│  │                                                                      │  │
│  │  keywordData: Array<{                 ← KEYWORD INSIGHTS            │  │
│  │    keyword: string                                                  │  │
│  │    rank: number                                                     │  │
│  │    impressions: number                                              │  │
│  │    taps: number                                                     │  │
│  │    installs: number                                                 │  │
│  │    cvr: number                                                      │  │
│  │  }>                                                                 │  │
│  │                                                                      │  │
│  │  creativeData: Array<{                ← CREATIVE OPTIMIZATION       │  │
│  │    asset_id: string                                                 │  │
│  │    type: string                                                     │  │
│  │    impressions: number                                              │  │
│  │    conversion_rate: number                                          │  │
│  │  }>                                                                 │  │
│  │                                                                      │  │
│  │  searchTermData: Array<{              ← SEARCH DISCOVERY            │  │
│  │    term: string                                                     │  │
│  │    popularity: number                                               │  │
│  │    impressions: number                                              │  │
│  │  }>                                                                 │  │
│  │                                                                      │  │
│  │  competitorData: Array<{              ← COMPETITIVE ANALYSIS        │  │
│  │    app_id: string                                                   │  │
│  │    metrics: { ... }                                                 │  │
│  │  }>                                                                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘

                                      │
                                      │ Only top section sent
                                      ▼

┌───────────────────────────────────────────────────────────────────────────┐
│                    What AI Currently Sees                                  │
│                                                                            │
│  Current Dashboard Filters:                                                │
│  - Date Range: 2024-01-01 to 2024-12-31                                   │
│  - Apps: app-123                                                           │
│  - Traffic Sources: organic                                                │
│                                                                            │
│  Current KPIs:                                                             │
│  - Impressions: 1,000,000                                                  │
│  - Downloads: 50,000                                                       │
│  - Conversion Rate: 5.00%                                                  │
│  - Product Page Views: 200,000                                             │
└───────────────────────────────────────────────────────────────────────────┘

                                      │
                                      │ Enhancement: Add rich data
                                      ▼

┌───────────────────────────────────────────────────────────────────────────┐
│                    What AI Could See (Enhanced)                            │
│                                                                            │
│  Current Dashboard Filters:                                                │
│  - Date Range: 2024-01-01 to 2024-12-31                                   │
│  - Apps: app-123                                                           │
│  - Traffic Sources: organic                                                │
│                                                                            │
│  Current KPIs:                                                             │
│  - Impressions: 1,000,000 (↑15.2% vs last period)                         │
│  - Downloads: 50,000 (↓3.4% vs last period)                               │
│  - Conversion Rate: 5.00% (↑8.1% vs last period)                          │
│  - Product Page Views: 200,000 (↑12.3% vs last period)                    │
│                                                                            │
│  Trend Data (Last 30 Days):                                                │
│  - Daily metrics available for trend analysis                              │
│  - Peak impressions: 45,000 on 2024-11-15                                 │
│  - CVR range: 4.2% - 6.1%                                                  │
│                                                                            │
│  Top Keywords (by impressions):                                            │
│  1. "photo editor" - 250,000 impressions, 6.2% CVR, Rank #3               │
│  2. "image editing" - 180,000 impressions, 4.8% CVR, Rank #5              │
│  3. "filter app" - 120,000 impressions, 5.1% CVR, Rank #2                 │
│  ...                                                                       │
│                                                                            │
│  Creative Performance:                                                     │
│  - Screenshot #1: 5.8% CVR (16% above average)                             │
│  - Screenshot #2: 4.2% CVR (14% below average) ⚠️                          │
│  - App Icon: 5.5% CVR (10% above average)                                 │
│                                                                            │
│  Anomalies Detected:                                                       │
│  - CVR dropped 40% on 2024-11-08 (possible cause: keyword ranking drop)   │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

**Impact of Enhancement:**

| Question | Current AI Response | Enhanced AI Response |
|----------|-------------------|---------------------|
| "How is my CVR trending?" | "Your current CVR is 5.0%, which is above average." | "Your CVR has been trending upward, from 4.2% at the start of the period to 5.0% today—a 19% improvement. The peak was 6.1% on Nov 15." |
| "Which keywords should I focus on?" | "Based on ASO best practices, focus on high-volume keywords..." | "'photo editor' drives the most impressions (250K) with strong 6.2% CVR. 'image editing' has good volume but underperforming CVR at 4.8%—opportunity for optimization." |
| "Why did my downloads drop?" | "Downloads can fluctuate due to various factors..." | "Your downloads dropped 3.4% while impressions increased 15.2%, resulting in a CVR decline from 5.8% to 5.0%. Looking at creatives, Screenshot #2 is 14% below average—consider testing a variant." |

---

## 4. Security & Encryption Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PLAINTEXT MESSAGE                             │
│               "What's my CVR trend this month?"                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 EncryptionService.encrypt()                          │
│                                                                      │
│  1. Generate random IV (12 bytes)                                   │
│     iv = crypto.getRandomValues(new Uint8Array(12))                 │
│     Example: [0xa1, 0xb2, 0xc3, ..., 0xf6]                          │
│                                                                      │
│  2. Import encryption key from secrets                              │
│     key = await crypto.subtle.importKey(                            │
│       'raw',                                                         │
│       hexToBuffer(CHAT_ENCRYPTION_KEY),  // 256-bit key             │
│       { name: 'AES-GCM' },                                           │
│       false,                                                         │
│       ['encrypt']                                                    │
│     )                                                                │
│                                                                      │
│  3. Encrypt with AES-256-GCM                                        │
│     ciphertext = await crypto.subtle.encrypt(                       │
│       { name: 'AES-GCM', iv },                                       │
│       key,                                                           │
│       textEncoder.encode("What's my CVR trend this month?")          │
│     )                                                                │
│                                                                      │
│  4. Format as "iv:ciphertext" (hex-encoded)                         │
│     return bufferToHex(iv) + ':' + bufferToHex(ciphertext)          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ENCRYPTED MESSAGE                             │
│  "a1b2c3d4e5f6789012345678:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d..."     │
│   └────────────┬─────────┘ └─────────────┬──────────────────┘       │
│              IV (hex)              Ciphertext (hex)                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Stored in database
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATABASE (PostgreSQL)                            │
│                                                                      │
│  chat_messages table:                                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ id: uuid-123                                                │    │
│  │ content_encrypted: "a1b2c3d4e5f6...:9a8b7c6d5e4f3a2b..."    │    │
│  │ encryption_version: 1                                       │    │
│  │ ...                                                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ✅ Encrypted at rest                                                │
│  ✅ Included in backups (still encrypted)                            │
│  ✅ Unreadable without CHAT_ENCRYPTION_KEY                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ When loading message
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 EncryptionService.decrypt()                          │
│                                                                      │
│  1. Split "iv:ciphertext"                                           │
│     [ivHex, ciphertextHex] = encrypted.split(':')                   │
│                                                                      │
│  2. Convert hex to buffers                                          │
│     iv = hexToBuffer(ivHex)                                         │
│     ciphertext = hexToBuffer(ciphertextHex)                         │
│                                                                      │
│  3. Import decryption key                                           │
│     key = await crypto.subtle.importKey(                            │
│       'raw',                                                         │
│       hexToBuffer(CHAT_ENCRYPTION_KEY),                             │
│       { name: 'AES-GCM' },                                           │
│       false,                                                         │
│       ['decrypt']                                                    │
│     )                                                                │
│                                                                      │
│  4. Decrypt with AES-256-GCM                                        │
│     plaintext = await crypto.subtle.decrypt(                        │
│       { name: 'AES-GCM', iv },                                       │
│       key,                                                           │
│       ciphertext                                                     │
│     )                                                                │
│                                                                      │
│  5. Return as string                                                │
│     return textDecoder.decode(plaintext)                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        PLAINTEXT MESSAGE                             │
│               "What's my CVR trend this month?"                      │
│                      (Displayed to user)                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Security Properties:**
- ✅ Each message has unique IV (prevents pattern analysis)
- ✅ AES-GCM provides authentication (detects tampering)
- ✅ Key stored in Supabase Secrets (not in code/env)
- ✅ Key never leaves Edge Function environment
- ✅ Encrypted data in database backups
- ⚠️ If key is lost, data is UNRECOVERABLE

---

*Last updated: 2025-11-17*
