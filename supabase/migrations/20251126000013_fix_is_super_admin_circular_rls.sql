-- ============================================
-- FIX: is_super_admin circular RLS dependency
-- ============================================
-- Issue: is_super_admin() queries user_roles, which has RLS that calls is_super_admin()
-- Result: Infinite recursion → "stack depth limit exceeded"
-- Fix: Change to SECURITY DEFINER to bypass RLS when checking roles
-- ============================================

-- Use CREATE OR REPLACE instead of DROP (function is used by many policies)
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER  -- ← CHANGED FROM SECURITY INVOKER
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
Uses SECURITY DEFINER to bypass RLS and prevent circular dependency.
Used by Edge Functions and RLS policies.';

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, anon, service_role;

-- Verify fix
DO $$
BEGIN
  RAISE NOTICE '✅ is_super_admin() updated to SECURITY DEFINER';
  RAISE NOTICE '   This fixes the circular RLS dependency that caused:';
  RAISE NOTICE '   "stack depth limit exceeded" error';
END $$;
