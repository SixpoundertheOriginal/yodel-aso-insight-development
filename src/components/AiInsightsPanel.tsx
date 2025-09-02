
import React from 'react';
import { ManualInsightsPanel } from './AiInsightsPanel/ManualInsightsPanel';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSuperAdmin } from '@/context/SuperAdminContext';
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
  const { isSuperAdmin, selectedOrganizationId } = useSuperAdmin();

  const organizationId = isSuperAdmin ? selectedOrganizationId : profile?.organization_id;
  if (!organizationId) {
    return null;
  }

  return (
    <ManualInsightsPanel
      className={className}
      organizationId={organizationId}
      metricsData={metricsData}
    />
  );
};
