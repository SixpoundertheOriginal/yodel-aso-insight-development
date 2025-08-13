import React from 'react';
import { BrandedLoadingSpinner } from '@/components/ui/LoadingSkeleton';

/** Minimal spinner shown while verifying authentication */
export const AuthLoadingSpinner: React.FC = () => {
  return <BrandedLoadingSpinner message="Checking authentication" />;
};

export default AuthLoadingSpinner;
