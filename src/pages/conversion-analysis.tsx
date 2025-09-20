
import React, { useState, useEffect, useMemo } from "react";
import { useAsoData } from "../context/AsoDataContext";
import KpiCard from "@/components/kpi/KpiCard";
import DashboardStatsCard from "../components/DashboardStatsCard";
import TimeSeriesChart from "../components/TimeSeriesChart";
import { TrafficSourceSelect } from "../components/Filters";
import CVRTypeToggle from "../components/CVRTypeToggle";
import ConversionRateChart from "../components/ConversionRateChart";
import TrafficSourceCVRCard from "../components/TrafficSourceCVRCard";
import { processTrafficSourceCVR, CVRType } from "../utils/processTrafficSourceCVR";
import { MainLayout } from '@/layouts';
import { ContextualInsightsSidebar, SidebarState } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import { AI_INSIGHTS_ENABLED } from '@/constants/features';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import CategorySelector from '@/components/CategorySelector';
import BenchmarkIndicator from '@/components/BenchmarkIndicator';
import { useBenchmarkData } from '../hooks/useBenchmarkData';
import BenchmarkAnalysisTab from '@/components/BenchmarkAnalysis/BenchmarkAnalysisTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { CountryPicker } from '@/components/CountryPicker';
import { MarketProvider, useMarketData } from '@/contexts/MarketContext';
import { PlaceholderDataIndicator } from '@/components/PlaceholderDataIndicator';
import { useBigQueryData } from '@/hooks/useBigQueryData';
import DashboardBrandingLine from '@/components/DashboardBrandingLine';
import BrandLineChart from "@/components/charts/BrandLineChart";
import { PremiumCard, PremiumCardHeader, PremiumCardContent, PremiumTypography, StatusIndicator } from "@/components/ui/premium";
import { TRAFFIC_SOURCE_COLORS } from "@/utils/trafficSourceColors";

