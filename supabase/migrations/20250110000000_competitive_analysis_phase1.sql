-- ============================================================================
-- COMPETITIVE ANALYSIS ENHANCEMENT - PHASE 1
-- Date: 2025-01-10
-- Purpose: Add longitudinal competitor metrics tracking and feature sentiment analysis
-- ============================================================================

-- ============================================================================
-- TABLE 1: competitor_metrics_snapshots
-- Purpose: Store periodic snapshots of competitor metrics for trend analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.competitor_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  competitor_app_store_id TEXT NOT NULL, -- Can be primary app OR competitor

  -- Snapshot metadata
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  country TEXT NOT NULL,

  -- Core metrics
  rating DECIMAL(3,2),
  review_count INTEGER,
  review_velocity_7d INTEGER DEFAULT 0,  -- Reviews added in last 7 days
  review_velocity_30d INTEGER DEFAULT 0, -- Reviews added in last 30 days

  -- Sentiment metrics (percentages)
  sentiment_positive_pct DECIMAL(5,2),
  sentiment_neutral_pct DECIMAL(5,2),
  sentiment_negative_pct DECIMAL(5,2),
  avg_sentiment_score DECIMAL(3,2), -- -1 to 1 scale

  -- Issue metrics
  issue_frequency_per_100 DECIMAL(5,2), -- Issues per 100 reviews
  top_issues JSONB, -- Array of {issue: string, frequency: number, severity: string}

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicates: same app + date + country
  UNIQUE(organization_id, target_app_id, competitor_app_store_id, snapshot_date, country)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_lookup
  ON competitor_metrics_snapshots(target_app_id, competitor_app_store_id, country);

CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_date
  ON competitor_metrics_snapshots(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_org
  ON competitor_metrics_snapshots(organization_id);

-- ============================================================================
-- TABLE 2: feature_sentiment_analysis
-- Purpose: Store feature-level sentiment breakdowns for heatmap visualization
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_sentiment_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  comparison_id UUID, -- Optional: link to a specific comparison run (future use)

  -- App identification
  app_store_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  country TEXT NOT NULL,

  -- Feature identification
  feature_name TEXT NOT NULL,
  feature_category TEXT, -- "UX", "Performance", "Functionality", "Support", "Content"

  -- Sentiment breakdown
  mention_count INTEGER NOT NULL DEFAULT 0,
  sentiment_score DECIMAL(3,2), -- -1 to 1 scale
  positive_mentions INTEGER DEFAULT 0,
  neutral_mentions INTEGER DEFAULT 0,
  negative_mentions INTEGER DEFAULT 0,

  -- Demand scoring (0-100 calculated score)
  demand_score DECIMAL(5,2),
  demand_level TEXT CHECK (demand_level IN ('high', 'medium', 'low')),

  -- Competitive context
  is_gap BOOLEAN DEFAULT FALSE, -- True if primary app lacks this feature
  competitors_with_feature TEXT[], -- Array of competitor app names
  avg_competitor_sentiment DECIMAL(3,2), -- Average sentiment from competitors

  -- Sample reviews (for evidence)
  sample_reviews JSONB, -- Array of {text: string, rating: number, date: string}

  -- Tracking
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Note: No unique constraint on analyzed_at date to allow multiple daily updates
  -- Use latest record per app/feature/country for analysis
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_sentiment_lookup
  ON feature_sentiment_analysis(app_store_id, country, analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_sentiment_gaps
  ON feature_sentiment_analysis(is_gap, demand_score DESC)
  WHERE is_gap = TRUE;

CREATE INDEX IF NOT EXISTS idx_feature_sentiment_org
  ON feature_sentiment_analysis(organization_id);

CREATE INDEX IF NOT EXISTS idx_feature_sentiment_feature
  ON feature_sentiment_analysis(feature_name);

-- ============================================================================
-- VIEW 1: vw_competitor_benchmark_matrix
-- Purpose: Latest metrics for all apps in a comparison set with percentile ranks
-- ============================================================================

CREATE OR REPLACE VIEW vw_competitor_benchmark_matrix AS
WITH latest_snapshots AS (
  SELECT DISTINCT ON (target_app_id, competitor_app_store_id, country)
    organization_id,
    target_app_id,
    competitor_app_store_id,
    country,
    rating,
    review_count,
    review_velocity_7d,
    review_velocity_30d,
    sentiment_positive_pct,
    avg_sentiment_score,
    issue_frequency_per_100,
    snapshot_date,
    created_at
  FROM competitor_metrics_snapshots
  ORDER BY target_app_id, competitor_app_store_id, country, snapshot_date DESC
)
SELECT
  ls.organization_id,
  ls.target_app_id,
  ma.app_name AS target_app_name,
  ls.competitor_app_store_id,
  COALESCE(ac.competitor_app_name, ma2.app_name) AS competitor_app_name,
  ls.country,
  ls.rating,
  ls.review_count,
  ls.review_velocity_7d,
  ls.review_velocity_30d,
  ls.sentiment_positive_pct,
  ls.avg_sentiment_score,
  ls.issue_frequency_per_100,

  -- Calculate percentile ranks within comparison set
  PERCENT_RANK() OVER (
    PARTITION BY ls.target_app_id, ls.country
    ORDER BY ls.rating
  ) AS rating_percentile,

  PERCENT_RANK() OVER (
    PARTITION BY ls.target_app_id, ls.country
    ORDER BY ls.sentiment_positive_pct
  ) AS sentiment_percentile,

  PERCENT_RANK() OVER (
    PARTITION BY ls.target_app_id, ls.country
    ORDER BY ls.review_velocity_30d
  ) AS velocity_percentile,

  ls.snapshot_date,
  ls.created_at
FROM latest_snapshots ls
JOIN monitored_apps ma ON ls.target_app_id = ma.id
LEFT JOIN app_competitors ac
  ON ls.competitor_app_store_id = ac.competitor_app_store_id
  AND ls.target_app_id = ac.target_app_id
LEFT JOIN monitored_apps ma2
  ON ls.competitor_app_store_id = ma2.app_store_id;

-- ============================================================================
-- VIEW 2: vw_feature_gap_opportunities
-- Purpose: Ranked feature gaps by opportunity score
-- ============================================================================

CREATE OR REPLACE VIEW vw_feature_gap_opportunities AS
WITH latest_analysis AS (
  SELECT DISTINCT ON (organization_id, app_store_id, feature_name, country)
    organization_id,
    feature_name,
    feature_category,
    mention_count,
    sentiment_score,
    demand_score,
    demand_level,
    competitors_with_feature,
    avg_competitor_sentiment,
    country,
    analyzed_at,
    sample_reviews
  FROM feature_sentiment_analysis
  WHERE is_gap = TRUE
  ORDER BY organization_id, app_store_id, feature_name, country, analyzed_at DESC
)
SELECT
  organization_id,
  feature_name,
  feature_category,
  mention_count,
  sentiment_score,
  demand_score,
  demand_level,
  COALESCE(ARRAY_LENGTH(competitors_with_feature, 1), 0) AS competitor_count,
  avg_competitor_sentiment,

  -- Calculate opportunity score (0-100)
  -- Formula: 40% demand + 30% competitor sentiment + 30% competitor adoption
  ROUND(
    (
      (COALESCE(demand_score, 0) / 100.0) * 0.4 +
      ((COALESCE(avg_competitor_sentiment, 0) + 1) / 2) * 0.3 +
      (LEAST(COALESCE(ARRAY_LENGTH(competitors_with_feature, 1), 0) / 5.0, 1.0)) * 0.3
    ) * 100,
    2
  ) AS opportunity_score,

  country,
  analyzed_at,
  sample_reviews
FROM latest_analysis
ORDER BY
  (COALESCE(demand_score, 0) / 100.0) * 0.4 +
  ((COALESCE(avg_competitor_sentiment, 0) + 1) / 2) * 0.3 +
  (LEAST(COALESCE(ARRAY_LENGTH(competitors_with_feature, 1), 0) / 5.0, 1.0)) * 0.3
  DESC;

-- ============================================================================
-- FUNCTION: generate_competitive_summary
-- Purpose: Auto-generate AI-powered executive summary with delta insights
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_competitive_summary(
  p_target_app_id UUID,
  p_country TEXT DEFAULT 'us'
)
RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
  v_primary_rating DECIMAL;
  v_primary_sentiment DECIMAL;
  v_primary_reviews INTEGER;
  v_primary_velocity INTEGER;
  v_avg_competitor_rating DECIMAL;
  v_avg_competitor_sentiment DECIMAL;
  v_avg_competitor_reviews DECIMAL;
  v_avg_competitor_velocity DECIMAL;
  v_rating_delta DECIMAL;
  v_sentiment_delta DECIMAL;
  v_review_delta DECIMAL;
  v_velocity_delta DECIMAL;
  v_top_gap TEXT;
  v_top_gap_score DECIMAL;
  v_position TEXT;
BEGIN
  -- Get primary app metrics (latest snapshot)
  SELECT
    rating,
    sentiment_positive_pct,
    review_count,
    review_velocity_30d
  INTO
    v_primary_rating,
    v_primary_sentiment,
    v_primary_reviews,
    v_primary_velocity
  FROM competitor_metrics_snapshots
  WHERE target_app_id = p_target_app_id
    AND competitor_app_store_id IN (
      SELECT app_store_id FROM monitored_apps WHERE id = p_target_app_id
    )
    AND country = p_country
  ORDER BY snapshot_date DESC
  LIMIT 1;

  -- Get competitor averages (latest snapshots)
  SELECT
    AVG(rating),
    AVG(sentiment_positive_pct),
    AVG(review_count),
    AVG(review_velocity_30d)
  INTO
    v_avg_competitor_rating,
    v_avg_competitor_sentiment,
    v_avg_competitor_reviews,
    v_avg_competitor_velocity
  FROM competitor_metrics_snapshots cms
  WHERE cms.target_app_id = p_target_app_id
    AND cms.competitor_app_store_id != (
      SELECT app_store_id FROM monitored_apps WHERE id = p_target_app_id
    )
    AND cms.country = p_country
    AND cms.snapshot_date >= CURRENT_DATE - INTERVAL '7 days';

  -- Calculate deltas
  v_rating_delta := CASE
    WHEN v_avg_competitor_rating > 0 THEN
      ((v_primary_rating - v_avg_competitor_rating) / v_avg_competitor_rating) * 100
    ELSE 0
  END;

  v_sentiment_delta := COALESCE(v_primary_sentiment - v_avg_competitor_sentiment, 0);

  v_review_delta := CASE
    WHEN v_avg_competitor_reviews > 0 THEN
      ((v_primary_reviews - v_avg_competitor_reviews) / v_avg_competitor_reviews) * 100
    ELSE 0
  END;

  v_velocity_delta := CASE
    WHEN v_avg_competitor_velocity > 0 THEN
      ((v_primary_velocity - v_avg_competitor_velocity) / v_avg_competitor_velocity) * 100
    ELSE 0
  END;

  -- Get top feature gap
  SELECT feature_name, opportunity_score
  INTO v_top_gap, v_top_gap_score
  FROM vw_feature_gap_opportunities
  WHERE country = p_country
    AND organization_id IN (
      SELECT organization_id FROM monitored_apps WHERE id = p_target_app_id
    )
  ORDER BY opportunity_score DESC
  LIMIT 1;

  -- Determine position
  v_position := CASE
    WHEN v_rating_delta > 10 AND v_sentiment_delta > 10 THEN 'leading'
    WHEN v_rating_delta < -10 OR v_sentiment_delta < -10 THEN 'lagging'
    ELSE 'competitive'
  END;

  -- Build summary JSON
  v_summary := jsonb_build_object(
    'position', v_position,
    'rating_delta_pct', ROUND(v_rating_delta, 1),
    'sentiment_delta_pct', ROUND(v_sentiment_delta, 1),
    'review_delta_pct', ROUND(v_review_delta, 1),
    'velocity_delta_pct', ROUND(v_velocity_delta, 1),
    'primary_rating', ROUND(v_primary_rating, 1),
    'competitor_avg_rating', ROUND(v_avg_competitor_rating, 1),
    'primary_sentiment', ROUND(v_primary_sentiment, 1),
    'competitor_avg_sentiment', ROUND(v_avg_competitor_sentiment, 1),
    'top_feature_gap', v_top_gap,
    'top_gap_opportunity_score', ROUND(v_top_gap_score, 1),
    'summary_text', FORMAT(
      'Your app averages %s★ vs %s★ competitors (%s%% delta). Sentiment: %s%% vs %s%% (%s%% gap). Top missing feature: %s (opportunity score: %s/100).',
      ROUND(v_primary_rating, 1),
      ROUND(v_avg_competitor_rating, 1),
      ROUND(v_rating_delta, 1),
      ROUND(v_primary_sentiment, 1),
      ROUND(v_avg_competitor_sentiment, 1),
      ROUND(v_sentiment_delta, 1),
      COALESCE(v_top_gap, 'None identified'),
      ROUND(v_top_gap_score, 1)
    ),
    'generated_at', NOW()
  );

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE competitor_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_sentiment_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their organization's snapshots
CREATE POLICY "Users see their org competitor snapshots"
ON competitor_metrics_snapshots FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- RLS Policy: Users can insert snapshots for their organization
CREATE POLICY "Users can insert competitor snapshots"
ON competitor_metrics_snapshots FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = competitor_metrics_snapshots.organization_id
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST', 'SUPER_ADMIN')
  )
);

