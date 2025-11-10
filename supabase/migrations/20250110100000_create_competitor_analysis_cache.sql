-- Migration: Create Competitor Analysis Cache
-- Date: 2025-01-10
-- Purpose: Enable 24-hour caching of competitor analysis results
-- Impact: NEW table only - no changes to existing tables

-- ==============================================================================
-- Table: competitor_analysis_cache
-- Purpose: Cache complete competitive intelligence results for 24 hours
-- ==============================================================================

CREATE TABLE public.competitor_analysis_cache (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  primary_app_id TEXT NOT NULL,          -- App Store ID of primary app

  -- Cache Key Components
  competitor_app_ids TEXT[] NOT NULL,    -- Array of competitor App Store IDs (sorted)
  country TEXT NOT NULL,                 -- Country code (e.g., 'us', 'gb')

  -- Cached Analysis Result (JSONB)
  intelligence JSONB NOT NULL,
  /*
    Complete CompetitiveIntelligence object:
    {
      primaryApp: {...},
      competitors: [...],
      featureGaps: [...],
      opportunities: [...],
      strengths: [...],
      threats: [...],
      metrics: {...},
      summary: {...}
    }
  */

  -- Metadata
  total_reviews_analyzed INTEGER NOT NULL DEFAULT 0,
  analysis_duration_ms INTEGER,          -- How long the analysis took

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Unique constraint: one cached result per primary app + competitors + country
  UNIQUE(organization_id, primary_app_id, competitor_app_ids, country)
);

-- Indexes for Performance
CREATE INDEX idx_competitor_cache_org_app
  ON competitor_analysis_cache(organization_id, primary_app_id);

CREATE INDEX idx_competitor_cache_expires
  ON competitor_analysis_cache(expires_at);

CREATE INDEX idx_competitor_cache_primary
  ON competitor_analysis_cache(primary_app_id, country);

-- Note: Cannot use NOW() in partial index (not immutable)
-- Queries will filter on expires_at > NOW() instead
CREATE INDEX idx_competitor_cache_created
  ON competitor_analysis_cache(organization_id, primary_app_id, country, created_at DESC);

-- GIN index for competitor array queries
CREATE INDEX idx_competitor_cache_competitors
  ON competitor_analysis_cache USING GIN(competitor_app_ids);

COMMENT ON TABLE competitor_analysis_cache IS
  'Cached competitor analysis results. Expires after 24 hours. Enables instant loading of previously analyzed comparisons.';

COMMENT ON COLUMN competitor_analysis_cache.intelligence IS
  'Complete CompetitiveIntelligence JSONB object with all analysis results, metrics, and insights.';

COMMENT ON COLUMN competitor_analysis_cache.competitor_app_ids IS
  'Array of competitor App Store IDs. Must be sorted alphabetically for cache key consistency.';

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE competitor_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their organization's cached analyses
CREATE POLICY "Users view org competitor cache"
ON competitor_analysis_cache FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);

-- Policy: Users with ASO Manager or Analyst role can insert cache entries
CREATE POLICY "ASO roles can insert competitor cache"
ON competitor_analysis_cache FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- Policy: Users can delete their organization's cache (for manual refresh)
CREATE POLICY "Users can delete org competitor cache"
ON competitor_analysis_cache FOR DELETE
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- ==============================================================================
-- Helper Functions
-- ==============================================================================

-- Function to check if cached analysis exists and is fresh
CREATE OR REPLACE FUNCTION get_competitor_cache_age(
  p_organization_id UUID,
  p_primary_app_id TEXT,
  p_competitor_app_ids TEXT[],
  p_country TEXT
)
RETURNS TABLE(
  cache_exists BOOLEAN,
  cache_age_seconds INTEGER,
  is_fresh BOOLEAN
) AS $$
  SELECT
    COUNT(*) > 0 AS cache_exists,
    EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))::INTEGER AS cache_age_seconds,
    COUNT(*) FILTER (WHERE expires_at > NOW()) > 0 AS is_fresh
  FROM competitor_analysis_cache
  WHERE organization_id = p_organization_id
    AND primary_app_id = p_primary_app_id
    AND competitor_app_ids = p_competitor_app_ids
    AND country = p_country;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_competitor_cache_age IS
  'Returns cache existence, age in seconds, and freshness status for a specific analysis configuration.';

-- Function to cleanup expired cache entries (run via scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_competitor_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM competitor_analysis_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_competitor_cache IS
  'Deletes all expired cache entries. Should be run periodically via pg_cron or scheduled job.';

-- ==============================================================================
-- Migration Complete
-- ==============================================================================

-- Summary:
-- - 1 new table created: competitor_analysis_cache
-- - 5 indexes created for optimal query performance
-- - 3 RLS policies created for security
-- - 2 helper functions created for cache management
-- - NO changes to existing tables (100% backwards compatible)
