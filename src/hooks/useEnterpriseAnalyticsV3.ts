import { useEffect } from 'react';
import { useEnterpriseAnalytics } from './useEnterpriseAnalytics';
import { useDashboardDataStore } from '@/stores/useDashboardDataStore';
import { useTwoPathSelector } from '@/stores/useTwoPathSelector';
import { useDerivedKpisSelector } from '@/stores/useDerivedKpisSelector';

/**
 * Enterprise Analytics V3 Hook
 *
 * Phase B integration layer that connects useEnterpriseAnalytics
 * with the new Zustand store architecture.
 *
 * Key Features:
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

  // ✅ PHASE B: Zustand store actions
  const hydrateDataStore = useDashboardDataStore((state) => state.hydrateFromQuery);
  const computeTwoPath = useTwoPathSelector((state) => state.computeForTrafficSources);
  const computeDerivedKpis = useDerivedKpisSelector((state) => state.computeFromTwoPath);

  // ✅ PHASE B: Selectors for computed data
  const twoPathSearch = useTwoPathSelector((state) => state.search);
  const twoPathBrowse = useTwoPathSelector((state) => state.browse);
  const twoPathCombined = useTwoPathSelector((state) => state.combined);
  const derivedKpis = useDerivedKpisSelector((state) => state.kpis);

  // ✅ PHASE B: Auto-hydrate data store when data arrives
  useEffect(() => {
    if (data) {
      console.log('✅ [ANALYTICS-V3] Hydrating data store...');
      hydrateDataStore(data);
    }
  }, [data, hydrateDataStore]);

  // ✅ PHASE B: Auto-compute Two-Path metrics when data changes
  useEffect(() => {
    if (data) {
      console.log('✅ [ANALYTICS-V3] Computing Two-Path metrics...');
      computeTwoPath(trafficSources);
    }
  }, [data, trafficSources, computeTwoPath]);

  // ✅ PHASE B: Auto-compute Derived KPIs when Two-Path metrics ready
  useEffect(() => {
    if (twoPathSearch && twoPathBrowse) {
      console.log('✅ [ANALYTICS-V3] Computing Derived KPIs...');
      computeDerivedKpis(twoPathSearch, twoPathBrowse);
    }
  }, [twoPathSearch, twoPathBrowse, computeDerivedKpis]);

  // ✅ PHASE B: Return backward-compatible API + new computed data
  return {
    // Original API (backward compatible)
    data,
    isLoading,
    error,
    refetch,

    // New Phase B computed data
    twoPathMetrics: twoPathSearch && twoPathBrowse && twoPathCombined
      ? { search: twoPathSearch, browse: twoPathBrowse, combined: twoPathCombined }
      : null,
    derivedKpis,

    // Metadata
    isHydrated: !!data,
    isTwoPathReady: !!(twoPathSearch && twoPathBrowse),
    isDerivedKpisReady: !!derivedKpis,
  };
}
