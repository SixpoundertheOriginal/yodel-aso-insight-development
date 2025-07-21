import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange, AsoData, TimeSeriesPoint, MetricSummary, TrafficSource } from './useMockAsoData';
import { useBigQueryAppSelection } from '@/context/BigQueryAppContext';
import { debugLog } from '@/lib/utils/debug';

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

interface BigQueryMeta {
  rowCount: number;
  totalRows: number;
  executionTimeMs: number;
  queryParams: {
    client: string;
    dateRange: { from: string; to: string } | null;
    selectedApps?: string[];
    trafficSources?: string[];
    limit: number;
  };
  availableTrafficSources?: string[];
  filteredByTrafficSource?: boolean;
  projectId: string;
  timestamp: string;
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
}

export const useBigQueryData = (
  clientList: string[],
  dateRange: DateRange,
  trafficSources: string[],
  ready: boolean = true,
  registerHookInstance?: (instanceId: string, data: any) => void
): BigQueryDataResult => {
  const [data, setData] = useState<AsoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState<BigQueryMeta | undefined>(undefined);
  
  // Get selected apps from BigQuery app selector
  const { selectedApps } = useBigQueryAppSelection();

  // Hook instance tracking with stable ID
  const instanceIdRef = useRef<string>();
  if (!instanceIdRef.current) {
    instanceIdRef.current = Math.random().toString(36).substr(2, 9);
  }
  const instanceId = instanceIdRef.current;

  // ✅ PHASE 2: Memoize dependencies to prevent infinite loops
  const stableDateRange = useMemo(() => ({
    from: dateRange.from.toISOString().split('T')[0],
    to: dateRange.to.toISOString().split('T')[0]
  }), [dateRange.from.toISOString().split('T')[0], dateRange.to.toISOString().split('T')[0]]);

  const stableClientList = useMemo(() => [...clientList], [clientList.join(',')]);
  const stableSelectedApps = useMemo(() => [...selectedApps], [selectedApps.join(',')]);
  const stableTrafficSources = useMemo(() => [...trafficSources], [trafficSources.join(',')]);

  // ✅ PHASE 2: Abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  console.log(`[${new Date().toISOString()}] [useBigQueryData] Hook initialized:`, {
    instanceId,
    clientList: stableClientList,
    trafficSources: stableTrafficSources,
    dateRange: stableDateRange,
    ready,
    hasRegistration: !!registerHookInstance,
    timestamp: new Date().toISOString()
  });

  // ✅ NEW: Register this hook instance with context whenever data changes
  useEffect(() => {
    if (!registerHookInstance) return; // No context available

    const hookData = {
      instanceId,
      availableTrafficSources: meta?.availableTrafficSources || [],
      sourcesCount: meta?.availableTrafficSources?.length || 0,
      data,
      metadata: meta,
      loading,
      error,
      lastUpdated: Date.now()
    };

    console.log(`[${new Date().toISOString()}] [useBigQueryData] Registering instance ${instanceId}:`, {
      sourcesCount: hookData.sourcesCount,
      hasData: !!data,
      loading,
      error: !!error,
      sources: hookData.availableTrafficSources
    });

    registerHookInstance(instanceId, hookData);

  }, [instanceId, data, meta, loading, error, registerHookInstance]);

  useEffect(() => {
    if (!stableClientList.length || !ready) {
      console.log(`[${new Date().toISOString()}] [useBigQueryData] Skipping fetch - not ready:`, {
        clientsLength: stableClientList.length,
        ready
      });
      return;
    }

    // ✅ PHASE 2: Cancel previous request
    if (abortControllerRef.current) {
      console.log(`[${new Date().toISOString()}] [useBigQueryData] Aborting previous request`);
      abortControllerRef.current.abort();
    }

    const fetchBigQueryData = async () => {
      // ✅ PHASE 2: Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        console.log(`[${new Date().toISOString()}] [useBigQueryData] ⏳ Starting fetch...`);
        setLoading(true);
        setError(null);
        setMeta(undefined);

        const requestFilters = {
          clientList: stableClientList,
          selectedApps: stableSelectedApps,
          dateRange: stableDateRange,
          trafficSources: stableTrafficSources
        };

        console.log(`[${new Date().toISOString()}] [useBigQueryData] 🔍 Fetching with filters:`, requestFilters);

        const client = stableClientList[0] || 'yodel_pimsleur';

        const requestBody = {
          client,
          dateRange: stableDateRange,
          selectedApps: stableSelectedApps.length > 0 ? stableSelectedApps : undefined,
          trafficSources: stableTrafficSources.length > 0 ? stableTrafficSources : undefined,
          limit: 100
        };

        console.log(`[${new Date().toISOString()}] [useBigQueryData] 📤 Making request to edge function...`);

        // ✅ PHASE 1: Enhanced network call with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
        });

        const fetchPromise = supabase.functions.invoke(
          'bigquery-aso-data',
          {
            body: requestBody
          }
        );

        const { data: response, error: functionError } = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]) as any;

        // Check if request was aborted
        if (signal.aborted) {
          console.log(`[${new Date().toISOString()}] [useBigQueryData] ⚠️ Request was aborted`);
          return;
        }

        if (functionError) {
          console.error(`[${new Date().toISOString()}] [useBigQueryData] ❌ Edge function error:`, functionError);
          throw new Error(`BigQuery function error: ${functionError.message}`);
        }

        const bigQueryResponse = response as BigQueryResponse;

        if (!bigQueryResponse.success) {
          console.error(`[${new Date().toISOString()}] [useBigQueryData] ❌ Service error:`, bigQueryResponse.error);
          throw new Error(bigQueryResponse.error || 'BigQuery request failed');
        }

        console.log(`[${new Date().toISOString()}] [useBigQueryData] ✅ Response received:`, { 
          recordCount: bigQueryResponse.data?.length,
          meta: bigQueryResponse.meta
        });
        
        if (bigQueryResponse.meta.dataArchitecture) {
          console.log(`[${new Date().toISOString()}] [useBigQueryData] 🏗️ Data architecture:`, {
            phase: bigQueryResponse.meta.dataArchitecture.phase,
            discoveryExecuted: bigQueryResponse.meta.dataArchitecture.discoveryQuery.executed,
            allAvailableSources: bigQueryResponse.meta.dataArchitecture.discoveryQuery.sources,
            totalSourcesFound: bigQueryResponse.meta.dataArchitecture.discoveryQuery.sourcesFound,
            mainQueryFiltered: bigQueryResponse.meta.dataArchitecture.mainQuery.filtered,
            dataRowsReturned: bigQueryResponse.meta.dataArchitecture.mainQuery.rowsReturned,
            requestedSources: stableTrafficSources,
            metadataAvailableSources: bigQueryResponse.meta.availableTrafficSources
          });
        }

        console.log(`[${new Date().toISOString()}] [useBigQueryData] 📊 Available traffic sources:`, bigQueryResponse.meta.availableTrafficSources);
        
        setMeta(bigQueryResponse.meta);

        const transformedData = transformBigQueryToAsoData(
          bigQueryResponse.data || [],
          stableTrafficSources,
          bigQueryResponse.meta
        );

        setData(transformedData);
        console.log(`[${new Date().toISOString()}] [useBigQueryData] ✅ Data transformed and set successfully`);

      } catch (err) {
        // Check if request was aborted
        if (signal.aborted) {
          console.log(`[${new Date().toISOString()}] [useBigQueryData] ⚠️ Request was aborted during error handling`);
          return;
        }

        console.error(`[${new Date().toISOString()}] [useBigQueryData] ❌ Error fetching data:`, err);
        
        if (err instanceof Error) {
          if (err.message.includes('403') || err.message.includes('permission')) {
            console.error(`[${new Date().toISOString()}] [useBigQueryData] 🔐 Permission denied - check BigQuery credentials and table access`);
          } else if (err.message.includes('404')) {
            console.error(`[${new Date().toISOString()}] [useBigQueryData] 🔍 Table not found - verify table name and project ID`);
          } else if (err.message.includes('timeout')) {
            console.error(`[${new Date().toISOString()}] [useBigQueryData] ⏰ Request timeout - check network connection`);
          } else if (err.message.includes('non-2xx status')) {
            console.error(`[${new Date().toISOString()}] [useBigQueryData] 🚫 Edge function failed - check edge function logs`);
          }
        }
        
        setError(err instanceof Error ? err : new Error('Unknown BigQuery error'));
      } finally {
        // ✅ PHASE 1: Ensure loading is always cleared
        console.log(`[${new Date().toISOString()}] [useBigQueryData] 🏁 Fetch complete, clearing loading state`);
        setLoading(false);
      }
    };

    fetchBigQueryData();

    // ✅ PHASE 2: Cleanup function
    return () => {
      if (abortControllerRef.current) {
        console.log(`[${new Date().toISOString()}] [useBigQueryData] 🧹 Cleaning up - aborting request`);
        abortControllerRef.current.abort();
      }
    };
  }, [
    stableClientList, 
    stableDateRange.from,
    stableDateRange.to, 
    stableTrafficSources,
    stableSelectedApps,
    ready
  ]);

  console.log(`[${new Date().toISOString()}] [useBigQueryData] 🚨 Hook returning:`, {
    instanceId,
    hasData: !!data,
    hasMeta: !!meta,
    availableTrafficSources: meta?.availableTrafficSources,
    sourcesCount: meta?.availableTrafficSources?.length || 0,
    loading,
    error: error?.message,
    willRegister: !!registerHookInstance,
    dateRange: stableDateRange
  });

  return { data, loading, error, meta };
};

