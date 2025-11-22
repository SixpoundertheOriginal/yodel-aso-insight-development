/**
 * useMonitoredAppConsistency Hook
 *
 * Auto-healing hook for monitored apps:
 * 1. Validates consistency on mount (checks cache/snapshot existence)
 * 2. Automatically rebuilds if invalid/stale
 * 3. Shows loading states during validation/rebuild
 *
 * Usage:
 * ```tsx
 * const { isValidating, isRebuilding, validated_state, rebuild } =
 *   useMonitoredAppConsistency(monitoredAppId);
 *
 * if (isValidating || isRebuilding) {
 *   return <LoadingShimmer />;
 * }
 *
 * if (validated_state === 'valid') {
 *   // Load cached audit
 * }
 * ```
 *
 * This hook ensures users NEVER see "No metadata cache available" errors.
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ==================== TYPES ====================

type ValidatedState = 'valid' | 'stale' | 'invalid' | 'unknown';

interface ValidationResult {
  validated_state: ValidatedState;
  has_cache: boolean;
  has_snapshot: boolean;
  cache_age_hours?: number;
  needs_rebuild: boolean;
}

interface RebuildResult {
  validated_state: ValidatedState;
  metadata_cached: boolean;
  audit_created: boolean;
  audit_score?: number;
}

// ==================== HOOK ====================

export interface UseMonitoredAppConsistencyOptions {
  /**
   * If true, automatically rebuilds invalid/stale apps on mount
   * Default: true
   */
  autoRebuild?: boolean;

  /**
   * If true, shows toast notifications during validation/rebuild
   * Default: false (silent auto-healing)
   */
  showNotifications?: boolean;

  /**
   * Callback when rebuild completes successfully
   */
  onRebuildComplete?: () => void;
}

export function useMonitoredAppConsistency(
  monitoredAppId: string | undefined,
  organizationId: string | undefined,
  options: UseMonitoredAppConsistencyOptions = {}
) {
  const {
    autoRebuild = true,
    showNotifications = false,
    onRebuildComplete
  } = options;

  const queryClient = useQueryClient();
  const [isRebuildingAuto, setIsRebuildingAuto] = useState(false);

  // ========================================================================
  // Validation Query (check consistency)
  // ========================================================================
  const {
    data: validationResult,
    isLoading: isValidating,
    refetch: revalidate
  } = useQuery({
    queryKey: ['monitored-app-consistency', monitoredAppId],
    queryFn: async (): Promise<ValidationResult> => {
      if (!monitoredAppId) {
        throw new Error('Missing monitored_app_id');
      }

      console.log('[useMonitoredAppConsistency] Validating:', monitoredAppId);

      const { data, error } = await supabase.functions.invoke(
        'validate-monitored-app-consistency',
        {
          body: { monitored_app_id: monitoredAppId }
        }
      );

      if (error) {
        console.error('[useMonitoredAppConsistency] Validation error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error?.message || 'Validation failed');
      }

      console.log('[useMonitoredAppConsistency] Validation result:', data.data);
      return data.data;
    },
    enabled: Boolean(monitoredAppId && organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // ========================================================================
  // Rebuild Mutation (fix invalid/stale entries)
  // ========================================================================
  const rebuildMutation = useMutation({
    mutationFn: async (): Promise<RebuildResult> => {
      if (!monitoredAppId) {
        throw new Error('Missing monitored_app_id');
      }

      console.log('[useMonitoredAppConsistency] Rebuilding:', monitoredAppId);

      if (showNotifications) {
        toast.loading('Refreshing app data...', { id: 'rebuild' });
      }

      const { data, error } = await supabase.functions.invoke(
        'rebuild-monitored-app',
        {
          body: { monitored_app_id: monitoredAppId }
        }
      );

      if (error) {
        console.error('[useMonitoredAppConsistency] Rebuild error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error?.message || 'Rebuild failed');
      }

      console.log('[useMonitoredAppConsistency] Rebuild result:', data.data);
      return data.data;
    },
    onSuccess: (result) => {
      console.log('[useMonitoredAppConsistency] ✓ Rebuild complete:', result);

      if (showNotifications) {
        toast.success('App data refreshed', { id: 'rebuild' });
      }

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ['monitored-app-consistency', monitoredAppId]
      });
      queryClient.invalidateQueries({
        queryKey: ['monitored-audit', organizationId, monitoredAppId]
      });
      queryClient.invalidateQueries({
        queryKey: ['monitored-apps', organizationId]
      });

      if (onRebuildComplete) {
        onRebuildComplete();
      }

      setIsRebuildingAuto(false);
    },
    onError: (error) => {
      console.error('[useMonitoredAppConsistency] ✗ Rebuild failed:', error);

      if (showNotifications) {
        toast.error('Failed to refresh app data', {
          id: 'rebuild',
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      setIsRebuildingAuto(false);
    }
  });

  // ========================================================================
  // Auto-rebuild Effect (trigger rebuild if needed)
  // ========================================================================
  useEffect(() => {
    if (
      autoRebuild &&
      validationResult &&
      validationResult.needs_rebuild &&
      !isRebuildingAuto &&
      !rebuildMutation.isPending
    ) {
      console.log('[useMonitoredAppConsistency] Auto-rebuilding invalid/stale entry');
      setIsRebuildingAuto(true);
      rebuildMutation.mutate();
    }
  }, [
    autoRebuild,
    validationResult?.needs_rebuild,
    isRebuildingAuto,
    rebuildMutation.isPending
  ]);

  // ========================================================================
  // Manual rebuild function
  // ========================================================================
  const rebuild = useCallback(() => {
    rebuildMutation.mutate();
  }, [rebuildMutation]);

  // ========================================================================
  // Return hook interface
  // ========================================================================
  return {
    // Validation state
    validated_state: validationResult?.validated_state || 'unknown',
    has_cache: validationResult?.has_cache || false,
    has_snapshot: validationResult?.has_snapshot || false,
    cache_age_hours: validationResult?.cache_age_hours,
    needs_rebuild: validationResult?.needs_rebuild || false,

    // Loading states
    isValidating,
    isRebuilding: rebuildMutation.isPending || isRebuildingAuto,
    isAutoHealing: isRebuildingAuto,

    // Actions
    rebuild,
    revalidate,

    // Results
    validationResult,
    rebuildResult: rebuildMutation.data
  };
}

/**
 * Lightweight version that only validates without auto-rebuilding
 * Use this when you just want to check consistency
 */
export function useMonitoredAppValidation(
  monitoredAppId: string | undefined,
  organizationId: string | undefined
) {
  return useMonitoredAppConsistency(monitoredAppId, organizationId, {
    autoRebuild: false,
    showNotifications: false
  });
}
