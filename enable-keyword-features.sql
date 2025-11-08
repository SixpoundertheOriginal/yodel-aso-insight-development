-- Quick fix: Enable keyword tracking features for Yodel Mobile
-- Run this manually in Supabase SQL Editor

INSERT INTO organization_features (organization_id, feature_key, is_enabled)
VALUES
  ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', 'keyword_intelligence', true),
  ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', 'keyword_rank_tracking', true)
ON CONFLICT (organization_id, feature_key)
DO UPDATE SET is_enabled = true;

-- Verify
SELECT feature_key, is_enabled, created_at
FROM organization_features
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
  AND feature_key IN ('keyword_intelligence', 'keyword_rank_tracking');