function transformBigQueryToAsoData(
  bigQueryData: BigQueryDataPoint[],
  trafficSources: string[],
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

  const generateMockDelta = (): number => (Math.random() * 40) - 20;

  const summary = {
    impressions: { value: totals.impressions, delta: generateMockDelta() },
    downloads: { value: totals.downloads, delta: generateMockDelta() },
    product_page_views: { value: totals.product_page_views, delta: generateMockDelta() },
    cvr: { 
      value: totals.product_page_views > 0 ? 
        (totals.downloads / totals.product_page_views) * 100 : 
        (totals.impressions > 0 ? (totals.downloads / totals.impressions) * 100 : 0), 
      delta: generateMockDelta() 
    }
  };

  const trafficSourceGroups = bigQueryData.reduce((acc, item) => {
    const source = item.traffic_source || 'Unknown';
    if (!acc[source]) {
      acc[source] = { value: 0, delta: 0 };
    }
    acc[source].value += item.downloads;
    return acc;
  }, {} as Record<string, { value: number; delta: number }>);

  Object.keys(trafficSourceGroups).forEach(source => {
    trafficSourceGroups[source].delta = generateMockDelta();
  });

  const availableTrafficSources = meta.availableTrafficSources || [];
  const sourcesToShow = availableTrafficSources.length > 0 ? availableTrafficSources : trafficSources;
  
  const trafficSourceData: TrafficSource[] = sourcesToShow.map(source => ({
    name: source,
    value: trafficSourceGroups[source]?.value || 0,
    delta: trafficSourceGroups[source]?.delta || 0
  }));

  console.log(`[${new Date().toISOString()}] [useBigQueryData] 📊 Transform complete:`, {
    totalItems: bigQueryData.length,
    nonNullPageViewItems: bigQueryData.filter(d => d.product_page_views !== null).length,
    nullPageViewItems: bigQueryData.filter(d => d.product_page_views === null).length,
    totalProductPageViews: totals.product_page_views,
    aggregationWorking: totals.product_page_views > 0 ? 'YES - NULL handling fixed!' : 'Still showing 0',
    trafficSourceArchitecture: {
      phase: meta.dataArchitecture?.phase || 'unknown',
      sourcesFromMetadata: availableTrafficSources,
      sourcesFromParams: trafficSources,
      finalTrafficSourceData: trafficSourceData.map(ts => ({ name: ts.name, value: ts.value }))
    }
  });

  return {
    summary,
    timeseriesData,
    trafficSources: trafficSourceData
  };
}
