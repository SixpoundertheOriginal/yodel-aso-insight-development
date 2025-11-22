-- Migration: Cleanup stale monitored apps
-- Author: Claude Code
-- Date: 2025-01-23
-- Purpose: Remove monitored apps that were never properly initialized
--
-- Safety: Only deletes rows that:
-- 1. Have NO metadata cache
-- 2. Have NO audit snapshots
-- 3. Were created more than 24 hours ago
-- 4. Have validated_state = 'invalid' OR 'unknown'
--
-- This prevents accumulation of broken entries from failed monitoring attempts.

BEGIN;

-- ============================================================================
-- Step 1: Identify stale monitored apps to delete
-- ============================================================================
CREATE TEMP TABLE stale_monitored_apps AS
SELECT ma.id, ma.app_id, ma.app_name, ma.created_at, ma.validated_state
FROM public.monitored_apps ma
WHERE
  -- Must be old enough (>24 hours)
  ma.created_at < (NOW() - INTERVAL '24 hours')
  -- Must have invalid or unknown state
  AND ma.validated_state IN ('invalid', 'unknown')
  -- Must have no metadata cache
  AND NOT EXISTS (
    SELECT 1
    FROM public.app_metadata_cache amc
    WHERE amc.organization_id = ma.organization_id
      AND amc.app_id = ma.app_id
      AND amc.platform = ma.platform
      AND amc.locale = COALESCE(ma.locale, 'us')
  )
  -- Must have no audit snapshots
  AND NOT EXISTS (
    SELECT 1
    FROM public.audit_snapshots asn
    WHERE asn.organization_id = ma.organization_id
      AND asn.app_id = ma.app_id
      AND asn.platform = ma.platform
  );

-- ============================================================================
-- Step 2: Log what will be deleted
-- ============================================================================
DO $$
DECLARE
  stale_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO stale_count FROM stale_monitored_apps;
  RAISE NOTICE 'Found % stale monitored apps to delete', stale_count;

  -- Log sample of apps being deleted (up to 10)
  FOR record IN (
    SELECT app_id, app_name, created_at, validated_state
    FROM stale_monitored_apps
    ORDER BY created_at DESC
    LIMIT 10
  ) LOOP
    RAISE NOTICE '  - App: % (ID: %), created: %, state: %',
      record.app_name,
      record.app_id,
      record.created_at,
      record.validated_state;
  END LOOP;
END $$;

-- ============================================================================
-- Step 3: Delete stale monitored apps
-- ============================================================================
DELETE FROM public.monitored_apps
WHERE id IN (SELECT id FROM stale_monitored_apps);

-- ============================================================================
-- Step 4: Report results
-- ============================================================================
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % stale monitored apps', deleted_count;
END $$;

-- ============================================================================
-- Step 5: Clean up temp table
-- ============================================================================
DROP TABLE stale_monitored_apps;

COMMIT;

-- ============================================================================
-- Verification Queries (run manually if needed)
-- ============================================================================
-- Check for remaining invalid/unknown apps
-- SELECT validated_state, COUNT(*)
-- FROM monitored_apps
-- WHERE validated_state IN ('invalid', 'unknown')
-- GROUP BY validated_state;

-- Check for apps without cache (should trigger rebuild on next access)
-- SELECT ma.app_name, ma.validated_state, ma.created_at
-- FROM monitored_apps ma
-- LEFT JOIN app_metadata_cache amc
--   ON amc.organization_id = ma.organization_id
--   AND amc.app_id = ma.app_id
--   AND amc.platform = ma.platform
--   AND amc.locale = COALESCE(ma.locale, 'us')
-- WHERE amc.id IS NULL
-- ORDER BY ma.created_at DESC
-- LIMIT 20;
