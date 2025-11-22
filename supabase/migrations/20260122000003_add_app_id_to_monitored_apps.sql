-- =====================================================================
-- Migration: Ensure monitored_apps has correct schema
-- Purpose: Add missing columns and constraints for app monitoring
-- Note: Database already has app_id, platform, and audit columns
-- =====================================================================

-- Step 1: Ensure platform column exists with correct constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monitored_apps_platform_check'
  ) THEN
    ALTER TABLE public.monitored_apps
      ADD CONSTRAINT monitored_apps_platform_check
        CHECK (platform IN ('ios', 'android'));
  END IF;
END $$;

-- Step 2: Ensure app_id is NOT NULL (should already be, but verify)
ALTER TABLE public.monitored_apps
  ALTER COLUMN app_id SET NOT NULL;

-- Step 3: Check if old unique constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monitored_apps_organization_id_app_store_id_primary_country_key'
  ) THEN
    ALTER TABLE public.monitored_apps
      DROP CONSTRAINT monitored_apps_organization_id_app_store_id_primary_country_key;
  END IF;
END $$;

-- Step 4: Add new unique constraint if it doesn't exist
-- Prevents duplicate apps per (organization, app_id, platform)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monitored_apps_org_app_platform_unique'
  ) THEN
    ALTER TABLE public.monitored_apps
      ADD CONSTRAINT monitored_apps_org_app_platform_unique
        UNIQUE(organization_id, app_id, platform);
  END IF;
END $$;

-- Step 5: Create performance indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_monitored_apps_app_id
  ON public.monitored_apps(app_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_monitored_apps_platform
  ON public.monitored_apps(platform, organization_id);

-- Comments
COMMENT ON COLUMN public.monitored_apps.app_id IS
  'Universal app identifier (iTunes ID for iOS, package name for Android). Cross-platform consistency.';

COMMENT ON COLUMN public.monitored_apps.platform IS
  'App platform: ios (Apple App Store) or android (Google Play Store). Default: ios.';

COMMENT ON CONSTRAINT monitored_apps_org_app_platform_unique ON public.monitored_apps IS
  'Ensures one monitored_apps entry per (organization, app_id, platform) combination. Same app can be monitored on different platforms.';
