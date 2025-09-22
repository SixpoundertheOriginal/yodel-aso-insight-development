import React from 'react';
import { useEnhancedFeatureAccess } from '@/hooks/useEnhancedFeatureAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showSkeleton?: boolean;
  logAccess?: boolean;
}

export function FeatureGuard({ 
  feature, 
  children, 
  fallback = null,
  showSkeleton = false,
  logAccess = false
}: FeatureGuardProps) {
  const { hasFeature, loading, logFeatureUsage } = useEnhancedFeatureAccess();
  const { isSuperAdmin } = usePermissions();

  // Super admin bypass
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (loading) {
    if (showSkeleton) {
      return <Skeleton className="h-4 w-full rounded" />;
    }
    return <div className="animate-pulse bg-muted h-4 w-full rounded" />;
  }

  const hasAccess = hasFeature(feature);

  // Log access attempt if requested
  if (logAccess) {
    logFeatureUsage(feature, 'guard_check', { 
      access_granted: hasAccess,
      component: 'FeatureGuard'
    });
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
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
      <FeatureGuard feature={feature} fallback={fallback} logAccess={true}>
        <Component {...props} />
      </FeatureGuard>
    );
  };
}