
import React, { useState, useEffect, useMemo } from "react";
import { useAsoData } from "../context/AsoDataContext";
import { Skeleton } from "@/components/ui/skeleton";
import TimeSeriesChart from "../components/TimeSeriesChart";
import KpiCard from "../components/KpiCard";
import TrafficSourceSelector from "../components/TrafficSourceSelector";
import { aggregateTrafficSources, trafficSourceGroups } from "@/utils/trafficSourceGroups";
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
import { ContextualInsightsSidebar } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const OverviewPage: React.FC = () => {
  const { data, loading } = useAsoData();
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [trafficSourceView, setTrafficSourceView] = useState<string>('all');

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
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const trafficSourceTimeseries = useMemo(
    () => data?.trafficSourceTimeseriesData || [],
    [data]
  );
  const chartMode = trafficSourceView === 'individual' ? 'breakdown' : 'total';

  const chartData = useMemo(() => {
    if (!data) return [];
    if (trafficSourceView === 'all' || trafficSourceView === 'individual') {
      return data.timeseriesData;
    }
    const group = trafficSourceGroups[trafficSourceView as keyof typeof trafficSourceGroups];
    return aggregateTrafficSources(trafficSourceTimeseries, group);
  }, [data, trafficSourceView, trafficSourceTimeseries]);

  // Show skeleton only on initial load when there's no data yet
  if (loading && !data) {
    return (
      <MainLayout>
        <div className="flex min-h-screen">
          <div className={`flex-1 ${!isMobile ? 'pr-80' : ''}`}>
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
            <ContextualInsightsSidebar
              metricsData={data}
              organizationId={organizationId}
            />
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

  const impressionsValue = data?.summary?.impressions?.value || 0;
  const impressionsDelta = data?.summary?.impressions?.delta || 0;
  const downloadsValue = data?.summary?.downloads?.value || 0;
  const downloadsDelta = data?.summary?.downloads?.delta || 0;
  const pageViewsValue = data?.summary?.product_page_views?.value || 0;
  const pageViewsDelta = data?.summary?.product_page_views?.delta || 0;
  const gridCols = 'xl:grid-cols-3';

  return (
    <MainLayout>
      <div className="flex min-h-screen">
        <div className={`flex-1 ${!isMobile ? 'pr-80' : ''}`}> 
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
                  <TrafficSourceSelector value={trafficSourceView} onChange={setTrafficSourceView} />
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
                    />
                    <KpiCard
                      title="Downloads"
                      value={downloadsValue}
                      delta={downloadsDelta}
                    />
                    <KpiCard
                      title="Product Page Views"
                      value={pageViewsValue}
                      delta={pageViewsDelta}
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
                      <TimeSeriesChart
                        data={chartData}
                        trafficSourceTimeseriesData={trafficSourceTimeseries}
                        mode={chartMode}
                        showModeToggle={false}
                        visibleMetrics={['impressions','downloads','product_page_views']}
                        breakdownMetric="downloads"
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
                        <ResponsiveGrid cols={{ default: 1, md: 4 }} gap="lg">
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
          <ContextualInsightsSidebar
            metricsData={data}
            organizationId={organizationId}
          />
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
