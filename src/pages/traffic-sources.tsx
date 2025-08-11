
import React from "react";
import { MainLayout } from "../layouts";
import { useAsoData } from "../context/AsoDataContext";
import KpiCard from "../components/KpiCard";
import TrafficSourceTable from "../components/TrafficSourceTable";

const TrafficSourcesPage: React.FC = () => {
  const { data, loading } = useAsoData();
  // Display skeleton only on initial load when there's no data yet
  if (loading && !data) {
    return (
      <MainLayout>
        <div className="flex flex-col space-y-6">
          <h1 className="text-2xl font-bold">Traffic Sources</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-zinc-800 animate-pulse rounded-md"></div>
            ))}
          </div>
          <div className="h-64 bg-zinc-800 animate-pulse rounded-md"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="relative flex flex-col space-y-6">
        <h1 className="text-2xl font-bold">Traffic Sources</h1>

        {/* Traffic Source KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {data.trafficSources.map((source) => (
            <KpiCard
              key={source.name}
              title={source.name}
              value={source.value}
              delta={source.delta}
            />
          ))}
        </div>

        {/* Traffic Source Table */}
        <div className="overflow-x-auto">
          <TrafficSourceTable data={data.trafficSources} />
        </div>

        {loading && data && (
          <div className="absolute top-4 right-4 bg-white rounded px-3 py-1 shadow-sm border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 animate-spin rounded-full border border-gray-300 border-t-blue-600" />
              <span className="text-sm text-gray-600">Updating...</span>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TrafficSourcesPage;
