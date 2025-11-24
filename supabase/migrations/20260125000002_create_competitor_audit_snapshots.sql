-- Migration: Create competitor_audit_snapshots table
-- Purpose: Store complete audit results for competitor apps with CASCADE DELETE
-- Date: 2025-01-25

-- =====================================================================
-- TABLE: competitor_audit_snapshots
-- =====================================================================
-- Stores full metadata audit results for competitor apps
-- Implements CASCADE DELETE so competitor audits are removed when:
-- 1. Target app is deleted
-- 2. Competitor relationship is removed
-- =====================================================================

CREATE TABLE IF NOT EXISTS competitor_audit_snapshots (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys with CASCADE DELETE
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES app_competitors(id) ON DELETE CASCADE,

  -- Metadata (Raw from App Store)
  metadata JSONB NOT NULL,
  -- Expected structure:
  -- {
  --   "app_store_id": "123456789",
  --   "title": "...",
  --   "subtitle": "...",
  --   "description": "...",
  --   "keywords": "...",
  --   "icon_url": "...",
  --   "rating": 4.5,
  --   "review_count": 12500,
  --   "category": "Education",
  --   "price": "Free",
  --   "country": "US"
  -- }

  -- Audit Results (Complete UnifiedMetadataAuditResult)
  audit_data JSONB NOT NULL,
  -- Expected structure:
  -- {
  --   "elementScoring": {...},
  --   "comboCoverage": {...},
  --   "keywordCoverage": {...},
  --   "intentCoverage": {...},
  --   "discoveryFootprint": {...},
  --   "kpis": {...}
  -- }

  -- Rule Configuration (Which brain rules were used)
  rule_config JSONB DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "vertical": "education",
  --   "market": "language_learning",
  --   "useTargetAppRules": true,
  --   "customRules": []
  -- }

  -- Quick Query Fields (Extracted from audit_data for performance)
  overall_score NUMERIC(5,2),
  title_score NUMERIC(5,2),
  subtitle_score NUMERIC(5,2),
  description_score NUMERIC(5,2),

  -- Intent Coverage (%)
  intent_coverage_informational NUMERIC(5,2),
  intent_coverage_commercial NUMERIC(5,2),
  intent_coverage_transactional NUMERIC(5,2),
  intent_coverage_navigational NUMERIC(5,2),

  -- Discovery Footprint Counts
  discovery_learning_count INTEGER,
  discovery_outcome_count INTEGER,
  discovery_brand_count INTEGER,
  discovery_noise_count INTEGER,

  -- Combo Stats
  total_combos INTEGER,
  existing_combos INTEGER,
  missing_combos INTEGER,
  combo_coverage_percent NUMERIC(5,2),

  -- Character Usage
  title_char_count INTEGER,
  subtitle_char_count INTEGER,
  description_char_count INTEGER,

  -- Status & Timestamps
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- INDEXES
-- =====================================================================

-- Primary lookup: Get all audits for a competitor
CREATE INDEX idx_competitor_audit_snapshots_competitor
  ON competitor_audit_snapshots(competitor_id, created_at DESC);

-- Get all competitor audits for a target app
CREATE INDEX idx_competitor_audit_snapshots_target_app
  ON competitor_audit_snapshots(target_app_id, created_at DESC);

-- Organization-level queries
CREATE INDEX idx_competitor_audit_snapshots_org
  ON competitor_audit_snapshots(organization_id, created_at DESC);

-- Find latest audit per competitor
CREATE INDEX idx_competitor_audit_snapshots_latest
  ON competitor_audit_snapshots(competitor_id, created_at DESC)
  WHERE status = 'completed';

-- Score-based queries (find top/bottom performers)
CREATE INDEX idx_competitor_audit_snapshots_scores
  ON competitor_audit_snapshots(target_app_id, overall_score DESC)
  WHERE status = 'completed';

-- Intent-based analysis
CREATE INDEX idx_competitor_audit_snapshots_intent
  ON competitor_audit_snapshots(target_app_id, intent_coverage_transactional DESC)
  WHERE status = 'completed';

-- GIN index for JSONB queries
CREATE INDEX idx_competitor_audit_snapshots_audit_data
  ON competitor_audit_snapshots USING GIN (audit_data);

CREATE INDEX idx_competitor_audit_snapshots_metadata
  ON competitor_audit_snapshots USING GIN (metadata);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE competitor_audit_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view competitor audits for their organization
CREATE POLICY select_competitor_audit_snapshots
  ON competitor_audit_snapshots
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

-- Policy: Users can insert competitor audits for their organization
CREATE POLICY insert_competitor_audit_snapshots
  ON competitor_audit_snapshots
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update competitor audits for their organization
CREATE POLICY update_competitor_audit_snapshots
  ON competitor_audit_snapshots
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins can delete competitor audits
CREATE POLICY delete_competitor_audit_snapshots
  ON competitor_audit_snapshots
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

