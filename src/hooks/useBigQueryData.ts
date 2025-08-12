
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DateRange,
  AsoData,
  TimeSeriesPoint,
  MetricSummary,
  TrafficSource
} from './useMockAsoData';
import { useBigQueryAppSelection } from '@/context/BigQueryAppContext';
import { debugLog } from '@/lib/utils/debug';
import { filterByTrafficSources } from '@/utils/filterByTrafficSources';

// Development-only logging helper
const devLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    debugLog.info(`[useBigQueryData] ${message}`, data);
  }
};

export interface BigQueryDataPoint {
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

interface SourceMetrics {
  impressions: number;
  downloads: number;
  product_page_views: number;
}

interface TrafficSourceComparison {
  name: string;
  current: SourceMetrics;
  previous: SourceMetrics;
  delta: number;
}

interface PeriodComparison {
  current: PeriodTotals;
  previous: PeriodTotals | null;
  delta?: {
    impressions: number;
    downloads: number;
    product_page_views: number;
  } | null;
  trafficSources?: TrafficSourceComparison[];
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
  const [rawData, setRawData] = useState<BigQueryDataPoint[]>([]);
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
    const fromDate =
      typeof dateRange.from === 'string'
        ? dateRange.from
        : dateRange.from.toISOString().split('T')[0];
    const toDate =
      typeof dateRange.to === 'string'
        ? dateRange.to
        : dateRange.to.toISOString().split('T')[0];

    return {
      organizationId,
      selectedApps: [...selectedApps],
      dateRange: { from: fromDate, to: toDate }
    };
  }, [
    organizationId,
    selectedApps.join(','),
    typeof dateRange.from === 'string'
      ? dateRange.from
      : dateRange.from.toISOString().split('T')[0],
    typeof dateRange.to === 'string'
      ? dateRange.to
      : dateRange.to.toISOString().split('T')[0]
  ]);

  // ✅ ENHANCED: Request deduplication key
  const requestKey = useMemo(
    () =>
      `${stableFilters.organizationId}-${stableFilters.selectedApps.join(',')}-${stableFilters.dateRange.from}-${stableFilters.dateRange.to}`,
    [stableFilters]
  );

  // Only log initialization in verbose debug mode
  debugLog.verbose('Hook initialized', {
    instanceId,
    requestKey,
    ready,
    hasRegistration: !!registerHookInstance
  });

  const applyTrafficSourceFilter = useCallback(
    (sourceData: BigQueryDataPoint[], selectedSources: string[], meta: BigQueryMeta) => {
      const filtered = filterByTrafficSources(sourceData, selectedSources);
      return transformBigQueryToAsoData(filtered, meta);
    },
    []
  );

  const fetchData = useCallback(
    async (abortSignal?: AbortSignal) => {
      if (!stableFilters.organizationId || !ready) {
        debugLog.verbose('Skipping fetch - not ready', {
          hasOrganizationId: !!stableFilters.organizationId,
          ready
        });
        return null;
      }

      if (abortSignal?.aborted) {
        debugLog.verbose('Request aborted before fetch');
        return null;
      }

      const startTime = Date.now();
      setLoading(true);
      setError(null);
      setMeta(undefined);

      try {
        const requestBody = {
          organizationId: stableFilters.organizationId,
          dateRange: stableFilters.dateRange,
          selectedApps:
            stableFilters.selectedApps.length > 0 ? stableFilters.selectedApps : undefined,
          trafficSources: [] as string[]
        };

        debugLog.verbose('Making request to edge function', { requestBody });

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
        setRawData(bigQueryResponse.data || []);

        const transformedData = applyTrafficSourceFilter(
          bigQueryResponse.data || [],
          trafficSources,
          bigQueryResponse.meta
        );

        setData(transformedData);

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
    },
    [stableFilters, ready, instanceId, registerHookInstance, applyTrafficSourceFilter]
  );

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

  // Recompute data when traffic source filter changes without refetching
  useEffect(() => {
    if (!meta) return;
    const transformed = applyTrafficSourceFilter(rawData, trafficSources, meta);
    setData(transformed);
  }, [trafficSources, rawData, meta, applyTrafficSourceFilter]);

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
  meta: BigQueryMeta
): AsoData {

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
    if (!previous || previous === 0) return current > 0 ? 999 : 0;
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

  const trafficSourceGroups = bigQueryData.reduce((acc, item) => {
    const source = item.traffic_source || 'Unknown';
    if (!acc[source]) {
      acc[source] = {
        impressions: 0,
        downloads: 0,
        product_page_views: 0
      };
    }
    acc[source].impressions += item.impressions;
    acc[source].downloads += item.downloads;
    acc[source].product_page_views += item.product_page_views || 0;
    return acc;
  }, {} as Record<string, { impressions: number; downloads: number; product_page_views: number }>);

  const trafficSourceData: TrafficSource[] = Object.entries(trafficSourceGroups).map(([source, values]) => {
    const comparison = meta.periodComparison?.trafficSources?.find(ts => ts.name === source);
    const productPageCvr = values.product_page_views > 0
      ? (values.downloads / values.product_page_views) * 100
      : 0;
    const impressionsCvr = values.impressions > 0
      ? (values.downloads / values.impressions) * 100
      : 0;

    const prev = comparison?.previous || { impressions: 0, downloads: 0, product_page_views: 0 };
    const previousProductPageCvr = prev.product_page_views > 0
      ? (prev.downloads / prev.product_page_views) * 100
      : 0;
    const previousImpressionsCvr = prev.impressions > 0
      ? (prev.downloads / prev.impressions) * 100
      : 0;

    return {
      name: source,
      value: values.downloads,
      delta: comparison?.delta ?? 0,
      metrics: {
        impressions: { value: values.impressions, delta: calculateRealDelta(values.impressions, prev.impressions) },
        downloads: { value: values.downloads, delta: comparison?.delta ?? 0 },
        product_page_views: { value: values.product_page_views, delta: calculateRealDelta(values.product_page_views, prev.product_page_views) },
        product_page_cvr: { value: productPageCvr, delta: calculateRealDelta(productPageCvr, previousProductPageCvr) },
        impressions_cvr: { value: impressionsCvr, delta: calculateRealDelta(impressionsCvr, previousImpressionsCvr) }
      }
    };
  });

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
