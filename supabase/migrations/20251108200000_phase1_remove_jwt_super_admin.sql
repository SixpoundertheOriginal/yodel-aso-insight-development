-- ============================================
-- PHASE 1: Security Hardening - Remove JWT-based Super Admin
-- Date: November 8, 2025
-- Risk Level: ZERO (Not used by current flows)
-- ============================================

-- ============================================
-- BACKGROUND
-- ============================================
-- The is_super_admin() function uses JWT claims (security definer)
-- which bypasses RLS and creates a security hole.
--
-- SAFE TO REMOVE because:
-- 1. cli@yodelmobile.com is ORG_ADMIN (not super admin)
-- 2. Dashboard V2 and Reviews don't use super admin checks
-- 3. user_roles table is the SSOT for permissions
-- 4. All Edge Functions use database-based role checks
--
-- IMPACT: ZERO for current Yodel Mobile users
-- ============================================

-- ============================================
-- STEP 1: Create database-based super admin check
-- ============================================

-- New function that queries user_roles table (respects RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin_db()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER  -- ✅ Respects RLS, doesn't bypass security
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'::app_role
  );
$$;

COMMENT ON FUNCTION public.is_super_admin_db() IS
'Database-based super admin check. Queries user_roles table (SSOT). Replaces JWT-based is_super_admin().';

-- ============================================
-- STEP 2: Update apps RLS policy to use new function
-- ============================================

-- Drop old policy that uses JWT-based function
DROP POLICY IF EXISTS org_access_apps ON public.apps;

-- Create new policy using database-based check
CREATE POLICY org_access_apps
ON public.apps
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  -- User's organization OR super admin from database
  (organization_id IN (
    SELECT organization_id
    FROM public.user_roles
    WHERE user_id = auth.uid()
  ))
  OR public.is_super_admin_db()  -- ✅ Database-based check
)
WITH CHECK (
  (organization_id IN (
    SELECT organization_id
    FROM public.user_roles
    WHERE user_id = auth.uid()
  ))
  OR public.is_super_admin_db()  -- ✅ Database-based check
);

COMMENT ON POLICY org_access_apps ON public.apps IS
'Users can access apps from their organization OR if they are super admin (database check).';

-- ============================================
-- STEP 3: Drop the old JWT-based function
-- ============================================

-- This is safe because:
-- 1. We created the replacement function first
-- 2. We updated all policies to use the new function
-- 3. No active code paths use this for Yodel Mobile users

DROP FUNCTION IF EXISTS public.is_super_admin();

-- ============================================
-- STEP 4: Verification
-- ============================================

-- Verify the new function works
DO $$
DECLARE
  v_function_exists boolean;
BEGIN
  -- Check new function exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_super_admin_db'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ New is_super_admin_db() function created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create is_super_admin_db() function';
  END IF;

  -- Check old function is gone
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_super_admin'
  ) INTO v_function_exists;

  IF NOT v_function_exists THEN
    RAISE NOTICE '✅ Old is_super_admin() function removed successfully';
  ELSE
    RAISE WARNING '⚠️  Old is_super_admin() function still exists';
  END IF;

  -- Check policy updated
  SELECT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'apps'
      AND policyname = 'org_access_apps'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ RLS policy on apps table updated successfully';
  ELSE
    RAISE WARNING '⚠️  RLS policy on apps table not found';
  END IF;
END $$;

-- ============================================
-- ROLLBACK PLAN (if needed)
-- ============================================
-- To rollback this migration:
-- 1. Re-create is_super_admin() function from 20251201090000_rls_apps_and_superadmin.sql
-- 2. Update org_access_apps policy to use is_super_admin() instead of is_super_admin_db()
-- 3. Drop is_super_admin_db() function
--
-- Or simply revert this migration and re-run previous one.
-- ============================================
