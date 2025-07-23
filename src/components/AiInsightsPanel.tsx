
import React from 'react';
import { ManualInsightsPanel } from './AiInsightsPanel/ManualInsightsPanel';
import { useUserProfile } from '@/hooks/useUserProfile';

interface AiInsightsPanelProps {
  className?: string;
  maxDisplayed?: number;
}

export const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({
  className = ''
}) => {
  const { profile } = useUserProfile();
  
  if (!profile?.organization_id) {
    return null;
  }

  return (
    <ManualInsightsPanel 
      className={className}
      organizationId={profile.organization_id}
    />
  );
};
