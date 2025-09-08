
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useMemo
} from 'react';
import { useAsoDataWithFallback, DataSource } from '../hooks/useAsoDataWithFallback';
import { AsoData, DateRange } from '../hooks/useMockAsoData';
import { useBigQueryAppSelection } from './BigQueryAppContext';

export interface AsoDataFilters {
  organizationId: string;
  dateRange: DateRange;
  trafficSources: string[];
  selectedApps: string[];
}

export type DataSourceStatus = 'loading' | 'bigquery-success' | 'demo-data' | 'bigquery-failed-fallback' | 'mock-only';

interface AsoDataContextType {
  data: AsoData | null;
  loading: boolean;
  error: Error | null;
  filters: AsoDataFilters;
  setFilters: (filters: AsoDataFilters | ((prev: AsoDataFilters) => AsoDataFilters)) => void;
  setUserTouchedFilters: (touched: boolean) => void;
  currentDataSource: 'bigquery' | 'mock' | null;
  dataSourceStatus: DataSourceStatus;
  availableTrafficSources: string[] | undefined;
  meta?: any;
  isDemo?: boolean; // NEW: Demo data flag
}

const AsoDataContext = createContext<AsoDataContextType | undefined>(undefined);

interface AsoDataProviderProps {
  children: ReactNode;
  defaultDataSource?: DataSource;
}

export const AsoDataProvider: React.FC<AsoDataProviderProps> = ({ 
  children, 
  defaultDataSource = 'auto' 
}) => {
  const [userTouchedFilters, setUserTouchedFilters] = useState(false);

  // Initialize filters with default values
  const [filters, setFilters] = useState<AsoDataFilters>({
    organizationId: '', // Will be populated by the hook from auth context
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: new Date()
    },
    trafficSources: [], // Empty array means show all traffic sources
    selectedApps: []
  });

  const { selectedApps } = useBigQueryAppSelection();

  useEffect(() => {
    setFilters(prev => {
      if (JSON.stringify(prev.selectedApps) !== JSON.stringify(selectedApps)) {
        return { ...prev, selectedApps };
      }
      return prev;
    });
  }, [selectedApps]);

  // Use the fallback hook with the current filters
  const {
    data,
    loading,
    error,
    currentDataSource,
    dataSourceStatus,
    availableTrafficSources,
    isDemo // NEW: Get demo flag from hook
  } = useAsoDataWithFallback(
    filters.dateRange,
    filters.trafficSources,
    defaultDataSource
  );

  console.log('🔍 DEMO AUDIT [CONTEXT-1]: Context input received');
  console.log('🔍 DEMO AUDIT [CONTEXT-1]: Input isDemo:', isDemo);

  const updateFilters = useCallback((newFilters: AsoDataFilters | ((prev: AsoDataFilters) => AsoDataFilters)) => {
    setFilters(newFilters);
  }, []);

  const contextValue = useMemo(() => {
    const value = {
      data,
      loading,
      error,
      filters,
      setFilters: updateFilters,
      setUserTouchedFilters,
      currentDataSource,
      dataSourceStatus,
      availableTrafficSources,
      meta: undefined, // Will be populated by BigQuery hook if needed
      isDemo // NEW: Pass through demo flag
    };

    console.log('🔍 DEMO AUDIT [CONTEXT-2]: Context value created');
    console.log('🔍 DEMO AUDIT [CONTEXT-2]: Context keys:', Object.keys(value));
    console.log('🔍 DEMO AUDIT [CONTEXT-2]: Context isDemo:', value.isDemo);

    return value;
  }, [
    data,
    loading,
    error,
    filters,
    updateFilters,
    currentDataSource,
    dataSourceStatus,
    availableTrafficSources,
    isDemo // NEW: Include in dependencies
  ]);

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
