/**
 * useMonitoredAppForAudit Hook
 *
 * React Query hook for managing monitored apps with ASO audit support.
 * Provides functionality to check, save, and manage apps for continuous audit tracking.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MonitoredAppWithAudit, SaveMonitoredAppResponse } from '@/modules/app-monitoring';
import type { ScrapedMetadata } from '@/types/aso';

/**
 * Normalized metadata structure sent from UI to edge function
 * This ensures metadata is ALWAYS available even if server fetch fails
 */
export interface NormalizedAppMetadata {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  developer_name?: string | null;
  app_icon_url?: string | null;
  screenshots?: string[];
  categories?: string[];
  rating?: number | null;
  review_count?: number | null;
  price?: string | null;
  // Additional fields for audit engine
  [key: string]: unknown;
}

/**
 * Input for saving/monitoring an app
 */
export interface SaveMonitoredAppInput {
  organizationId: string; // CRITICAL: Required for proper cache invalidation
  app_id: string;
  platform: 'ios' | 'android';
  app_name: string;
  locale?: string;
  bundle_id?: string | null;
  app_icon_url?: string | null;
  developer_name?: string | null;
  category?: string | null;
  primary_country?: string;
  audit_enabled?: boolean;
  tags?: string[] | null;
  notes?: string | null;

  /**
   * CRITICAL: Client-provided metadata
   * This is the metadata already fetched by the UI from Apple/Google servers.
   * Including this prevents the edge function from needing to re-fetch,
   * which eliminates CORS, rate-limiting, and geo-blocking issues.
   */
  metadata?: NormalizedAppMetadata;

  /**
   * CRITICAL: Pre-computed audit snapshot from frontend
   * If provided, the edge function will save this high-quality audit
   * instead of generating a placeholder audit on the server.
   */
  auditSnapshot?: {
    audit_score: number;
    combinations: any[];
    metrics: any;
    insights: any;
    metadata_health?: any;
  };
}

/**
 * Converts ScrapedMetadata from UI to NormalizedAppMetadata for edge function
 * This ensures we send only the fields needed for caching and audit generation
 */
export function normalizeMetadata(scraped: ScrapedMetadata): NormalizedAppMetadata {
  return {
    title: scraped.title || scraped.name || '',
    subtitle: scraped.subtitle || scraped.appStoreSubtitle || null,
    description: scraped.description || null,
    developer_name: scraped.developer || null,
    app_icon_url: scraped.icon || null,
    screenshots: scraped.screenshots || [],
    categories: scraped.applicationCategory ? [scraped.applicationCategory] : [],
    rating: scraped.rating || null,
    review_count: scraped.reviews || null,
    price: scraped.price || null,
    // Pass through additional fields that might be useful for audit
    subtitleSource: scraped.subtitleSource,
    locale: scraped.locale,
  };
}

/**
 * Hook to check if an app is monitored for audit
 */
export function useIsAppMonitored(
  app_id: string,
  platform: 'ios' | 'android',
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['monitored-app', organizationId, app_id, platform],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('monitored_apps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_id', app_id)
        .eq('platform', platform)
        .eq('audit_enabled', true)
        .maybeSingle();

      if (error) {
        console.error('[useIsAppMonitored] Error:', error);
        throw error;
      }

      return data as MonitoredAppWithAudit | null;
    },
    enabled: Boolean(organizationId && app_id && platform)
  });
}

/**
 * Hook to save/monitor an app for audit
 */
