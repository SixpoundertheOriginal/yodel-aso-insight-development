import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabaseCompat } from '@/lib/supabase-compat';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useCallback } from 'react';
import { withSafePermissions, safeArray, type SafePermissions } from '@/utils/enterpriseSafeGuards';
import { logger, truncateOrgId } from '@/utils/logger';

export const usePermissions = () => {
  // Gate fetching on auth state to avoid early null results
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Force cache refresh in development when user ID changes (not email to avoid loops)
  useEffect(() => {
    if (import.meta.env.DEV && user?.id) {
      logger.permissions('Cache invalidated for user ID change');
      queryClient.invalidateQueries({
        queryKey: ['userPermissions', user.id]
      });
    }
  }, [user?.id, queryClient]);

  // Permissions cache configuration
  const queryKey = ['userPermissions', user?.id || 'anonymous'];
  const staleTimeMs = import.meta.env.DEV ? 1000 * 30 : 1000 * 60 * 2;
  const queryEnabled = !!user && !authLoading;

  const { data: permissions, isLoading, error: queryError, refetch } = useQuery({
    queryKey,
    enabled: queryEnabled,

    // Environment-aware cache configuration
    staleTime: staleTimeMs,

    gcTime: import.meta.env.DEV
      ? 1000 * 60 * 5 // Keep in memory 5 mins in dev
      : 1000 * 60 * 30, // Keep in memory 30 mins in prod

    retry: 1, // Only retry once on failure
    refetchOnMount: 'always', // ALWAYS refetch on mount to get fresh data
    refetchOnWindowFocus: false, // Don't refetch on window focus

    queryFn: async () => {
      if (!user) return null;

      logger.permissions('Fetching permissions', { email: user.email });

      try {
        // Use the unified view for consistent role resolution (avoids broken joins)
        let allPermissions, error;
        const unifiedQuery = await supabaseCompat.fromAny('user_permissions_unified')
          .select('*')
          .eq('user_id', user.id);

        allPermissions = unifiedQuery.data;
        error = unifiedQuery.error;

        logger.permissions('Unified view query completed', {
          success: !error,
          rows: allPermissions?.length || 0
        });

        // 🔧 FALLBACK: If unified view fails or returns no data, try direct user_roles query
        if (error || !allPermissions?.length) {
          logger.once(
            'permissions-fallback',
            '⚠️ [usePermissions] Unified view unavailable, using direct user_roles fallback'
          );

          const { data: directRoles, error: directError } = await supabase
            .from('user_roles')
            .select(`
              user_id,
              organization_id,
              role,
              organizations (
                id,
                name,
                slug
              )
            `)
            .eq('user_id', user.id);

          if (directError) {
            logger.error('usePermissions', 'Direct user_roles query failed', directError);
            if (error) throw error; // Throw original error
            throw directError;
          }

          if (directRoles && directRoles.length > 0) {
            logger.permissions('Direct user_roles query successful');

            // Transform direct query results to match unified view format
            allPermissions = directRoles.map(role => ({
              user_id: role.user_id,
              org_id: role.organization_id,
              org_name: role.organizations?.name || null,
              org_slug: role.organizations?.slug || null,
              role: role.role,
              role_source: 'user_roles_direct',
              is_platform_role: role.organization_id === null,
              is_org_scoped_role: role.organization_id !== null,
              effective_role: role.role?.toLowerCase().replace('organization_', 'org_').replace('platform_', '') || 'viewer',
              is_super_admin: role.role === 'PLATFORM_SUPER_ADMIN',
              is_org_admin: role.role === 'ORGANIZATION_ADMIN',
              resolved_at: new Date().toISOString()
            }));

            error = null; // Clear error since fallback succeeded
          } else if (error) {
            // Both queries failed
            throw error;
          }
        }

        if (!allPermissions?.length) {
          logger.once(
            'no-permissions-' + user.id,
            `[usePermissions] No permissions found for user, using defaults`
          );
          // Return enterprise-safe defaults for users without permissions
          return withSafePermissions({
            userId: user.id,
            organizationId: null,
            roles: [],
            organizationRoles: [],
            permissions: [],
            isSuperAdmin: false,
            isOrganizationAdmin: false,
            canManageApps: false,
            canApproveApps: false,
            effectiveRole: 'viewer',
            isOrgScopedRole: false,
            allPermissions: [],
            availableOrgs: [],
            isLoading: false
          });
        }

        // Find primary permission (current org or super admin)
        const currentOrgPermission = allPermissions.find(p => p.org_id && p.is_org_scoped_role);
        const superAdminPermission = allPermissions.find(p => p.is_super_admin);
        const primaryPermission = currentOrgPermission || superAdminPermission || allPermissions[0];

        // Extract available organizations for switching with enterprise-safe access
        const availableOrgs = safeArray(
          allPermissions
            ?.filter(p => p.org_id && p.org_name)
            ?.map(p => ({
              id: p.org_id,
              name: p.org_name,
              slug: p.org_slug
            }))
            ?.filter((org, index, self) => 
              index === self.findIndex(o => o.id === org.id)
            ) // Deduplicate
        );

        // Build permissions list based on roles with enterprise-safe access
        const permissionsList: string[] = [];
        if (primaryPermission?.is_super_admin) {
          permissionsList.push('admin.manage_all', 'admin.approve_apps', 'admin.manage_apps', 'admin.view_audit_logs');
        }
        if (primaryPermission?.is_org_admin) {
          permissionsList.push('admin.manage_apps', 'admin.approve_apps', 'admin.view_org_data');
        }

        // Create enterprise-safe permissions object
        const rawResult = {
          userId: user.id,
          organizationId: primaryPermission?.org_id || null,
          roles: safeArray([primaryPermission?.effective_role].filter(Boolean)),
          organizationRoles: safeArray(
            primaryPermission?.is_org_scoped_role ? [primaryPermission.effective_role] : []
          ),
          permissions: safeArray(permissionsList),
          isSuperAdmin: Boolean(primaryPermission?.is_super_admin),
          isOrganizationAdmin: Boolean(primaryPermission?.is_org_admin),
          canManageApps: Boolean(primaryPermission?.is_org_admin || primaryPermission?.is_super_admin),
          canApproveApps: Boolean(primaryPermission?.is_org_admin || primaryPermission?.is_super_admin),
          effectiveRole: primaryPermission?.effective_role || 'viewer',
          isOrgScopedRole: Boolean(primaryPermission?.is_org_scoped_role),
          
          // Multi-org support
          allPermissions: safeArray(allPermissions),
          availableOrgs,
          isLoading: false
        };

        // Apply enterprise-safe wrapper to ensure all fields are properly defined
        const result = withSafePermissions(rawResult);

        // Log successful load (one-time per session)
        logger.once(
          'permissions-loaded-' + user.id,
          `[usePermissions] Loaded org=${truncateOrgId(result.organizationId)}, role=${result.effectiveRole}, superAdmin=${result.isSuperAdmin}`
        );

        return result;
        
      } catch (error) {
        logger.error('usePermissions', 'Permissions query failed, using fallback', error);

        // Enterprise-safe fallback to prevent UI crashes
        return withSafePermissions({
          userId: user.id,
          organizationId: null,
          roles: [],
          organizationRoles: [],
          permissions: [],
          isSuperAdmin: false,
          isOrganizationAdmin: false,
          canManageApps: false,
          canApproveApps: false,
          effectiveRole: 'viewer',
          isOrgScopedRole: false,
          allPermissions: [],
          availableOrgs: [],
          isLoading: false
        });
      }
    },
  });

  // Add manual refresh capability
  const refreshPermissions = useCallback(() => {
    if (user?.id) {
      logger.permissions('Manually refreshing permissions');
      queryClient.invalidateQueries({
        queryKey: ['userPermissions', user.id]
      });
    }
  }, [user?.id, queryClient]); // REMOVED user?.email to prevent invalidation loops

  // Enterprise-safe permissions with comprehensive fallbacks
  // IMPORTANT: Don't apply fallback during initial loading (prevents false warnings)
  const safePermissions = (authLoading || !user)
    ? null  // Return null during loading, not fallback defaults
    : withSafePermissions(permissions);

  // If still loading auth, return loading state without fallback
  if (authLoading || !user) {
    return {
      userId: undefined,
      organizationId: null,
      effectiveRole: 'viewer',
      normalizedRole: 'viewer',
      roles: [],
      organizationRoles: [],
      isSuperAdmin: false,
      isOrganizationAdmin: false,
      isOrgScopedRole: false,
      canManageApps: false,
      canApproveApps: false,
      permissions: [],
      availableOrgs: [],
      allPermissions: [],
      isLoading: true,  // Critical: Signal that we're loading
      error: null,
      refreshPermissions,
    };
  }

  // User is loaded, return actual permissions (with fallback if needed)
  const finalPermissions = safePermissions || withSafePermissions(null);

  return {
    // Core user info
    userId: finalPermissions.userId || user?.id,
    organizationId: finalPermissions.organizationId,

    // Role information
    effectiveRole: finalPermissions.effectiveRole,
    normalizedRole: finalPermissions.effectiveRole, // For compatibility
    roles: finalPermissions.roles,
    organizationRoles: finalPermissions.organizationRoles,

    // Permission flags
    isSuperAdmin: finalPermissions.isSuperAdmin,
    isOrganizationAdmin: finalPermissions.isOrganizationAdmin,
    isOrgScopedRole: finalPermissions.isOrgScopedRole,

    // Capabilities
    canManageApps: finalPermissions.canManageApps,
    canApproveApps: finalPermissions.canApproveApps,
    permissions: finalPermissions.permissions,

    // Multi-org support
    availableOrgs: finalPermissions.availableOrgs,
    allPermissions: finalPermissions.allPermissions,

    // State management
    isLoading: isLoading,  // Only React Query loading now
    error: queryError,
    refreshPermissions,
  };
};
