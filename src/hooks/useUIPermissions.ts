import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { uiPermissionService, UIPermissions } from '@/services/uiPermissions';

export const useUIPermissions = (orgId?: string) => {
  const { profile } = useUserProfile();
  const { isSuperAdmin } = usePermissions();
  const [permissions, setPermissions] = useState<UIPermissions>({});
  const [loading, setLoading] = useState(true);
  const [roleBaseline, setRoleBaseline] = useState<UIPermissions>({});
  const [orgDefaults, setOrgDefaults] = useState<UIPermissions>({});

  // Memoized permission checker with audit logging
  const hasPermission = useCallback((key: string, logAccess = false): boolean => {
    // ENTERPRISE: Super admin bypass - always return true
    if (isSuperAdmin) {
      return true;
    }
    
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
  }, [isSuperAdmin, permissions, profile]);

  // Context-aware permission checker
  const hasContextPermission = useCallback((
    key: string, 
    context?: any, 
    logAccess = false
  ): boolean => {
    // ENTERPRISE: Super admin bypass - always return true
    if (isSuperAdmin) {
      return true;
    }
    
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
  }, [isSuperAdmin, permissions, profile]);

  // Load permissions when user changes
  useEffect(() => {
    // Skip loading for super admins
    if (isSuperAdmin) {
      setPermissions(SUPER_ADMIN_PERMISSIONS);
      setLoading(false);
      return;
    }

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
        let final = userPermissions;
        const ORG_ENABLED = (import.meta as any).env?.VITE_UI_PERMISSIONS_ORG_DEFAULTS_ENABLED === 'true';
        if (ORG_ENABLED && orgId) {
          try {
            const o = await uiPermissionService.getOrgPermissions(orgId);
            if (mounted) { setRoleBaseline(o.roleBaseline); setOrgDefaults(o.orgDefaults); }
            final = o.resolved;
          } catch (e) { /* ignore org overlay errors; fall back */ }
        }
        if (mounted) setPermissions(final);
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
  }, [isSuperAdmin, profile?.id]);

  // Refresh permissions
  const refreshPermissions = useCallback(async () => {
    if (isSuperAdmin) {
      // No-op for super admins
      return;
    }
    
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      uiPermissionService.invalidateUserCache(profile.id);
      const base = await uiPermissionService.getUserPermissions(profile.id);
      let final = base;
      const ORG_ENABLED = (import.meta as any).env?.VITE_UI_PERMISSIONS_ORG_DEFAULTS_ENABLED === 'true';
      if (ORG_ENABLED && orgId) {
        const o = await uiPermissionService.getOrgPermissions(orgId);
        setRoleBaseline(o.roleBaseline); setOrgDefaults(o.orgDefaults);
        final = o.resolved;
      }
      setPermissions(final);
    } catch (error) {
      console.error('Failed to refresh UI permissions:', error);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, profile?.id, orgId]);

  // Return consistent structure regardless of isSuperAdmin
  return {
    hasPermission,
    hasContextPermission,
    permissions: isSuperAdmin ? SUPER_ADMIN_PERMISSIONS : permissions,
    loading: isSuperAdmin ? false : loading,
    refreshPermissions,
    roleBaseline,
    orgDefaults,
    
    // Commonly used permission checks (optimized)
    canAccessDevTools: isSuperAdmin || hasPermission('ui.debug.show_test_buttons'),
    canSeeDebugInfo: isSuperAdmin || hasPermission('ui.debug.show_metadata'),
    canSeeLiveBadges: isSuperAdmin || hasPermission('ui.debug.show_live_badges'),
    canSeePerformanceMetrics: isSuperAdmin || hasPermission('ui.debug.show_performance_metrics'),
    canAccessAdminFeatures: isSuperAdmin || hasPermission('ui.admin.show_user_management'),
    canSeeSystemInfo: isSuperAdmin || hasPermission('ui.admin.show_system_info'),

    // Super admin capabilities
    canAccessAllOrganizations: isSuperAdmin,
    canManagePlatform: isSuperAdmin
  } as const;
};

// Define super admin capabilities
const SUPER_ADMIN_PERMISSIONS: UIPermissions = {
  'ui.debug.show_test_buttons': true,
  'ui.debug.show_live_badges': true,
  'ui.debug.show_metadata': true,
  'ui.debug.show_performance_metrics': true,
  'ui.admin.show_user_management': true,
  'ui.admin.manage_organizations': true,
  'ui.admin.platform_settings': true,
  'ui.debug.show_all_data': true
};
