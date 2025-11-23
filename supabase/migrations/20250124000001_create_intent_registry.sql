/**
 * Phase 16: Intent Intelligence Registry - Database Schema
 *
 * Creates tables for managing search intent patterns with vertical/market/client overrides
 *
 * Tables:
 * - aso_intent_patterns: Core intent pattern definitions
 * - aso_intent_pattern_overrides: Scope-specific overrides
 * - aso_intent_metadata: Additional metadata and tagging
 *
 * Intent Types:
 * - informational: "learn", "how to", "guide"
 * - commercial: "best", "top", "recommended"
 * - navigational: brand names, app names
 * - transactional: "download", "buy", "get"
 */

-- ============================================================================
-- Intent Pattern Base Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS aso_intent_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pattern definition
  pattern text NOT NULL,
  intent_type text NOT NULL CHECK (intent_type IN ('informational', 'commercial', 'navigational', 'transactional')),
  example text,
  description text,

  -- Scope
  scope text NOT NULL DEFAULT 'base' CHECK (scope IN ('base', 'vertical', 'market', 'client', 'app')),
  vertical text,
  market text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  app_id text,

  -- Weighting
  weight numeric(4,2) DEFAULT 1.0 CHECK (weight >= 0.1 AND weight <= 3.0),

  -- Pattern matching config
  is_regex boolean DEFAULT false,
  case_sensitive boolean DEFAULT false,
  word_boundary boolean DEFAULT true,

  -- Status
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,

  -- Metadata
  admin_tags text[],
  notes text,

  -- Audit fields
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  version integer DEFAULT 1,

  -- Uniqueness constraint: pattern + scope + vertical + market + organization + app
  UNIQUE NULLS NOT DISTINCT (pattern, scope, vertical, market, organization_id, app_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_intent_patterns_scope ON aso_intent_patterns(scope);
CREATE INDEX idx_intent_patterns_intent_type ON aso_intent_patterns(intent_type);
CREATE INDEX idx_intent_patterns_vertical ON aso_intent_patterns(vertical) WHERE vertical IS NOT NULL;
CREATE INDEX idx_intent_patterns_market ON aso_intent_patterns(market) WHERE market IS NOT NULL;
CREATE INDEX idx_intent_patterns_organization ON aso_intent_patterns(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_intent_patterns_active ON aso_intent_patterns(is_active) WHERE is_active = true;
CREATE INDEX idx_intent_patterns_priority ON aso_intent_patterns(priority DESC);

-- Full-text search on patterns
CREATE INDEX idx_intent_patterns_pattern_search ON aso_intent_patterns USING gin(to_tsvector('english', pattern || ' ' || COALESCE(example, '') || ' ' || COALESCE(description, '')));

COMMENT ON TABLE aso_intent_patterns IS 'Phase 16: Search intent pattern definitions with scope-based overrides';
COMMENT ON COLUMN aso_intent_patterns.pattern IS 'Pattern to match (can be regex if is_regex=true)';
COMMENT ON COLUMN aso_intent_patterns.intent_type IS 'Search intent category: informational, commercial, navigational, transactional';
COMMENT ON COLUMN aso_intent_patterns.scope IS 'Override scope: base, vertical, market, client, app';
COMMENT ON COLUMN aso_intent_patterns.weight IS 'Pattern weight multiplier (0.1-3.0)';
COMMENT ON COLUMN aso_intent_patterns.priority IS 'Evaluation order (higher = earlier), used when patterns overlap';

-- ============================================================================
-- Intent Pattern Overrides (Alternative structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS aso_intent_pattern_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to base pattern
  base_pattern_id uuid REFERENCES aso_intent_patterns(id) ON DELETE CASCADE,

  -- Override scope
  scope text NOT NULL CHECK (scope IN ('vertical', 'market', 'client', 'app')),
  vertical text,
  market text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  app_id text,

  -- Override values (nullable = inherit from base)
  weight_multiplier numeric(4,2) CHECK (weight_multiplier >= 0.1 AND weight_multiplier <= 3.0),
  is_active boolean,
  priority_override integer,

  -- Audit fields
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure one override per scope combination
  UNIQUE NULLS NOT DISTINCT (base_pattern_id, scope, vertical, market, organization_id, app_id)
);

CREATE INDEX idx_intent_overrides_base_pattern ON aso_intent_pattern_overrides(base_pattern_id);
CREATE INDEX idx_intent_overrides_scope ON aso_intent_pattern_overrides(scope);
CREATE INDEX idx_intent_overrides_vertical ON aso_intent_pattern_overrides(vertical) WHERE vertical IS NOT NULL;
CREATE INDEX idx_intent_overrides_market ON aso_intent_pattern_overrides(market) WHERE market IS NOT NULL;
CREATE INDEX idx_intent_overrides_organization ON aso_intent_pattern_overrides(organization_id) WHERE organization_id IS NOT NULL;

COMMENT ON TABLE aso_intent_pattern_overrides IS 'Phase 16: Scope-specific overrides for intent patterns';
COMMENT ON COLUMN aso_intent_pattern_overrides.weight_multiplier IS 'Multiplier applied to base pattern weight';

-- ============================================================================
-- Helper Functions
-- ============================================================================

/**
 * Get effective intent patterns for a given context
 *
 * Merges base patterns with overrides based on precedence:
 * App > Client > Market > Vertical > Base
 */
CREATE OR REPLACE FUNCTION get_effective_intent_patterns(
  p_vertical text DEFAULT NULL,
  p_market text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_app_id text DEFAULT NULL
)
RETURNS TABLE (
  pattern_id uuid,
  pattern text,
  intent_type text,
  example text,
  effective_weight numeric,
  is_active boolean,
  priority integer,
  override_source text,
  has_override boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH base_patterns AS (
    -- Get all active base patterns
    SELECT
      ip.id,
      ip.pattern,
      ip.intent_type,
      ip.example,
      ip.weight,
      ip.is_active,
      ip.priority,
      ip.scope
    FROM aso_intent_patterns ip
    WHERE ip.is_active = true
      AND ip.scope = 'base'
  ),
  applicable_overrides AS (
    -- Find best matching override for each pattern
    SELECT DISTINCT ON (ipo.base_pattern_id)
      ipo.base_pattern_id,
      ipo.weight_multiplier,
      ipo.is_active AS override_active,
      ipo.priority_override,
      ipo.scope AS override_scope,
      -- Priority order: app > client > market > vertical
      CASE
        WHEN ipo.app_id IS NOT NULL THEN 1
        WHEN ipo.organization_id IS NOT NULL THEN 2
        WHEN ipo.market IS NOT NULL AND ipo.vertical IS NOT NULL THEN 3
        WHEN ipo.market IS NOT NULL THEN 4
        WHEN ipo.vertical IS NOT NULL THEN 5
        ELSE 99
      END AS override_priority
    FROM aso_intent_pattern_overrides ipo
    WHERE
      (p_app_id IS NOT NULL AND ipo.app_id = p_app_id)
      OR (p_organization_id IS NOT NULL AND ipo.organization_id = p_organization_id)
      OR (p_market IS NOT NULL AND p_vertical IS NOT NULL AND ipo.market = p_market AND ipo.vertical = p_vertical)
      OR (p_market IS NOT NULL AND ipo.market = p_market AND ipo.vertical IS NULL)
      OR (p_vertical IS NOT NULL AND ipo.vertical = p_vertical AND ipo.market IS NULL)
    ORDER BY ipo.base_pattern_id, override_priority ASC
  )
  SELECT
    bp.id AS pattern_id,
    bp.pattern,
    bp.intent_type,
    bp.example,
    COALESCE(bp.weight * COALESCE(ao.weight_multiplier, 1.0), bp.weight) AS effective_weight,
    COALESCE(ao.override_active, bp.is_active) AS is_active,
    COALESCE(ao.priority_override, bp.priority) AS priority,
    COALESCE(ao.override_scope, 'base') AS override_source,
    (ao.base_pattern_id IS NOT NULL) AS has_override
  FROM base_patterns bp
  LEFT JOIN applicable_overrides ao ON ao.base_pattern_id = bp.id
  WHERE COALESCE(ao.override_active, bp.is_active) = true
  ORDER BY COALESCE(ao.priority_override, bp.priority) DESC, bp.pattern;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_effective_intent_patterns IS 'Phase 16: Returns merged intent patterns with overrides applied based on scope precedence';

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE aso_intent_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_intent_pattern_overrides ENABLE ROW LEVEL SECURITY;

-- Public read access to base and vertical/market patterns
CREATE POLICY intent_patterns_public_read ON aso_intent_patterns
  FOR SELECT
  USING (
    scope IN ('base', 'vertical', 'market')
    AND is_active = true
  );

-- Organization members can read their own client/app patterns
CREATE POLICY intent_patterns_org_read ON aso_intent_patterns
  FOR SELECT
  USING (
    scope IN ('client', 'app')
    AND organization_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Only SUPER_ADMIN users can write
CREATE POLICY intent_patterns_internal_write ON aso_intent_patterns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  );

-- Same for overrides
CREATE POLICY intent_overrides_public_read ON aso_intent_pattern_overrides
  FOR SELECT
  USING (
    scope IN ('vertical', 'market')
  );

CREATE POLICY intent_overrides_org_read ON aso_intent_pattern_overrides
  FOR SELECT
  USING (
    scope IN ('client', 'app')
    AND organization_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY intent_overrides_internal_write ON aso_intent_pattern_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  );

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE TRIGGER update_intent_patterns_updated_at
  BEFORE UPDATE ON aso_intent_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intent_overrides_updated_at
  BEFORE UPDATE ON aso_intent_pattern_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Version History Trigger
-- ============================================================================
-- Note: Disabled - increment_version() function not available
-- CREATE TRIGGER increment_intent_pattern_version
--   BEFORE UPDATE ON aso_intent_patterns
--   FOR EACH ROW
--   WHEN (
--     OLD.pattern IS DISTINCT FROM NEW.pattern
--     OR OLD.intent_type IS DISTINCT FROM NEW.intent_type
--     OR OLD.weight IS DISTINCT FROM NEW.weight
--     OR OLD.is_active IS DISTINCT FROM NEW.is_active
--   )
--   EXECUTE FUNCTION increment_version();
