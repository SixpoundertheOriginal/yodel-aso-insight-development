
// Update dashboard to integrate country picker
import React, { useState, useEffect } from "react";
import KpiCard from "@/components/kpi/KpiCard";
import DashboardStatsCard from "../components/DashboardStatsCard";
import BrandLineChart from "@/components/charts/BrandLineChart";
import { TRAFFIC_SOURCE_COLORS } from "@/utils/trafficSourceColors";
import ComparisonChart from "../components/ComparisonChart";
import { CountryPicker } from "../components/CountryPicker";
import { PlaceholderDataIndicator } from "../components/PlaceholderDataIndicator";
import { MarketProvider, useMarketData } from "../contexts/MarketContext";
import { useBigQueryData } from '@/hooks/useBigQueryData';
import { useAsoData } from "../context/AsoDataContext";
import { useComparisonData } from "../hooks/useComparisonData";
import { useKpiData } from "../hooks/useKpiData";
import { Card, CardContent } from "@/components/ui/card";
import { PremiumCard, PremiumCardHeader, PremiumCardContent, PremiumTypography, StatusIndicator } from "@/components/ui/premium";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Database, Filter, TestTube, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BrandedLoadingSpinner } from "@/components/ui/LoadingSkeleton";
import { MetricSelector } from '@/components/charts/MetricSelector';
import { MainLayout } from '@/layouts';
import { ContextualInsightsSidebar, SidebarState } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import { AI_INSIGHTS_ENABLED } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { KPISelector } from '../components/KPISelector';
import { TrafficSourceKpiCards } from '../components/TrafficSourceKpiCards';
import { usePermissions } from '@/hooks/usePermissions';
import { OrganizationSelector } from '@/components/Organization/OrganizationSelector';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { PermissionWrapper } from '@/components/PermissionWrapper';
import DashboardBrandingLine from '@/components/DashboardBrandingLine';
import { KpiDataConsistencyTest } from '@/components/KpiDataConsistencyTest';

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
  const [sidebarState, setSidebarState] = useState<SidebarState>('collapsed');
  
  // Use standardized KPI data hook
  const { kpiData } = useKpiData({
    trafficSourceView: 'all', // Analytics dashboard doesn't filter by traffic source view
    includeDerivedMetrics: false
  });
  
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
  const hasAnyMetrics = kpiData.impressions.value > 0 || kpiData.downloads.value > 0;

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

  // Extract standardized KPI values
  const impressionsValue = kpiData.impressions.value;
  const impressionsDelta = kpiData.impressions.delta;
  const downloadsValue = kpiData.downloads.value;
  const downloadsDelta = kpiData.downloads.delta;
  const pageViewsValue = kpiData.product_page_views.value;
  const pageViewsDelta = kpiData.product_page_views.delta;
  const productPageCvrValue = kpiData.product_page_cvr.value;
  const productPageCvrDelta = kpiData.product_page_cvr.delta;
  const impressionsCvrValue = kpiData.impressions_cvr.value;
  const impressionsCvrDelta = kpiData.impressions_cvr.delta;

  const shouldShowKPI = (kpiId: string) => {
    return selectedKPI === kpiId;
  };

  const visibleKPIs = [selectedKPI];
  // Diagnostics parity (optional)
  if ((import.meta as any).env?.VITE_KPI_DIAGNOSTICS_ENABLED === 'true' && data?.summary) {
    console.debug('[KPI Parity][Analytics]', {
      impressions_dashboard: data.summary.impressions?.value || 0,
      impressions_delta_dashboard: data.summary.impressions?.delta || 0,
    });
  }

  // Dynamic grid calculation - count only visible KPIs
  const visibleKPICount = visibleKPIs.length;
  
  // Generate dynamic grid classes based on actual visible card count
  const getGridClasses = (cardCount: number) => {
    // Mobile: always 2 columns, Tablet: always 3 columns
    // Desktop: match the exact card count (never more than available cards)
    const desktopCols = Math.min(cardCount, 6);
    return `grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-${desktopCols} gap-4`;
  };

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
            {loading && (
              <span className="text-gray-500 text-sm">Loading...</span>
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
        {/* Feature-flagged unified KPI grid */}
        {((import.meta as any).env?.VITE_KPI_CARD_UNIFIED !== 'false') ? (
          <div className={"grid gap-4 flex-1 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]"}>
           {shouldShowKPI('impressions') && (
             <KpiCard label="Impressions" value={impressionsValue} delta={impressionsDelta} mode="regular" />
           )}
           {shouldShowKPI('downloads') && (
             <KpiCard label="Downloads" value={downloadsValue} delta={downloadsDelta} mode="regular" />
           )}
           {shouldShowKPI('product_page_views') && (
             <KpiCard label="Product Page Views" value={pageViewsValue} delta={pageViewsDelta} mode="regular" />
           )}
           {shouldShowKPI('product_page_cvr') && (
             <KpiCard label="Product Page CVR" value={productPageCvrValue} delta={productPageCvrDelta} unit="%" mode="regular" />
           )}
           {shouldShowKPI('impressions_cvr') && (
             <KpiCard label="Impressions CVR" value={impressionsCvrValue} delta={impressionsCvrDelta} unit="%" mode="regular" />
           )}
          </div>
        ) : (
          <div className={`${getGridClasses(visibleKPICount)} flex-1`}>
            {shouldShowKPI('impressions') && (
              <DashboardStatsCard label="Impressions" value={impressionsValue} delta={impressionsDelta} />
            )}
            {shouldShowKPI('downloads') && (
              <DashboardStatsCard label="Downloads" value={downloadsValue} delta={downloadsDelta} />
            )}
            {shouldShowKPI('product_page_views') && (
              <DashboardStatsCard label="Product Page Views" value={pageViewsValue} delta={pageViewsDelta} />
            )}
            {shouldShowKPI('product_page_cvr') && (
              <DashboardStatsCard label="Product Page CVR" value={productPageCvrValue} delta={productPageCvrDelta} variant="percentage" decimals={1} />
            )}
            {shouldShowKPI('impressions_cvr') && (
              <DashboardStatsCard label="Impressions CVR" value={impressionsCvrValue} delta={impressionsCvrDelta} variant="percentage" decimals={1} />
            )}
          </div>
        )}
        
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
        <PremiumCard variant="glow" intensity="strong" glowColor="blue" className="overflow-hidden mb-8">
          <PremiumCardHeader className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
            <PremiumTypography.SectionTitle className="flex items-center gap-3">
              Performance Over Time
              <StatusIndicator status="info" size="sm" />
            </PremiumTypography.SectionTitle>
          </PremiumCardHeader>
          <PremiumCardContent className="p-8">
            {(() => {
              const metric = selectedKPI === 'all' ? 'downloads' : selectedKPI;
              const trafficSourceKeys = [
                { key: 'webReferrer', name: 'Web Referrer' },
                { key: 'appStoreSearch', name: 'App Store Search' },
                { key: 'appReferrer', name: 'App Referrer' },
                { key: 'appleSearchAds', name: 'Apple Search Ads' },
                { key: 'appStoreBrowse', name: 'App Store Browse' },
              ];
              const chartData = (data.trafficSourceTimeseriesData || []).map((point: any) => {
                const row: any = { date: point.date };
                trafficSourceKeys.forEach(({ key }) => {
                  if (metric === 'product_page_cvr') {
                    const downloads = (point as any)[`${key}_downloads`] || 0;
                    const views = (point as any)[`${key}_product_page_views`] || 0;
                    row[key] = views > 0 ? (downloads / views) * 100 : 0;
                  } else if (metric === 'impressions_cvr') {
                    const downloads = (point as any)[`${key}_downloads`] || 0;
                    const impressions = (point as any)[`${key}_impressions`] || 0;
                    row[key] = impressions > 0 ? (downloads / impressions) * 100 : 0;
                  } else {
                    row[key] = (point as any)[`${key}_${metric}`] || 0;
                  }
                });
                return row;
              });
              return (
                <BrandLineChart
                  data={chartData}
                  series={trafficSourceKeys.map(({ key, name }) => ({
                    key,
                    label: name,
                    color: (TRAFFIC_SOURCE_COLORS as any)[name],
                  }))}
                  height={450}
                  tooltipIndicator="dot"
                  showLegend
                />
              );
            })()}
          </PremiumCardContent>
        </PremiumCard>
      )}

      {/* Previous Period Comparison */}
      {!periodComparison.loading &&
        periodComparison.current &&
        periodComparison.previous && (
          <PremiumCard variant="glow" intensity="strong" glowColor="blue" className="overflow-hidden mb-8">
            <PremiumCardHeader className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <PremiumTypography.SectionTitle className="flex items-center gap-3">
                  Previous Period
                  <StatusIndicator status="info" size="sm" />
                </PremiumTypography.SectionTitle>
                <MetricSelector value={selectedMetric} onChange={setSelectedMetric} />
              </div>
            </PremiumCardHeader>
            <PremiumCardContent className="p-8">
              <ComparisonChart
                currentData={periodComparison.current.timeseriesData}
                previousData={periodComparison.previous.timeseriesData}
                title="Previous Period"
                metric={selectedMetric as 'downloads' | 'impressions' | 'product_page_views'}
              />
            </PremiumCardContent>
          </PremiumCard>
        )}

      {/* Previous Year Comparison */}
      {!yearComparison.loading &&
        yearComparison.current &&
        yearComparison.previous && (
          <PremiumCard variant="glow" intensity="strong" glowColor="blue" className="overflow-hidden mb-8">
            <PremiumCardHeader className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
              <PremiumTypography.SectionTitle className="flex items-center gap-3">
                Previous Year
                <StatusIndicator status="info" size="sm" />
              </PremiumTypography.SectionTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-8">
              <ComparisonChart
                currentData={yearComparison.current.timeseriesData}
                previousData={yearComparison.previous.timeseriesData}
                title="Previous Year"
                metric={selectedMetric as 'downloads' | 'impressions' | 'product_page_views'}
              />
            </PremiumCardContent>
          </PremiumCard>
        )}
          </div>
          </div>

          {/* Temporary KPI Consistency Test */}
          <KpiDataConsistencyTest 
            label="Analytics Dashboard"
            trafficSourceView="all"
            includeDerivedMetrics={false}
          />
        </div>

        {/* Sidebar - Pass collapse state */}
        <div className="fixed right-0 top-0 h-full z-10">
          {AI_INSIGHTS_ENABLED && (
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
