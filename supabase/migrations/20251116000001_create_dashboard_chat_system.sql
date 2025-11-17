-- ============================================
-- Dashboard AI Chat System
-- Date: 2025-11-16
-- Purpose: Multi-session AI chat for dashboard analytics
-- ============================================
--
-- Features:
-- - Multi-session support (multiple chats per user)
-- - Encrypted message storage (AES-GCM 256-bit)
-- - 24-hour retention (auto-cleanup via cron)
-- - Session pinning (prevent expiration)
-- - Rate limiting (50 messages/user/day)
-- - RLS enforcement (org + user scoped)
-- ============================================

-- ============================================
-- STEP 1: Create chat_sessions table
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership & multi-tenancy
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session metadata
  title text NOT NULL DEFAULT 'New Chat',
  context_type text NOT NULL DEFAULT 'dashboard_analytics',

  -- Context snapshot (stores dashboard filters and KPI summary)
  -- Example: { dateRange: {...}, appIds: [...], kpiSummary: {...} }
  context_snapshot jsonb,

  -- Session lifecycle
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),

  -- Pinning support (prevents auto-expiration)
  is_pinned boolean NOT NULL DEFAULT false,
  pinned_at timestamptz,
  pinned_by uuid REFERENCES auth.users(id),

  -- Indexes for performance
  CONSTRAINT chat_sessions_unique_per_org_user
    UNIQUE (organization_id, user_id, id)
);

-- Index for efficient session listing
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
ON public.chat_sessions(user_id, updated_at DESC);

-- Index for cleanup cron (expired sessions)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires_at
ON public.chat_sessions(expires_at, is_pinned)
WHERE is_pinned = false;

-- Index for organization queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_org_user
ON public.chat_sessions(organization_id, user_id);

COMMENT ON TABLE public.chat_sessions IS
  'AI chat sessions for dashboard analytics. Each user can have multiple sessions. Sessions expire after 24h unless pinned.';

COMMENT ON COLUMN public.chat_sessions.context_snapshot IS
  'Stores dashboard context at session creation (date range, selected apps, KPI summary)';

COMMENT ON COLUMN public.chat_sessions.is_pinned IS
  'When true, session will not be auto-deleted by cleanup cron';

-- ============================================
-- STEP 2: Create chat_messages table
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Message data (ENCRYPTED)
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content_encrypted text NOT NULL, -- AES-GCM encrypted, format: "iv:ciphertext"
  encryption_version int NOT NULL DEFAULT 1,

  -- OpenAI metadata
  token_count int,
  model text, -- e.g., 'gpt-4o-mini'

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient session message retrieval (most common query)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
ON public.chat_messages(session_id, created_at ASC);

-- Index for organization queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_org
ON public.chat_messages(organization_id);

-- Index for user message counting (rate limiting)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_daily
ON public.chat_messages(session_id, role, created_at)
WHERE role = 'user';

COMMENT ON TABLE public.chat_messages IS
  'Encrypted chat messages for AI dashboard sessions. Content is encrypted using AES-GCM 256-bit.';

COMMENT ON COLUMN public.chat_messages.content_encrypted IS
  'Encrypted message content. Format: "iv:ciphertext" (both base64-encoded). Decrypt server-side only.';

COMMENT ON COLUMN public.chat_messages.encryption_version IS
  'Encryption version for key rotation support (future-proofing)';

-- ============================================
-- STEP 3: Create RLS policies for chat_sessions
-- ============================================

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sessions in their organization
CREATE POLICY "Users can view own organization chat sessions"
ON public.chat_sessions FOR SELECT
USING (
  organization_id = (auth.jwt()->>'organization_id')::uuid
  AND user_id = auth.uid()
);

-- Policy: Users can create sessions in their organization
CREATE POLICY "Users can create chat sessions in own organization"
ON public.chat_sessions FOR INSERT
WITH CHECK (
  organization_id = (auth.jwt()->>'organization_id')::uuid
  AND user_id = auth.uid()
);

