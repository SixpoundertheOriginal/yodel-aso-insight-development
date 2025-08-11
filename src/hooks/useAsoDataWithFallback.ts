
import { useState, useEffect } from 'react';
import { useBigQueryData } from './useBigQueryData';
import { useMockAsoData, DateRange, AsoData } from './useMockAsoData';
import { useBigQueryAppSelection } from '@/context/BigQueryAppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/lib/utils/debug';

export type DataSource = 'bigquery' | 'mock' | 'auto';
export type CurrentDataSource = 'bigquery' | 'mock';
export type DataSourceStatus = 'loading' | 'bigquery-success' | 'bigquery-failed-fallback' | 'mock-only';

interface UseAsoDataWithFallbackResult {
  data: AsoData | null;
  loading: boolean;
  error: Error | null;
  currentDataSource: CurrentDataSource | null;
  dataSourceStatus: DataSourceStatus;
  availableTrafficSources: string[] | undefined;
}

export const useAsoDataWithFallback = (
  dateRange: DateRange,
  trafficSources: string[],
  preferredDataSource: DataSource = 'auto'
): UseAsoDataWithFallbackResult => {
  const [currentDataSource, setCurrentDataSource] = useState<CurrentDataSource | null>(null);
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus>('loading');
  const [organizationId, setOrganizationId] = useState<string>('');

  // Get auth context and app selection
  const { user } = useAuth();
  const { selectedApps } = useBigQueryAppSelection();

  // Get organization ID from user profile
  useEffect(() => {
    const fetchOrganizationId = async () => {
      if (!user) {
        debugLog.warn('⚠️ [Fallback] No authenticated user found');
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (error) {
          debugLog.error('❌ [Fallback] Failed to fetch user profile:', error);
          return;
        }

        if (profile?.organization_id) {
          setOrganizationId(profile.organization_id);
          debugLog.info('✅ [Fallback] Organization ID retrieved:', profile.organization_id);
        } else {
          debugLog.warn('⚠️ [Fallback] User has no organization ID');
        }
      } catch (err) {
        debugLog.error('❌ [Fallback] Error fetching organization ID:', err);
      }
    };

    fetchOrganizationId();
  }, [user]);

  // Always fetch BigQuery data (unless explicitly set to mock-only)
  const bigQueryReady = organizationId.length > 0;
  const bigQueryResult = useBigQueryData(
    organizationId,
    dateRange,
    trafficSources,
    bigQueryReady
  );

  // Always prepare mock data as fallback using selected apps for consistency
  const mockResult = useMockAsoData(
    selectedApps,
    dateRange,
    trafficSources
  );

  const [finalResult, setFinalResult] = useState<{
    data: AsoData | null;
    loading: boolean;
    error: Error | null;
    availableTrafficSources: string[] | undefined;
  }>({
    data: null,
    loading: true,
    error: null,
    availableTrafficSources: undefined
  });

  useEffect(() => {
    // Handle explicit mock-only preference
    if (preferredDataSource === 'mock') {
      setCurrentDataSource('mock');
      setDataSourceStatus('mock-only');
      setFinalResult({
        data: mockResult.data,
        loading: mockResult.loading,
        error: mockResult.error,
        availableTrafficSources: mockResult.data?.trafficSources?.map(s => s.name) || []
      });
      return;
    }

    // Handle BigQuery data states
    if (bigQueryResult.loading) {
      setDataSourceStatus('loading');
      setFinalResult((prev) => ({
        ...prev,
        loading: true,
        error: null,
        availableTrafficSources: prev.availableTrafficSources
      }));
      return;
    }

    // BigQuery succeeded
    if (bigQueryResult.data && !bigQueryResult.error) {
      debugLog.info('✅ [Fallback] Using BigQuery data');
      setCurrentDataSource('bigquery');
      setDataSourceStatus('bigquery-success');
      setFinalResult({
        data: bigQueryResult.data,
        loading: false,
        error: null,
        availableTrafficSources: bigQueryResult.availableTrafficSources
      });
      return;
    }

    // BigQuery failed, fall back to mock
    if (bigQueryResult.error) {
      debugLog.warn('⚠️ [Fallback] BigQuery failed, using mock data:', bigQueryResult.error.message);
      setCurrentDataSource('mock');
      setDataSourceStatus('bigquery-failed-fallback');
      setFinalResult((prev) => ({
        data: mockResult.data ?? prev.data,
        loading: mockResult.loading,
        error: mockResult.loading ? bigQueryResult.error : null, // Show error until mock data loads
        availableTrafficSources:
          mockResult.data?.trafficSources?.map((s) => s.name) || prev.availableTrafficSources
      }));
      return;
    }

  }, [
    bigQueryResult.data,
    bigQueryResult.loading,
    bigQueryResult.error,
    bigQueryResult.availableTrafficSources,
    mockResult.data,
    mockResult.loading,
    mockResult.error,
    preferredDataSource
  ]);

  return {
    ...finalResult,
    currentDataSource,
    dataSourceStatus
  };
};
