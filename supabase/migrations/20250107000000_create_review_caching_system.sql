-- Migration: Create Review Caching System
-- Date: 2025-01-07
-- Purpose: Enable persistent storage of reviews + AI analysis for monitored apps
-- Impact: NEW tables only - no changes to existing tables

-- ==============================================================================
-- Table 1: monitored_app_reviews
-- Purpose: Cache raw + AI-enhanced review data for instant loading
-- ==============================================================================

CREATE TABLE public.monitored_app_reviews (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  monitored_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- iTunes Identity
  review_id TEXT NOT NULL,           -- iTunes review ID (unique per app+country)
  app_store_id TEXT NOT NULL,        -- iTunes app ID
  country TEXT NOT NULL,             -- Country code (e.g., 'us', 'gb')

  -- Raw Review Data
  title TEXT,                        -- Review title
  text TEXT NOT NULL,                -- Review body
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  version TEXT,                      -- App version reviewed
  author TEXT,                       -- Reviewer name
  review_date TIMESTAMPTZ NOT NULL,  -- When review was posted on App Store

  -- AI-Enhanced Analysis (JSONB for flexibility + performance)
  enhanced_sentiment JSONB,          -- Full EnhancedSentiment object
  /*
    {
      overall: 'positive'|'neutral'|'negative',
      confidence: 0.85,
      emotions: {joy: 0.3, frustration: 0.1, excitement: 0.5, disappointment: 0, anger: 0},
      aspects: {ui_ux: 'positive', performance: 'neutral', features: null, pricing: null, support: null},
      intensity: 'moderate'
    }
  */

  extracted_themes TEXT[],           -- Array of detected themes: ['app crashes', 'ui/ux design']
  mentioned_features TEXT[],         -- Array of feature mentions: ['dark mode', 'notifications']
  identified_issues TEXT[],          -- Array of issues: ['login failures', 'sync errors']
  business_impact TEXT CHECK (business_impact IN ('high', 'medium', 'low')),

  -- Processing Metadata
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_version TEXT DEFAULT '1.0',  -- AI model version (for re-processing if upgraded)

  -- Tracking
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicates (same review can't be stored twice for same monitored app)
  UNIQUE(monitored_app_id, review_id)
);

-- Indexes for Performance
CREATE INDEX idx_cached_reviews_monitored_app
  ON monitored_app_reviews(monitored_app_id, review_date DESC);

CREATE INDEX idx_cached_reviews_org_app
  ON monitored_app_reviews(organization_id, app_store_id);

CREATE INDEX idx_cached_reviews_date
  ON monitored_app_reviews(review_date DESC);

CREATE INDEX idx_cached_reviews_rating
  ON monitored_app_reviews(monitored_app_id, rating);

CREATE INDEX idx_cached_reviews_fetched
  ON monitored_app_reviews(fetched_at DESC);

-- GIN index for full-text search on review text (enables searching reviews)
CREATE INDEX idx_cached_reviews_text_search
  ON monitored_app_reviews USING GIN(to_tsvector('english', text));

-- GIN indexes for array searches (fast filtering by themes/features/issues)
CREATE INDEX idx_cached_reviews_themes
  ON monitored_app_reviews USING GIN(extracted_themes);

CREATE INDEX idx_cached_reviews_features
  ON monitored_app_reviews USING GIN(mentioned_features);

CREATE INDEX idx_cached_reviews_issues
  ON monitored_app_reviews USING GIN(identified_issues);

-- Partial index for high-impact reviews (fast queries for critical reviews)
CREATE INDEX idx_cached_reviews_high_impact
  ON monitored_app_reviews(monitored_app_id, review_date DESC)
  WHERE business_impact = 'high';

COMMENT ON TABLE monitored_app_reviews IS
  'Cached reviews with AI-enhanced sentiment analysis. Enables instant loading and historical tracking. Updated incrementally when users access monitored apps.';

COMMENT ON COLUMN monitored_app_reviews.enhanced_sentiment IS
  'JSONB object containing full AI sentiment analysis (overall, confidence, emotions, aspects, intensity)';

COMMENT ON COLUMN monitored_app_reviews.processing_version IS
  'AI model version used for analysis. Enables re-processing if model is upgraded.';

-- ==============================================================================
-- Table 2: review_intelligence_snapshots
-- Purpose: Pre-computed aggregated intelligence for instant dashboard loading
-- ==============================================================================

CREATE TABLE public.review_intelligence_snapshots (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  monitored_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Snapshot Metadata
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reviews_analyzed INTEGER NOT NULL CHECK (reviews_analyzed >= 0),
  date_range_start TIMESTAMPTZ,      -- Optional: if snapshot covers specific date range
  date_range_end TIMESTAMPTZ,

  -- Aggregated Intelligence (JSONB for flexibility)
  intelligence JSONB NOT NULL,
  /*
    {
      themes: [
        {theme: 'app crashes', frequency: 15, sentiment: -0.8, examples: [...], trending: 'up'}
      ],
      featureMentions: [
        {feature: 'dark mode', mentions: 23, sentiment: 0.9, impact: 'high'}
      ],
      issuePatterns: [
        {issue: 'login failures', frequency: 8, severity: 'critical', affectedVersions: ['2.1.0'], firstSeen: '2025-01-01'}
      ]
    }
  */

  -- Actionable Insights (JSONB)
  actionable_insights JSONB,
  /*
    {
      priorityIssues: [
        {issue: 'Users report crashes on iOS 18', impact: 0.85, affectedUsers: 120, recommendation: 'Deploy emergency patch', urgency: 'immediate'}
      ],
      improvements: [
        {opportunity: 'Add dark mode (high demand)', userDemand: 0.75, businessImpact: 'high', effort: 'medium', roi: 85}
      ],
      alerts: [
        {type: 'issue_spike', severity: 'critical', message: 'Crash reports increased 300% this week', data: {...}, actionable: true}
      ]
    }
  */

  -- Summary Stats (for quick display without parsing JSONB)
  total_reviews INTEGER NOT NULL,
  average_rating DECIMAL(3,2),
  sentiment_distribution JSONB,     -- {positive: 45, neutral: 30, negative: 25}

  -- Version Tracking
  intelligence_version TEXT DEFAULT '1.0',

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One snapshot per app per day (enables historical trend analysis)
  UNIQUE(monitored_app_id, snapshot_date)
);

-- Indexes
CREATE INDEX idx_snapshots_monitored_app
  ON review_intelligence_snapshots(monitored_app_id, snapshot_date DESC);

CREATE INDEX idx_snapshots_org
  ON review_intelligence_snapshots(organization_id, snapshot_date DESC);

CREATE INDEX idx_snapshots_date
  ON review_intelligence_snapshots(snapshot_date DESC);

-- Partial index for recent snapshots (most queries are for recent data)
-- Note: Cannot use CURRENT_DATE in partial index (not immutable)
-- Instead, periodic REINDEX or query optimization handles this
CREATE INDEX idx_snapshots_recent
  ON review_intelligence_snapshots(monitored_app_id, snapshot_date DESC);

COMMENT ON TABLE review_intelligence_snapshots IS
  'Pre-computed review intelligence snapshots (one per app per day). Enables instant dashboard loading and week-over-week trend comparison.';

COMMENT ON COLUMN review_intelligence_snapshots.intelligence IS
  'JSONB containing aggregated themes, feature mentions, and issue patterns extracted from reviews.';

COMMENT ON COLUMN review_intelligence_snapshots.actionable_insights IS
  'JSONB containing priority issues, improvement opportunities, and trend alerts with recommended actions.';

-- ==============================================================================
-- Table 3: review_fetch_log
-- Purpose: Track fetch operations for cache invalidation, rate limiting, debugging
-- ==============================================================================

CREATE TABLE public.review_fetch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  monitored_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Fetch Metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviews_fetched INTEGER DEFAULT 0,    -- How many new reviews were fetched
  reviews_updated INTEGER DEFAULT 0,    -- How many existing reviews were updated
  cache_hit BOOLEAN DEFAULT false,      -- Was this request served from cache?
  cache_age_seconds INTEGER,            -- Age of cache when served (if cache hit)

  -- API Response Info
  itunes_api_status INTEGER,            -- HTTP status code from iTunes/Edge Function
  fetch_duration_ms INTEGER,            -- Performance tracking (request duration)
  error_message TEXT,                   -- Error details if fetch failed

  -- Request Context (for rate limiting & debugging)
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,                      -- For rate limiting by IP
  user_agent TEXT,                      -- Browser/client info

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_fetch_log_app
  ON review_fetch_log(monitored_app_id, fetched_at DESC);

CREATE INDEX idx_fetch_log_user
  ON review_fetch_log(user_id, fetched_at DESC);

CREATE INDEX idx_fetch_log_org
  ON review_fetch_log(organization_id, fetched_at DESC);

-- Partial index for recent logs (cleanup old logs after 90 days)
-- Note: Cannot use NOW() in partial index (not immutable)
CREATE INDEX idx_fetch_log_recent
  ON review_fetch_log(fetched_at DESC);

COMMENT ON TABLE review_fetch_log IS
  'Audit log for review fetch operations. Tracks cache hits, performance metrics, and errors. Used for rate limiting and performance monitoring.';

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all three tables
ALTER TABLE monitored_app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_intelligence_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_fetch_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users see their organization's cached reviews
CREATE POLICY "Users see their org cached reviews"
ON monitored_app_reviews FOR SELECT
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

-- Policy: Users see their organization's intelligence snapshots
CREATE POLICY "Users see their org snapshots"
ON review_intelligence_snapshots FOR SELECT
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

-- Policy: Users see their organization's fetch logs
CREATE POLICY "Users see their org fetch logs"
ON review_fetch_log FOR SELECT
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

-- ==============================================================================
-- Triggers: Auto-update updated_at timestamp
-- ==============================================================================

-- Trigger for monitored_app_reviews
CREATE TRIGGER cached_reviews_updated_at
  BEFORE UPDATE ON monitored_app_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_monitored_apps_updated_at();
-- Note: Reuses existing trigger function from monitored_apps table

-- ==============================================================================
-- Helper Functions (Optional - for future use)
-- ==============================================================================

-- Function to get cache age for a monitored app
CREATE OR REPLACE FUNCTION get_cache_age_seconds(p_monitored_app_id UUID)
RETURNS INTEGER AS $$
  SELECT EXTRACT(EPOCH FROM (NOW() - MAX(fetched_at)))::INTEGER
  FROM monitored_app_reviews
  WHERE monitored_app_id = p_monitored_app_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_cache_age_seconds IS
  'Returns cache age in seconds for a monitored app. Returns NULL if no cached reviews exist.';

-- Function to check if cache is fresh (< 24 hours old)
CREATE OR REPLACE FUNCTION is_cache_fresh(p_monitored_app_id UUID, p_ttl_hours INTEGER DEFAULT 24)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN MAX(fetched_at) IS NULL THEN false
    WHEN NOW() - MAX(fetched_at) < (p_ttl_hours || ' hours')::INTERVAL THEN true
    ELSE false
  END
  FROM monitored_app_reviews
  WHERE monitored_app_id = p_monitored_app_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION is_cache_fresh IS
  'Returns true if cached reviews exist and are less than TTL hours old (default 24 hours).';

-- ==============================================================================
-- Cleanup Policy (Optional - for future scheduled job)
-- ==============================================================================

-- This can be run via pg_cron to cleanup old data
COMMENT ON TABLE review_fetch_log IS
  'Audit log for review fetch operations. Consider cleanup: DELETE FROM review_fetch_log WHERE created_at < NOW() - INTERVAL ''90 days''';

COMMENT ON TABLE monitored_app_reviews IS
  'Cached reviews. Consider cleanup of very old reviews: DELETE FROM monitored_app_reviews WHERE fetched_at < NOW() - INTERVAL ''180 days'' AND monitored_app_id NOT IN (SELECT id FROM monitored_apps WHERE last_checked_at > NOW() - INTERVAL ''30 days'')';

-- ==============================================================================
-- Migration Complete
-- ==============================================================================

-- Summary:
-- - 3 new tables created: monitored_app_reviews, review_intelligence_snapshots, review_fetch_log
-- - 15 indexes created for optimal query performance
-- - 3 RLS policies created for security
-- - 1 trigger created for auto-timestamp updates
-- - 2 helper functions created for cache management
-- - NO changes to existing tables (100% backwards compatible)
