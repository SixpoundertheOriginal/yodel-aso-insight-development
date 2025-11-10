/**
 * Wrapper for ReviewAnalysisProvider that extracts organizationId from usePermissions
 * This is needed because providers in App.tsx can't use hooks directly
 */

import React from 'react';
import { ReviewAnalysisProvider } from './ReviewAnalysisContext';
import { usePermissions } from '@/hooks/usePermissions';

interface ReviewAnalysisProviderWrapperProps {
  children: React.ReactNode;
}

export function ReviewAnalysisProviderWrapper({ children }: ReviewAnalysisProviderWrapperProps) {
  const { organizationId } = usePermissions();

  return (
    <ReviewAnalysisProvider organizationId={organizationId}>
      {children}
    </ReviewAnalysisProvider>
  );
}
