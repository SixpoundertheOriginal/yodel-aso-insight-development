-- =====================================================================
-- Migration: Add _metadata_source column to app_metadata_cache
-- Purpose: Fix PGRST204 error in save-monitored-app edge function
--
-- Root Cause:
--   The save-monitored-app edge function writes a '_metadata_source' field
--   to track whether metadata came from 'ui', 'server', or 'cache'.
--   This column was never added to the app_metadata_cache schema,
--   causing cache upsert to fail with PGRST204 error.
--
-- Impact:
--   - Prevents monitored apps from saving subtitle and metadata
--   - Blocks Bible audit generation (depends on cached metadata)
--   - Results in "No audit yet" display in monitored apps widget
--
-- Fix:
--   Add _metadata_source column as nullable TEXT with default NULL
--   for backwards compatibility with existing rows.
--
-- Deployment: Safe for dev/staging/prod (additive, no data loss)
-- =====================================================================

-- Add _metadata_source column for telemetry/debugging
ALTER TABLE public.app_metadata_cache
ADD COLUMN IF NOT EXISTS _metadata_source TEXT DEFAULT NULL;

-- Index for debugging queries (optional, but helpful for support)
CREATE INDEX IF NOT EXISTS idx_metadata_cache_source
  ON public.app_metadata_cache(_metadata_source)
  WHERE _metadata_source IS NOT NULL;

-- Add constraint to ensure only valid values
ALTER TABLE public.app_metadata_cache
ADD CONSTRAINT app_metadata_cache_source_check
  CHECK (_metadata_source IS NULL OR _metadata_source IN ('ui', 'server', 'cache'));

-- Update comment to document the new field
COMMENT ON COLUMN public.app_metadata_cache._metadata_source IS
  'Source of the metadata: "ui" (client-provided), "server" (edge function fetch), or "cache" (existing cache reused). Used for telemetry and debugging cache behavior.';

-- =====================================================================
-- Verification Query (run after migration)
-- =====================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'app_metadata_cache'
-- AND column_name = '_metadata_source';
--
-- Expected result:
-- column_name      | data_type | is_nullable
-- _metadata_source | text      | YES
-- =====================================================================
