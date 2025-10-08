
import React, { useState, useEffect, useMemo } from "react";
import { useAsoData } from "../context/AsoDataContext";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionWrapper } from "@/components/PermissionWrapper";
// Rebuilt chart with centralized design system
import BrandLineChart from "@/components/charts/BrandLineChart";
import { chartColors } from "@/utils/chartConfig";
import { TRAFFIC_SOURCE_COLORS } from "@/utils/trafficSourceColors";
// Unified stats card for dashboard summaries
import KpiCard from "@/components/kpi/KpiCard";
import { MetricCard } from "@/components/ui/design-system/MetricCard";
import DashboardStatsCard from "../components/DashboardStatsCard";
import TrafficSourceSelector from "../components/TrafficSourceSelector";
import {
  aggregateTrafficSources,
  executiveTrafficSourceGroups,
  executiveTrafficSources,
} from "@/utils/executiveTrafficSourceGroups";
import {
  DERIVED_KPI_REGISTRY
} from '@/utils/derivedKPIRegistry';
import {
  DerivedKPICalculator,
  TrafficSourceData,
} from '@/utils/derivedKPICalculator';
import { useDerivedKPIs } from '@/hooks/useDerivedKPIs';
import { useKpiData } from '@/hooks/useKpiData';
import {
  PremiumCard,
  PremiumCardHeader,
  PremiumCardContent,
  PremiumTypography,
  LayoutSection,
  ResponsiveGrid,
  StatusIndicator
} from "@/components/ui/premium";
import { MainLayout } from '@/layouts';
import { ContextualInsightsSidebar, SidebarState } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import { AI_INSIGHTS_ENABLED } from '@/constants/features';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { CountryPicker } from '@/components/CountryPicker';
import { MarketProvider, useMarketData } from '@/contexts/MarketContext';
import { PlaceholderDataIndicator } from '@/components/PlaceholderDataIndicator';
import DashboardBrandingLine from '@/components/DashboardBrandingLine';
import { KpiDataConsistencyTest } from '@/components/KpiDataConsistencyTest';
import { DashboardAiInsights } from '@/components/DashboardAiInsights';

