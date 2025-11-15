import { useEffect, useRef, useMemo } from 'react';
import { useEnterpriseAnalytics } from './useEnterpriseAnalytics';
import { useDashboardDataStore, type DashboardDataState } from '@/stores/useDashboardDataStore';
import { useTwoPathSelector, type TwoPathState } from '@/stores/useTwoPathSelector';
import { useDerivedKpisSelector, type DerivedKpisState } from '@/stores/useDerivedKpisSelector';

/**
 * Enterprise Analytics V3 Hook
 *
 * Phase C: UX Stability Hardening - Ensures single hydration and computation per data load.
 *
 * Key Features:
 * - ✅ Single hydration per data fetch (Phase C Fix #1)
 * - ✅ Stable selector references (Phase C Fix #1)
 * - ✅ UI-only filter changes are instant (Phase C Fix #2)
 * - ✅ No recomputation on traffic source changes (Phase C Fix #2)
 * - Automatic data store hydration
 * - Automatic Two-Path computation
 * - Automatic Derived KPIs computation
 * - Backward compatible with V2 API
 *
 * @example
 * const { data, isLoading, twoPathMetrics, derivedKpis } = useEnterpriseAnalyticsV3({
 *   organizationId: '7cccba3f-...',
 *   dateRange: { start: '2024-10-01', end: '2024-11-04' },
 *   trafficSources: ['App Store Search']
 * });
 */

// ✅ PHASE C FIX #1: Stable selector functions (defined outside component)
const selectHydrateFromQuery = (state: DashboardDataState) => state.hydrateFromQuery;
const selectComputeTwoPath = (state: TwoPathState) => state.computeForTrafficSources;
const selectComputeDerivedKpis = (state: DerivedKpisState) => state.computeFromTwoPath;
const selectTwoPathSearch = (state: TwoPathState) => state.search;
const selectTwoPathBrowse = (state: TwoPathState) => state.browse;
const selectTwoPathCombined = (state: TwoPathState) => state.combined;
const selectDerivedKpis = (state: DerivedKpisState) => state.kpis;
const selectIsDataHydrated = (state: DashboardDataState) => state.isHydrated;

interface DateRange {
  start: string;
  end: string;
}

interface AnalyticsParams {
  organizationId: string;
  dateRange: DateRange;
  trafficSources?: string[];
  appIds?: string[];
}

export function useEnterpriseAnalyticsV3(params: AnalyticsParams) {
  const { organizationId, dateRange, trafficSources = [], appIds = [] } = params;

  // ✅ PHASE B: Use existing useEnterpriseAnalytics (backward compatible)
  const { data, isLoading, error, refetch } = useEnterpriseAnalytics(params);

  // ✅ PHASE C FIX #1: Use stable selector references
  const hydrateDataStore = useDashboardDataStore(selectHydrateFromQuery);
  const computeTwoPath = useTwoPathSelector(selectComputeTwoPath);
  const computeDerivedKpis = useDerivedKpisSelector(selectComputeDerivedKpis);

  // ✅ PHASE C FIX #1: Selectors for computed data (stable references)
  const twoPathSearch = useTwoPathSelector(selectTwoPathSearch);
  const twoPathBrowse = useTwoPathSelector(selectTwoPathBrowse);
  const twoPathCombined = useTwoPathSelector(selectTwoPathCombined);
  const derivedKpis = useDerivedKpisSelector(selectDerivedKpis);
  const isDataHydrated = useDashboardDataStore(selectIsDataHydrated);

  // ✅ PHASE C FIX #1: Track processed data to prevent duplicate hydrations
  const processedDataRef = useRef<string>('');

  // ✅ PHASE C FIX #1: Single hydration per data fetch
  useEffect(() => {
    if (!data) return;

    const dataHash = `${data.meta.request_id}_${data.meta.timestamp}`;

    // Skip if already processed this exact data
    if (processedDataRef.current === dataHash) {
      console.log('✅ [V3-HOOK] Data already processed, skipping hydration');
      return;
    }

    console.log('📥 [V3-HOOK] Hydrating data store...');
    hydrateDataStore(data);
    processedDataRef.current = dataHash;

  }, [data, hydrateDataStore]); // ✅ hydrateDataStore is now stable

  // ✅ PHASE C FIX #2: Compute Two-Path only when data hydrates (not on UI filter changes)
  useEffect(() => {
    if (!isDataHydrated) return;

    console.log('🔄 [V3-HOOK] Computing Two-Path metrics...');
    computeTwoPath([]); // Empty array = compute for all traffic sources

  }, [isDataHydrated, computeTwoPath]); // ✅ trafficSources REMOVED from deps

  // ✅ PHASE C FIX #1: Compute Derived KPIs only when Two-Path completes
  useEffect(() => {
    if (!twoPathSearch || !twoPathBrowse) return;

    console.log('🔄 [V3-HOOK] Computing Derived KPIs...');
    computeDerivedKpis(twoPathSearch, twoPathBrowse);

  }, [twoPathSearch, twoPathBrowse, computeDerivedKpis]); // ✅ All stable now

  // ✅ PHASE C FIX #2: Filter metrics client-side for instant UI updates
  const filteredMetrics = useMemo(() => {
    if (!twoPathSearch || !twoPathBrowse || !twoPathCombined) {
      return null;
    }

    // If no traffic source filter, return all metrics
    if (trafficSources.length === 0) {
      return { search: twoPathSearch, browse: twoPathBrowse, combined: twoPathCombined };
    }

    // Filter metrics based on selected sources (instant, no recomputation)
    const hasSearch = trafficSources.includes('App Store Search');
    const hasBrowse = trafficSources.includes('App Store Browse');

    return {
      search: hasSearch ? twoPathSearch : null,
      browse: hasBrowse ? twoPathBrowse : null,
      combined: (hasSearch || hasBrowse) ? twoPathCombined : null,
    };
  }, [twoPathSearch, twoPathBrowse, twoPathCombined, trafficSources]);

  // ✅ PHASE B: Return backward-compatible API + new computed data
  return {
    // Original API (backward compatible)
    data,
    isLoading,
    error,
    refetch,

    // Phase C: Filtered metrics (instant updates on traffic source changes)
    twoPathMetrics: filteredMetrics && (filteredMetrics.search || filteredMetrics.browse)
      ? {
          search: filteredMetrics.search!,
          browse: filteredMetrics.browse!,
          combined: filteredMetrics.combined!,
        }
      : null,
    derivedKpis,

    // Metadata
    isHydrated: isDataHydrated,
    isTwoPathReady: !!(twoPathSearch && twoPathBrowse),
    isDerivedKpisReady: !!derivedKpis,
  };
}
