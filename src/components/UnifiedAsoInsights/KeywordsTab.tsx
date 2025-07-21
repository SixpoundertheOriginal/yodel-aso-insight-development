
import React from 'react';
import { useUnifiedAso } from '@/context/UnifiedAsoContext';
import { KeywordTrendsTable } from '@/components/KeywordIntelligence/KeywordTrendsTable';

export const KeywordsTab: React.FC = () => {
  const { analysis, isLoading } = useUnifiedAso();

  return (
    <KeywordTrendsTable
      trends={analysis.auditData?.keywordTrends || []}
      isLoading={isLoading}
      onTimeframeChange={() => {}}
      selectedTimeframe={30}
    />
  );
};