const ConversionAnalysisContent: React.FC = () => {
  const asoContext = useAsoData();
  const { data, loading, error } = asoContext;
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  const { selectedMarket, setSelectedMarket } = useMarketData();
  
  const [organizationId, setOrganizationId] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarState, setSidebarState] = useState<SidebarState>('collapsed');
  
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [cvrType, setCvrType] = useState<CVRType>('impression');
  const [selectedCategory, setSelectedCategory] = useState<string>('Photo & Video');
  const [activeTab, setActiveTab] = useState<'performance' | 'benchmark'>('performance');

  // Get demo state from BigQuery data hook using real organizationId
  const { isDemo } = useBigQueryData(
    organizationId,
    { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() },
    [],
    !!organizationId // Only fetch when organizationId is available
  );

  console.log('🔍 DEMO AUDIT [UI-1]: Component render');
  console.log('🔍 DEMO AUDIT [UI-1]: Component isDemo:', isDemo);
  console.log('🔍 DEMO AUDIT [UI-1]: Loading state:', loading);
  console.log('🔍 DEMO AUDIT [UI-1]: Error state:', !!error);
  console.log('🔍 DEMO AUDIT [UI-1]: Render decision:',
    loading ? 'LOADING' : error ? 'ERROR' : isDemo ? 'DEMO_BADGE' : 'REAL_TIME'
  );
  console.log('🔍 DEMO AUDIT [TYPES]: isDemo type:', typeof isDemo);
  console.log('🔍 DEMO AUDIT [TYPES]: isDemo value:', isDemo);
  console.log('🔍 DEMO AUDIT [TYPES]: Context type keys:', Object.keys(asoContext));

  const trafficSources = data?.trafficSources || [];
  const filteredSources = selectedSources.length > 0
    ? trafficSources.filter(source => selectedSources.includes(source.name))
    : trafficSources;

  const processedSources = useMemo(
    () => processTrafficSourceCVR(filteredSources, cvrType),
    [filteredSources, cvrType]
  );

  const cvrChartData = useMemo(() => {
    return (data?.cvrTimeSeries || []).map((item) => ({
      date: item.date,
      webReferrer_cvr:
        cvrType === 'impression'
          ? item.webReferrer_impression_cvr
          : item.webReferrer_product_page_cvr,
      other_cvr:
        cvrType === 'impression'
          ? item.other_impression_cvr
          : item.other_product_page_cvr,
      appleSearchAds_cvr:
        cvrType === 'impression'
          ? item.appleSearchAds_impression_cvr
          : item.appleSearchAds_product_page_cvr,
      appStoreSearch_cvr:
        cvrType === 'impression'
          ? item.appStoreSearch_impression_cvr
          : item.appStoreSearch_product_page_cvr,
      appStoreBrowse_cvr:
        cvrType === 'impression'
          ? item.appStoreBrowse_impression_cvr
          : item.appStoreBrowse_product_page_cvr,
    }));
  }, [data?.cvrTimeSeries, cvrType]);

  // Diagnostics parity (optional)
  if ((import.meta as any).env?.VITE_KPI_DIAGNOSTICS_ENABLED === 'true' && data?.summary) {
    console.debug('[KPI Parity][CR]', {
      product_page_cvr: data.summary.product_page_cvr.value,
      product_page_cvr_delta: data.summary.product_page_cvr.delta,
      impressions_cvr: data.summary.impressions_cvr.value,
      impressions_cvr_delta: data.summary.impressions_cvr.delta,
    });
  }

  const { data: benchmarkData, availableCategories } = useBenchmarkData(
    selectedCategory
  );
  const KPI_UNIFIED = (import.meta as any).env?.VITE_KPI_CARD_UNIFIED !== 'false';

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

  // Display a loading state when data is being fetched
  if (loading || !data) {
    return (
      <MainLayout>
        <div className="flex min-h-screen">
          <div className={`flex-1 ${!isMobile ? (sidebarState === 'collapsed' ? 'pr-15' : sidebarState === 'expanded' ? 'pr-[60vw]' : 'pr-80') : ''}`}>
            <div className="p-6 flex flex-col space-y-6">
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
              <h1 className="text-2xl font-bold">Conversion Analysis</h1>
              <div className="flex justify-center">
                <div className="w-64 h-32 bg-zinc-800 animate-pulse rounded-md"></div>
              </div>
              <div className="h-64 bg-zinc-800 animate-pulse rounded-md"></div>
              <h2 className="text-xl font-semibold mt-6">By Traffic Source</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-zinc-800 animate-pulse rounded-md"></div>
                ))}
              </div>
              <div className="h-64 bg-zinc-800 animate-pulse rounded-md"></div>
            </div>
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

  return (
    <MainLayout>
      <div className="flex min-h-screen">
        <div className={`flex-1 ${!isMobile ? (sidebarState === 'collapsed' ? 'pr-15' : sidebarState === 'expanded' ? 'pr-[60vw]' : 'pr-80') : ''}`}>
          <div className="p-6 flex flex-col space-y-6">
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
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as 'performance' | 'benchmark')
              }
            >
              <TabsList className="mb-4">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="benchmark">Benchmark Analysis</TabsTrigger>
              </TabsList>
              <TabsContent value="performance" className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-4">
                      <h1 className="text-2xl font-bold">Conversion Analysis</h1>
                      <CategorySelector
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        availableCategories={availableCategories}
                      />
                    </div>
                    <DashboardBrandingLine />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <CountryPicker 
                      selectedCountry={selectedMarket}
                      onCountryChange={setSelectedMarket}
                      className="min-w-[200px]"
                    />
                    {loading && (
                      <span className="text-gray-500 text-sm">Loading...</span>
                    )}
                  </div>
                </div>

                {/* Placeholder Data Indicator */}
                <PlaceholderDataIndicator />

                {/* Cumulative Section */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">Cumulative</h2>
                  {KPI_UNIFIED ? (
                    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                      <div>
                        <button
                          type="button"
                          onClick={() => setCvrType('productpage')}
                          aria-pressed={cvrType === 'productpage'}
                          className="w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                        >
                          <PremiumCard variant="glass" intensity="medium" className={`${cvrType === 'productpage' ? 'border-teal-500/60 bg-teal-500/5 ring-1 ring-teal-500/30' : 'hover:border-teal-500/30 hover:bg-teal-500/5 transition-colors'}`}>
                            <PremiumCardHeader className="bg-zinc-900/60 border-b border-zinc-800/40">
                              <PremiumTypography.SectionTitle>Product Page CVR</PremiumTypography.SectionTitle>
                            </PremiumCardHeader>
                            <PremiumCardContent className="p-5">
                              {(() => {
                                const value = data.summary.product_page_cvr.value;
                                const delta = data.summary.product_page_cvr.delta;
                                const up = delta >= 0;
                                const deltaColor = up ? 'text-emerald-400' : 'text-red-400';
                                const deltaBg = up ? 'bg-emerald-400/15 border-emerald-400/30' : 'bg-red-400/15 border-red-400/30';
                                const arrow = up ? '↗' : '↘';
                                const sign = up ? '+' : '';
                                return (
                                  <div className="flex items-end gap-3">
                                    <div className="text-3xl font-semibold text-foreground">{value.toFixed(1)}%</div>
                                    <span className={`text-xs px-2 py-0.5 rounded border ${deltaBg} ${deltaColor}`}>{sign}{delta.toFixed(1)}% {arrow}</span>
                                  </div>
                                );
                              })()}
                              {benchmarkData && (
                                <div className="mt-3">
                                  <BenchmarkIndicator
                                    clientValue={data.summary.product_page_cvr.value}
                                    benchmarkValue={benchmarkData.page_views_to_installs}
                                  />
                                </div>
                              )}
                            </PremiumCardContent>
                          </PremiumCard>
                        </button>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => setCvrType('impression')}
                          aria-pressed={cvrType === 'impression'}
                          className="w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                        >
                          <PremiumCard variant="glass" intensity="medium" className={`${cvrType === 'impression' ? 'border-teal-500/60 bg-teal-500/5 ring-1 ring-teal-500/30' : 'hover:border-teal-500/30 hover:bg-teal-500/5 transition-colors'}`}>
                            <PremiumCardHeader className="bg-zinc-900/60 border-b border-zinc-800/40">
                              <PremiumTypography.SectionTitle>Impressions CVR</PremiumTypography.SectionTitle>
                            </PremiumCardHeader>
                            <PremiumCardContent className="p-5">
                              {(() => {
                                const value = data.summary.impressions_cvr.value;
                                const delta = data.summary.impressions_cvr.delta;
                                const up = delta >= 0;
                                const deltaColor = up ? 'text-emerald-400' : 'text-red-400';
                                const deltaBg = up ? 'bg-emerald-400/15 border-emerald-400/30' : 'bg-red-400/15 border-red-400/30';
                                const arrow = up ? '↗' : '↘';
                                const sign = up ? '+' : '';
                                return (
                                  <div className="flex items-end gap-3">
                                    <div className="text-3xl font-semibold text-foreground">{value.toFixed(1)}%</div>
                                    <span className={`text-xs px-2 py-0.5 rounded border ${deltaBg} ${deltaColor}`}>{sign}{delta.toFixed(1)}% {arrow}</span>
                                  </div>
                                );
                              })()}
                              {benchmarkData && (
                                <div className="mt-3">
                                  <BenchmarkIndicator
                                    clientValue={data.summary.impressions_cvr.value}
                                    benchmarkValue={benchmarkData.impressions_to_page_views}
                                  />
                                </div>
                              )}
                            </PremiumCardContent>
                          </PremiumCard>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                      <div>
                        <DashboardStatsCard label="Product Page CVR" value={data.summary.product_page_cvr.value} delta={data.summary.product_page_cvr.delta} variant="percentage" decimals={1} />
                        {benchmarkData && (
                          <BenchmarkIndicator clientValue={data.summary.product_page_cvr.value} benchmarkValue={benchmarkData.page_views_to_installs} />
                        )}
                      </div>
                      <div>
                        <DashboardStatsCard label="Impressions CVR" value={data.summary.impressions_cvr.value} delta={data.summary.impressions_cvr.delta} variant="percentage" decimals={1} />
                        {benchmarkData && (
                          <BenchmarkIndicator clientValue={data.summary.impressions_cvr.value} benchmarkValue={benchmarkData.impressions_to_page_views} />
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <CVRTypeToggle currentType={cvrType} onTypeChange={setCvrType} />

                <section className="mt-4">
                  <PremiumCard variant="glow" intensity="strong" glowColor="blue" className="overflow-hidden">
                    <PremiumCardHeader className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <PremiumTypography.SectionTitle className="flex items-center gap-3">
                          Conversion Rate by Traffic Source
                          <StatusIndicator status="info" size="sm" />
                        </PremiumTypography.SectionTitle>
                        <TrafficSourceSelect
                          selectedSources={selectedSources}
                          onSourceChange={setSelectedSources}
                        />
                      </div>
                    </PremiumCardHeader>
                    <PremiumCardContent className="p-6">
                      <ConversionRateChart data={processedSources} cvrType={cvrType} />
                    </PremiumCardContent>
                  </PremiumCard>
                </section>

                <section className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">By Traffic Source</h2>

                  {processedSources.length === 0 ? (
                    <div className="bg-zinc-800 p-8 rounded-md text-center">
                      <p className="text-gray-400">No traffic source data available.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                        {processedSources.map((source) => (
                          <TrafficSourceCVRCard key={source.trafficSource} data={source} />
                        ))}
                      </div>

                      <PremiumCard variant="glow" intensity="strong" glowColor="blue" className="overflow-hidden">
                        <PremiumCardHeader className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
                          <PremiumTypography.SectionTitle className="flex items-center gap-3">
                            CVR Over Time (By Source)
                            <StatusIndicator status="info" size="sm" />
                          </PremiumTypography.SectionTitle>
                        </PremiumCardHeader>
                        <PremiumCardContent className="p-6">
                          {(() => {
                            const allSeries = [
                              { key: 'webReferrer_cvr', label: 'Web Referrer' },
                              { key: 'appStoreSearch_cvr', label: 'App Store Search' },
                              { key: 'appleSearchAds_cvr', label: 'Apple Search Ads' },
                              { key: 'appStoreBrowse_cvr', label: 'App Store Browse' },
                              { key: 'other_cvr', label: 'Other' },
                            ];
                            const labelToKey: Record<string, string> = {
                              'Web Referrer': 'webReferrer_cvr',
                              'App Store Search': 'appStoreSearch_cvr',
                              'Apple Search Ads': 'appleSearchAds_cvr',
                              'App Store Browse': 'appStoreBrowse_cvr',
                              'Other': 'other_cvr',
                            };
                            const activeSeries = (selectedSources.length > 0
                              ? allSeries.filter(s => selectedSources.includes(s.label))
                              : allSeries
                            ).map(s => ({
                              key: s.key,
                              label: s.label,
                              color: (TRAFFIC_SOURCE_COLORS as any)[s.label] || '#9e9e9e',
                            }));
                            return (
                              <BrandLineChart
                                data={cvrChartData as any}
                                series={activeSeries}
                                height={450}
                                tooltipIndicator="dot"
                                showLegend
                              />
                            );
                          })()}
                        </PremiumCardContent>
                      </PremiumCard>
                    </>
                  )}
                </section>
              </TabsContent>
              <TabsContent value="benchmark">
                <BenchmarkAnalysisTab
                  clientData={data}
                  benchmarkData={benchmarkData}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  availableCategories={availableCategories}
                />
              </TabsContent>
            </Tabs>
          </div>
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

const ConversionAnalysisPage: React.FC = () => {
  return (
    <MarketProvider>
      <ConversionAnalysisContent />
    </MarketProvider>
  );
};

export default ConversionAnalysisPage;
