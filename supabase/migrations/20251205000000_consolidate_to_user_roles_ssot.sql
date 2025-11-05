-- ============================================
-- MIGRATION: Consolidate to user_roles (SSOT)
-- Date: December 5, 2025
-- Fixed: Using correct ORG_ADMIN enum value
-- ============================================

-- ============================================
-- PHASE 1: CREATE BACKUPS (Safe to re-run)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '📦 PHASE 1: Creating backups...';

  -- Only create if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_roles_backup') THEN
    CREATE TABLE user_roles_backup AS SELECT * FROM user_roles;
    RAISE NOTICE '✅ user_roles_backup created';
  ELSE
    RAISE NOTICE '⚠️  user_roles_backup already exists, skipping';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'org_users_backup') THEN
    CREATE TABLE org_users_backup AS SELECT * FROM org_users;
    RAISE NOTICE '✅ org_users_backup created';
  ELSE
    RAISE NOTICE '⚠️  org_users_backup already exists, skipping';
  END IF;
END $$;

-- ============================================
-- PHASE 2: FIX cli@yodelmobile.com USER
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🔧 PHASE 2: Fixing cli@yodelmobile.com user data...';
END $$;

-- Update with correct enum value from org_users
UPDATE user_roles
SET
  organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
  role = 'ORG_ADMIN'::app_role  -- ✅ Correct uppercase enum value
WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

-- Verify the fix
DO $$
DECLARE
  v_org_id uuid;
  v_role text;
BEGIN
  SELECT organization_id, role::text INTO v_org_id, v_role
  FROM user_roles
  WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

  IF v_org_id IS NOT NULL THEN
    RAISE NOTICE '✅ cli user fixed: org_id=%, role=%', v_org_id, v_role;
  ELSE
    RAISE EXCEPTION '❌ FAILED: cli user still has NULL org_id';
  END IF;
END $$;

-- ============================================
-- PHASE 3: REMOVE DUPLICATES
-- ============================================
DO $$
DECLARE
  v_deleted_count int;
BEGIN
  RAISE NOTICE '🧹 PHASE 3: Removing duplicate entries...';

  -- Delete lowercase duplicate (keep uppercase SUPER_ADMIN)
  DELETE FROM user_roles
  WHERE user_id = '9487fa9d-f0cc-427c-900b-98871c19498a'
    AND role = 'super_admin'::app_role;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % duplicate row(s)', v_deleted_count;
END $$;

-- Verify no duplicates remain
DO $$
DECLARE
  v_dup_count int;
BEGIN
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT user_id
    FROM user_roles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count = 0 THEN
    RAISE NOTICE '✅ No duplicates remain';
  ELSE
    RAISE WARNING '⚠️  Still have % duplicate user(s)', v_dup_count;
  END IF;
END $$;

-- ============================================
-- PHASE 4: UPDATE VIEW (SINGLE SOURCE)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🔄 PHASE 4: Updating unified permissions view...';
END $$;

DROP VIEW IF EXISTS user_permissions_unified CASCADE;

CREATE VIEW user_permissions_unified AS
SELECT
  ur.user_id,
  ur.organization_id AS org_id,
  ur.role::text AS role,
  'user_roles'::text AS role_source,
  (ur.organization_id IS NULL) AS is_platform_role,
  o.name AS org_name,
  o.slug AS org_slug,
  ur.created_at AS resolved_at,
  -- Role flags (handle both uppercase and lowercase enum values)
  (ur.role::text IN ('SUPER_ADMIN', 'super_admin')) AS is_super_admin,
  (ur.role::text IN ('ORG_ADMIN', 'org_admin', 'SUPER_ADMIN', 'super_admin')) AS is_org_admin,
  (ur.organization_id IS NOT NULL) AS is_org_scoped_role,
  -- Normalized role (lowercase for frontend consistency)
  CASE
    WHEN ur.role::text IN ('SUPER_ADMIN', 'super_admin') THEN 'super_admin'
    WHEN ur.role::text IN ('ORG_ADMIN', 'org_admin') THEN 'org_admin'
    WHEN ur.role::text = 'ASO_MANAGER' THEN 'aso_manager'
    WHEN ur.role::text = 'ANALYST' THEN 'analyst'
    WHEN ur.role::text = 'VIEWER' THEN 'viewer'
    ELSE 'viewer'
  END AS effective_role
FROM user_roles ur
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE ur.role IS NOT NULL;

GRANT SELECT ON user_permissions_unified TO authenticated;

