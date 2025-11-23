/**
 * Formula Registry Hooks
 *
 * Phase 14: React Query hooks for formula registry management
 *
 * Provides:
 * - useFormulaRegistry() - Fetch all formulas with usage stats
 * - useFormulaDetail() - Fetch single formula with detail
 * - useFormulaMutations() - Mutations for formula updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminFormulaApi } from '@/services/admin/adminFormulaApi';
import type {
  UpdateFormulaRequest,
  CreateFormulaRequest,
  DeprecateFormulaRequest,
} from '@/services/admin/adminFormulaService';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch complete formula registry
 *
 * @returns Query result with formula registry data
 */
export function useFormulaRegistry() {
  return useQuery({
    queryKey: ['formula-registry'],
    queryFn: () => AdminFormulaApi.getFormulaRegistry(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single formula with detail
 *
 * @param formulaId - Formula identifier
 * @returns Query result with formula detail
 */
export function useFormulaDetail(formulaId: string) {
  return useQuery({
    queryKey: ['formula-detail', formulaId],
    queryFn: () => AdminFormulaApi.getFormulaDetail(formulaId),
    enabled: !!formulaId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch formulas by type
 *
 * @param type - Formula type
 * @returns Query result with formulas of specified type
 */
export function useFormulasByType(
  type: 'weighted_sum' | 'ratio' | 'composite' | 'threshold_based' | 'custom'
) {
  return useQuery({
    queryKey: ['formulas-by-type', type],
    queryFn: () => AdminFormulaApi.getFormulasByType(type),
    enabled: !!type,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch editable formulas
 *
 * @returns Query result with editable formulas
 */
export function useEditableFormulas() {
  return useQuery({
    queryKey: ['editable-formulas'],
    queryFn: () => AdminFormulaApi.getEditableFormulas(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch deprecated formulas
 *
 * @returns Query result with deprecated formulas
 */
export function useDeprecatedFormulas() {
  return useQuery({
    queryKey: ['deprecated-formulas'],
    queryFn: () => AdminFormulaApi.getDeprecatedFormulas(),
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Formula parameter mutations
 *
 * Provides mutations for updating formula parameters
 *
 * @returns Mutation hooks
 */
export function useFormulaParameterMutations() {
  const queryClient = useQueryClient();

  const updateParameters = useMutation({
    mutationFn: (request: UpdateFormulaRequest) =>
      AdminFormulaApi.updateFormulaParameters(request),
    onSuccess: (_, variables) => {
      // Invalidate formula registry and detail queries
      queryClient.invalidateQueries({ queryKey: ['formula-registry'] });
      queryClient.invalidateQueries({ queryKey: ['formula-detail', variables.formulaId] });
    },
  });

  return { updateParameters };
}

/**
 * Formula creation mutations
 *
 * Provides mutations for creating new formulas
 *
 * @returns Mutation hooks
 */
export function useFormulaCreationMutations() {
  const queryClient = useQueryClient();

  const createFormula = useMutation({
    mutationFn: (request: CreateFormulaRequest) =>
      AdminFormulaApi.createFormula(request),
    onSuccess: () => {
      // Invalidate formula registry
      queryClient.invalidateQueries({ queryKey: ['formula-registry'] });
    },
  });

  return { createFormula };
}

/**
 * Formula deprecation mutations
 *
 * Provides mutations for deprecating formulas
 *
 * @returns Mutation hooks
 */
export function useFormulaDeprecationMutations() {
  const queryClient = useQueryClient();

  const deprecateFormula = useMutation({
    mutationFn: (request: DeprecateFormulaRequest) =>
      AdminFormulaApi.deprecateFormula(request),
    onSuccess: (_, variables) => {
      // Invalidate formula registry and detail queries
      queryClient.invalidateQueries({ queryKey: ['formula-registry'] });
      queryClient.invalidateQueries({ queryKey: ['formula-detail', variables.formulaId] });
      queryClient.invalidateQueries({ queryKey: ['deprecated-formulas'] });
    },
  });

  return { deprecateFormula };
}
