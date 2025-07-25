
import React from "react";
import { MainLayout } from "../layouts";
import { useAsoData } from "../context/AsoDataContext";
import { Skeleton } from "@/components/ui/skeleton";
import { AiInsightsPanel } from "../components/AiInsightsPanel";
import { AnalyticsTrafficSourceFilter } from "@/components/Filters";
import TimeSeriesChart from "../components/TimeSeriesChart";
import KpiCard from "../components/KpiCard";
import { 
  PremiumCard, 
  PremiumCardHeader, 
  PremiumCardContent, 
  PremiumTypography,
  LayoutSection,
  ResponsiveGrid,
  AnimatedCounter,
  StatusIndicator
} from "@/components/ui/premium";

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
      <LayoutSection spacing="md">
        {/* AI Insights Panel - Top Priority */}
        <div className="mb-8">
          <AiInsightsPanel maxDisplayed={3} />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <PremiumTypography.PageTitle gradient="orange" animated>
            Performance Overview
          </PremiumTypography.PageTitle>
          
          <div className="flex gap-4">
            <StatusIndicator status="success" pulse label="Live Data" />
            <AnalyticsTrafficSourceFilter 
              selectedSources={filters.trafficSources}
              onChange={handleSourceChange}
            />
          </div>
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <ResponsiveGrid cols={{ default: 1, lg: 2, xl: 3 }} gap="lg">
            {[1, 2, 3].map((_, index) => (
              <PremiumCard key={index} variant="glass" intensity="medium" animated>
                <PremiumCardHeader>
                  <Skeleton className="h-8 w-48" />
                </PremiumCardHeader>
                <PremiumCardContent>
                  <Skeleton className="h-[300px] w-full" />
                </PremiumCardContent>
              </PremiumCard>
            ))}
          </ResponsiveGrid>
        )}
        
        {/* Data Display like Store Performance */}
        {!isLoading && data && (
          <div className="flex flex-col space-y-8">
            
            {/* KPI Cards Section */}
            <ResponsiveGrid cols={{ default: 1, sm: 2, md: 3, lg: 4 }} gap="lg">
              {data.trafficSources && data.trafficSources.map((source, index) => (
                <PremiumCard
                  key={source.name}
                  variant="interactive"
                  intensity="medium"
                  glowColor="orange"
                  className="group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <PremiumCardContent className="p-6">
                    <div className="text-center">
                      <PremiumTypography.CardTitle className="mb-2 group-hover:text-orange-400 transition-colors">
                        {source.name}
                      </PremiumTypography.CardTitle>
                      <PremiumTypography.MetricValue className="mb-1">
                        {source.value.toLocaleString()}
                      </PremiumTypography.MetricValue>
                      <PremiumTypography.PercentageValue className={`${source.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {source.delta >= 0 ? '+' : ''}{source.delta}%
                      </PremiumTypography.PercentageValue>
                    </div>
                  </PremiumCardContent>
                </PremiumCard>
              ))}
            </ResponsiveGrid>
            
            {/* Time Series Chart */}
            <PremiumCard variant="glow" intensity="strong" glowColor="blue" className="overflow-hidden">
              <PremiumCardHeader className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
                <PremiumTypography.SectionTitle className="flex items-center gap-3">
                  Performance Over Time
                  <StatusIndicator status="info" size="sm" />
                </PremiumTypography.SectionTitle>
              </PremiumCardHeader>
              <PremiumCardContent className="p-8">
                <TimeSeriesChart data={data.timeseriesData} />
              </PremiumCardContent>
            </PremiumCard>
            
            {/* Summary Stats */}
            {data.summary && (
              <PremiumCard variant="gradient" intensity="strong" className="overflow-hidden">
                <PremiumCardHeader className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
                  <PremiumTypography.SectionTitle gradient="success">
                    Summary Statistics
                  </PremiumTypography.SectionTitle>
                </PremiumCardHeader>
                <PremiumCardContent className="p-8">
                  <ResponsiveGrid cols={{ default: 1, md: 3 }} gap="lg">
                    <div className="text-center group">
                      <PremiumTypography.DataLabel className="mb-3 block">Total Impressions</PremiumTypography.DataLabel>
                      <PremiumTypography.MetricValue className="group-hover:text-blue-400 transition-colors">
                        {(data.summary.impressions ? data.summary.impressions.value : 0).toLocaleString()}
                      </PremiumTypography.MetricValue>
                    </div>
                    <div className="text-center group">
                      <PremiumTypography.DataLabel className="mb-3 block">Total Downloads</PremiumTypography.DataLabel>
                      <PremiumTypography.MetricValue className="group-hover:text-emerald-400 transition-colors">
                        {(data.summary.downloads ? data.summary.downloads.value : 0).toLocaleString()}
                      </PremiumTypography.MetricValue>
                    </div>
                    <div className="text-center group">
                      <PremiumTypography.DataLabel className="mb-3 block">Conversion Rate</PremiumTypography.DataLabel>
                      <PremiumTypography.MetricValue className="text-orange-500 group-hover:text-orange-400 transition-colors">
                        {(data.summary.cvr ? data.summary.cvr.value : 0).toFixed(2)}%
                      </PremiumTypography.MetricValue>
                    </div>
                  </ResponsiveGrid>
                </PremiumCardContent>
              </PremiumCard>
            )}
          </div>
        )}
      </LayoutSection>
    </MainLayout>
  );
};

export default OverviewPage;
