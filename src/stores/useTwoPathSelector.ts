import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { calculateTwoPathMetrics, type TwoPathConversionMetrics } from '@/utils/twoPathCalculator';
import { useDashboardDataStore, type BigQueryDataPoint } from './useDashboardDataStore';
import { hashCode } from '@/utils/memoization';

/**
 * Two-Path Metrics Selector Store
 *
 * Provides memoized Two-Path conversion metrics with hash-based caching.
 * Automatically recomputes only when input data changes.
 *
 * Key Features:
 * - Hash-based cache invalidation (skip recomputation if data unchanged)
 * - Separate metrics for Search, Browse, and Combined
 * - O(1) cache lookups for repeated queries
 * - Automatic integration with useDashboardDataStore
 */

export interface TwoPathState {
  // Computed Metrics
  search: TwoPathConversionMetrics | null;
  browse: TwoPathConversionMetrics | null;
  combined: TwoPathConversionMetrics | null;

  // Cache Management
  lastComputedHash: string;
  lastComputed: number; // Timestamp

  // Actions
  computeForTrafficSources: (sources: string[]) => void;
  invalidate: () => void;

  // Selectors
  getSearchMetrics: () => TwoPathConversionMetrics | null;
  getBrowseMetrics: () => TwoPathConversionMetrics | null;
  getCombinedMetrics: () => TwoPathConversionMetrics | null;
}

// Helper: Aggregate metrics from data points
const aggregateMetrics = (dataPoints: BigQueryDataPoint[]) => {
  return dataPoints.reduce(
    (acc, point) => ({
      impressions: acc.impressions + (point.impressions || 0),
      ppv: acc.ppv + (point.product_page_views || 0),
      downloads: acc.downloads + (point.downloads || 0),
    }),
    { impressions: 0, ppv: 0, downloads: 0 }
  );
};

// Helper: Generate hash from raw data
const generateDataHash = (dataPoints: BigQueryDataPoint[]): string => {
  // Create hash from data summary (faster than hashing entire array)
  const summary = {
    count: dataPoints.length,
    firstDate: dataPoints[0]?.date || '',
    lastDate: dataPoints[dataPoints.length - 1]?.date || '',
    totalImpressions: dataPoints.reduce((sum, p) => sum + (p.impressions || 0), 0),
    totalDownloads: dataPoints.reduce((sum, p) => sum + (p.downloads || 0), 0),
  };

  return hashCode(JSON.stringify(summary));
};

export const useTwoPathSelector = create<TwoPathState>()(
  immer((set, get) => ({
    // Initial State
    search: null,
    browse: null,
    combined: null,
    lastComputedHash: '',
    lastComputed: 0,

    // Actions
    computeForTrafficSources: (sources) => {
      const dataStore = useDashboardDataStore.getState();
      const rawData = dataStore.getDataForTrafficSources(sources);

      // Generate hash of input data
      const currentHash = generateDataHash(rawData);

      // Skip recomputation if hash unchanged
      if (currentHash === get().lastComputedHash && currentHash !== '') {
        console.log('✅ [TWO-PATH] Cache HIT - Using cached metrics');
        return;
      }

      console.log('❌ [TWO-PATH] Cache MISS - Computing metrics...', {
        dataPoints: rawData.length,
        sources: sources.length > 0 ? sources.join(', ') : 'all',
      });

      const startTime = performance.now();

      // Separate data by traffic source
      const searchData = rawData.filter((p) => p.traffic_source === 'App Store Search');
      const browseData = rawData.filter((p) => p.traffic_source === 'App Store Browse');

      // Aggregate metrics
      const searchAgg = aggregateMetrics(searchData);
      const browseAgg = aggregateMetrics(browseData);
      const combinedAgg = {
        impressions: searchAgg.impressions + browseAgg.impressions,
        ppv: searchAgg.ppv + browseAgg.ppv,
        downloads: searchAgg.downloads + browseAgg.downloads,
      };

      // Calculate Two-Path metrics
      const search = calculateTwoPathMetrics(
        searchAgg.impressions,
        searchAgg.ppv,
        searchAgg.downloads
      );

      const browse = calculateTwoPathMetrics(
        browseAgg.impressions,
        browseAgg.ppv,
        browseAgg.downloads
      );

      const combined = calculateTwoPathMetrics(
        combinedAgg.impressions,
        combinedAgg.ppv,
        combinedAgg.downloads
      );

      const computeTime = performance.now() - startTime;

      console.log('✅ [TWO-PATH] Computed in', `${computeTime.toFixed(2)}ms`, {
        search: `${searchAgg.downloads} downloads from ${searchAgg.impressions} impressions`,
        browse: `${browseAgg.downloads} downloads from ${browseAgg.impressions} impressions`,
      });

      set((state) => {
        state.search = search;
        state.browse = browse;
        state.combined = combined;
        state.lastComputedHash = currentHash;
        state.lastComputed = Date.now();
      });
    },

    invalidate: () => {
      set((state) => {
        state.search = null;
        state.browse = null;
        state.combined = null;
        state.lastComputedHash = '';
        state.lastComputed = 0;
      });

      console.log('🗑️ [TWO-PATH] Cache invalidated');
    },

    // Selectors
    getSearchMetrics: () => get().search,
    getBrowseMetrics: () => get().browse,
    getCombinedMetrics: () => get().combined,
  }))
);

// Selector hooks for optimized component subscriptions
export const useSearchMetrics = () => useTwoPathSelector((state) => state.search);
export const useBrowseMetrics = () => useTwoPathSelector((state) => state.browse);
export const useCombinedMetrics = () => useTwoPathSelector((state) => state.combined);

// Hook to trigger computation when data changes
export const useTwoPathComputation = (trafficSources: string[]) => {
  const computeForTrafficSources = useTwoPathSelector((state) => state.computeForTrafficSources);
  const isDataHydrated = useDashboardDataStore((state) => state.isHydrated);

  // Auto-compute when data is available
  if (isDataHydrated) {
    computeForTrafficSources(trafficSources);
  }
};
