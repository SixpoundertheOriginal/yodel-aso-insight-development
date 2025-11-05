-- Fix RLS policy on organization_features table
-- Migration: 20251205130000_fix_organization_features_rls
-- Issue: Broken RLS policy blocking Edge Function from reading feature flags
-- Root Cause: Policy referenced deprecated org_users table and wrong enum values

-- Drop broken policy
DROP POLICY IF EXISTS "org_admins_can_manage_features" ON organization_features;

-- ============================================================================
-- POLICY 1: Allow users to READ their organization's features
-- ============================================================================
-- This allows:
-- - Users to read features for organizations they belong to
-- - Super admins to read all features
-- - Edge Functions (using anon key) to read features with user context
-- ============================================================================

CREATE POLICY "Users can read org features" ON organization_features
  FOR SELECT
  USING (
    -- User is member of the organization
    organization_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
    OR
    -- User is platform super admin (can read all)
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'  -- Correct enum value (uppercase)
    )
  );

-- ============================================================================
-- POLICY 2: Allow admins to INSERT features
-- ============================================================================

CREATE POLICY "Admins can insert org features" ON organization_features
  FOR INSERT
  WITH CHECK (
    -- User is org admin for this organization
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = organization_features.organization_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    -- User is platform super admin (can manage all)
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- POLICY 3: Allow admins to UPDATE features
-- ============================================================================

CREATE POLICY "Admins can update org features" ON organization_features
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = organization_features.organization_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = organization_features.organization_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- POLICY 4: Allow admins to DELETE features
-- ============================================================================

CREATE POLICY "Admins can delete org features" ON organization_features
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = organization_features.organization_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- VERIFICATION: Test the new policies
-- ============================================================================

-- Test query (should work for org members now)
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Count features for Yodel Mobile org
  SELECT COUNT(*) INTO test_count
  FROM organization_features
  WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  RAISE NOTICE 'Feature count for Yodel Mobile: %', test_count;

  IF test_count = 0 THEN
    RAISE WARNING 'No features found! Expected at least 1 (app_core_access)';
  ELSE
    RAISE NOTICE 'SUCCESS: Found % features', test_count;
  END IF;
END $$;

-- List all features for Yodel Mobile
SELECT
  feature_key,
  is_enabled,
  created_at
FROM organization_features
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
ORDER BY feature_key;
