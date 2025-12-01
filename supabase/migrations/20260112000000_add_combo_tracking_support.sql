-- Migration: Add Combo Tracking Support to Keyword System
-- Description: Extends keywords table to support multi-word combos and top 100 rankings
-- Date: 2025-01-12
-- Feature: Combo Ranking Column in All Combos Table

-- ============================================================================
-- STEP 1: Add combo tracking fields to keywords table
-- ============================================================================

-- Add keyword_type to distinguish single keywords from multi-word combos
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS keyword_type TEXT DEFAULT 'single'
  CHECK (keyword_type IN ('single', 'combo'));

COMMENT ON COLUMN keywords.keyword_type IS
  'Type of keyword: single (one word) or combo (multi-word phrase like "wellness self")';

-- Add word_count as a generated column for analytics
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS word_count INTEGER;

-- Create function to calculate word count
CREATE OR REPLACE FUNCTION calculate_word_count(text_input TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN array_length(string_to_array(trim(text_input), ' '), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing rows to set word_count
UPDATE keywords
SET word_count = calculate_word_count(keyword)
WHERE word_count IS NULL;

-- Make word_count NOT NULL after populating
ALTER TABLE keywords
  ALTER COLUMN word_count SET NOT NULL;

-- Create trigger to auto-calculate word_count on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_keyword_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = calculate_word_count(NEW.keyword);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_keyword_word_count ON keywords;
CREATE TRIGGER trigger_update_keyword_word_count
  BEFORE INSERT OR UPDATE OF keyword ON keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_keyword_word_count();

COMMENT ON COLUMN keywords.word_count IS
  'Number of words in the keyword (auto-calculated on insert/update)';

-- Add index for combo lookups
CREATE INDEX IF NOT EXISTS idx_keywords_type_word_count
  ON keywords(keyword_type, word_count);

CREATE INDEX IF NOT EXISTS idx_keywords_app_type
  ON keywords(app_id, keyword_type, is_tracked);

-- ============================================================================
-- STEP 2: Update keyword_rankings to support top 100 rankings
-- ============================================================================

-- Drop old constraint that limited to position 50
ALTER TABLE keyword_rankings
  DROP CONSTRAINT IF EXISTS keyword_rankings_position_check;

-- Add new constraint for top 100
ALTER TABLE keyword_rankings
  ADD CONSTRAINT keyword_rankings_position_check
  CHECK (position IS NULL OR (position >= 1 AND position <= 100));

-- Update comment to reflect top 100
COMMENT ON COLUMN keyword_rankings.position IS
  'Ranking position (1-100, NULL if not in top 100). Updated from previous limit of 50.';

-- Update is_ranking logic comment
COMMENT ON COLUMN keyword_rankings.is_ranking IS
  'true if position <= 100 (was 50 before). Indicates app ranks in top 100 for this keyword.';

-- ============================================================================
-- STEP 3: Create visibility score calculation function for top 100
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_visibility_score(
  p_position INTEGER,
  p_search_volume INTEGER
)
RETURNS NUMERIC AS $$
BEGIN
  -- Return 0 if not ranking or no volume
  IF p_position IS NULL OR p_position > 100 OR p_search_volume IS NULL THEN
    RETURN 0;
  END IF;

  -- Visibility formula: (101 - position) * search_volume / 100
  -- Position 1 = 100% visibility, Position 100 = 1% visibility
  RETURN ROUND((101 - p_position)::NUMERIC * p_search_volume / 100.0, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_visibility_score IS
  'Calculates visibility score for rankings in top 100. Formula: (101 - position) * search_volume / 100';

-- ============================================================================
-- STEP 4: Add helper function to get latest combo ranking
-- ============================================================================

CREATE OR REPLACE FUNCTION get_latest_combo_ranking(
  p_app_id UUID,
  p_combo TEXT,
  p_platform TEXT DEFAULT 'ios',
  p_region TEXT DEFAULT 'us'
)
RETURNS TABLE(
  "position" INTEGER,
  is_ranking BOOLEAN,
  snapshot_date DATE,
  position_change INTEGER,
  trend TEXT,
  visibility_score NUMERIC,
  serp_snapshot JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kr.position,
    kr.is_ranking,
    kr.snapshot_date,
    kr.position_change,
    kr.trend,
    kr.visibility_score,
    kr.serp_snapshot
  FROM keywords k
  INNER JOIN keyword_rankings kr ON kr.keyword_id = k.id
  WHERE k.app_id = p_app_id
    AND k.keyword = p_combo
    AND k.platform = p_platform
    AND k.region = p_region
  ORDER BY kr.snapshot_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_latest_combo_ranking IS
  'Gets the most recent ranking snapshot for a specific combo. Used by frontend to display current ranking.';

GRANT EXECUTE ON FUNCTION get_latest_combo_ranking TO authenticated;

-- ============================================================================
-- STEP 5: Add helper function to get combo ranking history
-- ============================================================================

CREATE OR REPLACE FUNCTION get_combo_ranking_history(
  p_app_id UUID,
  p_combo TEXT,
  p_days INTEGER DEFAULT 30,
  p_platform TEXT DEFAULT 'ios',
  p_region TEXT DEFAULT 'us'
)
RETURNS TABLE(
  snapshot_date DATE,
  "position" INTEGER,
  is_ranking BOOLEAN,
  position_change INTEGER,
  trend TEXT,
  visibility_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kr.snapshot_date,
    kr.position,
    kr.is_ranking,
    kr.position_change,
    kr.trend,
    kr.visibility_score
  FROM keywords k
  INNER JOIN keyword_rankings kr ON kr.keyword_id = k.id
  WHERE k.app_id = p_app_id
    AND k.keyword = p_combo
    AND k.platform = p_platform
    AND k.region = p_region
    AND kr.snapshot_date >= CURRENT_DATE - p_days
  ORDER BY kr.snapshot_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_combo_ranking_history IS
  'Gets ranking history for a combo over the specified number of days. Used for historical charts.';

GRANT EXECUTE ON FUNCTION get_combo_ranking_history TO authenticated;

-- ============================================================================
-- STEP 6: Add helper function to get all combo rankings for an app
-- ============================================================================

CREATE OR REPLACE FUNCTION get_app_combo_rankings(
  p_app_id UUID,
  p_platform TEXT DEFAULT 'ios',
  p_region TEXT DEFAULT 'us'
)
RETURNS TABLE(
  keyword_id UUID,
  combo TEXT,
  word_count INTEGER,
  "position" INTEGER,
  is_ranking BOOLEAN,
  snapshot_date DATE,
  trend TEXT,
  visibility_score NUMERIC,
  is_stale BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id as keyword_id,
    k.keyword as combo,
    k.word_count,
    kr.position,
    kr.is_ranking,
    kr.snapshot_date,
    kr.trend,
    kr.visibility_score,
    (kr.snapshot_date < CURRENT_DATE - INTERVAL '1 day') as is_stale
  FROM keywords k
  LEFT JOIN LATERAL (
    SELECT *
    FROM keyword_rankings
    WHERE keyword_id = k.id
    ORDER BY snapshot_date DESC
    LIMIT 1
  ) kr ON true
  WHERE k.app_id = p_app_id
    AND k.platform = p_platform
    AND k.region = p_region
    AND k.keyword_type = 'combo'
    AND k.is_tracked = true
  ORDER BY
    CASE
      WHEN kr.position IS NOT NULL THEN kr.position
      ELSE 999
    END ASC,
    k.keyword ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_app_combo_rankings IS
  'Gets all combo rankings for an app with latest snapshot data. Returns combos sorted by ranking position. Includes is_stale flag for combos needing refresh.';

GRANT EXECUTE ON FUNCTION get_app_combo_rankings TO authenticated;

-- ============================================================================
-- STEP 7: Update keyword refresh queue to prioritize stale combo rankings
-- ============================================================================

-- Add combo-specific priority boost
CREATE OR REPLACE FUNCTION calculate_refresh_priority(
  p_keyword_type TEXT,
  p_last_tracked_at TIMESTAMPTZ,
  p_is_ranking BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
  base_priority INTEGER := 50;
  priority INTEGER;
BEGIN
  -- Start with base priority
  priority := base_priority;

  -- Boost for combos (they're tracked more actively)
  IF p_keyword_type = 'combo' THEN
    priority := priority + 10;
  END IF;

  -- Boost for ranking keywords (we care more about tracking these)
  IF p_is_ranking THEN
    priority := priority + 20;
  END IF;

  -- Increase priority based on staleness
  IF p_last_tracked_at IS NULL THEN
    priority := priority + 30; -- Never tracked
  ELSIF p_last_tracked_at < NOW() - INTERVAL '2 days' THEN
    priority := priority + 20; -- Very stale
  ELSIF p_last_tracked_at < NOW() - INTERVAL '1 day' THEN
    priority := priority + 10; -- Stale
  END IF;

  RETURN priority;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_refresh_priority IS
  'Calculates priority for keyword refresh jobs. Combos and ranking keywords get higher priority.';

-- ============================================================================
-- STEP 8: Create indexes for performance optimization
-- ============================================================================

-- Index for getting stale combos that need refresh
CREATE INDEX IF NOT EXISTS idx_keywords_stale_combos
  ON keywords(app_id, keyword_type, is_tracked, last_tracked_at)
  WHERE keyword_type = 'combo' AND is_tracked = true;

-- Index for ranking position lookups (used in sorting)
CREATE INDEX IF NOT EXISTS idx_rankings_position_recent
  ON keyword_rankings(keyword_id, snapshot_date DESC, position)
  WHERE position IS NOT NULL;

-- Index for trend analysis queries
CREATE INDEX IF NOT EXISTS idx_rankings_trend_analysis
  ON keyword_rankings(keyword_id, snapshot_date DESC)
  INCLUDE (position, position_change, trend);

-- ============================================================================
-- STEP 9: Add RLS policies for combo ranking access
-- ============================================================================

-- Policy for authenticated users to read their own org's combo rankings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'keyword_rankings'
    AND policyname = 'Users can view combo rankings for their org'
  ) THEN
    CREATE POLICY "Users can view combo rankings for their org"
      ON keyword_rankings
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM keywords k
          INNER JOIN user_roles ur ON ur.organization_id = k.organization_id
          WHERE k.id = keyword_rankings.keyword_id
            AND ur.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- ============================================================================
-- STEP 10: Create view for easy combo ranking queries
-- ============================================================================

CREATE OR REPLACE VIEW combo_rankings_latest AS
SELECT
  k.id as keyword_id,
  k.app_id,
  k.organization_id,
  k.keyword as combo,
  k.word_count,
  k.platform,
  k.region,
  k.last_tracked_at,
  kr.position,
  kr.is_ranking,
  kr.snapshot_date,
  kr.position_change,
  kr.trend,
  kr.visibility_score,
  (kr.snapshot_date < CURRENT_DATE - INTERVAL '1 day') as is_stale
FROM keywords k
LEFT JOIN LATERAL (
  SELECT *
  FROM keyword_rankings
  WHERE keyword_id = k.id
  ORDER BY snapshot_date DESC
  LIMIT 1
) kr ON true
WHERE k.keyword_type = 'combo'
  AND k.is_tracked = true;

COMMENT ON VIEW combo_rankings_latest IS
  'Materialized view showing latest ranking for all tracked combos. Used by frontend for fast queries.';

-- Grant access to authenticated users
GRANT SELECT ON combo_rankings_latest TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Added keyword_type and word_count columns to keywords table
-- ✅ Updated keyword_rankings to support top 100 (was 50)
-- ✅ Created helper functions for frontend queries
-- ✅ Added indexes for performance
-- ✅ Created RLS policies for security
-- ✅ Created combo_rankings_latest view for easy access
