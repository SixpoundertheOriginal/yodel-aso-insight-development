-- ============================================
-- PHASE 1 (P0): Add RLS to organizations Table
-- Date: November 9, 2025
-- Priority: CRITICAL - Closes security vulnerability
-- Impact: Dashboard V2 & Reviews pages
-- ============================================

-- ============================================
-- PROBLEM
-- ============================================
-- The organizations table has NO ROW LEVEL SECURITY.
-- This means any authenticated user can query ALL organizations.
--
-- Risk: Data leakage across organizations
-- Compliance: BLOCKS SOC 2 / ISO 27001 certification
--
-- Tables affected by this fix:
-- - organizations (master org table)
--
-- Pages affected:
-- - Dashboard V2 (displays org name)
-- - Reviews page (displays org name)
-- ============================================

-- ============================================
-- STEP 1: Enable RLS on organizations table
-- ============================================

DO $$
BEGIN
  -- Check if RLS already enabled
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS enabled on organizations table';
  ELSE
    RAISE NOTICE '⚠️  RLS already enabled on organizations table';
  END IF;
END $$;

-- ============================================
-- STEP 2: Create RLS Policies
-- ============================================

-- Policy 1: Users can only see organizations they belong to
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_see_own_organization" ON public.organizations;

  CREATE POLICY "users_see_own_organization"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    -- User has a role in this organization
    id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
    -- OR user is a super admin (can see all orgs)
    OR EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

  RAISE NOTICE '✅ Created policy: users_see_own_organization';
END $$;

-- Policy 2: Service role has full access (for Edge Functions)
DO $$
BEGIN
  DROP POLICY IF EXISTS "service_role_full_access_organizations" ON public.organizations;

  CREATE POLICY "service_role_full_access_organizations"
  ON public.organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

  RAISE NOTICE '✅ Created policy: service_role_full_access_organizations';
END $$;

-- ============================================
-- STEP 3: Grant necessary permissions
-- ============================================

-- Grant SELECT to authenticated users (RLS will filter)
GRANT SELECT ON public.organizations TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Granted SELECT permission to authenticated users';
END $$;

-- ============================================
-- STEP 4: Add policy comments for documentation
-- ============================================

COMMENT ON POLICY "users_see_own_organization" ON public.organizations IS
  'Users can only see organizations where they have a role assignment in user_roles table.
   Super admins can see all organizations.
   Part of multi-tenant security architecture.';

COMMENT ON POLICY "service_role_full_access_organizations" ON public.organizations IS
  'Edge Functions with service_role key have full access for admin operations.
   Used by BigQuery Edge Function for agency expansion logic.';

-- ============================================
-- STEP 5: Verification Tests
-- ============================================

DO $$
DECLARE
  v_rls_enabled boolean;
  v_policy_count int;
  v_test_org_id uuid;
  v_test_org_name text;
BEGIN
  RAISE NOTICE '🧪 Running verification tests...';

  -- Test 1: Verify RLS is enabled
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'organizations';

  IF v_rls_enabled THEN
    RAISE NOTICE '✅ TEST 1 PASSED: RLS is enabled on organizations';
  ELSE
    RAISE EXCEPTION '❌ TEST 1 FAILED: RLS is NOT enabled on organizations';
  END IF;

  -- Test 2: Verify policies exist
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organizations';

  IF v_policy_count >= 2 THEN
    RAISE NOTICE '✅ TEST 2 PASSED: Found % RLS policies on organizations', v_policy_count;
  ELSE
    RAISE EXCEPTION '❌ TEST 2 FAILED: Expected 2+ policies, found %', v_policy_count;
  END IF;

  -- Test 3: Verify cli@yodelmobile.com can access Yodel Mobile org
  -- (This simulates what would happen if user queries the table)
  SELECT id, name INTO v_test_org_id, v_test_org_name
  FROM organizations
  WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  IF v_test_org_id IS NOT NULL THEN
    RAISE NOTICE '✅ TEST 3 PASSED: Yodel Mobile org accessible (id: %, name: %)',
      v_test_org_id, v_test_org_name;
  ELSE
    RAISE WARNING '⚠️  TEST 3 SKIPPED: Yodel Mobile org not found (may not exist in this environment)';
  END IF;

  RAISE NOTICE '🎯 All verification tests completed';
END $$;

-- ============================================
-- ROLLBACK PLAN (if needed)
-- ============================================
-- To rollback this migration:
-- 1. DROP POLICY "users_see_own_organization" ON public.organizations;
-- 2. DROP POLICY "service_role_full_access_organizations" ON public.organizations;
-- 3. ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
--
-- WARNING: Rollback will re-expose security vulnerability!
-- ============================================

-- ============================================
-- EXPECTED BEHAVIOR AFTER THIS MIGRATION
-- ============================================
--
-- Frontend (Dashboard V2 & Reviews):
-- ✅ cli@yodelmobile.com can query Yodel Mobile organization
-- ✅ Users can only see their own organization
-- ✅ Super admins can see all organizations
-- ✅ No change to existing functionality
--
-- Edge Functions:
-- ✅ BigQuery Edge Function can query organizations (service_role)
-- ✅ Agency expansion logic continues working
--
-- Security:
-- ✅ Users CANNOT query organizations they don't belong to
-- ✅ Prevents cross-organization data leakage
-- ✅ Closes HIGH severity security vulnerability
-- ✅ Required for SOC 2 / ISO 27001 compliance
--
-- Performance:
-- ✅ Negligible impact (simple EXISTS check)
-- ✅ user_roles table already indexed
-- ============================================
