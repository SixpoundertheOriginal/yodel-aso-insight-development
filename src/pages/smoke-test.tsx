
import React from 'react';
import { MainLayout } from '@/layouts';
import { BigQuerySmokeTest } from '@/components/BigQuerySmokeTest';

const SmokeTestPage: React.FC = () => {
  return (
    <MainLayout>
      <BigQuerySmokeTest />
    </MainLayout>
  );
};

export default SmokeTestPage;
