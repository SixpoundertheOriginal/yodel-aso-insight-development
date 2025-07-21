
import React from 'react';
import { useUnifiedAso } from '@/context/UnifiedAsoContext';
import { RankDistributionChart } from '@/components/KeywordIntelligence/RankDistributionChart';
import { KeywordClustersPanel } from '@/components/KeywordIntelligence/KeywordClustersPanel';

export const OverviewTab: React.FC = () => {
  const { analysis, isLoading } = useUnifiedAso();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RankDistributionChart 
        data={analysis.rankDistribution} 
        isLoading={isLoading}
      />
      <KeywordClustersPanel
        clusters={analysis.clusters || []}
        isLoading={isLoading}
        detailed={true}
      />
    </div>
  );
};
