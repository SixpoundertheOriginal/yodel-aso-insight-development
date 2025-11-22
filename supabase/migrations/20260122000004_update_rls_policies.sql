-- =====================================================================
-- Migration: Update RLS Policies for App Monitoring Tables
-- Purpose: Restrict app_metadata_cache and audit_snapshots to INSERT/SELECT only
-- Rationale: These are immutable audit logs - updates should not be allowed
-- =====================================================================

-- ============================================================
-- APP_METADATA_CACHE: Remove UPDATE policy (keep only SELECT/INSERT/DELETE)
-- ============================================================

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update cache for their organization" ON public.app_metadata_cache;

-- Comment: Metadata cache is immutable after creation (for audit integrity)
-- Users can still DELETE and re-INSERT if needed

-- ============================================================
-- AUDIT_SNAPSHOTS: Remove UPDATE policy (keep only SELECT/INSERT/DELETE)
-- ============================================================

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update snapshots for their organization" ON public.audit_snapshots;

-- Comment: Audit snapshots are immutable for historical accuracy
-- Delta analysis requires snapshots to remain unchanged after creation

-- ============================================================
-- MONITORED_APPS: Verify existing RLS policies are correct
-- ============================================================

-- The monitored_apps table should allow SELECT/INSERT/UPDATE/DELETE
-- (already defined in migration 20250106000000_create_monitored_apps.sql)
-- No changes needed - just verification comment

COMMENT ON TABLE public.app_metadata_cache IS
  'Immutable metadata cache. Updates not allowed - use DELETE + INSERT for corrections. Preserves audit integrity and enables reliable change detection via version_hash.';

COMMENT ON TABLE public.audit_snapshots IS
  'Immutable audit snapshots. Updates not allowed after creation. Required for accurate historical comparison and delta analysis.';
