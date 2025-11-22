/**
 * React Query Hook for KPI Snapshots - Phase 2
 *
 * Provides React Query hooks for fetching and managing KPI snapshots.
 * Uses KpiPersistenceService with React Query caching and stale-while-revalidate.
 *
 * IMPORTANT: This is a DATA HOOK ONLY - no UI rendering
 *
 * Features:
 * - Fetch KPI history for an app
 * - Fetch latest KPI snapshot
 * - Fetch snapshots for multiple apps (competitor comparison)
 * - React Query caching (5min stale, 30min gc)
 * - Automatic refetching on window focus
 * - Type-safe results
 *
 * @see src/services/kpi/kpi-persistence.service.ts
 * @see docs/KPI_ENGINE_PHASE2_SUPABASE.md
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  KpiPersistenceService,
  type KpiSnapshot,
} from '@/services/kpi/kpi-persistence.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Parameters for useKpiHistory hook
 */
export interface UseKpiHistoryParams {
  /** Organization ID (required for RLS) */
  organizationId: string;

  /** App ID */
  appId: string;

  /** Maximum number of snapshots to fetch */
  limit?: number;

  /** Enable/disable hook execution */
  enabled?: boolean;
}

/**
 * Return value from useKpiHistory hook
 */
export interface UseKpiHistoryResult {
  /** KPI snapshots ordered by created_at DESC */
  snapshots: KpiSnapshot[];

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Data fetched successfully */
  isSuccess: boolean;

  /** Query is fetching (initial or refetch) */
  isFetching: boolean;

  /** Raw React Query result for advanced use cases */
  queryResult: UseQueryResult<KpiSnapshot[], Error>;
}

/**
 * Parameters for useKpiLatest hook
 */
export interface UseKpiLatestParams {
  /** Organization ID (required for RLS) */
  organizationId: string;

  /** App ID */
  appId: string;

  /** Enable/disable hook execution */
  enabled?: boolean;
}

/**
 * Return value from useKpiLatest hook
 */
export interface UseKpiLatestResult {
  /** Latest KPI snapshot or null if none exists */
  snapshot: KpiSnapshot | null;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Data fetched successfully */
  isSuccess: boolean;

  /** Query is fetching (initial or refetch) */
  isFetching: boolean;

  /** Raw React Query result for advanced use cases */
  queryResult: UseQueryResult<KpiSnapshot | null, Error>;
}

/**
 * Parameters for useKpiSnapshotsForApps hook
 */
export interface UseKpiSnapshotsForAppsParams {
  /** Organization ID (required for RLS) */
  organizationId: string;

  /** Array of app IDs */
  appIds: string[];

  /** Maximum number of snapshots per app */
  limit?: number;

  /** Enable/disable hook execution */
  enabled?: boolean;
}

/**
 * Return value from useKpiSnapshotsForApps hook
 */
export interface UseKpiSnapshotsForAppsResult {
  /** Map of appId -> snapshots */
  snapshotsByApp: Map<string, KpiSnapshot[]>;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Data fetched successfully */
  isSuccess: boolean;

  /** Query is fetching (initial or refetch) */
  isFetching: boolean;

  /** Raw React Query result for advanced use cases */
  queryResult: UseQueryResult<Map<string, KpiSnapshot[]>, Error>;
}

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

/**
 * useKpiHistory - Fetch KPI snapshot history for an app
 *
 * @example
 * ```tsx
 * const { snapshots, isLoading } = useKpiHistory({
 *   organizationId: 'org-123',
 *   appId: '310633997',
 *   limit: 50,
 *   enabled: true,
 * });
 *
 * // Use data in your component (no UI rendering in this hook)
 * console.log('Total snapshots:', snapshots.length);
 * console.log('Latest score:', snapshots[0]?.score_overall);
 * ```
 */
export function useKpiHistory(params: UseKpiHistoryParams): UseKpiHistoryResult {
  const {
    organizationId,
    appId,
    limit = 50,
    enabled = true,
  } = params;

  // React Query hook
  const queryResult = useQuery({
    queryKey: [
      'kpi-history',
      {
        organizationId,
        appId,
        limit,
      },
    ],
    queryFn: () => KpiPersistenceService.getKpiSnapshots(organizationId, appId, limit),
    enabled: enabled && !!organizationId && !!appId,
    staleTime: 1000 * 60 * 5, // 5 minutes - same as useIntentIntelligence
    gcTime: 1000 * 60 * 30, // 30 minutes - same as useIntentIntelligence
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const { data, isLoading, error, isSuccess, isFetching } = queryResult;

  return {
    snapshots: data || [],
    isLoading,
    error: error as Error | null,
    isSuccess,
    isFetching,
    queryResult,
  };
}

/**
 * useKpiLatest - Fetch latest KPI snapshot for an app
 *
 * @example
 * ```tsx
 * const { snapshot, isLoading } = useKpiLatest({
 *   organizationId: 'org-123',
 *   appId: '310633997',
 *   enabled: true,
 * });
 *
 * if (snapshot) {
 *   console.log('Overall score:', snapshot.score_overall);
 *   console.log('Created at:', snapshot.created_at);
 * }
 * ```
 */
export function useKpiLatest(params: UseKpiLatestParams): UseKpiLatestResult {
  const {
    organizationId,
    appId,
    enabled = true,
  } = params;

  // React Query hook
  const queryResult = useQuery({
    queryKey: [
      'kpi-latest',
      {
        organizationId,
        appId,
      },
    ],
    queryFn: () => KpiPersistenceService.getLatestSnapshot(organizationId, appId),
    enabled: enabled && !!organizationId && !!appId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data, isLoading, error, isSuccess, isFetching } = queryResult;

  return {
    snapshot: data || null,
    isLoading,
    error: error as Error | null,
    isSuccess,
    isFetching,
    queryResult,
  };
}

/**
 * useKpiSnapshotsForApps - Fetch KPI snapshots for multiple apps (competitor comparison)
 *
 * @example
 * ```tsx
 * const { snapshotsByApp, isLoading } = useKpiSnapshotsForApps({
 *   organizationId: 'org-123',
 *   appIds: ['app-1', 'app-2', 'app-3'],
 *   limit: 10,
 *   enabled: true,
 * });
 *
 * // Use data in your component
 * snapshotsByApp.forEach((snapshots, appId) => {
 *   console.log(`App ${appId}: ${snapshots.length} snapshots`);
 * });
 * ```
 */
export function useKpiSnapshotsForApps(
  params: UseKpiSnapshotsForAppsParams
): UseKpiSnapshotsForAppsResult {
  const {
    organizationId,
    appIds,
    limit = 10,
    enabled = true,
  } = params;

  // React Query hook
  const queryResult = useQuery({
    queryKey: [
      'kpi-snapshots-multi',
      {
        organizationId,
        appIds: [...appIds].sort(), // Sort for stable cache key
        limit,
      },
    ],
    queryFn: () => KpiPersistenceService.getKpiSnapshotsForApps(organizationId, appIds, limit),
    enabled: enabled && !!organizationId && appIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data, isLoading, error, isSuccess, isFetching } = queryResult;

  return {
    snapshotsByApp: data || new Map(),
    isLoading,
    error: error as Error | null,
    isSuccess,
    isFetching,
    queryResult,
  };
}
