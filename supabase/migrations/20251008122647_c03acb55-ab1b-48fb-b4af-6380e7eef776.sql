-- ============================================================================
-- Schema Enhancement Migration
-- Description: Adds missing fields to match existing codebase expectations
-- Date: 2025-01-08
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENHANCE chatgpt_audit_runs
-- ----------------------------------------------------------------------------

ALTER TABLE chatgpt_audit_runs 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS app_id TEXT,
  ADD COLUMN IF NOT EXISTS total_queries INTEGER DEFAULT 0;

COMMENT ON COLUMN chatgpt_audit_runs.name IS 'Human-readable audit run name';
COMMENT ON COLUMN chatgpt_audit_runs.app_id IS 'Target app ID for app-specific audits';
COMMENT ON COLUMN chatgpt_audit_runs.total_queries IS 'Total number of queries in this audit run';

-- ----------------------------------------------------------------------------
-- 2. ENHANCE chatgpt_queries
-- ----------------------------------------------------------------------------

ALTER TABLE chatgpt_queries
  ADD COLUMN IF NOT EXISTS query_category TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN chatgpt_queries.query_category IS 'Category classification (e.g., product, comparison, informational)';
COMMENT ON COLUMN chatgpt_queries.updated_at IS 'Last update timestamp';
COMMENT ON COLUMN chatgpt_queries.processed_at IS 'When query was processed by AI';

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_chatgpt_queries_updated_at ON chatgpt_queries;
CREATE TRIGGER update_chatgpt_queries_updated_at
  BEFORE UPDATE ON chatgpt_queries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. ENHANCE chatgpt_query_results
-- ----------------------------------------------------------------------------

ALTER TABLE chatgpt_query_results
  ADD COLUMN IF NOT EXISTS competitors_mentioned TEXT[],
  ADD COLUMN IF NOT EXISTS mention_context TEXT,
  ADD COLUMN IF NOT EXISTS processing_metadata JSONB;

COMMENT ON COLUMN chatgpt_query_results.competitors_mentioned IS 'Array of competitor names mentioned in response';
COMMENT ON COLUMN chatgpt_query_results.mention_context IS 'Context surrounding the mention';
COMMENT ON COLUMN chatgpt_query_results.processing_metadata IS 'Additional processing metadata from AI analysis';

-- ----------------------------------------------------------------------------
-- 4. ENHANCE chatgpt_visibility_scores
-- ----------------------------------------------------------------------------

ALTER TABLE chatgpt_visibility_scores
  ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS overall_score DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS mention_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS avg_position DECIMAL(4,2);

COMMENT ON COLUMN chatgpt_visibility_scores.calculated_at IS 'Timestamp when score was calculated';
COMMENT ON COLUMN chatgpt_visibility_scores.overall_score IS 'Overall visibility score (0-100)';
COMMENT ON COLUMN chatgpt_visibility_scores.mention_rate IS 'Rate of mentions across queries';
COMMENT ON COLUMN chatgpt_visibility_scores.avg_position IS 'Average mention position (alias for average_position)';

-- Create view to unify avg_position and average_position
CREATE OR REPLACE VIEW chatgpt_visibility_scores_unified AS
SELECT 
  *,
  COALESCE(avg_position, average_position) as position
FROM chatgpt_visibility_scores;

-- ----------------------------------------------------------------------------
-- 5. ADD chatgpt_ranking_snapshots TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chatgpt_ranking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  audit_run_id UUID NOT NULL REFERENCES chatgpt_audit_runs(id) ON DELETE CASCADE,
  entity_name VARCHAR(255) NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Ranking Metrics
  ranking_position INTEGER,
  visibility_score DECIMAL(5,2),
  mention_count INTEGER DEFAULT 0,
  avg_position DECIMAL(4,2),
  sentiment_score DECIMAL(3,2),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_entity_snapshot UNIQUE(audit_run_id, entity_name, snapshot_date)
);

COMMENT ON TABLE chatgpt_ranking_snapshots IS 'Historical snapshots of ChatGPT ranking positions';

-- Enable RLS
ALTER TABLE chatgpt_ranking_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "org_access_ranking_snapshots" ON chatgpt_ranking_snapshots;
CREATE POLICY "org_access_ranking_snapshots" ON chatgpt_ranking_snapshots
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ) OR
    is_super_admin(auth.uid())
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_org ON chatgpt_ranking_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_audit ON chatgpt_ranking_snapshots(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_date ON chatgpt_ranking_snapshots(snapshot_date DESC);

-- ----------------------------------------------------------------------------
-- 6. FIX metadata_versions app_store_id COMPATIBILITY
-- ----------------------------------------------------------------------------

-- Add app_store_id as alias for app_id (for backward compatibility)
ALTER TABLE metadata_versions
  ADD COLUMN IF NOT EXISTS app_store_id VARCHAR(255);

-- Create trigger to sync app_store_id with app_id
CREATE OR REPLACE FUNCTION sync_app_store_id()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT/UPDATE, sync app_store_id with app_id
  IF NEW.app_id IS NOT NULL AND NEW.app_store_id IS NULL THEN
    NEW.app_store_id := NEW.app_id;
  ELSIF NEW.app_store_id IS NOT NULL AND NEW.app_id IS NULL THEN
    NEW.app_id := NEW.app_store_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_metadata_app_ids ON metadata_versions;
CREATE TRIGGER sync_metadata_app_ids
  BEFORE INSERT OR UPDATE ON metadata_versions
  FOR EACH ROW
  EXECUTE FUNCTION sync_app_store_id();

-- Backfill app_store_id for existing records
UPDATE metadata_versions 
SET app_store_id = app_id 
WHERE app_store_id IS NULL AND app_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 7. CREATE INDEXES FOR NEW FIELDS
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_audit_runs_app_id ON chatgpt_audit_runs(app_id) WHERE app_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queries_category ON chatgpt_queries(query_category) WHERE query_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queries_processed_at ON chatgpt_queries(processed_at DESC) WHERE processed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visibility_calculated_at ON chatgpt_visibility_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_metadata_app_store_id ON metadata_versions(app_store_id) WHERE app_store_id IS NOT NULL;