/**
 * LLM Visibility Tables
 *
 * Stores LLM discoverability analysis results and snapshots.
 *
 * Phase 1: Analysis storage and caching
 * Phase 2: Rule overrides and AI-generated descriptions
 */

-- ============================================================================
-- Analysis Results Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS llm_visibility_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  monitored_app_id uuid NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  source_snapshot_id uuid REFERENCES aso_audit_snapshots(id) ON DELETE SET NULL,

  -- Scores (0-100)
  overall_score numeric(5,2) NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  factual_grounding_score numeric(5,2) NOT NULL CHECK (factual_grounding_score BETWEEN 0 AND 100),
  semantic_clusters_score numeric(5,2) NOT NULL CHECK (semantic_clusters_score BETWEEN 0 AND 100),
  structure_readability_score numeric(5,2) NOT NULL CHECK (structure_readability_score BETWEEN 0 AND 100),
  intent_coverage_score numeric(5,2) NOT NULL CHECK (intent_coverage_score BETWEEN 0 AND 100),
  snippet_quality_score numeric(5,2) NOT NULL CHECK (snippet_quality_score BETWEEN 0 AND 100),
  safety_credibility_score numeric(5,2) NOT NULL CHECK (safety_credibility_score BETWEEN 0 AND 100),

  -- Structured analysis data (JSONB)
  findings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  snippets_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  cluster_coverage_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  intent_coverage_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  structure_metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Description metadata (for caching)
  description_hash varchar(64) NOT NULL,  -- SHA256
  description_length int NOT NULL,

  -- Rules metadata
  rules_version varchar(20) NOT NULL DEFAULT '1.0.0',
  rules_scope varchar(20) NOT NULL DEFAULT 'base',
  vertical_id varchar(50),
  market_id varchar(10),

  -- Performance metadata
  analysis_duration_ms int NOT NULL,
  cache_hit boolean NOT NULL DEFAULT false,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Indexes for efficient querying
  CONSTRAINT unique_analysis_per_description_version
    UNIQUE(monitored_app_id, description_hash, rules_version)
);

-- Indexes
CREATE INDEX idx_llm_analysis_app ON llm_visibility_analysis(monitored_app_id, created_at DESC);
CREATE INDEX idx_llm_analysis_org ON llm_visibility_analysis(organization_id);
CREATE INDEX idx_llm_analysis_cache ON llm_visibility_analysis(description_hash, rules_version);
CREATE INDEX idx_llm_analysis_scores ON llm_visibility_analysis(overall_score DESC);

-- Updated at trigger
CREATE TRIGGER llm_visibility_analysis_updated_at
  BEFORE UPDATE ON llm_visibility_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Description Snapshots Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS llm_description_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  monitored_app_id uuid NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,

  -- Description content
  source varchar(20) NOT NULL CHECK (source IN ('original', 'ai_generated', 'manual_edit')),
  description_text text NOT NULL,

  -- Analysis link (optional)
  analysis_id uuid REFERENCES llm_visibility_analysis(id) ON DELETE SET NULL,

  -- Score snapshot (denormalized for quick access)
  overall_score numeric(5,2) CHECK (overall_score BETWEEN 0 AND 100),

  -- Status
  is_active boolean NOT NULL DEFAULT false,  -- Only one active per app

  -- Audit
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_llm_snapshots_app ON llm_description_snapshots(monitored_app_id, created_at DESC);

-- Unique partial index: only one active snapshot per app
CREATE UNIQUE INDEX idx_llm_snapshots_unique_active
  ON llm_description_snapshots(monitored_app_id)
  WHERE is_active = true;

