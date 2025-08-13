
import React, { useState, useEffect } from "react";
import { useAsoData } from "../context/AsoDataContext";
import KpiCard from "../components/KpiCard";
import TimeSeriesChart from "../components/TimeSeriesChart";
import { TrafficSourceSelect } from "../components/Filters";
import ConversionRateByTrafficSourceChart from "../components/ConversionRateByTrafficSourceChart";
import TrafficSourceConversionCard from "../components/TrafficSourceConversionCard";
import { MainLayout } from '@/layouts';
import { ContextualInsightsSidebar } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ConversionAnalysisPage: React.FC = () => {
  const { data, loading } = useAsoData();
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const trafficSources = data?.trafficSources || [];
  const filteredSources = selectedSources.length > 0 
    ? trafficSources.filter(source => selectedSources.includes(source.name))
    : trafficSources;

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

  // Display a loading state when data is being fetched
  if (loading || !data) {
    return (
      <MainLayout>
        <div className="flex min-h-screen">
          <div className={`flex-1 ${!isMobile ? 'pr-80' : ''}`}> 
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

  return (
    <MainLayout>
      <div className="flex min-h-screen">
        <div className={`flex-1 ${!isMobile ? 'pr-80' : ''}`}> 
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
                </div>
                <div className="w-64">
                  <KpiCard
                    title="Impressions CVR"
                    value={data.summary.impressions_cvr.value}
                    delta={data.summary.impressions_cvr.delta}
                    isPercentage
                  />
                </div>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                <h2 className="text-xl font-semibold">Conversion Rate by Traffic Source</h2>
                <TrafficSourceSelect
                  selectedSources={selectedSources}
                  onSourceChange={setSelectedSources}
                />
              </div>
              <ConversionRateByTrafficSourceChart data={filteredSources} />
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold mb-4">By Traffic Source</h2>

              {filteredSources.length === 0 ? (
                <div className="bg-zinc-800 p-8 rounded-md text-center">
                  <p className="text-gray-400">No traffic source data available.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                    {filteredSources.map((source) => (
                      <TrafficSourceConversionCard key={source.name} source={source} />
                    ))}
                  </div>

                  <TimeSeriesChart data={data.timeseriesData} />
                </>
              )}
            </section>
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

export default ConversionAnalysisPage;
