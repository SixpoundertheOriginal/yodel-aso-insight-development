-- ============================================================================
-- PHASE 11: ASO Bible Ruleset Storage - Core Tables
-- ============================================================================
-- Purpose: Database foundation for dynamic, editable rule sets
-- Scope: Core ruleset tables for vertical, market, and client overrides
-- Compatibility: 100% backward compatible - DB empty = Phase 10 behavior
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Scope of the ruleset override
CREATE TYPE aso_ruleset_scope AS ENUM (
  'vertical',   -- Vertical-specific rules (e.g., language_learning, finance)
  'market',     -- Market-specific rules (e.g., us, uk, de)
  'client'      -- Client-specific rules (enterprise feature)
);

-- Override type for categorization
CREATE TYPE aso_override_type AS ENUM (
  'token_relevance',      -- Token relevance scoring (0-3)
  'intent_pattern',       -- Intent classification patterns
  'hook_pattern',         -- Hook category keywords and weights
  'stopword',             -- Stopword additions
  'kpi_weight',           -- KPI weight multipliers
  'formula',              -- Formula multipliers and component weights
  'recommendation'        -- Recommendation message templates
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Vertical Ruleset Configuration
CREATE TABLE aso_ruleset_vertical (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vertical identifier (from Phase 9)
  vertical varchar(50) NOT NULL,

  -- Ruleset metadata
  label text NOT NULL,
  description text,

  -- Version control
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(vertical, version)
);

-- Index for fast vertical lookup
CREATE INDEX idx_aso_ruleset_vertical_vertical ON aso_ruleset_vertical(vertical);
CREATE INDEX idx_aso_ruleset_vertical_active ON aso_ruleset_vertical(vertical, is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_aso_ruleset_vertical_updated_at
  BEFORE UPDATE ON aso_ruleset_vertical
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE aso_ruleset_vertical IS 'Phase 11: Vertical-specific ruleset configurations (e.g., language_learning, finance, rewards)';

-- ============================================================================

-- Market Ruleset Configuration
CREATE TABLE aso_ruleset_market (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Market identifier (from Phase 9)
  market varchar(10) NOT NULL,

  -- Ruleset metadata
  label text NOT NULL,
  description text,
  locale varchar(10) NOT NULL, -- e.g., 'en-US', 'de-DE'

  -- Version control
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(market, version)
);

-- Index for fast market lookup
CREATE INDEX idx_aso_ruleset_market_market ON aso_ruleset_market(market);
CREATE INDEX idx_aso_ruleset_market_active ON aso_ruleset_market(market, is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_aso_ruleset_market_updated_at
  BEFORE UPDATE ON aso_ruleset_market
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE aso_ruleset_market IS 'Phase 11: Market-specific ruleset configurations (e.g., us, uk, de, fr)';

-- ============================================================================

-- Client Ruleset Configuration (Enterprise Feature)
CREATE TABLE aso_ruleset_client (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Client reference
  organization_id uuid NOT NULL, -- Link to organization
  app_id text, -- Optional: specific app override

  -- Ruleset metadata
  label text NOT NULL,
  description text,

  -- Inheritance
  inherit_from_vertical varchar(50), -- Optional: inherit from vertical ruleset
  inherit_from_market varchar(10),   -- Optional: inherit from market ruleset

  -- Version control
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(organization_id, app_id, version)
);

-- Index for fast client lookup
CREATE INDEX idx_aso_ruleset_client_org ON aso_ruleset_client(organization_id);
CREATE INDEX idx_aso_ruleset_client_app ON aso_ruleset_client(organization_id, app_id);
CREATE INDEX idx_aso_ruleset_client_active ON aso_ruleset_client(organization_id, is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_aso_ruleset_client_updated_at
  BEFORE UPDATE ON aso_ruleset_client
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE aso_ruleset_client IS 'Phase 11: Client-specific ruleset configurations for enterprise customers';

-- ============================================================================

-- Ruleset Version Registry
CREATE TABLE aso_ruleset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Version identifiers
  ruleset_version int NOT NULL,
  vertical_version int,
  market_version int,
  client_version int,

  -- Schema versions
  kpi_schema_version varchar(10) NOT NULL, -- e.g., 'v1', 'v2'
  formula_schema_version varchar(10) NOT NULL,

  -- Snapshot metadata
  vertical varchar(50),
  market varchar(10),
  organization_id uuid,
  app_id text,

  -- Version snapshot (full merged ruleset)
  ruleset_snapshot jsonb NOT NULL,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(ruleset_version, vertical, market, organization_id, app_id)
);

-- Index for fast version lookup
CREATE INDEX idx_aso_ruleset_versions_version ON aso_ruleset_versions(ruleset_version);
CREATE INDEX idx_aso_ruleset_versions_vertical ON aso_ruleset_versions(vertical, market);
CREATE INDEX idx_aso_ruleset_versions_org ON aso_ruleset_versions(organization_id);

-- Comment
COMMENT ON TABLE aso_ruleset_versions IS 'Phase 11: Version registry for ruleset snapshots (reproducibility and audit trail)';

-- ============================================================================
-- HELPER FUNCTION
-- ============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp';