COMMENT ON VIEW user_permissions_unified IS
  'Enterprise permissions view - Single source of truth.
   Queries ONLY user_roles table per AUTHENTICATION_SECURITY_ARCHITECTURE.md.
   Migration completed: 2025-12-05
   Handles both uppercase (ORG_ADMIN) and lowercase (org_admin) enum values.';

DO $$
BEGIN
  RAISE NOTICE '✅ View updated successfully';
END $$;

-- ============================================
-- PHASE 5: TEST VIEW
-- ============================================
DO $$
DECLARE
  v_test_org_id uuid;
  v_test_role text;
BEGIN
  RAISE NOTICE '🧪 PHASE 5: Testing unified view...';

  SELECT org_id, role INTO v_test_org_id, v_test_role
  FROM user_permissions_unified
  WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

  IF v_test_org_id IS NOT NULL THEN
    RAISE NOTICE '✅ View test PASSED: org_id=%, role=%', v_test_org_id, v_test_role;
  ELSE
    RAISE EXCEPTION '❌ View test FAILED: org_id is NULL';
  END IF;
END $$;

-- ============================================
-- PHASE 6: DEPRECATE org_users TABLE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '📦 PHASE 6: Deprecating org_users table...';

  -- Check if already deprecated
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'org_users_deprecated') THEN
    RAISE NOTICE '⚠️  org_users already deprecated, skipping';
  ELSE
    ALTER TABLE org_users RENAME TO org_users_deprecated;

    COMMENT ON TABLE org_users_deprecated IS
      'DEPRECATED: Legacy permissions table.
       Data migrated to user_roles on 2025-12-05.
       Kept as backup for 30 days.
       Safe to DROP after: 2026-01-05';

    -- Restrict access (read-only for admins)
    REVOKE ALL ON org_users_deprecated FROM authenticated;
    REVOKE ALL ON org_users_deprecated FROM anon;

    RAISE NOTICE '✅ org_users deprecated successfully';
  END IF;
END $$;

-- ============================================
-- PHASE 7: FINAL VERIFICATION
-- ============================================
DO $$
DECLARE
  v_check1_pass boolean;
  v_check2_pass boolean;
  v_check3_pass boolean;
  v_check4_pass boolean;
BEGIN
  RAISE NOTICE '✅ PHASE 7: Final verification...';
  RAISE NOTICE '';

  -- Check 1: cli user in user_roles
  SELECT organization_id IS NOT NULL INTO v_check1_pass
  FROM user_roles
  WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

  IF v_check1_pass THEN
    RAISE NOTICE '✅ CHECK 1 PASS: cli user has org_id in user_roles';
  ELSE
    RAISE EXCEPTION '❌ CHECK 1 FAIL: cli user missing org_id';
  END IF;

  -- Check 2: cli user in view
  SELECT org_id IS NOT NULL INTO v_check2_pass
  FROM user_permissions_unified
  WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

  IF v_check2_pass THEN
    RAISE NOTICE '✅ CHECK 2 PASS: cli user has org_id in view';
  ELSE
    RAISE EXCEPTION '❌ CHECK 2 FAIL: view returning NULL org_id';
  END IF;

  -- Check 3: No duplicates
  SELECT COUNT(*) = 0 INTO v_check3_pass
  FROM (
    SELECT user_id FROM user_roles
    GROUP BY user_id HAVING COUNT(*) > 1
  ) dups;

  IF v_check3_pass THEN
    RAISE NOTICE '✅ CHECK 3 PASS: No duplicate users';
  ELSE
    RAISE WARNING '⚠️  CHECK 3 WARNING: Duplicates still exist';
  END IF;

  -- Check 4: org_users deprecated
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'org_users_deprecated'
  ) INTO v_check4_pass;

  IF v_check4_pass THEN
    RAISE NOTICE '✅ CHECK 4 PASS: org_users deprecated';
  ELSE
    RAISE WARNING '⚠️  CHECK 4 WARNING: org_users not deprecated';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE';
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- SUMMARY OUTPUT
-- ============================================

-- Show final state
SELECT
  '📊 FINAL STATE' as section,
  user_id,
  organization_id,
  role::text as role,
  CASE
    WHEN organization_id IS NOT NULL THEN '✅'
    ELSE '❌'
  END as status
FROM user_roles
WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

SELECT
  '🔍 VIEW OUTPUT' as section,
  user_id,
  org_id,
  org_name,
  role as effective_role,
  is_org_admin,
  effective_role as normalized_role
FROM user_permissions_unified
WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';
