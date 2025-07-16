
import { useState, useMemo } from 'react';
import { TimeSeriesPoint, TrafficSource } from './useMockAsoData';

/**
 * Hook for filtering time series data by traffic sources
 */
export const useSourceFiltering = (
  timeseriesData: TimeSeriesPoint[] | undefined,
  trafficSources: TrafficSource[] | undefined
) => {
  // Default to all sources being selected
  const allSourceNames = useMemo(() => 
    trafficSources?.map(source => source.name) || [], 
    [trafficSources]
  );
  
  const [selectedSources, setSelectedSources] = useState<string[]>(allSourceNames);

  // Filter timeseries data based on selected sources
  const filteredData = useMemo(() => {
    if (!timeseriesData) return [];
    if (selectedSources.length === 0) return [];
    
    // Return original data if all sources are selected
    if (selectedSources.length === allSourceNames.length) {
      return timeseriesData;
    }
    
    // Filter the data based on selected sources
    // Note: This is a mock implementation as the actual data structure
    // doesn't have source-specific timeseries data in the current model
    return timeseriesData;
  }, [timeseriesData, selectedSources, allSourceNames.length]);

  // Filter traffic sources based on selection
  const filteredSources = useMemo(() => {
    if (!trafficSources) return [];
    if (selectedSources.length === 0) return [];
    
    return trafficSources.filter(source => 
      selectedSources.includes(source.name)
    );
  }, [trafficSources, selectedSources]);

  return {
    selectedSources,
    setSelectedSources,
    filteredData,
    filteredSources,
    allSourceNames
  };
};

export default useSourceFiltering;
