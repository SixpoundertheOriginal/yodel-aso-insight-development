-- Fix RPC functions to work without organization_id in JWT
-- The original functions assumed organization_id would be in JWT metadata,
-- but we store it in user_roles table instead

-- Drop and recreate get_user_active_session_count
DROP FUNCTION IF EXISTS public.get_user_active_session_count(uuid);

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
    AND organization_id IN (
      SELECT organization_id
      FROM public.user_roles
      WHERE user_id = p_user_id
    );
$$;

COMMENT ON FUNCTION public.get_user_active_session_count IS
  'Returns count of active (non-expired) chat sessions for a user';

-- Drop and recreate get_user_message_count_today
DROP FUNCTION IF EXISTS public.get_user_message_count_today(uuid);

CREATE OR REPLACE FUNCTION public.get_user_message_count_today(p_user_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::int
  FROM public.chat_messages
  WHERE organization_id IN (
      SELECT organization_id
      FROM public.user_roles
      WHERE user_id = p_user_id
    )
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
$$;

COMMENT ON FUNCTION public.get_user_message_count_today IS
  'Returns count of messages sent by user today across all their organizations';
