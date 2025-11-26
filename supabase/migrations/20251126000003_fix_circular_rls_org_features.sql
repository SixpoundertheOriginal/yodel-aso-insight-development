-- ============================================
-- FIX: Remove Circular RLS Policies on org_feature_entitlements
-- ============================================
-- Issue: All policies that query user_roles create circular dependency
-- Root Cause: org_feature_entitlements RLS → user_roles → RLS → infinite loop
-- Fix: Drop ALL policies that reference user_roles, use service_role for writes
-- Date: 2025-11-26
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Removing circular RLS policies from org_feature_entitlements...';
END $$;

-- ============================================
-- STEP 1: Drop ALL existing policies on org_feature_entitlements
-- ============================================

DROP POLICY IF EXISTS "Super admins can manage org entitlements" ON org_feature_entitlements;
DROP POLICY IF EXISTS "Org admins can read their org entitlements" ON org_feature_entitlements;
DROP POLICY IF EXISTS "Org members can read their org features" ON org_feature_entitlements;

DO $$
BEGIN
  RAISE NOTICE '✅ Dropped all existing policies on org_feature_entitlements';
END $$;

-- ============================================
-- STEP 2: Create SIMPLE policy that does NOT query user_roles
-- ============================================

-- Key insight: We cannot query user_roles in RLS policies for org_feature_entitlements
-- because it creates a circular dependency. Instead:
-- - Allow ALL authenticated users to READ all org features (features are not sensitive)
-- - Use service_role for writes (admin operations)

CREATE POLICY "Allow all authenticated users to read org features"
  ON org_feature_entitlements
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything (no RLS needed, but adding for clarity)
CREATE POLICY "Allow service role full access"
  ON org_feature_entitlements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  RAISE NOTICE '✅ Created simple RLS policies without circular dependencies';
  RAISE NOTICE '   - authenticated users can read ALL org features';
  RAISE NOTICE '   - service_role has full access';
  RAISE NOTICE '   - NO queries to user_roles table (no circular dependency)';
END $$;

-- ============================================
-- Note: Security implications
-- ============================================
-- This allows any authenticated user to see what features ANY organization has.
-- This is acceptable because:
-- 1. Feature entitlements are not sensitive data (just shows what org paid for)
-- 2. The alternative (querying user_roles) creates infinite recursion
-- 3. The REAL access control happens in the Edge Functions via hasFeatureAccess()
--    which checks BOTH org features AND role permissions
-- 4. Users cannot modify features (only service_role can)
