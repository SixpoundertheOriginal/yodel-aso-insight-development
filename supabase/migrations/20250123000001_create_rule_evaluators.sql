-- =====================================================================
-- Phase 15: Rule Evaluator Registry - Core Tables
-- =====================================================================
-- This migration creates tables for storing metadata audit rule evaluators
-- and their overrides, following the same pattern as KPI & Formula registries.
--
-- Tables:
-- 1. aso_rule_evaluators: Core rule definitions
-- 2. aso_rule_evaluator_overrides: Vertical/Market/Client-specific overrides
--
-- Author: Claude Code (Phase 15)
-- Date: 2025-01-23
-- =====================================================================

-- =====================================================================
-- 1. Core Rule Evaluators Table
-- =====================================================================

CREATE TABLE IF NOT EXISTS aso_rule_evaluators (
  -- Primary identifiers
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text UNIQUE NOT NULL,  -- Stable ID used in code (e.g. 'title_character_usage')

  -- Metadata
  name text NOT NULL,
  description text,
  scope text NOT NULL CHECK (scope IN ('title', 'subtitle', 'description', 'coverage', 'intent', 'global')),
  family text NOT NULL CHECK (family IN ('ranking', 'conversion', 'diagnostic', 'coverage')),

  -- Default configuration
  weight_default numeric(5,3) NOT NULL DEFAULT 0.25 CHECK (weight_default >= 0 AND weight_default <= 1),
  severity_default text NOT NULL DEFAULT 'moderate' CHECK (severity_default IN ('critical', 'strong', 'moderate', 'optional', 'info')),

  -- Thresholds (nullable - not all rules have thresholds)
  threshold_low numeric,
  threshold_high numeric,

  -- Linked entities (optional)
  kpi_ids text[],  -- Array of KPI IDs that use this rule
  formula_id text,  -- Formula used by this rule (if any)

  -- Admin metadata
  notes text,
  help_text text,
  tags text[],

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  is_deprecated boolean NOT NULL DEFAULT false,
  deprecated_reason text,

  -- Standard timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Audit fields
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Indexes for aso_rule_evaluators
CREATE INDEX idx_rule_evaluators_rule_id ON aso_rule_evaluators(rule_id);
CREATE INDEX idx_rule_evaluators_scope ON aso_rule_evaluators(scope);
CREATE INDEX idx_rule_evaluators_family ON aso_rule_evaluators(family);
CREATE INDEX idx_rule_evaluators_active ON aso_rule_evaluators(is_active) WHERE is_active = true;

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_rule_evaluators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rule_evaluators_updated_at
  BEFORE UPDATE ON aso_rule_evaluators
  FOR EACH ROW
  EXECUTE FUNCTION update_rule_evaluators_updated_at();

-- =====================================================================
-- 2. Rule Evaluator Overrides Table
-- =====================================================================

CREATE TABLE IF NOT EXISTS aso_rule_evaluator_overrides (
  -- Primary identifiers
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text NOT NULL REFERENCES aso_rule_evaluators(rule_id) ON DELETE CASCADE,

  -- Scope (reuse existing enum from rulesets)
  scope text NOT NULL DEFAULT 'base' CHECK (scope IN ('base', 'vertical', 'market', 'client')),
  vertical text,
  market text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Override values
  weight_multiplier numeric(3,2) DEFAULT 1.0 CHECK (weight_multiplier >= 0.5 AND weight_multiplier <= 2.0),
  severity_override text CHECK (severity_override IN ('critical', 'strong', 'moderate', 'optional', 'info')),
  threshold_low_override numeric,
  threshold_high_override numeric,

  -- Override metadata
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,

  -- Standard timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Audit fields
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Unique index: one override per rule per scope (using expression index with COALESCE)
CREATE UNIQUE INDEX unique_rule_override ON aso_rule_evaluator_overrides(
  rule_id,
  scope,
  COALESCE(vertical, ''),
  COALESCE(market, ''),
  COALESCE(organization_id::text, '')
);

-- Indexes for aso_rule_evaluator_overrides
CREATE INDEX idx_rule_overrides_rule_id ON aso_rule_evaluator_overrides(rule_id);
CREATE INDEX idx_rule_overrides_scope ON aso_rule_evaluator_overrides(scope);
CREATE INDEX idx_rule_overrides_vertical ON aso_rule_evaluator_overrides(vertical) WHERE vertical IS NOT NULL;
CREATE INDEX idx_rule_overrides_market ON aso_rule_evaluator_overrides(market) WHERE market IS NOT NULL;
CREATE INDEX idx_rule_overrides_org ON aso_rule_evaluator_overrides(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_rule_overrides_active ON aso_rule_evaluator_overrides(is_active) WHERE is_active = true;

-- Updated timestamp trigger
CREATE TRIGGER rule_overrides_updated_at
  BEFORE UPDATE ON aso_rule_evaluator_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_rule_evaluators_updated_at();  -- Reuse same function

-- =====================================================================
-- 3. Row Level Security (RLS) Policies
-- =====================================================================

-- Enable RLS
ALTER TABLE aso_rule_evaluators ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_rule_evaluator_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aso_rule_evaluators

-- SELECT: Authenticated users can read all rules
CREATE POLICY rule_evaluators_select_authenticated
  ON aso_rule_evaluators FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Only SUPER_ADMIN users can create rules
CREATE POLICY rule_evaluators_insert_internal
  ON aso_rule_evaluators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  );

-- UPDATE: Only SUPER_ADMIN users can update rules
CREATE POLICY rule_evaluators_update_internal
  ON aso_rule_evaluators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  );

-- DELETE: Only SUPER_ADMIN users can delete rules
CREATE POLICY rule_evaluators_delete_internal
  ON aso_rule_evaluators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  );

