
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DateRange,
  AsoData,
  TimeSeriesPoint,
  MetricSummary,
  TrafficSource,
  TrafficSourceTimeSeriesPoint,
  TrafficSourceCVRTimeSeriesPoint
} from './useMockAsoData';
import { useBigQueryAppSelection } from '@/context/BigQueryAppContext';
import { debugLog } from '@/lib/utils/debug';
import { filterByTrafficSources } from '@/utils/filterByTrafficSources';
import { randBetween } from '@/lib/utils/demoRng';
import { logger } from '@/utils/logger';

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
  isDemo?: boolean;                    // NEW: Demo mode flag
  demoMessage?: string;                // NEW: Demo explanation
  message?: string;                    // NEW: General messages
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
  isDemo?: boolean;                    // NEW: Expose demo flag
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
  const [isDemo, setIsDemo] = useState<boolean>(false); // NEW: Demo state
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
      // ✅ ENHANCED: Handle null organizationId gracefully (Platform Super Admin)
      if (!stableFilters.organizationId || !ready) {
        debugLog.verbose('Skipping fetch - not ready or no organization', {
          hasOrganizationId: !!stableFilters.organizationId,
          ready
        });
        
        // For Platform Super Admin (null orgId), resolve as "no data" state instead of hanging
        if (!stableFilters.organizationId && ready) {
          setLoading(false);
          setData(null);
          setError(null);
          return null;
        }
        
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

        logger.bigquery(`Fetching data: org=${requestBody.organizationId?.slice(0,8)}..., apps=${requestBody.selectedApps?.length || 'all'}, dateRange=${requestBody.dateRange.from} to ${requestBody.dateRange.to}`);

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

        logger.bigquery(`Response received: success=${bigQueryResponse.success}, isDemo=${bigQueryResponse.meta?.isDemo || false}`);

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
        setIsDemo(bigQueryResponse.meta.isDemo || false); // NEW: Set demo flag
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

  useEffect(() => {
    if (data) {
      console.log('\uD83D\uDD0D Data Hook Output Validation:', {
        hasTimeseriesData: !!data.timeseriesData?.length,
        hasTrafficSourceTimeseries: !!data.trafficSourceTimeseriesData?.length,
        sampleTimeseries: data.timeseriesData?.[0],
        sampleTrafficSourceTimeseries: data.trafficSourceTimeseriesData?.[0],
        trafficSourceKeys: data.trafficSourceTimeseriesData?.[0]
          ? Object.keys(data.trafficSourceTimeseriesData[0]).filter(k => k !== 'date')
          : []
      });
    }
  }, [data]);

  debugLog.verbose('Hook returning', {
    instanceId,
    hasData: !!data,
    loading,
    error: error?.message
  });

  const hookResult = {
    data,
    loading,
    error,
    meta,
    availableTrafficSources: meta?.availableTrafficSources,
    isDemo: meta?.isDemo || false // Extract demo flag
  };

  logger.bigquery(`Hook returning: hasData=${!!data}, loading=${loading}, isDemo=${hookResult.isDemo}`);

  return hookResult;
};

