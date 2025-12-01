-- Combo Rankings Cache Table
-- Stores competition data for keyword combos without FK constraints
-- Used for ephemeral/monitored apps where FK relationship may be broken

CREATE TABLE IF NOT EXISTS combo_rankings_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  app_store_id TEXT NOT NULL, -- iTunes trackId (e.g., "6477780060")
  combo TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  country TEXT NOT NULL DEFAULT 'us',

  -- Ranking data
  position INTEGER, -- 1-200 or null
  is_ranking BOOLEAN NOT NULL DEFAULT false,
  total_results INTEGER, -- Competition number (e.g., 158)

  -- Metadata
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Trend data (optional, only if we have history)
  trend TEXT, -- 'up', 'down', 'stable', 'new', null
  position_change INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one record per combo per day
  UNIQUE(app_store_id, combo, platform, country, snapshot_date)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_combo_cache_app_date
  ON combo_rankings_cache(app_store_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_combo_cache_lookup
  ON combo_rankings_cache(app_store_id, combo, platform, country, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_combo_cache_org
  ON combo_rankings_cache(organization_id);

-- RLS policies
ALTER TABLE combo_rankings_cache ENABLE ROW LEVEL SECURITY;

-- Users can read cache for their organization
DROP POLICY IF EXISTS "Users can read combo cache for their org" ON combo_rankings_cache;
CREATE POLICY "Users can read combo cache for their org"
  ON combo_rankings_cache
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Service role can insert/update cache
DROP POLICY IF EXISTS "Service role can manage combo cache" ON combo_rankings_cache;
CREATE POLICY "Service role can manage combo cache"
  ON combo_rankings_cache
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Automatic updated_at trigger
CREATE OR REPLACE FUNCTION update_combo_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS combo_cache_updated_at ON combo_rankings_cache;
CREATE TRIGGER combo_cache_updated_at
  BEFORE UPDATE ON combo_rankings_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_combo_cache_updated_at();

COMMENT ON TABLE combo_rankings_cache IS 'Cache for keyword combo rankings without FK constraints. Used for ephemeral mode and when FK relationship is broken.';
