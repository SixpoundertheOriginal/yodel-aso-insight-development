-- =====================================================================
-- Migration: Add Performance Indexes for Monitored App Caching Pipeline
-- Purpose: Optimize queries for monitored app workflow
-- Features:
--   - Composite index for metadata cache lookups
--   - Index for audit snapshot queries by monitored app
--   - Partial index for stale cache detection
--   - Index for monitored app lookup by app_id + platform
-- =====================================================================

-- ========================================================================
-- app_metadata_cache indexes
-- ========================================================================

-- Composite index for monitoring workflow lookups (org + app + platform + locale)
-- This optimizes useMonitoredAudit queries that fetch cache by these fields
CREATE INDEX IF NOT EXISTS idx_metadata_cache_org_app_platform_locale
  ON public.app_metadata_cache(organization_id, app_id, platform, locale);

-- Partial index for stale cache detection (> 24 hours old)
-- Used by edge function to detect when cache needs refresh
CREATE INDEX IF NOT EXISTS idx_metadata_cache_stale
  ON public.app_metadata_cache(organization_id, fetched_at)
  WHERE (EXTRACT(EPOCH FROM (now() - fetched_at)) > 86400);

-- Index for version hash lookups (change detection)
-- Used for comparing current vs cached metadata versions
CREATE INDEX IF NOT EXISTS idx_metadata_cache_version_hash_lookup
  ON public.app_metadata_cache(organization_id, app_id, version_hash);

-- ========================================================================
-- audit_snapshots indexes
-- ========================================================================

-- Composite index for audit snapshot queries by monitored app (org + app + platform + created_at DESC)
-- This optimizes queries that fetch latest audit for a specific app
CREATE INDEX IF NOT EXISTS idx_audit_snapshots_org_app_platform_latest
  ON public.audit_snapshots(organization_id, app_id, platform, created_at DESC);

-- Index for version hash queries (linking snapshots to cache)
-- Used to find all audit snapshots for a specific metadata version
CREATE INDEX IF NOT EXISTS idx_audit_snapshots_metadata_version
  ON public.audit_snapshots(organization_id, metadata_version_hash, created_at DESC);

-- Partial index for high-quality UI audits (v2 = frontend audit)
-- Used for filtering frontend-generated audits vs server placeholders
CREATE INDEX IF NOT EXISTS idx_audit_snapshots_ui_generated
  ON public.audit_snapshots(organization_id, app_id, created_at DESC)
  WHERE metadata_version = 'v2';

-- ========================================================================
-- monitored_apps indexes
-- ========================================================================

-- Composite index for monitored app lookups by app_id + platform
-- This optimizes useIsAppMonitored queries
CREATE INDEX IF NOT EXISTS idx_monitored_apps_app_platform
  ON public.monitored_apps(organization_id, app_id, platform)
  WHERE audit_enabled = true;

-- Index for apps with stale metadata (needs re-fetch)
-- Used for scheduled refresh jobs
CREATE INDEX IF NOT EXISTS idx_monitored_apps_stale_metadata
  ON public.monitored_apps(organization_id, metadata_last_refreshed_at)
  WHERE audit_enabled = true AND metadata_last_refreshed_at IS NOT NULL;

-- ========================================================================
-- Comments
-- ========================================================================

COMMENT ON INDEX public.idx_metadata_cache_org_app_platform_locale IS
  'Composite index for fast metadata cache lookups in monitored app workflow. Optimizes useMonitoredAudit queries.';

COMMENT ON INDEX public.idx_metadata_cache_stale IS
  'Partial index for detecting stale cache (>24h old). Used by edge function for cache TTL checks.';

COMMENT ON INDEX public.idx_audit_snapshots_org_app_platform_latest IS
  'Composite index for fetching latest audit snapshot for a monitored app. Optimizes workspace audit loading.';

COMMENT ON INDEX public.idx_audit_snapshots_ui_generated IS
  'Partial index for high-quality frontend-generated audits (v2). Used for prioritizing UI audits over server placeholders.';

COMMENT ON INDEX public.idx_monitored_apps_app_platform IS
  'Composite index for checking if app is monitored. Optimizes useIsAppMonitored queries in MonitorAppButton.';
