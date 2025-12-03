/**
 * useMetadataDraftAudit Hook
 *
 * Fetches draft audit results from metadata-audit-draft edge function.
 * Compares user's proposed metadata changes against baseline.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  DraftAuditRequest,
  DraftAuditResponse,
  DraftMetadata,
  BaselineMetadata,
} from '@/types/metadataOptimization';

interface UseMetadataDraftAuditOptions {
  onSuccess?: (data: DraftAuditResponse['data']) => void;
  onError?: (error: Error) => void;
}

export function useMetadataDraftAudit(options?: UseMetadataDraftAuditOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<DraftAuditResponse['data'] | null>(null);

  const runDraftAudit = async (params: {
    app_id: string;
    platform: 'ios' | 'android';
    locale: string;
    draft: DraftMetadata;
    baseline: BaselineMetadata;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload: DraftAuditRequest = {
        app_id: params.app_id,
        platform: params.platform,
        locale: params.locale,
        draft: params.draft,
        baseline: params.baseline,
      };

      console.log('[useMetadataDraftAudit] Calling edge function with:', payload);

      // Use supabase.functions.invoke for automatic auth handling
      const { data: result, error: invokeError } = await supabase.functions.invoke<DraftAuditResponse>(
        'metadata-audit-draft',
        {
          body: payload,
        }
      );

      if (invokeError) {
        throw new Error(`Edge function error: ${invokeError.message}`);
      }

      if (!result || !result.success || !result.data) {
        throw new Error(result?.error?.message || 'Draft audit failed');
      }

      console.log('[useMetadataDraftAudit] Success:', {
        deltas: result.data.deltas,
        executionTimeMs: result._meta?.executionTimeMs,
      });

      setData(result.data);
      setIsLoading(false);

      if (options?.onSuccess) {
        options.onSuccess(result.data);
      }

      return result.data;
    } catch (err: any) {
      console.error('[useMetadataDraftAudit] Error:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);

      if (options?.onError) {
        options.onError(error);
      }

      throw error;
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setIsLoading(false);
  };

  return {
    runDraftAudit,
    reset,
    data,
    isLoading,
    error,
  };
}
