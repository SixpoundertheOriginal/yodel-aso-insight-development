-- Migration: Backfill NULL locales in monitored_apps and related tables
-- Author: Claude Code
-- Date: 2025-01-23
-- Purpose: Fix composite key cache misses due to inconsistent locale normalization
--
-- Root Cause:
-- - Write paths used locale='us' as default
-- - Read paths used locale=NULL from database
-- - Result: Cache written with locale='us', lookup with locale=NULL → CACHE MISS
--
-- This migration ensures all existing NULL locales are backfilled to 'us'
-- to match the normalized key behavior in the codebase.

BEGIN;

-- ============================================================================
-- Step 1: Backfill monitored_apps.locale (NULL → 'us')
-- ============================================================================
UPDATE public.monitored_apps
SET locale = 'us'
WHERE locale IS NULL;

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % rows in monitored_apps', updated_count;
END $$;

-- ============================================================================
-- Step 2: Backfill app_metadata_cache.locale (NULL → 'us')
-- ============================================================================
UPDATE public.app_metadata_cache
SET locale = 'us'
WHERE locale IS NULL;

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % rows in app_metadata_cache', updated_count;
END $$;

-- ============================================================================
-- Step 3: Backfill audit_snapshots.locale (NULL → 'us')
-- ============================================================================
UPDATE public.audit_snapshots
SET locale = 'us'
WHERE locale IS NULL;

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % rows in audit_snapshots', updated_count;
END $$;

-- ============================================================================
-- Step 4: Add NOT NULL constraint to prevent future NULL values
-- ============================================================================
-- monitored_apps
ALTER TABLE public.monitored_apps
  ALTER COLUMN locale SET DEFAULT 'us',
  ALTER COLUMN locale SET NOT NULL;

-- app_metadata_cache
ALTER TABLE public.app_metadata_cache
  ALTER COLUMN locale SET DEFAULT 'us',
  ALTER COLUMN locale SET NOT NULL;

-- audit_snapshots
ALTER TABLE public.audit_snapshots
  ALTER COLUMN locale SET DEFAULT 'us',
  ALTER COLUMN locale SET NOT NULL;

COMMIT;

-- ============================================================================
-- Verification Queries (run manually if needed)
-- ============================================================================
-- SELECT COUNT(*) AS null_locales FROM monitored_apps WHERE locale IS NULL;
-- SELECT COUNT(*) AS null_locales FROM app_metadata_cache WHERE locale IS NULL;
-- SELECT COUNT(*) AS null_locales FROM audit_snapshots WHERE locale IS NULL;
