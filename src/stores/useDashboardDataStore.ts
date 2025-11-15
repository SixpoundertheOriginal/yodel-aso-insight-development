import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * Dashboard Data Store
 *
 * Centralized cache for raw BigQuery data with normalized structure.
 * Optimized for O(1) lookups and efficient slicing.
 *
 * Key Features:
 * - Normalized data storage (Map-based for fast lookups)
 * - Memoized selectors for derived data
 * - Automatic data freshness tracking
 * - No re-renders on irrelevant data changes
 */

export interface BigQueryDataPoint {
  date: string;
  app_id: string;
  traffic_source: string;
  impressions: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
}

export interface TimeSeriesPoint {
  date: string;
  impressions: number;
  installs: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
  cvr: number;
}

export interface TrafficSourceData {
  traffic_source: string;
  traffic_source_display: string;
  impressions: number;
  installs: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
  cvr: number;
}

export interface AppMetadata {
  id: string;
  name: string;
  platform: string;
  icon_url?: string;
}

export interface ProcessedSummary {
  impressions: { value: number; delta: number };
  installs: { value: number; delta: number };
  downloads: { value: number; delta: number };
  product_page_views: { value: number; delta: number };
  cvr: { value: number; delta: number };
  conversion_rate: { value: number; delta: number };
}

export interface EnterpriseAnalyticsResponse {
  rawData: BigQueryDataPoint[];
  processedData: {
    summary: ProcessedSummary;
    timeseries: TimeSeriesPoint[];
    traffic_sources: TrafficSourceData[];
    meta: {
      total_apps: number;
      date_range: { start: string; end: string };
      available_traffic_sources: string[];
      granularity: string;
    };
  };
  meta: {
    timestamp: string;
    request_id: string;
    data_source: string;
    org_id: string;
    app_count: number;
    query_duration_ms: number;
  };
  availableTrafficSources: string[];
}

export interface DashboardDataState {
  // Normalized Data (Map for O(1) lookups)
  rawDataMap: Map<string, BigQueryDataPoint>;
  timeseriesArray: TimeSeriesPoint[];
  trafficSourcesMap: Map<string, TrafficSourceData>;
  summary: ProcessedSummary | null;

  // Metadata
  availableTrafficSources: string[];
  availableApps: AppMetadata[];
  dataFreshness: number; // Timestamp
  isHydrated: boolean;

  // Actions
  hydrateFromQuery: (response: EnterpriseAnalyticsResponse) => void;
  invalidateCache: () => void;

  // Memoized Selectors
  getTimeseriesForRange: (start: string, end: string) => TimeSeriesPoint[];
  getDataForTrafficSources: (sources: string[]) => BigQueryDataPoint[];
  getRawDataPoint: (date: string, appId: string, source: string) => BigQueryDataPoint | undefined;
  getTrafficSourceData: (source: string) => TrafficSourceData | undefined;
}

// Helper: Generate map key for raw data point
const generateDataKey = (date: string, appId: string, source: string): string => {
  return `${date}|${appId}|${source}`;
};

// Helper: Binary search for timeseries range (O(log n) instead of O(n))
const binarySearchDate = (array: TimeSeriesPoint[], targetDate: string): number => {
  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midDate = array[mid].date;

    if (midDate === targetDate) {
      return mid;
    } else if (midDate < targetDate) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return left; // Return insertion point if not found
};

export const useDashboardDataStore = create<DashboardDataState>()(
  immer((set, get) => ({
    // Initial State
    rawDataMap: new Map(),
    timeseriesArray: [],
    trafficSourcesMap: new Map(),
    summary: null,
    availableTrafficSources: [],
    availableApps: [],
    dataFreshness: 0,
    isHydrated: false,

    // Actions
    hydrateFromQuery: (response) => {
      set((state) => {
        // Normalize raw data into Map for O(1) lookups
        const rawDataMap = new Map<string, BigQueryDataPoint>();
        response.rawData.forEach((point) => {
          const key = generateDataKey(point.date, point.app_id, point.traffic_source);
          rawDataMap.set(key, point);
        });

        // Normalize traffic sources into Map
        const trafficSourcesMap = new Map<string, TrafficSourceData>();
        response.processedData.traffic_sources.forEach((ts) => {
          trafficSourcesMap.set(ts.traffic_source, ts);
        });

        // Update state with normalized data
        state.rawDataMap = rawDataMap;
        state.timeseriesArray = response.processedData.timeseries;
        state.trafficSourcesMap = trafficSourcesMap;
        state.summary = response.processedData.summary;
        state.availableTrafficSources = response.availableTrafficSources;
        state.dataFreshness = Date.now();
        state.isHydrated = true;

        console.log('✅ [DATA-STORE] Hydrated with', {
          rawDataPoints: rawDataMap.size,
          timeseriesPoints: response.processedData.timeseries.length,
          trafficSources: trafficSourcesMap.size,
        });
      });
    },

    invalidateCache: () => {
      set((state) => {
        state.rawDataMap.clear();
        state.timeseriesArray = [];
        state.trafficSourcesMap.clear();
        state.summary = null;
        state.availableTrafficSources = [];
        state.dataFreshness = 0;
        state.isHydrated = false;
      });

      console.log('🗑️ [DATA-STORE] Cache invalidated');
    },

    // Memoized Selectors
    getTimeseriesForRange: (start, end) => {
      const { timeseriesArray } = get();

      if (timeseriesArray.length === 0) return [];

      // Binary search for start and end indices (O(log n))
      const startIdx = binarySearchDate(timeseriesArray, start);
      const endIdx = binarySearchDate(timeseriesArray, end);

      // Slice array (O(k) where k is result size)
      return timeseriesArray.slice(startIdx, endIdx + 1);
    },

    getDataForTrafficSources: (sources) => {
      const { rawDataMap } = get();

      if (sources.length === 0) {
        // Return all data if no filter
        return Array.from(rawDataMap.values());
      }

      // Filter by traffic sources (O(n) but unavoidable)
      const filtered: BigQueryDataPoint[] = [];
      rawDataMap.forEach((point) => {
        if (sources.includes(point.traffic_source)) {
          filtered.push(point);
        }
      });

      return filtered;
    },

    getRawDataPoint: (date, appId, source) => {
      const { rawDataMap } = get();
      const key = generateDataKey(date, appId, source);
      return rawDataMap.get(key);
    },

    getTrafficSourceData: (source) => {
      const { trafficSourcesMap } = get();
      return trafficSourcesMap.get(source);
    },
  }))
);

// Selector hooks for optimized component subscriptions
export const useTimeseries = () => useDashboardDataStore((state) => state.timeseriesArray);
export const useSummary = () => useDashboardDataStore((state) => state.summary);
export const useAvailableTrafficSources = () => useDashboardDataStore((state) => state.availableTrafficSources);
export const useIsDataHydrated = () => useDashboardDataStore((state) => state.isHydrated);
