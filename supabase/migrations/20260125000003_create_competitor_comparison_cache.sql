-- Migration: Create competitor_comparison_cache table
-- Purpose: Cache comparison results for performance with hybrid refresh strategy
-- Date: 2025-01-25

-- =====================================================================
-- TABLE: competitor_comparison_cache
-- =====================================================================
-- Caches computed comparison results between target app and competitors
-- Implements hybrid caching: show cached data, allow manual refresh
-- =====================================================================

CREATE TABLE IF NOT EXISTS competitor_comparison_cache (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys with CASCADE DELETE
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,

  -- Comparison Configuration
  comparison_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "competitor_ids": ["uuid1", "uuid2", "uuid3"],
  --   "comparison_type": "1-to-many" | "1-to-1",
  --   "rule_config": {...},
  --   "included_insights": ["kpi", "intent", "combo", "keyword", "discovery", "character", "brand"]
  -- }

  -- Cached Comparison Results (CompetitorComparisonResult)
  comparison_data JSONB NOT NULL,
  -- Expected structure:
  -- {
  --   "kpiComparison": {...},
  --   "intentGap": {...},
  --   "comboGap": {...},
  --   "keywordOpportunities": {...},
  --   "discoveryFootprint": {...},
  --   "characterUsage": {...},
  --   "brandStrength": {...},
  --   "recommendations": [...],
  --   "summary": {...}
  -- }

  -- Cache Metadata
  source_audit_ids JSONB NOT NULL,
  -- Array of audit snapshot IDs used to generate this comparison
  -- ["target_audit_id", "competitor_audit_1_id", "competitor_audit_2_id", ...]

  cache_key TEXT NOT NULL UNIQUE,
  -- Format: "target_app_id:competitor_ids_sorted:config_hash"
  -- Example: "abc123:def456,ghi789:a1b2c3d4"

  -- Cache Status
  is_stale BOOLEAN DEFAULT FALSE,
  -- Set to TRUE when:
  -- 1. Manual user refresh requested
  -- 2. Competitor audit updated
  -- 3. Target app audit updated

  expires_at TIMESTAMPTZ,
  -- Soft expiration (24 hours by default)
  -- Can still show stale data with "Refresh" option

  computation_time_ms INTEGER,
  -- Track how long comparison took (for performance monitoring)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- INDEXES
-- =====================================================================

-- Primary lookup: Get cache by target app
CREATE INDEX idx_competitor_comparison_cache_target_app
  ON competitor_comparison_cache(target_app_id, created_at DESC);

-- Organization-level queries
CREATE INDEX idx_competitor_comparison_cache_org
  ON competitor_comparison_cache(organization_id, created_at DESC);

-- Unique constraint: Only one active cache per target app config
CREATE UNIQUE INDEX idx_competitor_comparison_cache_unique_config
  ON competitor_comparison_cache(target_app_id, cache_key)
  WHERE is_stale = FALSE;

-- Find stale caches
CREATE INDEX idx_competitor_comparison_cache_stale
  ON competitor_comparison_cache(target_app_id, is_stale)
  WHERE is_stale = TRUE;

-- Find expired caches (simple index without WHERE clause since NOW() is not immutable)
CREATE INDEX idx_competitor_comparison_cache_expired
  ON competitor_comparison_cache(expires_at);

-- GIN index for JSONB queries
CREATE INDEX idx_competitor_comparison_cache_data
  ON competitor_comparison_cache USING GIN (comparison_data);

CREATE INDEX idx_competitor_comparison_cache_config
  ON competitor_comparison_cache USING GIN (comparison_config);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE competitor_comparison_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comparison cache for their organization
CREATE POLICY select_competitor_comparison_cache
  ON competitor_comparison_cache
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
        AND organization_id IS NULL
    )
  );

