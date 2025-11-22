-- Migration: Add validation state tracking to monitored_apps
-- Author: Claude Code
-- Date: 2025-01-23
-- Purpose: Track consistency state of monitored apps to enable auto-healing
--
-- This enables the enterprise-grade consistency system that prevents
-- "No metadata cache available" errors from ever reaching users.

BEGIN;

-- ============================================================================
-- Step 1: Create ENUM type for validation state
-- ============================================================================
CREATE TYPE monitored_app_validated_state AS ENUM (
  'valid',      -- Cache and snapshot exist, data is fresh
  'stale',      -- Cache exists but is old (>24h)
  'invalid',    -- Missing cache or snapshot
  'unknown'     -- Not yet validated (default for new entries)
);

-- ============================================================================
-- Step 2: Add validation columns to monitored_apps
-- ============================================================================
ALTER TABLE public.monitored_apps
  ADD COLUMN validated_state monitored_app_validated_state DEFAULT 'unknown' NOT NULL,
  ADD COLUMN validated_at timestamptz NULL,
  ADD COLUMN validation_error text NULL;

-- ============================================================================
-- Step 3: Add index for efficient querying of invalid states
-- ============================================================================
CREATE INDEX idx_monitored_apps_validation_state
  ON public.monitored_apps(organization_id, validated_state)
  WHERE validated_state IN ('invalid', 'stale', 'unknown');

-- ============================================================================
-- Step 4: Add index for scheduled validation job
-- ============================================================================
CREATE INDEX idx_monitored_apps_needs_validation
  ON public.monitored_apps(validated_at)
  WHERE validated_state != 'valid' OR validated_at IS NULL;

-- ============================================================================
-- Step 5: Backfill existing rows
-- ============================================================================
-- Mark all existing monitored apps as 'unknown' to trigger validation
UPDATE public.monitored_apps
SET validated_state = 'unknown',
    validated_at = NULL
WHERE validated_state = 'unknown'; -- Already the default, but explicit

-- ============================================================================
-- Step 6: Add comment for documentation
-- ============================================================================
COMMENT ON COLUMN public.monitored_apps.validated_state IS
'Consistency state: valid (has cache+snapshot), stale (cache >24h old), invalid (missing cache/snapshot), unknown (not validated)';

COMMENT ON COLUMN public.monitored_apps.validated_at IS
'Timestamp of last validation check. NULL means never validated.';

COMMENT ON COLUMN public.monitored_apps.validation_error IS
'Error message from last validation failure, if any. NULL on success.';

COMMIT;

-- ============================================================================
-- Verification Queries (run manually if needed)
-- ============================================================================
-- SELECT validated_state, COUNT(*) FROM monitored_apps GROUP BY validated_state;
-- SELECT * FROM monitored_apps WHERE validated_state = 'unknown' LIMIT 5;