export function useSaveMonitoredApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveMonitoredAppInput) => {
      console.log('[useSaveMonitoredApp] Saving app:', input.app_id, input.platform);

      // Call save-monitored-app edge function
      const { data, error } = await supabase.functions.invoke('save-monitored-app', {
        body: input
      });

      if (error) {
        console.error('[useSaveMonitoredApp] Edge function error:', error);
        throw new Error(error.message || 'Failed to save monitored app');
      }

      const response = data as SaveMonitoredAppResponse;

      if (!response.success) {
        console.error('[useSaveMonitoredApp] Workflow failed:', response.error);
        throw new Error(response.error?.message || 'Failed to save monitored app');
      }

      // Check for partial failures (only warn on critical failures)
      if (response.partial && response.partial.failureReason) {
        if (response.partial.acceptableFailure) {
          // Acceptable failure - log but don't warn user
          console.warn('[useSaveMonitoredApp] Acceptable partial failure:', response.partial.failureReason);
        } else {
          // Critical failure - warn user
          console.error('[useSaveMonitoredApp] Critical partial failure:', response.partial.failureReason);
          toast.warning(
            `App monitored, but: ${response.partial.failureReason}`,
            { duration: 5000 }
          );
        }
      }

      return response;
    },
    onSuccess: (response, variables) => {
      console.log('[useSaveMonitoredApp] Success:', response.data?.monitoredApp?.id);

      toast.success('App successfully monitored for ASO audit tracking', {
        description: `Latest audit score: ${response.data?.monitoredApp?.latest_audit_score || 'N/A'}`
      });

      // Invalidate relevant queries with organizationId for proper cache busting
      queryClient.invalidateQueries({
        queryKey: ['monitored-app', variables.organizationId, variables.app_id, variables.platform]
      });
      queryClient.invalidateQueries({
        queryKey: ['monitored-apps-audit', variables.organizationId]
      });
      queryClient.invalidateQueries({
        queryKey: ['audit-snapshots', variables.organizationId, variables.app_id]
      });
    },
    onError: (error) => {
      console.error('[useSaveMonitoredApp] Error:', error);
      toast.error('Failed to monitor app', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Hook to fetch all audit-enabled monitored apps for workspace
 */
export function useAuditEnabledApps(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['monitored-apps-audit', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('monitored_apps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('audit_enabled', true)
        .order('latest_audit_at', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) {
        console.error('[useAuditEnabledApps] Error:', error);
        throw error;
      }

      return (data || []) as MonitoredAppWithAudit[];
    },
    enabled: Boolean(organizationId)
  });
}

/**
 * Hook to remove an app from audit monitoring
 */
export function useRemoveMonitoredApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      app_id,
      platform,
      organizationId,
      deleteSnapshots = false
    }: {
      app_id: string;
      platform: 'ios' | 'android';
      organizationId: string;
      deleteSnapshots?: boolean;
    }) => {
      console.log('[useRemoveMonitoredApp] Removing app:', app_id, platform);

      // Call delete-monitored-app edge function for proper cleanup
      const { data, error } = await supabase.functions.invoke('delete-monitored-app', {
        body: {
          app_id,
          platform,
          deleteSnapshots
        }
      });

      if (error) {
        console.error('[useRemoveMonitoredApp] Edge function error:', error);
        throw new Error(error.message || 'Failed to remove monitored app');
      }

      if (!data?.success) {
        console.error('[useRemoveMonitoredApp] Removal failed:', data?.error);
        throw new Error(data?.error?.message || 'Failed to remove monitored app');
      }

      console.log('[useRemoveMonitoredApp] Success:', data);
      return { app_id, platform };
    },
    onSuccess: (result, variables) => {
      console.log('[useRemoveMonitoredApp] Success:', result.app_id);

      toast.success('App removed from audit monitoring');

      // Invalidate queries with organizationId
      queryClient.invalidateQueries({
        queryKey: ['monitored-app', variables.organizationId, result.app_id, result.platform]
      });
      queryClient.invalidateQueries({
        queryKey: ['monitored-apps-audit', variables.organizationId]
      });
    },
    onError: (error) => {
      console.error('[useRemoveMonitoredApp] Error:', error);
      toast.error('Failed to remove app', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Hook to toggle audit enablement for a monitored app
 */
export function useToggleAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      app_id,
      platform,
      organizationId,
      enabled
    }: {
      app_id: string;
      platform: 'ios' | 'android';
      organizationId: string;
      enabled: boolean;
    }) => {
      console.log('[useToggleAudit] Toggling audit:', app_id, platform, enabled);

      const { data, error } = await supabase
        .from('monitored_apps')
        .update({ audit_enabled: enabled })
        .eq('organization_id', organizationId)
        .eq('app_id', app_id)
        .eq('platform', platform)
        .select()
        .single();

      if (error) {
        console.error('[useToggleAudit] Error:', error);
        throw error;
      }

      return data as MonitoredAppWithAudit;
    },
    onSuccess: (result, variables) => {
      console.log('[useToggleAudit] Success:', result.id);

      toast.success(
        variables.enabled ? 'Audit monitoring enabled' : 'Audit monitoring disabled'
      );

      // Invalidate queries with organizationId
      queryClient.invalidateQueries({
        queryKey: ['monitored-app', variables.organizationId, variables.app_id, variables.platform]
      });
      queryClient.invalidateQueries({
        queryKey: ['monitored-apps-audit', variables.organizationId]
      });
    },
    onError: (error) => {
      console.error('[useToggleAudit] Error:', error);
      toast.error('Failed to toggle audit', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
