/**
 * Brand Override Hook (v2.1: Database Integration)
 *
 * Manages user-defined brand overrides per app.
 * - For monitored apps: Stores in database (monitored_apps.brand_keywords)
 * - For non-monitored apps: Stores in localStorage only
 * - Graceful fallback: localStorage cache if database fails
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'aso-audit-brand-overrides';

interface BrandOverrides {
  [appId: string]: string;
}

/**
 * Get brand overrides from localStorage
 */
function getBrandOverrides(): BrandOverrides {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to parse brand overrides from localStorage:', error);
    return {};
  }
}

/**
 * Save brand overrides to localStorage
 */
function saveBrandOverrides(overrides: BrandOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.error('Failed to save brand overrides to localStorage:', error);
  }
}

/**
 * Custom hook for managing brand override for a specific app (v2.1)
 *
 * @param appId - App Store ID (e.g., "6477780060")
 * @param organizationId - Organization ID (for database RLS)
 * @param monitoredAppId - Monitored app UUID (if this is a monitored app)
 * @returns [brandOverride, setBrandOverride, clearBrandOverride]
 */
export function useBrandOverride(
  appId: string | undefined,
  organizationId?: string,
  monitoredAppId?: string
): [
  string | null,
  (brand: string) => Promise<void>,
  () => Promise<void>
] {
  const [brandOverride, setBrandOverrideState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load brand override on mount
  useEffect(() => {
    let isMounted = true;

    async function loadBrandOverride() {
      if (!appId) {
        setBrandOverrideState(null);
        setIsLoading(false);
        return;
      }

      // If monitored app, try database first
      if (monitoredAppId && organizationId) {
        try {
          const { data, error } = await supabase
            .from('monitored_apps')
            .select('brand_keywords')
            .eq('id', monitoredAppId)
            .eq('organization_id', organizationId)
            .maybeSingle();

          if (!error && data && data.brand_keywords && data.brand_keywords.length > 0) {
            // Database has brand keywords - use first keyword as brand override
            // (For now, UI only supports single brand string, but DB stores array)
            if (isMounted) {
              setBrandOverrideState(data.brand_keywords[0]);
              setIsLoading(false);
            }
            return;
          }
        } catch (error) {
          console.error('[useBrandOverride] Database load failed, falling back to localStorage:', error);
        }
      }

      // Fall back to localStorage
      const overrides = getBrandOverrides();
      const override = overrides[appId] || null;
      if (isMounted) {
        setBrandOverrideState(override);
        setIsLoading(false);
      }
    }

    loadBrandOverride();

    return () => {
      isMounted = false;
    };
  }, [appId, organizationId, monitoredAppId]);

  // Set brand override (async)
  const setBrandOverride = useCallback(async (brand: string) => {
    if (!appId) {
      console.warn('[useBrandOverride] Cannot set brand override without appId');
      return;
    }

    // Save to localStorage immediately (optimistic update)
    const overrides = getBrandOverrides();
    overrides[appId] = brand;
    saveBrandOverrides(overrides);
    setBrandOverrideState(brand);

    // If monitored app, also save to database
    if (monitoredAppId && organizationId) {
      try {
        const { error } = await supabase
          .from('monitored_apps')
          .update({ brand_keywords: [brand] }) // Store as array in database
          .eq('id', monitoredAppId)
          .eq('organization_id', organizationId);

        if (error) {
          console.error('[useBrandOverride] Failed to save to database:', error);
          // But we already saved to localStorage, so user still sees their input
        } else {
          console.log(`[useBrandOverride] Saved brand "${brand}" to database for monitored app ${monitoredAppId}`);
        }
      } catch (error) {
        console.error('[useBrandOverride] Database save error:', error);
      }
    }
  }, [appId, organizationId, monitoredAppId]);

  // Clear brand override (async)
  const clearBrandOverride = useCallback(async () => {
    if (!appId) {
      console.warn('[useBrandOverride] Cannot clear brand override without appId');
      return;
    }

    // Clear from localStorage immediately (optimistic update)
    const overrides = getBrandOverrides();
    delete overrides[appId];
    saveBrandOverrides(overrides);
    setBrandOverrideState(null);

    // If monitored app, also clear from database
    if (monitoredAppId && organizationId) {
      try {
        const { error } = await supabase
          .from('monitored_apps')
          .update({ brand_keywords: null })
          .eq('id', monitoredAppId)
          .eq('organization_id', organizationId);

        if (error) {
          console.error('[useBrandOverride] Failed to clear from database:', error);
        } else {
          console.log(`[useBrandOverride] Cleared brand from database for monitored app ${monitoredAppId}`);
        }
      } catch (error) {
        console.error('[useBrandOverride] Database clear error:', error);
      }
    }
  }, [appId, organizationId, monitoredAppId]);

  return [brandOverride, setBrandOverride, clearBrandOverride];
}
