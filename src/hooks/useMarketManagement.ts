/**
 * useMarketManagement Hook
 *
 * Custom hook for managing multi-market monitoring operations.
 * Handles adding/removing markets for monitored apps.
 *
 * Features:
 * - Add market: Fetch fresh metadata from App Store
 * - Remove market: Delete with CASCADE (removes audits too)
 * - Get markets: List all monitored markets for an app
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppStoreIntegrationService } from '@/services/appstore-integration.service';
import { MarketCacheService } from '@/services/marketCache.service';
import type { MarketCode } from '@/config/markets';

export interface MonitoredAppMarket {
  id: string;
  monitored_app_id: string;
  organization_id: string;
  market_code: MarketCode;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  is_active: boolean;
  is_available: boolean;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseMarketManagementReturn {
  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  addMarket: (appId: string, marketCode: MarketCode, organizationId: string) => Promise<boolean>;
  removeMarket: (appId: string, marketCode: MarketCode) => Promise<boolean>;
  getAppMarkets: (appId: string) => Promise<MonitoredAppMarket[]>;
  clearError: () => void;
}

export const useMarketManagement = (): UseMarketManagementReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Add a new market to an existing monitored app
   *
   * Flow:
   * 1. Fetch fresh metadata from App Store for the new market
   * 2. Create monitored_app_markets entry
   * 3. First audit will be created by background job
   */
  const addMarket = async (
    appId: string,
    marketCode: MarketCode,
    organizationId: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useMarketManagement] Adding market ${marketCode} to app ${appId}`);

      // Step 1: Get app details to fetch app_store_id
      const { data: appData, error: appError } = await supabase
        .from('monitored_apps')
        .select('app_store_id, app_name')
        .eq('id', appId)
        .single();

      if (appError || !appData) {
        throw new Error(`Failed to get app details: ${appError?.message || 'App not found'}`);
      }

      console.log(`[useMarketManagement] Fetching metadata for ${appData.app_name} in ${marketCode.toUpperCase()}`);

      // Step 2: Fetch fresh metadata from App Store for this market
      const searchResult = await AppStoreIntegrationService.searchApp(
        appData.app_store_id,
        organizationId,
        marketCode
      );

      if (!searchResult.success || !searchResult.data?.[0]) {
        throw new Error(searchResult.error || 'Failed to fetch app metadata from App Store');
      }

      const metadata = searchResult.data[0];

      console.log(`[useMarketManagement] Metadata fetched successfully:`, {
        title: metadata.title,
        locale: metadata.locale,
        hasIcon: !!metadata.icon,
      });

      // Step 3: Check if market already exists (safeguard)
      const { data: existingMarket } = await supabase
        .from('monitored_app_markets')
        .select('id')
        .eq('monitored_app_id', appId)
        .eq('market_code', marketCode)
        .maybeSingle();

      if (existingMarket) {
        throw new Error(`Market ${marketCode.toUpperCase()} is already being monitored for this app`);
      }

      // Step 4: Create monitored_app_markets entry
      const { error: insertError } = await supabase
        .from('monitored_app_markets')
        .insert({
          monitored_app_id: appId,
          organization_id: organizationId,
          market_code: marketCode,
          title: metadata.title,
          subtitle: metadata.subtitle,
          description: metadata.description,
          is_active: true,
          is_available: true,
          last_fetched_at: new Date().toISOString(),
        });

      if (insertError) {
        throw new Error(`Failed to create market entry: ${insertError.message}`);
      }

      console.log(`✅ [useMarketManagement] Market ${marketCode.toUpperCase()} added successfully`);

      // Step 5: Warm the cache for this market
      console.log(`[useMarketManagement] Warming cache for market ${marketCode.toUpperCase()}`);
      await MarketCacheService.warmCacheForMarket(
        appData.app_store_id,
        marketCode,
        'ios',
        organizationId,
        {
          title: metadata.title,
          subtitle: metadata.subtitle || undefined,
          description: metadata.description || undefined,
          developer_name: metadata.developer || undefined,
          app_icon_url: metadata.icon || undefined,
          screenshots: (metadata as any).screenshots || [],
        }
      );

      setIsLoading(false);
      return true;

    } catch (err: any) {
      console.error('[useMarketManagement] Add market failed:', err);
      setError(err.message || 'Failed to add market');
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Remove a market from a monitored app
   *
   * WARNING: This will CASCADE DELETE all audit snapshots for this market!
   * User should be warned before calling this.
   */
  const removeMarket = async (
    appId: string,
    marketCode: MarketCode
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useMarketManagement] Removing market ${marketCode} from app ${appId}`);

      // Step 1: Get app_store_id for cache invalidation
      const { data: appData } = await supabase
        .from('monitored_apps')
        .select('app_store_id, organization_id')
        .eq('id', appId)
        .single();

      // Step 2: Delete the market (CASCADE will remove linked audits)
      const { error: deleteError } = await supabase
        .from('monitored_app_markets')
        .delete()
        .eq('monitored_app_id', appId)
        .eq('market_code', marketCode);

      if (deleteError) {
        throw new Error(`Failed to remove market: ${deleteError.message}`);
      }

      console.log(`✅ [useMarketManagement] Market ${marketCode.toUpperCase()} removed successfully`);

      // Step 3: Invalidate cache for this market
      if (appData) {
        console.log(`[useMarketManagement] Invalidating cache for market ${marketCode.toUpperCase()}`);
        await MarketCacheService.invalidateCache(
          appData.app_store_id,
          marketCode,
          'ios',
          appData.organization_id
        );
      }

      setIsLoading(false);
      return true;

    } catch (err: any) {
      console.error('[useMarketManagement] Remove market failed:', err);
      setError(err.message || 'Failed to remove market');
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Get all markets for an app
   *
   * Returns list of markets with their metadata and status
   */
  const getAppMarkets = async (appId: string): Promise<MonitoredAppMarket[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('monitored_app_markets')
        .select('*')
        .eq('monitored_app_id', appId)
        .order('market_code', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch markets: ${fetchError.message}`);
      }

      setIsLoading(false);
      return data || [];

    } catch (err: any) {
      console.error('[useMarketManagement] Get markets failed:', err);
      setError(err.message || 'Failed to fetch markets');
      setIsLoading(false);
      return [];
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  return {
    isLoading,
    error,
    addMarket,
    removeMarket,
    getAppMarkets,
    clearError,
  };
};
