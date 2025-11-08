-- ============================================================================
-- Migration: 20251108100000_fix_org_app_access_rls
-- ============================================================================
-- Strategy: Nuclear Option - Drop ALL policies, recreate only new ones
-- Purpose: Fix RLS policies on org_app_access to use user_roles (SSOT)
-- Issue: Edge Function returns 0 apps despite database having 23 apps
-- Root Cause: RLS policies reference org_users_deprecated (silent filtering)
-- Fix: Drop ALL policies dynamically, recreate only 4 standardized policies
-- Pattern: Same as agency_clients fix (migration 20251108000000)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔥 NUCLEAR OPTION: Removing ALL old org_app_access policies';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Issue: RLS policies silently filter all rows (return 0 apps)';
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
  RAISE NOTICE '📋 PHASE 1: Dropping ALL existing policies on org_app_access...';
  RAISE NOTICE '';

  -- Loop through all policies on org_app_access table
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'org_app_access'
      AND schemaname = 'public'
  LOOP
    -- Drop each policy dynamically
    EXECUTE format('DROP POLICY IF EXISTS %I ON org_app_access', policy_record.policyname);

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

-- Policy: Allow users to read app access for their organizations
-- Permissions:
-- - Users can see app access for organizations they belong to
-- - Agency users can see app access for their client organizations
-- - Super admins can see all app access
CREATE POLICY "users_read_app_access"
  ON org_app_access
  FOR SELECT
  USING (
    -- User is in this organization
    organization_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
    OR
    -- User's organization is an agency managing this client organization
    organization_id IN (
      SELECT client_org_id
      FROM agency_clients
      WHERE agency_org_id IN (
        SELECT organization_id
        FROM user_roles
        WHERE user_id = auth.uid()
      )
      AND is_active = true
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
  RAISE NOTICE '✅ SELECT policy created: users_read_app_access';
END $$;

-- ============================================================================
-- PHASE 3: Create New WRITE Policies (Insert/Update/Delete)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📋 PHASE 3: Creating INSERT/UPDATE/DELETE policies...';
END $$;

-- Policy: Allow admins to attach apps to their organizations
-- Permissions:
-- - Org admins can attach apps to their own organization
-- - Agency admins can attach apps to their client organizations
-- - Platform super admins can attach apps to any organization
CREATE POLICY "admins_attach_apps"
  ON org_app_access
  FOR INSERT
  WITH CHECK (
    -- User is org admin for this organization
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = org_app_access.organization_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    -- User is agency admin and this is a managed client
    EXISTS (
      SELECT 1
      FROM agency_clients ac
      INNER JOIN user_roles ur ON ur.organization_id = ac.agency_org_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
        AND ac.client_org_id = org_app_access.organization_id
        AND ac.is_active = true
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

-- Policy: Allow admins to update app access (e.g., detach apps)
-- Permissions:
-- - Org admins can update app access for their own organization
-- - Agency admins can update app access for their client organizations
-- - Platform super admins can update any app access
CREATE POLICY "admins_update_app_access"
  ON org_app_access
  FOR UPDATE
  USING (
    -- User is org admin for this organization
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = org_app_access.organization_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    -- User is agency admin and this is a managed client
    EXISTS (
      SELECT 1
      FROM agency_clients ac
      INNER JOIN user_roles ur ON ur.organization_id = ac.agency_org_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
        AND ac.client_org_id = org_app_access.organization_id
        AND ac.is_active = true
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
        AND organization_id = org_app_access.organization_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    EXISTS (
      SELECT 1
      FROM agency_clients ac
      INNER JOIN user_roles ur ON ur.organization_id = ac.agency_org_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
        AND ac.client_org_id = org_app_access.organization_id
        AND ac.is_active = true
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

-- Policy: Allow admins to delete app access
-- Permissions:
-- - Org admins can delete app access for their own organization
-- - Agency admins can delete app access for their client organizations
-- - Platform super admins can delete any app access
CREATE POLICY "admins_delete_app_access"
  ON org_app_access
  FOR DELETE
  USING (
    -- User is org admin for this organization
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = org_app_access.organization_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    -- User is agency admin and this is a managed client
    EXISTS (
      SELECT 1
      FROM agency_clients ac
      INNER JOIN user_roles ur ON ur.organization_id = ac.agency_org_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
        AND ac.client_org_id = org_app_access.organization_id
        AND ac.is_active = true
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
  RAISE NOTICE '✅ INSERT policy created: admins_attach_apps';
  RAISE NOTICE '✅ UPDATE policy created: admins_update_app_access';
  RAISE NOTICE '✅ DELETE policy created: admins_delete_app_access';
END $$;

-- ============================================================================
-- PHASE 4: Validation Tests
-- ============================================================================

DO $$
DECLARE
  yodel_mobile_id UUID := '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  client1_id UUID := 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f';
  client2_id UUID := '550e8400-e29b-41d4-a716-446655440002';
  policy_count INTEGER;
  bad_policy_count INTEGER;
  good_policy_count INTEGER;
  client1_app_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 PHASE 4: Running validation tests...';
  RAISE NOTICE '';

  -- Test 1: Count policies on org_app_access
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'org_app_access'
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

  -- Test 2: Count apps for Client 1
  SELECT COUNT(*) INTO client1_app_count
  FROM org_app_access
  WHERE organization_id = client1_id
    AND detached_at IS NULL;

  RAISE NOTICE 'Test 2: Client 1 app access';
  RAISE NOTICE '  Organization: Client 1 (dbdb0cc5...)';
  RAISE NOTICE '  Expected: 23 active apps';
  RAISE NOTICE '  Actual:   % active apps', client1_app_count;

  IF client1_app_count = 23 THEN
    RAISE NOTICE '  ✅ PASS: Client 1 has 23 active apps';
  ELSE
    RAISE WARNING '  ⚠️  WARNING: Expected 23 apps, found %', client1_app_count;
  END IF;

  RAISE NOTICE '';

  -- Test 3: Verify NO policies reference org_users_deprecated
  SELECT COUNT(*) INTO bad_policy_count
  FROM pg_policies
  WHERE tablename = 'org_app_access'
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
        WHERE tablename = 'org_app_access'
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
  WHERE tablename = 'org_app_access'
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
      WHERE tablename = 'org_app_access'
        AND schemaname = 'public'
      ORDER BY policyname
    LOOP
      RAISE NOTICE '  - % (%)', policy.policyname, policy.cmd;
    END LOOP;
  END;

  RAISE NOTICE '';

  -- Test 6: Verify agency_clients policies still work (agency mode)
  DECLARE
    agency_policy_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO agency_policy_count
    FROM pg_policies
    WHERE tablename = 'agency_clients'
      AND schemaname = 'public'
      AND (
        qual::text LIKE '%user_roles%'
        OR with_check::text LIKE '%user_roles%'
      );

    RAISE NOTICE 'Test 6: Verify agency_clients policies still intact';
    RAISE NOTICE '  Expected: 4 policies on agency_clients';
    RAISE NOTICE '  Actual:   % policies', agency_policy_count;

    IF agency_policy_count = 4 THEN
      RAISE NOTICE '  ✅ PASS: agency_clients policies intact';
    ELSE
      RAISE WARNING '  ⚠️  WARNING: agency_clients may have changed';
    END IF;
  END;

  RAISE NOTICE '';

END $$;

-- ============================================================================
-- PHASE 5: Update Documentation
-- ============================================================================

COMMENT ON TABLE org_app_access IS
  'App access control for organizations - which apps each org can access.

Migration History:
- Created: Unknown (pre-migration tracking)
- Fixed: 2025-11-08 (Migration 20251108100000) - Nuclear Option
  * Dropped ALL policies dynamically
  * Created 4 standardized policies using user_roles (SSOT)
  * Added agency-aware access control
  * Guaranteed clean slate

RLS Policies (Created 2025-11-08):
- users_read_app_access: Read access for org users + agency access to client apps
- admins_attach_apps: Insert access for org admins + agency admins
- admins_update_app_access: Update access for org admins + agency admins
- admins_delete_app_access: Delete access for org admins + agency admins

Security Model:
- Users can see apps attached to their organization
- Agency users can see apps attached to their managed client organizations
- Super admins have global access
- Only org admins can manage app attachments
- Agency admins can manage apps for their client organizations

All policies reference user_roles table (SSOT).
No policies reference deprecated tables (org_users, org_users_deprecated).
Agency mode supported via agency_clients table.';

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION COMPLETE: Nuclear Option Applied to org_app_access';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '  1. ✅ Dropped ALL old policies dynamically (no need to know names)';
  RAISE NOTICE '  2. ✅ Created SELECT policy using user_roles (SSOT)';
  RAISE NOTICE '  3. ✅ Created INSERT policy using user_roles (SSOT)';
  RAISE NOTICE '  4. ✅ Created UPDATE policy using user_roles (SSOT)';
  RAISE NOTICE '  5. ✅ Created DELETE policy using user_roles (SSOT)';
  RAISE NOTICE '  6. ✅ Added agency-aware access control';
  RAISE NOTICE '  7. ✅ Updated table documentation';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Results:';
  RAISE NOTICE '  - Edge Function queries org_app_access without filtering';
  RAISE NOTICE '  - Agency users can see apps from managed client organizations';
  RAISE NOTICE '  - Dashboard V2 receives 23 app IDs from Client 1';
  RAISE NOTICE '  - App picker displays with all available apps';
  RAISE NOTICE '  - No silent RLS filtering';
  RAISE NOTICE '';
  RAISE NOTICE 'Validation:';
  RAISE NOTICE '  - Check validation tests above';
  RAISE NOTICE '  - Test 3 MUST show 0 policies referencing org_users_deprecated';
  RAISE NOTICE '  - Test 4 MUST show 4 policies referencing user_roles';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Check Edge Function logs (should see allowed_apps: 23)';
  RAISE NOTICE '  2. Login as cli@yodelmobile.com';
  RAISE NOTICE '  3. Navigate to /dashboard-v2';
  RAISE NOTICE '  4. Verify app picker displays with 23 apps';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
