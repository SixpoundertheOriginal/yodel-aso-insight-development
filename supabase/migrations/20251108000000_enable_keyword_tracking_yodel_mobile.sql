-- Enable Keyword Tracking Features for Yodel Mobile Organization
-- Migration: 20251108000000_enable_keyword_tracking_yodel_mobile
-- Purpose: Enable keyword intelligence and rank tracking for Yodel Mobile users
-- Yodel Mobile Organization ID: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b

-- ============================================================================
-- ENABLE KEYWORD INTELLIGENCE FEATURE
-- ============================================================================

INSERT INTO organization_features (organization_id, feature_key, is_enabled)
VALUES ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', 'keyword_intelligence', true)
ON CONFLICT (organization_id, feature_key)
DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- ============================================================================
-- ENABLE KEYWORD RANK TRACKING FEATURE
-- ============================================================================

INSERT INTO organization_features (organization_id, feature_key, is_enabled)
VALUES ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', 'keyword_rank_tracking', true)
ON CONFLICT (organization_id, feature_key)
DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  ki_enabled BOOLEAN;
  krt_enabled BOOLEAN;
  total_features INTEGER;
BEGIN
  -- Check keyword_intelligence feature
  SELECT is_enabled INTO ki_enabled
  FROM organization_features
  WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
    AND feature_key = 'keyword_intelligence';

  -- Check keyword_rank_tracking feature
  SELECT is_enabled INTO krt_enabled
  FROM organization_features
  WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
    AND feature_key = 'keyword_rank_tracking';

  -- Count total features
  SELECT COUNT(*) INTO total_features
  FROM organization_features
  WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  -- Report results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Keyword Tracking Features - Verification';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organization: Yodel Mobile';
  RAISE NOTICE 'Organization ID: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  RAISE NOTICE '';

  IF ki_enabled THEN
    RAISE NOTICE '✅ SUCCESS: keyword_intelligence enabled';
  ELSE
    RAISE WARNING '❌ FAILED: keyword_intelligence not enabled';
  END IF;

  IF krt_enabled THEN
    RAISE NOTICE '✅ SUCCESS: keyword_rank_tracking enabled';
  ELSE
    RAISE WARNING '❌ FAILED: keyword_rank_tracking not enabled';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Total features enabled: %', total_features;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- LIST ALL FEATURES FOR YODEL MOBILE
-- ============================================================================

SELECT
  feature_key,
  is_enabled,
  created_at,
  updated_at
FROM organization_features
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
ORDER BY feature_key;
