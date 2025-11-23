/**
 * KPI Registry Hooks
 *
 * Phase 14: React Query hooks for KPI registry management
 *
 * Provides:
 * - useKpiRegistry() - Fetch all KPIs and families
 * - useKpiDetail() - Fetch single KPI with detail
 * - useKpiMutations() - Mutations for KPI updates
 * - useFamilyMutations() - Mutations for family updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminKpiApi } from '@/services/admin/adminKpiApi';
import type {
  UpdateKpiMetaRequest,
  UpdateKpiWeightRequest,
  UpdateFamilyWeightRequest,
} from '@/services/admin/adminKpiService';
import type { KpiId, KpiFamilyId } from '@/engine/metadata/kpi/kpi.types';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch complete KPI registry
 *
 * @param vertical - Optional vertical for effective weights
 * @param market - Optional market for effective weights
 * @param organizationId - Optional organization for effective weights
 * @returns Query result with KPI registry data
 */
export function useKpiRegistry(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  return useQuery({
    queryKey: ['kpi-registry', vertical, market, organizationId],
    queryFn: () => AdminKpiApi.getKpiRegistry(vertical, market, organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single KPI with detail
 *
 * @param kpiId - KPI identifier
 * @param vertical - Optional vertical for effective weights
 * @param market - Optional market for effective weights
 * @param organizationId - Optional organization for effective weights
 * @returns Query result with KPI detail
 */
export function useKpiDetail(
  kpiId: KpiId,
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  return useQuery({
    queryKey: ['kpi-detail', kpiId, vertical, market, organizationId],
    queryFn: () => AdminKpiApi.getKpiDetail(kpiId, vertical, market, organizationId),
    enabled: !!kpiId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch KPIs by family
 *
 * @param familyId - Family identifier
 * @param vertical - Optional vertical for effective weights
 * @param market - Optional market for effective weights
 * @param organizationId - Optional organization for effective weights
 * @returns Query result with KPIs in family
 */
export function useKpisByFamily(
  familyId: KpiFamilyId,
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  return useQuery({
    queryKey: ['kpis-by-family', familyId, vertical, market, organizationId],
    queryFn: () => AdminKpiApi.getKpisByFamily(familyId, vertical, market, organizationId),
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all families with stats
 *
 * @param vertical - Optional vertical for effective weights
 * @param market - Optional market for effective weights
 * @param organizationId - Optional organization for effective weights
 * @returns Query result with families
 */
export function useFamilies(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  return useQuery({
    queryKey: ['families', vertical, market, organizationId],
    queryFn: () => AdminKpiApi.getFamilies(vertical, market, organizationId),
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * KPI metadata mutations
 *
 * Provides mutations for updating KPI metadata (description, notes, etc.)
 *
 * @returns Mutation hooks
 */
export function useKpiMetaMutations() {
  const queryClient = useQueryClient();

  const updateMeta = useMutation({
    mutationFn: (request: UpdateKpiMetaRequest) =>
      AdminKpiApi.updateKpiMeta(request),
    onSuccess: (_, variables) => {
      // Invalidate KPI registry and detail queries
      queryClient.invalidateQueries({ queryKey: ['kpi-registry'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', variables.kpiId] });
    },
  });

  return { updateMeta };
}

/**
 * KPI weight mutations
 *
 * Provides mutations for updating KPI weight overrides
 *
 * @param vertical - Optional vertical (for cache invalidation)
 * @param market - Optional market (for cache invalidation)
 * @param organizationId - Optional organization (for cache invalidation)
 * @returns Mutation hooks
 */
export function useKpiWeightMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const updateWeight = useMutation({
    mutationFn: (request: UpdateKpiWeightRequest) =>
      AdminKpiApi.updateKpiWeightOverride(request),
    onSuccess: () => {
      // Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: ['kpi-registry', vertical, market, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['kpis-by-family'],
      });
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  const deleteOverride = useMutation({
    mutationFn: (overrideId: string) =>
      AdminKpiApi.deleteKpiWeightOverride(overrideId, vertical, market, organizationId),
    onSuccess: () => {
      // Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: ['kpi-registry', vertical, market, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['kpis-by-family'],
      });
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  return { updateWeight, deleteOverride };
}

/**
 * Family weight mutations
 *
 * Provides mutations for updating family weight overrides
 *
 * @param vertical - Optional vertical (for cache invalidation)
 * @param market - Optional market (for cache invalidation)
 * @param organizationId - Optional organization (for cache invalidation)
 * @returns Mutation hooks
 */
export function useFamilyWeightMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const updateWeight = useMutation({
    mutationFn: (request: UpdateFamilyWeightRequest) =>
      AdminKpiApi.updateFamilyWeight(request),
    onSuccess: () => {
      // Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: ['families', vertical, market, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['kpi-registry', vertical, market, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  return { updateWeight };
}

/**
 * KPI formula mutations
 *
 * Provides mutations for updating KPI-formula mappings
 *
 * @param vertical - Optional vertical (for cache invalidation)
 * @param market - Optional market (for cache invalidation)
 * @param organizationId - Optional organization (for cache invalidation)
 * @returns Mutation hooks
 */
export function useKpiFormulaMutations(
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const queryClient = useQueryClient();

  const updateFormula = useMutation({
    mutationFn: ({ kpiId, formulaId }: { kpiId: KpiId; formulaId: string }) =>
      AdminKpiApi.updateKpiFormula(kpiId, formulaId, vertical, market, organizationId),
    onSuccess: (_, variables) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: ['kpi-detail', variables.kpiId],
      });
      queryClient.invalidateQueries({
        queryKey: ['kpi-registry', vertical, market, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ruleset', vertical, market, organizationId],
      });
    },
  });

  return { updateFormula };
}
