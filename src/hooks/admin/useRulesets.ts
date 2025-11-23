/**
 * ASO Bible Admin Hooks
 *
 * Phase 13.2: Custom hooks for ruleset management
 *
 * Provides:
 * - Data fetching (rulesets, overrides)
 * - Mutations (create, update, delete)
 * - Cache invalidation
 * - Loading/error states
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminRulesetApi,
  type RulesetPreviewRequest,
  type RulesetPublishRequest,
  type RulesetRollbackRequest,
} from '@/services/admin/adminRulesetApi';
import {
  AdminOverrideApi,
  type CreateTokenOverrideRequest,
  type CreateHookOverrideRequest,
  type CreateStopwordOverrideRequest,
  type CreateKpiOverrideRequest,
  type CreateFormulaOverrideRequest,
  type CreateRecommendationOverrideRequest,
} from '@/services/admin/adminOverrideApi';

// ============================================================================
// Ruleset Queries
// ============================================================================

/**
 * List all rulesets (vertical, market, client)
 *
 * @param scope - Optional scope filter
 * @returns Query result with ruleset list
 */
export function useRulesetList(scope?: 'vertical' | 'market' | 'client') {
  return useQuery({
    queryKey: ['rulesets', 'list', scope],
    queryFn: () => AdminRulesetApi.getRulesetList(scope),
  });
}

/**
 * Get specific ruleset with all overrides
 *
 * @param vertical - Vertical ID
 * @param market - Market ID
 * @param organizationId - Organization ID (optional)
 * @returns Query result with ruleset data
 */
export function useRuleset(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  return useQuery({
    queryKey: ['ruleset', vertical, market, organizationId],
    queryFn: () => AdminRulesetApi.getRuleset(vertical, market, organizationId),
    enabled: !!(vertical || market || organizationId),
  });
}

/**
 * Get audit log entries
 *
 * @param limit - Max number of entries to fetch
 * @returns Query result with audit log
 */
export function useAuditLog(limit: number = 100) {
  return useQuery({
    queryKey: ['audit-log', limit],
    queryFn: () => AdminRulesetApi.getAuditLog(limit),
  });
}

// ============================================================================
// Ruleset Mutations
// ============================================================================

/**
 * Preview merged ruleset before publishing
 *
 * @returns Mutation hook for previewing rulesets
 */
export function useRulesetPreview() {
  return useMutation({
    mutationFn: (request: RulesetPreviewRequest) =>
      AdminRulesetApi.previewRuleset(request),
  });
}

/**
 * Publish ruleset changes
 *
 * @returns Mutation hook for publishing rulesets
 */
export function usePublishRuleset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RulesetPublishRequest) =>
      AdminRulesetApi.publishRuleset(request),
    onSuccess: () => {
      // Invalidate all ruleset queries
      queryClient.invalidateQueries({ queryKey: ['rulesets'] });
      queryClient.invalidateQueries({ queryKey: ['ruleset'] });
    },
  });
}

/**
 * Rollback to previous version
 *
 * @returns Mutation hook for rollback
 */
export function useRollbackRuleset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RulesetRollbackRequest) =>
      AdminRulesetApi.rollbackRuleset(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rulesets'] });
      queryClient.invalidateQueries({ queryKey: ['ruleset'] });
    },
  });
}

// ============================================================================
// Token Override Mutations
// ============================================================================

/**
 * Token override mutations (upsert, delete)
 *
 * @param vertical - Vertical ID (for cache invalidation)
 * @param market - Market ID (for cache invalidation)
 * @param organizationId - Organization ID (for cache invalidation)
 * @returns Mutation hooks for token overrides
 */
export function useTokenOverrideMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (request: CreateTokenOverrideRequest) =>
      AdminOverrideApi.upsertTokenOverride(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => AdminOverrideApi.deleteTokenOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  return { upsert, remove };
}

// ============================================================================
// Hook Override Mutations
// ============================================================================

/**
 * Hook override mutations (upsert, delete)
 *
 * @param vertical - Vertical ID (for cache invalidation)
 * @param market - Market ID (for cache invalidation)
 * @param organizationId - Organization ID (for cache invalidation)
 * @returns Mutation hooks for hook overrides
 */
export function useHookOverrideMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (request: CreateHookOverrideRequest) =>
      AdminOverrideApi.upsertHookOverride(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => AdminOverrideApi.deleteHookOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  return { upsert, remove };
}

// ============================================================================
// Stopword Override Mutations
// ============================================================================

/**
 * Stopword override mutations (upsert, delete)
 *
 * @param vertical - Vertical ID (for cache invalidation)
 * @param market - Market ID (for cache invalidation)
 * @param organizationId - Organization ID (for cache invalidation)
 * @returns Mutation hooks for stopword overrides
 */
export function useStopwordOverrideMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (request: CreateStopwordOverrideRequest) =>
      AdminOverrideApi.upsertStopwordOverride(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => AdminOverrideApi.deleteStopwordOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  return { upsert, remove };
}

// ============================================================================
// KPI Override Mutations
// ============================================================================

/**
 * KPI weight override mutations (upsert, delete)
 *
 * @param vertical - Vertical ID (for cache invalidation)
 * @param market - Market ID (for cache invalidation)
 * @param organizationId - Organization ID (for cache invalidation)
 * @returns Mutation hooks for KPI overrides
 */
export function useKpiOverrideMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (request: CreateKpiOverrideRequest) =>
      AdminOverrideApi.upsertKpiOverride(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => AdminOverrideApi.deleteKpiOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  return { upsert, remove };
}

// ============================================================================
// Formula Override Mutations
// ============================================================================

/**
 * Formula override mutations (upsert, delete)
 *
 * @param vertical - Vertical ID (for cache invalidation)
 * @param market - Market ID (for cache invalidation)
 * @param organizationId - Organization ID (for cache invalidation)
 * @returns Mutation hooks for formula overrides
 */
export function useFormulaOverrideMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (request: CreateFormulaOverrideRequest) =>
      AdminOverrideApi.upsertFormulaOverride(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => AdminOverrideApi.deleteFormulaOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  return { upsert, remove };
}

// ============================================================================
// Recommendation Override Mutations
// ============================================================================

/**
 * Recommendation template mutations (upsert, delete)
 *
 * @param vertical - Vertical ID (for cache invalidation)
 * @param market - Market ID (for cache invalidation)
 * @param organizationId - Organization ID (for cache invalidation)
 * @returns Mutation hooks for recommendation overrides
 */
export function useRecommendationOverrideMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (request: CreateRecommendationOverrideRequest) =>
      AdminOverrideApi.upsertRecommendationOverride(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      AdminOverrideApi.deleteRecommendationOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  return { upsert, remove };
}