const OverviewContent: React.FC = () => {
  const contextValue = useAsoData(); // NEW: Get demo flag from context
  const { data, loading, error, isDemo } = contextValue;

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
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  const { 
    selectedOrganizationId: superAdminSelectedOrg, 
    setSelectedOrganizationId: setSuperAdminOrg 
  } = useSuperAdmin();
  const { selectedMarket, setSelectedMarket } = useMarketData();
  
  const [profileOrganizationId, setProfileOrganizationId] = useState('');

  // Compute effective organization ID
  const effectiveOrganizationId = useMemo(() => {
    if (isSuperAdmin) {
      return superAdminSelectedOrg || null;
    }
    return profileOrganizationId;
  }, [isSuperAdmin, superAdminSelectedOrg, profileOrganizationId]);
  
  // Remove duplicate useBigQueryData call - isDemo now comes from context
  // const { isDemo } = useBigQueryData(...) - REMOVED
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarState, setSidebarState] = useState<SidebarState>('collapsed');
  const [trafficSourceView, setTrafficSourceView] = useState<string>('all');
  const [selectedSources, setSelectedSources] = useState<string[]>([...executiveTrafficSources]);

  useEffect(() => {
    const fetchOrganizationId = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      setProfileOrganizationId(profile?.organization_id || '');
    };
    fetchOrganizationId();
  }, [user]);

  useEffect(() => {
    if (!effectiveOrganizationId) return;
    const saved = localStorage.getItem(`ai-sidebar-state-${effectiveOrganizationId}`);
    if (saved) {
      setSidebarState(saved as SidebarState);
    }
  }, [effectiveOrganizationId]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSidebarStateChange = (state: SidebarState) => {
    setSidebarState(state);
    if (effectiveOrganizationId) {
      localStorage.setItem(`ai-sidebar-state-${effectiveOrganizationId}`, state);
    }
  };

  const trafficSourceTimeseries = useMemo(
    () => data?.trafficSourceTimeseriesData || [],
    [data]
  );
  const derivedKPIs = useDerivedKPIs(data?.trafficSources || []);
  const trueOrganicSummary = useMemo(
    () => derivedKPIs.find((k) => k.id === 'true-organic-search'),
    [derivedKPIs]
  );

  // Use standardized KPI data hook
  const { kpiData } = useKpiData({
    trafficSourceView,
    includeDerivedMetrics: true
  });

  const trueOrganicTimeseries = useMemo(() => {
    if (!trafficSourceTimeseries.length) return [];
    const def = DERIVED_KPI_REGISTRY['true-organic-search'];
    return trafficSourceTimeseries.map((point) => {
      const sources: TrafficSourceData[] = [
        {
          id: 'App Store Search',
          impressions: point.appStoreSearch_impressions || 0,
          downloads: point.appStoreSearch_downloads || 0,
          product_page_views: point.appStoreSearch_product_page_views || 0,
        },
        {
          id: 'Apple Search Ads',
          impressions: point.appleSearchAds_impressions || 0,
          downloads: point.appleSearchAds_downloads || 0,
          product_page_views: point.appleSearchAds_product_page_views || 0,
        },
      ];
      const calc = DerivedKPICalculator.calculate(def, sources);
      const conversion_rate = calc.metrics.impressions > 0 ? (calc.metrics.downloads / calc.metrics.impressions) * 100 : 0;
      return {
        date: point.date,
        impressions: calc.metrics.impressions || 0,
        downloads: calc.metrics.downloads || 0,
        product_page_views: calc.metrics.product_page_views || 0,
        conversion_rate,
      };
    });
  }, [trafficSourceTimeseries]);
  const chartMode = trafficSourceView === 'individual' ? 'breakdown' : 'total';

  const chartData = useMemo(() => {
    if (!data) return [];
    if (trafficSourceView === 'all' || trafficSourceView === 'individual') {
      return data.timeseriesData;
    }
    if (trafficSourceView === 'true-organic-search') {
      return trueOrganicTimeseries;
    }
    const group = executiveTrafficSourceGroups[
      trafficSourceView as keyof typeof executiveTrafficSourceGroups
    ];
    return aggregateTrafficSources(trafficSourceTimeseries, group);
  }, [data, trafficSourceView, trafficSourceTimeseries, trueOrganicTimeseries]);

  // Show skeleton only on initial load when there's no data yet
  if (loading && !data) {
    console.log('🔧 [Overview Debug] Showing skeleton - Loading:', loading, 'Data:', !!data);
    return (
      <MainLayout>
        <div className="flex min-h-screen">
          <div className={`flex-1 ${!isMobile ? (sidebarState === 'collapsed' ? 'pr-15' : sidebarState === 'expanded' ? 'pr-[60vw]' : 'pr-80') : ''}`}>
            <LayoutSection spacing="md" className="p-6">
              {isMobile && (
                <Button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  variant="outline"
                  size="sm"
                  className="fixed top-4 right-4 z-50"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Insights
                </Button>
              )}
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
            </LayoutSection>
          </div>
          <div
            className={
              isMobile
                ? `fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ${
                    isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'
                  }`
                : 'fixed right-0 top-0 h-full z-10'
            }
          >
            {AI_INSIGHTS_ENABLED && (
              <ContextualInsightsSidebar
                metricsData={data}
                organizationId={effectiveOrganizationId}
                state={sidebarState}
                onStateChange={handleSidebarStateChange}
                isSuperAdmin={isSuperAdmin}
                onOrganizationChange={setSuperAdminOrg}
              />
            )}
          </div>
          {isMobile && isMobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}
        </div>
      </MainLayout>
    );
  }

  const isUpdating = loading && !!data;

  console.log('📊 [Overview Detailed Debug]', {
    loading,
    hasData: !!data,
    dataLength: data?.timeseriesData?.length || 'no timeseries',
    dataStructure: data ? Object.keys(data) : 'no data',
    dataType: typeof data,
    summaryData: data?.summary,
    firstTimeseriesItem: data?.timeseriesData?.[0]
  });

  // 🔧 DEBUG: Check if we should render content
  console.log('🔧 [Overview Render Check]', {
    shouldShowSkeleton: loading && !data,
    hasDataToShow: !!data,
    willRenderMainContent: !loading || !!data,
    impressionsValue: data?.summary?.impressions?.value || 0,
    downloadsValue: data?.summary?.downloads?.value || 0,
    isDemo,
    error: !!error
  });

  // Extract standardized KPI values
  const impressionsValue = kpiData.impressions.value;
  const impressionsDelta = kpiData.impressions.delta;
  const downloadsValue = kpiData.downloads.value;
  const downloadsDelta = kpiData.downloads.delta;
  const pageViewsValue = kpiData.product_page_views.value;
  const pageViewsDelta = kpiData.product_page_views.delta;

  const trueSearchImpressionsValue = kpiData.true_search_impressions?.value || 0;
  const trueSearchDownloadsValue = kpiData.true_search_downloads?.value || 0;

  const appStoreSearchSource = data?.trafficSources?.find(
    (s) => s.name === 'App Store Search'
  );
  const appleSearchAdsSource = data?.trafficSources?.find(
    (s) => s.name === 'Apple Search Ads'
  );

  const computeTrueDelta = (
    appMetric?: { value: number; delta: number },
    asaMetric?: { value: number; delta: number }
  ): number => {
    if (!appMetric || !asaMetric) return 0;
    const prevApp = appMetric.value / (1 + appMetric.delta / 100);
    const prevAsa = asaMetric.value / (1 + asaMetric.delta / 100);
    const current = appMetric.value - asaMetric.value;
    const previous = prevApp - prevAsa;
    if (!isFinite(previous) || previous <= 0) return 0;
    const delta = ((current - previous) / previous) * 100;
    return isFinite(delta) ? delta : 0;
  };

  const trueSearchImpressionsDelta = kpiData.true_search_impressions?.delta || 0;
  const trueSearchDownloadsDelta = kpiData.true_search_downloads?.delta || 0;
  // Dynamic grid calculation based on card count (legacy helper)
  const kpiCards = [
    { label: "Impressions", value: impressionsValue, delta: impressionsDelta },
    { label: "Downloads", value: downloadsValue, delta: downloadsDelta },
    { label: "Product Page Views", value: pageViewsValue, delta: pageViewsDelta },
    { label: "True Search Impressions", value: trueSearchImpressionsValue, delta: trueSearchImpressionsDelta },
    { label: "True Search Downloads", value: trueSearchDownloadsValue, delta: trueSearchDownloadsDelta },
  ];

  // Generate dynamic grid classes based on actual card count
  const getGridClasses = (_cardCount: number) => {
    // Unified responsive grid with min card width 280px
    return 'grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]';
  };

  const summaryCards = data?.summary ? [
    { label: "Total Impressions", value: kpiData.impressions.value, delta: kpiData.impressions.delta },
    { label: "Total Downloads", value: kpiData.downloads.value, delta: kpiData.downloads.delta },
    { label: "Total True Search Impressions", value: trueSearchImpressionsValue, delta: trueSearchImpressionsDelta },
    { label: "Total True Search Downloads", value: trueSearchDownloadsValue, delta: trueSearchDownloadsDelta },
    { label: "Product Page CVR", value: kpiData.product_page_cvr.value, delta: kpiData.product_page_cvr.delta, variant: "percentage" as const, decimals: 1 },
    { label: "Impressions CVR", value: kpiData.impressions_cvr.value, delta: kpiData.impressions_cvr.delta, variant: "percentage" as const, decimals: 1 },
  ] : [];

  const KPI_UNIFIED = (import.meta as any).env?.VITE_KPI_CARD_UNIFIED !== 'false';
  const KPI_DIAG = (import.meta as any).env?.VITE_KPI_DIAGNOSTICS_ENABLED === 'true';
  if (KPI_DIAG && data?.summary) {
    // Simple parity debug for one KPI
    console.debug('[KPI Parity][Exec]', {
      impressions_exec: kpiData.impressions.value,
      impressions_delta_exec: kpiData.impressions.delta,
      impressions_analytics: data.summary.impressions.value,
      impressions_delta_analytics: data.summary.impressions.delta,
    });
  }

  return (
    <MainLayout>
      <div className="flex min-h-screen">
        <div className={`flex-1 ${!isMobile ? (sidebarState === 'collapsed' ? 'pr-15' : sidebarState === 'expanded' ? 'pr-[60vw]' : 'pr-80') : ''}`}>
          <div className="p-6">
            {isMobile && (
              <Button
                onClick={() => setIsMobileSidebarOpen(true)}
                variant="outline"
                size="sm"
                className="fixed top-4 right-4 z-50"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Insights
              </Button>
            )}
            <LayoutSection spacing="md" className="relative">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex flex-col">
                  <div className="flex items-center gap-4">
                    <PremiumTypography.PageTitle gradient="orange" animated>
                      Performance Overview
                    </PremiumTypography.PageTitle>
                  </div>
                  <DashboardBrandingLine />
                </div>

                <div className="flex gap-4">
                  <CountryPicker
                    selectedCountry={selectedMarket}
                    onCountryChange={setSelectedMarket}
                    className="min-w-[200px]"
                  />
                  <TrafficSourceSelector
                    value={trafficSourceView}
                    onChange={setTrafficSourceView}
                    selectedSources={selectedSources}
                    onSelectedSourcesChange={setSelectedSources}
                    availableSources={[...executiveTrafficSources]}
                  />
                  {loading && (
                    <span className="text-gray-500 text-sm">Loading...</span>
                  )}
                </div>
              </div>

              {/* Placeholder Data Indicator */}
              <PlaceholderDataIndicator />

              {data && (
                <div className="flex flex-col space-y-8">

                  {/* KPI Cards Section (Unified or fallback) */}
                  {KPI_UNIFIED ? (
                    <div className={getGridClasses(kpiCards.length)}>
                      {kpiCards.map((card) => {
                        const d = typeof card.delta === 'number' ? card.delta : 0;
                        const trend = d >= 0 ? 'up' as const : 'down' as const;
                        return (
                          <MetricCard
                            key={card.label}
                            title={card.label}
                            value={card.value}
                            change={{ value: Math.abs(Number(d.toFixed(1))), period: 'previous period', trend }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className={getGridClasses(kpiCards.length)}>
                      {kpiCards.map((card) => (
                        <DashboardStatsCard
                          key={card.label}
                          label={card.label}
                          value={card.value}
                          delta={card.delta}
                        />
                      ))}
                    </div>
                  )}

                  {/* AI Insights Section - After KPIs, before Time Series */}
                  <DashboardAiInsights
                    metricsData={data}
                    organizationId={effectiveOrganizationId}
                    isDemoMode={isDemo}
                    isSuperAdmin={isSuperAdmin}
                    filterContext={{
                      dateRange: { start: '30 days ago', end: 'today' },
                      trafficSources: [],
                      selectedApps: []
                    }}
                  />

                  {/* Time Series Chart */}
                  <PremiumCard variant="glow" intensity="strong" glowColor="blue" className="overflow-hidden">
                    <PremiumCardHeader className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
                      <PremiumTypography.SectionTitle className="flex items-center gap-3">
                        Performance Over Time
                        <StatusIndicator status="info" size="sm" />
                      </PremiumTypography.SectionTitle>
                    </PremiumCardHeader>
                  <PremiumCardContent className="p-8">
                      {chartMode === 'total' ? (
                        <BrandLineChart
                          data={chartData as any}
                          series={([
                            ['impressions', 'Impressions', chartColors.impressions],
                            ['downloads', 'Downloads', chartColors.downloads],
                            ['product_page_views', 'Product Page Views', chartColors.product_page_views],
                          ] as const).map(([key, label, color]) => ({ key, label, color }))}
                          height={450}
                          tooltipIndicator="dot"
                          showLegend
                        />
                      ) : (
                        (() => {
                          const keyMap: Record<string, string> = {
                            'App Store Search': 'appStoreSearch',
                            'App Store Browse': 'appStoreBrowse',
                            'App Referrer': 'appReferrer',
                            'Apple Search Ads': 'appleSearchAds',
                            'Web Referrer': 'webReferrer',
                          };
                          const metric = 'downloads' as const;
                          const rows = (trafficSourceTimeseries as any[] || []).map((pt: any) => {
                            const row: any = { date: pt.date };
                            selectedSources.forEach((source) => {
                              const k = keyMap[source] || source;
                              row[k] = pt[`${k}_${metric}`] || 0;
                            });
                            return row;
                          });
                          const series = selectedSources.map((source) => {
                            const k = keyMap[source] || source;
                            return { key: k, label: source, color: (TRAFFIC_SOURCE_COLORS as any)[source] };
                          });
                          return (
                            <BrandLineChart
                              data={rows}
                              series={series}
                              height={450}
                              tooltipIndicator="dot"
                              showLegend
                            />
                          );
                        })()
                      )}
                    </PremiumCardContent>
                  </PremiumCard>

                  {/* Summary Statistics section removed per request */}

                </div>
              )}

              {isUpdating && (
                <div className="absolute top-4 right-4 bg-white rounded px-3 py-1 shadow-sm border">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 animate-spin rounded-full border border-gray-300 border-t-blue-600" />
                    <span className="text-sm text-gray-600">Updating...</span>
                  </div>
                </div>
              )}

              {/* Temporary KPI Consistency Test */}
              <KpiDataConsistencyTest 
                label="Executive Dashboard"
                trafficSourceView={trafficSourceView}
                includeDerivedMetrics={true}
              />

            </LayoutSection>
          </div>
        </div>
        <div
          className={
            isMobile
              ? `fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`
              : 'fixed right-0 top-0 h-full z-10'
          }
        >
          {AI_INSIGHTS_ENABLED && (
            <ContextualInsightsSidebar
              metricsData={data}
              organizationId={effectiveOrganizationId}
              state={sidebarState}
              onStateChange={handleSidebarStateChange}
              isSuperAdmin={isSuperAdmin}
              onOrganizationChange={setSuperAdminOrg}
            />
          )}
        </div>
        {isMobile && isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
      </div>
    </MainLayout>
  );
};

const OverviewPage: React.FC = () => {
  return (
    <MarketProvider>
      <OverviewContent />
    </MarketProvider>
  );
};

export default OverviewPage;