-- RLS Policies for aso_rule_evaluator_overrides

-- SELECT: Authenticated users can read overrides for their own org or global overrides
CREATE POLICY rule_overrides_select_authenticated
  ON aso_rule_evaluator_overrides FOR SELECT
  TO authenticated
  USING (
    -- Global overrides (vertical/market)
    organization_id IS NULL
    OR
    -- Own organization's overrides
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
    OR
    -- SUPER_ADMIN users can see all
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  );

-- INSERT: Only SUPER_ADMIN users can create overrides
CREATE POLICY rule_overrides_insert_internal
  ON aso_rule_evaluator_overrides FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  );

-- UPDATE: Only SUPER_ADMIN users can update overrides
CREATE POLICY rule_overrides_update_internal
  ON aso_rule_evaluator_overrides FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  );

-- DELETE: Only SUPER_ADMIN users can delete overrides
CREATE POLICY rule_overrides_delete_internal
  ON aso_rule_evaluator_overrides FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  );

-- =====================================================================
-- 4. Helper Functions
-- =====================================================================

-- Function to get effective rule configuration (merged base + overrides)
CREATE OR REPLACE FUNCTION get_effective_rule_config(
  p_rule_id text,
  p_vertical text DEFAULT NULL,
  p_market text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_base_rule record;
  v_override record;
  v_effective_weight numeric;
  v_effective_severity text;
  v_effective_threshold_low numeric;
  v_effective_threshold_high numeric;
BEGIN
  -- Get base rule
  SELECT * INTO v_base_rule
  FROM aso_rule_evaluators
  WHERE rule_id = p_rule_id
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Rule not found or inactive');
  END IF;

  -- Try to find override (priority: client > vertical+market > market > vertical > base)
  SELECT * INTO v_override
  FROM aso_rule_evaluator_overrides
  WHERE rule_id = p_rule_id
  AND is_active = true
  AND (
    -- Client-specific
    (scope = 'client' AND organization_id = p_organization_id)
    OR
    -- Vertical + Market
    (scope = 'vertical' AND vertical = p_vertical AND market = p_market)
    OR
    -- Market only
    (scope = 'market' AND market = p_market AND vertical IS NULL)
    OR
    -- Vertical only
    (scope = 'vertical' AND vertical = p_vertical AND market IS NULL)
  )
  ORDER BY
    CASE
      WHEN scope = 'client' THEN 1
      WHEN scope = 'vertical' AND market IS NOT NULL THEN 2
      WHEN scope = 'market' THEN 3
      WHEN scope = 'vertical' THEN 4
      ELSE 5
    END
  LIMIT 1;

  -- Calculate effective values
  v_effective_weight := v_base_rule.weight_default * COALESCE(v_override.weight_multiplier, 1.0);
  v_effective_severity := COALESCE(v_override.severity_override, v_base_rule.severity_default);
  v_effective_threshold_low := COALESCE(v_override.threshold_low_override, v_base_rule.threshold_low);
  v_effective_threshold_high := COALESCE(v_override.threshold_high_override, v_base_rule.threshold_high);

  -- Return merged configuration
  RETURN json_build_object(
    'rule_id', v_base_rule.rule_id,
    'name', v_base_rule.name,
    'description', v_base_rule.description,
    'scope', v_base_rule.scope,
    'family', v_base_rule.family,
    'weight_base', v_base_rule.weight_default,
    'weight_multiplier', COALESCE(v_override.weight_multiplier, 1.0),
    'weight_effective', v_effective_weight,
    'severity', v_effective_severity,
    'threshold_low', v_effective_threshold_low,
    'threshold_high', v_effective_threshold_high,
    'has_override', v_override.id IS NOT NULL,
    'override_scope', v_override.scope,
    'is_active', v_base_rule.is_active
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 5. Comments
-- =====================================================================

COMMENT ON TABLE aso_rule_evaluators IS 'Phase 15: Core rule evaluator definitions for metadata audit engine';
COMMENT ON TABLE aso_rule_evaluator_overrides IS 'Phase 15: Vertical/Market/Client-specific overrides for rule evaluators';
COMMENT ON FUNCTION get_effective_rule_config IS 'Phase 15: Returns merged rule configuration with base + override values';

COMMENT ON COLUMN aso_rule_evaluators.rule_id IS 'Stable identifier used in code (e.g. title_character_usage)';
COMMENT ON COLUMN aso_rule_evaluators.weight_default IS 'Default weight within element score (0-1)';
COMMENT ON COLUMN aso_rule_evaluators.severity_default IS 'Default severity level for recommendations';
COMMENT ON COLUMN aso_rule_evaluator_overrides.weight_multiplier IS 'Multiplier applied to base weight (0.5-2.0)';
COMMENT ON COLUMN aso_rule_evaluator_overrides.scope IS 'Override scope: base, vertical, market, or client';
