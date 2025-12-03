-- ============================================
-- User Session Tracking System
-- Date: December 3, 2025
-- Purpose: Track active user sessions for admin monitoring
-- ============================================

-- ============================================
-- STEP 1: Create user_sessions table
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_email text, -- Denormalized for easier querying

  -- Session identification
  session_token_hash text, -- SHA-256 hash of access_token (for session matching)

  -- Device/browser info
  ip_address inet,
  user_agent text,
  device_type text, -- 'mobile', 'desktop', 'tablet', 'unknown'
  browser text, -- 'Chrome', 'Safari', 'Firefox', etc.
  os text, -- 'Windows', 'macOS', 'iOS', 'Android', etc.

  -- Geolocation (optional - populated by IP lookup)
  country_code text, -- 'US', 'GB', etc.
  country_name text,
  city text,

  -- Session lifecycle
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  ended_at timestamptz, -- NULL = still active

  -- Session end metadata
  end_reason text, -- 'logout', 'timeout', 'force_logout', 'token_expired', 'user_deleted'

  -- Constraints
  CONSTRAINT valid_session_dates CHECK (
    (ended_at IS NULL OR ended_at >= created_at) AND
    (expires_at IS NULL OR expires_at >= created_at)
  )
);

-- Add comments for documentation
COMMENT ON TABLE public.user_sessions IS
  'Tracks active and historical user sessions.
   Used for "who''s online" monitoring, session management, and security auditing.
   Super admins can view all sessions and force logout users.';

COMMENT ON COLUMN public.user_sessions.session_token_hash IS
  'SHA-256 hash of Supabase access_token for session matching.
   Used to identify which session to update on activity.';

COMMENT ON COLUMN public.user_sessions.last_active_at IS
  'Last time user performed an action (page view, API call, etc.).
   Updated automatically by heartbeat mechanism.';

COMMENT ON COLUMN public.user_sessions.end_reason IS
  'Why session ended: logout (user clicked logout), timeout (inactivity),
   force_logout (admin terminated), token_expired (JWT expired), user_deleted.';

-- ============================================
-- STEP 2: Create indexes for performance
-- ============================================

-- Index for active sessions (most common query)
CREATE INDEX idx_sessions_active
ON public.user_sessions(user_id, last_active_at DESC)
WHERE ended_at IS NULL;

-- Index for session lookup by token hash
CREATE INDEX idx_sessions_token_hash
ON public.user_sessions(session_token_hash)
WHERE ended_at IS NULL;

-- Index for "who's online" queries (last 5 minutes)
CREATE INDEX idx_sessions_recently_active
ON public.user_sessions(last_active_at DESC)
WHERE ended_at IS NULL;

-- Index for user session history
CREATE INDEX idx_sessions_user_history
ON public.user_sessions(user_id, created_at DESC);

-- Index for organization session tracking
CREATE INDEX idx_sessions_org
ON public.user_sessions(organization_id, last_active_at DESC)
WHERE ended_at IS NULL;

-- Index for security monitoring (failed sessions, multiple IPs)
CREATE INDEX idx_sessions_ip_user
ON public.user_sessions(ip_address, user_id, created_at DESC);

-- ============================================
-- STEP 3: Enable RLS on user_sessions
-- ============================================

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create RLS Policies
-- ============================================

-- Policy 1: Users can view their own sessions
DROP POLICY IF EXISTS "users_view_own_sessions" ON public.user_sessions;

CREATE POLICY "users_view_own_sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

COMMENT ON POLICY "users_view_own_sessions" ON public.user_sessions IS
  'Users can view their own session history.
   Supports GDPR right to access personal data.';

-- Policy 2: Super admins can view all sessions
DROP POLICY IF EXISTS "super_admin_view_all_sessions" ON public.user_sessions;

CREATE POLICY "super_admin_view_all_sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
  )
);

COMMENT ON POLICY "super_admin_view_all_sessions" ON public.user_sessions IS
  'Super admins can view all sessions for monitoring and management.';

-- Policy 3: Service role can manage all sessions (insert, update, delete)
DROP POLICY IF EXISTS "service_role_manage_sessions" ON public.user_sessions;

CREATE POLICY "service_role_manage_sessions"
ON public.user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "service_role_manage_sessions" ON public.user_sessions IS
  'Edge Functions and backend services can manage sessions using service_role key.';

-- Policy 4: Super admins can end sessions (force logout)
DROP POLICY IF EXISTS "super_admin_end_sessions" ON public.user_sessions;

CREATE POLICY "super_admin_end_sessions"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
  )
);

COMMENT ON POLICY "super_admin_end_sessions" ON public.user_sessions IS
  'Super admins can update sessions (e.g., force logout by setting ended_at).';

-- ============================================
-- STEP 5: Grant permissions
-- ============================================

