-- ============================================================================
-- Migration: Add Platform Support (iOS + Android) to monitored_apps
-- Date: 2025-01-12
-- Purpose: Enable monitoring both Apple App Store and Google Play Store apps
-- ============================================================================

-- Step 1: Add platform column (default 'ios' for backward compatibility)
ALTER TABLE monitored_apps
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'ios'
  CHECK (platform IN ('ios', 'android'));

COMMENT ON COLUMN monitored_apps.platform IS
  'App platform: ios (Apple App Store) or android (Google Play Store)';

-- Step 2: Rename app_store_id to app_id (more generic)
ALTER TABLE monitored_apps
  RENAME COLUMN app_store_id TO app_id;

COMMENT ON COLUMN monitored_apps.app_id IS
  'Platform-agnostic app identifier: iTunes App ID for iOS, Package ID for Android (e.g., com.whatsapp)';

-- Step 3: Add Google Play specific fields
ALTER TABLE monitored_apps
  ADD COLUMN play_store_package_id TEXT,  -- e.g., "com.whatsapp"
  ADD COLUMN play_store_url TEXT;         -- Full Google Play URL

COMMENT ON COLUMN monitored_apps.play_store_package_id IS
  'Android package ID (e.g., com.instagram.android). Only populated for Android apps.';

COMMENT ON COLUMN monitored_apps.play_store_url IS
  'Full Google Play Store URL. Only populated for Android apps.';

-- Step 4: Drop old unique constraint
ALTER TABLE monitored_apps
  DROP CONSTRAINT IF EXISTS monitored_apps_organization_id_app_store_id_primary_country_key;

-- Step 5: Add new unique constraint including platform
ALTER TABLE monitored_apps
  ADD CONSTRAINT unique_monitored_app_per_platform
  UNIQUE(organization_id, app_id, platform, primary_country);

COMMENT ON CONSTRAINT unique_monitored_app_per_platform ON monitored_apps IS
  'Ensures same app cannot be monitored twice for same platform + country (but allows iOS + Android of same app)';

-- Step 6: Add indexes for platform-specific queries
CREATE INDEX idx_monitored_apps_platform
  ON monitored_apps(organization_id, platform);

CREATE INDEX idx_monitored_apps_platform_country
  ON monitored_apps(organization_id, platform, primary_country);

-- Step 7: Backfill existing apps with platform='ios'
-- (Already handled by DEFAULT 'ios' above, but explicit for clarity)
UPDATE monitored_apps
  SET platform = 'ios'
  WHERE platform IS NULL;

-- ============================================================================
-- Validation Queries (Run after migration to verify)
-- ============================================================================
-- SELECT platform, COUNT(*) FROM monitored_apps GROUP BY platform;
-- Should show all existing apps as 'ios'
