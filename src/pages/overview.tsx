
import React from "react";
import { MainLayout } from "../layouts";
import { useAsoData } from "../context/AsoDataContext";
import ComparisonChart from "../components/ComparisonChart";
import { useComparisonData } from "../hooks";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AiInsightsPanel } from "../components/AiInsightsPanel";
import { AnalyticsTrafficSourceFilter } from "@/components/Filters";

const OverviewPage: React.FC = () => {
  const { data, loading, filters, setFilters, setUserTouchedFilters } = useAsoData();
  const { current, previous, loading: comparisonLoading, deltas } = useComparisonData('period');

  // Handle traffic source filter change - now supports multi-select
  const handleSourceChange = (sources: string[]) => {
    console.log('🎯 [Overview] Multi-select traffic source filter changed:', sources);
    setUserTouchedFilters(true);
    setFilters(prev => ({
      ...prev,
      trafficSources: sources
    }));
  };

  const isLoading = loading || comparisonLoading;

  console.log('📊 [Overview Debug] Current state:', { 
    loading: isLoading, 
    hasData: !!data, 
    dataStructure: data ? Object.keys(data) : 'no data',
    dataType: typeof data,
    selectedTrafficSources: filters.trafficSources,
    selectedTrafficSourcesCount: filters.trafficSources.length,
    deltas,
    current,
    previous
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
        
        {/* Charts with Real Period Comparison */}
        {!isLoading && data && (
          <div className="grid grid-cols-1 gap-10">
            {/* Impressions Chart */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
              <CardHeader className="bg-zinc-900/80 backdrop-filter backdrop-blur-sm border-b border-zinc-800/50">
                <CardTitle className="text-2xl font-bold text-white">Impressions</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <ComparisonChart
                  currentData={data.timeseriesData}
                  previousData={[]}
                  title="Impressions"
                  metric="impressions"
                />
              </CardContent>
            </Card>
            
            {/* Downloads Chart */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
              <CardHeader className="bg-zinc-900/80 backdrop-filter backdrop-blur-sm border-b border-zinc-800/50">
                <CardTitle className="text-2xl font-bold text-white">Downloads</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <ComparisonChart
                  currentData={data.timeseriesData}
                  previousData={[]}
                  title="Downloads"
                  metric="downloads"
                />
              </CardContent>
            </Card>
            
            {/* Conversion Rate Chart with Real Deltas */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
              <CardHeader className="bg-zinc-900/80 backdrop-filter backdrop-blur-sm border-b border-zinc-800/50">
                <CardTitle className="text-2xl font-bold text-white">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {data && data.summary && (
                  <>
                    <div className="mb-10">
                      <div className="h-[250px]">
                        <div className="flex flex-col h-full justify-center items-center">
                          <div className="text-8xl font-bold text-yodel-orange">
                            {data.summary.cvr ? data.summary.cvr.value.toFixed(1) : '0.0'}%
                          </div>
                          <div className="flex items-center mt-8">
                            <span className="text-xl text-zinc-400">Conversion Rate</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <div className="h-[220px]">
                        <div className="grid grid-cols-2 gap-8 h-full">
                          <div className="stat-card flex flex-col justify-center">
                            <div className="text-zinc-400 mb-3 text-lg">Total Impressions</div>
                            <div className="text-4xl font-bold text-white">
                              {data.summary.impressions ? data.summary.impressions.value.toLocaleString() : '0'}
                            </div>
                          </div>
                          
                          <div className="stat-card flex flex-col justify-center">
                            <div className="text-zinc-400 mb-3 text-lg">Total Downloads</div>
                            <div className="text-4xl font-bold text-white">
                              {data.summary.downloads ? data.summary.downloads.value.toLocaleString() : '0'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default OverviewPage;