-- ============================================================================
-- Rule Overrides Table (Phase 2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS llm_visibility_rule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope varchar(20) NOT NULL CHECK (scope IN ('vertical', 'market', 'client')),
  vertical varchar(50),
  market varchar(10),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  monitored_app_id uuid REFERENCES monitored_apps(id) ON DELETE CASCADE,

  -- Override data (partial rules)
  rules_override jsonb NOT NULL,

  -- Metadata
  notes text,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Scope constraints
  CONSTRAINT unique_override_scope
    UNIQUE(scope, vertical, market, organization_id, monitored_app_id, version),

  CHECK (
    (scope = 'vertical' AND vertical IS NOT NULL AND market IS NULL AND organization_id IS NULL) OR
    (scope = 'market' AND market IS NOT NULL AND vertical IS NULL AND organization_id IS NULL) OR
    (scope = 'client' AND organization_id IS NOT NULL AND vertical IS NULL AND market IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_llm_overrides_vertical ON llm_visibility_rule_overrides(vertical) WHERE scope = 'vertical';
CREATE INDEX idx_llm_overrides_market ON llm_visibility_rule_overrides(market) WHERE scope = 'market';
CREATE INDEX idx_llm_overrides_client ON llm_visibility_rule_overrides(organization_id) WHERE scope = 'client';

-- Updated at trigger
CREATE TRIGGER llm_visibility_rule_overrides_updated_at
  BEFORE UPDATE ON llm_visibility_rule_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Analysis Cache (Materialized View for Performance)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS llm_visibility_latest_analysis AS
SELECT DISTINCT ON (monitored_app_id)
  id,
  organization_id,
  monitored_app_id,
  overall_score,
  factual_grounding_score,
  semantic_clusters_score,
  structure_readability_score,
  intent_coverage_score,
  snippet_quality_score,
  safety_credibility_score,
  description_hash,
  rules_version,
  created_at
FROM llm_visibility_analysis
ORDER BY monitored_app_id, created_at DESC;

-- Index for fast lookups
CREATE UNIQUE INDEX idx_llm_latest_app ON llm_visibility_latest_analysis(monitored_app_id);

-- Refresh function (call after inserts)
CREATE OR REPLACE FUNCTION refresh_llm_visibility_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY llm_visibility_latest_analysis;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper Functions
-- ============================================================================

/**
 * Get latest LLM visibility score for an app
 */
CREATE OR REPLACE FUNCTION get_latest_llm_visibility_score(app_id uuid)
RETURNS numeric AS $$
  SELECT overall_score
  FROM llm_visibility_latest_analysis
  WHERE monitored_app_id = app_id
  LIMIT 1;
$$ LANGUAGE sql STABLE;

/**
 * Check if description has changed since last analysis
 */
CREATE OR REPLACE FUNCTION llm_description_changed(
  app_id uuid,
  new_description text,
  new_hash varchar(64)
)
RETURNS boolean AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM llm_visibility_analysis
    WHERE monitored_app_id = app_id
      AND description_hash = new_hash
    LIMIT 1
  );
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE llm_visibility_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_description_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_visibility_rule_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their organization's data
CREATE POLICY llm_analysis_org_isolation ON llm_visibility_analysis
  FOR ALL
  USING (user_belongs_to_organization(llm_visibility_analysis.organization_id));

CREATE POLICY llm_snapshots_org_isolation ON llm_description_snapshots
  FOR ALL
  USING (user_belongs_to_organization(llm_description_snapshots.organization_id));

CREATE POLICY llm_overrides_org_isolation ON llm_visibility_rule_overrides
  FOR ALL
  USING (
    llm_visibility_rule_overrides.organization_id IS NULL OR  -- Global overrides (admin only)
    user_belongs_to_organization(llm_visibility_rule_overrides.organization_id)
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE llm_visibility_analysis IS
  'LLM discoverability analysis results for app descriptions';

COMMENT ON TABLE llm_description_snapshots IS
  'Version history of app descriptions (original, optimized, manual edits)';

COMMENT ON TABLE llm_visibility_rule_overrides IS
  'Custom LLM visibility rules per vertical/market/client';

COMMENT ON COLUMN llm_visibility_analysis.description_hash IS
  'SHA256 hash of description + rules_version for caching';

COMMENT ON COLUMN llm_visibility_analysis.cache_hit IS
  'Whether this analysis was served from cache (for cost tracking)';
