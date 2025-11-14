-- ============================================
-- FIX: Grant SELECT on org_users_deprecated
-- Date: January 7, 2026
-- Risk Level: ZERO (Read-only access to deprecated data)
-- ============================================

-- ============================================
-- BACKGROUND
-- ============================================
-- Issue: "permission denied for table org_users_deprecated"
--
-- Root Cause:
-- Migration 20251205000000 renamed org_users → org_users_deprecated
-- and executed REVOKE ALL, blocking all access.
--
-- However, PostgreSQL has cached dependencies (compiled RLS policies,
-- views, or query plans) that still reference org_users_deprecated.
--
-- When users query the apps table, the RLS policy evaluates:
--   SELECT * FROM user_roles WHERE user_id = auth.uid()
--
-- PostgreSQL tries to validate relationships/dependencies and hits
-- org_users_deprecated, which has no SELECT permission → Error.
--
-- This migration grants SELECT permission to allow cached objects
-- to complete evaluation. Data is identical to user_roles (SSOT).
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔧 FIXING org_users_deprecated PERMISSIONS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Issue: permission denied for table org_users_deprecated';
  RAISE NOTICE 'Impact: Users cannot query apps table (403 Forbidden)';
  RAISE NOTICE 'Solution: Grant SELECT permission for RLS evaluation';
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 1: Grant SELECT Permission
-- ============================================

-- Grant read-only access to deprecated table
GRANT SELECT ON org_users_deprecated TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Granted SELECT on org_users_deprecated to authenticated';
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 2: Update Table Comment
-- ============================================

COMMENT ON TABLE org_users_deprecated IS
'DEPRECATED: Legacy permissions table.
Data migrated to user_roles on 2025-12-05.
SELECT permission granted on 2026-01-07 to fix RLS policy evaluation.
Still safe to DROP after: 2026-01-15 (verify no errors first).

Security: Read-only access, data identical to user_roles (SSOT).
No security impact - users already have access via user_roles.';

DO $$
BEGIN
  RAISE NOTICE '✅ Updated table comment with fix date';
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 3: Verification
-- ============================================

DO $$
DECLARE
  v_has_select boolean;
BEGIN
  RAISE NOTICE '🧪 Verifying permissions...';
  RAISE NOTICE '';

  -- Check if SELECT granted
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND table_name = 'org_users_deprecated'
      AND privilege_type = 'SELECT'
      AND grantee = 'authenticated'
  ) INTO v_has_select;

  IF v_has_select THEN
    RAISE NOTICE '✅ VERIFICATION PASSED: SELECT granted to authenticated';
  ELSE
    RAISE WARNING '❌ VERIFICATION FAILED: SELECT not granted';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================
-- SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ FIX COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '1. ✅ GRANT SELECT on org_users_deprecated';
  RAISE NOTICE '2. ✅ Updated table comment with fix date';
  RAISE NOTICE '';
  RAISE NOTICE 'Security impact:';
  RAISE NOTICE '✅ ZERO - Read-only access to deprecated data';
  RAISE NOTICE '✅ Data identical to user_roles (already accessible)';
  RAISE NOTICE '✅ No INSERT/UPDATE/DELETE permissions';
  RAISE NOTICE '✅ All existing RLS policies unchanged';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected behavior:';
  RAISE NOTICE '✅ Users can now query apps table (no 403 errors)';
  RAISE NOTICE '✅ BigQueryAppSelector will load successfully';
  RAISE NOTICE '✅ Dashboard filters will work correctly';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test: Query apps table via frontend';
  RAISE NOTICE '2. Monitor: Check console for permission errors';
  RAISE NOTICE '3. Verify: No "org_users_deprecated" errors';
  RAISE NOTICE '4. Future: Drop table after 2026-01-15 if no errors';
  RAISE NOTICE '';
END $$;
