import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { uiPermissionService, UIPermissions } from '@/services/uiPermissions';

export const useUIPermissions = () => {
  const { profile } = useUserProfile();
  const [permissions, setPermissions] = useState<UIPermissions>({});
  const [loading, setLoading] = useState(true);

  // Memoized permission checker with audit logging
  const hasPermission = useCallback((key: string, logAccess = false): boolean => {
    const hasAccess = permissions[key] ?? false;
    
    // Log access attempt if requested (for audit purposes)
    if (logAccess && profile?.id) {
      uiPermissionService.logUIAccess(
        profile.id,
        profile.organization_id || null,
        key,
        hasAccess
      );
    }
    
    return hasAccess;
  }, [permissions, profile]);

  // Context-aware permission checker
  const hasContextPermission = useCallback((
    key: string, 
    context?: any, 
    logAccess = false
  ): boolean => {
    if (!permissions) return false;
    
    const basePermission = permissions[key] ?? false;
    if (!basePermission) return false;
    
    // Log access attempt
    if (logAccess && profile?.id) {
      uiPermissionService.logUIAccess(
        profile.id,
        profile.organization_id || null,
        key,
        basePermission,
        context
      );
    }
    
    // For now, just return base permission
    // In the future, we can add context-specific rules here
    return basePermission;
  }, [permissions, profile]);

  // Load permissions when user changes
  useEffect(() => {
    if (!profile?.id) {
      setPermissions({});
      setLoading(false);
      return;
    }

    let mounted = true;
    
    const loadPermissions = async () => {
      setLoading(true);
      try {
        const userPermissions = await uiPermissionService.getUserPermissions(profile.id);
        if (mounted) {
          setPermissions(userPermissions);
        }
      } catch (error) {
        console.error('Failed to load UI permissions:', error);
        if (mounted) {
          setPermissions({}); // Fail closed
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPermissions();
    
    return () => { 
      mounted = false; 
    };
  }, [profile?.id]);

  // Refresh permissions
  const refreshPermissions = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      uiPermissionService.invalidateUserCache(profile.id);
      const userPermissions = await uiPermissionService.getUserPermissions(profile.id);
      setPermissions(userPermissions);
    } catch (error) {
      console.error('Failed to refresh UI permissions:', error);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  return {
    hasPermission,
    hasContextPermission,
    permissions,
    loading,
    refreshPermissions,
    
    // Commonly used permission checks (optimized)
    canAccessDevTools: hasPermission('ui.debug.show_test_buttons'),
    canSeeDebugInfo: hasPermission('ui.debug.show_metadata'),
    canSeeLiveBadges: hasPermission('ui.debug.show_live_badges'),
    canSeePerformanceMetrics: hasPermission('ui.debug.show_performance_metrics'),
    canAccessAdminFeatures: hasPermission('ui.admin.show_user_management'),
    canSeeSystemInfo: hasPermission('ui.admin.show_system_info')
  };
};