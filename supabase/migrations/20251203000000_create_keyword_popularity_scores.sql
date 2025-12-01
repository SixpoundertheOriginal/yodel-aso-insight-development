-- ============================================================================
-- Keyword Popularity Scores Table (MVP - Option A, No Google Trends)
-- Stores computed popularity scores (0-100) for iOS keywords
-- Updated daily via pg_cron job
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_popularity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Keyword identification
  keyword TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'us',
  platform TEXT NOT NULL DEFAULT 'ios',

  -- Feature scores (0-1 normalized)
  autocomplete_score FLOAT DEFAULT 0,
  autocomplete_rank INTEGER, -- 1-10 or null (if keyword doesn't appear)
  autocomplete_appears BOOLEAN DEFAULT false,

  intent_score FLOAT DEFAULT 0,
  combo_participation_count INTEGER DEFAULT 0, -- How many combos contain this token

  length_prior FLOAT DEFAULT 0,
  word_count INTEGER, -- Number of words in keyword

  -- Final score (0-100)
  -- Formula (MVP): (autocomplete * 0.6) + (intent * 0.3) + (length * 0.1)
  popularity_score FLOAT NOT NULL,

  -- Versioning for formula changes
  scoring_version TEXT DEFAULT 'v1-mvp-no-trends',

  -- Metadata
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Error tracking
  fetch_errors JSONB, -- Store any API errors: {"autocomplete": "rate limited"}
  data_quality TEXT DEFAULT 'complete', -- 'complete', 'partial', 'stale', 'estimated'

  -- Unique constraint: one score per keyword per locale
  UNIQUE(keyword, locale, platform)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Lookup by locale and score (for filtering high-popularity keywords)
CREATE INDEX IF NOT EXISTS idx_popularity_scores_lookup
  ON keyword_popularity_scores(locale, platform, popularity_score DESC);

-- Lookup by keyword (for API queries)
CREATE INDEX IF NOT EXISTS idx_popularity_scores_keyword
  ON keyword_popularity_scores(keyword, locale);

-- Find stale scores (for refresh job)
CREATE INDEX IF NOT EXISTS idx_popularity_scores_stale
  ON keyword_popularity_scores(last_checked_at)
  WHERE data_quality IN ('stale', 'partial');

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE keyword_popularity_scores ENABLE ROW LEVEL SECURITY;

-- Users can read all popularity scores (public data)
DROP POLICY IF EXISTS "Users can read keyword popularity scores" ON keyword_popularity_scores;
CREATE POLICY "Users can read keyword popularity scores"
  ON keyword_popularity_scores
  FOR SELECT
  USING (true); -- Public data, no restriction

-- Only service role can insert/update scores
DROP POLICY IF EXISTS "Service role can manage keyword popularity scores" ON keyword_popularity_scores;
CREATE POLICY "Service role can manage keyword popularity scores"
  ON keyword_popularity_scores
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Automatic Timestamp Update
-- ============================================================================

CREATE OR REPLACE FUNCTION update_popularity_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS popularity_scores_updated_at ON keyword_popularity_scores;
CREATE TRIGGER popularity_scores_updated_at
  BEFORE UPDATE ON keyword_popularity_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_popularity_scores_updated_at();

-- ============================================================================
-- Helper Function: Get Keywords Needing Refresh
-- ============================================================================

CREATE OR REPLACE FUNCTION get_stale_keywords(
  max_age_hours INTEGER DEFAULT 24,
  batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE (keyword TEXT, locale TEXT, platform TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT kps.keyword, kps.locale, kps.platform
  FROM keyword_popularity_scores kps
  WHERE kps.last_checked_at < NOW() - (max_age_hours || ' hours')::INTERVAL
  ORDER BY kps.last_checked_at ASC
  LIMIT batch_size;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RPC Function: Calculate Token Intent Scores
-- Extracts tokens from combo_rankings_cache and computes intent scores
-- based on how many combos each token participates in (breadth-of-intent)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_token_intent_scores(
  p_locale TEXT DEFAULT 'us',
  p_platform TEXT DEFAULT 'ios'
)
RETURNS TABLE (
  token TEXT,
  combo_count INTEGER,
  intent_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH token_combos AS (
    -- Extract all tokens from combos (last 30 days)
    SELECT
      UNNEST(string_to_array(LOWER(combo), ' ')) AS token,
      COUNT(*) AS combo_count
    FROM combo_rankings_cache
    WHERE platform = p_platform
      AND country = p_locale
      AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY token
  ),
  token_stats AS (
    -- Normalize to 0-1 scale
    SELECT
      tc.token,
      tc.combo_count,
      CASE
        -- Handle edge case where all tokens have same count
        WHEN MAX(tc.combo_count) OVER () = MIN(tc.combo_count) OVER () THEN 0.5
        -- Normalize to 0-1
        ELSE (tc.combo_count::float - MIN(tc.combo_count) OVER ()) /
             NULLIF(MAX(tc.combo_count) OVER () - MIN(tc.combo_count) OVER (), 0)
      END AS intent_score
    FROM token_combos tc
    WHERE LENGTH(tc.token) > 1 -- Filter out single letters
  )
  SELECT
    ts.token,
    ts.combo_count::INTEGER,
    COALESCE(ts.intent_score, 0)::FLOAT AS intent_score
  FROM token_stats ts
  ORDER BY ts.intent_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE keyword_popularity_scores IS
  'Stores computed popularity scores (0-100) for iOS keywords. Updated daily via cron job. MVP version (Option A) without Google Trends.';

COMMENT ON COLUMN keyword_popularity_scores.autocomplete_score IS
  'Score from Apple autocomplete (0-1). Based on rank position in suggestions. Fetched via autocomplete-intelligence edge function.';

COMMENT ON COLUMN keyword_popularity_scores.intent_score IS
  'Score from combo participation (0-1). Measures keyword breadth across apps. Higher = appears in more combos.';

COMMENT ON COLUMN keyword_popularity_scores.length_prior IS
  'Short-tail bias (0-1). Single words score higher than long phrases. Formula: 1 / word_count.';

COMMENT ON COLUMN keyword_popularity_scores.popularity_score IS
  'Final score (0-100). MVP Formula: (autocomplete * 0.6) + (intent * 0.3) + (length * 0.1) * 100';

COMMENT ON COLUMN keyword_popularity_scores.data_quality IS
  'Data quality indicator: complete (all sources ok), partial (some failed), stale (>24h old), estimated (no data, using fallback)';

COMMENT ON COLUMN keyword_popularity_scores.scoring_version IS
  'Tracks formula version for A/B testing and historical analysis. Current: v1-mvp-no-trends';

COMMENT ON FUNCTION get_stale_keywords IS
  'Returns keywords that need refresh (older than max_age_hours). Used by daily cron job.';

COMMENT ON FUNCTION calculate_token_intent_scores IS
  'Calculates intent scores for tokens based on combo participation in last 30 days. Higher score = token appears in more combos = broader intent.';
