/**
 * Intent Pattern Registry Hooks
 *
 * Phase 16: React Query hooks for intent pattern registry management
 *
 * Provides:
 * - useIntentRegistry() - Fetch all intent patterns with statistics
 * - useIntentDetail() - Fetch single pattern with detail
 * - useIntentStats() - Fetch pattern statistics
 * - useIntentMutations() - Mutations for pattern updates
 * - useIntentOverrideMutations() - Mutations for override management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminIntentApi } from '@/services/admin/adminIntentApi';
import type {
  IntentPatternFilters,
  CreateIntentPatternRequest,
  UpdateIntentPatternRequest,
  CreateIntentOverrideRequest,
  IntentType,
  IntentScope,
} from '@/services/admin/adminIntentService';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch complete intent pattern registry with statistics
 *
 * @param filters - Optional filters for patterns
 * @returns Query result with intent pattern registry data
 */
export function useIntentRegistry(filters?: IntentPatternFilters) {
  return useQuery({
    queryKey: ['intent-registry', filters],
    queryFn: () => AdminIntentApi.getIntentPatternRegistry(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single intent pattern with detail
 *
 * @param patternId - Pattern UUID
 * @param filters - Optional context filters for effective weights
 * @returns Query result with pattern detail
 */
export function useIntentDetail(patternId: string, filters?: IntentPatternFilters) {
  return useQuery({
    queryKey: ['intent-detail', patternId, filters],
    queryFn: () => AdminIntentApi.getIntentPatternDetail(patternId, filters),
    enabled: !!patternId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch intent pattern statistics
 *
 * @returns Query result with pattern statistics
 */
export function useIntentStats() {
  return useQuery({
    queryKey: ['intent-stats'],
    queryFn: async () => {
      const registry = await AdminIntentApi.getIntentPatternRegistry();
      return registry.statistics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch patterns by intent type
 *
 * @param intentType - Intent type filter
 * @returns Query result with patterns of specified type
 */
export function usePatternsByIntentType(intentType: IntentType) {
  return useQuery({
    queryKey: ['patterns-by-intent-type', intentType],
    queryFn: () => AdminIntentApi.getPatternsByIntentType(intentType),
    enabled: !!intentType,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch patterns by scope
 *
 * @param scope - Scope filter
 * @returns Query result with patterns of specified scope
 */
export function usePatternsByScope(scope: IntentScope) {
  return useQuery({
    queryKey: ['patterns-by-scope', scope],
    queryFn: () => AdminIntentApi.getPatternsByScope(scope),
    enabled: !!scope,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch effective patterns for a given context
 *
 * Returns patterns with overrides applied based on scope precedence.
 *
 * @param vertical - Vertical context
 * @param market - Market context
 * @param organizationId - Organization context
 * @param appId - App context
 * @returns Query result with effective patterns
 */
export function useEffectivePatterns(
  vertical?: string,
  market?: string,
  organizationId?: string,
  appId?: string
) {
  return useQuery({
    queryKey: ['effective-patterns', vertical, market, organizationId, appId],
    queryFn: () => AdminIntentApi.getEffectivePatterns(vertical, market, organizationId, appId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all unique tags used in patterns
 *
 * @returns Query result with array of tags
 */
export function useIntentTags() {
  return useQuery({
    queryKey: ['intent-tags'],
    queryFn: () => AdminIntentApi.getAllTags(),
    staleTime: 10 * 60 * 1000, // 10 minutes (tags change infrequently)
  });
}

// ============================================================================
// Mutation Hooks - Pattern CRUD
// ============================================================================

/**
 * Intent pattern creation mutations
 *
 * Provides mutations for creating new intent patterns
 *
 * @returns Mutation hooks
 */
export function useCreateIntentPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateIntentPatternRequest) =>
      AdminIntentApi.createPattern(request),
    onSuccess: () => {
      // Invalidate pattern registry and related queries
      queryClient.invalidateQueries({ queryKey: ['intent-registry'] });
      queryClient.invalidateQueries({ queryKey: ['intent-stats'] });
      queryClient.invalidateQueries({ queryKey: ['intent-tags'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-by-intent-type'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-by-scope'] });
      queryClient.invalidateQueries({ queryKey: ['effective-patterns'] });
    },
  });
}

/**
 * Intent pattern update mutations
 *
 * Provides mutations for updating intent pattern metadata
 *
 * @returns Mutation hooks
 */
export function useUpdateIntentPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateIntentPatternRequest) =>
      AdminIntentApi.updatePattern(request),
    onSuccess: (_, variables) => {
      // Invalidate pattern registry and detail queries
      queryClient.invalidateQueries({ queryKey: ['intent-registry'] });
      queryClient.invalidateQueries({ queryKey: ['intent-detail', variables.patternId] });
      queryClient.invalidateQueries({ queryKey: ['intent-stats'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-by-intent-type'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-by-scope'] });
      queryClient.invalidateQueries({ queryKey: ['effective-patterns'] });
    },
  });
}

/**
 * Intent pattern deletion mutations
 *
 * Provides mutations for deleting intent patterns (soft delete)
 *
 * @returns Mutation hooks
 */
export function useDeleteIntentPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patternId: string) => AdminIntentApi.deletePattern(patternId),
    onSuccess: () => {
      // Invalidate pattern registry and related queries
      queryClient.invalidateQueries({ queryKey: ['intent-registry'] });
      queryClient.invalidateQueries({ queryKey: ['intent-stats'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-by-intent-type'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-by-scope'] });
      queryClient.invalidateQueries({ queryKey: ['effective-patterns'] });
    },
  });
}

// ============================================================================
// Mutation Hooks - Overrides
// ============================================================================

/**
 * Intent pattern override mutations
 *
 * Provides mutations for creating/updating intent pattern overrides
 *
 * @param vertical - Optional vertical (for cache invalidation)
 * @param market - Optional market (for cache invalidation)
 * @param organizationId - Optional organization (for cache invalidation)
 * @param appId - Optional app (for cache invalidation)
 * @returns Mutation hooks
 */
export function useIntentOverrideMutations(
  vertical?: string,
  market?: string,
  organizationId?: string,
  appId?: string
) {
  const queryClient = useQueryClient();

  const createOrUpdateOverride = useMutation({
    mutationFn: (request: CreateIntentOverrideRequest) =>
      AdminIntentApi.createOrUpdateOverride(request),
    onSuccess: () => {
      // Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: ['intent-registry'],
      });
      queryClient.invalidateQueries({
        queryKey: ['intent-stats'],
      });
      queryClient.invalidateQueries({
        queryKey: ['effective-patterns', vertical, market, organizationId, appId],
      });
      queryClient.invalidateQueries({
        queryKey: ['patterns-by-intent-type'],
      });
      queryClient.invalidateQueries({
        queryKey: ['patterns-by-scope'],
      });
    },
  });

  const deleteOverride = useMutation({
    mutationFn: (overrideId: string) => AdminIntentApi.deleteOverride(overrideId),
    onSuccess: () => {
      // Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: ['intent-registry'],
      });
      queryClient.invalidateQueries({
        queryKey: ['intent-stats'],
      });
      queryClient.invalidateQueries({
        queryKey: ['effective-patterns', vertical, market, organizationId, appId],
      });
      queryClient.invalidateQueries({
        queryKey: ['patterns-by-intent-type'],
      });
      queryClient.invalidateQueries({
        queryKey: ['patterns-by-scope'],
      });
    },
  });

  return { createOrUpdateOverride, deleteOverride };
}

// ============================================================================
// Batch Mutation Hooks
// ============================================================================

/**
 * Batch pattern creation mutations
 *
 * Provides mutations for creating multiple patterns in batch
 *
 * @returns Mutation hooks
 */
export function useCreatePatternsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requests: CreateIntentPatternRequest[]) =>
      AdminIntentApi.createPatternsBatch(requests),
    onSuccess: () => {
      // Invalidate all pattern-related queries
      queryClient.invalidateQueries({ queryKey: ['intent-registry'] });
      queryClient.invalidateQueries({ queryKey: ['intent-stats'] });
      queryClient.invalidateQueries({ queryKey: ['intent-tags'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-by-intent-type'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-by-scope'] });
      queryClient.invalidateQueries({ queryKey: ['effective-patterns'] });
    },
  });
}

/**
 * Batch pattern deletion mutations
 *
 * Provides mutations for deleting multiple patterns in batch
 *
 * @returns Mutation hooks
 */
export function useDeletePatternsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patternIds: string[]) => AdminIntentApi.deletePatternsBatch(patternIds),
    onSuccess: () => {
      // Invalidate all pattern-related queries
      queryClient.invalidateQueries({ queryKey: ['intent-registry'] });
      queryClient.invalidateQueries({ queryKey: ['intent-stats'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-by-intent-type'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-by-scope'] });
      queryClient.invalidateQueries({ queryKey: ['effective-patterns'] });
    },
  });
}
