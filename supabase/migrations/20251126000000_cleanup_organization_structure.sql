-- Migration: Cleanup Organization Structure
-- Date: 2025-11-26
-- Purpose:
--   1. Move all Yodel Mobile team users to correct organization
--   2. Delete test/demo organizations that are no longer needed
--   3. Clean up agency relationships to remove 3-tier nesting
--
-- Background:
--   - Users Igor, Kasia, IgorBlnv were incorrectly placed in "Demo Analytics Organization"
--   - Multiple demo/test organizations created during development
--   - Overcomplicated 3-tier agency structure (Yodel -> Demo Analytics Org -> Demo Client Corp)
--   - Only ONE real client organization exists (dbdb0cc5...) with 8 real external client apps
--
-- Result:
--   - Clean 2-tier structure: Yodel Mobile (agency) -> Client Organization (client)
--   - All Yodel Mobile team users in correct organization
--   - Test data removed

-- ============================================================================
-- STEP 1: Move Yodel Mobile team users to correct organization
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📋 Step 1: Moving Yodel Mobile team users to correct organization...';
END $$;

-- Move Igor, Kasia, and IgorBlnv from "Demo Analytics Organization" to "Yodel Mobile"
UPDATE profiles
SET
  organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',  -- Yodel Mobile
  updated_at = now()
WHERE email IN (
  'igor@yodelmobile.com',
  'kasia@yodelmobile.com',
  'igorblnv@gmail.com'
)
AND organization_id = 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f';  -- Demo Analytics Organization

-- Verify the move
DO $$
DECLARE
  moved_count integer;
BEGIN
  SELECT COUNT(*) INTO moved_count
  FROM profiles
  WHERE email IN ('igor@yodelmobile.com', 'kasia@yodelmobile.com', 'igorblnv@gmail.com')
    AND organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  IF moved_count = 3 THEN
    RAISE NOTICE '✅ Successfully moved 3 users to Yodel Mobile organization';
  ELSE
    RAISE WARNING '⚠️  Expected 3 users moved, but got %', moved_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Rename "Demo Analytics Organization" to generic client name
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📋 Step 2: Renaming client organization...';
END $$;

-- Rename to generic "Client Organization" (user can rename later via UI)
-- This org contains the 8 real external client apps
UPDATE organizations
SET
  name = 'Client Organization',
  updated_at = now()
WHERE id = 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'
  AND name = 'Demo Analytics Organization';

DO $$
BEGIN
  RAISE NOTICE '✅ Renamed "Demo Analytics Organization" to "Client Organization"';
  RAISE NOTICE '   (Can be renamed later via UI to actual client name)';
END $$;

-- ============================================================================
-- STEP 3: Delete test/demo organizations
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📋 Step 3: Deleting test organizations...';
END $$;

-- First, delete agency_clients relationships for test orgs
-- (Prevents foreign key constraint violations)
DELETE FROM agency_clients
WHERE client_org_id IN (
  '550e8400-e29b-41d4-a716-446655440001',  -- Demo Client Corp
  '550e8400-e29b-41d4-a716-446655440002'   -- Demo Analytics
)
OR agency_org_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002'
);

-- Delete app access for test orgs (the 2 test apps: Client_One, Client_Two)
DELETE FROM org_app_access
WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001';  -- Demo Client Corp

-- Delete the test organizations
DELETE FROM organizations
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',  -- Demo Client Corp
  '550e8400-e29b-41d4-a716-446655440002',  -- Demo Analytics
  '11111111-1111-1111-1111-111111111111'   -- Next
);

DO $$
DECLARE
  remaining_count integer;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM organizations
  WHERE id NOT IN (
    '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',  -- Yodel Mobile (should remain)
    'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'   -- Client Organization (should remain)
  );

  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ Successfully deleted 3 test organizations';
    RAISE NOTICE '   Only 2 organizations remain: Yodel Mobile + Client Organization';
  ELSE
    RAISE WARNING '⚠️  Expected 0 extra orgs, but found %', remaining_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify final structure
-- ============================================================================

DO $$
DECLARE
  yodel_users integer;
  client_users integer;
  total_orgs integer;
  agency_relationships integer;
  client_apps integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 FINAL ARCHITECTURE VERIFICATION';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  -- Count organizations
  SELECT COUNT(*) INTO total_orgs FROM organizations;
  RAISE NOTICE '🏢 Total Organizations: %', total_orgs;

  -- Count users by org
  SELECT COUNT(*) INTO yodel_users
  FROM profiles
  WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  SELECT COUNT(*) INTO client_users
  FROM profiles
  WHERE organization_id = 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f';

  RAISE NOTICE '👥 Yodel Mobile Users: %', yodel_users;
  RAISE NOTICE '👥 Client Organization Users: %', client_users;

  -- Count agency relationships
  SELECT COUNT(*) INTO agency_relationships FROM agency_clients WHERE is_active = true;
  RAISE NOTICE '🔗 Active Agency Relationships: %', agency_relationships;

  -- Count client apps
  SELECT COUNT(*) INTO client_apps
  FROM org_app_access
  WHERE organization_id = 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'
    AND detached_at IS NULL;

  RAISE NOTICE '📱 Client Apps: %', client_apps;

  RAISE NOTICE '';

  -- Validation
  IF total_orgs = 2 AND yodel_users = 5 AND agency_relationships = 1 AND client_apps = 8 THEN
    RAISE NOTICE '✅ MIGRATION SUCCESSFUL!';
    RAISE NOTICE '';
    RAISE NOTICE 'Clean 2-tier structure:';
    RAISE NOTICE '  Yodel Mobile (agency) → Client Organization (client)';
    RAISE NOTICE '  - 5 Yodel Mobile team members';
    RAISE NOTICE '  - 8 external client apps';
    RAISE NOTICE '  - 1 agency-client relationship';
  ELSE
    RAISE WARNING '⚠️  Architecture may have unexpected state';
    RAISE WARNING 'Expected: 2 orgs, 5 Yodel users, 1 relationship, 8 apps';
    RAISE WARNING 'Got: % orgs, % Yodel users, % relationships, % apps',
      total_orgs, yodel_users, agency_relationships, client_apps;
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
