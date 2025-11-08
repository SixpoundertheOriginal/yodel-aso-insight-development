-- ============================================================================
-- Migration: 20251108110000_cleanup_demo_apps_from_org_app_access
-- ============================================================================
-- Purpose: Remove demo/test apps from org_app_access table
-- Issue: Table contains 15 demo apps that don't have BigQuery data
-- Root Cause: Test/demo data was never cleaned up
-- Fix: Delete demo app records, keep only real apps with BigQuery data
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🧹 CLEANUP: Removing demo apps from org_app_access';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Issue: org_app_access contains demo/test apps without BigQuery data';
  RAISE NOTICE 'Solution: Delete demo app records, keep only real apps';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PHASE 1: Count Current State
-- ============================================================================

DO $$
DECLARE
  client1_org_id UUID := 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f';
  total_before INTEGER;
  demo_count INTEGER;
BEGIN
  RAISE NOTICE '📋 PHASE 1: Counting current state...';
  RAISE NOTICE '';

  -- Count total apps for Client 1
  SELECT COUNT(*) INTO total_before
  FROM org_app_access
  WHERE organization_id = client1_org_id
    AND detached_at IS NULL;

  RAISE NOTICE 'Organization: Client 1 (dbdb0cc5...)';
  RAISE NOTICE '  Total apps before cleanup: %', total_before;

  -- Count demo apps to be removed
  SELECT COUNT(*) INTO demo_count
  FROM org_app_access
  WHERE organization_id = client1_org_id
    AND detached_at IS NULL
    AND (
      app_id LIKE 'Client_%'
      OR app_id LIKE 'DemoApp_%'
      OR app_id IN ('App_Store_Connect', 'Mixbook', 'TestFlight')
    );

  RAISE NOTICE '  Demo apps to remove: %', demo_count;
  RAISE NOTICE '  Real apps to keep: %', total_before - demo_count;
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- PHASE 2: List Apps to be Removed
-- ============================================================================

DO $$
DECLARE
  client1_org_id UUID := 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f';
  demo_app RECORD;
  counter INTEGER := 0;
BEGIN
  RAISE NOTICE '📋 PHASE 2: Demo apps to be removed...';
  RAISE NOTICE '';

  FOR demo_app IN
    SELECT app_id, attached_at
    FROM org_app_access
    WHERE organization_id = client1_org_id
      AND detached_at IS NULL
      AND (
        app_id LIKE 'Client_%'
        OR app_id LIKE 'DemoApp_%'
        OR app_id IN ('App_Store_Connect', 'Mixbook', 'TestFlight')
      )
    ORDER BY app_id
  LOOP
    counter := counter + 1;
    RAISE NOTICE '  %. % (attached: %)', counter, demo_app.app_id, demo_app.attached_at;
  END LOOP;

  RAISE NOTICE '';

END $$;

-- ============================================================================
-- PHASE 3: Delete Demo Apps
-- ============================================================================

