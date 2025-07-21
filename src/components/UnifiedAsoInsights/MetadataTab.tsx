
import React from 'react';
import { useUnifiedAso } from '@/context/UnifiedAsoContext';
import { MetadataWorkspace } from '@/components/AsoAiHub/MetadataCopilot/MetadataWorkspace';

export const MetadataTab: React.FC = () => {
  const { analysis } = useUnifiedAso();
  
  if (!analysis.importedApp) return null;

  return (
    <MetadataWorkspace 
      initialData={analysis.importedApp} 
      organizationId={analysis.organizationId || ''}
    />
  );
};
