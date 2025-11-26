-- ============================================
-- FIX: Circular RLS Reference on org_feature_entitlements
-- ============================================
-- Issue: Stack depth exceeded error when querying org_feature_entitlements
-- Root Cause: Restrictive RLS policy only allows ORG_ADMIN/SUPER_ADMIN
--             This causes Edge Functions to fail when checking features
-- Fix: Add broader policy allowing all org members to read their org's features
-- Date: 2025-11-26
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Fixing org_feature_entitlements RLS policies...';
END $$;

-- ============================================
-- STEP 1: Add policy for all org members to read their org's features
-- ============================================

-- Organization feature entitlements are not sensitive data - they just show
-- what features an org has purchased. All members of an org should be able
-- to see what features their org has access to.

CREATE POLICY "Org members can read their org features"
  ON org_feature_entitlements
  FOR SELECT
  TO authenticated
  USING (
    -- Simpler policy: User belongs to this organization
    organization_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Note: The existing "Org admins can read their org entitlements" policy
-- is more restrictive and will be superseded by this broader policy for SELECT operations.

DO $$
BEGIN
  RAISE NOTICE '✅ Added policy: Org members can read their org features';
END $$;

-- ============================================
-- STEP 2: Verification
-- ============================================

DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'org_feature_entitlements'
    AND cmd = 'SELECT';

  RAISE NOTICE '📊 org_feature_entitlements now has % SELECT policies', policy_count;
  RAISE NOTICE '✅ Edge Functions should now be able to query org features with user JWT';
END $$;