GRANT SELECT ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;

-- ============================================
-- STEP 6: Create helper functions
-- ============================================

-- Function: Create new session
CREATE OR REPLACE FUNCTION public.create_user_session(
  p_user_id uuid,
  p_organization_id uuid,
  p_user_email text,
  p_session_token_hash text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_type text DEFAULT 'unknown',
  p_browser text DEFAULT NULL,
  p_os text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  INSERT INTO user_sessions (
    user_id,
    organization_id,
    user_email,
    session_token_hash,
    ip_address,
    user_agent,
    device_type,
    browser,
    os,
    expires_at
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_user_email,
    p_session_token_hash,
    p_ip_address,
    p_user_agent,
    p_device_type,
    p_browser,
    p_os,
    p_expires_at
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

COMMENT ON FUNCTION public.create_user_session IS
  'Create a new user session on login.
   Called from AuthContext on SIGNED_IN event.';

-- Function: Update session activity (heartbeat)
CREATE OR REPLACE FUNCTION public.update_session_activity(
  p_session_token_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_sessions
  SET last_active_at = now()
  WHERE session_token_hash = p_session_token_hash
    AND ended_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.update_session_activity IS
  'Update last_active_at timestamp for a session.
   Called periodically (every 30s) to track user activity.';

-- Function: End session
CREATE OR REPLACE FUNCTION public.end_user_session(
  p_session_token_hash text,
  p_end_reason text DEFAULT 'logout'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_sessions
  SET
    ended_at = now(),
    end_reason = p_end_reason
  WHERE session_token_hash = p_session_token_hash
    AND ended_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.end_user_session IS
  'End a user session (mark as ended).
   Called on logout, timeout, or force logout.';

-- Function: Force logout session (by session ID)
CREATE OR REPLACE FUNCTION public.force_logout_session(
  p_session_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated int;
BEGIN
  -- Only super admins can call this
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: super_admin role required';
  END IF;

  UPDATE user_sessions
  SET
    ended_at = now(),
    end_reason = 'force_logout'
  WHERE id = p_session_id
    AND ended_at IS NULL
  RETURNING 1 INTO v_rows_updated;

  RETURN v_rows_updated > 0;
END;
$$;

COMMENT ON FUNCTION public.force_logout_session IS
  'Force logout a session by ID (super admin only).
   Sets ended_at and end_reason=force_logout.
   Returns true if session was ended, false if not found or already ended.';

-- Function: Get active sessions (for monitoring)
CREATE OR REPLACE FUNCTION public.get_active_sessions(
  p_minutes_threshold int DEFAULT 5
)
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  user_email text,
  organization_id uuid,
  ip_address inet,
  device_type text,
  browser text,
  os text,
  country_code text,
  city text,
  last_active_at timestamptz,
  session_duration interval
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can call this
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: super_admin role required';
  END IF;

  RETURN QUERY
  SELECT
    us.id as session_id,
    us.user_id,
    us.user_email,
    us.organization_id,
    us.ip_address,
    us.device_type,
    us.browser,
    us.os,
    us.country_code,
    us.city,
    us.last_active_at,
    (now() - us.created_at) as session_duration
  FROM user_sessions us
  WHERE us.ended_at IS NULL
    AND us.last_active_at > now() - (p_minutes_threshold || ' minutes')::interval
  ORDER BY us.last_active_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_active_sessions IS
  'Get all active sessions (users active in last N minutes).
   Only callable by super admins.
   Default threshold: 5 minutes.';

-- Function: Get session statistics
CREATE OR REPLACE FUNCTION public.get_session_stats()
RETURNS TABLE (
  total_active_sessions bigint,
  active_last_5min bigint,
  active_last_1hour bigint,
  total_sessions_today bigint,
  avg_session_duration interval
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can call this
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: super_admin role required';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE ended_at IS NULL) as total_active_sessions,
    COUNT(*) FILTER (WHERE ended_at IS NULL AND last_active_at > now() - interval '5 minutes') as active_last_5min,
    COUNT(*) FILTER (WHERE ended_at IS NULL AND last_active_at > now() - interval '1 hour') as active_last_1hour,
    COUNT(*) FILTER (WHERE created_at > current_date) as total_sessions_today,
    AVG(ended_at - created_at) FILTER (WHERE ended_at IS NOT NULL AND ended_at > created_at) as avg_session_duration
  FROM user_sessions;
END;
$$;

COMMENT ON FUNCTION public.get_session_stats IS
  'Get session statistics for admin dashboard.
   Only callable by super admins.';

-- ============================================
-- STEP 7: Create views for common queries
-- ============================================

-- View: Active sessions (last 5 minutes)
CREATE OR REPLACE VIEW public.sessions_active AS
SELECT
  us.id as session_id,
  us.user_id,
  us.user_email,
  o.name as organization_name,
  us.ip_address,
  us.device_type,
  us.browser,
  us.os,
  us.country_code,
  us.city,
  us.created_at,
  us.last_active_at,
  (now() - us.created_at) as session_duration,
  (now() - us.last_active_at) as idle_time
FROM user_sessions us
LEFT JOIN organizations o ON us.organization_id = o.id
WHERE us.ended_at IS NULL
  AND us.last_active_at > now() - interval '5 minutes'
ORDER BY us.last_active_at DESC;

COMMENT ON VIEW public.sessions_active IS
  'Active sessions (users active in last 5 minutes).
   Used for "who''s online" dashboard.';

GRANT SELECT ON public.sessions_active TO authenticated;

-- ============================================
-- STEP 8: Automatic session cleanup (optional)
-- ============================================

-- Function: Auto-end expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated int := 0;
  v_additional_rows int;
BEGIN
  -- End sessions that expired over 1 hour ago and are still marked as active
  UPDATE user_sessions
  SET
    ended_at = expires_at,
    end_reason = 'token_expired'
  WHERE ended_at IS NULL
    AND expires_at IS NOT NULL
    AND expires_at < now() - interval '1 hour';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- Also end sessions inactive for over 24 hours
  UPDATE user_sessions
  SET
    ended_at = last_active_at + interval '24 hours',
    end_reason = 'timeout'
  WHERE ended_at IS NULL
    AND last_active_at < now() - interval '24 hours';

  GET DIAGNOSTICS v_additional_rows = ROW_COUNT;
  v_rows_updated := v_rows_updated + v_additional_rows;

  RETURN v_rows_updated;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_sessions IS
  'Automatically end expired or stale sessions.
   Should be run periodically via cron job or pg_cron.
   Returns number of sessions cleaned up.';

-- ============================================
-- STEP 9: Verification Tests
-- ============================================

DO $$
DECLARE
  v_test_session_id uuid;
  v_rls_enabled boolean;
  v_policy_count int;
  v_index_count int;
BEGIN
  RAISE NOTICE '🧪 Running verification tests...';

  -- Test 1: Table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_sessions') THEN
    RAISE NOTICE '✅ TEST 1 PASSED: user_sessions table exists';
  ELSE
    RAISE EXCEPTION '❌ TEST 1 FAILED: user_sessions table does not exist';
  END IF;

  -- Test 2: RLS is enabled
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'user_sessions';

  IF v_rls_enabled THEN
    RAISE NOTICE '✅ TEST 2 PASSED: RLS is enabled on user_sessions';
  ELSE
    RAISE EXCEPTION '❌ TEST 2 FAILED: RLS is NOT enabled';
  END IF;

  -- Test 3: Policies exist
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_sessions';

  IF v_policy_count >= 4 THEN
    RAISE NOTICE '✅ TEST 3 PASSED: Found % RLS policies', v_policy_count;
  ELSE
    RAISE EXCEPTION '❌ TEST 3 FAILED: Expected 4+ policies, found %', v_policy_count;
  END IF;

  -- Test 4: Indexes exist
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'user_sessions';

  IF v_index_count >= 5 THEN
    RAISE NOTICE '✅ TEST 4 PASSED: Found % indexes', v_index_count;
  ELSE
    RAISE NOTICE '⚠️  TEST 4 WARNING: Expected 5+ indexes, found %', v_index_count;
  END IF;

  -- Test 5: Helper functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_user_session') THEN
    RAISE NOTICE '✅ TEST 5 PASSED: Helper functions created';
  ELSE
    RAISE EXCEPTION '❌ TEST 5 FAILED: Helper functions missing';
  END IF;

  RAISE NOTICE '🎯 All verification tests completed';
END $$;

-- ============================================
-- EXPECTED BEHAVIOR AFTER THIS MIGRATION
-- ============================================
--
-- Session Tracking:
-- ✅ user_sessions table created with RLS
-- ✅ Users can view their own session history
-- ✅ Super admins can view all sessions
-- ✅ Helper functions for session lifecycle
-- ✅ Automatic session cleanup function
-- ✅ Views for active sessions
--
-- Use Cases:
-- ✅ "Who's online" dashboard (sessions_active view)
-- ✅ Force logout users (force_logout_session function)
-- ✅ Session analytics (get_session_stats function)
-- ✅ Security monitoring (multiple IPs, unusual locations)
-- ✅ GDPR compliance (users can export their session history)
--
-- Next Steps:
-- 1. Add session creation to AuthContext (on SIGNED_IN)
-- 2. Add session end to AuthContext (on SIGNED_OUT)
-- 3. Add heartbeat mechanism (update last_active_at every 30s)
-- 4. Build UI in SecurityMonitoring page
-- ============================================
