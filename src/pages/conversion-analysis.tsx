
import React from "react";
import { useAsoData } from "../context/AsoDataContext";
import KpiCard from "../components/KpiCard";
import TimeSeriesChart from "../components/TimeSeriesChart";
import { TrafficSourceSelect } from "../components/Filters";
import useSourceFiltering from "../hooks/useSourceFiltering";
import { DashboardWithSidebar } from '@/components/layouts/DashboardWithSidebar';
import { useProfile } from '@/hooks/useProfile';

const ConversionAnalysisPage: React.FC = () => {
  const { data, loading } = useAsoData();
  const { profile } = useProfile();
  
  const {
    selectedSources,
    setSelectedSources,
    filteredData,
    filteredSources,
    allSourceNames
  } = useSourceFiltering(
    data?.timeseriesData,
    data?.trafficSources
  );

  // Display a loading state when data is being fetched
  if (loading || !data) {
    return (
      <div className="flex flex-col space-y-6">
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
    );
  }

  return (
    <DashboardWithSidebar metricsData={data} organizationId={profile?.organization_id || ''}>
      <div className="flex flex-col space-y-6">
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
            <h2 className="text-xl font-semibold">Conversion Rates Over Time</h2>
            <TrafficSourceSelect 
              selectedSources={selectedSources} 
              onSourceChange={setSelectedSources} 
            />
          </div>
          <TimeSeriesChart data={data.timeseriesData} />
        </section>
        
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">By Traffic Source</h2>
          
          {selectedSources.length === 0 ? (
            <div className="bg-zinc-800 p-8 rounded-md text-center">
              <p className="text-gray-400">No traffic sources selected. Please select at least one source to view data.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {filteredSources.map((source) => (
                  <KpiCard
                    key={source.name}
                    title={source.name}
                    value={source.value}
                    delta={source.delta}
                  />
                ))}
              </div>
              
              <TimeSeriesChart 
                data={filteredData} 
              />
            </>
          )}
        </section>
      </div>
    </DashboardWithSidebar>
  );
};

export default ConversionAnalysisPage;
