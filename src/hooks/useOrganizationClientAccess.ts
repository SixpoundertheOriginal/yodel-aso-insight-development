import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientAccess {
  id: string;
  bigquery_client_name: string;
  access_level: string;
  granted_at: string;
}

export const useOrganizationClientAccess = (organizationId?: string) => {
  return useQuery({
    queryKey: ['organization-client-access', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('organization_client_access')
        .select('*')
        .eq('organization_id', organizationId)
        .order('bigquery_client_name');

      if (error) {
        console.error('Error fetching client access:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};