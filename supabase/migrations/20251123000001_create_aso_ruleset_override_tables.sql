-- ============================================================================
-- PHASE 11: ASO Bible Ruleset Storage - Override Tables
-- ============================================================================
-- Purpose: Granular override tables for each override type
-- Scope: Token relevance, intents, hooks, stopwords, KPIs, formulas, recommendations
-- Compatibility: 100% backward compatible - additive overrides only
-- ============================================================================

-- ============================================================================
-- TOKEN RELEVANCE OVERRIDES
-- ============================================================================

CREATE TABLE aso_token_relevance_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope aso_ruleset_scope NOT NULL,
  vertical varchar(50),
  market varchar(10),
  organization_id uuid,

  -- Token and relevance
  token varchar(100) NOT NULL,
  relevance smallint NOT NULL CHECK (relevance BETWEEN 0 AND 3),

  -- Metadata
  notes text,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  -- Constraints: One token per scope
  UNIQUE(scope, vertical, market, organization_id, token),
  CHECK (
    (scope = 'vertical' AND vertical IS NOT NULL AND market IS NULL AND organization_id IS NULL) OR
    (scope = 'market' AND market IS NOT NULL AND vertical IS NULL AND organization_id IS NULL) OR
    (scope = 'client' AND organization_id IS NOT NULL AND vertical IS NULL AND market IS NULL)
  )
);