-- Policy: Users can update their own sessions (title, pinning)
CREATE POLICY "Users can update own chat sessions"
ON public.chat_sessions FOR UPDATE
USING (
  organization_id = (auth.jwt()->>'organization_id')::uuid
  AND user_id = auth.uid()
)
WITH CHECK (
  organization_id = (auth.jwt()->>'organization_id')::uuid
  AND user_id = auth.uid()
);

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete own chat sessions"
ON public.chat_sessions FOR DELETE
USING (
  organization_id = (auth.jwt()->>'organization_id')::uuid
  AND user_id = auth.uid()
);

-- ============================================
-- STEP 4: Create RLS policies for chat_messages
-- ============================================

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages in their own sessions
CREATE POLICY "Users can view messages in own sessions"
ON public.chat_messages FOR SELECT
USING (
  organization_id = (auth.jwt()->>'organization_id')::uuid
  AND session_id IN (
    SELECT id FROM public.chat_sessions
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert messages in their own sessions
CREATE POLICY "Users can insert messages in own sessions"
ON public.chat_messages FOR INSERT
WITH CHECK (
  organization_id = (auth.jwt()->>'organization_id')::uuid
  AND session_id IN (
    SELECT id FROM public.chat_sessions
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users cannot update or delete messages (immutable audit trail)
-- No UPDATE or DELETE policies = messages are immutable

-- ============================================
-- STEP 5: Create helper functions
-- ============================================

-- Function: Get active session count for user
CREATE OR REPLACE FUNCTION public.get_user_active_session_count(p_user_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::int
  FROM public.chat_sessions
  WHERE user_id = p_user_id
    AND expires_at > now()
    AND organization_id = (auth.jwt()->>'organization_id')::uuid;
$$;

COMMENT ON FUNCTION public.get_user_active_session_count IS
  'Returns count of active (non-expired) chat sessions for a user';

-- Function: Get user message count for today (rate limiting)
CREATE OR REPLACE FUNCTION public.get_user_message_count_today(p_user_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::int
  FROM public.chat_messages cm
  INNER JOIN public.chat_sessions cs ON cm.session_id = cs.id
  WHERE cs.user_id = p_user_id
    AND cm.role = 'user'
    AND cm.created_at >= CURRENT_DATE
    AND cm.organization_id = (auth.jwt()->>'organization_id')::uuid;
$$;

COMMENT ON FUNCTION public.get_user_message_count_today IS
  'Returns count of user messages sent today (for rate limiting)';

-- Function: Auto-update session.updated_at on new message
CREATE OR REPLACE FUNCTION public.update_chat_session_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.chat_sessions
  SET updated_at = now()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$;

-- Trigger: Update session timestamp on message insert
DROP TRIGGER IF EXISTS trg_update_session_timestamp ON public.chat_messages;
CREATE TRIGGER trg_update_session_timestamp
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_session_timestamp();

COMMENT ON FUNCTION public.update_chat_session_timestamp IS
  'Trigger function to update chat_sessions.updated_at when new message is added';

-- ============================================
-- STEP 6: Create rate limiting configuration table
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Rate limit settings
  messages_per_user_per_day int NOT NULL DEFAULT 50,
  max_active_sessions_per_user int NOT NULL DEFAULT 10,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chat_rate_limits_unique_org UNIQUE (organization_id)
);

-- Enable RLS
ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their org's rate limits
CREATE POLICY "Users can view org rate limits"
ON public.chat_rate_limits FOR SELECT
USING (
  organization_id = (auth.jwt()->>'organization_id')::uuid
  OR organization_id IS NULL -- Global default
);

COMMENT ON TABLE public.chat_rate_limits IS
  'Configurable rate limits for AI chat. Null organization_id = global default.';

-- Insert global default rate limits
INSERT INTO public.chat_rate_limits (organization_id, messages_per_user_per_day, max_active_sessions_per_user)
VALUES (NULL, 50, 10)
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================
-- STEP 7: Create audit log integration
-- ============================================

-- Function: Log chat activity to audit_logs
CREATE OR REPLACE FUNCTION public.log_chat_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email text;
  v_session_title text;
BEGIN
  -- Get user email for audit log
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get session title
  IF TG_TABLE_NAME = 'chat_sessions' THEN
    v_session_title := NEW.title;
  ELSIF TG_TABLE_NAME = 'chat_messages' THEN
    SELECT title INTO v_session_title
    FROM public.chat_sessions
    WHERE id = NEW.session_id;
  END IF;

  -- Insert audit log entry
  INSERT INTO public.audit_logs (
    user_id,
    organization_id,
    user_email,
    action,
    resource_type,
    resource_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    NEW.organization_id,
    v_user_email,
    CASE
      WHEN TG_TABLE_NAME = 'chat_sessions' AND TG_OP = 'INSERT' THEN 'ai_chat_session_created'
      WHEN TG_TABLE_NAME = 'chat_sessions' AND TG_OP = 'UPDATE' THEN 'ai_chat_session_updated'
      WHEN TG_TABLE_NAME = 'chat_messages' AND NEW.role = 'user' THEN 'ai_chat_message_sent'
      WHEN TG_TABLE_NAME = 'chat_messages' AND NEW.role = 'assistant' THEN 'ai_chat_response_received'
      ELSE 'ai_chat_activity'
    END,
    TG_TABLE_NAME,
    CASE
      WHEN TG_TABLE_NAME = 'chat_sessions' THEN NEW.id
      WHEN TG_TABLE_NAME = 'chat_messages' THEN NEW.session_id
    END,
    jsonb_build_object(
      'session_title', v_session_title,
      'model', CASE WHEN TG_TABLE_NAME = 'chat_messages' THEN NEW.model ELSE NULL END,
      'token_count', CASE WHEN TG_TABLE_NAME = 'chat_messages' THEN NEW.token_count ELSE NULL END
    ),
    NULL, -- IP address (set by Edge Function if needed)
    NULL  -- User agent (set by Edge Function if needed)
  );

  RETURN NEW;
END;
$$;

-- Trigger: Audit session creation
DROP TRIGGER IF EXISTS trg_audit_chat_session_create ON public.chat_sessions;
CREATE TRIGGER trg_audit_chat_session_create
AFTER INSERT ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.log_chat_activity();

-- Trigger: Audit message creation
DROP TRIGGER IF EXISTS trg_audit_chat_message_create ON public.chat_messages;
CREATE TRIGGER trg_audit_chat_message_create
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.log_chat_activity();

-- ============================================
-- STEP 8: Grant permissions
-- ============================================

-- Grant SELECT on sessions to authenticated users (RLS enforced)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;

-- Grant SELECT, INSERT on messages to authenticated users (RLS enforced)
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

-- Grant SELECT on rate limits to authenticated users (RLS enforced)
GRANT SELECT ON public.chat_rate_limits TO authenticated;

-- Grant EXECUTE on helper functions
GRANT EXECUTE ON FUNCTION public.get_user_active_session_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_message_count_today TO authenticated;

-- ============================================
-- STEP 9: Success message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Dashboard AI Chat system created successfully';
  RAISE NOTICE '   - chat_sessions table created with RLS';
  RAISE NOTICE '   - chat_messages table created with RLS (encrypted content)';
  RAISE NOTICE '   - Rate limiting configuration table created';
  RAISE NOTICE '   - Helper functions for session/message counting';
  RAISE NOTICE '   - Audit logging triggers integrated';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '   1. Generate encryption key: openssl rand -base64 32';
  RAISE NOTICE '   2. Add to Supabase secrets: CHAT_ENCRYPTION_KEY=<key>';
  RAISE NOTICE '   3. Deploy ai-dashboard-chat Edge Function';
  RAISE NOTICE '   4. Add dashboard_ai_chat feature flag to organizations';
END $$;