-- RLS Policy: Users can view their organization's feature sentiment
CREATE POLICY "Users see their org feature sentiment"
ON feature_sentiment_analysis FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- RLS Policy: Users can insert feature sentiment for their organization
CREATE POLICY "Users can insert feature sentiment"
ON feature_sentiment_analysis FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = feature_sentiment_analysis.organization_id
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST', 'SUPER_ADMIN')
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE competitor_metrics_snapshots IS
  'Periodic snapshots of competitor metrics for longitudinal analysis and trend tracking';

COMMENT ON TABLE feature_sentiment_analysis IS
  'Feature-level sentiment analysis for competitive intelligence heatmaps';

COMMENT ON VIEW vw_competitor_benchmark_matrix IS
  'Latest competitor metrics with percentile rankings for benchmark comparisons';

COMMENT ON VIEW vw_feature_gap_opportunities IS
  'Ranked feature gaps with calculated opportunity scores (0-100)';

COMMENT ON FUNCTION generate_competitive_summary IS
  'Generates AI-powered executive summary with delta insights and position assessment';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 1 Migration Complete';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created Tables:';
  RAISE NOTICE '   - competitor_metrics_snapshots (for longitudinal tracking)';
  RAISE NOTICE '   - feature_sentiment_analysis (for heatmap intelligence)';
  RAISE NOTICE '';
  RAISE NOTICE '📈 Created Views:';
  RAISE NOTICE '   - vw_competitor_benchmark_matrix (latest metrics + percentiles)';
  RAISE NOTICE '   - vw_feature_gap_opportunities (ranked gaps by opportunity score)';
  RAISE NOTICE '';
  RAISE NOTICE '🤖 Created Functions:';
  RAISE NOTICE '   - generate_competitive_summary() (AI-powered summaries)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 RLS Policies: Enabled and configured';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next Steps:';
  RAISE NOTICE '   1. Test with: SELECT generate_competitive_summary(<app_id>, ''us'');';
  RAISE NOTICE '   2. Insert sample snapshots for testing';
  RAISE NOTICE '   3. Verify views return data: SELECT * FROM vw_competitor_benchmark_matrix LIMIT 5;';
END $$;
