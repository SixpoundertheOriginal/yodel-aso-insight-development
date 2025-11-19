-- ============================================
-- DISABLE KEYWORD INTELLIGENCE: Yodel Mobile
-- Date: January 19, 2025
-- Purpose: Remove keyword intelligence access for CLI user and all Yodel Mobile organization users
-- ============================================

-- ============================================
-- BACKGROUND
-- ============================================
-- Migration 20251108240000 enabled keyword_intelligence for Yodel Mobile organization.
-- Per user request (January 19, 2025), we need to remove this access from:
-- 1. CLI user (cli@yodelmobile.com)
-- 2. All users in Yodel Mobile organization
--
-- ARCHITECTURE:
-- - organization_features.is_enabled controls feature access at org level
-- - Frontend (AppSidebar.tsx) automatically filters navigation items based on feature flags
-- - Feature-based routing (useFeatureBasedRouting.ts) blocks route access
-- - RLS policies enforce data-level security
--
-- IMPACT:
-- - "Keyword Intelligence" menu item will disappear from sidebar
-- - Route /growth-accelerators/keywords will be blocked
-- - All Yodel Mobile users affected (including CLI user)
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔒 DISABLING KEYWORD INTELLIGENCE FOR YODEL MOBILE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Organization: Yodel Mobile';
  RAISE NOTICE 'Organization ID: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  RAISE NOTICE 'Change: keyword_intelligence is_enabled = true → false';
  RAISE NOTICE 'Affected Users: All users in Yodel Mobile org (including cli@yodelmobile.com)';
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 1: Verify Current State
-- ============================================

DO $$
DECLARE
  v_ki_enabled BOOLEAN;
  v_org_name TEXT;
  v_user_count INTEGER;
BEGIN
  RAISE NOTICE '📝 Step 1: Verifying current state...';
  RAISE NOTICE '';

  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations
  WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  -- Get current keyword_intelligence feature state
  SELECT is_enabled INTO v_ki_enabled
  FROM organization_features
  WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
    AND feature_key = 'keyword_intelligence';

  -- Count affected users
  SELECT COUNT(*) INTO v_user_count
  FROM user_roles
  WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  RAISE NOTICE '✅ Current state:';
  RAISE NOTICE '   Organization: %', v_org_name;
  RAISE NOTICE '   keyword_intelligence enabled: %', COALESCE(v_ki_enabled::TEXT, 'NULL (not set)');
  RAISE NOTICE '   Affected users: %', v_user_count;
  RAISE NOTICE '';

  IF v_ki_enabled = false THEN
    RAISE NOTICE '⚠️  Already disabled - no change needed';
  ELSIF v_ki_enabled = true THEN
    RAISE NOTICE '✅ Ready to disable keyword_intelligence';
  ELSE
    RAISE WARNING '⚠️  Feature not found in organization_features table';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 2: Disable Keyword Intelligence
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Step 2: Disabling keyword_intelligence feature...';
  RAISE NOTICE '';
END $$;

UPDATE organization_features
SET
  is_enabled = false,
  updated_at = NOW()
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
  AND feature_key = 'keyword_intelligence';

DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 1 THEN
    RAISE NOTICE '✅ Successfully disabled keyword_intelligence (1 row updated)';
  ELSIF v_updated_count = 0 THEN
    RAISE WARNING '⚠️  No rows updated (feature may not exist in table)';
    RAISE WARNING '    Creating disabled entry...';

    -- Insert disabled entry if it doesn't exist
    INSERT INTO organization_features (organization_id, feature_key, is_enabled)
    VALUES ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', 'keyword_intelligence', false)
    ON CONFLICT (organization_id, feature_key)
    DO UPDATE SET is_enabled = false, updated_at = NOW();

    RAISE NOTICE '✅ Created disabled entry';
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
  v_ki_enabled BOOLEAN;
  v_updated_at TIMESTAMPTZ;
BEGIN
  RAISE NOTICE '🔍 Step 3: Verifying update...';
  RAISE NOTICE '';

  -- Get new state
  SELECT is_enabled, updated_at
  INTO v_ki_enabled, v_updated_at
  FROM organization_features
  WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
    AND feature_key = 'keyword_intelligence';

  RAISE NOTICE '✅ Updated state:';
  RAISE NOTICE '   keyword_intelligence enabled: %', v_ki_enabled;
  RAISE NOTICE '   updated_at: %', v_updated_at;
  RAISE NOTICE '';

  IF v_ki_enabled = false THEN
    RAISE NOTICE '✅ VALIDATION PASSED: keyword_intelligence is disabled';
  ELSE
    RAISE EXCEPTION '❌ VALIDATION FAILED: is_enabled should be false, got: %', v_ki_enabled;
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 4: List Affected Users
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '👥 Step 4: Listing affected users...';
  RAISE NOTICE '';
END $$;

SELECT
  u.email,
  ur.role,
  ur.created_at as "user_since"
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
ORDER BY ur.created_at;

-- ============================================
-- STEP 5: Show All Features for Yodel Mobile
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Step 5: All features for Yodel Mobile...';
  RAISE NOTICE '';
END $$;

SELECT
  feature_key,
  is_enabled,
  created_at,
  updated_at
FROM organization_features
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
ORDER BY
  CASE
    WHEN is_enabled = true THEN 0
    ELSE 1
  END,
  feature_key;

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
  RAISE NOTICE '1. ✅ keyword_intelligence disabled for Yodel Mobile';
  RAISE NOTICE '2. ✅ Validation passed';
  RAISE NOTICE '3. ✅ Database state verified';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected frontend behavior:';
  RAISE NOTICE '- Sidebar: "Keyword Intelligence" menu item will disappear';
  RAISE NOTICE '- Route: /growth-accelerators/keywords will be blocked';
  RAISE NOTICE '- Affected users: All Yodel Mobile users (including cli@yodelmobile.com)';
  RAISE NOTICE '';
  RAISE NOTICE 'Technical details:';
  RAISE NOTICE '- Feature filtering: AppSidebar.tsx lines 307-310';
  RAISE NOTICE '- Route blocking: useFeatureBasedRouting.ts line 16';
  RAISE NOTICE '- Database table: organization_features';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh browser (React Query will refetch features)';
  RAISE NOTICE '2. Verify "Keyword Intelligence" is gone from sidebar';
  RAISE NOTICE '3. Test accessing /growth-accelerators/keywords (should redirect)';
  RAISE NOTICE '';
  RAISE NOTICE 'Rollback (if needed):';
  RAISE NOTICE '  UPDATE organization_features SET is_enabled = true';
  RAISE NOTICE '  WHERE organization_id = ''7cccba3f-0a8f-446f-9dba-86e9cb68c92b''';
  RAISE NOTICE '    AND feature_key = ''keyword_intelligence'';';
  RAISE NOTICE '';
  RAISE NOTICE 'Related migrations:';
  RAISE NOTICE '- 20251108240000_enable_keyword_tracking_yodel_mobile.sql (enabled it)';
  RAISE NOTICE '- 20250119000000_disable_keyword_intelligence_yodel_mobile.sql (this migration)';
  RAISE NOTICE '';
END $$;

-- ============================================
-- UPDATE COMMENT
-- ============================================

COMMENT ON COLUMN organization_features.is_enabled IS
  'Controls feature access at organization level:
  - true: Feature enabled for all org users
  - false: Feature disabled for all org users

  Updated: 2025-01-19 - keyword_intelligence disabled for Yodel Mobile per user request';
