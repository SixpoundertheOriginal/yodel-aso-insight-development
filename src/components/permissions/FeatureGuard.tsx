import React from 'react';
import { useFeaturePermission } from '@/hooks/useFeaturePermission';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showSkeleton?: boolean;
}

export function FeatureGuard({ 
  feature, 
  children, 
  fallback = null,
  showSkeleton = false 
}: FeatureGuardProps) {
  const { hasPermission, loading } = useFeaturePermission(feature);

  if (loading) {
    if (showSkeleton) {
      return <Skeleton className="h-4 w-full rounded" />;
    }
    return <div className="animate-pulse bg-muted h-4 w-full rounded" />;
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Higher-order component version of FeatureGuard
 */
export function withFeatureGuard<P extends object>(
  Component: React.ComponentType<P>,
  feature: string,
  fallback?: React.ReactNode
) {
  return function GuardedComponent(props: P) {
    return (
      <FeatureGuard feature={feature} fallback={fallback}>
        <Component {...props} />
      </FeatureGuard>
    );
  };
}