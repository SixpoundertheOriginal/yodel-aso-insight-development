-- =====================================================================
-- Migration: Schema Reconciliation for Monitored Apps System
-- Purpose: Align migration files with actual production schema
-- Type: IDEMPOTENT - Safe to run multiple times
-- Date: 2026-01-22
-- =====================================================================

-- ============================================================================
-- PART 1: Ensure monitored_apps has correct schema
-- ============================================================================

-- Step 1: Add app_id if it doesn't exist (production already has it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monitored_apps'
      AND column_name = 'app_id'
  ) THEN
    ALTER TABLE public.monitored_apps ADD COLUMN app_id TEXT;
  END IF;
END $$;

-- Step 2: If app_store_id exists, backfill app_id from it, then drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monitored_apps'
      AND column_name = 'app_store_id'
  ) THEN
    -- Backfill
    UPDATE public.monitored_apps SET app_id = app_store_id WHERE app_id IS NULL;
    -- Drop old column
    ALTER TABLE public.monitored_apps DROP COLUMN app_store_id;
  END IF;
END $$;

-- Step 3: Ensure app_id is NOT NULL
ALTER TABLE public.monitored_apps ALTER COLUMN app_id SET NOT NULL;

-- Step 4: Ensure platform column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monitored_apps'
      AND column_name = 'platform'
  ) THEN
    ALTER TABLE public.monitored_apps ADD COLUMN platform TEXT NOT NULL DEFAULT 'ios';
  END IF;
END $$;

-- Step 5: Drop old unique constraint if it exists
ALTER TABLE public.monitored_apps
  DROP CONSTRAINT IF EXISTS monitored_apps_organization_id_app_store_id_primary_country_key;

-- Step 6: Add new composite unique constraint (CRITICAL FOR DATA INTEGRITY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monitored_apps_org_app_platform_unique'
      AND conrelid = 'public.monitored_apps'::regclass
  ) THEN
    -- Before adding constraint, remove any duplicates
    DELETE FROM public.monitored_apps a USING (
      SELECT MIN(id) as id, organization_id, app_id, platform
      FROM public.monitored_apps
      GROUP BY organization_id, app_id, platform
      HAVING COUNT(*) > 1
    ) b
    WHERE a.organization_id = b.organization_id
      AND a.app_id = b.app_id
      AND a.platform = b.platform
      AND a.id != b.id;

    -- Add unique constraint
    ALTER TABLE public.monitored_apps
      ADD CONSTRAINT monitored_apps_org_app_platform_unique
        UNIQUE(organization_id, app_id, platform);
  END IF;
END $$;

-- ============================================================================
-- PART 2: Add Foreign Keys with CASCADE for Data Integrity
-- ============================================================================

-- Foreign Key: app_metadata_cache → organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_metadata_cache_organization_id_fkey'
      AND conrelid = 'public.app_metadata_cache'::regclass
  ) THEN
    ALTER TABLE public.app_metadata_cache
      ADD CONSTRAINT app_metadata_cache_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES public.organizations(id)
        ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign Key: audit_snapshots → organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_snapshots_organization_id_fkey'
      AND conrelid = 'public.audit_snapshots'::regclass
  ) THEN
    ALTER TABLE public.audit_snapshots
      ADD CONSTRAINT audit_snapshots_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES public.organizations(id)
        ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- PART 3: Add Performance Indexes for Scalability (10K apps/org target)
-- ============================================================================

-- Index: monitored_apps lookup by app_id
CREATE INDEX IF NOT EXISTS idx_monitored_apps_app_id_org
  ON public.monitored_apps(app_id, organization_id);

-- Index: monitored_apps filter by platform
CREATE INDEX IF NOT EXISTS idx_monitored_apps_platform_org
  ON public.monitored_apps(platform, organization_id)
  WHERE audit_enabled = true;

-- Index: app_metadata_cache lookup (composite key)
CREATE INDEX IF NOT EXISTS idx_metadata_cache_composite
  ON public.app_metadata_cache(organization_id, app_id, platform, locale);

-- Index: app_metadata_cache version hash for change detection
CREATE INDEX IF NOT EXISTS idx_metadata_cache_version_hash
  ON public.app_metadata_cache(version_hash);

-- Index: audit_snapshots for historical queries
CREATE INDEX IF NOT EXISTS idx_audit_snapshots_composite
  ON public.audit_snapshots(organization_id, app_id, platform, created_at DESC);

-- Index: audit_snapshots metadata source filter
CREATE INDEX IF NOT EXISTS idx_audit_snapshots_source
  ON public.audit_snapshots(metadata_source, created_at DESC)
  WHERE metadata_source = 'live';

-- ============================================================================
-- PART 4: Add Constraints for Data Quality
-- ============================================================================

-- Constraint: platform values
ALTER TABLE public.monitored_apps
  DROP CONSTRAINT IF EXISTS monitored_apps_platform_check;

ALTER TABLE public.monitored_apps
  ADD CONSTRAINT monitored_apps_platform_check
    CHECK (platform IN ('ios', 'android'));

-- Constraint: audit score range
ALTER TABLE public.monitored_apps
  DROP CONSTRAINT IF EXISTS monitored_apps_audit_score_range;

ALTER TABLE public.monitored_apps
  ADD CONSTRAINT monitored_apps_audit_score_range
    CHECK (latest_audit_score IS NULL OR (latest_audit_score >= 0 AND latest_audit_score <= 100));

-- Constraint: app_id not empty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monitored_apps_app_id_not_empty'
      AND conrelid = 'public.monitored_apps'::regclass
  ) THEN
    ALTER TABLE public.monitored_apps
      ADD CONSTRAINT monitored_apps_app_id_not_empty
        CHECK (length(app_id) > 0);
  END IF;
END $$;

-- ============================================================================
-- PART 5: Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN public.monitored_apps.app_id IS
  'Universal app identifier. For iOS: iTunes App ID (e.g., "389801252"). For Android: Package ID (e.g., "com.instagram.android"). This is the PRIMARY identifier used across all tables.';

COMMENT ON COLUMN public.monitored_apps.platform IS
  'App platform: "ios" for Apple App Store, "android" for Google Play Store. Part of composite unique key to allow same app_id on different platforms.';

COMMENT ON CONSTRAINT monitored_apps_org_app_platform_unique ON public.monitored_apps IS
  'CRITICAL: Ensures one monitored_apps entry per (organization, app, platform) tuple. Prevents duplicate monitoring which would break audit integrity.';

-- ============================================================================
-- PART 6: Trigger for updated_at (if missing)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_monitored_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS monitored_apps_updated_at ON public.monitored_apps;

CREATE TRIGGER monitored_apps_updated_at
  BEFORE UPDATE ON public.monitored_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_monitored_apps_updated_at();
