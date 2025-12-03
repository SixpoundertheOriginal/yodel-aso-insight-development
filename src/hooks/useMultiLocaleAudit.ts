/**
 * Hook for multi-locale audit
 * Calls edge function to process all 10 locales
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MultiLocaleIndexation, LocaleMetadata } from '@/types/multiLocaleMetadata';

export function useMultiLocaleAudit() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MultiLocaleIndexation | null>(null);

  const runAudit = async (
    appId: string,
    locales: LocaleMetadata[]
  ): Promise<MultiLocaleIndexation | null> => {
    console.log('[MULTI-LOCALE-AUDIT] Starting audit for', appId, '- locales:', locales.length);

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke(
        'multi-locale-audit',
        {
          body: {
            appId,
            market: 'us',
            locales,
          },
        }
      );

      if (funcError) throw funcError;
      if (!data?.success) throw new Error(data?.error?.message || 'Audit failed');

      console.log('[MULTI-LOCALE-AUDIT] ✓ Audit complete:', data.data);

      setResult(data.data);
      setIsLoading(false);
      return data.data;

    } catch (err: any) {
      console.error('[MULTI-LOCALE-AUDIT] ✗ Error:', err);
      setError(err.message);
      setIsLoading(false);
      return null;
    }
  };

  return {
    runAudit,
    isLoading,
    error,
    result,
  };
}
