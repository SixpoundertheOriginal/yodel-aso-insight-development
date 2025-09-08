
// Update dashboard to integrate country picker
import React, { useState, useEffect } from "react";
import KpiCard from "../components/KpiCard";
import AnalyticsTrafficSourceChart from "../components/AnalyticsTrafficSourceChart";
import ComparisonChart from "../components/ComparisonChart";
import { DataSourceIndicator } from "../components/DataSourceIndicator";
import { CountryPicker } from "../components/CountryPicker";
import { PlaceholderDataIndicator } from "../components/PlaceholderDataIndicator";
import { MarketProvider, useMarketData } from "../contexts/MarketContext";
import { DemoDataBadge } from '@/components/DemoDataBadge';
import { useBigQueryData } from '@/hooks/useBigQueryData';
import { useAsoData } from "../context/AsoDataContext";
import { useComparisonData } from "../hooks/useComparisonData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Database, Filter, TestTube, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BrandedLoadingSpinner } from "@/components/ui/LoadingSkeleton";
import { MetricSelector } from '@/components/charts/MetricSelector';
import { MainLayout } from '@/layouts';
import { ContextualInsightsSidebar, SidebarState } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { KPISelector } from '../components/KPISelector';
import { TrafficSourceKpiCards } from '../components/TrafficSourceKpiCards';
import { usePermissions } from '@/hooks/usePermissions';
import { OrganizationSelector } from '@/components/Organization/OrganizationSelector';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { PermissionWrapper } from '@/components/PermissionWrapper';
import DashboardBrandingLine from '@/components/DashboardBrandingLine';

