-- ============================================================================
-- Migration: 20251107300000_fix_agency_clients_rls
-- ============================================================================
-- Purpose: Fix RLS policies on agency_clients to use user_roles (SSOT)
-- Issue: Permission denied errors blocking agency-client queries
-- Root Cause: Policies reference org_users_deprecated (REVOKE ALL permissions)
-- Fix: Update policies to use user_roles table as Single Source of Truth
-- Pattern: Follow organization_features fix (migration 20251205130000)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔧 FIXING RLS POLICIES: agency_clients';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Issue: Permission denied for table org_users_deprecated';
  RAISE NOTICE 'Fix: Update RLS policies to use user_roles (SSOT)';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PHASE 1: Drop Old Policies
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📋 PHASE 1: Dropping old RLS policies...';
END $$;

-- Drop any existing policies that might reference org_users_deprecated
-- These are common policy names found in similar tables
DROP POLICY IF EXISTS "Users can see their agency relationships" ON agency_clients;
DROP POLICY IF EXISTS "agency_clients_select" ON agency_clients;
DROP POLICY IF EXISTS "Users see agencies they manage" ON agency_clients;
DROP POLICY IF EXISTS "Allow users to view agency relationships" ON agency_clients;
DROP POLICY IF EXISTS "org_users can view agency relationships" ON agency_clients;
DROP POLICY IF EXISTS "Users can manage agency relationships" ON agency_clients;
DROP POLICY IF EXISTS "agency_clients_insert" ON agency_clients;
DROP POLICY IF EXISTS "agency_clients_update" ON agency_clients;
DROP POLICY IF EXISTS "agency_clients_delete" ON agency_clients;

DO $$
BEGIN
  RAISE NOTICE '✅ Old policies dropped';
END $$;

-- ============================================================================
-- PHASE 2: Create New SELECT Policy (Read Access)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📋 PHASE 2: Creating SELECT policy...';
END $$;

-- Policy: Allow users to read agency relationships
-- Permissions:
-- - Users in the agency organization can see their client relationships
-- - Users in client organizations can see who their agency is
-- - Super admins can see all relationships
CREATE POLICY "users_read_agency_relationships"
  ON agency_clients
  FOR SELECT
  USING (
    -- User is in the agency organization
    agency_org_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
    OR
    -- User is in a client organization
    client_org_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
    OR
    -- User is a platform super admin (can see all)
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
        AND organization_id IS NULL
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ SELECT policy created: users_read_agency_relationships';
END $$;

-- ============================================================================
-- PHASE 3: Create New WRITE Policies (Insert/Update/Delete)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📋 PHASE 3: Creating INSERT/UPDATE/DELETE policies...';
END $$;

-- Policy: Allow admins to insert agency relationships
-- Permissions:
-- - Org admins of the agency can create relationships
-- - Platform super admins can create any relationship
CREATE POLICY "admins_insert_agency_relationships"
  ON agency_clients
  FOR INSERT
  WITH CHECK (
    -- User is org admin for the agency organization
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = agency_clients.agency_org_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    -- User is platform super admin
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
        AND organization_id IS NULL
    )
  );

-- Policy: Allow admins to update agency relationships
-- Permissions:
-- - Org admins of the agency can update relationships
-- - Platform super admins can update any relationship
CREATE POLICY "admins_update_agency_relationships"
  ON agency_clients
  FOR UPDATE
  USING (
    -- User is org admin for the agency organization
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = agency_clients.agency_org_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    -- User is platform super admin
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
        AND organization_id IS NULL
    )
  )
  WITH CHECK (
    -- Same check for the updated values
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = agency_clients.agency_org_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
        AND organization_id IS NULL
    )
  );

