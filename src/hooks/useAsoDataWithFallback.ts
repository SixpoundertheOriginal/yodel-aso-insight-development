
import { useState, useEffect } from 'react';
import { useBigQueryData } from './useBigQueryData';
import { useMockAsoData, DateRange, AsoData } from './useMockAsoData';
import { useBigQueryAppSelection } from '@/context/BigQueryAppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDemoOrgDetection } from './useDemoOrgDetection';
import { logger } from '@/utils/logger';

export type DataSource = 'bigquery' | 'mock' | 'auto';
export type CurrentDataSource = 'bigquery' | 'mock';
export type DataSourceStatus = 'loading' | 'bigquery-success' | 'demo-data' | 'bigquery-failed-fallback' | 'mock-only';

interface UseAsoDataWithFallbackResult {
  data: AsoData | null;
  loading: boolean;
  error: Error | null;
  currentDataSource: CurrentDataSource | null;
  dataSourceStatus: DataSourceStatus;
  availableTrafficSources: string[] | undefined;
  isDemo?: boolean; // NEW: Expose demo flag
  isDemoOrg?: boolean; // NEW: Expose demo organization flag
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
  const { user, loading: authLoading } = useAuth();
  const { selectedApps } = useBigQueryAppSelection();
  const { isDemoOrg } = useDemoOrgDetection();

  // Get organization ID from user profile or super admin context
  useEffect(() => {
    const fetchOrganizationId = async () => {
      // Wait for auth to complete before checking user
      if (authLoading) return;

      if (!user) {
        logger.once('fallback-no-user', '⚠️ [Fallback] No authenticated user');
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (error) {
          logger.fallback('❌ Failed to fetch user profile: ' + error.message);
          return;
        }

        if (profile?.organization_id) {
          setOrganizationId(profile.organization_id);
          logger.fallback('✅ Organization ID retrieved: ' + profile.organization_id.slice(0, 8) + '...');
        } else {
          // ✅ ENHANCED: Handle Platform Super Admin with null organization_id
          logger.fallback('⚡ Platform Super Admin detected (null organization_id)');
          setOrganizationId(''); // Empty string to trigger mock fallback
        }
      } catch (err) {
        logger.fallback('❌ Error fetching organization ID: ' + (err as Error).message);
      }
    };

    fetchOrganizationId();
  }, [user, authLoading]);

  // ✅ ENHANCED: Skip BigQuery only for Platform Super Admin, demo orgs should use BigQuery (gets demo data)
  const bigQueryReady = organizationId.length > 0;
  const shouldUseBigQuery = bigQueryReady && preferredDataSource !== 'mock';
  
  const bigQueryResult = useBigQueryData(
    shouldUseBigQuery ? organizationId : '',
    dateRange,
    trafficSources,
    shouldUseBigQuery
  );

  logger.fallback(`BigQuery result: isDemo=${bigQueryResult.isDemo || false}, status=${dataSourceStatus}, loading=${bigQueryResult.loading}`);

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
      logger.fallback('🎭 Using mock data (super admin or explicit preference)');
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
      const isDemo = bigQueryResult.isDemo || false;
      logger.fallback(`✅ Using ${isDemo ? 'demo' : 'BigQuery'} data`);
      setCurrentDataSource('bigquery');
      setDataSourceStatus(isDemo ? 'demo-data' : 'bigquery-success');
      setFinalResult({
        data: bigQueryResult.data,
        loading: false,
        error: null,
        availableTrafficSources: bigQueryResult.availableTrafficSources,
        isDemo: isDemo
      });
      return;
    }

    // BigQuery failed, attempt mock fallback
    if (bigQueryResult.error) {
      logger.fallback(
        '⚠️ BigQuery failed, using mock data: ' + bigQueryResult.error.message
      );
      setCurrentDataSource('mock');
      setDataSourceStatus(isDemoOrg ? 'demo-data' : 'bigquery-failed-fallback');

      // While mock is loading, keep previous data but surface BigQuery error
      if (mockResult.loading) {
        setFinalResult((prev) => ({
          data: prev.data,
          loading: true,
          error: bigQueryResult.error,
          availableTrafficSources: prev.availableTrafficSources,
          isDemo: isDemoOrg
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
          isDemo: isDemoOrg
        });
        return;
      }

      // Mock failed - surface mock error while preserving previous data
      if (mockResult.error) {
        setFinalResult((prev) => ({
          data: prev.data,
          loading: false,
          error: mockResult.error,
          availableTrafficSources: prev.availableTrafficSources,
          isDemo: isDemoOrg
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
    shouldUseBigQuery,
    isDemoOrg
  ]);

  return {
    ...finalResult,
    currentDataSource,
    dataSourceStatus,
    isDemoOrg
  };
};