const DashboardContent: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState('downloads');
  const [selectedKPI, setSelectedKPI] = useState<string>('impressions');
  const navigate = useNavigate();
  const contextValue = useAsoData();
  const {
    data,
    loading,
    error,
    filters,
    setFilters,
    setUserTouchedFilters,
    currentDataSource,
    dataSourceStatus,
    meta,
    isDemo // NEW: Get demo flag from context
  } = contextValue;

  console.log('🔍 DEMO AUDIT [UI-1]: Component render');
  console.log('🔍 DEMO AUDIT [UI-1]: Component isDemo:', isDemo);
  console.log('🔍 DEMO AUDIT [UI-1]: Loading state:', loading);
  console.log('🔍 DEMO AUDIT [UI-1]: Error state:', !!error);
  console.log('🔍 DEMO AUDIT [UI-1]: Render decision:',
    loading ? 'LOADING' : error ? 'ERROR' : isDemo ? 'DEMO_BADGE' : 'REAL_TIME'
  );
  console.log('🔍 DEMO AUDIT [TYPES]: isDemo type:', typeof isDemo);
  console.log('🔍 DEMO AUDIT [TYPES]: isDemo value:', isDemo);
  console.log('🔍 DEMO AUDIT [TYPES]: Context type keys:', Object.keys(contextValue));
  const { user } = useAuth();
  const { selectedMarket, setSelectedMarket, isPlaceholderData } = useMarketData();
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  const { selectedOrganizationId, setSelectedOrganizationId, isPlatformWideMode } = useSuperAdmin();
  const [organizationId, setOrganizationId] = useState('');
  const [sidebarState, setSidebarState] = useState<SidebarState>('normal');
  
  // Remove duplicate useBigQueryData call - isDemo now comes from context

  useEffect(() => {
    const fetchOrganizationId = async () => {
      if (!user) return;
      
      // ✅ ENHANCED: Use super admin selected organization or user's organization
      if (isSuperAdmin && selectedOrganizationId) {
        setOrganizationId(selectedOrganizationId);
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      // ✅ ENHANCED: Handle Platform Super Admin with null organization_id
      const orgId = profile?.organization_id || '';
      setOrganizationId(orgId);
      
      // If super admin has no organization selected, keep it empty for platform-wide view
      if (isSuperAdmin && !selectedOrganizationId && !profile?.organization_id) {
        setOrganizationId('');
      }
    };
    fetchOrganizationId();
  }, [user, isSuperAdmin, selectedOrganizationId]);

  useEffect(() => {
    if (!organizationId) return;
    const saved = localStorage.getItem(`ai-sidebar-state-${organizationId}`);
    if (saved) {
      setSidebarState(saved as SidebarState);
    }
  }, [organizationId]);


  // Enhanced traffic source filter change handler with validation
  const handleTrafficSourceChange = (sources: string[]) => {
    setUserTouchedFilters(true);
    setFilters(prev => ({
      ...prev,
      trafficSources: sources
    }));
  };

  const handleKPIChange = (value: string) => {
    setSelectedKPI(value);
  };

  const handleSidebarStateChange = (state: SidebarState) => {
    setSidebarState(state);
    if (organizationId) {
      localStorage.setItem(`ai-sidebar-state-${organizationId}`, state);
    }
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

  const visibleKPIs = [selectedKPI];

  const gridColsClass: Record<number, string> = {
    1: 'xl:grid-cols-1',
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
  };

  const gridCols = gridColsClass[visibleKPIs.length] || 'xl:grid-cols-5';

  return (
    <MainLayout>
      <div className="flex min-h-screen">
        {/* Main Content - Responsive padding */}
        <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarState === 'collapsed' ? 'pr-15' : sidebarState === 'expanded' ? 'pr-[60vw]' : 'pr-80'} main-content`}>
      <div className="space-y-6 p-6">
        {/* ✅ ENHANCED: Platform Super Admin Organization Selector */}
        {isSuperAdmin && (
          <div className="mb-6">
            <OrganizationSelector
              selectedOrganizationId={selectedOrganizationId}
              onOrganizationChange={setSelectedOrganizationId}
              isSuperAdmin={isSuperAdmin}
            />
          </div>
        )}

        {/* Page Header with Country Picker */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Store Performance</h1>
            <DashboardBrandingLine />
          </div>
          
          <div className="flex items-center space-x-4">
            <CountryPicker 
              selectedCountry={selectedMarket}
              onCountryChange={setSelectedMarket}
            />
            {loading ? (
              <span className="text-gray-500 text-sm">Loading...</span>
            ) : isDemo ? (
              <DemoDataBadge isDemo={true} />
            ) : (
              <span className="text-green-600 font-medium text-sm">• Real-time</span>
            )}
          </div>
        </div>

        {/* Placeholder Data Indicator */}
        <PlaceholderDataIndicator />

        {/* ✅ ENHANCED: Platform-wide mode message */}
        {isPlatformWideMode && (
          <Card className="bg-primary/5 border-primary/20 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary">
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Platform-Wide Mode: Showing aggregated demo data. Select an organization above to view real data.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

      <div className="flex justify-between items-start mb-6">
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${gridCols} gap-6 flex-1`}>
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
        
        {/* Test Button */}
        <div className="ml-4 flex flex-col items-end gap-2">
          <PermissionWrapper permission="ui.debug.show_test_buttons">
            <Button
              onClick={() => navigate('/smoke-test')}
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-400 hover:text-foreground"
            >
              <TestTube className="h-3 w-3 mr-1" />
              Test BigQuery
            </Button>
          </PermissionWrapper>
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
        <Card className="bg-zinc-800 rounded-md mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-medium mb-4">Performance Metrics</h2>
            <AnalyticsTrafficSourceChart
              trafficSourceTimeseriesData={data.trafficSourceTimeseriesData || []}
              selectedMetric={selectedKPI}
            />
          </CardContent>
        </Card>
      )}

      {/* Previous Period Comparison */}
      {!periodComparison.loading &&
        periodComparison.current &&
        periodComparison.previous && (
          <Card className="bg-zinc-800 rounded-md mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Previous Period</h2>
                <MetricSelector value={selectedMetric} onChange={setSelectedMetric} />
              </div>
              <ComparisonChart
                currentData={periodComparison.current.timeseriesData}
                previousData={periodComparison.previous.timeseriesData}
                title="Previous Period"
                metric={selectedMetric as 'downloads' | 'impressions' | 'product_page_views'}
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
                metric={selectedMetric as 'downloads' | 'impressions' | 'product_page_views'}
              />
            </CardContent>
          </Card>
        )}
          </div>
          </div>
        </div>

        {/* Sidebar - Pass collapse state */}
        <div className="fixed right-0 top-0 h-full z-10">
          {!permissionsLoading && isSuperAdmin && user?.email === 'igor@yodelmobile.com' && (
            isDashboardDataReady ? (
              <ContextualInsightsSidebar
                metricsData={data}
                organizationId={organizationId}
                state={sidebarState}
                onStateChange={handleSidebarStateChange}
                isSuperAdmin={isSuperAdmin}
              />
            ) : (
              <div className="w-80 h-screen bg-background/50 border-l border-border flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
                </div>
              </div>
            )
          )}
        </div>
    </MainLayout>
  );
};

// Main Dashboard component with MarketProvider
const Dashboard: React.FC = () => {
  return (
    <MarketProvider>
      <DashboardContent />
    </MarketProvider>
  );
};

export default Dashboard;
