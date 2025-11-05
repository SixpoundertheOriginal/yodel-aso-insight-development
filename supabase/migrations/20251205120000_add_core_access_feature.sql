-- Add app_core_access feature to Yodel Mobile organization
-- This is required for the /authorize endpoint to allow access to the application

INSERT INTO organization_features (organization_id, feature_key, is_enabled)
VALUES ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', 'app_core_access', true)
ON CONFLICT (organization_id, feature_key)
DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Verify the feature was added
SELECT
  o.name as org_name,
  of.feature_key,
  of.is_enabled
FROM organization_features of
JOIN organizations o ON o.id = of.organization_id
WHERE of.organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
  AND of.feature_key = 'app_core_access';