-- Policy: Users can insert comparison cache for their organization
CREATE POLICY insert_competitor_comparison_cache
  ON competitor_comparison_cache
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update comparison cache for their organization
CREATE POLICY update_competitor_comparison_cache
  ON competitor_comparison_cache
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins can delete comparison cache
CREATE POLICY delete_competitor_comparison_cache
  ON competitor_comparison_cache
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
        AND organization_id IS NULL
    )
  );

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function: Generate cache key from config
CREATE OR REPLACE FUNCTION generate_comparison_cache_key(
  p_target_app_id UUID,
  p_competitor_ids UUID[],
  p_config_hash TEXT DEFAULT ''
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_target_app_id::TEXT || ':' ||
    array_to_string(
      ARRAY(SELECT unnest(p_competitor_ids) ORDER BY 1),
      ','
    ) || ':' ||
    COALESCE(p_config_hash, '');
$$;

-- Function: Get valid cache for target app
CREATE OR REPLACE FUNCTION get_comparison_cache(
  p_target_app_id UUID,
  p_competitor_ids UUID[],
  p_config_hash TEXT DEFAULT '',
  p_allow_stale BOOLEAN DEFAULT TRUE
)
RETURNS competitor_comparison_cache
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM competitor_comparison_cache
  WHERE target_app_id = p_target_app_id
    AND cache_key = generate_comparison_cache_key(p_target_app_id, p_competitor_ids, p_config_hash)
    AND (p_allow_stale OR is_stale = FALSE)
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Function: Mark cache as stale when audits change
CREATE OR REPLACE FUNCTION mark_comparison_cache_stale()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark all caches for this target app as stale
  UPDATE competitor_comparison_cache
  SET is_stale = TRUE,
      updated_at = NOW()
  WHERE target_app_id = NEW.target_app_id;

  RETURN NEW;
END;
$$;

-- Trigger: Mark cache stale when competitor audit is updated
CREATE TRIGGER trigger_mark_cache_stale_on_competitor_audit
  AFTER INSERT OR UPDATE ON competitor_audit_snapshots
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION mark_comparison_cache_stale();

-- Function: Invalidate cache (mark stale + update expires_at)
CREATE OR REPLACE FUNCTION invalidate_comparison_cache(p_target_app_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_affected_rows INTEGER;
BEGIN
  UPDATE competitor_comparison_cache
  SET is_stale = TRUE,
      expires_at = NOW(),
      updated_at = NOW()
  WHERE target_app_id = p_target_app_id
    AND is_stale = FALSE;

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;

-- Function: Cleanup expired cache entries (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_expired_comparison_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_rows INTEGER;
BEGIN
  DELETE FROM competitor_comparison_cache
  WHERE expires_at < NOW() - INTERVAL '7 days'
    AND is_stale = TRUE;

  GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
  RETURN v_deleted_rows;
END;
$$;

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comparison_cache_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Trigger: Auto-update updated_at
CREATE TRIGGER trigger_update_comparison_cache_timestamp
  BEFORE UPDATE ON competitor_comparison_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_comparison_cache_timestamp();

-- =====================================================================
-- SCHEDULED CLEANUP (Optional - requires pg_cron extension)
-- =====================================================================
-- Uncomment if pg_cron is available:
--
-- SELECT cron.schedule(
--   'cleanup-expired-comparison-cache',
--   '0 2 * * *',  -- Run at 2 AM daily
--   $$SELECT cleanup_expired_comparison_cache();$$
-- );

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE competitor_comparison_cache IS 'Caches comparison results between target app and competitors for performance. Implements hybrid caching with stale detection.';
COMMENT ON COLUMN competitor_comparison_cache.cache_key IS 'Unique key based on target app, competitor IDs (sorted), and config hash';
COMMENT ON COLUMN competitor_comparison_cache.is_stale IS 'TRUE when cache is outdated due to audit updates or manual refresh request';
COMMENT ON COLUMN competitor_comparison_cache.expires_at IS 'Soft expiration time (default 24h). Stale data can still be shown with refresh option.';
COMMENT ON COLUMN competitor_comparison_cache.comparison_data IS 'Complete CompetitorComparisonResult with all 7 insight types';
COMMENT ON FUNCTION generate_comparison_cache_key IS 'Generates deterministic cache key from target app, competitors, and config';
COMMENT ON FUNCTION get_comparison_cache IS 'Retrieves valid cache entry, optionally allowing stale results';
COMMENT ON FUNCTION invalidate_comparison_cache IS 'Marks all caches for a target app as stale and expired';
COMMENT ON FUNCTION cleanup_expired_comparison_cache IS 'Removes cache entries older than 7 days (should run periodically)';
