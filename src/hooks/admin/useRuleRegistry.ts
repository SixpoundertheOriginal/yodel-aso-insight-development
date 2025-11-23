/**
 * Rule Registry Hooks
 *
 * Phase 15: React Query hooks for rule evaluator registry management
 *
 * Provides:
 * - useRuleRegistry() - Fetch all rules with usage stats
 * - useRuleDetail() - Fetch single rule with detail
 * - useRuleMutations() - Mutations for rule updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminRuleApi } from '@/services/admin/adminRuleApi';
import type {
  UpdateRuleWeightRequest,
  UpdateRuleThresholdRequest,
  UpdateRuleSeverityRequest,
  UpdateRuleMetaRequest,
  DeprecateRuleRequest,
} from '@/services/admin/adminRuleService';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch complete rule registry
 *
 * @param vertical - Optional vertical filter
 * @param market - Optional market filter
 * @param organizationId - Optional organization filter
 * @returns Query result with rule registry data
 */
export function useRuleRegistry(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  return useQuery({
    queryKey: ['rule-registry', vertical, market, organizationId],
    queryFn: () => AdminRuleApi.getRuleRegistry(vertical, market, organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single rule with detail
 *
 * @param ruleId - Rule identifier
 * @param vertical - Optional vertical
 * @param market - Optional market
 * @param organizationId - Optional organization ID
 * @returns Query result with rule detail
 */
export function useRuleDetail(
  ruleId: string,
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  return useQuery({
    queryKey: ['rule-detail', ruleId, vertical, market, organizationId],
    queryFn: () => AdminRuleApi.getRuleDetail(ruleId, vertical, market, organizationId),
    enabled: !!ruleId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch rules by scope
 *
 * @param scope - Scope filter
 * @returns Query result with rules for the specified scope
 */
export function useRulesByScope(
  scope: 'title' | 'subtitle' | 'description' | 'coverage' | 'intent' | 'global'
) {
  return useQuery({
    queryKey: ['rules-by-scope', scope],
    queryFn: () => AdminRuleApi.getRulesByScope(scope),
    enabled: !!scope,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch rules by family
 *
 * @param family - Family filter
 * @returns Query result with rules for the specified family
 */
export function useRulesByFamily(
  family: 'ranking' | 'conversion' | 'diagnostic' | 'coverage'
) {
  return useQuery({
    queryKey: ['rules-by-family', family],
    queryFn: () => AdminRuleApi.getRulesByFamily(family),
    enabled: !!family,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Rule weight mutations
 *
 * @param vertical - Optional vertical
 * @param market - Optional market
 * @param organizationId - Optional organization ID
 * @returns Mutation hooks for weight updates
 */
export function useRuleWeightMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const updateWeight = useMutation({
    mutationFn: (request: UpdateRuleWeightRequest) =>
      AdminRuleApi.updateRuleWeight(request),
    onSuccess: (_, variables) => {
      // Invalidate rule registry and detail queries
      queryClient.invalidateQueries({
        queryKey: ['rule-registry', vertical, market, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['rule-detail', variables.ruleId, vertical, market, organizationId],
      });
    },
  });

  return { updateWeight };
}

/**
 * Rule threshold mutations
 *
 * @param vertical - Optional vertical
 * @param market - Optional market
 * @param organizationId - Optional organization ID
 * @returns Mutation hooks for threshold updates
 */
export function useRuleThresholdMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const updateThreshold = useMutation({
    mutationFn: (request: UpdateRuleThresholdRequest) =>
      AdminRuleApi.updateRuleThreshold(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['rule-registry', vertical, market, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['rule-detail', variables.ruleId, vertical, market, organizationId],
      });
    },
  });

  return { updateThreshold };
}

/**
 * Rule severity mutations
 *
 * @param vertical - Optional vertical
 * @param market - Optional market
 * @param organizationId - Optional organization ID
 * @returns Mutation hooks for severity updates
 */
export function useRuleSeverityMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const updateSeverity = useMutation({
    mutationFn: (request: UpdateRuleSeverityRequest) =>
      AdminRuleApi.updateRuleSeverity(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['rule-registry', vertical, market, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['rule-detail', variables.ruleId, vertical, market, organizationId],
      });
    },
  });

  return { updateSeverity };
}

/**
 * Rule metadata mutations
 *
 * @returns Mutation hooks for metadata updates
 */
export function useRuleMetaMutations() {
  const queryClient = useQueryClient();

  const updateMeta = useMutation({
    mutationFn: (request: UpdateRuleMetaRequest) =>
      AdminRuleApi.updateRuleMeta(request),
    onSuccess: (_, variables) => {
      // Invalidate all rule queries since metadata affects display
      queryClient.invalidateQueries({ queryKey: ['rule-registry'] });
      queryClient.invalidateQueries({ queryKey: ['rule-detail', variables.ruleId] });
    },
  });

  return { updateMeta };
}

/**
 * Rule deprecation mutations
 *
 * @returns Mutation hooks for deprecation
 */
export function useRuleDeprecationMutations() {
  const queryClient = useQueryClient();

  const deprecateRule = useMutation({
    mutationFn: (request: DeprecateRuleRequest) =>
      AdminRuleApi.deprecateRule(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rule-registry'] });
      queryClient.invalidateQueries({ queryKey: ['rule-detail', variables.ruleId] });
    },
  });

  return { deprecateRule };
}
