-- ============================================================================
-- PHASE 11: ASO Bible Ruleset Storage - RLS Policies
-- ============================================================================
-- Purpose: Row-level security for multi-tenant ruleset isolation
-- Scope: Internal Yodel rules, organization rules, client rules
-- Security Model:
--   1. Internal Yodel Rules (vertical/market): Public read, internal write
--   2. Organization Rules: Org-scoped read, internal write
--   3. Client Rules: Client-scoped read, internal write
-- ============================================================================

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE aso_ruleset_vertical ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_ruleset_market ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_ruleset_client ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_ruleset_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE aso_token_relevance_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_intent_pattern_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_hook_pattern_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_stopword_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_kpi_weight_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_formula_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_recommendation_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE aso_rule_admin_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_ruleset_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is internal Yodel staff
CREATE OR REPLACE FUNCTION is_internal_yodel_user()
RETURNS boolean AS $$
BEGIN
  -- Check if user email ends with @yodel.io or has internal role
  RETURN (
    auth.jwt()->>'email' LIKE '%@yodel.io' OR
    auth.jwt()->>'role' = 'internal' OR
    auth.jwt()->>'is_yodel_admin' = 'true'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_internal_yodel_user() IS 'Returns true if current user is internal Yodel staff';

-- Get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
BEGIN
  RETURN (auth.jwt()->>'organization_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_organization_id() IS 'Returns current user''s organization ID from JWT';

-- ============================================================================
-- VERTICAL RULESET POLICIES (Internal Yodel only)
-- ============================================================================

-- Public read access (all authenticated users)
CREATE POLICY "Vertical rulesets are viewable by all authenticated users"
  ON aso_ruleset_vertical
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Write access (internal Yodel only)
CREATE POLICY "Vertical rulesets are editable by internal Yodel only"
  ON aso_ruleset_vertical
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- ============================================================================
-- MARKET RULESET POLICIES (Internal Yodel only)
-- ============================================================================

-- Public read access (all authenticated users)
CREATE POLICY "Market rulesets are viewable by all authenticated users"
  ON aso_ruleset_market
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Write access (internal Yodel only)
CREATE POLICY "Market rulesets are editable by internal Yodel only"
  ON aso_ruleset_market
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- ============================================================================
-- CLIENT RULESET POLICIES (Organization-scoped)
-- ============================================================================

-- Read access (own organization or internal Yodel)
CREATE POLICY "Client rulesets are viewable by organization members or internal"
  ON aso_ruleset_client
  FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() OR
    is_internal_yodel_user()
  );

-- Write access (internal Yodel only)
CREATE POLICY "Client rulesets are editable by internal Yodel only"
  ON aso_ruleset_client
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- ============================================================================
-- VERSION REGISTRY POLICIES
-- ============================================================================

-- Read access (all authenticated users)
CREATE POLICY "Ruleset versions are viewable by all authenticated users"
  ON aso_ruleset_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- Write access (internal Yodel only)
CREATE POLICY "Ruleset versions are creatable by internal Yodel only"
  ON aso_ruleset_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_internal_yodel_user());

-- ============================================================================
-- OVERRIDE TABLE POLICIES (Shared Pattern)
-- ============================================================================

-- Token Relevance Overrides
CREATE POLICY "Token overrides: public read for vertical/market, org-scoped for client"
  ON aso_token_relevance_overrides
  FOR SELECT
  TO authenticated
  USING (
    (scope IN ('vertical', 'market') AND is_active = true) OR
    (scope = 'client' AND organization_id = get_user_organization_id()) OR
    is_internal_yodel_user()
  );

CREATE POLICY "Token overrides: internal write only"
  ON aso_token_relevance_overrides
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- Intent Pattern Overrides
CREATE POLICY "Intent overrides: public read for vertical/market, org-scoped for client"
  ON aso_intent_pattern_overrides
  FOR SELECT
  TO authenticated
  USING (
    (scope IN ('vertical', 'market') AND is_active = true) OR
    (scope = 'client' AND organization_id = get_user_organization_id()) OR
    is_internal_yodel_user()
  );

CREATE POLICY "Intent overrides: internal write only"
  ON aso_intent_pattern_overrides
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- Hook Pattern Overrides
CREATE POLICY "Hook overrides: public read for vertical/market, org-scoped for client"
  ON aso_hook_pattern_overrides
  FOR SELECT
  TO authenticated
  USING (
    (scope IN ('vertical', 'market') AND is_active = true) OR
    (scope = 'client' AND organization_id = get_user_organization_id()) OR
    is_internal_yodel_user()
  );

CREATE POLICY "Hook overrides: internal write only"
  ON aso_hook_pattern_overrides
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- Stopword Overrides
CREATE POLICY "Stopword overrides: public read for vertical/market, org-scoped for client"
  ON aso_stopword_overrides
  FOR SELECT
  TO authenticated
  USING (
    (scope IN ('vertical', 'market') AND is_active = true) OR
    (scope = 'client' AND organization_id = get_user_organization_id()) OR
    is_internal_yodel_user()
  );

CREATE POLICY "Stopword overrides: internal write only"
  ON aso_stopword_overrides
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- KPI Weight Overrides
CREATE POLICY "KPI overrides: public read for vertical/market, org-scoped for client"
  ON aso_kpi_weight_overrides
  FOR SELECT
  TO authenticated
  USING (
    (scope IN ('vertical', 'market') AND is_active = true) OR
    (scope = 'client' AND organization_id = get_user_organization_id()) OR
    is_internal_yodel_user()
  );

CREATE POLICY "KPI overrides: internal write only"
  ON aso_kpi_weight_overrides
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- Formula Overrides
CREATE POLICY "Formula overrides: public read for vertical/market, org-scoped for client"
  ON aso_formula_overrides
  FOR SELECT
  TO authenticated
  USING (
    (scope IN ('vertical', 'market') AND is_active = true) OR
    (scope = 'client' AND organization_id = get_user_organization_id()) OR
    is_internal_yodel_user()
  );

CREATE POLICY "Formula overrides: internal write only"
  ON aso_formula_overrides
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- Recommendation Templates
CREATE POLICY "Recommendation overrides: public read for vertical/market, org-scoped for client"
  ON aso_recommendation_templates
  FOR SELECT
  TO authenticated
  USING (
    (scope IN ('vertical', 'market') AND is_active = true) OR
    (scope = 'client' AND organization_id = get_user_organization_id()) OR
    is_internal_yodel_user()
  );

CREATE POLICY "Recommendation overrides: internal write only"
  ON aso_recommendation_templates
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- ============================================================================
-- ADMIN METADATA POLICIES
-- ============================================================================

-- Read access (internal Yodel only)
CREATE POLICY "Admin metadata is viewable by internal Yodel only"
  ON aso_rule_admin_metadata
  FOR SELECT
  TO authenticated
  USING (is_internal_yodel_user());

-- Write access (internal Yodel only)
CREATE POLICY "Admin metadata is editable by internal Yodel only"
  ON aso_rule_admin_metadata
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());

-- ============================================================================
-- AUDIT LOG POLICIES
-- ============================================================================

-- Read access (organization-scoped + internal)
CREATE POLICY "Audit logs are viewable by org members for their rules, or internal"
  ON aso_ruleset_audit_log
  FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() OR
    is_internal_yodel_user()
  );

-- Write access (system only - via trigger)
-- No explicit INSERT policy needed (trigger runs as SECURITY DEFINER)
