-- ============================================================================
-- Migration: 20251108000000_remove_all_old_agency_policies
-- ============================================================================
-- Strategy: Nuclear Option - Drop ALL policies, recreate only new ones
-- Purpose: Fix persistent "permission denied" errors on agency_clients table
-- Issue: Unknown old policies reference org_users_deprecated (REVOKE ALL)
-- Root Cause: Migration 20251107300000 didn't drop all old policies
-- Fix: Drop ALL policies dynamically, recreate only 4 standardized policies
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔥 NUCLEAR OPTION: Removing ALL old agency_clients policies';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Issue: Old policies reference org_users_deprecated (no permissions)';
  RAISE NOTICE 'Solution: Drop ALL policies, recreate only 4 standardized policies';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PHASE 1: Drop ALL Policies Dynamically
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
  dropped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '📋 PHASE 1: Dropping ALL existing policies on agency_clients...';
  RAISE NOTICE '';

  -- Loop through all policies on agency_clients table
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'agency_clients'
      AND schemaname = 'public'
  LOOP
    -- Drop each policy dynamically
    EXECUTE format('DROP POLICY IF EXISTS %I ON agency_clients', policy_record.policyname);

    RAISE NOTICE '   ✅ Dropped: %', policy_record.policyname;
    dropped_count := dropped_count + 1;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Dropped % policies total', dropped_count;
  RAISE NOTICE '';

  IF dropped_count = 0 THEN
    RAISE NOTICE '⚠️  WARNING: No policies found to drop (table may have no policies)';
    RAISE NOTICE '';
  END IF;
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
  policy_count INTEGER;
  bad_policy_count INTEGER;
  good_policy_count INTEGER;
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

  IF policy_count = 4 THEN
    RAISE NOTICE '  ✅ PASS: Exactly 4 policies created';
  ELSIF policy_count > 4 THEN
    RAISE WARNING '  ⚠️  WARNING: % policies found (expected 4) - old policies may still exist', policy_count;
  ELSE
    RAISE WARNING '  ❌ FAIL: Only % policies found (expected 4)', policy_count;
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

  -- Test 3: Verify NO policies reference org_users_deprecated
  SELECT COUNT(*) INTO bad_policy_count
  FROM pg_policies
  WHERE tablename = 'agency_clients'
    AND schemaname = 'public'
    AND (
      qual::text LIKE '%org_users_deprecated%'
      OR with_check::text LIKE '%org_users_deprecated%'
    );

  RAISE NOTICE 'Test 3: Check for org_users_deprecated references';
  RAISE NOTICE '  Expected: 0 policies referencing deprecated table';
  RAISE NOTICE '  Actual:   % policies', bad_policy_count;

  IF bad_policy_count = 0 THEN
    RAISE NOTICE '  ✅ PASS: No policies reference org_users_deprecated';
  ELSE
    RAISE WARNING '  ❌ FAIL: Still have % policies referencing deprecated table', bad_policy_count;

    -- Show which policies are broken
    DECLARE
      broken_policy RECORD;
    BEGIN
      FOR broken_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'agency_clients'
          AND schemaname = 'public'
          AND (
            qual::text LIKE '%org_users_deprecated%'
            OR with_check::text LIKE '%org_users_deprecated%'
          )
      LOOP
        RAISE WARNING '     ❌ Broken policy: %', broken_policy.policyname;
      END LOOP;
    END;
  END IF;

  RAISE NOTICE '';

  -- Test 4: Verify ALL policies reference user_roles
  SELECT COUNT(*) INTO good_policy_count
  FROM pg_policies
  WHERE tablename = 'agency_clients'
    AND schemaname = 'public'
    AND (
      qual::text LIKE '%user_roles%'
      OR with_check::text LIKE '%user_roles%'
    );

  RAISE NOTICE 'Test 4: Check for user_roles references';
  RAISE NOTICE '  Expected: 4 policies referencing user_roles (SSOT)';
  RAISE NOTICE '  Actual:   % policies', good_policy_count;

  IF good_policy_count = 4 THEN
    RAISE NOTICE '  ✅ PASS: All policies reference user_roles (SSOT)';
  ELSE
    RAISE WARNING '  ⚠️  WARNING: Only % policies reference user_roles', good_policy_count;
  END IF;

  RAISE NOTICE '';

  -- Test 5: List all current policies
  RAISE NOTICE 'Test 5: Current policy names';
  DECLARE
    policy RECORD;
  BEGIN
    FOR policy IN
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'agency_clients'
        AND schemaname = 'public'
      ORDER BY policyname
    LOOP
      RAISE NOTICE '  - % (%)', policy.policyname, policy.cmd;
    END LOOP;
  END;

  RAISE NOTICE '';

END $$;

-- ============================================================================
-- PHASE 5: Update Documentation
-- ============================================================================

COMMENT ON TABLE agency_clients IS
  'Agency-client organization relationships for multi-tenant hierarchy.

Migration History:
- Created: Unknown (pre-migration tracking)
- Fixed: 2025-11-07 (Migration 20251107300000) - First attempt
  * Created new policies using user_roles
  * But old policies remained active (unknown names)
- Fixed: 2025-11-08 (Migration 20251108000000) - Nuclear Option
  * Dropped ALL policies dynamically
  * Recreated only 4 standardized policies
  * Guaranteed clean slate

RLS Policies (Created 2025-11-08):
- users_read_agency_relationships: Read access for agency and client org users
- admins_insert_agency_relationships: Insert access for org admins
- admins_update_agency_relationships: Update access for org admins
- admins_delete_agency_relationships: Delete access for org admins

Security Model:
- Agency users can see their client relationships
- Client users can see their agency
- Super admins have global access
- Only org admins can manage relationships

All policies reference user_roles table (SSOT).
No policies reference deprecated tables (org_users, org_users_deprecated).';

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION COMPLETE: Nuclear Option Applied';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '  1. ✅ Dropped ALL old policies dynamically (no need to know names)';
  RAISE NOTICE '  2. ✅ Created SELECT policy using user_roles (SSOT)';
  RAISE NOTICE '  3. ✅ Created INSERT policy using user_roles (SSOT)';
  RAISE NOTICE '  4. ✅ Created UPDATE policy using user_roles (SSOT)';
  RAISE NOTICE '  5. ✅ Created DELETE policy using user_roles (SSOT)';
  RAISE NOTICE '  6. ✅ Updated table documentation';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Results:';
  RAISE NOTICE '  - Edge Function queries agency_clients without errors';
  RAISE NOTICE '  - Agency mode detected for Yodel Mobile users';
  RAISE NOTICE '  - Dashboard V2 shows app picker with 23 apps';
  RAISE NOTICE '  - No "permission denied" errors in logs';
  RAISE NOTICE '';
  RAISE NOTICE 'Validation:';
  RAISE NOTICE '  - Check validation tests above';
  RAISE NOTICE '  - Test 3 MUST show 0 policies referencing org_users_deprecated';
  RAISE NOTICE '  - Test 4 MUST show 4 policies referencing user_roles';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Check Edge Function logs (should see [AGENCY] Agency mode enabled)';
  RAISE NOTICE '  2. Login as cli@yodelmobile.com';
  RAISE NOTICE '  3. Navigate to /dashboard-v2';
  RAISE NOTICE '  4. Verify app picker displays between Period and Sources';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