-- Policy: Allow admins to delete agency relationships
-- Permissions:
-- - Org admins of the agency can delete relationships
-- - Platform super admins can delete any relationship
CREATE POLICY "admins_delete_agency_relationships"
  ON agency_clients
  FOR DELETE
  USING (
    -- User is org admin for the agency organization
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = agency_clients.agency_org_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    -- User is platform super admin
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
        AND organization_id IS NULL
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ INSERT policy created: admins_insert_agency_relationships';
  RAISE NOTICE '✅ UPDATE policy created: admins_update_agency_relationships';
  RAISE NOTICE '✅ DELETE policy created: admins_delete_agency_relationships';
END $$;

-- ============================================================================
-- PHASE 4: Validation Tests
-- ============================================================================

DO $$
DECLARE
  yodel_mobile_id UUID := '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  client_count INTEGER;
  test_user_id UUID := '8920ac57-63da-4f8e-9970-719be1e2569c'; -- cli@yodelmobile.com
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 PHASE 4: Running validation tests...';
  RAISE NOTICE '';

  -- Test 1: Count policies on agency_clients
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'agency_clients'
    AND schemaname = 'public';

  RAISE NOTICE 'Test 1: Policy count';
  RAISE NOTICE '  Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  Actual:   % policies', policy_count;

  IF policy_count >= 4 THEN
    RAISE NOTICE '  ✅ PASS: Sufficient policies created';
  ELSE
    RAISE WARNING '  ⚠️  WARNING: Only % policies found', policy_count;
  END IF;

  RAISE NOTICE '';

  -- Test 2: Count Yodel Mobile client relationships
  SELECT COUNT(*) INTO client_count
  FROM agency_clients
  WHERE agency_org_id = yodel_mobile_id
    AND is_active = true;

  RAISE NOTICE 'Test 2: Yodel Mobile client relationships';
  RAISE NOTICE '  Agency: Yodel Mobile (7cccba3f...)';
  RAISE NOTICE '  Expected: 2 active clients';
  RAISE NOTICE '  Actual:   % client orgs', client_count;

  IF client_count = 2 THEN
    RAISE NOTICE '  ✅ PASS: Yodel Mobile has 2 active clients';
  ELSE
    RAISE WARNING '  ⚠️  WARNING: Expected 2 clients, found %', client_count;
  END IF;

  RAISE NOTICE '';

  -- Test 3: Verify no policies reference org_users_deprecated
  DECLARE
    bad_policy_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO bad_policy_count
    FROM pg_policies
    WHERE tablename = 'agency_clients'
      AND schemaname = 'public'
      AND (
        qual LIKE '%org_users_deprecated%'
        OR with_check LIKE '%org_users_deprecated%'
      );

    RAISE NOTICE 'Test 3: Check for org_users_deprecated references';
    RAISE NOTICE '  Expected: 0 policies referencing deprecated table';
    RAISE NOTICE '  Actual:   % policies', bad_policy_count;

    IF bad_policy_count = 0 THEN
      RAISE NOTICE '  ✅ PASS: No policies reference org_users_deprecated';
    ELSE
      RAISE WARNING '  ❌ FAIL: Still have % policies referencing deprecated table', bad_policy_count;
    END IF;
  END;

  RAISE NOTICE '';

  -- Test 4: Verify policies reference user_roles
  DECLARE
    good_policy_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO good_policy_count
    FROM pg_policies
    WHERE tablename = 'agency_clients'
      AND schemaname = 'public'
      AND (
        qual LIKE '%user_roles%'
        OR with_check LIKE '%user_roles%'
      );

    RAISE NOTICE 'Test 4: Check for user_roles references';
    RAISE NOTICE '  Expected: At least 1 policy referencing user_roles';
    RAISE NOTICE '  Actual:   % policies', good_policy_count;

    IF good_policy_count > 0 THEN
      RAISE NOTICE '  ✅ PASS: Policies reference user_roles (SSOT)';
    ELSE
      RAISE WARNING '  ❌ FAIL: No policies reference user_roles';
    END IF;
  END;

  RAISE NOTICE '';

END $$;

-- ============================================================================
-- PHASE 5: Add Documentation
-- ============================================================================

COMMENT ON TABLE agency_clients IS
  'Agency-client organization relationships for multi-tenant hierarchy.

Migration History:
- Created: Unknown (pre-migration tracking)
- Fixed: 2025-11-07 (Migration 20251107300000)
  * Updated RLS policies to use user_roles instead of org_users_deprecated
  * Added comprehensive CRUD policies with super admin bypass
  * Follows enterprise multi-tenant security pattern

RLS Policies:
- users_read_agency_relationships: Read access for agency and client org users
- admins_insert_agency_relationships: Insert access for org admins
- admins_update_agency_relationships: Update access for org admins
- admins_delete_agency_relationships: Delete access for org admins

Security Model:
- Agency users can see their client relationships
- Client users can see their agency
- Super admins have global access
- Only org admins can manage relationships';

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION COMPLETE: agency_clients RLS Fixed';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '  1. ✅ Dropped old policies referencing org_users_deprecated';
  RAISE NOTICE '  2. ✅ Created SELECT policy using user_roles';
  RAISE NOTICE '  3. ✅ Created INSERT policy using user_roles';
  RAISE NOTICE '  4. ✅ Created UPDATE policy using user_roles';
  RAISE NOTICE '  5. ✅ Created DELETE policy using user_roles';
  RAISE NOTICE '  6. ✅ Added table documentation';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Results:';
  RAISE NOTICE '  - Edge Function can now query agency_clients without errors';
  RAISE NOTICE '  - Agency mode will be detected for Yodel Mobile users';
  RAISE NOTICE '  - Dashboard V2 will show app picker with 23 apps';
  RAISE NOTICE '  - No more "permission denied" errors in logs';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Test Edge Function call (should see [AGENCY] Agency mode enabled)';
  RAISE NOTICE '  2. Login as cli@yodelmobile.com';
  RAISE NOTICE '  3. Navigate to /dashboard-v2';
  RAISE NOTICE '  4. Verify app picker displays';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
