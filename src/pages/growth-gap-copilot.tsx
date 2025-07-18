import React from 'react';
import { MainLayout } from '@/layouts';
import { GrowthGapCopilot } from '@/components/AsoAiHub/GrowthGapCopilot';

const GrowthGapCopilotPage: React.FC = () => {
  return (
    <MainLayout>
      <GrowthGapCopilot />
    </MainLayout>
  );
};

export default GrowthGapCopilotPage;