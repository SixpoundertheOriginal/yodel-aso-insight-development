-- Add reviews_public_rss_enabled feature to Yodel Mobile organization
-- Migration: 20251205140000_add_reviews_feature_yodel_mobile
-- Purpose: Enable reviews page access for all Yodel Mobile users

-- Insert reviews feature for Yodel Mobile organization
INSERT INTO organization_features (organization_id, feature_key, is_enabled)
VALUES ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', 'reviews_public_rss_enabled', true)
ON CONFLICT (organization_id, feature_key)
DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Verification: Check all features for Yodel Mobile
DO $$
DECLARE
  feature_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO feature_count
  FROM organization_features
  WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  RAISE NOTICE 'Total features for Yodel Mobile: %', feature_count;

  -- Check if reviews feature exists
  IF EXISTS (
    SELECT 1 FROM organization_features
    WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
      AND feature_key = 'reviews_public_rss_enabled'
      AND is_enabled = true
  ) THEN
    RAISE NOTICE '✅ SUCCESS: reviews_public_rss_enabled feature enabled for Yodel Mobile';
  ELSE
    RAISE WARNING '❌ FAILED: reviews_public_rss_enabled feature not found or not enabled';
  END IF;
END $$;

-- List all features for Yodel Mobile
SELECT
  feature_key,
  is_enabled,
  created_at
FROM organization_features
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
ORDER BY feature_key;
