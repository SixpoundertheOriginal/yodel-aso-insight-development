-- ============================================================================
-- PHASE 11: ASO Bible Ruleset Storage - Metadata & Audit Tables
-- ============================================================================
-- Purpose: Admin metadata and audit logging for ruleset changes
-- Scope: Rule admin UI support, change tracking, compliance
-- ============================================================================

-- ============================================================================
-- ADMIN METADATA
-- ============================================================================

CREATE TABLE aso_rule_admin_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule reference (polymorphic)
  override_type aso_override_type NOT NULL,
  override_id uuid NOT NULL, -- FK to specific override table

  -- Admin UI metadata
  display_order int,
  is_editable boolean NOT NULL DEFAULT true,
  is_visible boolean NOT NULL DEFAULT true,
  admin_group varchar(50), -- Grouping for admin UI (e.g., 'token_scoring', 'intent_classification')

  -- Documentation
  admin_label text,
  admin_description text,
  example_values text,

  -- Feature flags
  requires_feature_flag varchar(100),
  min_tier varchar(20), -- e.g., 'enterprise', 'professional', 'basic'

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aso_rule_admin_override_type ON aso_rule_admin_metadata(override_type);
CREATE INDEX idx_aso_rule_admin_override_id ON aso_rule_admin_metadata(override_id);
CREATE INDEX idx_aso_rule_admin_group ON aso_rule_admin_metadata(admin_group);

COMMENT ON TABLE aso_rule_admin_metadata IS 'Phase 11: Admin UI metadata for ruleset configuration and editing';

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE aso_ruleset_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Audit context
  action varchar(20) NOT NULL, -- 'create', 'update', 'delete', 'activate', 'deactivate'
  override_type aso_override_type NOT NULL,
  override_id uuid NOT NULL,

  -- Scope
  scope aso_ruleset_scope NOT NULL,
  vertical varchar(50),
  market varchar(10),
  organization_id uuid,

  -- Change tracking
  old_value jsonb,
  new_value jsonb,
  diff jsonb, -- Computed diff for auditing

  -- Actor
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  actor_role text,

  -- Metadata
  change_reason text,
  ip_address inet,
  user_agent text,

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aso_audit_log_created_at ON aso_ruleset_audit_log(created_at DESC);
CREATE INDEX idx_aso_audit_log_override_type ON aso_ruleset_audit_log(override_type);
CREATE INDEX idx_aso_audit_log_override_id ON aso_ruleset_audit_log(override_id);
CREATE INDEX idx_aso_audit_log_actor ON aso_ruleset_audit_log(actor_id);
CREATE INDEX idx_aso_audit_log_scope ON aso_ruleset_audit_log(scope, vertical, market, organization_id);

COMMENT ON TABLE aso_ruleset_audit_log IS 'Phase 11: Comprehensive audit trail for all ruleset changes';

-- ============================================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION aso_log_ruleset_change()
RETURNS TRIGGER AS $$
DECLARE
  v_override_type aso_override_type;
  v_scope aso_ruleset_scope;
  v_vertical varchar(50);
  v_market varchar(10);
  v_org_id uuid;
BEGIN
  -- Determine override type from table name
  v_override_type := CASE TG_TABLE_NAME
    WHEN 'aso_token_relevance_overrides' THEN 'token_relevance'::aso_override_type
    WHEN 'aso_intent_pattern_overrides' THEN 'intent_pattern'::aso_override_type
    WHEN 'aso_hook_pattern_overrides' THEN 'hook_pattern'::aso_override_type
    WHEN 'aso_stopword_overrides' THEN 'stopword'::aso_override_type
    WHEN 'aso_kpi_weight_overrides' THEN 'kpi_weight'::aso_override_type
    WHEN 'aso_formula_overrides' THEN 'formula'::aso_override_type
    WHEN 'aso_recommendation_templates' THEN 'recommendation'::aso_override_type
  END;

  -- Extract scope information
  IF TG_OP = 'DELETE' THEN
    v_scope := OLD.scope;
    v_vertical := OLD.vertical;
    v_market := OLD.market;
    v_org_id := OLD.organization_id;
  ELSE
    v_scope := NEW.scope;
    v_vertical := NEW.vertical;
    v_market := NEW.market;
    v_org_id := NEW.organization_id;
  END IF;

  -- Insert audit log
  INSERT INTO aso_ruleset_audit_log (
    action,
    override_type,
    override_id,
    scope,
    vertical,
    market,
    organization_id,
    old_value,
    new_value,
    actor_id,
    actor_email
  ) VALUES (
    TG_OP,
    v_override_type,
    COALESCE(NEW.id, OLD.id),
    v_scope,
    v_vertical,
    v_market,
    v_org_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid(),
    auth.jwt()->>'email'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION aso_log_ruleset_change() IS 'Trigger function to automatically log all ruleset changes to audit log';

-- ============================================================================
-- ATTACH AUDIT TRIGGERS
-- ============================================================================

CREATE TRIGGER aso_audit_token_relevance
  AFTER INSERT OR UPDATE OR DELETE ON aso_token_relevance_overrides
  FOR EACH ROW EXECUTE FUNCTION aso_log_ruleset_change();

CREATE TRIGGER aso_audit_intent_pattern
  AFTER INSERT OR UPDATE OR DELETE ON aso_intent_pattern_overrides
  FOR EACH ROW EXECUTE FUNCTION aso_log_ruleset_change();

CREATE TRIGGER aso_audit_hook_pattern
  AFTER INSERT OR UPDATE OR DELETE ON aso_hook_pattern_overrides
  FOR EACH ROW EXECUTE FUNCTION aso_log_ruleset_change();

CREATE TRIGGER aso_audit_stopword
  AFTER INSERT OR UPDATE OR DELETE ON aso_stopword_overrides
  FOR EACH ROW EXECUTE FUNCTION aso_log_ruleset_change();

CREATE TRIGGER aso_audit_kpi_weight
  AFTER INSERT OR UPDATE OR DELETE ON aso_kpi_weight_overrides
  FOR EACH ROW EXECUTE FUNCTION aso_log_ruleset_change();

CREATE TRIGGER aso_audit_formula
  AFTER INSERT OR UPDATE OR DELETE ON aso_formula_overrides
  FOR EACH ROW EXECUTE FUNCTION aso_log_ruleset_change();

CREATE TRIGGER aso_audit_recommendation
  AFTER INSERT OR UPDATE OR DELETE ON aso_recommendation_templates
  FOR EACH ROW EXECUTE FUNCTION aso_log_ruleset_change();
