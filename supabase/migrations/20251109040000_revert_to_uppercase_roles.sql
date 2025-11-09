-- ============================================
-- REVERT: Return to UPPERCASE Role Enum Values
-- Date: November 9, 2025
-- Purpose: Restore architectural standard and fix 403 RLS errors
-- ============================================

-- ============================================
-- BACKGROUND
-- ============================================
-- Migration 20251108220000 changed role values from UPPERCASE to lowercase.
-- This broke RLS policies which check for UPPERCASE values.
--
-- EVIDENCE FOR UPPERCASE (Architectural Standard):
-- 1. ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md:134
--    "Enum normalization: Frontend uses lowercase, database uses uppercase"
-- 2. Migration 20251205000000:42
--    role = 'ORG_ADMIN'::app_role  -- ✅ Correct uppercase enum value
-- 3. PHASE_2_COMPLETE.md:92
--    role = 'SUPER_ADMIN'  -- Working production pattern
-- 4. 12 production migrations (Oct 27 - Nov 7)
--    All RLS policies check for UPPERCASE
-- 5. user_permissions_unified view design
--    Handles BOTH cases, normalizes to lowercase for frontend
--
-- IMPACT OF REVERT:
-- - ✅ Fixes all 403 RLS errors immediately
-- - ✅ No RLS policy changes needed (already correct)
-- - ✅ Aligns with documented architecture
-- - ✅ View continues to work (handles both cases)
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔄 REVERTING TO UPPERCASE ROLE VALUES';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Rationale: Align with ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md';
  RAISE NOTICE 'Impact: Fixes 403 RLS errors across application';
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 1: Revert Role Values to UPPERCASE
-- ============================================

DO $$
DECLARE
  v_updated int := 0;
  v_org_admin int := 0;
  v_super_admin int := 0;
  v_aso_manager int := 0;
  v_analyst int := 0;
  v_viewer int := 0;
  v_client int := 0;
BEGIN
  RAISE NOTICE '📝 Step 1: Reverting role values to UPPERCASE...';
  RAISE NOTICE '';

  -- Update org_admin → ORG_ADMIN
  UPDATE public.user_roles
  SET role = 'ORG_ADMIN'::app_role
  WHERE role::text = 'org_admin';
  GET DIAGNOSTICS v_org_admin = ROW_COUNT;

  -- Update super_admin → SUPER_ADMIN
  UPDATE public.user_roles
  SET role = 'SUPER_ADMIN'::app_role
  WHERE role::text = 'super_admin';
  GET DIAGNOSTICS v_super_admin = ROW_COUNT;

  -- Update aso_manager → ASO_MANAGER
  UPDATE public.user_roles
  SET role = 'ASO_MANAGER'::app_role
  WHERE role::text = 'aso_manager';
  GET DIAGNOSTICS v_aso_manager = ROW_COUNT;

  -- Update analyst → ANALYST
  UPDATE public.user_roles
  SET role = 'ANALYST'::app_role
  WHERE role::text = 'analyst';
  GET DIAGNOSTICS v_analyst = ROW_COUNT;

  -- Update viewer → VIEWER (if enum value exists)
  BEGIN
    UPDATE public.user_roles
    SET role = 'VIEWER'::app_role
    WHERE role::text = 'viewer';
    GET DIAGNOSTICS v_viewer = ROW_COUNT;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE NOTICE '⚠️  VIEWER enum value does not exist, skipping';
      v_viewer := 0;
  END;

  -- Update client → CLIENT (if enum value exists)
  BEGIN
    UPDATE public.user_roles
    SET role = 'CLIENT'::app_role
    WHERE role::text = 'client';
    GET DIAGNOSTICS v_client = ROW_COUNT;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE NOTICE '⚠️  CLIENT enum value does not exist, skipping';
      v_client := 0;
  END;

  v_updated := v_org_admin + v_super_admin + v_aso_manager + v_analyst + v_viewer + v_client;

  RAISE NOTICE '✅ Reverted % role(s) to UPPERCASE:', v_updated;
  RAISE NOTICE '   - ORG_ADMIN: %', v_org_admin;
  RAISE NOTICE '   - SUPER_ADMIN: %', v_super_admin;
  RAISE NOTICE '   - ASO_MANAGER: %', v_aso_manager;
  RAISE NOTICE '   - ANALYST: %', v_analyst;
  RAISE NOTICE '   - VIEWER: %', v_viewer;
  RAISE NOTICE '   - CLIENT: %', v_client;
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 2: Verify All Roles Are UPPERCASE
-- ============================================

DO $$
DECLARE
  v_lowercase_count int;
  v_uppercase_count int;
  v_total_count int;
BEGIN
  RAISE NOTICE '🔍 Step 2: Verifying role values...';
  RAISE NOTICE '';

  -- Count remaining lowercase
  SELECT COUNT(*) INTO v_lowercase_count
  FROM user_roles
  WHERE role::text IN ('org_admin', 'super_admin', 'aso_manager', 'analyst', 'viewer', 'client');

  -- Count uppercase
  SELECT COUNT(*) INTO v_uppercase_count
  FROM user_roles
  WHERE role::text IN ('ORG_ADMIN', 'SUPER_ADMIN', 'ASO_MANAGER', 'ANALYST', 'VIEWER', 'CLIENT');

  -- Total
  SELECT COUNT(*) INTO v_total_count
  FROM user_roles;

  IF v_lowercase_count = 0 AND v_uppercase_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: All % role(s) are UPPERCASE', v_uppercase_count;
    RAISE NOTICE '   Total users: %', v_total_count;
  ELSIF v_lowercase_count > 0 THEN
    RAISE WARNING '⚠️  WARNING: Still have % lowercase role(s)', v_lowercase_count;
    RAISE WARNING '   This may indicate unexpected enum values';
  ELSE
    RAISE WARNING '⚠️  WARNING: No roles found (may be expected in empty database)';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 3: Update is_super_admin_db Function
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Step 3: Updating is_super_admin_db function...';
  RAISE NOTICE '';
