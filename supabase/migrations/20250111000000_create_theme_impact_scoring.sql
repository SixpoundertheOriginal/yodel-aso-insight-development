-- Migration: Create Theme Impact Scoring System
-- Date: 2025-01-11
-- Purpose: Analyze review themes and their business impact
-- Quick Win #1 from Data Availability Audit

-- ==============================================================================
-- Table 1: theme_impact_scores
-- Purpose: Store calculated impact scores for themes extracted from reviews
-- ==============================================================================

CREATE TABLE public.theme_impact_scores (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  monitored_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,

  -- Theme Identification
  theme TEXT NOT NULL,                    -- e.g., "app crashes", "dark mode requests"
  theme_category TEXT,                    -- "bug", "feature_request", "ux_issue", "performance"

  -- Time Window
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_days INTEGER NOT NULL DEFAULT 30, -- Analysis window (7, 30, 90 days)

  -- Frequency Metrics
  mention_count INTEGER NOT NULL DEFAULT 0,
  unique_reviews INTEGER NOT NULL DEFAULT 0,
  trend_direction TEXT CHECK (trend_direction IN ('rising', 'stable', 'declining')),
  week_over_week_change DECIMAL(5,2),    -- % change from previous period

  -- Sentiment Metrics
  avg_sentiment DECIMAL(3,2),             -- -1 to 1
  positive_mentions INTEGER DEFAULT 0,
  neutral_mentions INTEGER DEFAULT 0,
  negative_mentions INTEGER DEFAULT 0,
  sentiment_intensity TEXT CHECK (sentiment_intensity IN ('mild', 'moderate', 'strong', 'extreme')),

  -- Business Impact Calculation
  impact_score DECIMAL(5,2) NOT NULL,     -- 0-100 composite score
  /*
    Impact Score Formula:
    = (frequency_weight * 0.4) +
      (sentiment_weight * 0.3) +
      (recency_weight * 0.2) +
      (trend_weight * 0.1)
  */
  impact_level TEXT CHECK (impact_level IN ('critical', 'high', 'medium', 'low')),
  urgency TEXT CHECK (urgency IN ('immediate', 'high', 'medium', 'low')),

  -- User Impact
  affected_user_estimate INTEGER,         -- Estimated affected users
  user_impact_level TEXT CHECK (user_impact_level IN ('widespread', 'common', 'occasional', 'rare')),

  -- Version Analysis
  affected_versions TEXT[],               -- App versions where theme appears
  first_seen_date DATE,                   -- When theme first appeared
  last_seen_date DATE,                    -- Most recent mention

  -- Supporting Data
  example_reviews JSONB,                  -- Sample review excerpts
  /*
    [
      {reviewId: "...", text: "...", rating: 1, date: "2025-01-10"},
      ...
    ]
  */

  related_features TEXT[],                -- Associated feature mentions
  related_issues TEXT[],                  -- Associated issues

  -- Recommendations (AI-generated)
  recommended_action TEXT,                -- "Fix crash in iOS 18", "Add dark mode"
  estimated_effort TEXT CHECK (estimated_effort IN ('small', 'medium', 'large', 'unknown')),
  potential_rating_impact DECIMAL(2,1),   -- Estimated rating improvement (e.g., +0.5)

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One score per theme per app per analysis date
  UNIQUE(monitored_app_id, theme, analysis_date, period_days)
);

-- Indexes for Performance
CREATE INDEX idx_theme_scores_app_date
  ON theme_impact_scores(monitored_app_id, analysis_date DESC);

CREATE INDEX idx_theme_scores_org
  ON theme_impact_scores(organization_id, analysis_date DESC);

CREATE INDEX idx_theme_scores_impact
  ON theme_impact_scores(impact_score DESC, impact_level);

CREATE INDEX idx_theme_scores_urgency
  ON theme_impact_scores(monitored_app_id, urgency, impact_score DESC)
  WHERE urgency IN ('immediate', 'high');

CREATE INDEX idx_theme_scores_category
  ON theme_impact_scores(theme_category, impact_score DESC);

CREATE INDEX idx_theme_scores_trending
  ON theme_impact_scores(monitored_app_id, trend_direction, impact_score DESC)
  WHERE trend_direction = 'rising';

-- Full-text search on theme names
CREATE INDEX idx_theme_scores_theme_search
  ON theme_impact_scores USING GIN(to_tsvector('english', theme));

COMMENT ON TABLE theme_impact_scores IS
  'Calculated impact scores for review themes. Updated daily via cron job. Enables prioritization of product improvements.';

-- ==============================================================================
-- Table 2: theme_score_history
-- Purpose: Track theme score evolution over time for trend analysis
-- ==============================================================================

CREATE TABLE public.theme_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  theme_score_id UUID NOT NULL REFERENCES theme_impact_scores(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  monitored_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,

  -- Historical snapshot
  snapshot_date DATE NOT NULL,
  impact_score DECIMAL(5,2) NOT NULL,
  mention_count INTEGER NOT NULL,
  avg_sentiment DECIMAL(3,2),
  trend_direction TEXT,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(theme_score_id, snapshot_date)
);

CREATE INDEX idx_theme_history_score
  ON theme_score_history(theme_score_id, snapshot_date DESC);

CREATE INDEX idx_theme_history_app
  ON theme_score_history(monitored_app_id, snapshot_date DESC);

COMMENT ON TABLE theme_score_history IS
  'Historical snapshots of theme impact scores for trend visualization.';

