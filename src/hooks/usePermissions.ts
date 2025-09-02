
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export const usePermissions = () => {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['userPermissions'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user profile with roles
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, user_roles(role, organization_id)')
        .eq('id', user.id)
        .single();

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

      return {
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
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...permissions,
    isLoading,
    permissions: permissions?.permissions || [],
    isSuperAdmin: permissions?.isSuperAdmin || false,
    isOrganizationAdmin: permissions?.isOrganizationAdmin || false,
    canManageApps: permissions?.canManageApps || false,
    canApproveApps: permissions?.canApproveApps || false,
  };
};
