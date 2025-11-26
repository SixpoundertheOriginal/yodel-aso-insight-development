-- ============================================
-- CREATE is_super_admin RPC FUNCTION
-- Date: 2025-11-25
-- Purpose: Create missing RPC function for Edge Functions
-- ============================================

-- Edge Functions call is_super_admin(user_id uuid)
-- But only is_super_admin_db() exists (no parameters, uses auth.uid())
-- This function bridges the gap

-- Create is_super_admin function that accepts user_id parameter
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = COALESCE(check_user_id, auth.uid())
      AND role = 'SUPER_ADMIN'
  );
$$;

COMMENT ON FUNCTION public.is_super_admin(uuid) IS
'Check if a user is a super admin. Accepts optional user_id parameter.
If no user_id provided, checks current authenticated user (auth.uid()).
Used by Edge Functions to verify admin access.';

-- Verify function was created
DO $$
DECLARE
  v_function_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_super_admin'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ is_super_admin() function created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create is_super_admin() function';
  END IF;
END $$;