-- Function: Get latest audit for a competitor
CREATE OR REPLACE FUNCTION get_latest_competitor_audit(p_competitor_id UUID)
RETURNS competitor_audit_snapshots
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM competitor_audit_snapshots
  WHERE competitor_id = p_competitor_id
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Function: Get all latest audits for a target app's competitors
CREATE OR REPLACE FUNCTION get_latest_competitor_audits_for_app(p_target_app_id UUID)
RETURNS SETOF competitor_audit_snapshots
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (cas.competitor_id) cas.*
  FROM competitor_audit_snapshots cas
  WHERE cas.target_app_id = p_target_app_id
    AND cas.status = 'completed'
  ORDER BY cas.competitor_id, cas.created_at DESC;
$$;

-- Function: Check if competitor audit is stale (older than 24 hours)
CREATE OR REPLACE FUNCTION is_competitor_audit_stale(p_competitor_id UUID, p_max_age_hours INTEGER DEFAULT 24)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT created_at < NOW() - (p_max_age_hours || ' hours')::INTERVAL
      FROM competitor_audit_snapshots
      WHERE competitor_id = p_competitor_id
        AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    ),
    TRUE -- Return TRUE if no audit exists
  );
$$;

-- Function: Update quick query fields from audit_data
CREATE OR REPLACE FUNCTION extract_competitor_audit_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Extract scores
  NEW.overall_score := (NEW.audit_data->'kpis'->>'overall_score')::NUMERIC;
  NEW.title_score := (NEW.audit_data->'elementScoring'->'title'->>'score')::NUMERIC;
  NEW.subtitle_score := (NEW.audit_data->'elementScoring'->'subtitle'->>'score')::NUMERIC;
  NEW.description_score := (NEW.audit_data->'elementScoring'->'description'->>'score')::NUMERIC;

  -- Extract intent coverage
  NEW.intent_coverage_informational := (NEW.audit_data->'intentCoverage'->'searchIntent'->'informational'->>'percentage')::NUMERIC;
  NEW.intent_coverage_commercial := (NEW.audit_data->'intentCoverage'->'searchIntent'->'commercial'->>'percentage')::NUMERIC;
  NEW.intent_coverage_transactional := (NEW.audit_data->'intentCoverage'->'searchIntent'->'transactional'->>'percentage')::NUMERIC;
  NEW.intent_coverage_navigational := (NEW.audit_data->'intentCoverage'->'searchIntent'->'navigational'->>'percentage')::NUMERIC;

  -- Extract discovery footprint counts
  NEW.discovery_learning_count := (NEW.audit_data->'discoveryFootprint'->'learning'->>'count')::INTEGER;
  NEW.discovery_outcome_count := (NEW.audit_data->'discoveryFootprint'->'outcome'->>'count')::INTEGER;
  NEW.discovery_brand_count := (NEW.audit_data->'discoveryFootprint'->'brand'->>'count')::INTEGER;
  NEW.discovery_noise_count := (NEW.audit_data->'discoveryFootprint'->'noise'->>'count')::INTEGER;

  -- Extract combo stats
  NEW.total_combos := (NEW.audit_data->'comboCoverage'->'stats'->>'totalPossible')::INTEGER;
  NEW.existing_combos := (NEW.audit_data->'comboCoverage'->'stats'->>'existing')::INTEGER;
  NEW.missing_combos := (NEW.audit_data->'comboCoverage'->'stats'->>'missing')::INTEGER;
  NEW.combo_coverage_percent := (NEW.audit_data->'comboCoverage'->'stats'->>'coverage')::NUMERIC;

  -- Extract character usage
  NEW.title_char_count := LENGTH(NEW.metadata->>'title');
  NEW.subtitle_char_count := LENGTH(NEW.metadata->>'subtitle');
  NEW.description_char_count := LENGTH(NEW.metadata->>'description');

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;

-- Trigger: Auto-extract metrics on insert/update
CREATE TRIGGER trigger_extract_competitor_audit_metrics
  BEFORE INSERT OR UPDATE OF audit_data
  ON competitor_audit_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION extract_competitor_audit_metrics();

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE competitor_audit_snapshots IS 'Stores complete metadata audit results for competitor apps. Implements CASCADE DELETE for automatic cleanup.';
COMMENT ON COLUMN competitor_audit_snapshots.metadata IS 'Raw competitor metadata fetched from App Store API';
COMMENT ON COLUMN competitor_audit_snapshots.audit_data IS 'Complete UnifiedMetadataAuditResult from ASO Brain analysis';
COMMENT ON COLUMN competitor_audit_snapshots.rule_config IS 'Configuration of which ASO Brain rules were applied';
COMMENT ON COLUMN competitor_audit_snapshots.overall_score IS 'Extracted from audit_data for quick queries without parsing JSON';
COMMENT ON FUNCTION get_latest_competitor_audit IS 'Returns most recent completed audit for a specific competitor';
COMMENT ON FUNCTION get_latest_competitor_audits_for_app IS 'Returns latest audit for each competitor of a target app';
COMMENT ON FUNCTION is_competitor_audit_stale IS 'Checks if competitor audit needs refresh based on age threshold';
