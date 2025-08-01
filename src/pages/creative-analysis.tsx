import React from 'react';
import { MainLayout } from '@/layouts';
import { CreativeAnalysisHub } from '@/components/AsoAiHub/CreativeAnalysis/CreativeAnalysisHub';

const CreativeAnalysisPage: React.FC = () => {
  return (
    <MainLayout>
      <CreativeAnalysisHub />
    </MainLayout>
  );
};

export default CreativeAnalysisPage;