function createTrafficSourceTimeSeries(bigQueryData: BigQueryDataPoint[]) {
  const byDate = bigQueryData.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, BigQueryDataPoint[]>);

  return Object.keys(byDate)
    .map(date => {
      const dayRecords = byDate[date];

      const bySource = dayRecords.reduce(
        (acc, record) => {
          const source = record.traffic_source;
          if (!acc[source]) {
            acc[source] = { impressions: 0, downloads: 0, product_page_views: 0 };
          }
          acc[source].impressions += record.impressions;
          acc[source].downloads += record.downloads;
          acc[source].product_page_views += record.product_page_views || 0;
          return acc;
        },
        {} as Record<string, { impressions: number; downloads: number; product_page_views: number }>
      );

      const totals = dayRecords.reduce(
        (sum, item) => ({
          impressions: sum.impressions + item.impressions,
          downloads: sum.downloads + item.downloads,
          product_page_views: sum.product_page_views + (item.product_page_views || 0),
        }),
        { impressions: 0, downloads: 0, product_page_views: 0 }
      );

      return {
        date,
        webReferrer_impressions: bySource['Web Referrer']?.impressions || 0,
        webReferrer_downloads: bySource['Web Referrer']?.downloads || 0,
        webReferrer_product_page_views: bySource['Web Referrer']?.product_page_views || 0,
        appStoreSearch_impressions: bySource['App Store Search']?.impressions || 0,
        appStoreSearch_downloads: bySource['App Store Search']?.downloads || 0,
        appStoreSearch_product_page_views: bySource['App Store Search']?.product_page_views || 0,
        appReferrer_impressions: bySource['App Referrer']?.impressions || 0,
        appReferrer_downloads: bySource['App Referrer']?.downloads || 0,
        appReferrer_product_page_views: bySource['App Referrer']?.product_page_views || 0,
        appleSearchAds_impressions: bySource['Apple Search Ads']?.impressions || 0,
        appleSearchAds_downloads: bySource['Apple Search Ads']?.downloads || 0,
        appleSearchAds_product_page_views: bySource['Apple Search Ads']?.product_page_views || 0,
        appStoreBrowse_impressions: bySource['App Store Browse']?.impressions || 0,
        appStoreBrowse_downloads: bySource['App Store Browse']?.downloads || 0,
        appStoreBrowse_product_page_views: bySource['App Store Browse']?.product_page_views || 0,
        totalDownloads: totals.downloads,
        totalImpressions: totals.impressions,
        totalProductPageViews: totals.product_page_views,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function createCVRTimeSeries(bigQueryData: BigQueryDataPoint[]): TrafficSourceCVRTimeSeriesPoint[] {
  const byDate = bigQueryData.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [] as BigQueryDataPoint[];
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, BigQueryDataPoint[]>);

  return Object.keys(byDate)
    .map(date => {
      const dayRecords = byDate[date];
      const bySource = dayRecords.reduce(
        (acc, record) => {
          const source = record.traffic_source;
          if (!acc[source]) {
            acc[source] = { impressions: 0, downloads: 0, product_page_views: 0 };
          }
          acc[source].impressions += record.impressions;
          acc[source].downloads += record.downloads;
          acc[source].product_page_views += record.product_page_views || 0;
          return acc;
        },
        {} as Record<string, { impressions: number; downloads: number; product_page_views: number }>
      );

      const calc = (name: string) => {
        const m = bySource[name] || { impressions: 0, downloads: 0, product_page_views: 0 };
        return {
          impression_cvr: m.impressions > 0 ? (m.downloads / m.impressions) * 100 : 0,
          product_page_cvr: m.product_page_views > 0 ? (m.downloads / m.product_page_views) * 100 : 0,
        };
      };

      const webReferrer = calc('Web Referrer');
      const other = calc('Other');
      const appleSearchAds = calc('Apple Search Ads');
      const appStoreSearch = calc('App Store Search');
      const appStoreBrowse = calc('App Store Browse');

      return {
        date,
        webReferrer_impression_cvr: webReferrer.impression_cvr,
        webReferrer_product_page_cvr: webReferrer.product_page_cvr,
        other_impression_cvr: other.impression_cvr,
        other_product_page_cvr: other.product_page_cvr,
        appleSearchAds_impression_cvr: appleSearchAds.impression_cvr,
        appleSearchAds_product_page_cvr: appleSearchAds.product_page_cvr,
        appStoreSearch_impression_cvr: appStoreSearch.impression_cvr,
        appStoreSearch_product_page_cvr: appStoreSearch.product_page_cvr,
        appStoreBrowse_impression_cvr: appStoreBrowse.impression_cvr,
        appStoreBrowse_product_page_cvr: appStoreBrowse.product_page_cvr,
      } as TrafficSourceCVRTimeSeriesPoint;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

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

      const conversion_rate = dayTotals.impressions > 0 ? (dayTotals.downloads / dayTotals.impressions) * 100 : 0;
      return {
        date,
        impressions: dayTotals.impressions,
        downloads: dayTotals.downloads,
        product_page_views: dayTotals.product_page_views,
        conversion_rate
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const trafficSourceTimeseriesData: TrafficSourceTimeSeriesPoint[] = createTrafficSourceTimeSeries(bigQueryData);
  const cvrTimeSeries: TrafficSourceCVRTimeSeriesPoint[] = createCVRTimeSeries(bigQueryData);

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

  let summary = {
    impressions: { value: totals.impressions, delta: calculateRealDelta(totals.impressions, previousTotals?.impressions) },
    downloads: { value: totals.downloads, delta: calculateRealDelta(totals.downloads, previousTotals?.downloads) },
    product_page_views: { value: totals.product_page_views, delta: calculateRealDelta(totals.product_page_views, previousTotals?.product_page_views) },
    cvr: { 
      value: currentImpressionsCVR, 
      delta: calculateRealDelta(currentImpressionsCVR, previousImpressionsCVR) 
    },
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

  let trafficSourceData: TrafficSource[] = Object.entries(trafficSourceGroups).map(([source, values]) => {
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

    const conversion_rate = values.impressions > 0 ? (values.downloads / values.impressions) * 100 : 0;
    
    return {
      traffic_source: source.toLowerCase().replace(/ /g, '_'),
      traffic_source_display: source,
      impressions: values.impressions,
      downloads: values.downloads,
      product_page_views: values.product_page_views,
      conversion_rate,
      // Legacy compatibility
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

  // Demo-mode normalization: replace sentinel or extreme deltas with realistic positive ranges
  if (meta?.isDemo) {
    const orgId = meta?.queryParams?.organizationId || 'demo-org';
    const from = meta?.queryParams?.dateRange?.from || (bigQueryData[0]?.date ?? 'start');
    const to = meta?.queryParams?.dateRange?.to || (bigQueryData[bigQueryData.length - 1]?.date ?? 'end');
    const seedBase = `${orgId}|${from}|${to}`;

    // Summary ranges: tuned for believable demo uplift
    summary = {
      impressions: {
        value: summary.impressions.value,
        delta: randBetween(`${seedBase}|summary|impr`, 1, 6)
      },
      downloads: {
        value: summary.downloads.value,
        delta: randBetween(`${seedBase}|summary|dl`, 1, 8)
      },
      product_page_views: {
        value: summary.product_page_views.value,
        delta: randBetween(`${seedBase}|summary|ppv`, 0.5, 4)
      },
      cvr: {
        value: summary.cvr.value,
        delta: randBetween(`${seedBase}|summary|cvr_impr`, 0.1, 1.2)
      },
      product_page_cvr: {
        value: summary.product_page_cvr.value,
        delta: randBetween(`${seedBase}|summary|cvr_ppv`, 0.1, 1.2)
      },
      impressions_cvr: {
        value: summary.impressions_cvr.value,
        delta: randBetween(`${seedBase}|summary|cvr_impr2`, 0.1, 1.2)
      }
    } as typeof summary;

    trafficSourceData = trafficSourceData.map((ts) => {
      const sSeed = `${seedBase}|source|${ts.traffic_source_display}`;
      return {
        ...ts,
        delta: randBetween(`${sSeed}|overall`, 1, 9),
        metrics: ts.metrics && {
          impressions: {
            value: ts.metrics.impressions.value,
            delta: randBetween(`${sSeed}|impr`, 0.5, 5)
          },
          downloads: {
            value: ts.metrics.downloads.value,
            delta: randBetween(`${sSeed}|dl`, 1, 9)
          },
          product_page_views: {
            value: ts.metrics.product_page_views.value,
            delta: randBetween(`${sSeed}|ppv`, 0.2, 3)
          },
          product_page_cvr: {
            value: ts.metrics.product_page_cvr.value,
            delta: randBetween(`${sSeed}|ppv_cvr`, 0.1, 1.5)
          },
          impressions_cvr: {
            value: ts.metrics.impressions_cvr.value,
            delta: randBetween(`${sSeed}|impr_cvr`, 0.1, 1.5)
          }
        }
      } as typeof ts;
    });
  }

  debugLog.verbose('Transform complete', {
    totalItems: bigQueryData.length,
    totalProductPageViews: totals.product_page_views,
    trafficSourceCount: trafficSourceData.length
  });

  return {
    summary,
    timeseriesData,
    trafficSourceTimeseriesData,
    trafficSources: trafficSourceData,
    cvrTimeSeries,
  };
}

export interface BenchmarkMetric {
  id: 'product_page_cvr' | 'impressions_cvr' | 'search_cvr' | 'browse_cvr';
  name: string;
  currentValue: number;
  benchmarkValue: number;
  industryAverage: number;
  trend: number;
  unit: '%' | '$' | 'count';
  description: string;
}

export interface GraphDataPoint {
  date: string;
  current: number;
  benchmark: number;
  industryAverage?: number;
}

interface BenchmarkDataParams {
  organizationId: string;
  selectedMetric: BenchmarkMetric['id'];
  dateRange: { startDate: string; endDate: string };
  trafficSources?: string[];
}

export const useBenchmarkData = ({
  organizationId,
  selectedMetric,
  dateRange,
  trafficSources = []
}: BenchmarkDataParams) => {
  const [data, setData] = useState<GraphDataPoint[]>([]);
  const [metrics, setMetrics] = useState<BenchmarkMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateInputs = useCallback(() => {
    const ALLOWED_METRICS = ['product_page_cvr', 'impressions_cvr', 'search_cvr', 'browse_cvr'] as const;

    if (!organizationId || typeof organizationId !== 'string') {
      throw new Error('Invalid organization ID');
    }

    if (!ALLOWED_METRICS.includes(selectedMetric)) {
      throw new Error('Invalid metric selection');
    }

    if (!dateRange.startDate || !dateRange.endDate) {
      throw new Error('Invalid date range');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateRange.startDate) || !dateRegex.test(dateRange.endDate)) {
      throw new Error('Invalid date format');
    }
  }, [organizationId, selectedMetric, dateRange]);

  const fetchBenchmarkData = useCallback(async (metricOverride?: BenchmarkMetric['id']) => {
    try {
      validateInputs();
      setLoading(true);
      setError(null);

      const metric = metricOverride || selectedMetric;

      const response = await supabase.functions.invoke('bigquery-benchmark-data', {
        body: {
          organizationId,
          metric,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          trafficSources: trafficSources.length > 0 ? trafficSources : undefined
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch benchmark data');
      }

      if (!response.data || !Array.isArray(response.data.timeseriesData)) {
        throw new Error('Invalid response format');
      }

      setData(response.data.timeseriesData);
      setMetrics(response.data.metricsData || []);
    } catch (err) {
      console.error('Benchmark data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setData([]);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, selectedMetric, dateRange, trafficSources, validateInputs]);

  useEffect(() => {
    fetchBenchmarkData();
  }, [fetchBenchmarkData]);

  return {
    data,
    metrics,
    loading,
    error,
    refetch: fetchBenchmarkData
  };
};
