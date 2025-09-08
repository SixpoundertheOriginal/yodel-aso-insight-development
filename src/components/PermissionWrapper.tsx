import React, { memo } from 'react';
import { useUIPermissions } from '@/hooks/useUIPermissions';
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
  const { hasContextPermission, loading: permissionsLoading } = useUIPermissions();
  
  if (permissionsLoading) return <>{loading}</>;
  
  const hasAccess = hasContextPermission(permission, context, logAccess);
  return hasAccess ? <>{children}</> : <>{fallback}</>;
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