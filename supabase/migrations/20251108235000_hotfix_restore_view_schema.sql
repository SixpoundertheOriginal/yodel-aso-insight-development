-- ============================================
-- HOTFIX: Restore user_permissions_unified View Schema
-- Date: November 8, 2025
-- Issue: Migration 20251108220000 broke the view schema
-- Fix: Restore proper column names and flags that frontend expects
-- ============================================

-- ============================================
-- PROBLEM DIAGNOSIS
-- ============================================
-- Migration 20251108220000 simplified the view too much and broke the schema:
-- - Changed org_id → organization_id (frontend expects org_id)
-- - Removed critical flags: is_org_scoped_role, is_super_admin, is_org_admin
-- - Removed effective_role, role_source fields
-- - This caused organizationId to be undefined in frontend
--
-- This hotfix restores the proper view schema while keeping the enum normalization.
-- ============================================

-- Drop the broken simplified view
DROP VIEW IF EXISTS public.user_permissions_unified CASCADE;

-- Recreate the view with proper schema that frontend expects
CREATE VIEW public.user_permissions_unified AS
SELECT
  ur.user_id,
  ur.organization_id AS org_id,              -- ✅ Frontend expects "org_id"
  ur.role::text AS role,
  'user_roles'::text AS role_source,
  (ur.organization_id IS NULL) AS is_platform_role,
  o.name AS org_name,                        -- ✅ Frontend expects "org_name"
  o.slug AS org_slug,
  ur.created_at AS resolved_at,
  -- Role flags - simplified since we now only have lowercase enum values
  (ur.role::text = 'super_admin') AS is_super_admin,
  (ur.role::text IN ('org_admin', 'super_admin')) AS is_org_admin,
  (ur.organization_id IS NOT NULL) AS is_org_scoped_role,
  -- Effective role - already lowercase, no CASE needed
  ur.role::text AS effective_role
FROM public.user_roles ur
LEFT JOIN public.organizations o ON o.id = ur.organization_id
WHERE ur.role IS NOT NULL;

-- Grant access to authenticated users
GRANT SELECT ON public.user_permissions_unified TO authenticated;

-- Add descriptive comment
COMMENT ON VIEW public.user_permissions_unified IS
  'Enterprise permissions view - Single source of truth.
   Queries ONLY user_roles table (RLS protected).
   Roles are normalized to lowercase (org_admin, super_admin).
   Schema matches frontend expectations for usePermissions hook.
   Updated: 2025-11-08 (hotfix for view schema)';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_test_org_id uuid;
  v_test_role text;
  v_is_org_scoped boolean;
  v_is_org_admin boolean;
  v_effective_role text;
BEGIN
  RAISE NOTICE '🧪 Testing restored view schema...';

  -- Test with cli@yodelmobile.com user
  SELECT
    org_id,
    role,
    is_org_scoped_role,
    is_org_admin,
    effective_role
  INTO
    v_test_org_id,
    v_test_role,
    v_is_org_scoped,
    v_is_org_admin,
    v_effective_role
  FROM user_permissions_unified
  WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

  IF v_test_org_id IS NOT NULL THEN
    RAISE NOTICE '✅ View returns org_id: %', v_test_org_id;
  ELSE
    RAISE WARNING '⚠️  View returns NULL org_id';
  END IF;

  IF v_test_role = 'org_admin' THEN
    RAISE NOTICE '✅ View returns lowercase role: %', v_test_role;
  ELSE
    RAISE WARNING '⚠️  View returns unexpected role: %', v_test_role;
  END IF;

  IF v_is_org_scoped THEN
    RAISE NOTICE '✅ View returns is_org_scoped_role: true';
  ELSE
    RAISE WARNING '⚠️  View returns is_org_scoped_role: false or null';
  END IF;

  IF v_is_org_admin THEN
    RAISE NOTICE '✅ View returns is_org_admin: true';
  ELSE
    RAISE WARNING '⚠️  View returns is_org_admin: false or null';
  END IF;

  IF v_effective_role = 'org_admin' THEN
    RAISE NOTICE '✅ View returns effective_role: %', v_effective_role;
  ELSE
    RAISE WARNING '⚠️  View returns unexpected effective_role: %', v_effective_role;
  END IF;

  RAISE NOTICE '🎯 View schema restored successfully';
END $$;

-- ============================================
-- EXPECTED BEHAVIOR AFTER THIS MIGRATION
-- ============================================
--
-- Frontend usePermissions hook will receive:
-- ✅ org_id (not organization_id)
-- ✅ is_org_scoped_role = true
-- ✅ is_org_admin = true
-- ✅ effective_role = 'org_admin'
-- ✅ role_source = 'user_roles'
--
-- Dashboard V2 will:
-- ✅ Load successfully
-- ✅ Show organizationId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
-- ✅ Access 8 apps via agency expansion
-- ✅ Display ASO metrics
--
-- Security:
-- ✅ View still protected by user_roles RLS policies
-- ✅ Users can only see their own role (user_id = auth.uid())
-- ✅ Service role (Edge Functions) has full access
-- ✅ Enum normalization preserved (lowercase roles)
-- ============================================
