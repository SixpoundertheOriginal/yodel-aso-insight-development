import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO } from 'date-fns';

interface DateRange {
  start: string;
  end: string;
}

interface PeriodMetrics {
  impressions: number;
  downloads: number;
  cvr: number;
}

interface Delta {
  value: number;
  percentage: number;
}

interface ComparisonResult {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  deltas: {
    impressions: Delta;
    downloads: Delta;
    cvr: Delta;
  };
}

/**
 * Calculate number of days between two dates
 */
function calculateDaysBetween(start: string, end: string): number {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculate delta between current and previous values
 */
function calculateDelta(current: number, previous: number): Delta {
  const value = current - previous;
  const percentage = previous > 0 ? (value / previous) * 100 : 0;
  return { value, percentage };
}

/**
 * Fetch period data from BigQuery
 */
async function fetchPeriodData(
  organizationId: string,
  dateRange: DateRange,
  appIds: string[]
): Promise<PeriodMetrics> {
  const { data: response, error } = await supabase.functions.invoke(
    'bigquery-aso-data',
    {
      body: {
        org_id: organizationId,
        date_range: dateRange,
        app_ids: appIds.length > 0 ? appIds : undefined,
        metrics: ['impressions', 'downloads', 'cvr'],
        granularity: 'daily'
      }
    }
  );

  if (error) {
    throw new Error(`Failed to fetch period data: ${error.message}`);
  }

  if (!response) {
    throw new Error('No response from analytics service');
  }

  // Handle both wrapped and unwrapped response formats
  let actualData = response.data;
  if (!Array.isArray(actualData) && actualData && typeof actualData === 'object') {
    // Unwrap if necessary
    if (Array.isArray(actualData.data)) {
      actualData = actualData.data;
    }
  }

  if (!Array.isArray(actualData)) {
    throw new Error('Invalid response structure from analytics service');
  }

  // Calculate totals
  const totals = actualData.reduce((acc: any, row: any) => ({
    impressions: acc.impressions + (row.impressions || 0),
    downloads: acc.downloads + (row.downloads || 0)
  }), { impressions: 0, downloads: 0 });

  const cvr = totals.impressions > 0
    ? (totals.downloads / totals.impressions) * 100
    : 0;

  return {
    impressions: totals.impressions,
    downloads: totals.downloads,
    cvr
  };
}

/**
 * Hook to compare current period metrics with previous period
 *
 * Features:
 * - Aggressive 24-hour caching (previous data doesn't change)
 * - Parallel fetching of both periods
 * - Automatic period calculation
 * - Delta computation
 */
export function usePeriodComparison(
  organizationId: string,
  currentRange: DateRange,
  appIds: string[],
  enabled: boolean = true
) {
  return useQuery<ComparisonResult, Error>({
    queryKey: [
      'period-comparison',
      organizationId,
      currentRange.start,
      currentRange.end,
      appIds.sort().join(',')
    ],

    queryFn: async () => {
      console.log('📊 [PERIOD-COMPARISON] Fetching comparison data...');
      console.log('  Current Period:', currentRange);
      console.log('  Apps:', appIds.length > 0 ? appIds.length : 'All');

      // Calculate previous period dates
      const currentDays = calculateDaysBetween(currentRange.start, currentRange.end);
      const previousEndDate = subDays(parseISO(currentRange.start), 1);
      const previousStartDate = subDays(previousEndDate, currentDays);

      const previousRange: DateRange = {
        start: format(previousStartDate, 'yyyy-MM-dd'),
        end: format(previousEndDate, 'yyyy-MM-dd')
      };

      console.log('  Previous Period:', previousRange);
      console.log('  Period Length:', currentDays, 'days');

      // Fetch both periods in parallel
      const [current, previous] = await Promise.all([
        fetchPeriodData(organizationId, currentRange, appIds),
        fetchPeriodData(organizationId, previousRange, appIds)
      ]);

      console.log('✅ [PERIOD-COMPARISON] Data fetched successfully');
      console.log('  Current:', current);
      console.log('  Previous:', previous);

      // Calculate deltas
      const deltas = {
        impressions: calculateDelta(current.impressions, previous.impressions),
        downloads: calculateDelta(current.downloads, previous.downloads),
        cvr: calculateDelta(current.cvr, previous.cvr)
      };

      console.log('  Deltas:', deltas);

      return { current, previous, deltas };
    },

    enabled: !!organizationId && !!currentRange.start && !!currentRange.end && enabled,

    // Aggressive caching strategy - previous period data never changes
    staleTime: 24 * 60 * 60 * 1000,  // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days

    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });
}
