/**
 * Rule Evaluator Admin Service
 *
 * Phase 15: Service layer for managing rule evaluators
 *
 * Provides read/write access to rule evaluator registry with admin capabilities:
 * - Get rules with usage stats and effective configurations
 * - Update rule weights, thresholds, severity (stored as DB overrides)
 * - Update rule metadata (description, notes, tags)
 * - Deprecate rules (mark as deprecated, not delete)
 *
 * All changes are stored as database overrides, not code modifications.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Extended Types for Admin UI
// ============================================================================

/**
 * Rule evaluator with admin metadata and effective configuration
 */
export interface RuleWithAdminMeta {
  // Base rule data
  id: string;
  rule_id: string;
  name: string;
  description?: string;
  scope: 'title' | 'subtitle' | 'description' | 'coverage' | 'intent' | 'global';
  family: 'ranking' | 'conversion' | 'diagnostic' | 'coverage';

  // Default configuration
  weight_default: number;
  severity_default: 'critical' | 'strong' | 'moderate' | 'optional' | 'info';
  threshold_low?: number;
  threshold_high?: number;

  // Linked entities
  kpi_ids?: string[];
  formula_id?: string;

  // Admin metadata
  notes?: string;
  help_text?: string;
  tags?: string[];

  // Status
  is_active: boolean;
  is_deprecated: boolean;
  deprecated_reason?: string;

  // Effective configuration (with overrides applied)
  effective_weight?: number;
  effective_severity?: string;
  effective_threshold_low?: number;
  effective_threshold_high?: number;
  has_override?: boolean;
  override_multiplier?: number;
  override_scope?: string;

