
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import { useBigQueryData } from '../hooks/useBigQueryData';
import { useMockAsoData, type AsoData, type DateRange, type TrafficSource } from '../hooks/useMockAsoData';
import { useBigQueryAppSelection } from './BigQueryAppContext';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';
import { debugLog } from '../lib/utils/debug';

interface AsoDataFilters {
  dateRange: DateRange;
  trafficSources: string[];
  organizationId: string; // ✅ FIXED: Use organizationId instead of clients array
}

type DataSource = 'mock' | 'bigquery';
type DataSourceStatus = 'available' | 'loading' | 'error' | 'fallback';

interface BigQueryMeta {
  rowCount: number;
  totalRows: number;
  executionTimeMs: number;
  queryParams: {
    organizationId: string;
    dateRange: { from: string; to: string } | null;
    limit: number;
  };
  projectId: string;
  timestamp: string;
  debug?: {
    queryPreview: string;
    parameterNumber: number;
    jobComplete: boolean;
  };
}

// Hook Registry Interface
interface HookInstanceData {
  instanceId: string;
  availableTrafficSources: string[];
  sourcesCount: number;
  data: any;
  metadata: any;
  loading: boolean;
  error?: Error;
  lastUpdated: number;
}

interface AsoDataContextType {
  data: AsoData | null;
  loading: boolean;
  error: Error | null;
  filters: AsoDataFilters;
  setFilters: React.Dispatch<React.SetStateAction<AsoDataFilters>>;
  currentDataSource: DataSource;
  dataSourceStatus: DataSourceStatus;
  meta?: BigQueryMeta;
  availableTrafficSources?: string[];
  userTouchedFilters: boolean;
  setUserTouchedFilters: React.Dispatch<React.SetStateAction<boolean>>;
  // New: Hook registration system
  registerHookInstance: (instanceId: string, data: HookInstanceData) => void;
}

const AsoDataContext = createContext<AsoDataContextType | undefined>(undefined);

interface AsoDataProviderProps {
  children: ReactNode;
}

// Local storage key for persisting filter preferences
const FILTER_STORAGE_KEY = 'aso-dashboard-filters';

// Load saved filters from localStorage
const loadSavedFilters = (): Partial<AsoDataFilters> => {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        trafficSources: Array.isArray(parsed.trafficSources) ? parsed.trafficSources : []
      };
    }
  } catch (error) {
    console.warn('Failed to load saved filters:', error);
  }
  return {};
};

// Save filters to localStorage
const saveFilters = (filters: AsoDataFilters) => {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      trafficSources: filters.trafficSources
    }));
  } catch (error) {
    console.warn('Failed to save filters:', error);
  }
};

