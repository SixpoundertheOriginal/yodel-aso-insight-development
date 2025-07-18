import React from 'react';
import { MainLayout } from '@/layouts';
import { CppCopilot } from '@/components/AsoAiHub/CppCopilot';

const CppStrategyCopilotPage: React.FC = () => {
  return (
    <MainLayout>
      <CppCopilot />
    </MainLayout>
  );
};

export default CppStrategyCopilotPage;