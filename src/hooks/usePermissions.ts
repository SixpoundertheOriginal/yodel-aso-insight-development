
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePermissions = () => {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['userPermissions'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user profile and roles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      // Get user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', user.id);

      const roleSet = new Set<string>();
      if (profile.role) roleSet.add(profile.role.toLowerCase());
      userRoles?.forEach(r => roleSet.add(r.role.toLowerCase()));

      // ✅ ENHANCED: Handle null organization_id for Platform Super Admin
      const organizationRoles = userRoles?.filter(r =>
        profile.organization_id
          ? r.organization_id === profile.organization_id
          : r.organization_id === null
      ).map(r => r.role.toLowerCase()) || [];

      // Define permission list based on roles
      const permissionsList: string[] = [];
      if (roleSet.has('super_admin')) {
        permissionsList.push('admin.manage_all', 'admin.approve_apps', 'admin.manage_apps', 'admin.view_audit_logs');
      }
      if (organizationRoles.includes('org_admin') || roleSet.has('super_admin')) {
        permissionsList.push('admin.manage_apps', 'admin.approve_apps', 'admin.view_org_data');
      }

      return {
        userId: user.id,
        organizationId: profile.organization_id,
        roles: Array.from(roleSet),
        organizationRoles,
        permissions: permissionsList,
        isSuperAdmin: roleSet.has('super_admin'),
        isOrganizationAdmin: organizationRoles.includes('org_admin') || roleSet.has('super_admin'),
        canManageApps: organizationRoles.includes('org_admin') || roleSet.has('super_admin'),
        canApproveApps: organizationRoles.includes('org_admin') || roleSet.has('super_admin')
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
