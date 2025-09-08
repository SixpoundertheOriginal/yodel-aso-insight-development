
import React, { useState, useEffect, useMemo } from "react";
import { useAsoData } from "../context/AsoDataContext";
import KpiCard from "../components/KpiCard";
import TimeSeriesChart from "../components/TimeSeriesChart";
import { TrafficSourceSelect } from "../components/Filters";
import CVRTypeToggle from "../components/CVRTypeToggle";
import ConversionRateChart from "../components/ConversionRateChart";
import TrafficSourceCVRCard from "../components/TrafficSourceCVRCard";
import { processTrafficSourceCVR, CVRType } from "../utils/processTrafficSourceCVR";
import { MainLayout } from '@/layouts';
import { ContextualInsightsSidebar, SidebarState } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
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
import { DemoDataBadge, DemoDataInlineBadge, DemoDataBanner } from '@/components/DemoDataBadge';
import { useBigQueryData } from '@/hooks/useBigQueryData';

const ConversionAnalysisContent: React.FC = () => {
  const { data, loading } = useAsoData();
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  const { selectedMarket, setSelectedMarket } = useMarketData();
  
  const [organizationId, setOrganizationId] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarState, setSidebarState] = useState<SidebarState>('normal');
  
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

  const { data: benchmarkData, availableCategories } = useBenchmarkData(
    selectedCategory
  );

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
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">Conversion Analysis</h1>
                    <DemoDataBadge isDemo={isDemo} />
                    <CategorySelector
                      selectedCategory={selectedCategory}
                      onCategoryChange={setSelectedCategory}
                      availableCategories={availableCategories}
                    />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <CountryPicker 
                      selectedCountry={selectedMarket}
                      onCountryChange={setSelectedMarket}
                      className="min-w-[200px]"
                    />
                  </div>
                </div>
                
                {/* Placeholder Data Indicator */}
                <PlaceholderDataIndicator />
                
                {/* Demo Data Banner */}
                <DemoDataBanner isDemo={isDemo} />

                {/* Cumulative Section */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">Cumulative</h2>
                  <div className="flex justify-center gap-4">
                    <div className="w-64">
                      <KpiCard
                        title="Product Page CVR"
                        value={data.summary.product_page_cvr.value}
                        delta={data.summary.product_page_cvr.delta}
                        isPercentage
                      />
                      {benchmarkData && (
                        <BenchmarkIndicator
                          clientValue={data.summary.product_page_cvr.value}
                          benchmarkValue={benchmarkData.page_views_to_installs}
                        />
                      )}
                    </div>
                    <div className="w-64">
                      <KpiCard
                        title="Impressions CVR"
                        value={data.summary.impressions_cvr.value}
                        delta={data.summary.impressions_cvr.delta}
                        isPercentage
                      />
                      {benchmarkData && (
                        <BenchmarkIndicator
                          clientValue={data.summary.impressions_cvr.value}
                          benchmarkValue={benchmarkData.impressions_to_page_views}
                        />
                      )}
                    </div>
                  </div>
                </section>

                <CVRTypeToggle currentType={cvrType} onTypeChange={setCvrType} />

                <section className="mt-4">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                    <h2 className="text-xl font-semibold">Conversion Rate by Traffic Source</h2>
                    <TrafficSourceSelect
                      selectedSources={selectedSources}
                      onSourceChange={setSelectedSources}
                    />
                  </div>
                  <ConversionRateChart data={processedSources} cvrType={cvrType} />
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

                      <TimeSeriesChart
                        data={data.timeseriesData}
                        trafficSourceTimeseriesData={cvrChartData as any}
                        mode="breakdown"
                        showModeToggle={false}
                        breakdownMetric="cvr"
                      />
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

const ConversionAnalysisPage: React.FC = () => {
  return (
    <MarketProvider>
      <ConversionAnalysisContent />
    </MarketProvider>
  );
};

export default ConversionAnalysisPage;
