import React, { useMemo, useEffect } from 'react';
import CategorySelector from '@/components/CategorySelector';
import ComparisonCard from './ComparisonCard';
import BenchmarkComparisonChart from './BenchmarkComparisonChart';
import type { AsoData } from '@/hooks/useMockAsoData';

interface BenchmarkAnalysisTabProps {
  clientData: AsoData;
  benchmarkData: any;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  availableCategories: string[];
}

const BenchmarkAnalysisTab: React.FC<BenchmarkAnalysisTabProps> = ({
  clientData,
  benchmarkData,
  selectedCategory,
  onCategoryChange,
  availableCategories,
}) => {
  console.log('Benchmark Debug:', {
    selectedCategory,
    benchmarkData,
    availableCategories: availableCategories.length,
  });

  useEffect(() => {
    console.log('Benchmark data changed:', benchmarkData);
  }, [benchmarkData]);
  const clientMetrics = useMemo(() => {
    if (!clientData?.summary) return null;
    return {
      product_page_cvr: clientData.summary.product_page_cvr?.value || 0,
      impressions_cvr: clientData.summary.impressions_cvr?.value || 0,
      product_page_cvr_delta: clientData.summary.product_page_cvr?.delta || 0,
      impressions_cvr_delta: clientData.summary.impressions_cvr?.delta || 0,
    };
  }, [clientData]);

  return (
    <div className="space-y-6">
      <CategorySelector
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
        availableCategories={availableCategories}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ComparisonCard
          title="Product Page CVR"
          clientValue={clientMetrics?.product_page_cvr ?? 0}
          benchmarkValue={benchmarkData?.page_views_to_installs ?? 0}
          clientDelta={clientMetrics?.product_page_cvr_delta ?? 0}
        />

        <ComparisonCard
          title="Impressions CVR"
          clientValue={clientMetrics?.impressions_cvr ?? 0}
          benchmarkValue={benchmarkData?.impressions_to_page_views ?? 0}
          clientDelta={clientMetrics?.impressions_cvr_delta ?? 0}
        />
      </div>

      <BenchmarkComparisonChart
        timeseriesData={clientData?.timeseriesData ?? []}
        benchmarkValue={benchmarkData?.page_views_to_installs ?? 0}
      />
    </div>
  );
};

export default BenchmarkAnalysisTab;
