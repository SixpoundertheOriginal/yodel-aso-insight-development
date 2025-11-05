import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useCallback } from 'react';
import { withSafePermissions, safeArray, type SafePermissions } from '@/utils/enterpriseSafeGuards';

export const usePermissions = () => {
  // Gate fetching on auth state to avoid early null results
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Force cache refresh in development when user ID changes (not email to avoid loops)
  useEffect(() => {
    if (import.meta.env.DEV && user?.id) {
      console.log('🔄 [DEV] Invalidating permissions cache for user:', user.email);
      queryClient.invalidateQueries({ 
        queryKey: ['userPermissions', user.id] 
      });
    }
  }, [user?.id, queryClient]);

  // Permissions cache configuration
  const queryKey = ['userPermissions', user?.id || 'anonymous'];
  const staleTimeMs = import.meta.env.DEV ? 1000 * 30 : 1000 * 60 * 2;
  
  if (import.meta.env.DEV) {
    console.log('🔄 [DEV] Permissions Cache Config:', {
      queryKey,
      staleTimeMs,
      userId: user?.id,
      userEmail: user?.email
    });
  }

  const queryEnabled = !!user && !authLoading;

  if (import.meta.env.DEV) {
    console.log('🔍 [DEV] Query State:', {
      enabled: queryEnabled,
      hasUser: !!user,
      authLoading,
      userId: user?.id,
      queryKey
    });
  }

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
      console.log('🚀 [QUERY EXECUTING] Fetching permissions for:', user?.email);

      if (!user) return null;

      if (import.meta.env.DEV) {
        console.log('🔐 [DEV] Fetching permissions for user:', user.email);
      }

      try {
        // Use the unified view for consistent role resolution (avoids broken joins)
        let allPermissions, error;
        const unifiedQuery = await supabase
          .from('user_permissions_unified')
          .select('*')
          .eq('user_id', user.id);

        allPermissions = unifiedQuery.data;
        error = unifiedQuery.error;

        console.log('📊 [QUERY RESULT] Unified view query:', {
          error: error?.message || null,
          rowsReturned: allPermissions?.length || 0,
          firstRow: allPermissions?.[0] || null
        });

        // 🔧 FALLBACK: If unified view fails or returns no data, try direct user_roles query
        if (error || !allPermissions?.length) {
          console.warn('⚠️ Unified view query issue, trying direct user_roles fallback:', {
            error: error?.message,
            rowsReturned: allPermissions?.length || 0
          });

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
            console.error('❌ Direct user_roles query also failed:', directError);
            if (error) throw error; // Throw original error
            throw directError;
          }

          if (directRoles && directRoles.length > 0) {
            console.log('✅ Direct user_roles query successful, transforming data...');

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
          console.warn('[ENTERPRISE-FALLBACK] No permissions found for user:', user.email);
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

        // 🔍 [TIMING-AUDIT] usePermissions initialization completed
        const timestamp = new Date().toISOString();
        console.log(`[TIMING-AUDIT] ${timestamp} - usePermissions RESOLVED:`, {
          organizationId: result.organizationId,
          effectiveRole: result.effectiveRole,
          isOrgScopedRole: result.isOrgScopedRole,
          isSuperAdmin: result.isSuperAdmin,
          userEmail: user.email,
          initializationTime: timestamp
        });

        // 🔍 [AUDIT] Organization slug hydration
        const organization = result.availableOrgs.find(org => org.id === result.organizationId);
        console.log("[AUDIT] Organization slug loaded:", organization?.slug || 'not found');
        console.log("[AUDIT] Expected organizationSlug:", "yodelmobile");

        // Log successful fetch in development
        if (import.meta.env.DEV) {
          console.log('✅ [DEV] Unified permissions loaded:', {
            userId: user.id,
            email: user.email,
            organizationId: result.organizationId,
            effectiveRole: result.effectiveRole,
            isOrgScopedRole: result.isOrgScopedRole,
            isSuperAdmin: result.isSuperAdmin,
            availableOrgsCount: result.availableOrgs.length,
            allPermissionsCount: allPermissions.length,
            timestamp: new Date().toISOString(),
          });
        }

        return result;
        
      } catch (error) {
        console.error('[ENTERPRISE-FALLBACK] Permissions query failed with fallback:', error);
        
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
      console.log('🔄 Manually refreshing permissions for:', user.email);
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

  // [DIAGNOSTIC] Before return, add detailed logging
  const returnValue = {
    userId: safePermissions?.userId || user?.id,
    email: user?.email,
    organizationId: safePermissions?.organizationId,
    orgIdType: typeof safePermissions?.organizationId,
    orgIdExists: !!safePermissions?.organizationId,
    effectiveRole: safePermissions?.effectiveRole,
    isLoading: authLoading || isLoading,
    isLoadingAuth: authLoading,
    hasUser: !!user
  };
  console.log('🔍 [usePermissions] RETURNING organizationId:', returnValue.organizationId);
  console.log('🔍 [usePermissions] FULL RETURN:', returnValue);

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
