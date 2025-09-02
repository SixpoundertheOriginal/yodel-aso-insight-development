
import { useMemo, useState, useEffect } from 'react';
import { useAsoData } from '../context/AsoDataContext';
import { useBigQueryData } from './useBigQueryData';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { standardizeChartData } from '../utils/format';
import { getPreviousPeriod, calculateDeltas } from '../utils/dateCalculations';
import { AsoData } from './useMockAsoData';

export type ComparisonType = 'period' | 'year';

export interface ComparisonData {
  current: AsoData | null;
  previous: AsoData | null;
  loading: boolean;
  error: Error | null;
  deltas: {
    impressions: number;
    downloads: number;
    product_page_views: number;
    product_page_cvr: number;
    impressions_cvr: number;
  } | null;
}

/**
 * Hook that provides comparison data for current and previous periods
 * @param type - 'period' for previous time period, 'year' for same period last year
 */
export const useComparisonData = (type: ComparisonType): ComparisonData => {
  const { filters } = useAsoData();
  const { user } = useAuth();
  const { isSuperAdmin, selectedOrganizationId } = useSuperAdmin();
  const [organizationId, setOrganizationId] = useState<string>('');

  // Get organization ID from user profile or super admin selection
  useEffect(() => {
    const fetchOrganizationId = async () => {
      if (isSuperAdmin) {
        setOrganizationId(selectedOrganizationId || '');
        return;
      }

      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Failed to fetch user profile:', error);
          return;
        }

        if (profile?.organization_id) {
          setOrganizationId(profile.organization_id);
        }
      } catch (err) {
        console.error('Error fetching organization ID:', err);
      }
    };

    fetchOrganizationId();
  }, [user, isSuperAdmin, selectedOrganizationId]);
  
  // Calculate previous period date range
  const previousDateRange = useMemo(() => {
    if (type === 'period') {
      return getPreviousPeriod(filters.dateRange);
    } else {
      // For year comparison, go back 1 year
      const yearAgo = new Date(filters.dateRange.from.getFullYear() - 1, filters.dateRange.from.getMonth(), filters.dateRange.from.getDate());
      const yearAgoEnd = new Date(filters.dateRange.to.getFullYear() - 1, filters.dateRange.to.getMonth(), filters.dateRange.to.getDate());
      return { from: yearAgo, to: yearAgoEnd };
    }
  }, [filters.dateRange, type]);

  // Fetch current period data (using existing context data)
  const {
    data: currentData,
    loading: currentLoading,
    error: currentError
  } = useAsoData();

  // Fetch previous period data
  const {
    data: previousRawData,
    loading: previousLoading,
    error: previousError
  } = useBigQueryData(
    organizationId,
    previousDateRange,
    filters.trafficSources,
    organizationId.length > 0
  );

  const [cachedComparison, setCachedComparison] = useState<{
    current: AsoData | null;
    previous: AsoData | null;
    deltas: {
      impressions: number;
      downloads: number;
      product_page_views: number;
      product_page_cvr: number;
      impressions_cvr: number;
    } | null;
  }>({ current: null, previous: null, deltas: null });

  useEffect(() => {
    if (!currentData || !previousRawData) return;

    // Standardize both datasets
    const current = {
      ...currentData,
      timeseriesData: standardizeChartData(currentData.timeseriesData)
    };

    const previous = {
      ...previousRawData,
      timeseriesData: standardizeChartData(previousRawData.timeseriesData)
    };

    const currentTotals = {
      impressions: current.summary.impressions.value,
      downloads: current.summary.downloads.value,
      product_page_views: current.summary.product_page_views.value
    };

    const previousTotals = {
      impressions: previous.summary.impressions.value,
      downloads: previous.summary.downloads.value,
      product_page_views: previous.summary.product_page_views.value
    };

    const deltas = calculateDeltas(currentTotals, previousTotals);

    setCachedComparison({ current, previous, deltas });
  }, [currentData, previousRawData]);

  return {
    ...cachedComparison,
    loading: currentLoading || previousLoading,
    error: currentError || previousError
  };
};

export default useComparisonData;
