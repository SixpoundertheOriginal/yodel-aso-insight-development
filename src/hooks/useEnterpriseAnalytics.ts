import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Enterprise Analytics Hook
 *
 * Direct pipeline: Component → Hook → Edge Function → BigQuery
 * No fallback logic, no demo mode, no mock data.
 * Production-grade, simple, debuggable.
 *
 * @example
 * const { data, isLoading, error } = useEnterpriseAnalytics({
 *   organizationId: '7cccba3f-...',
 *   dateRange: { start: '2024-10-01', end: '2024-11-04' },
 *   trafficSources: ['App Store Search', 'App Store Browse']
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

interface BigQueryDataPoint {
  date: string;
  app_id: string;
  traffic_source: string;
  impressions: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
}

interface ProcessedSummary {
  impressions: { value: number; delta: number };
  installs: { value: number; delta: number };
  downloads: { value: number; delta: number };
  product_page_views: { value: number; delta: number };
  cvr: { value: number; delta: number };
  conversion_rate: { value: number; delta: number };
}

interface ProcessedTimeSeriesPoint {
  date: string;
  impressions: number;
  installs: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
  cvr: number;
}

interface ProcessedTrafficSource {
  traffic_source: string;
  traffic_source_display: string;
  impressions: number;
  installs: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
  cvr: number;
}

interface ProcessedData {
  summary: ProcessedSummary;
  timeseries: ProcessedTimeSeriesPoint[];
  traffic_sources: ProcessedTrafficSource[];
  meta: {
    total_apps: number;
    date_range: DateRange;
    available_traffic_sources: string[];
    granularity: string;
  };
}

interface EnterpriseAnalyticsResponse {
  rawData: BigQueryDataPoint[];
  processedData: ProcessedData;
  meta: {
    timestamp: string;
    request_id: string;
    data_source: string;
    org_id: string;
    app_count: number;
    query_duration_ms: number;
    raw_rows: number;
    discovery_method?: string;
    discovered_apps?: number;
    app_ids?: string[];
  };
  availableTrafficSources: string[];
}

export function useEnterpriseAnalytics({
  organizationId,
  dateRange,
  trafficSources = [],
  appIds = []
}: AnalyticsParams) {

  // [QUERY] Fetch data with server-side filtering for date/apps only
  const query = useQuery<EnterpriseAnalyticsResponse, Error>({
    queryKey: [
      'enterprise-analytics',
      organizationId,
      dateRange.start,
      dateRange.end,
      appIds.sort().join(',')
      // ✅ Removed trafficSources from cache key - client-side filtering only
    ],

    queryFn: async () => {
      // [VALIDATION] Input validation
      if (!organizationId) {
        throw new Error('Organization ID is required for analytics');
      }

      if (!dateRange.start || !dateRange.end) {
        throw new Error('Date range (start and end) is required for analytics');
      }

      console.log('━'.repeat(60));
      console.log('📊 [ENTERPRISE-ANALYTICS] Fetching data...');
      console.log('━'.repeat(60));
      console.log('  Organization:', organizationId);
      console.log('  Date Range:', dateRange);
      console.log('  App IDs:', appIds.length > 0 ? appIds : 'Auto-discover');
      console.log('  🔍 SERVER will return: ALL traffic sources');
      console.log('  🔍 CLIENT will filter to:', trafficSources.length > 0 ? trafficSources : 'No filter (show all)');
      console.log('━'.repeat(60));

      // [REQUEST] Call BigQuery edge function - NO traffic_source parameter
      const { data: response, error: functionError } = await supabase.functions.invoke(
        'bigquery-aso-data',
        {
          body: {
            org_id: organizationId,
            date_range: dateRange,
            // ✅ Removed traffic_source - get ALL sources from server
            app_ids: appIds.length > 0 ? appIds : undefined,
            metrics: ['impressions', 'installs', 'cvr'],
            granularity: 'daily'
          }
        }
      );

      // [ERROR HANDLING] Function invocation error
      if (functionError) {
        console.error('❌ [ENTERPRISE-ANALYTICS] Function Error:', functionError);
        throw new Error(`Analytics fetch failed: ${functionError.message}`);
      }

      // [ERROR HANDLING] No response
      if (!response) {
        console.error('❌ [ENTERPRISE-ANALYTICS] No response from edge function');
        throw new Error('No response from analytics service');
      }

      // [ERROR HANDLING] Service error
      if (response.success === false) {
        console.error('❌ [ENTERPRISE-ANALYTICS] Service Error:', response.error);
        throw new Error(response.error || 'Analytics service returned an error');
      }

      // [VALIDATION] Response structure - handle both direct and wrapped formats
      // Edge function returns: {data: [], scope: {}, meta: {}}
      // But Supabase may wrap it: {success: true, data: {data: [], scope: {}, meta: {}}}

      let actualData = response.data;
      let actualMeta = response.meta;
      let actualScope = response.scope;

      // Check if this is a wrapped response (data.data exists and is an array)
      if (!Array.isArray(actualData) && actualData && typeof actualData === 'object') {
        console.log('🔍 [ENTERPRISE-ANALYTICS] Detected wrapped response format, unwrapping...');
        console.log('  Wrapped structure:', response);

        // Unwrap: response.data = {data: [], scope: {}, meta: {}}
        if (Array.isArray(actualData.data)) {
          console.log('✅ [ENTERPRISE-ANALYTICS] Successfully unwrapped response');
          const wrappedData = actualData; // Save reference to wrapped object
          actualData = wrappedData.data;   // Extract array
          actualMeta = wrappedData.meta || response.meta;   // Extract meta from wrapped object
          actualScope = wrappedData.scope || response.scope; // Extract scope from wrapped object
        } else {
          console.error('❌ [ENTERPRISE-ANALYTICS] Cannot unwrap - data.data is not an array:', actualData);
          throw new Error('Invalid response structure from analytics service - cannot find data array');
        }
      }

      if (!actualData) {
        console.error('❌ [ENTERPRISE-ANALYTICS] No data field in response:', response);
        throw new Error('No data in response from analytics service');
      }

      if (!Array.isArray(actualData)) {
        console.error('❌ [ENTERPRISE-ANALYTICS] Data is not an array after unwrapping:', typeof actualData);
        throw new Error('Invalid response structure from analytics service - expected data array');
      }

      console.log('✅ [ENTERPRISE-ANALYTICS] Data received successfully');
      console.log('  Raw Rows:', actualData.length);
      console.log('  Data Source:', actualMeta?.data_source);
      console.log('  App Count:', actualMeta?.app_count);
      console.log('  Query Duration:', actualMeta?.query_duration_ms, 'ms');
      console.log('  Available Traffic Sources:', actualMeta?.available_traffic_sources?.length || 0);
      console.log('  Server-Side Filtering:', appIds.length > 0 ? 'Apps only' : 'None (date range only)');

      // [RETURN] Return processed data with traffic source metadata
      return {
        rawData: actualData,
        processedData: response.processed || {
          summary: {
            impressions: { value: 0, delta: 0 },
            installs: { value: 0, delta: 0 },
            downloads: { value: 0, delta: 0 },
            product_page_views: { value: 0, delta: 0 },
            cvr: { value: 0, delta: 0 },
            conversion_rate: { value: 0, delta: 0 }
          },
          timeseries: [],
          traffic_sources: [],
          meta: {
            total_apps: 0,
            date_range: dateRange,
            available_traffic_sources: [],
            granularity: 'daily'
          }
        },
        meta: actualMeta,
        availableTrafficSources: actualMeta?.available_traffic_sources || []
      };
    },

    // [QUERY CONFIG] React Query configuration
    enabled: !!organizationId && !!dateRange.start && !!dateRange.end,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch when window regains focus

    // [LOGGING] Query lifecycle logging
    onError: (error) => {
      console.error('━'.repeat(60));
      console.error('❌ [ENTERPRISE-ANALYTICS] Query Error');
      console.error('━'.repeat(60));
      console.error('  Error:', error.message);
      console.error('  Organization:', organizationId);
      console.error('  Date Range:', dateRange);
      console.error('━'.repeat(60));
    },

    onSuccess: (data) => {
      console.log('━'.repeat(60));
      console.log('✅ [ENTERPRISE-ANALYTICS] Query Success');
      console.log('━'.repeat(60));
      console.log('  Raw Rows:', data.rawData.length);
      console.log('  Processed Summary:', data.processedData.summary);
      console.log('  Timeseries Points:', data.processedData.timeseries.length);
      console.log('  Traffic Sources:', data.processedData.traffic_sources.length);
      console.log('━'.repeat(60));
    }
  });

  // ✅ [CLIENT-SIDE FILTERING] Apply traffic source filter instantly without refetch
  const filteredData = useMemo(() => {
    if (!query.data) return null;

    // If no traffic sources selected, return all data
    if (trafficSources.length === 0) {
      console.log('🔍 [CLIENT-FILTER] No filter applied, returning all data');
      return query.data;
    }

    // Filter data client-side
    console.log('🔍 [CLIENT-FILTER] Applying traffic source filter:', trafficSources);

    const filteredRawData = query.data.rawData.filter((row: BigQueryDataPoint) =>
      trafficSources.includes(row.traffic_source)
    );

    const filtered: EnterpriseAnalyticsResponse = {
      ...query.data,
      rawData: filteredRawData,
      processedData: {
        ...query.data.processedData,
        summary: calculateSummary(filteredRawData),
        timeseries: filterTimeseries(filteredRawData, dateRange),
        traffic_sources: query.data.processedData.traffic_sources.filter((ts: ProcessedTrafficSource) =>
          trafficSources.includes(ts.traffic_source)
        )
      }
    };

    console.log('🔍 [CLIENT-FILTER] Filtered result:', {
      originalRows: query.data.rawData.length,
      filteredRows: filtered.rawData.length,
      selectedSources: trafficSources
    });

    return filtered;
  }, [query.data, trafficSources, dateRange]);

  return {
    data: filteredData,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
}

// ✅ Helper function to recalculate summary from filtered data
function calculateSummary(data: BigQueryDataPoint[]): ProcessedSummary {
  if (!data || data.length === 0) {
    return {
      impressions: { value: 0, delta: 0 },
      installs: { value: 0, delta: 0 },
      downloads: { value: 0, delta: 0 },
      product_page_views: { value: 0, delta: 0 },
      cvr: { value: 0, delta: 0 },
      conversion_rate: { value: 0, delta: 0 }
    };
  }

  const totals = data.reduce((acc, row) => ({
    impressions: acc.impressions + (row.impressions || 0),
    installs: acc.installs + (row.downloads || 0),
    downloads: acc.downloads + (row.downloads || 0),
    product_page_views: acc.product_page_views + (row.product_page_views || 0)
  }), {
    impressions: 0,
    installs: 0,
    downloads: 0,
    product_page_views: 0
  });

  const cvr = totals.impressions > 0
    ? (totals.installs / totals.impressions) * 100
    : 0;

  return {
    impressions: { value: totals.impressions, delta: 0 },
    installs: { value: totals.installs, delta: 0 },
    downloads: { value: totals.downloads, delta: 0 },
    product_page_views: { value: totals.product_page_views, delta: 0 },
    cvr: { value: cvr, delta: 0 },
    conversion_rate: { value: cvr, delta: 0 }
  };
}

// ✅ Helper function to recalculate timeseries from filtered data
function filterTimeseries(data: BigQueryDataPoint[], dateRange: DateRange): ProcessedTimeSeriesPoint[] {
  if (!data || data.length === 0) return [];

  // Group by date and sum metrics
  const grouped = data.reduce((acc: any, row: BigQueryDataPoint) => {
    const date = row.date;
    if (!acc[date]) {
      acc[date] = {
        date,
        impressions: 0,
        installs: 0,
        downloads: 0,
        product_page_views: 0
      };
    }
    acc[date].impressions += row.impressions || 0;
    acc[date].installs += row.downloads || 0;
    acc[date].downloads += row.downloads || 0;
    acc[date].product_page_views += row.product_page_views || 0;
    return acc;
  }, {});

  // Convert to array and add calculated fields
  return Object.values(grouped).map((day: any) => ({
    ...day,
    conversion_rate: day.impressions > 0 ? (day.installs / day.impressions) * 100 : 0,
    cvr: day.impressions > 0 ? (day.installs / day.impressions) * 100 : 0
  })).sort((a: any, b: any) => a.date.localeCompare(b.date));
}
