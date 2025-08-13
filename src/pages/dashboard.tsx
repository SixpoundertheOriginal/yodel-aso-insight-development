
// src/pages/dashboard.tsx
import React, { useState, useEffect } from "react";
import KpiCard from "../components/KpiCard";
import AnalyticsTrafficSourceChart from "../components/AnalyticsTrafficSourceChart";
import ComparisonChart from "../components/ComparisonChart";
import { DataSourceIndicator } from "../components/DataSourceIndicator";
import { useAsoData } from "../context/AsoDataContext";
import { useComparisonData } from "../hooks/useComparisonData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toggleTrafficSourceExclusion } from "@/utils/trafficSources";
import { AlertCircle, Calendar, Database, Filter, TestTube, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BrandedLoadingSpinner } from "@/components/ui/LoadingSkeleton";
import { MetricSelector } from '@/components/charts/MetricSelector';
import { MainLayout } from '@/layouts';
import { ContextualInsightsSidebar } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { KPISelector } from '../components/KPISelector';
import { TrafficSourceKpiCards } from '../components/TrafficSourceKpiCards';

const Dashboard: React.FC = () => {
  const [excludeAsa, setExcludeAsa] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('downloads');
  const [selectedKPI, setSelectedKPI] = useState<string>('impressions');
  const navigate = useNavigate();
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
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState('');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  useEffect(() => {
    const fetchOrganizationId = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      setOrganizationId(profile?.organization_id || '');
    };
    fetchOrganizationId();
  }, [user]);


  // Enhanced traffic source filter change handler with validation
  const handleTrafficSourceChange = (sources: string[]) => {
    setUserTouchedFilters(true);
    setFilters(prev => ({
      ...prev,
      trafficSources: sources
    }));
  };

  const handleExcludeAsaToggle = (exclude: boolean) => {
    setExcludeAsa(exclude);
    setUserTouchedFilters(true);
    setFilters((prev) => ({
      ...prev,
      trafficSources: toggleTrafficSourceExclusion(
        prev.trafficSources,
        "Apple Search Ads",
        exclude
      ),
    }));
  };

  const handleKPIChange = (value: string) => {
    setSelectedKPI(value);
  };


  const periodComparison = useComparisonData("period");
  const yearComparison = useComparisonData("year");

  if (loading || !data) {
    return <BrandedLoadingSpinner message="Loading Dashboard" description="Fetching your ASO analytics..." />;
  }

  // Check for empty data state
  const hasNoData = !data.timeseriesData || data.timeseriesData.length === 0;
  const impressionsValue = data.summary?.impressions?.value || 0;
  const downloadsValue = data.summary?.downloads?.value || 0;
  const hasAnyMetrics = impressionsValue > 0 || downloadsValue > 0;

  const isDashboardDataReady = !loading && data && data.summary;

  // Enhanced empty state component
  const EmptyDataState = () => (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-3 bg-orange-500/20 rounded-full">
            <AlertCircle className="h-8 w-8 text-orange-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">No Data Found</h3>
            <p className="text-zinc-400 max-w-md">
              No data available for the selected time period and filters.
              {filters.trafficSources.length > 0 && (
                <> Try clearing traffic source filters or adjusting your date range.</>
              )}
            </p>
          </div>
          
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
  const productPageCvrValue = data.summary?.product_page_cvr?.value || 0;
  const productPageCvrDelta = data.summary?.product_page_cvr?.delta || 0;
  const impressionsCvrValue = data.summary?.impressions_cvr?.value || 0;
  const impressionsCvrDelta = data.summary?.impressions_cvr?.delta || 0;

  const shouldShowKPI = (kpiId: string) => {
    return selectedKPI === kpiId;
  };

  return (
    <MainLayout>
      <div className="flex min-h-screen">
        {/* Main Content - Responsive padding */}
        <div className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'pr-80' : 'pr-15'} main-content`}>
          <div className="space-y-6 p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="analytics-grid flex-1">
          {shouldShowKPI('impressions') && (
            <KpiCard
              title="Impressions"
              value={impressionsValue}
              delta={impressionsDelta}
            />
          )}
          {shouldShowKPI('downloads') && (
            <KpiCard
              title="Downloads"
              value={downloadsValue}
              delta={downloadsDelta}
            />
          )}
          {shouldShowKPI('product_page_views') && (
            <KpiCard
              title="Product Page Views"
              value={pageViewsValue}
              delta={pageViewsDelta}
            />
          )}
          {shouldShowKPI('product_page_cvr') && (
            <KpiCard
              title="Product Page CVR"
              value={productPageCvrValue}
              delta={productPageCvrDelta}
              isPercentage
            />
          )}
          {shouldShowKPI('impressions_cvr') && (
            <KpiCard
              title="Impressions CVR"
              value={impressionsCvrValue}
              delta={impressionsCvrDelta}
              isPercentage
            />
          )}
        </div>
        
        {/* Data Source Indicator with Test Button */}
        <div className="ml-4 flex flex-col items-end gap-2">
          <DataSourceIndicator 
            currentDataSource={currentDataSource}
            dataSourceStatus={dataSourceStatus}
          />
          <Button 
            onClick={() => navigate('/smoke-test')}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-400 hover:text-foreground"
          >
            <TestTube className="h-3 w-3 mr-1" />
            Test BigQuery
          </Button>
        </div>
      </div>

      {/* Enhanced Filter Controls with better debugging */}
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4">
          {filters.trafficSources.length > 0 ? (
            <div className="text-sm text-zinc-400">
              {filters.trafficSources.length === 1
                ? `Showing: ${filters.trafficSources[0]}`
                : `${filters.trafficSources.length} sources selected`}
            </div>
          ) : (
            <div className="text-sm text-zinc-500">Showing all traffic sources</div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <KPISelector
            value={selectedKPI}
            onChange={handleKPIChange}
            includeAllOption={false}
          />
          <Button
            variant={excludeAsa ? "destructive" : "outline"}
            size="sm"
            aria-pressed={excludeAsa}
            onClick={() => handleExcludeAsaToggle(!excludeAsa)}
          >
            Exclude ASA
          </Button>
        </div>
      </div>

      {/* Traffic Source KPI Cards */}
      {data.trafficSources && (
        <TrafficSourceKpiCards
          sources={data.trafficSources}
          selectedKPI={selectedKPI}
          summary={data.summary}
          disableClicks
        />
      )}

      {/* Performance Metrics Chart or Empty State */}
      {hasNoData || !hasAnyMetrics ? (
        <div className="mb-8">
          <EmptyDataState />
        </div>
      ) : (
        <div className="analytics-chart-container mb-8">
          <h3 className="analytics-chart-title mb-4">Performance Metrics</h3>
          <AnalyticsTrafficSourceChart
            trafficSourceTimeseriesData={data.trafficSourceTimeseriesData || []}
            selectedMetric={selectedKPI}
          />
        </div>
      )}

      {/* Previous Period Comparison */}
      {!periodComparison.loading &&
        periodComparison.current &&
        periodComparison.previous && (
          <div className="analytics-chart-container mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="analytics-chart-title">Previous Period</h3>
              <MetricSelector value={selectedMetric} onChange={setSelectedMetric} />
            </div>
            <ComparisonChart
              currentData={periodComparison.current.timeseriesData}
              previousData={periodComparison.previous.timeseriesData}
              title="Previous Period"
              metric={selectedMetric as 'downloads' | 'impressions' | 'product_page_views'}
            />
          </div>
        )}

      {/* Previous Year Comparison */}
      {!yearComparison.loading &&
        yearComparison.current &&
        yearComparison.previous && (
          <div className="analytics-chart-container mb-8">
            <h3 className="analytics-chart-title mb-4">Previous Year</h3>
            <ComparisonChart
              currentData={yearComparison.current.timeseriesData}
              previousData={yearComparison.previous.timeseriesData}
              title="Previous Year"
              metric={selectedMetric as 'downloads' | 'impressions' | 'product_page_views'}
            />
          </div>
        )}
          </div>
          </div>
        </div>

        {/* Sidebar - Pass collapse state */}
        <div className="fixed right-0 top-0 h-full z-10">
          {isDashboardDataReady ? (
            <ContextualInsightsSidebar
              metricsData={data}
              organizationId={organizationId}
              isExpanded={isSidebarExpanded}
              onToggleExpanded={setIsSidebarExpanded}
            />
          ) : (
            <div className="w-80 h-screen bg-background/50 border-l border-border flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
              </div>
            </div>
          )}
        </div>
    </MainLayout>
  );
};

export default Dashboard;
