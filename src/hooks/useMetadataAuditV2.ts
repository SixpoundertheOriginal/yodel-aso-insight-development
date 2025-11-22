/**
 * React Query hook for Metadata Audit V2 API
 *
 * Fetches unified metadata audit results from metadata-audit-v2 Edge Function.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MetadataAuditV2Response } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

interface UseMetadataAuditV2Params {
  app_id?: string;
  platform?: string;
  locale?: string;
  monitored_app_id?: number;
  enabled?: boolean;
}

async function fetchMetadataAuditV2(
  params: UseMetadataAuditV2Params
): Promise<MetadataAuditV2Response> {
  const { data, error } = await supabase.functions.invoke('metadata-audit-v2', {
    body: {
      app_id: params.app_id,
      platform: params.platform || 'ios',
      locale: params.locale || 'us',
      monitored_app_id: params.monitored_app_id,
    },
  });

  if (error) {
    throw new Error(`Metadata Audit V2 API Error: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(
      data.error?.message || 'Metadata audit failed with unknown error'
    );
  }

  return data as MetadataAuditV2Response;
}

export function useMetadataAuditV2(params: UseMetadataAuditV2Params) {
  return useQuery({
    queryKey: ['metadata-audit-v2', params],
    queryFn: () => fetchMetadataAuditV2(params),
    enabled: params.enabled !== false && (!!params.app_id || !!params.monitored_app_id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
}
