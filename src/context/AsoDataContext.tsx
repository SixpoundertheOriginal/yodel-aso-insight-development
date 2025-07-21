
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useAsoDataWithFallback, DataSource } from '../hooks/useAsoDataWithFallback';
import { AsoData, DateRange } from '../hooks/useMockAsoData';

export interface AsoDataFilters {
  organizationId: string;
  dateRange: DateRange;
  trafficSources: string[];
}

interface AsoDataContextType {
  data: AsoData | null;
  loading: boolean;
  filters: AsoDataFilters;
  setFilters: (filters: AsoDataFilters | ((prev: AsoDataFilters) => AsoDataFilters)) => void;
  setUserTouchedFilters: (touched: boolean) => void;
  currentDataSource: 'bigquery' | 'mock' | null;
  dataSourceStatus: 'loading' | 'bigquery-success' | 'bigquery-failed-fallback' | 'mock-only';
  meta?: any;
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
    trafficSources: [] // Empty array means show all traffic sources
  });

  // Use the fallback hook with the current filters
  const {
    data,
    loading,
    error,
    currentDataSource,
    dataSourceStatus
  } = useAsoDataWithFallback(
    filters.dateRange,
    filters.trafficSources,
    defaultDataSource
  );

  const updateFilters = useCallback((newFilters: AsoDataFilters | ((prev: AsoDataFilters) => AsoDataFilters)) => {
    setFilters(newFilters);
  }, []);

  return (
    <AsoDataContext.Provider
      value={{
        data,
        loading,
        filters,
        setFilters: updateFilters,
        setUserTouchedFilters,
        currentDataSource,
        dataSourceStatus,
        meta: undefined // Will be populated by BigQuery hook if needed
      }}
    >
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
