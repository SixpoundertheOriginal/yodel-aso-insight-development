import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePermissions } from '@/hooks/usePermissions';

export function useFeaturePermission(featureKey: string) {
  const { profile } = useUserProfile();
  const { isSuperAdmin } = usePermissions();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      try {
        // Super Admin has access to all features
        if (isSuperAdmin) {
          setHasPermission(true);
          setLoading(false);
          return;
        }

        if (!profile?.id) {
          setHasPermission(false);
          setLoading(false);
          return;
        }

        // Get user's role for this feature
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .eq('organization_id', profile.organization_id)
          .limit(1);

        if (!userRoles || userRoles.length === 0) {
          setHasPermission(false);
          setLoading(false);
          return;
        }

        const userRole = userRoles[0].role;

        // Check if user has permission for this feature
        const { data: permission } = await supabase
          .from('ui_permissions')
          .select('is_granted')
          .eq('role', userRole)
          .eq('permission_key', featureKey)
          .single();

        setHasPermission(permission?.is_granted || false);
      } catch (error) {
        console.error('Error checking feature permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [profile?.id, profile?.organization_id, featureKey, isSuperAdmin]);

  return { hasPermission, loading };
}

/**
 * Utility function to check feature permission programmatically
 */
export async function checkFeaturePermission(
  userId: string,
  organizationId: string | null,
  featureKey: string
): Promise<boolean> {
  try {
    if (!organizationId) return false;

    // Get user's role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .limit(1);

    if (!userRoles || userRoles.length === 0) return false;

    const userRole = userRoles[0].role;

    // Check permission
    const { data: permission } = await supabase
      .from('ui_permissions')
      .select('is_granted')
      .eq('role', userRole)
      .eq('permission_key', featureKey)
      .single();

    return permission?.is_granted || false;
  } catch (error) {
    console.error('Error in checkFeaturePermission:', error);
    return false;
  }
}

/**
 * Hook to check multiple feature permissions at once
 */
export function useFeaturePermissions(featureKeys: string[]) {
  const { profile } = useUserProfile();
  const { isSuperAdmin } = usePermissions();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermissions() {
      try {
        // Super Admin has access to all features
        if (isSuperAdmin) {
          const allGranted = featureKeys.reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {} as Record<string, boolean>);
          setPermissions(allGranted);
          setLoading(false);
          return;
        }

        if (!profile?.id || !profile?.organization_id) {
          const allDenied = featureKeys.reduce((acc, key) => {
            acc[key] = false;
            return acc;
          }, {} as Record<string, boolean>);
          setPermissions(allDenied);
          setLoading(false);
          return;
        }

        // Get user's role
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .eq('organization_id', profile.organization_id)
          .limit(1);

        if (!userRoles || userRoles.length === 0) {
          const allDenied = featureKeys.reduce((acc, key) => {
            acc[key] = false;
            return acc;
          }, {} as Record<string, boolean>);
          setPermissions(allDenied);
          setLoading(false);
          return;
        }

        const userRole = userRoles[0].role;

        // Check permissions for all features
        const { data: permissionData } = await supabase
          .from('ui_permissions')
          .select('permission_key, is_granted')
          .eq('role', userRole)
          .in('permission_key', featureKeys);

        const permissionMap = featureKeys.reduce((acc, key) => {
          const permission = permissionData?.find(p => p.permission_key === key);
          acc[key] = permission?.is_granted || false;
          return acc;
        }, {} as Record<string, boolean>);

        setPermissions(permissionMap);
      } catch (error) {
        console.error('Error checking feature permissions:', error);
        const allDenied = featureKeys.reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {} as Record<string, boolean>);
        setPermissions(allDenied);
      } finally {
        setLoading(false);
      }
    }

    checkPermissions();
  }, [profile?.id, profile?.organization_id, featureKeys.join(','), isSuperAdmin]);

  return { permissions, loading };
}