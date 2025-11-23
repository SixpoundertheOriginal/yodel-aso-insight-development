/**
 * Rule Evaluator Admin API
 *
 * Phase 15: Admin API layer for rule evaluator registry management
 *
 * Provides HTTP-style API interface for React Query hooks.
 * All operations handle auth, validation, and cache invalidation.
 */

import {
  getAllRulesWithAdminMeta,
  getRuleWithAdminMeta,
  getRulesByScope,
  getRulesByFamily,
  updateRuleWeight,
  updateRuleThreshold,
  updateRuleSeverity,
  updateRuleMeta,
  deprecateRule,
  getRuleStatistics,
} from './adminRuleService';
import type {
  RuleWithAdminMeta,
  UpdateRuleWeightRequest,
  UpdateRuleThresholdRequest,
  UpdateRuleSeverityRequest,
  UpdateRuleMetaRequest,
  DeprecateRuleRequest,
} from './adminRuleService';

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Rule Registry response
 */
export interface RuleRegistryResponse {
  rules: RuleWithAdminMeta[];
  statistics: {
    total: number;
    active: number;
    deprecated: number;
    withOverrides: number;
    byScope: Record<string, number>;
    byFamily: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

/**
 * Rule detail response
 */
export interface RuleDetailResponse {
  rule: RuleWithAdminMeta;
  canDeprecate: boolean;
  deprecationReason?: string;
  affectedKpis?: string[];
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get complete rule registry with statistics
 */
export class AdminRuleApi {
  /**
   * Get rule registry
   *
   * @param vertical - Optional vertical filter
   * @param market - Optional market filter
   * @param organizationId - Optional organization filter
   * @returns Rule registry with statistics
   */
  static async getRuleRegistry(
    vertical?: string,
    market?: string,
    organizationId?: string
  ): Promise<RuleRegistryResponse> {
    try {
      const [rules, statistics] = await Promise.all([
        getAllRulesWithAdminMeta(vertical, market, organizationId),
        getRuleStatistics(),
      ]);

      return {
        rules,
        statistics,
      };
    } catch (error) {
      console.error('Error fetching rule registry:', error);
      throw new Error('Failed to fetch rule registry');
    }
  }

  /**
   * Get single rule with detail
   *
   * @param ruleId - Rule identifier
   * @param vertical - Optional vertical
   * @param market - Optional market
   * @param organizationId - Optional organization ID
   * @returns Rule detail or null
   */
  static async getRuleDetail(
    ruleId: string,
    vertical?: string,
    market?: string,
    organizationId?: string
  ): Promise<RuleDetailResponse | null> {
    try {
      const rule = await getRuleWithAdminMeta(ruleId, vertical, market, organizationId);
      if (!rule) return null;

      // Check if rule can be deprecated
      const canDeprecate = !rule.usage_count || rule.usage_count === 0;
      const deprecationReason = canDeprecate
        ? undefined
        : `Rule is used by ${rule.usage_count} KPI(s)`;

      return {
        rule,
        canDeprecate,
        deprecationReason,
        affectedKpis: rule.used_by_kpis || [],
      };
    } catch (error) {
      console.error(`Error fetching rule detail for ${ruleId}:`, error);
      return null;
    }
  }

  /**
   * Get rules by scope
   *
   * @param scope - Scope filter
   * @returns Rules for the specified scope
   */
  static async getRulesByScope(
    scope: 'title' | 'subtitle' | 'description' | 'coverage' | 'intent' | 'global'
  ): Promise<RuleWithAdminMeta[]> {
    try {
      return await getRulesByScope(scope);
    } catch (error) {
      console.error(`Error fetching rules by scope ${scope}:`, error);
      return [];
    }
  }

  /**
   * Get rules by family
   *
   * @param family - Family filter
   * @returns Rules for the specified family
   */
  static async getRulesByFamily(
    family: 'ranking' | 'conversion' | 'diagnostic' | 'coverage'
  ): Promise<RuleWithAdminMeta[]> {
    try {
      return await getRulesByFamily(family);
    } catch (error) {
      console.error(`Error fetching rules by family ${family}:`, error);
      return [];
    }
  }

  // ============================================================================
  // Mutation Operations
  // ============================================================================

  /**
   * Update rule weight override
   *
   * @param request - Weight update request
   * @returns Success boolean
   */
  static async updateRuleWeight(request: UpdateRuleWeightRequest): Promise<boolean> {
    try {
      const success = await updateRuleWeight(request);

      // Cache invalidation handled by React Query hooks

      return success;
    } catch (error) {
      console.error('Error updating rule weight:', error);
      return false;
    }
  }

  /**
   * Update rule threshold override
   *
   * @param request - Threshold update request
   * @returns Success boolean
   */
  static async updateRuleThreshold(request: UpdateRuleThresholdRequest): Promise<boolean> {
    try {
      const success = await updateRuleThreshold(request);

      // Cache invalidation handled by React Query hooks

      return success;
    } catch (error) {
      console.error('Error updating rule threshold:', error);
      return false;
    }
  }

  /**
   * Update rule severity override
   *
   * @param request - Severity update request
   * @returns Success boolean
   */
  static async updateRuleSeverity(request: UpdateRuleSeverityRequest): Promise<boolean> {
    try {
      const success = await updateRuleSeverity(request);

      // Cache invalidation handled by React Query hooks

      return success;
    } catch (error) {
      console.error('Error updating rule severity:', error);
      return false;
    }
  }

  /**
   * Update rule metadata
   *
   * @param request - Metadata update request
   * @returns Success boolean
   */
  static async updateRuleMeta(request: UpdateRuleMetaRequest): Promise<boolean> {
    try {
      const success = await updateRuleMeta(request);

      // Cache invalidation handled by React Query hooks

      return success;
    } catch (error) {
      console.error('Error updating rule metadata:', error);
      return false;
    }
  }

  /**
   * Deprecate rule
   *
   * @param request - Deprecation request
   * @returns Success boolean
   */
  static async deprecateRule(request: DeprecateRuleRequest): Promise<boolean> {
    try {
      const success = await deprecateRule(request);

      if (success) {
        console.log('Rule deprecated:', request.ruleId);
      }

      return success;
    } catch (error) {
      console.error('Error deprecating rule:', error);
      return false;
    }
  }
}

export default AdminRuleApi;