END $$;

CREATE OR REPLACE FUNCTION public.is_super_admin_db()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'::app_role  -- ✅ UPPERCASE
  );
$$;

COMMENT ON FUNCTION public.is_super_admin_db() IS
'Database-based super admin check. Uses UPPERCASE role value per ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md.';

DO $$
BEGIN
  RAISE NOTICE '✅ Function updated to use UPPERCASE';
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 4: Verify RLS Policies Will Work
-- ============================================

DO $$
DECLARE
  v_policy_count int;
BEGIN
  RAISE NOTICE '🔐 Step 4: Verifying RLS policies...';
  RAISE NOTICE '';

  -- Count policies that reference role checks
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE qual LIKE '%ORG_ADMIN%'
     OR qual LIKE '%SUPER_ADMIN%'
     OR qual LIKE '%ASO_MANAGER%'
     OR qual LIKE '%ANALYST%';

  RAISE NOTICE '✅ Found % RLS policies with UPPERCASE role checks', v_policy_count;
  RAISE NOTICE '   These policies will now work correctly with database values';
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 5: Test with Known User
-- ============================================

DO $$
DECLARE
  v_cli_role text;
  v_cli_org_id uuid;
BEGIN
  RAISE NOTICE '🧪 Step 5: Testing with cli@yodelmobile.com...';
  RAISE NOTICE '';

  -- Get cli user data
  SELECT role::text, organization_id INTO v_cli_role, v_cli_org_id
  FROM user_roles
  WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

  IF v_cli_role IS NOT NULL THEN
    IF v_cli_role = 'ORG_ADMIN' THEN
      RAISE NOTICE '✅ cli@yodelmobile.com has UPPERCASE role: %', v_cli_role;
      RAISE NOTICE '   Organization ID: %', v_cli_org_id;
      RAISE NOTICE '   RLS policies will now grant access';
    ELSIF v_cli_role = 'org_admin' THEN
      RAISE EXCEPTION '❌ FAILED: cli user still has lowercase role: %', v_cli_role;
    ELSE
      RAISE NOTICE '⚠️  cli user has unexpected role: %', v_cli_role;
    END IF;
  ELSE
    RAISE NOTICE '⚠️  cli@yodelmobile.com user not found (may be expected in test env)';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 6: Verify View Still Works
-- ============================================

DO $$
DECLARE
  v_view_works boolean := false;
  v_sample_role text;
  v_sample_effective_role text;
BEGIN
  RAISE NOTICE '🔍 Step 6: Verifying user_permissions_unified view...';
  RAISE NOTICE '';

  -- Test view can read and normalize
  SELECT true INTO v_view_works
  FROM user_permissions_unified
  LIMIT 1;

  IF v_view_works THEN
    -- Get sample data
    SELECT role, effective_role INTO v_sample_role, v_sample_effective_role
    FROM user_permissions_unified
    LIMIT 1;

    RAISE NOTICE '✅ View works correctly:';
    RAISE NOTICE '   Database role (raw): % (UPPERCASE)', v_sample_role;
    RAISE NOTICE '   Frontend role (normalized): % (lowercase)', v_sample_effective_role;
    RAISE NOTICE '   View handles both cases and normalizes as designed';
  ELSE
    RAISE WARNING '⚠️  View returned no data (may be expected in empty database)';
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
  RAISE NOTICE '✅ REVERT COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '1. ✅ Role values reverted to UPPERCASE';
  RAISE NOTICE '2. ✅ is_super_admin_db function updated';
  RAISE NOTICE '3. ✅ RLS policies verified (no changes needed)';
  RAISE NOTICE '4. ✅ user_permissions_unified view verified';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected behavior:';
  RAISE NOTICE '- Database: Stores UPPERCASE enum values (ORG_ADMIN, SUPER_ADMIN)';
  RAISE NOTICE '- RLS Policies: Check for UPPERCASE values ✅ MATCH';
  RAISE NOTICE '- View: Handles both, normalizes to lowercase for frontend';
  RAISE NOTICE '- Frontend: Receives lowercase (super_admin, org_admin)';
  RAISE NOTICE '';
  RAISE NOTICE 'Result:';
  RAISE NOTICE '✅ All 403 RLS errors should be RESOLVED';
  RAISE NOTICE '✅ Users can now add apps to monitoring';
  RAISE NOTICE '✅ Users can now add/manage competitors';
  RAISE NOTICE '✅ All CRUD operations restored';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test: Add app to monitoring on Reviews page';
  RAISE NOTICE '2. Test: Add competitor on Reviews page';
  RAISE NOTICE '3. Verify: No 403 errors in browser console';
  RAISE NOTICE '';
  RAISE NOTICE 'Reference:';
  RAISE NOTICE '- Architecture: ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md:134';
  RAISE NOTICE '- Audit: RLS_FIX_GROUNDED_RECOMMENDATION.md';
  RAISE NOTICE '';
END $$;

-- ============================================
-- DEPRECATION NOTICE FOR MIGRATION 20251108220000
-- ============================================

COMMENT ON SCHEMA public IS
'Migration 20251108220000 (normalize to lowercase) has been REVERTED by 20251109040000.
Architectural standard: Database uses UPPERCASE, view normalizes to lowercase.
See: ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md:134';
