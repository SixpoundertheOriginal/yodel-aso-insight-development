
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
  
  // Get selected apps from BigQuery app selector
  const { selectedApps } = useBigQueryAppSelection();

  // Hook instance tracking with stable ID
  const instanceIdRef = useRef<string>();
  if (!instanceIdRef.current) {
    instanceIdRef.current = Math.random().toString(36).substr(2, 9);
  }
  const instanceId = instanceIdRef.current;

  // ✅ FIXED: Stable memoized filters to prevent infinite loops
  const stableFilters = useMemo(() => {
    const fromDate = dateRange.from.toISOString().split('T')[0];
    const toDate = dateRange.to.toISOString().split('T')[0];
    
    return {
      organizationId,
      selectedApps: [...selectedApps],
      dateRange: { from: fromDate, to: toDate },
      trafficSources: [...trafficSources]
    };
  }, [
    organizationId,
    selectedApps.join(','), 
    dateRange.from.toISOString().split('T')[0],
    dateRange.to.toISOString().split('T')[0],
    trafficSources.join(',')
  ]);

  console.log(`[${new Date().toISOString()}] [useBigQueryData] Hook initialized:`, {
    instanceId,
    organizationId: stableFilters.organizationId,
    selectedApps: stableFilters.selectedApps,
    trafficSources: stableFilters.trafficSources,
    dateRange: stableFilters.dateRange,
    ready,
    hasRegistration: !!registerHookInstance,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    // ✅ FIXED: Check if organizationId exists and ready
    if (!stableFilters.organizationId || !ready) {
      console.log(`[${new Date().toISOString()}] [useBigQueryData] Skipping fetch - not ready:`, {
        hasOrganizationId: !!stableFilters.organizationId,
        ready
      });
      return;
    }

    let isActive = true;
    const abortController = new AbortController();

    const fetchBigQueryData = async () => {
      try {
        console.log(`[${new Date().toISOString()}] [useBigQueryData] 🚀 Starting fetch...`);
        setLoading(true);
        setError(null);
        setMeta(undefined);

        console.log(`[${new Date().toISOString()}] [useBigQueryData] 🔍 Fetching with filters:`, stableFilters);

        // ✅ FIXED: Construct proper request body with organizationId
        const requestBody = {
          organizationId: stableFilters.organizationId,
          dateRange: stableFilters.dateRange,
          selectedApps: stableFilters.selectedApps.length > 0 ? stableFilters.selectedApps : undefined,
          trafficSources: stableFilters.trafficSources.length > 0 ? stableFilters.trafficSources : undefined,
          limit: 100
        };

        console.log(`[${new Date().toISOString()}] [useBigQueryData] 📤 Making request to edge function...`, requestBody);

        const { data: response, error: functionError } = await supabase.functions.invoke(
          'bigquery-aso-data',
          {
            body: requestBody,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        // Check if request was aborted
        if (abortController.signal.aborted || !isActive) {
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
            requestedSources: stableFilters.trafficSources,
            metadataAvailableSources: bigQueryResponse.meta.availableTrafficSources
          });
        }

        console.log(`[${new Date().toISOString()}] [useBigQueryData] 📊 Available traffic sources:`, bigQueryResponse.meta.availableTrafficSources);
        
        if (isActive) {
          setMeta(bigQueryResponse.meta);

          const transformedData = transformBigQueryToAsoData(
            bigQueryResponse.data || [],
            stableFilters.trafficSources,
            bigQueryResponse.meta
          );

          setData(transformedData);
          console.log(`[${new Date().toISOString()}] [useBigQueryData] ✅ Data transformed and set successfully`);

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
        }

      } catch (err) {
        // Check if request was aborted
        if (abortController.signal.aborted || !isActive) {
          console.log(`[${new Date().toISOString()}] [useBigQueryData] ⚠️ Request was aborted during error handling`);
          return;
        }

        console.error(`[${new Date().toISOString()}] [useBigQueryData] ❌ Error fetching data:`, err);
        
        if (isActive) {
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
        }
      } finally {
        if (isActive) {
          console.log(`[${new Date().toISOString()}] [useBigQueryData] 🏁 Fetch complete, clearing loading state`);
          setLoading(false);
        }
      }
    };

    fetchBigQueryData();

    return () => {
      console.log(`[${new Date().toISOString()}] [useBigQueryData] 🧹 Cleaning up - aborting request`);
      isActive = false;
      abortController.abort();
    };
  }, [
    stableFilters.organizationId,
    stableFilters.selectedApps.join(','),
    stableFilters.dateRange.from,
    stableFilters.dateRange.to,
    stableFilters.trafficSources.join(','),
    ready,
    instanceId
  ]);

  console.log(`[${new Date().toISOString()}] [useBigQueryData] 🚨 Hook returning:`, {
    instanceId,
    hasData: !!data,
    hasMeta: !!meta,
    availableTrafficSources: meta?.availableTrafficSources,
    sourcesCount: meta?.availableTrafficSources?.length || 0,
    loading,
    error: error ? { type: typeof error, message: error.message } : { _type: 'undefined', value: 'undefined' },
    willRegister: !!registerHookInstance,
    dateRange: stableFilters.dateRange
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
