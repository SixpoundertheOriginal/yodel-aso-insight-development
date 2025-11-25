/**
 * Fix RLS Policy Ambiguity for LLM Visibility Tables
 *
 * Issue: Column reference "org_id" was ambiguous when calling
 * user_belongs_to_organization(organization_id) because the function
 * parameter is named "org_id", causing PostgreSQL confusion during INSERT.
 *
 * Solution: Schema-qualify all organization_id references in RLS policies.
 */

-- Drop existing policies
DROP POLICY IF EXISTS llm_analysis_org_isolation ON llm_visibility_analysis;
DROP POLICY IF EXISTS llm_snapshots_org_isolation ON llm_description_snapshots;
DROP POLICY IF EXISTS llm_overrides_org_isolation ON llm_visibility_rule_overrides;

-- Recreate with schema-qualified column references
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
