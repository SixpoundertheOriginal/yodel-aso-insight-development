-- ============================================
-- GRANT FULL ACCESS: Yodel Mobile
-- Date: November 9, 2025
-- Purpose: Grant full app access to Yodel Mobile organization
-- ============================================

-- ============================================
-- BACKGROUND
-- ============================================
-- Migration 20251108300000 set Yodel Mobile to 'reporting_only' as a safe default.
-- After testing and validation, user confirmed they want full app access.
--
-- ARCHITECTURE:
-- - access_level controls which routes appear in navigation
-- - organization_features controls which features are enabled within pages
-- - RLS policies control which data users can access
-- - All three systems are independent
--
-- IMPACT:
-- - User will see ~40 routes instead of 6
-- - Navigation menu will show all sections
-- - Feature flags still control functionality within pages
-- - RLS policies unchanged (data access maintained)
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔓 GRANTING FULL ACCESS TO YODEL MOBILE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Organization: Yodel Mobile';
  RAISE NOTICE 'Change: access_level = ''reporting_only'' → ''full''';
  RAISE NOTICE 'Impact: Routes increase from 6 to ~40';
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 1: Verify Current State
-- ============================================

DO $$
DECLARE
  v_current_access_level TEXT;
  v_org_name TEXT;
BEGIN
  RAISE NOTICE '📝 Step 1: Verifying current state...';
  RAISE NOTICE '';

  -- Get current access level
  SELECT access_level, name INTO v_current_access_level, v_org_name
  FROM organizations
  WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  IF v_current_access_level IS NULL THEN
    RAISE EXCEPTION '❌ Organization not found: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  END IF;

  RAISE NOTICE '✅ Current state:';
  RAISE NOTICE '   Organization: %', v_org_name;
  RAISE NOTICE '   access_level: %', v_current_access_level;
  RAISE NOTICE '';

  IF v_current_access_level = 'full' THEN
    RAISE NOTICE '⚠️  Already set to ''full'' - no change needed';
  ELSIF v_current_access_level = 'reporting_only' THEN
    RAISE NOTICE '✅ Ready to update from ''reporting_only'' to ''full''';
  ELSE
    RAISE WARNING '⚠️  Unexpected access_level: %', v_current_access_level;
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 2: Update Access Level
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Step 2: Updating access level...';
  RAISE NOTICE '';
END $$;

UPDATE organizations
SET access_level = 'full'
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 1 THEN
    RAISE NOTICE '✅ Successfully updated 1 organization';
  ELSIF v_updated_count = 0 THEN
    RAISE WARNING '⚠️  No rows updated (may already be ''full'')';
  ELSE
    RAISE EXCEPTION '❌ Unexpected: Updated % rows (expected 1)', v_updated_count;
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 3: Verify Update
-- ============================================

DO $$
DECLARE
  v_new_access_level TEXT;
  v_org_name TEXT;
  v_subscription_tier TEXT;
BEGIN
  RAISE NOTICE '🔍 Step 3: Verifying update...';
  RAISE NOTICE '';

  -- Get new state
  SELECT access_level, name, subscription_tier
  INTO v_new_access_level, v_org_name, v_subscription_tier
  FROM organizations
  WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  RAISE NOTICE '✅ Updated state:';
  RAISE NOTICE '   Organization: %', v_org_name;
  RAISE NOTICE '   Subscription: %', v_subscription_tier;
  RAISE NOTICE '   access_level: %', v_new_access_level;
  RAISE NOTICE '';

  IF v_new_access_level = 'full' THEN
    RAISE NOTICE '✅ VALIDATION PASSED: access_level = ''full''';
  ELSE
    RAISE EXCEPTION '❌ VALIDATION FAILED: access_level should be ''full'', got: %', v_new_access_level;
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 4: Show Access Level Distribution
-- ============================================

DO $$
DECLARE
  v_total_orgs INTEGER;
  v_full_access INTEGER;
  v_reporting_only INTEGER;
  v_custom_access INTEGER;
BEGIN
  RAISE NOTICE '📊 Step 4: Access level distribution...';
  RAISE NOTICE '';

  -- Count organizations by access level
  SELECT COUNT(*) INTO v_total_orgs FROM organizations;

  SELECT COUNT(*) INTO v_full_access
  FROM organizations WHERE access_level = 'full';

  SELECT COUNT(*) INTO v_reporting_only
  FROM organizations WHERE access_level = 'reporting_only';

  SELECT COUNT(*) INTO v_custom_access
  FROM organizations WHERE access_level = 'custom';

  RAISE NOTICE '📈 Organization Access Levels:';
  RAISE NOTICE '   Total: %', v_total_orgs;
  RAISE NOTICE '   Full access: %', v_full_access;
  RAISE NOTICE '   Reporting only: %', v_reporting_only;
  RAISE NOTICE '   Custom: %', v_custom_access;
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 5: List Organizations by Access Level
-- ============================================

SELECT
  name,
  slug,
  access_level,
  subscription_tier,
  created_at
FROM organizations
ORDER BY
  CASE access_level
    WHEN 'reporting_only' THEN 1
    WHEN 'custom' THEN 2
    WHEN 'full' THEN 3
  END,
  name;

-- ============================================
-- SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ UPDATE COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '1. ✅ Yodel Mobile access_level = ''full''';
  RAISE NOTICE '2. ✅ Validation passed';
  RAISE NOTICE '3. ✅ Database state verified';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected frontend behavior:';
  RAISE NOTICE '- Routes: 6 → ~40';
  RAISE NOTICE '- Navigation menu: Expands to show all sections';
  RAISE NOTICE '- Console log: routes=~40, items=Analytics:6 AI:10 Control:5';
  RAISE NOTICE '';
  RAISE NOTICE 'What did NOT change:';
  RAISE NOTICE '- ✅ RLS policies (unchanged)';
  RAISE NOTICE '- ✅ Feature flags (organization_features table)';
  RAISE NOTICE '- ✅ Data access permissions';
  RAISE NOTICE '- ✅ Role-based permissions';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh browser (React Query will refetch)';
  RAISE NOTICE '2. Check console: routes should increase from 6 to ~40';
  RAISE NOTICE '3. Verify navigation menu shows all sections';
  RAISE NOTICE '4. Test accessing previously restricted pages';
  RAISE NOTICE '';
  RAISE NOTICE 'Rollback (if needed):';
  RAISE NOTICE '  UPDATE organizations SET access_level = ''reporting_only''';
  RAISE NOTICE '  WHERE id = ''7cccba3f-0a8f-446f-9dba-86e9cb68c92b'';';
  RAISE NOTICE '';
  RAISE NOTICE 'Documentation:';
  RAISE NOTICE '- ACCESS_LEVEL_ARCHITECTURE_DEEP_DIVE.md';
  RAISE NOTICE '- SYSTEM_AUDIT_CONSOLE_ANALYSIS_2025_11_09.md';
  RAISE NOTICE '';
END $$;

-- ============================================
-- UPDATE COMMENT
-- ============================================

COMMENT ON COLUMN organizations.access_level IS
  'Controls route access level for organization users:
  - "full": Access to all routes (default for most orgs)
  - "reporting_only": Limited to dashboard and analytics pages only (6 routes)
  - "custom": Reserved for future use with organization_allowed_routes table

  Updated: 2025-11-09 - Yodel Mobile granted full access per user request';
