
// src/pages/dashboard.tsx
import React, { useState, useEffect } from "react";
import { MainLayout } from "../layouts";
import KpiCard from "../components/KpiCard";
import TimeSeriesChart from "../components/TimeSeriesChart";
import ComparisonChart from "../components/ComparisonChart";
import { DataSourceIndicator } from "../components/DataSourceIndicator";
import { AiInsightsPanel } from "../components/AiInsightsPanel";
import { AnalyticsTrafficSourceFilter } from "../components/Filters";
import { useAsoData } from "../context/AsoDataContext";
import { useComparisonData } from "../hooks/useComparisonData";
import { Toggle } from "@/components/ui/toggle";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Calendar, Database, Filter } from "lucide-react";

const Dashboard: React.FC = () => {
  const [excludeAsa, setExcludeAsa] = useState(false);
  const {
    data,
    loading,
    filters,
    setFilters,
    setUserTouchedFilters,
    currentDataSource,
    dataSourceStatus,
    meta
  } = useAsoData();

  // Debounced filter updates to prevent excessive API calls
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // Enhanced traffic source filter change handler with validation
  const handleTrafficSourceChange = (sources: string[]) => {
    console.log('🎯 [Dashboard] Traffic source filter changed:', {
      previousSources: filters.trafficSources,
      newSources: sources,
      isEmpty: sources.length === 0,
      filterDecision: sources.length === 0 ? 'CLEAR_FILTER_SHOW_ALL' : 'APPLY_SPECIFIC_FILTER'
    });

    setUserTouchedFilters(true);
    setFilters(prev => ({
      ...prev,
      trafficSources: sources
    }));
    
    // Debug log for complete filter state validation
    if (sources.length === 0) {
      console.debug('✅ [Dashboard] Filter cleared → trafficSources = [], expecting ALL traffic sources in data');
    }
  };

  // Update exclude ASA logic to work with clear filter state
  useEffect(() => {
    if (excludeAsa) {
      setUserTouchedFilters(true);
      setFilters(prev => ({
        ...prev,
        trafficSources: prev.trafficSources.filter(src => src !== "Apple Search Ads"),
      }));
      console.debug('🚫 [Dashboard] Excluding Apple Search Ads from filter');
    } else {
      // Only add ASA back if it was previously filtered and we have other sources selected
      setUserTouchedFilters(true);
      setFilters(prev => {
        if (prev.trafficSources.length > 0 && !prev.trafficSources.includes("Apple Search Ads")) {
          return { ...prev, trafficSources: [...prev.trafficSources, "Apple Search Ads"] };
        }
        return prev;
      });
      console.debug('✅ [Dashboard] Including Apple Search Ads in filter');
    }
  }, [excludeAsa, setFilters, setUserTouchedFilters]);

  const periodComparison = useComparisonData("period");
  const yearComparison = useComparisonData("year");

  if (loading || !data) {
    return (
      <MainLayout>
        {/* AI Insights Loading State */}
        <div className="mb-6">
          <AiInsightsPanel />
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-zinc-800 animate-pulse rounded-md"></div>
            ))}
          </div>
          <div className="ml-4">
            <DataSourceIndicator 
              currentDataSource={currentDataSource}
              dataSourceStatus={dataSourceStatus}
            />
          </div>
        </div>
        <div className="h-64 bg-zinc-800 animate-pulse rounded-md"></div>
      </MainLayout>
    );
  }

  // Check for empty data state
  const hasNoData = !data.timeseriesData || data.timeseriesData.length === 0;
  const impressionsValue = data.summary?.impressions?.value || 0;
  const downloadsValue = data.summary?.downloads?.value || 0;
  const hasAnyMetrics = impressionsValue > 0 || downloadsValue > 0;

  // Enhanced empty state component
  const EmptyDataState = () => (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-3 bg-orange-500/20 rounded-full">
            <AlertCircle className="h-8 w-8 text-orange-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">No Data Found</h3>
            <p className="text-zinc-400 max-w-md">
              {meta ? (
                <>
                  No results found for organization "{meta.queryParams.client}"
                  {meta.queryParams.dateRange && (
                    <> between {meta.queryParams.dateRange.from} and {meta.queryParams.dateRange.to}</>
                  )}
                  {filters.trafficSources.length > 0 && (
                    <> with traffic sources: {filters.trafficSources.join(", ")}</>
                  )}.
                </>
              ) : (
                'No data available for the selected time period and filters.'
              )}
            </p>
          </div>
          
          {/* Debug information in development */}
          {meta && process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg text-xs text-zinc-400 text-left">
              <div className="font-medium text-zinc-300 mb-2">Debug Information:</div>
              <div>Organization ID: {meta.queryParams.client}</div>
              <div>Date Range: {meta.queryParams.dateRange ? 
                `${meta.queryParams.dateRange.from} to ${meta.queryParams.dateRange.to}` : 
                'No date filter'
              }</div>
              <div>Traffic Sources: {filters.trafficSources.length || 'All sources'}</div>
              <div>Query Limit: {meta.queryParams.limit}</div>
              <div>Execution Time: {meta.executionTimeMs}ms</div>
              <div>Total Rows Found: {meta.totalRows}</div>
            </div>
          )}

          <div className="flex flex-col space-y-2 text-sm text-zinc-500">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Try adjusting your date range</span>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Try clearing traffic source filters</span>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Check if data exists for your organization</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Add null/undefined checks for the summary data
  const impressionsDelta = data.summary?.impressions?.delta || 0;
  const downloadsDelta = data.summary?.downloads?.delta || 0;
  const pageViewsValue = data.summary?.product_page_views?.value || 0;
  const pageViewsDelta = data.summary?.product_page_views?.delta || 0;
  const cvrValue = data.summary?.cvr?.value || 0;
  const cvrDelta = data.summary?.cvr?.delta || 0;

  return (
    <MainLayout>
      {/* AI Insights Panel - Top Priority */}
      <div className="mb-6">
        <AiInsightsPanel maxDisplayed={3} />
      </div>

      {/* KPI Cards with Data Source Indicator */}
      <div className="flex justify-between items-start mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
          <KpiCard
            title="Impressions"
            value={impressionsValue}
            delta={impressionsDelta}
          />
          <KpiCard
            title="Downloads"
            value={downloadsValue}
            delta={downloadsDelta}
          />
          <KpiCard
            title="Product Page Views"
            value={pageViewsValue}
            delta={pageViewsDelta}
          />
          <KpiCard 
            title="CVR" 
            value={cvrValue} 
            delta={cvrDelta} 
          />
        </div>
        
        {/* Data Source Indicator */}
        <div className="ml-4 flex flex-col items-end gap-2">
          <DataSourceIndicator 
            currentDataSource={currentDataSource}
            dataSourceStatus={dataSourceStatus}
          />
        </div>
      </div>

      {/* Enhanced Filter Controls with better debugging */}
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4">
          <AnalyticsTrafficSourceFilter
            selectedSources={filters.trafficSources}
            onChange={handleTrafficSourceChange}
            placeholder="Filter Traffic Sources"
            widthClass="w-64"
          />
          {filters.trafficSources.length > 0 && (
            <div className="text-sm text-zinc-400">
              {filters.trafficSources.length === 1 
                ? `Showing: ${filters.trafficSources[0]}`
                : `${filters.trafficSources.length} sources selected`
              }
            </div>
          )}
          {filters.trafficSources.length === 0 && (
            <div className="text-sm text-zinc-500">
              Showing all traffic sources
            </div>
          )}
        </div>
        
        <div className="flex items-center">
          <span className="text-sm text-zinc-400 mr-2">Exclude ASA</span>
          <Toggle
            pressed={excludeAsa}
            onPressedChange={setExcludeAsa}
            aria-label="Exclude Apple Search Ads"
          />
        </div>
      </div>

      {/* Performance Metrics Chart or Empty State */}
      {hasNoData || !hasAnyMetrics ? (
        <div className="mb-8">
          <EmptyDataState />
        </div>
      ) : (
        <Card className="bg-zinc-800 rounded-md mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-medium mb-4">Performance Metrics</h2>
            <TimeSeriesChart data={data.timeseriesData} />
          </CardContent>
        </Card>
      )}

      {/* Previous Period Comparison */}
      {!periodComparison.loading &&
        periodComparison.current &&
        periodComparison.previous && (
          <Card className="bg-zinc-800 rounded-md mb-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Previous Period</h2>
              <ComparisonChart
                currentData={periodComparison.current.timeseriesData}
                previousData={periodComparison.previous.timeseriesData}
                title="Previous Period"
                metric="downloads"
              />
            </CardContent>
          </Card>
        )}

      {/* Previous Year Comparison */}
      {!yearComparison.loading &&
        yearComparison.current &&
        yearComparison.previous && (
          <Card className="bg-zinc-800 rounded-md mb-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Previous Year</h2>
              <ComparisonChart
                currentData={yearComparison.current.timeseriesData}
                previousData={yearComparison.previous.timeseriesData}
                title="Previous Year"
                metric="downloads"
              />
            </CardContent>
          </Card>
        )}
    </MainLayout>
  );
};

export default Dashboard;
