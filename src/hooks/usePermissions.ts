import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useCallback } from 'react';

export const usePermissions = () => {
  // Gate fetching on auth state to avoid early null results
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Force cache refresh in development when user changes
  useEffect(() => {
    if (import.meta.env.DEV && user?.id) {
      console.log('🔄 [DEV] Invalidating permissions cache for user:', user.email);
      queryClient.invalidateQueries({ 
        queryKey: ['userPermissions', user.id] 
      });
    }
  }, [user?.id, user?.email, queryClient]);

  const { data: permissions, isLoading, error: queryError } = useQuery({
    queryKey: ['userPermissions', user?.id || 'anonymous'],
    enabled: !!user && !authLoading,
    
    // Environment-aware cache configuration
    staleTime: import.meta.env.DEV 
      ? 0 // Always fresh in development
      : 1000 * 60 * 2, // 2 minutes in production
    
    gcTime: import.meta.env.DEV
      ? 1000 * 60 * 5 // Keep in memory 5 mins in dev
      : 1000 * 60 * 30, // Keep in memory 30 mins in prod
    
    retry: 1, // Only retry once on failure
    
    queryFn: async () => {
      if (!user) return null;

      if (import.meta.env.DEV) {
        console.log('🔐 [DEV] Fetching permissions for user:', user.email);
      }

      // Get user profile with roles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('organization_id, user_roles(role, organization_id)')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Permissions query failed:', {
          userId: user.id,
          email: user.email,
          error: error.message,
          code: error.code,
          hint: error.hint,
        });
        throw error;
      }

      if (!profile) return null;

      const userRoles = (profile.user_roles || []) as Tables<'user_roles'>[];
      const roleSet = new Set<string>();
      userRoles.forEach((r) => roleSet.add(r.role.toLowerCase()));

      // ✅ ENHANCED: Handle null organization_id for Platform Super Admin
      const organizationRoles = userRoles
        .filter((r) =>
          profile.organization_id
            ? r.organization_id === profile.organization_id
            : r.organization_id === null
        )
        .map((r) => r.role.toLowerCase());

      const isSuperAdmin = userRoles.some(
        (r) => r.role?.toLowerCase() === 'super_admin' && r.organization_id === null
      );

      // Define permission list based on roles
      const permissionsList: string[] = [];
      if (isSuperAdmin) {
        permissionsList.push('admin.manage_all', 'admin.approve_apps', 'admin.manage_apps', 'admin.view_audit_logs');
      }
      if (organizationRoles.includes('org_admin') || isSuperAdmin) {
        permissionsList.push('admin.manage_apps', 'admin.approve_apps', 'admin.view_org_data');
      }

      const result = {
        userId: user.id,
        organizationId: profile.organization_id,
        roles: Array.from(roleSet),
        organizationRoles,
        permissions: permissionsList,
        isSuperAdmin,
        isOrganizationAdmin: organizationRoles.includes('org_admin') || isSuperAdmin,
        canManageApps: organizationRoles.includes('org_admin') || isSuperAdmin,
        canApproveApps: organizationRoles.includes('org_admin') || isSuperAdmin
      };

      // Log successful fetch in development
      if (import.meta.env.DEV) {
        console.log('✅ [DEV] Permissions loaded:', {
          userId: user.id,
          email: user.email,
          organizationId: profile.organization_id,
          roles: userRoles,
          isSuperAdmin: result.isSuperAdmin,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
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
  }, [user?.id, user?.email, queryClient]);

  return {
    ...permissions,
    // Combine auth and query loading to prevent premature decisions
    isLoading: authLoading || isLoading,
    permissions: permissions?.permissions || [],
    isSuperAdmin: permissions?.isSuperAdmin || false,
    isOrganizationAdmin: permissions?.isOrganizationAdmin || false,
    canManageApps: permissions?.canManageApps || false,
    canApproveApps: permissions?.canApproveApps || false,
    error: queryError, // Add error to return
    refreshPermissions, // Add refresh function
  };
};
