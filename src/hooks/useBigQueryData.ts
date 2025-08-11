
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange, AsoData, TimeSeriesPoint, MetricSummary, TrafficSource } from './useMockAsoData';
import { useBigQueryAppSelection } from '@/context/BigQueryAppContext';
import { debugLog } from '@/lib/utils/debug';

// Development-only logging helper
const devLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    debugLog.info(`[useBigQueryData] ${message}`, data);
  }
};

interface BigQueryDataPoint {
  date: string;
  organization_id: string;
  traffic_source: string;
  traffic_source_raw?: string;
  impressions: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
  revenue: number;
  sessions: number;
  country: string;
  data_source: string;
}

interface PeriodTotals {
  impressions: number;
  downloads: number;
  product_page_views: number;
  from?: string;
  to?: string;
}

interface PeriodComparison {
  current: PeriodTotals;
  previous: PeriodTotals | null;
  delta?: {
    impressions: number;
    downloads: number;
    product_page_views: number;
  } | null;
}

interface BigQueryMeta {
  rowCount: number;
  totalRows: number;
  executionTimeMs: number;
  queryParams: {
    organizationId: string;
    dateRange: { from: string; to: string } | null;
    selectedApps?: string[];
    trafficSources?: string[];
    limit: number;
  };
  availableTrafficSources?: string[];
  filteredByTrafficSource?: boolean;
  projectId: string;
  timestamp: string;
  periodComparison?: PeriodComparison;
  dataArchitecture?: {
    phase: string;
    discoveryQuery: {
      executed: boolean;
      sourcesFound: number;
      sources: string[];
    };
    mainQuery: {
      executed: boolean;
      filtered: boolean;
      rowsReturned: number;
    };
  };
  debug?: {
    queryPreview: string;
    discoveryQueryPreview?: string;
    parameterCount: number;
    jobComplete: boolean;
    trafficSourceMapping?: Record<string, string>;
  };
}

interface BigQueryResponse {
  success: boolean;
  data: BigQueryDataPoint[];
  meta: BigQueryMeta;
  error?: string;
}

interface BigQueryDataResult {
  data: AsoData | null;
  loading: boolean;
  error: Error | null;
  meta?: BigQueryMeta;
  availableTrafficSources: string[] | undefined;
}

