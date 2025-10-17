
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BigQueryApp {
  id: string;
  app_identifier: string;
  app_name?: string;
  data_source: 'bigquery';
  approval_status: 'approved';
  app_metadata?: any;
}

export const useBigQueryApps = (organizationId?: string) => {
  return useQuery({
    queryKey: ['bigquery-apps', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await supabase
        .from('apps' as any) // organization_apps table doesn't exist
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('app_store_id');

      if (error) {
        console.error('Error fetching BigQuery apps:', error);
        throw error;
      }

      return (data || []).map((app: any): BigQueryApp => ({
        id: app.id,
        app_identifier: app.app_store_id || app.id,
        app_name: app.app_name || app.app_store_id,
        data_source: 'bigquery' as const,
        approval_status: 'approved' as const,
        app_metadata: app.intelligence_metadata
      }));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
