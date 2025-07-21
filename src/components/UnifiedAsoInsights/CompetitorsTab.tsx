
import React from 'react';
import { useUnifiedAso } from '@/context/UnifiedAsoContext';
import { CompetitiveKeywordAnalysis } from '@/components/AppAudit/CompetitiveKeywordAnalysis';

export const CompetitorsTab: React.FC = () => {
  const { analysis, isLoading } = useUnifiedAso();

  return (
    <CompetitiveKeywordAnalysis
      competitorData={analysis.auditData?.competitorAnalysis || []}
      userKeywords={analysis.auditData?.currentKeywords || []}
      isLoading={isLoading}
    />
  );
};
