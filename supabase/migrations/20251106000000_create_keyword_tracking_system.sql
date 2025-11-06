-- Migration: Create Keyword Tracking System Tables
-- Description: Creates tables for keyword tracking, rankings, search volumes, competitors, and refresh queue
-- Date: 2025-11-06

-- ============================================================================
-- TABLE: keywords
-- Primary table for tracking keywords across apps and platforms
-- ============================================================================

CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,

  -- Keyword details
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  region TEXT NOT NULL DEFAULT 'us', -- ISO 3166-1 alpha-2 code

  -- Tracking metadata
  is_tracked BOOLEAN DEFAULT true,
  discovery_method TEXT CHECK (discovery_method IN ('manual', 'auto_discovery', 'competitor_analysis', 'ai_suggestion')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_tracked_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(app_id, keyword, platform, region)
);

-- Indexes for keywords table
CREATE INDEX IF NOT EXISTS idx_keywords_app_platform ON keywords(app_id, platform, region);
CREATE INDEX IF NOT EXISTS idx_keywords_tracking ON keywords(is_tracked, last_tracked_at);
CREATE INDEX IF NOT EXISTS idx_keywords_org ON keywords(organization_id);
CREATE INDEX IF NOT EXISTS idx_keywords_lookup ON keywords(keyword, platform, region);

-- Comments
COMMENT ON TABLE keywords IS 'Stores keywords being tracked for apps across platforms and regions';
COMMENT ON COLUMN keywords.keyword IS 'The search keyword being tracked';
COMMENT ON COLUMN keywords.platform IS 'Platform where keyword is tracked (ios or android)';
COMMENT ON COLUMN keywords.region IS 'ISO 3166-1 alpha-2 country code (e.g., us, gb, de)';
COMMENT ON COLUMN keywords.is_tracked IS 'Whether this keyword is actively being tracked';
COMMENT ON COLUMN keywords.discovery_method IS 'How this keyword was discovered';

-- ============================================================================
-- TABLE: keyword_rankings
-- Stores historical ranking data with snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

  -- Ranking data
  position INTEGER, -- NULL if not ranking in top 50
  is_ranking BOOLEAN DEFAULT false, -- true if position <= 50

  -- SERP context
  serp_snapshot JSONB, -- Stores top 50 apps with their positions

  -- Metrics
  estimated_search_volume INTEGER, -- Monthly searches estimate
  visibility_score NUMERIC(10,2), -- (51 - position) * search_volume / 50
  estimated_traffic INTEGER, -- Estimated installs from this keyword

  -- Change tracking
  position_change INTEGER, -- Change from previous snapshot
  trend TEXT CHECK (trend IN ('up', 'down', 'stable', 'new', 'lost')),

  -- Snapshot metadata
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(keyword_id, snapshot_date)
);

-- Indexes for keyword_rankings table
CREATE INDEX IF NOT EXISTS idx_rankings_keyword_date ON keyword_rankings(keyword_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_performance ON keyword_rankings(position, is_ranking);
CREATE INDEX IF NOT EXISTS idx_rankings_snapshot_date ON keyword_rankings(snapshot_date);

-- Comments
COMMENT ON TABLE keyword_rankings IS 'Historical ranking snapshots for keywords';
COMMENT ON COLUMN keyword_rankings.position IS 'Ranking position (1-50, NULL if not in top 50)';
COMMENT ON COLUMN keyword_rankings.serp_snapshot IS 'JSON snapshot of top 50 apps in SERP';
COMMENT ON COLUMN keyword_rankings.visibility_score IS 'Calculated visibility metric based on position and volume';
COMMENT ON COLUMN keyword_rankings.estimated_traffic IS 'Estimated monthly installs from this keyword';
COMMENT ON COLUMN keyword_rankings.trend IS 'Trend direction compared to previous snapshot';

-- ============================================================================
-- TABLE: keyword_search_volumes
-- Stores estimated search volume data (can be updated periodically)
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_search_volumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  region TEXT NOT NULL,

  -- Volume estimates
  estimated_monthly_searches INTEGER,
  popularity_score INTEGER CHECK (popularity_score BETWEEN 0 AND 100),
  competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high', 'very_high')),

  -- Metadata
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  data_source TEXT, -- 'scraped', 'calculated', 'third_party'

  UNIQUE(keyword, platform, region)
);

-- Indexes for keyword_search_volumes table
CREATE INDEX IF NOT EXISTS idx_search_volumes_lookup ON keyword_search_volumes(keyword, platform, region);
CREATE INDEX IF NOT EXISTS idx_search_volumes_updated ON keyword_search_volumes(last_updated_at);

-- Comments
COMMENT ON TABLE keyword_search_volumes IS 'Estimated search volume data for keywords across platforms and regions';
COMMENT ON COLUMN keyword_search_volumes.estimated_monthly_searches IS 'Estimated number of monthly searches';
COMMENT ON COLUMN keyword_search_volumes.popularity_score IS 'Normalized popularity score (0-100)';
COMMENT ON COLUMN keyword_search_volumes.competition_level IS 'Competition level classification';