export const useBigQueryData = (
  organizationId: string,
  dateRange: DateRange,
  trafficSources: string[],
  ready: boolean = true,
  registerHookInstance?: (instanceId: string, data: any) => void
): BigQueryDataResult => {
  const [data, setData] = useState<AsoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState<BigQueryMeta | undefined>(undefined);
  const availableSourcesRef = useRef<string[]>([]);
  
  // Get selected apps from BigQuery app selector
  const { selectedApps } = useBigQueryAppSelection();

  // Hook instance tracking with stable ID
  const instanceIdRef = useRef<string>();
  if (!instanceIdRef.current) {
    instanceIdRef.current = Math.random().toString(36).substr(2, 9);
  }
  const instanceId = instanceIdRef.current;

  // ✅ ENHANCED: Stable memoized filters with request deduplication
  const stableFilters = useMemo(() => {
    // Ensure dates are properly formatted
    const fromDate = typeof dateRange.from === 'string' 
      ? dateRange.from 
      : dateRange.from.toISOString().split('T')[0];
    const toDate = typeof dateRange.to === 'string' 
      ? dateRange.to 
      : dateRange.to.toISOString().split('T')[0];
    
    return {
      organizationId,
      selectedApps: [...selectedApps],
      dateRange: { from: fromDate, to: toDate },
      trafficSources: [...trafficSources]
    };
  }, [
    organizationId,
    selectedApps.join(','), 
    typeof dateRange.from === 'string' ? dateRange.from : dateRange.from.toISOString().split('T')[0],
    typeof dateRange.to === 'string' ? dateRange.to : dateRange.to.toISOString().split('T')[0],
    trafficSources.join(',')
  ]);

  // ✅ ENHANCED: Request deduplication key
  const requestKey = useMemo(() => 
    `${stableFilters.organizationId}-${stableFilters.selectedApps.join(',')}-${stableFilters.dateRange.from}-${stableFilters.dateRange.to}-${stableFilters.trafficSources.join(',')}`,
    [stableFilters]
  );

  // Only log initialization in verbose debug mode
  debugLog.verbose('Hook initialized', {
    instanceId,
    requestKey,
    ready,
    hasRegistration: !!registerHookInstance
  });

  const fetchData = useCallback(async (abortSignal?: AbortSignal) => {
    if (!stableFilters.organizationId || !ready) {
      debugLog.verbose('Skipping fetch - not ready', {
        hasOrganizationId: !!stableFilters.organizationId,
        ready
      });
      return null;
    }

    // Check if request was aborted before starting
    if (abortSignal?.aborted) {
      debugLog.verbose('Request aborted before fetch');
      return null;
    }

    const startTime = Date.now();
    setLoading(true);
    setError(null);
    setMeta(undefined);

    try {
      const requestTrafficSources =
        stableFilters.trafficSources.length > 0
          ? stableFilters.trafficSources
          : availableSourcesRef.current.length > 0
            ? [...availableSourcesRef.current]
            : [];

      const requestBody = {
        organizationId: stableFilters.organizationId,
        dateRange: stableFilters.dateRange,
        selectedApps: stableFilters.selectedApps.length > 0 ? stableFilters.selectedApps : undefined,
        trafficSources: requestTrafficSources
      };

      debugLog.verbose('Making request to edge function', { requestBody });

      // Check abort signal before making request
      if (abortSignal?.aborted) {
        debugLog.verbose('Request aborted before API call');
        return null;
      }

      const { data: response, error: functionError } = await supabase.functions.invoke(
        'bigquery-aso-data',
        {
          body: requestBody
        }
      );

      if (functionError) {
        debugLog.error('Edge function error', functionError);
        throw new Error(`BigQuery function error: ${functionError.message}`);
      }

      const bigQueryResponse = response as BigQueryResponse;

      if (!bigQueryResponse.success) {
        debugLog.error('Service error', bigQueryResponse.error);
        throw new Error(bigQueryResponse.error || 'BigQuery request failed');
      }

      const executionTime = Date.now() - startTime;
      
      debugLog.verbose('Response received', { 
        recordCount: bigQueryResponse.data?.length,
        executionTimeMs: executionTime,
        availableTrafficSources: bigQueryResponse.meta.availableTrafficSources?.length
      });

      setMeta(bigQueryResponse.meta);
      availableSourcesRef.current = bigQueryResponse.meta.availableTrafficSources || [];

      const transformedData = transformBigQueryToAsoData(
        bigQueryResponse.data || [],
        requestTrafficSources,
        bigQueryResponse.meta
      );

      setData(transformedData);

      // Register with context
      if (registerHookInstance) {
        registerHookInstance(instanceId, {
          instanceId,
          availableTrafficSources: bigQueryResponse.meta.availableTrafficSources || [],
          sourcesCount: bigQueryResponse.meta.availableTrafficSources?.length || 0,
          data: transformedData,
          metadata: bigQueryResponse.meta,
          loading: false,
          lastUpdated: Date.now()
        });
      }

      return transformedData;
    } catch (err) {
      debugLog.error('Error fetching data', err);
      const error = err instanceof Error ? err : new Error('Unknown BigQuery error');
      setError(error);
      
      // Register error with context  
      if (registerHookInstance) {
        registerHookInstance(instanceId, {
          instanceId,
          availableTrafficSources: [],
          sourcesCount: 0,
          data: null,
          metadata: null,
          loading: false,
          error,
          lastUpdated: Date.now()
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [stableFilters, ready, instanceId, registerHookInstance]);

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();

    const executeDataFetch = async () => {
      if (isActive && !abortController.signal.aborted) {
        await fetchData(abortController.signal);
      }
    };

    executeDataFetch();

    return () => {
      debugLog.verbose('Cleaning up - aborting request');
      isActive = false;
      abortController.abort();
    };
  }, [fetchData]);

  debugLog.verbose('Hook returning', {
    instanceId,
    hasData: !!data,
    loading,
    error: error?.message
  });

  return { 
    data, 
    loading, 
    error, 
    meta, 
    availableTrafficSources: meta?.availableTrafficSources 
  };
};

function transformBigQueryToAsoData(
  bigQueryData: BigQueryDataPoint[],
  trafficSources: string[],
  meta: BigQueryMeta
): AsoData {
  console.log('🔍 [Transform] Function called with:', {
    dataPointsCount: bigQueryData.length,
    trafficSourcesFilter: trafficSources,
    filterIsEmpty: trafficSources.length === 0,
    metaAvailableSources: meta.availableTrafficSources,
    shouldShowAll: trafficSources.length === 0
  });

  console.log('🔍 [Transform] Input data analysis:', {
    totalDataPoints: bigQueryData.length,
    uniqueTrafficSources: [...new Set(bigQueryData.map(item => item.traffic_source))],
    sampleDataPoints: bigQueryData.slice(0, 3).map(item => ({
      date: item.date,
      traffic_source: item.traffic_source,
      impressions: item.impressions,
      downloads: item.downloads
    }))
  });

  const dateGroups = bigQueryData.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, BigQueryDataPoint[]>);

  const timeseriesData: TimeSeriesPoint[] = Object.entries(dateGroups)
    .map(([date, items]) => {
      const dayTotals = items.reduce(
        (sum, item) => ({
          impressions: sum.impressions + item.impressions,
          downloads: sum.downloads + item.downloads,
          product_page_views: item.product_page_views !== null ? 
            sum.product_page_views + item.product_page_views : 
            sum.product_page_views
        }),
        { impressions: 0, downloads: 0, product_page_views: 0 }
      );

      return {
        date,
        impressions: dayTotals.impressions,
        downloads: dayTotals.downloads,
        product_page_views: dayTotals.product_page_views
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totals = bigQueryData.reduce(
    (sum, item) => ({
      impressions: sum.impressions + item.impressions,
      downloads: sum.downloads + item.downloads,
      product_page_views: item.product_page_views !== null ?
        sum.product_page_views + item.product_page_views :
        sum.product_page_views
    }),
    { impressions: 0, downloads: 0, product_page_views: 0 }
  );

  const calculateRealDelta = (current: number, previous?: number | null): number => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const previousTotals = meta.periodComparison?.previous || null;

  const currentProductPageCVR = totals.product_page_views > 0
    ? (totals.downloads / totals.product_page_views) * 100
    : 0;
  const previousProductPageCVR = previousTotals && previousTotals.product_page_views > 0
    ? (previousTotals.downloads / previousTotals.product_page_views) * 100
    : 0;

  const currentImpressionsCVR = totals.impressions > 0
    ? (totals.downloads / totals.impressions) * 100
    : 0;
  const previousImpressionsCVR = previousTotals && previousTotals.impressions > 0
    ? (previousTotals.downloads / previousTotals.impressions) * 100
    : 0;

  const summary = {
    impressions: { value: totals.impressions, delta: calculateRealDelta(totals.impressions, previousTotals?.impressions) },
    downloads: { value: totals.downloads, delta: calculateRealDelta(totals.downloads, previousTotals?.downloads) },
    product_page_views: { value: totals.product_page_views, delta: calculateRealDelta(totals.product_page_views, previousTotals?.product_page_views) },
    product_page_cvr: {
      value: currentProductPageCVR,
      delta: calculateRealDelta(currentProductPageCVR, previousProductPageCVR)
    },
    impressions_cvr: {
      value: currentImpressionsCVR,
      delta: calculateRealDelta(currentImpressionsCVR, previousImpressionsCVR)
    }
  };

  console.log('📊 [Transform] Dual CVR calculations:', {
    totalImpressions: totals.impressions,
    totalDownloads: totals.downloads,
    totalPageViews: totals.product_page_views,
    productPageCVR: summary.product_page_cvr.value,
    impressionsCVR: summary.impressions_cvr.value,
    expectedProductPageCVR: totals.product_page_views > 0 ?
      ((totals.downloads / totals.product_page_views) * 100).toFixed(3) : '0.000',
    expectedImpressionsCVR: totals.impressions > 0 ?
      ((totals.downloads / totals.impressions) * 100).toFixed(3) : '0.000'
  });

  const trafficSourceGroups = bigQueryData.reduce((acc, item) => {
    const source = item.traffic_source || 'Unknown';
    if (!acc[source]) {
      acc[source] = { value: 0, delta: 0 };
    }
    acc[source].value += item.downloads;
    return acc;
  }, {} as Record<string, { value: number; delta: number }>);

  console.log('🔍 [Transform] Traffic source groups:', {
    allGroups: Object.keys(trafficSourceGroups),
    groupValues: Object.entries(trafficSourceGroups).map(([source, data]) => ({
      source,
      value: data.value
    }))
  });

  const availableTrafficSources = meta.availableTrafficSources || [];

  console.log('🔧 [Transform] Before sourcesToShow logic:', {
    trafficSourcesLength: trafficSources.length,
    availableTrafficSourcesLength: availableTrafficSources.length,
    willUseDefault: trafficSources.length === 0 && availableTrafficSources.length === 0
  });

  const DEFAULT_TRAFFIC_SOURCES = [
    'App Referrer',
    'App Store Browse',
    'App Store Search',
    'Apple Search Ads',
    'Event Notification',
    'Institutional Purchase',
    'Other',
    'Web Referrer'
  ];

  let sourcesToShow: string[];

  if (trafficSources.length === 0) {
    sourcesToShow = availableTrafficSources.length > 0
      ? availableTrafficSources
      : DEFAULT_TRAFFIC_SOURCES;

    console.log('✅ [Transform] No filter mode - showing all sources:', {
      availableFromMeta: availableTrafficSources.length,
      usingDefault: availableTrafficSources.length === 0,
      willShow: sourcesToShow,
      reason: 'Empty trafficSources array = no filter applied'
    });
  } else {
    sourcesToShow = trafficSources;

    console.log('✅ [Transform] Filter mode - showing specific sources:', {
      requestedSources: trafficSources,
      willShow: sourcesToShow,
      reason: 'Specific traffic sources requested'
    });
  }

  console.log('🔧 [Transform] After sourcesToShow logic:', {
    sourcesToShowCount: sourcesToShow.length,
    sourcesToShowActual: sourcesToShow,
    logicPath: trafficSources.length === 0 ? 'NO_FILTER_SHOW_ALL' : 'SPECIFIC_FILTER'
  });

  const trafficSourceData: TrafficSource[] = sourcesToShow.map(source => ({
    name: source,
    value: trafficSourceGroups[source]?.value || 0,
    delta: trafficSourceGroups[source]?.delta || 0
  }));

  console.log('🔍 [Transform] Final traffic source data:', trafficSourceData);

  debugLog.verbose('Transform complete', {
    totalItems: bigQueryData.length,
    totalProductPageViews: totals.product_page_views,
    trafficSourceCount: trafficSourceData.length
  });

  return {
    summary,
    timeseriesData,
    trafficSources: trafficSourceData
  };
}
