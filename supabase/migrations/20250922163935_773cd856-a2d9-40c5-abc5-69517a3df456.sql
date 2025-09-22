-- Drop legacy feature permission tables
-- These have been replaced by the unified system:
-- platform_features, org_feature_entitlements, user_feature_overrides

-- Drop dependent objects first
DROP TABLE IF EXISTS org_feature_access CASCADE;
DROP TABLE IF EXISTS ui_permissions CASCADE;

-- Drop any remaining sequences or functions that might reference these tables
DROP FUNCTION IF EXISTS get_user_ui_permissions(uuid);

-- Clean up any remaining references
COMMENT ON SCHEMA public IS 'Legacy feature permission tables removed - now using unified system';