
import React from 'react';
import { ManualInsightsPanel } from './AiInsightsPanel/ManualInsightsPanel';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { MetricsData } from '@/types/aso';

interface AiInsightsPanelProps {
  className?: string;
  metricsData?: MetricsData;
}

export const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({
  className = '',
  metricsData
}) => {
  const { profile } = useUserProfile();

  if (!profile?.organization_id) {
    return null;
  }

  return (
    <ManualInsightsPanel
      className={className}
      organizationId={profile.organization_id}
      metricsData={metricsData}
    />
  );
};