-- ============================================================================
-- TABLE: competitor_keywords
-- Tracks which competitors rank for specific keywords
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitor_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

  -- Competitor app details
  competitor_app_id TEXT NOT NULL, -- trackId for iOS, bundleId for Android
  competitor_app_name TEXT NOT NULL,
  competitor_position INTEGER NOT NULL,

  -- Snapshot metadata
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(keyword_id, competitor_app_id, snapshot_date)
);

-- Indexes for competitor_keywords table
CREATE INDEX IF NOT EXISTS idx_competitor_keywords_lookup ON competitor_keywords(keyword_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_keywords_app ON competitor_keywords(competitor_app_id);

-- Comments
COMMENT ON TABLE competitor_keywords IS 'Tracks competitor apps ranking for tracked keywords';
COMMENT ON COLUMN competitor_keywords.competitor_app_id IS 'App ID (trackId for iOS, bundleId for Android)';
COMMENT ON COLUMN competitor_keywords.competitor_position IS 'Ranking position of competitor app';

-- ============================================================================
-- TABLE: keyword_refresh_queue
-- Queue for managing automated keyword tracking jobs
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_refresh_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

  -- Job metadata
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 50, -- Higher = higher priority
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Error tracking
  error_message TEXT,
  last_error_at TIMESTAMPTZ,

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for keyword_refresh_queue table
CREATE INDEX IF NOT EXISTS idx_refresh_queue_status ON keyword_refresh_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_refresh_queue_priority ON keyword_refresh_queue(priority DESC, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_refresh_queue_keyword ON keyword_refresh_queue(keyword_id);

-- Comments
COMMENT ON TABLE keyword_refresh_queue IS 'Job queue for automated keyword ranking refresh tasks';
COMMENT ON COLUMN keyword_refresh_queue.status IS 'Current status of the refresh job';
COMMENT ON COLUMN keyword_refresh_queue.priority IS 'Job priority (higher = higher priority)';
COMMENT ON COLUMN keyword_refresh_queue.retry_count IS 'Number of retry attempts';

-- ============================================================================
-- ALTER EXISTING TABLES
-- Add keyword tracking preferences to apps table
-- ============================================================================

ALTER TABLE apps
  ADD COLUMN IF NOT EXISTS keyword_tracking_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_discovery_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_auto_discovery_at TIMESTAMPTZ;

-- Comments
COMMENT ON COLUMN apps.keyword_tracking_enabled IS 'Whether keyword tracking is enabled for this app';
COMMENT ON COLUMN apps.auto_discovery_enabled IS 'Whether automatic keyword discovery is enabled';
COMMENT ON COLUMN apps.last_auto_discovery_at IS 'Timestamp of last auto-discovery run';

-- ============================================================================
-- FUNCTIONS
-- Helper functions for keyword tracking
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_keyword_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for keywords table
DROP TRIGGER IF EXISTS update_keywords_updated_at ON keywords;
CREATE TRIGGER update_keywords_updated_at
  BEFORE UPDATE ON keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_keyword_updated_at();

-- Function to clean up old refresh queue entries
CREATE OR REPLACE FUNCTION cleanup_old_refresh_queue_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM keyword_refresh_queue
  WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get keyword statistics
CREATE OR REPLACE FUNCTION get_keyword_stats(p_app_id UUID)
RETURNS TABLE(
  total_keywords BIGINT,
  top_10_count BIGINT,
  top_30_count BIGINT,
  top_50_count BIGINT,
  avg_position NUMERIC,
  total_estimated_traffic BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT k.id) as total_keywords,
    COUNT(DISTINCT k.id) FILTER (WHERE kr.position <= 10) as top_10_count,
    COUNT(DISTINCT k.id) FILTER (WHERE kr.position <= 30) as top_30_count,
    COUNT(DISTINCT k.id) FILTER (WHERE kr.position <= 50) as top_50_count,
    AVG(kr.position) FILTER (WHERE kr.position IS NOT NULL) as avg_position,
    COALESCE(SUM(kr.estimated_traffic), 0) as total_estimated_traffic
  FROM keywords k
  LEFT JOIN LATERAL (
    SELECT *
    FROM keyword_rankings
    WHERE keyword_id = k.id
    ORDER BY snapshot_date DESC
    LIMIT 1
  ) kr ON true
  WHERE k.app_id = p_app_id
    AND k.is_tracked = true;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_keyword_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_refresh_queue_entries() TO service_role;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- Additional composite indexes for common queries
-- ============================================================================

-- Index for getting latest ranking for each keyword
CREATE INDEX IF NOT EXISTS idx_rankings_latest
  ON keyword_rankings(keyword_id, snapshot_date DESC, id);

-- Index for trending keywords
CREATE INDEX IF NOT EXISTS idx_rankings_trend
  ON keyword_rankings(trend, snapshot_date DESC)
  WHERE trend IN ('up', 'down');

-- Index for high-performing keywords
CREATE INDEX IF NOT EXISTS idx_rankings_top_performers
  ON keyword_rankings(estimated_traffic DESC, snapshot_date DESC)
  WHERE position <= 30;

-- ============================================================================
-- INITIAL DATA / SEED
-- ============================================================================

-- Note: No seed data needed for this migration
-- Keywords will be added by users or auto-discovery

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
