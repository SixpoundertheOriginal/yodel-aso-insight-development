import React from 'react';
import { MainLayout } from '@/layouts';
import { MetadataCopilot } from '@/components/AsoAiHub/MetadataCopilot/MetadataCopilot';

const MetadataCopilotPage: React.FC = () => {
  return (
    <MainLayout>
      <MetadataCopilot />
    </MainLayout>
  );
};

export default MetadataCopilotPage;