CREATE INDEX idx_aso_token_relevance_vertical ON aso_token_relevance_overrides(vertical, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_token_relevance_market ON aso_token_relevance_overrides(market, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_token_relevance_org ON aso_token_relevance_overrides(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_token_relevance_token ON aso_token_relevance_overrides(token);

COMMENT ON TABLE aso_token_relevance_overrides IS 'Phase 11: Token relevance score overrides (0-3) for vertical/market/client';

-- ============================================================================
-- INTENT PATTERN OVERRIDES
-- ============================================================================
-- Note: This table may already exist from earlier migration (20250124000001_create_intent_registry.sql)
-- Using IF NOT EXISTS to avoid conflicts

CREATE TABLE IF NOT EXISTS aso_intent_pattern_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope aso_ruleset_scope NOT NULL,
  vertical varchar(50),
  market varchar(10),
  organization_id uuid,

  -- Intent type (from Phase 9/10)
  intent_type varchar(50) NOT NULL, -- 'informational', 'commercial', 'transactional', 'navigational'

  -- Pattern definition
  pattern_keywords text[] NOT NULL, -- Array of keywords for this intent
  confidence_boost numeric(3,2) DEFAULT 1.0, -- Multiplier for confidence (0.5-2.0)

  -- Metadata
  notes text,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CHECK (
    (scope = 'vertical' AND vertical IS NOT NULL AND market IS NULL AND organization_id IS NULL) OR
    (scope = 'market' AND market IS NOT NULL AND vertical IS NULL AND organization_id IS NULL) OR
    (scope = 'client' AND organization_id IS NOT NULL AND vertical IS NULL AND market IS NULL)
  )
);

CREATE INDEX idx_aso_intent_pattern_vertical ON aso_intent_pattern_overrides(vertical, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_intent_pattern_market ON aso_intent_pattern_overrides(market, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_intent_pattern_org ON aso_intent_pattern_overrides(organization_id, is_active) WHERE is_active = true;

COMMENT ON TABLE aso_intent_pattern_overrides IS 'Phase 11: Intent classification pattern overrides for vertical/market/client';

-- ============================================================================
-- HOOK PATTERN OVERRIDES
-- ============================================================================

CREATE TABLE aso_hook_pattern_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope aso_ruleset_scope NOT NULL,
  vertical varchar(50),
  market varchar(10),
  organization_id uuid,

  -- Hook category (from Phase 10)
  hook_category varchar(50) NOT NULL, -- 'learning_educational', 'outcome_benefit', etc.
  weight_multiplier numeric(3,2) NOT NULL DEFAULT 1.0 CHECK (weight_multiplier BETWEEN 0.5 AND 2.0),

  -- Pattern definition (optional: can override keywords)
  keywords text[], -- If NULL, uses default keywords from code

  -- Metadata
  notes text,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(scope, vertical, market, organization_id, hook_category),
  CHECK (
    (scope = 'vertical' AND vertical IS NOT NULL AND market IS NULL AND organization_id IS NULL) OR
    (scope = 'market' AND market IS NOT NULL AND vertical IS NULL AND organization_id IS NULL) OR
    (scope = 'client' AND organization_id IS NOT NULL AND vertical IS NULL AND market IS NULL)
  )
);

CREATE INDEX idx_aso_hook_pattern_vertical ON aso_hook_pattern_overrides(vertical, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_hook_pattern_market ON aso_hook_pattern_overrides(market, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_hook_pattern_org ON aso_hook_pattern_overrides(organization_id, is_active) WHERE is_active = true;

COMMENT ON TABLE aso_hook_pattern_overrides IS 'Phase 11: Hook category weight multipliers for vertical/market/client';

-- ============================================================================
-- STOPWORD OVERRIDES
-- ============================================================================

CREATE TABLE aso_stopword_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope aso_ruleset_scope NOT NULL,
  vertical varchar(50),
  market varchar(10),
  organization_id uuid,

  -- Stopwords (array for batch operations)
  stopwords text[] NOT NULL,

  -- Metadata
  notes text,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(scope, vertical, market, organization_id),
  CHECK (
    (scope = 'vertical' AND vertical IS NOT NULL AND market IS NULL AND organization_id IS NULL) OR
    (scope = 'market' AND market IS NOT NULL AND vertical IS NULL AND organization_id IS NULL) OR
    (scope = 'client' AND organization_id IS NOT NULL AND vertical IS NULL AND market IS NULL)
  )
);

CREATE INDEX idx_aso_stopword_vertical ON aso_stopword_overrides(vertical, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_stopword_market ON aso_stopword_overrides(market, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_stopword_org ON aso_stopword_overrides(organization_id, is_active) WHERE is_active = true;

COMMENT ON TABLE aso_stopword_overrides IS 'Phase 11: Stopword additions for vertical/market/client (union merge strategy)';

-- ============================================================================
-- KPI WEIGHT OVERRIDES
-- ============================================================================

CREATE TABLE aso_kpi_weight_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope aso_ruleset_scope NOT NULL,
  vertical varchar(50),
  market varchar(10),
  organization_id uuid,

  -- KPI identifier (from kpi.registry.json)
  kpi_id varchar(100) NOT NULL,
  weight_multiplier numeric(3,2) NOT NULL CHECK (weight_multiplier BETWEEN 0.5 AND 2.0),

  -- Metadata
  notes text,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(scope, vertical, market, organization_id, kpi_id),
  CHECK (
    (scope = 'vertical' AND vertical IS NOT NULL AND market IS NULL AND organization_id IS NULL) OR
    (scope = 'market' AND market IS NOT NULL AND vertical IS NULL AND organization_id IS NULL) OR
    (scope = 'client' AND organization_id IS NOT NULL AND vertical IS NULL AND market IS NULL)
  )
);

CREATE INDEX idx_aso_kpi_weight_vertical ON aso_kpi_weight_overrides(vertical, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_kpi_weight_market ON aso_kpi_weight_overrides(market, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_kpi_weight_org ON aso_kpi_weight_overrides(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_kpi_weight_kpi_id ON aso_kpi_weight_overrides(kpi_id);

COMMENT ON TABLE aso_kpi_weight_overrides IS 'Phase 11: KPI weight multipliers (0.5x-2.0x) for vertical/market/client';

-- ============================================================================
-- FORMULA OVERRIDES
-- ============================================================================

CREATE TABLE aso_formula_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope aso_ruleset_scope NOT NULL,
  vertical varchar(50),
  market varchar(10),
  organization_id uuid,

  -- Formula identifier (from metadataFormulaRegistry.ts)
  formula_id varchar(100) NOT NULL,

  -- Override payload (JSONB for flexibility)
  override_payload jsonb NOT NULL,
  /*
  Example payload:
  {
    "multiplier": 1.3,
    "component_weights": {
      "title_score": 0.7,
      "subtitle_score": 0.3
    }
  }
  */

  -- Metadata
  notes text,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(scope, vertical, market, organization_id, formula_id),
  CHECK (
    (scope = 'vertical' AND vertical IS NOT NULL AND market IS NULL AND organization_id IS NULL) OR
    (scope = 'market' AND market IS NOT NULL AND vertical IS NULL AND organization_id IS NULL) OR
    (scope = 'client' AND organization_id IS NOT NULL AND vertical IS NULL AND market IS NULL)
  )
);

CREATE INDEX idx_aso_formula_vertical ON aso_formula_overrides(vertical, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_formula_market ON aso_formula_overrides(market, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_formula_org ON aso_formula_overrides(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_formula_formula_id ON aso_formula_overrides(formula_id);

COMMENT ON TABLE aso_formula_overrides IS 'Phase 11: Formula multipliers and component weight overrides (Phase 11+)';

-- ============================================================================
-- RECOMMENDATION TEMPLATES
-- ============================================================================

CREATE TABLE aso_recommendation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope aso_ruleset_scope NOT NULL,
  vertical varchar(50),
  market varchar(10),
  organization_id uuid,

  -- Recommendation identifier (from recommendationEngineV2.ts)
  recommendation_id varchar(100) NOT NULL,
  message text NOT NULL,

  -- Metadata
  notes text,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(scope, vertical, market, organization_id, recommendation_id),
  CHECK (
    (scope = 'vertical' AND vertical IS NOT NULL AND market IS NULL AND organization_id IS NULL) OR
    (scope = 'market' AND market IS NOT NULL AND vertical IS NULL AND organization_id IS NULL) OR
    (scope = 'client' AND organization_id IS NOT NULL AND vertical IS NULL AND market IS NULL)
  )
);

CREATE INDEX idx_aso_recommendation_vertical ON aso_recommendation_templates(vertical, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_recommendation_market ON aso_recommendation_templates(market, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_recommendation_org ON aso_recommendation_templates(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_aso_recommendation_rec_id ON aso_recommendation_templates(recommendation_id);

COMMENT ON TABLE aso_recommendation_templates IS 'Phase 11: Vertical/market/client-specific recommendation message templates';
