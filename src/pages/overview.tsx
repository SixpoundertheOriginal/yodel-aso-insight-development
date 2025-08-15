
import React, { useState, useEffect, useMemo } from "react";
import { useAsoData } from "../context/AsoDataContext";
import { Skeleton } from "@/components/ui/skeleton";
import ExecutiveTimeSeriesChart from "../components/ExecutiveTimeSeriesChart";
import KpiCard from "../components/KpiCard";
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
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';

const OverviewPage: React.FC = () => {
  const { data, loading } = useAsoData();
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  const [organizationId, setOrganizationId] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarState, setSidebarState] = useState<SidebarState>('normal');
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
      setOrganizationId(profile?.organization_id || '');
    };
    fetchOrganizationId();
  }, [user]);

  useEffect(() => {
    if (!organizationId) return;
    const saved = localStorage.getItem(`ai-sidebar-state-${organizationId}`);
    if (saved) {
      setSidebarState(saved as SidebarState);
    }
  }, [organizationId]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSidebarStateChange = (state: SidebarState) => {
    setSidebarState(state);
    if (organizationId) {
      localStorage.setItem(`ai-sidebar-state-${organizationId}`, state);
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
            {!permissionsLoading && (
              <ContextualInsightsSidebar
                metricsData={data}
                organizationId={organizationId}
                state={sidebarState}
                onStateChange={handleSidebarStateChange}
                isSuperAdmin={isSuperAdmin}
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

  const impressionsValue =
    trafficSourceView === 'true-organic-search'
      ? trueOrganicSummary?.metrics.impressions || 0
      : data?.summary?.impressions?.value || 0;
  const impressionsDelta =
    trafficSourceView === 'true-organic-search'
      ? 0
      : data?.summary?.impressions?.delta || 0;
  const downloadsValue =
    trafficSourceView === 'true-organic-search'
      ? trueOrganicSummary?.metrics.downloads || 0
      : data?.summary?.downloads?.value || 0;
  const downloadsDelta =
    trafficSourceView === 'true-organic-search'
      ? 0
      : data?.summary?.downloads?.delta || 0;
  const pageViewsValue =
    trafficSourceView === 'true-organic-search'
      ? trueOrganicSummary?.metrics.product_page_views || 0
      : data?.summary?.product_page_views?.value || 0;
  const pageViewsDelta =
    trafficSourceView === 'true-organic-search'
      ? 0
      : data?.summary?.product_page_views?.delta || 0;

  const trueSearchImpressionsValue =
    trueOrganicSummary?.metrics.impressions || 0;
  const trueSearchDownloadsValue =
    trueOrganicSummary?.metrics.downloads || 0;

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

  const trueSearchImpressionsDelta = computeTrueDelta(
    appStoreSearchSource?.metrics.impressions,
    appleSearchAdsSource?.metrics.impressions
  );
  const trueSearchDownloadsDelta = computeTrueDelta(
    appStoreSearchSource?.metrics.downloads,
    appleSearchAdsSource?.metrics.downloads
  );
  const gridCols = 'xl:grid-cols-5';

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
                <PremiumTypography.PageTitle gradient="orange" animated>
                  Performance Overview
                </PremiumTypography.PageTitle>

                <div className="flex gap-4">
                  <TrafficSourceSelector
                    value={trafficSourceView}
                    onChange={setTrafficSourceView}
                    selectedSources={selectedSources}
                    onSelectedSourcesChange={setSelectedSources}
                    availableSources={[...executiveTrafficSources]}
                  />
                  <StatusIndicator status="success" pulse label="Live Data" />
                </div>
              </div>

              {data && (
                <div className="flex flex-col space-y-8">

                  {/* KPI Cards Section */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${gridCols} gap-6 flex-1`}>
                    <KpiCard
                      title="Impressions"
                      value={impressionsValue}
                      delta={impressionsDelta}
                      className="bg-zinc-800 border border-zinc-700"
                    />
                    <KpiCard
                      title="Downloads"
                      value={downloadsValue}
                      delta={downloadsDelta}
                      className="bg-zinc-800 border border-zinc-700"
                    />
                    <KpiCard
                      title="Product Page Views"
                      value={pageViewsValue}
                      delta={pageViewsDelta}
                      className="bg-zinc-800 border border-zinc-700"
                    />
                    <KpiCard
                      title="True Search Impressions"
                      value={trueSearchImpressionsValue}
                      delta={trueSearchImpressionsDelta}
                      className="bg-zinc-800 border border-zinc-700"
                    />
                    <KpiCard
                      title="True Search Downloads"
                      value={trueSearchDownloadsValue}
                      delta={trueSearchDownloadsDelta}
                      className="bg-zinc-800 border border-zinc-700"
                    />
                  </div>

                  {/* Time Series Chart */}
                  <PremiumCard variant="glow" intensity="strong" glowColor="blue" className="overflow-hidden">
                    <PremiumCardHeader className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
                      <PremiumTypography.SectionTitle className="flex items-center gap-3">
                        Performance Over Time
                        <StatusIndicator status="info" size="sm" />
                      </PremiumTypography.SectionTitle>
                    </PremiumCardHeader>
                    <PremiumCardContent className="p-8">
                      <ExecutiveTimeSeriesChart
                        data={chartData}
                        trafficSourceTimeseriesData={trafficSourceTimeseries as any}
                        mode={chartMode}
                        showModeToggle={false}
                        visibleMetrics={['impressions','downloads','product_page_views']}
                        breakdownMetric="downloads"
                        selectedTrafficSources={selectedSources}
                      />
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
                        <ResponsiveGrid cols={{ default: 1, md: 3, lg: 6 }} gap="lg">
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
                            <PremiumTypography.DataLabel className="mb-3 block">Total True Search Impressions</PremiumTypography.DataLabel>
                            <PremiumTypography.MetricValue className="group-hover:text-blue-400 transition-colors">
                              {trueSearchImpressionsValue.toLocaleString()}
                            </PremiumTypography.MetricValue>
                          </div>
                          <div className="text-center group">
                            <PremiumTypography.DataLabel className="mb-3 block">Total True Search Downloads</PremiumTypography.DataLabel>
                            <PremiumTypography.MetricValue className="group-hover:text-emerald-400 transition-colors">
                              {trueSearchDownloadsValue.toLocaleString()}
                            </PremiumTypography.MetricValue>
                          </div>
                          <div className="text-center group">
                            <PremiumTypography.DataLabel className="mb-3 block">Product Page CVR</PremiumTypography.DataLabel>
                            <PremiumTypography.MetricValue className="text-orange-500 group-hover:text-orange-400 transition-colors">
                              {(data.summary.product_page_cvr ? data.summary.product_page_cvr.value : 0).toFixed(2)}%
                            </PremiumTypography.MetricValue>
                          </div>
                          <div className="text-center group">
                            <PremiumTypography.DataLabel className="mb-3 block">Impressions CVR</PremiumTypography.DataLabel>
                            <PremiumTypography.MetricValue className="text-orange-500 group-hover:text-orange-400 transition-colors">
                              {(data.summary.impressions_cvr ? data.summary.impressions_cvr.value : 0).toFixed(2)}%
                            </PremiumTypography.MetricValue>
                          </div>
                        </ResponsiveGrid>
                      </PremiumCardContent>
                    </PremiumCard>
                  )}

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
          {!permissionsLoading && (
            <ContextualInsightsSidebar
              metricsData={data}
              organizationId={organizationId}
              state={sidebarState}
              onStateChange={handleSidebarStateChange}
              isSuperAdmin={isSuperAdmin}
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

export default OverviewPage;
