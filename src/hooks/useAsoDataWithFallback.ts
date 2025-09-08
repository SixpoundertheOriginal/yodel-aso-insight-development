
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
  isDemo?: boolean; // NEW: Expose demo flag
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

  // Get organization ID from user profile or super admin context
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
          // ✅ ENHANCED: Handle Platform Super Admin with null organization_id
          debugLog.info('⚡ [Fallback] Platform Super Admin detected (null organization_id)');
          setOrganizationId(''); // Empty string to trigger mock fallback
        }
      } catch (err) {
        debugLog.error('❌ [Fallback] Error fetching organization ID:', err);
      }
    };

    fetchOrganizationId();
  }, [user]);

  // ✅ ENHANCED: Skip BigQuery for Platform Super Admin, use mock data directly
  const bigQueryReady = organizationId.length > 0;
  const shouldUseBigQuery = bigQueryReady && preferredDataSource !== 'mock';
  
  const bigQueryResult = useBigQueryData(
    shouldUseBigQuery ? organizationId : '',
    dateRange,
    trafficSources,
    shouldUseBigQuery
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
    isDemo?: boolean; // NEW: Track demo state
  }>({
    data: null,
    loading: true,
    error: null,
    availableTrafficSources: undefined,
    isDemo: false
  });

  useEffect(() => {
    // ✅ ENHANCED: Handle Platform Super Admin (no organization) with mock data
    if (preferredDataSource === 'mock' || !shouldUseBigQuery) {
      debugLog.info('🎭 [Fallback] Using mock data (super admin or explicit preference)');
      setCurrentDataSource('mock');
      setDataSourceStatus(!shouldUseBigQuery ? 'mock-only' : 'mock-only');
      setFinalResult({
        data: mockResult.data,
        loading: mockResult.loading,
        error: mockResult.error,
        availableTrafficSources: mockResult.data?.trafficSources?.map(s => s.name) || [],
        isDemo: false // Mock data is not demo data
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
        availableTrafficSources: bigQueryResult.availableTrafficSources,
        isDemo: bigQueryResult.isDemo || false // NEW: Pass through demo flag
      });
      return;
    }

    // BigQuery failed, attempt mock fallback
    if (bigQueryResult.error) {
      debugLog.warn(
        '⚠️ [Fallback] BigQuery failed, using mock data:',
        bigQueryResult.error.message
      );
      setCurrentDataSource('mock');
      setDataSourceStatus('bigquery-failed-fallback');

      // While mock is loading, keep previous data but surface BigQuery error
      if (mockResult.loading) {
        setFinalResult((prev) => ({
          data: prev.data,
          loading: true,
          error: bigQueryResult.error,
          availableTrafficSources: prev.availableTrafficSources
        }));
        return;
      }

      // Mock succeeded - use its data
      if (mockResult.data && !mockResult.error) {
        setFinalResult({
          data: mockResult.data,
          loading: false,
          error: null,
          availableTrafficSources:
            mockResult.data.trafficSources?.map((s) => s.name) || [],
          isDemo: false // Mock fallback data is not demo data
        });
        return;
      }

      // Mock failed - surface mock error while preserving previous data
      if (mockResult.error) {
        setFinalResult((prev) => ({
          data: prev.data,
          loading: false,
          error: mockResult.error,
          availableTrafficSources: prev.availableTrafficSources
        }));
        return;
      }

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
    preferredDataSource,
    shouldUseBigQuery
  ]);

  return {
    ...finalResult,
    currentDataSource,
    dataSourceStatus
  };
};
