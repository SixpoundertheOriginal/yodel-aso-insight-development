-- =====================================================================
-- Migration: Extend monitored_apps for ASO Audit Support
-- Purpose: Add audit tracking columns to existing monitored_apps table
-- Features:
--   - Audit enablement flag per app
--   - Latest audit score and timestamp tracking
--   - Locale support for multi-regional audits
--   - Metadata refresh timestamp for cache TTL
--   - Performance index for audit-enabled queries
-- =====================================================================

-- Add audit-related columns to existing monitored_apps table
ALTER TABLE public.monitored_apps
  ADD COLUMN IF NOT EXISTS audit_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS latest_audit_score INT,
  ADD COLUMN IF NOT EXISTS latest_audit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'us',
  ADD COLUMN IF NOT EXISTS metadata_last_refreshed_at TIMESTAMPTZ;

-- Add constraint for audit score range (0-100)
ALTER TABLE public.monitored_apps
  ADD CONSTRAINT monitored_apps_audit_score_range
    CHECK (latest_audit_score IS NULL OR (latest_audit_score >= 0 AND latest_audit_score <= 100));

-- Performance index for audit-enabled queries
-- Partial index only indexes rows where audit_enabled = true
CREATE INDEX IF NOT EXISTS idx_monitored_apps_audit
  ON public.monitored_apps(organization_id, audit_enabled)
  WHERE audit_enabled = true;

-- Index for locale-based queries
CREATE INDEX IF NOT EXISTS idx_monitored_apps_locale
  ON public.monitored_apps(locale, organization_id);

-- Index for metadata refresh tracking (TTL queries)
CREATE INDEX IF NOT EXISTS idx_monitored_apps_refresh
  ON public.monitored_apps(metadata_last_refreshed_at)
  WHERE audit_enabled = true;

-- Comments
COMMENT ON COLUMN public.monitored_apps.audit_enabled IS
  'Flag indicating whether this app is actively monitored for ASO audit analysis. Default: false.';

COMMENT ON COLUMN public.monitored_apps.latest_audit_score IS
  'Most recent audit score (0-100) from the last successful audit snapshot. NULL if no audit has been performed yet.';

COMMENT ON COLUMN public.monitored_apps.latest_audit_at IS
  'Timestamp of the most recent audit snapshot creation. Used for tracking audit frequency and staleness.';

COMMENT ON COLUMN public.monitored_apps.locale IS
  'Locale/country code for metadata fetching and audit analysis (e.g., "us", "gb", "jp"). Default: "us".';

COMMENT ON COLUMN public.monitored_apps.metadata_last_refreshed_at IS
  'Timestamp of last metadata cache refresh. Used for implementing 24-hour cache TTL. NULL if never refreshed.';