-- ==============================================================================
-- View: vw_critical_themes
-- Purpose: Quick access to themes requiring immediate attention
-- ==============================================================================

CREATE OR REPLACE VIEW vw_critical_themes AS
SELECT
  tis.id,
  tis.monitored_app_id,
  tis.organization_id,
  ma.app_name,
  tis.theme,
  tis.theme_category,
  tis.impact_score,
  tis.impact_level,
  tis.urgency,
  tis.mention_count,
  tis.avg_sentiment,
  tis.trend_direction,
  tis.week_over_week_change,
  tis.recommended_action,
  tis.potential_rating_impact,
  tis.analysis_date,
  tis.last_seen_date
FROM theme_impact_scores tis
JOIN monitored_apps ma ON tis.monitored_app_id = ma.id
WHERE
  tis.analysis_date >= CURRENT_DATE - INTERVAL '7 days'
  AND (
    tis.urgency IN ('immediate', 'high')
    OR tis.impact_score > 75
    OR (tis.trend_direction = 'rising' AND tis.impact_score > 50)
  )
ORDER BY
  CASE tis.urgency
    WHEN 'immediate' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  tis.impact_score DESC;

COMMENT ON VIEW vw_critical_themes IS
  'Dashboard view showing themes requiring immediate attention.';

-- ==============================================================================
-- Function: calculate_theme_impact_score
-- Purpose: Calculate composite impact score for a theme
-- ==============================================================================

CREATE OR REPLACE FUNCTION calculate_theme_impact_score(
  p_mention_count INTEGER,
  p_unique_reviews INTEGER,
  p_avg_sentiment DECIMAL,
  p_days_since_first_seen INTEGER,
  p_trend_direction TEXT
) RETURNS DECIMAL AS $$
DECLARE
  v_frequency_weight DECIMAL;
  v_sentiment_weight DECIMAL;
  v_recency_weight DECIMAL;
  v_trend_weight DECIMAL;
  v_impact_score DECIMAL;
BEGIN
  -- Frequency weight (0-100, capped at 50 mentions = 100)
  v_frequency_weight := LEAST((p_mention_count / 50.0) * 100, 100);

  -- Sentiment weight (negative sentiment = higher impact)
  -- Range: -1 to 1, convert to 0-100 (inverted for negative sentiment)
  v_sentiment_weight := CASE
    WHEN p_avg_sentiment < 0 THEN (ABS(p_avg_sentiment) * 100)  -- Negative = high impact
    WHEN p_avg_sentiment > 0 THEN ((1 - p_avg_sentiment) * 30)  -- Positive = low impact
    ELSE 50  -- Neutral = medium impact
  END;

  -- Recency weight (recent = higher impact)
  -- 0-7 days = 100, 8-30 days = 70, 31-90 days = 40, 90+ days = 20
  v_recency_weight := CASE
    WHEN p_days_since_first_seen <= 7 THEN 100
    WHEN p_days_since_first_seen <= 30 THEN 70
    WHEN p_days_since_first_seen <= 90 THEN 40
    ELSE 20
  END;

  -- Trend weight
  v_trend_weight := CASE p_trend_direction
    WHEN 'rising' THEN 100
    WHEN 'stable' THEN 50
    WHEN 'declining' THEN 20
    ELSE 50
  END;

  -- Composite score (weighted average)
  v_impact_score := (
    (v_frequency_weight * 0.4) +
    (v_sentiment_weight * 0.3) +
    (v_recency_weight * 0.2) +
    (v_trend_weight * 0.1)
  );

  RETURN ROUND(v_impact_score, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_theme_impact_score IS
  'Calculate composite impact score (0-100) based on frequency, sentiment, recency, and trend.';

-- ==============================================================================
-- Function: get_impact_level
-- Purpose: Convert numeric impact score to categorical level
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_impact_level(p_score DECIMAL)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN p_score >= 85 THEN 'critical'
    WHEN p_score >= 65 THEN 'high'
    WHEN p_score >= 40 THEN 'medium'
    ELSE 'low'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE theme_impact_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_score_history ENABLE ROW LEVEL SECURITY;

-- Users see themes for their organization's apps
CREATE POLICY "Users see their org theme scores"
ON theme_impact_scores FOR SELECT
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

CREATE POLICY "Users see their org theme history"
ON theme_score_history FOR SELECT
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
-- Trigger: Update timestamp
-- ==============================================================================

CREATE TRIGGER theme_scores_updated_at
  BEFORE UPDATE ON theme_impact_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_monitored_apps_updated_at();

-- ==============================================================================
-- Sample Query: Get top themes for an app
-- ==============================================================================

COMMENT ON TABLE theme_impact_scores IS
  'Theme Impact Scoring System

  Sample Queries:

  -- Get top 10 critical themes for an app:
  SELECT theme, impact_score, mention_count, avg_sentiment, trend_direction
  FROM theme_impact_scores
  WHERE monitored_app_id = ''your-app-id''
    AND analysis_date = CURRENT_DATE
  ORDER BY impact_score DESC
  LIMIT 10;

  -- Track theme evolution over time:
  SELECT snapshot_date, impact_score, mention_count
  FROM theme_score_history
  WHERE theme_score_id = ''theme-id''
  ORDER BY snapshot_date DESC
  LIMIT 30;

  -- Dashboard critical alerts:
  SELECT * FROM vw_critical_themes
  WHERE monitored_app_id = ''your-app-id'';
  ';

-- ==============================================================================
-- Migration Complete
-- ==============================================================================
