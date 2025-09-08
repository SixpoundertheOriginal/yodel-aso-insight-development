import React, { useEffect, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export const DashboardBrandingLine: React.FC = () => {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { selectedOrganizationId, isSuperAdmin } = useSuperAdmin();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profileLoading) return;

    if (isSuperAdmin) {
      if (!selectedOrganizationId) {
        setOrgName(null);
        return;
      }
      if (selectedOrganizationId === profile?.organization_id) {
        setOrgName(profile?.organizations?.name ?? null);
        return;
      }
      setLoading(true);
      supabase
        .from('organizations')
        .select('name')
        .eq('id', selectedOrganizationId)
        .single()
        .then(
          ({ data, error }) => {
            if (!error && data) setOrgName(data.name);
            else setOrgName(null);
            setLoading(false);
          },
          () => {
            setOrgName(null);
            setLoading(false);
          }
        );
    } else {
      setOrgName(profile?.organizations?.name ?? null);
    }
  }, [profileLoading, profile?.organizations?.name, profile?.organization_id, isSuperAdmin, selectedOrganizationId]);

  if (profileLoading || loading) {
    return <Skeleton className="h-4 w-64 mt-1" />;
  }

  if (!orgName) return null;

  return (
    <p className="text-sm font-medium text-gray-400 mt-1">
      Analytics for {orgName} — powered by Yodel Mobile
    </p>
  );
};

export default DashboardBrandingLine;
