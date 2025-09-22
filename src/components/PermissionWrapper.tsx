import React, { memo } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionWrapperProps {
  permission: string;
  context?: any;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
  logAccess?: boolean;
}

export const PermissionWrapper = memo<PermissionWrapperProps>(({
  permission,
  context,
  children,
  fallback = null,
  loading = <Skeleton className="w-full h-8" />,
  logAccess = false
}) => {
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  
  if (permissionsLoading) return <>{loading}</>;
  
  if (isSuperAdmin) {
    return <>{children}</>;
  }
  
  // For now, return fallback for non-super-admin users
  // This can be enhanced with feature access checks later
  return <>{fallback}</>;
});

PermissionWrapper.displayName = 'PermissionWrapper';

// Specialized wrappers for common use cases
export const DevToolsWrapper = ({ children }: { children: React.ReactNode }) => (
  <PermissionWrapper permission="ui.debug.show_test_buttons">
    {children}
  </PermissionWrapper>
);

export const AdminWrapper = ({ children }: { children: React.ReactNode }) => (
  <PermissionWrapper permission="ui.admin.show_user_management">
    {children}
  </PermissionWrapper>
);

export const DebugInfoWrapper = ({ children }: { children: React.ReactNode }) => (
  <PermissionWrapper permission="ui.debug.show_metadata">
    {children}
  </PermissionWrapper>
);

export const LiveBadgeWrapper = ({ children }: { children: React.ReactNode }) => (
  <PermissionWrapper permission="ui.debug.show_live_badges">
    {children}
  </PermissionWrapper>
);

export const PerformanceMetricsWrapper = ({ children }: { children: React.ReactNode }) => (
  <PermissionWrapper permission="ui.debug.show_performance_metrics">
    {children}
  </PermissionWrapper>
);

export const SystemInfoWrapper = ({ children }: { children: React.ReactNode }) => (
  <PermissionWrapper permission="ui.admin.show_system_info">
    {children}
  </PermissionWrapper>
);