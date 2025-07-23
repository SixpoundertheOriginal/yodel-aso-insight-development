
import React from "react";
import { MainLayout } from "../layouts";
import { useAsoData } from "../context/AsoDataContext";
// import { useComparisonData } from "../hooks"; // Removed - not needed anymore
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AiInsightsPanel } from "../components/AiInsightsPanel";
import { AnalyticsTrafficSourceFilter } from "@/components/Filters";
import TimeSeriesChart from "../components/TimeSeriesChart";
import KpiCard from "../components/KpiCard";

const OverviewPage: React.FC = () => {
  const { data, loading, filters, setFilters, setUserTouchedFilters } = useAsoData();

  // Handle traffic source filter change - now supports multi-select
  const handleSourceChange = (sources: string[]) => {
    console.log('🎯 [Overview] Multi-select traffic source filter changed:', sources);
    setUserTouchedFilters(true);
    setFilters(prev => ({
      ...prev,
      trafficSources: sources
    }));
  };

  const isLoading = loading;

  console.log('📊 [Overview Detailed Debug]', { 
    loading: isLoading, 
    hasData: !!data, 
    dataLength: data?.timeseriesData?.length || 'no timeseries',
    dataStructure: data ? Object.keys(data) : 'no data',
    dataType: typeof data,
    summaryData: data?.summary,
    trafficSources: data?.trafficSources?.length || 'no traffic sources',
    selectedTrafficSources: filters.trafficSources,
    selectedTrafficSourcesCount: filters.trafficSources.length,
    firstTimeseriesItem: data?.timeseriesData?.[0]
  });

  return (
    <MainLayout>
      <div className="flex flex-col space-y-10">
        {/* AI Insights Panel - Top Priority */}
        <div className="mb-6">
          <AiInsightsPanel maxDisplayed={3} />
        </div>

        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white">Performance Overview</h1>
          
          <div className="flex gap-4">
            {/* Shared Analytics Traffic Source Filter */}
            <AnalyticsTrafficSourceFilter 
              selectedSources={filters.trafficSources}
              onChange={handleSourceChange}
            />
          </div>
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-10">
            {[1, 2, 3].map((_, index) => (
              <Card key={index} className="bg-zinc-900 border-zinc-800 shadow-lg">
                <CardHeader>
                  <CardTitle>
                    <Skeleton className="h-8 w-48" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[500px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Data Display like Store Performance */}
        {!isLoading && data && (
          <div className="flex flex-col space-y-6">
            
            {/* KPI Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {data.trafficSources && data.trafficSources.map((source) => (
                <KpiCard
                  key={source.name}
                  title={source.name}
                  value={source.value}
                  delta={source.delta}
                />
              ))}
            </div>
            
            {/* Time Series Chart */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
              <CardHeader className="bg-zinc-900/80 backdrop-filter backdrop-blur-sm border-b border-zinc-800/50">
                <CardTitle className="text-2xl font-bold text-white">Performance Over Time</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <TimeSeriesChart data={data.timeseriesData} />
              </CardContent>
            </Card>
            
            {/* Summary Stats */}
            {data.summary && (
              <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                <CardHeader className="bg-zinc-900/80 backdrop-filter backdrop-blur-sm border-b border-zinc-800/50">
                  <CardTitle className="text-2xl font-bold text-white">Summary Statistics</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white mb-2">
                        {data.summary.impressions ? data.summary.impressions.value.toLocaleString() : '0'}
                      </div>
                      <div className="text-zinc-400">Total Impressions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white mb-2">
                        {data.summary.downloads ? data.summary.downloads.value.toLocaleString() : '0'}
                      </div>
                      <div className="text-zinc-400">Total Downloads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-yodel-orange mb-2">
                        {data.summary.cvr ? data.summary.cvr.value.toFixed(1) : '0.0'}%
                      </div>
                      <div className="text-zinc-400">Conversion Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default OverviewPage;
