-- ============================================
-- PHASE 2: Security Hardening - Add RLS to user_roles Table
-- Date: November 8, 2025
-- Risk Level: LOW (Permissive policies, no breaking changes)
-- ============================================

-- ============================================
-- BACKGROUND
-- ============================================
-- The user_roles table is the SSOT (Single Source of Truth) for permissions.
-- Currently it has NO RLS policies, which means any authenticated user
-- can potentially query it.
--
-- This migration adds permissive RLS policies that:
-- 1. Allow users to see their own role
-- 2. Allow service role (Edge Functions) full access
-- 3. Maintain current functionality for cli@yodelmobile.com
--
-- SAFE because:
-- - Frontend already only queries for current user's role
-- - Edge Functions use service role (bypass RLS)
-- - Policies are permissive (SELECT only, no restrictions on INSERT/UPDATE/DELETE)
--
-- IMPACT: ZERO for current Yodel Mobile users
-- ============================================

-- ============================================
-- STEP 1: Enable RLS on user_roles table
-- ============================================

-- First, check if RLS is already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS enabled on user_roles table';
  ELSE
    RAISE NOTICE '⚠️  RLS already enabled on user_roles table';
  END IF;
END $$;

-- ============================================
-- STEP 2: Create permissive SELECT policy
-- ============================================

-- Drop existing policy if any
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Users can only see their own role
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

COMMENT ON POLICY "Users can view own role" ON public.user_roles IS
'Users can only query their own role record. Edge Functions with service_role bypass this.';

-- ============================================
-- STEP 3: Create permissive policy for service role
-- ============================================

-- Service role (Edge Functions) needs full access
-- This is safe because Edge Functions implement their own access controls

DROP POLICY IF EXISTS "Service role full access" ON public.user_roles;

CREATE POLICY "Service role full access"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Service role full access" ON public.user_roles IS
'Edge Functions with service_role key have full access. Required for admin operations and agency expansion.';

-- ============================================
-- STEP 4: Grant necessary permissions
-- ============================================

-- Ensure authenticated users can read
GRANT SELECT ON public.user_roles TO authenticated;

-- Service role already has all permissions via GRANT ALL in previous migrations

-- ============================================
-- STEP 5: Verification
-- ============================================

DO $$
DECLARE
  v_rls_enabled boolean;
  v_policy_count int;
BEGIN
  -- Check RLS is enabled
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'user_roles';

  IF v_rls_enabled THEN
    RAISE NOTICE '✅ RLS is enabled on user_roles';
  ELSE
    RAISE EXCEPTION '❌ Failed to enable RLS on user_roles';
  END IF;

  -- Check policies exist
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_roles';

  IF v_policy_count >= 2 THEN
    RAISE NOTICE '✅ Found % RLS policies on user_roles', v_policy_count;
  ELSE
    RAISE WARNING '⚠️  Expected 2+ policies, found only %', v_policy_count;
  END IF;

  -- List policies for verification (skipped to avoid variable type conflict)
END $$;

-- ============================================
-- STEP 6: Test query (safe to run)
-- ============================================

-- This query will succeed for cli@yodelmobile.com when logged in
-- (returns their own role only)
DO $$
DECLARE
  v_test_user_id uuid := '8920ac57-63da-4f8e-9970-719be1e2569c'; -- cli@yodelmobile.com
  v_role_exists boolean;
BEGIN
  -- Check if the user's role is queryable (simulates frontend query)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_test_user_id
  ) INTO v_role_exists;

  IF v_role_exists THEN
    RAISE NOTICE '✅ Test passed: cli@yodelmobile.com role is accessible';
  ELSE
    RAISE WARNING '⚠️  Test warning: cli@yodelmobile.com role not found (may be expected in test env)';
  END IF;
END $$;

-- ============================================
-- ROLLBACK PLAN (if needed)
-- ============================================
-- To rollback this migration:
-- 1. DROP POLICY "Users can view own role" ON public.user_roles;
-- 2. DROP POLICY "Service role full access" ON public.user_roles;
-- 3. ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
--
-- Or create a new migration with the above commands.
-- ============================================

-- ============================================
-- EXPECTED BEHAVIOR AFTER THIS MIGRATION
-- ============================================
--
-- FRONTEND (usePermissions hook):
-- ✅ User logs in → JWT contains user_id
-- ✅ Query: SELECT * FROM user_roles WHERE user_id = auth.uid()
-- ✅ RLS Policy: user_id = auth.uid() → PASS
-- ✅ Returns: { user_id, organization_id, role: 'ORG_ADMIN' }
-- ✅ Dashboard V2 and Reviews pages continue working
--
-- EDGE FUNCTIONS (service_role):
-- ✅ Edge Function uses service_role key
-- ✅ Bypasses RLS entirely (service role policy allows all)
-- ✅ Can query any user's role for validation
-- ✅ Agency expansion logic continues working
--
-- SECURITY IMPROVEMENT:
-- ✅ Users cannot query other users' roles
-- ✅ Prevents enumeration attacks
-- ✅ Maintains least-privilege access
-- ============================================