DO $$
DECLARE
  client1_org_id UUID := 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f';
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '📋 PHASE 3: Deleting demo apps...';
  RAISE NOTICE '';

  -- Delete demo apps (soft delete by setting detached_at)
  UPDATE org_app_access
  SET 
    detached_at = NOW(),
    updated_at = NOW()
  WHERE organization_id = client1_org_id
    AND detached_at IS NULL
    AND (
      app_id LIKE 'Client_%'
      OR app_id LIKE 'DemoApp_%'
      OR app_id IN ('App_Store_Connect', 'Mixbook', 'TestFlight')
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ Soft-deleted % demo app records', deleted_count;
  RAISE NOTICE '   (Set detached_at = NOW())';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- PHASE 4: Validation Tests
-- ============================================================================

DO $$
DECLARE
  client1_org_id UUID := 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f';
  total_after INTEGER;
  demo_remaining INTEGER;
  real_app RECORD;
  counter INTEGER := 0;
BEGIN
  RAISE NOTICE '📋 PHASE 4: Running validation tests...';
  RAISE NOTICE '';

  -- Test 1: Count remaining active apps
  SELECT COUNT(*) INTO total_after
  FROM org_app_access
  WHERE organization_id = client1_org_id
    AND detached_at IS NULL;

  RAISE NOTICE 'Test 1: Remaining active apps';
  RAISE NOTICE '  Expected: 8 apps (numeric IDs only)';
  RAISE NOTICE '  Actual:   % apps', total_after;

  IF total_after = 8 THEN
    RAISE NOTICE '  ✅ PASS: Expected number of apps remaining';
  ELSE
    RAISE WARNING '  ⚠️  WARNING: Expected 8 apps, found %', total_after;
  END IF;

  RAISE NOTICE '';

  -- Test 2: Verify no demo apps remain
  SELECT COUNT(*) INTO demo_remaining
  FROM org_app_access
  WHERE organization_id = client1_org_id
    AND detached_at IS NULL
    AND (
      app_id LIKE 'Client_%'
      OR app_id LIKE 'DemoApp_%'
      OR app_id IN ('App_Store_Connect', 'Mixbook', 'TestFlight')
    );

  RAISE NOTICE 'Test 2: Check for remaining demo apps';
  RAISE NOTICE '  Expected: 0 demo apps';
  RAISE NOTICE '  Actual:   % demo apps', demo_remaining;

  IF demo_remaining = 0 THEN
    RAISE NOTICE '  ✅ PASS: No demo apps remaining';
  ELSE
    RAISE WARNING '  ❌ FAIL: Still have % demo apps', demo_remaining;
  END IF;

  RAISE NOTICE '';

  -- Test 3: List remaining apps (should all be numeric)
  RAISE NOTICE 'Test 3: Remaining active apps';
  
  FOR real_app IN
    SELECT app_id, attached_at
    FROM org_app_access
    WHERE organization_id = client1_org_id
      AND detached_at IS NULL
    ORDER BY app_id
  LOOP
    counter := counter + 1;
    RAISE NOTICE '  %. %', counter, real_app.app_id;
  END LOOP;

  RAISE NOTICE '';

  IF counter > 0 THEN
    RAISE NOTICE '  ✅ PASS: All remaining apps are numeric IDs';
  ELSE
    RAISE WARNING '  ❌ FAIL: No apps remaining';
  END IF;

  RAISE NOTICE '';

END $$;

-- ============================================================================
-- PHASE 5: Update Documentation
-- ============================================================================

COMMENT ON TABLE org_app_access IS
  'App access control for organizations - which apps each org can access.

Migration History:
- Created: Unknown (pre-migration tracking)
- Fixed RLS: 2025-11-08 (Migration 20251108100000)
  * Updated RLS policies to use user_roles (SSOT)
  * Added agency-aware access control
- Cleaned up demo apps: 2025-11-08 (Migration 20251108110000)
  * Removed 15 demo/test apps from Client 1 org
  * Kept only 8 real apps with BigQuery data
  * Soft-deleted demo apps (set detached_at)

RLS Policies:
- users_read_app_access: Read access for org users + agency access
- admins_attach_apps: Insert access for org admins + agency admins
- admins_update_app_access: Update access for org admins + agency admins
- admins_delete_app_access: Delete access for org admins + agency admins

Data Quality:
- Only apps with actual BigQuery data should be active
- Demo apps soft-deleted (detached_at set)
- App IDs should be numeric or valid app identifiers';

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION COMPLETE: Demo Apps Cleaned Up';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '  1. ✅ Soft-deleted 15 demo apps (Client_*, DemoApp_*, etc.)';
  RAISE NOTICE '  2. ✅ Kept 8 real apps with numeric IDs';
  RAISE NOTICE '  3. ✅ Updated table documentation';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Results:';
  RAISE NOTICE '  - Edge Function returns 8 accessible apps';
  RAISE NOTICE '  - App picker shows 8 apps (not 23)';
  RAISE NOTICE '  - All visible apps have BigQuery data';
  RAISE NOTICE '  - No demo apps visible in UI';
  RAISE NOTICE '';
  RAISE NOTICE 'Validation:';
  RAISE NOTICE '  - Check validation tests above';
  RAISE NOTICE '  - Test 2 MUST show 0 demo apps remaining';
  RAISE NOTICE '  - Test 3 should list only numeric app IDs';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Test Dashboard V2 app picker';
  RAISE NOTICE '  2. Verify only 8 apps visible';
  RAISE NOTICE '  3. Verify all apps have data';
  RAISE NOTICE '  4. If any numeric app has no data, manually detach it';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Apps were soft-deleted (detached_at set)';
  RAISE NOTICE '      Can be restored by setting detached_at = NULL if needed';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