  // Usage stats
  usage_count?: number;
  used_by_kpis?: string[];

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Request to update rule weight override
 */
export interface UpdateRuleWeightRequest {
  ruleId: string;
  scope: 'base' | 'vertical' | 'market' | 'client';
  vertical?: string;
  market?: string;
  organizationId?: string;
  weightMultiplier: number; // 0.5 - 2.0
  notes?: string;
}

/**
 * Request to update rule threshold override
 */
export interface UpdateRuleThresholdRequest {
  ruleId: string;
  scope: 'base' | 'vertical' | 'market' | 'client';
  vertical?: string;
  market?: string;
  organizationId?: string;
  thresholdLow?: number;
  thresholdHigh?: number;
  notes?: string;
}

/**
 * Request to update rule severity override
 */
export interface UpdateRuleSeverityRequest {
  ruleId: string;
  scope: 'base' | 'vertical' | 'market' | 'client';
  vertical?: string;
  market?: string;
  organizationId?: string;
  severity: 'critical' | 'strong' | 'moderate' | 'optional' | 'info';
  notes?: string;
}

/**
 * Request to update rule metadata
 */
export interface UpdateRuleMetaRequest {
  ruleId: string;
  name?: string;
  description?: string;
  notes?: string;
  help_text?: string;
  tags?: string[];
}

/**
 * Request to deprecate a rule
 */
export interface DeprecateRuleRequest {
  ruleId: string;
  reason: string;
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all rules with admin metadata
 *
 * @param vertical - Optional vertical filter
 * @param market - Optional market filter
 * @param organizationId - Optional organization filter
 * @returns Array of rules with effective configuration
 */
export async function getAllRulesWithAdminMeta(
  vertical?: string,
  market?: string,
  organizationId?: string
): Promise<RuleWithAdminMeta[]> {
  try {
    // Fetch all active rules
    const { data: rules, error: rulesError } = await supabase
      .from('aso_rule_evaluators')
      .select('*')
      .eq('is_active', true)
      .order('scope')
      .order('rule_id');

    if (rulesError) {
      console.error('Error fetching rules:', rulesError);
      return [];
    }

    if (!rules) return [];

    // Fetch overrides for the given scope
    const { data: overrides, error: overridesError } = await supabase
      .from('aso_rule_evaluator_overrides')
      .select('*')
      .eq('is_active', true);

    if (overridesError) {
      console.error('Error fetching rule overrides:', overridesError);
    }

    // Merge rules with overrides
    return rules.map((rule) => {
      // Find best matching override (priority: client > vertical+market > market > vertical)
      const matchingOverrides = (overrides || []).filter((o) => {
        if (o.rule_id !== rule.rule_id) return false;

        if (o.scope === 'client' && o.organization_id === organizationId) return true;
        if (o.scope === 'vertical' && o.vertical === vertical && o.market === market) return true;
        if (o.scope === 'market' && o.market === market && !o.vertical) return true;
        if (o.scope === 'vertical' && o.vertical === vertical && !o.market) return true;

        return false;
      });

      // Get highest priority override
      const override = matchingOverrides.sort((a, b) => {
        const priorityA = a.scope === 'client' ? 1 : a.scope === 'vertical' && a.market ? 2 : a.scope === 'market' ? 3 : 4;
        const priorityB = b.scope === 'client' ? 1 : b.scope === 'vertical' && b.market ? 2 : b.scope === 'market' ? 3 : 4;
        return priorityA - priorityB;
      })[0];

      const weightMultiplier = override?.weight_multiplier || 1.0;
      const effectiveWeight = rule.weight_default * weightMultiplier;

      return {
        ...rule,
        effective_weight: effectiveWeight,
        effective_severity: override?.severity_override || rule.severity_default,
        effective_threshold_low: override?.threshold_low_override ?? rule.threshold_low,
        effective_threshold_high: override?.threshold_high_override ?? rule.threshold_high,
        has_override: !!override,
        override_multiplier: weightMultiplier,
        override_scope: override?.scope,
        usage_count: rule.kpi_ids?.length || 0,
        used_by_kpis: rule.kpi_ids || [],
      };
    });
  } catch (error) {
    console.error('Error in getAllRulesWithAdminMeta:', error);
    return [];
  }
}

/**
 * Get single rule with admin metadata
 *
 * @param ruleId - Rule identifier
 * @param vertical - Optional vertical
 * @param market - Optional market
 * @param organizationId - Optional organization ID
 * @returns Rule with admin metadata or null
 */
export async function getRuleWithAdminMeta(
  ruleId: string,
  vertical?: string,
  market?: string,
  organizationId?: string
): Promise<RuleWithAdminMeta | null> {
  const allRules = await getAllRulesWithAdminMeta(vertical, market, organizationId);
  return allRules.find((r) => r.rule_id === ruleId) || null;
}

/**
 * Get rules by scope
 *
 * @param scope - Rule scope filter
 * @returns Array of rules for the specified scope
 */
export async function getRulesByScope(
  scope: 'title' | 'subtitle' | 'description' | 'coverage' | 'intent' | 'global'
): Promise<RuleWithAdminMeta[]> {
  const allRules = await getAllRulesWithAdminMeta();
  return allRules.filter((r) => r.scope === scope);
}

/**
 * Get rules by family
 *
 * @param family - Rule family filter
 * @returns Array of rules for the specified family
 */
export async function getRulesByFamily(
  family: 'ranking' | 'conversion' | 'diagnostic' | 'coverage'
): Promise<RuleWithAdminMeta[]> {
  const allRules = await getAllRulesWithAdminMeta();
  return allRules.filter((r) => r.family === family);
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Update rule weight override
 *
 * @param request - Weight update request
 * @returns Success boolean
 */
export async function updateRuleWeight(
  request: UpdateRuleWeightRequest
): Promise<boolean> {
  try {
    // Validate weight multiplier bounds
    if (request.weightMultiplier < 0.5 || request.weightMultiplier > 2.0) {
      console.error('Weight multiplier must be between 0.5 and 2.0');
      return false;
    }

    // Check if rule exists
    const { data: rule } = await supabase
      .from('aso_rule_evaluators')
      .select('id')
      .eq('rule_id', request.ruleId)
      .maybeSingle();

    if (!rule) {
      console.error(`Rule ${request.ruleId} not found`);
      return false;
    }

    // Upsert override
    const { error } = await supabase
      .from('aso_rule_evaluator_overrides')
      .upsert(
        {
          rule_id: request.ruleId,
          scope: request.scope,
          vertical: request.vertical || null,
          market: request.market || null,
          organization_id: request.organizationId || null,
          weight_multiplier: request.weightMultiplier,
          notes: request.notes || null,
          is_active: true,
          version: 1,
        },
        {
          onConflict: 'rule_id,scope,vertical,market,organization_id',
        }
      );

    if (error) {
      console.error('Error updating rule weight:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateRuleWeight:', error);
    return false;
  }
}

/**
 * Update rule threshold override
 *
 * @param request - Threshold update request
 * @returns Success boolean
 */
export async function updateRuleThreshold(
  request: UpdateRuleThresholdRequest
): Promise<boolean> {
  try {
    // Check if rule exists
    const { data: rule } = await supabase
      .from('aso_rule_evaluators')
      .select('id')
      .eq('rule_id', request.ruleId)
      .maybeSingle();

    if (!rule) {
      console.error(`Rule ${request.ruleId} not found`);
      return false;
    }

    // Upsert override
    const { error } = await supabase
      .from('aso_rule_evaluator_overrides')
      .upsert(
        {
          rule_id: request.ruleId,
          scope: request.scope,
          vertical: request.vertical || null,
          market: request.market || null,
          organization_id: request.organizationId || null,
          threshold_low_override: request.thresholdLow ?? null,
          threshold_high_override: request.thresholdHigh ?? null,
          notes: request.notes || null,
          is_active: true,
          version: 1,
        },
        {
          onConflict: 'rule_id,scope,vertical,market,organization_id',
        }
      );

    if (error) {
      console.error('Error updating rule threshold:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateRuleThreshold:', error);
    return false;
  }
}

/**
 * Update rule severity override
 *
 * @param request - Severity update request
 * @returns Success boolean
 */
export async function updateRuleSeverity(
  request: UpdateRuleSeverityRequest
): Promise<boolean> {
  try {
    // Check if rule exists
    const { data: rule } = await supabase
      .from('aso_rule_evaluators')
      .select('id')
      .eq('rule_id', request.ruleId)
      .maybeSingle();

    if (!rule) {
      console.error(`Rule ${request.ruleId} not found`);
      return false;
    }

    // Upsert override
    const { error } = await supabase
      .from('aso_rule_evaluator_overrides')
      .upsert(
        {
          rule_id: request.ruleId,
          scope: request.scope,
          vertical: request.vertical || null,
          market: request.market || null,
          organization_id: request.organizationId || null,
          severity_override: request.severity,
          notes: request.notes || null,
          is_active: true,
          version: 1,
        },
        {
          onConflict: 'rule_id,scope,vertical,market,organization_id',
        }
      );

    if (error) {
      console.error('Error updating rule severity:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateRuleSeverity:', error);
    return false;
  }
}

/**
 * Update rule metadata (base rule, not overrides)
 *
 * @param request - Metadata update request
 * @returns Success boolean
 */
export async function updateRuleMeta(
  request: UpdateRuleMetaRequest
): Promise<boolean> {
  try {
    const updates: any = {};

    if (request.name !== undefined) updates.name = request.name;
    if (request.description !== undefined) updates.description = request.description;
    if (request.notes !== undefined) updates.notes = request.notes;
    if (request.help_text !== undefined) updates.help_text = request.help_text;
    if (request.tags !== undefined) updates.tags = request.tags;

    const { error } = await supabase
      .from('aso_rule_evaluators')
      .update(updates)
      .eq('rule_id', request.ruleId);

    if (error) {
      console.error('Error updating rule metadata:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateRuleMeta:', error);
    return false;
  }
}

/**
 * Deprecate a rule
 *
 * @param request - Deprecation request
 * @returns Success boolean
 */
export async function deprecateRule(
  request: DeprecateRuleRequest
): Promise<boolean> {
  try {
    // Check if rule can be deprecated (not used by active KPIs)
    const rule = await getRuleWithAdminMeta(request.ruleId);
    if (!rule) {
      console.error(`Rule ${request.ruleId} not found`);
      return false;
    }

    if (rule.usage_count && rule.usage_count > 0) {
      console.error(`Rule ${request.ruleId} is used by ${rule.usage_count} KPI(s), cannot deprecate`);
      return false;
    }

    const { error } = await supabase
      .from('aso_rule_evaluators')
      .update({
        is_deprecated: true,
        deprecated_reason: request.reason,
      })
      .eq('rule_id', request.ruleId);

    if (error) {
      console.error('Error deprecating rule:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deprecateRule:', error);
    return false;
  }
}

/**
 * Get rule statistics summary
 *
 * @returns Statistics about rule registry
 */
export async function getRuleStatistics() {
  const allRules = await getAllRulesWithAdminMeta();

  return {
    total: allRules.length,
    active: allRules.filter((r) => r.is_active && !r.is_deprecated).length,
    deprecated: allRules.filter((r) => r.is_deprecated).length,
    withOverrides: allRules.filter((r) => r.has_override).length,
    byScope: {
      title: allRules.filter((r) => r.scope === 'title').length,
      subtitle: allRules.filter((r) => r.scope === 'subtitle').length,
      description: allRules.filter((r) => r.scope === 'description').length,
      coverage: allRules.filter((r) => r.scope === 'coverage').length,
      intent: allRules.filter((r) => r.scope === 'intent').length,
      global: allRules.filter((r) => r.scope === 'global').length,
    },
    byFamily: {
      ranking: allRules.filter((r) => r.family === 'ranking').length,
      conversion: allRules.filter((r) => r.family === 'conversion').length,
      diagnostic: allRules.filter((r) => r.family === 'diagnostic').length,
      coverage: allRules.filter((r) => r.family === 'coverage').length,
    },
    bySeverity: {
      critical: allRules.filter((r) => r.effective_severity === 'critical').length,
      strong: allRules.filter((r) => r.effective_severity === 'strong').length,
      moderate: allRules.filter((r) => r.effective_severity === 'moderate').length,
      optional: allRules.filter((r) => r.effective_severity === 'optional').length,
      info: allRules.filter((r) => r.effective_severity === 'info').length,
    },
  };
}