export const AsoDataProvider: React.FC<AsoDataProviderProps> = ({ children }) => {
  console.log(`[${new Date().toISOString()}] [AsoDataContext] 🏗️ Provider mounted and initialized`);
  
  const [currentDataSource, setCurrentDataSource] = useState<DataSource>('bigquery');
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus>('loading');
  
  // ✅ PHASE 3: Hook Registry to track ALL hook instances
  const [hookRegistry, setHookRegistry] = useState<Map<string, HookInstanceData>>(new Map());
  
  // ✅ PHASE 3: Track last registered data to prevent duplicate registrations
  const lastRegisteredDataRef = useRef<Map<string, string>>(new Map());
  
  // ✅ PHASE 3: Get user organization ID for data fetching
  const [organizationId, setOrganizationId] = useState<string>('');
  
  // ✅ PHASE 3: Connect to BigQuery app selection context
  const { selectedApps } = useBigQueryAppSelection();
  
  const savedFilters = loadSavedFilters();
  const [userTouchedFilters, setUserTouchedFilters] = useState(false);

  // ✅ FIXED: Load user organization ID
  useEffect(() => {
    const loadUserOrganization = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log(`[${new Date().toISOString()}] [AsoDataContext] No user found`);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          console.log(`[${new Date().toISOString()}] [AsoDataContext] Found organization:`, profile.organization_id);
          setOrganizationId(profile.organization_id);
        }
      } catch (err) {
        console.error(`[${new Date().toISOString()}] [AsoDataContext] Error loading organization:`, err);
      }
    };

    loadUserOrganization();
  }, []);

  // ✅ PHASE 3: Stable initial filters with proper fallback
  const [filters, setFilters] = useState<AsoDataFilters>(() => {
    return {
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date(),
      },
      trafficSources: [],
      organizationId: '', // Will be updated when user loads
    };
  });

  // ✅ FIXED: Update organizationId in filters when loaded
  useEffect(() => {
    if (organizationId && filters.organizationId !== organizationId) {
      console.log(`[${new Date().toISOString()}] [AsoDataContext] Updating organizationId in filters:`, organizationId);
      setFilters(prev => ({
        ...prev,
        organizationId
      }));
    }
  }, [organizationId, filters.organizationId]);

  // Save filters to localStorage when they change
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // ✅ PHASE 3: Stable registration function that prevents duplicate registrations
  const registerHookInstance = useCallback((instanceId: string, data: HookInstanceData) => {
    // Create a hash of the important data to detect if it actually changed
    const dataHash = JSON.stringify({
      sourcesCount: data.sourcesCount,
      availableTrafficSources: data.availableTrafficSources,
      loading: data.loading,
      hasData: !!data.data,
      hasError: !!data.error
    });

    // Check if this is the same data as last registration
    const lastDataHash = lastRegisteredDataRef.current.get(instanceId);
    if (lastDataHash === dataHash) {
      console.log(`[${new Date().toISOString()}] [AsoDataContext] 🚫 Skipping duplicate registration for instance ${instanceId}`);
      return; // Skip registration - same data
    }

    // Update the hash tracker
    lastRegisteredDataRef.current.set(instanceId, dataHash);

    console.log(`[${new Date().toISOString()}] [AsoDataContext] 🔄 Registering instance ${instanceId}:`, {
      sourcesCount: data.sourcesCount,
      hasData: !!data.data,
      loading: data.loading,
      error: !!data.error,
      dataHash: dataHash.slice(0, 50) + '...'
    });

    setHookRegistry(prev => {
      const newRegistry = new Map(prev);
      newRegistry.set(instanceId, {
        ...data,
        lastUpdated: Date.now()
      });
      
      console.log(`[${new Date().toISOString()}] [AsoDataContext] 📊 Registry updated - total instances: ${newRegistry.size}`);
      
      return newRegistry;
    });
  }, []); // ✅ PHASE 3: Empty dependency array - stable reference

  // ✅ PHASE 3: Find Best Hook Instance
  const getBestHookData = useCallback((): HookInstanceData | null => {
    let bestInstance: HookInstanceData | null = null;
    let maxSources = 0;
    
    console.log(`[${new Date().toISOString()}] [AsoDataContext] 🔍 Searching ${hookRegistry.size} registered instances`);
    
    for (const [instanceId, data] of hookRegistry.entries()) {
      console.log(`[${new Date().toISOString()}] [AsoDataContext] Checking instance ${instanceId}:`, {
        sourcesCount: data.sourcesCount,
        hasData: !!data.data,
        loading: data.loading,
        error: !!data.error,
        sources: data.availableTrafficSources
      });
      
      // Only consider instances with data and no errors
      if (data.sourcesCount > maxSources && !data.error && !data.loading && data.data) {
        maxSources = data.sourcesCount;
        bestInstance = data;
        console.log(`[${new Date().toISOString()}] [AsoDataContext] 🎯 New best instance found: ${instanceId} with ${data.sourcesCount} sources`);
      }
    }
    
    if (bestInstance) {
      console.log(`[${new Date().toISOString()}] [AsoDataContext] ✅ Best instance selected:`, {
        instanceId: bestInstance.instanceId,
        sourcesCount: bestInstance.sourcesCount,
        sources: bestInstance.availableTrafficSources
      });
    } else {
      console.log(`[${new Date().toISOString()}] [AsoDataContext] ❌ No suitable instance found`);
    }
    
    return bestInstance;
  }, [hookRegistry]);

  // ✅ FIXED: Create fallback hook with organizationId instead of clients array
  const bigQueryReady = !!filters.organizationId;
  const fallbackBigQueryResult = useBigQueryData(
    filters.organizationId,
    filters.dateRange,
    filters.trafficSources,
    bigQueryReady,
    registerHookInstance  // Pass registration function as parameter
  );

  // ✅ PHASE 3: Stable registration for fallback hook
  const lastFallbackMetaRef = useRef<string>('');
  useEffect(() => {
    if (fallbackBigQueryResult.meta?.availableTrafficSources) {
      // Create a stable hash of the meta data
      const metaHash = JSON.stringify({
        sources: fallbackBigQueryResult.meta.availableTrafficSources,
        loading: fallbackBigQueryResult.loading,
        hasData: !!fallbackBigQueryResult.data,
        hasError: !!fallbackBigQueryResult.error
      });

      // Only register if meta actually changed
      if (metaHash !== lastFallbackMetaRef.current) {
        console.log(`[${new Date().toISOString()}] [AsoDataContext] 🔄 Fallback meta changed, registering`);
        lastFallbackMetaRef.current = metaHash;
        
        registerHookInstance('fallback-context-hook', {
          instanceId: 'fallback-context-hook',
          availableTrafficSources: fallbackBigQueryResult.meta.availableTrafficSources,
          sourcesCount: fallbackBigQueryResult.meta.availableTrafficSources.length,
          data: fallbackBigQueryResult.data,
          metadata: fallbackBigQueryResult.meta,
          loading: fallbackBigQueryResult.loading,
          error: fallbackBigQueryResult.error,
          lastUpdated: Date.now()
        });
      } else {
        console.log(`[${new Date().toISOString()}] [AsoDataContext] 🚫 Fallback meta unchanged, skipping registration`);
      }
    }
  }, [fallbackBigQueryResult.data, fallbackBigQueryResult.meta, fallbackBigQueryResult.loading, fallbackBigQueryResult.error, registerHookInstance]);

  // Fallback to mock data
  const mockResult = useMockAsoData(
    [filters.organizationId], // Pass as array for mock compatibility
    filters.dateRange,
    filters.trafficSources
  );

  // ✅ PHASE 3: Use Best Hook Data Instead of Single Hook
  const bestHookData = getBestHookData();
  const selectedResult = bestHookData || fallbackBigQueryResult;

  // ✅ PHASE 3: Get Available Traffic Sources from Best Hook
  const bestAvailableTrafficSources = useMemo(() => {
    if (bestHookData?.availableTrafficSources && bestHookData.availableTrafficSources.length > 0) {
      console.log(`[${new Date().toISOString()}] [AsoDataContext] ✅ Using best hook sources:`, {
        instanceId: bestHookData.instanceId,
        sourcesCount: bestHookData.sourcesCount,
        sources: bestHookData.availableTrafficSources
      });
      return bestHookData.availableTrafficSources;
    }
    
    // Fallback to fallback hook
    const fallbackSources = fallbackBigQueryResult.meta?.availableTrafficSources || [];
    console.log(`[${new Date().toISOString()}] [AsoDataContext] ⏳ Using fallback sources:`, {
      sourcesCount: fallbackSources.length,
      sources: fallbackSources
    });
    return fallbackSources;
    
  }, [bestHookData, fallbackBigQueryResult.meta?.availableTrafficSources]);

  // ✅ PHASE 1: Determine data source status with enhanced logging
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] [AsoDataContext] 📊 Data source status evaluation:`, {
      loading: selectedResult.loading,
      hasError: !!selectedResult.error,
      hasData: !!selectedResult.data,
      errorMessage: selectedResult.error?.message
    });

    if (selectedResult.loading) {
      console.log(`[${new Date().toISOString()}] [AsoDataContext] ⏳ Setting status: loading`);
      setDataSourceStatus('loading');
      setCurrentDataSource('bigquery');
    } else if (selectedResult.error) {
      console.warn(`[${new Date().toISOString()}] [AsoDataContext] ❌ BigQuery failed, using mock data:`, selectedResult.error.message);
      setDataSourceStatus('fallback');
      setCurrentDataSource('mock');
    } else if (selectedResult.data) {
      console.log(`[${new Date().toISOString()}] [AsoDataContext] ✅ Setting status: available`);
      setDataSourceStatus('available');
      setCurrentDataSource('bigquery');
    } else {
      console.log(`[${new Date().toISOString()}] [AsoDataContext] ⚠️ No data, falling back to mock`);
      setDataSourceStatus('fallback'); 
      setCurrentDataSource('mock');
    }
  }, [selectedResult.loading, selectedResult.error, selectedResult.data]);

  const contextValue: AsoDataContextType = {
    data: selectedResult.data,
    loading: selectedResult.loading,
    error: selectedResult.error,
    filters,
    setFilters,
    currentDataSource,
    dataSourceStatus,
    meta: currentDataSource === 'bigquery' ? (bestHookData?.metadata || fallbackBigQueryResult.meta) : undefined,
    availableTrafficSources: [...bestAvailableTrafficSources],
    userTouchedFilters,
    setUserTouchedFilters,
    registerHookInstance,
  };

  // ✅ PHASE 4: Final context debugging
  console.log(`[${new Date().toISOString()}] [AsoDataContext] 🚨 Providing context to components:`, {
    availableTrafficSources: contextValue.availableTrafficSources,
    sourcesCount: contextValue.availableTrafficSources?.length || 0,
    usingBestHook: !!bestHookData,
    bestHookInstance: bestHookData?.instanceId || 'none',
    registeredInstances: hookRegistry.size,
    currentDataSource,
    dataSourceStatus,
    loading: contextValue.loading,
    hasData: !!contextValue.data,
    hasError: !!contextValue.error,
    organizationId: filters.organizationId
  });

  return (
    <AsoDataContext.Provider value={contextValue}>
      {children}
    </AsoDataContext.Provider>
  );
};

export const useAsoData = (): AsoDataContextType => {
  const context = useContext(AsoDataContext);
  if (context === undefined) {
    throw new Error('useAsoData must be used within an AsoDataProvider');
  }
  return context;
};
