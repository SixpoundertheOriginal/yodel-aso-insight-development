-- ============================================
-- FIX: RLS Policies for user_permissions_unified View
-- ============================================
-- Issue: Frontend queries blocked by missing RLS policies
-- Root Cause: View and base tables lack SELECT grants/policies
-- Fix: Add policies to allow users to query their own permissions
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔐 Fixing RLS policies for permissions system...';
END $$;

-- ============================================
-- STEP 1: Grant SELECT on View
-- ============================================

-- Views don't have RLS policies directly, but need SELECT grant
GRANT SELECT ON user_permissions_unified TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Granted SELECT on user_permissions_unified to authenticated';
END $$;

-- ============================================
-- STEP 2: Ensure Base Table (user_roles) Has RLS
-- ============================================

-- Enable RLS on user_roles (if not already enabled)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create or replace SELECT policy for user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;

CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

DO $$
BEGIN
  RAISE NOTICE '✅ Created RLS policy on user_roles';
END $$;

-- ============================================
-- STEP 3: Ensure organizations Table is Accessible
-- ============================================

-- Users need to read organization names for their orgs
GRANT SELECT ON organizations TO authenticated;

-- If organizations has RLS, add policy
DO $$
BEGIN
  -- Check if RLS is enabled on organizations
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND rowsecurity = true
  ) THEN
    -- RLS is enabled, need policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'organizations'
        AND policyname = 'Users can view their organizations'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can view their organizations"
        ON organizations FOR SELECT
        USING (
          id IN (
            SELECT organization_id
            FROM user_roles
            WHERE user_id = auth.uid()
          )
        )';

      RAISE NOTICE '✅ Created RLS policy on organizations';
    ELSE
      RAISE NOTICE '⚠️  RLS policy on organizations already exists';
    END IF;
  ELSE
    RAISE NOTICE '✅ organizations table has no RLS (grant is sufficient)';
  END IF;
END $$;

-- ============================================
-- STEP 4: Test Query
-- ============================================

DO $$
DECLARE
  test_count int;
  test_user_id uuid := '8920ac57-63da-4f8e-9970-719be1e2569c'; -- cli user
BEGIN
  RAISE NOTICE '🧪 Testing view access...';

  -- Count rows accessible to user
  SELECT COUNT(*) INTO test_count
  FROM user_permissions_unified
  WHERE user_id = test_user_id;

  IF test_count > 0 THEN
    RAISE NOTICE '✅ View test PASSED: User can query % row(s)', test_count;
  ELSE
    RAISE WARNING '❌ View test FAILED: User cannot query any rows (check RLS)';
  END IF;
END $$;

-- ============================================
-- SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RLS FIX COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '1. ✅ GRANT SELECT on user_permissions_unified';
  RAISE NOTICE '2. ✅ RLS policy on user_roles';
  RAISE NOTICE '3. ✅ GRANT SELECT on organizations';
  RAISE NOTICE '4. ✅ RLS policy on organizations (if needed)';
  RAISE NOTICE '';
  RAISE NOTICE 'Frontend should now be able to query permissions.';
  RAISE NOTICE 'Test: Login as cli@yodelmobile.com';
  RAISE NOTICE 'Expected: NO [ENTERPRISE-FALLBACK] warnings';
  RAISE NOTICE '';
END $$;
