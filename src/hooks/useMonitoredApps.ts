import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabaseCompat } from '@/lib/supabase-compat';
import { toast } from 'sonner';

export interface MonitoredApp {
  id: string;
  organization_id: string;
  app_id: string; // Platform-agnostic: iTunes ID for iOS, Package ID for Android
  platform: 'ios' | 'android'; // App platform
  app_name: string;
  bundle_id: string | null;
  app_icon_url: string | null;
  developer_name: string | null;
  category: string | null;
  primary_country: string;
  monitor_type: 'reviews' | 'ratings' | 'both';
  tags: string[] | null;
  notes: string | null;
  snapshot_rating: number | null;
  snapshot_review_count: number | null;
  snapshot_taken_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_checked_at: string | null;

  // Google Play specific fields (Android only)
  play_store_package_id: string | null;
  play_store_url: string | null;

  // Backward compatibility alias
  app_store_id?: string; // Deprecated: use app_id instead
}

/**
 * App Competitor Relationship
 * Links a target app to its competitors (by App Store ID)
 * NOTE: Competitors do NOT need to be monitored apps
 */
export interface AppCompetitor {
  id: string;
  organization_id: string;
  target_app_id: string;

  // Competitor app data (NOT a monitored app)
  competitor_app_store_id: string;  // iTunes App Store ID
  competitor_app_name: string;
  competitor_app_icon: string | null;
  competitor_bundle_id: string | null;
  competitor_developer: string | null;
  competitor_category: string | null;

  // Snapshot data
  competitor_rating: number | null;
  competitor_review_count: number | null;
  country: string;

  // Metadata
  comparison_context: string | null;
  priority: number;
  is_active: boolean;

  // Analysis cache
  last_compared_at: string | null;
  comparison_summary: any | null;  // CompetitiveIntelligence JSON

  // Tracking
  created_at: string;
  created_by: string | null;
}

/**
 * Fetch monitored apps for an organization
 */
export const useMonitoredApps = (organizationId?: string) => {
  return useQuery({
    queryKey: ['monitored-apps', organizationId],
    queryFn: async (): Promise<MonitoredApp[]> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await supabaseCompat.fromAny('monitored_apps')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching monitored apps:', error);
        throw error;
      }

      return (data || []) as MonitoredApp[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Add an app to monitoring
 */
export const useAddMonitoredApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      appStoreId,
      appName,
      bundleId,
      appIconUrl,
      developerName,
      category,
      primaryCountry,
      monitorType = 'reviews',
      tags = [],
      notes,
      snapshotRating,
      snapshotReviewCount,
    }: {
      organizationId: string;
      appStoreId: string;
      appName: string;
      bundleId?: string;
      appIconUrl?: string;
      developerName?: string;
      category?: string;
      primaryCountry: string;
      monitorType?: 'reviews' | 'ratings' | 'both';
      tags?: string[];
      notes?: string;
      snapshotRating?: number;
      snapshotReviewCount?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error} = await supabaseCompat.fromAny('monitored_apps')
        .insert({
          organization_id: organizationId,
          app_store_id: appStoreId,
          app_name: appName,
          bundle_id: bundleId || null,
          app_icon_url: appIconUrl || null,
          developer_name: developerName || null,
          category: category || null,
          primary_country: primaryCountry,
          monitor_type: monitorType,
          tags: tags.length > 0 ? tags : null,
          notes: notes || null,
          snapshot_rating: snapshotRating || null,
          snapshot_review_count: snapshotReviewCount || null,
          snapshot_taken_at: snapshotRating ? new Date().toISOString() : null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate key error
        if (error.code === '23505') {
          throw new Error(`This app is already being monitored in ${primaryCountry.toUpperCase()}`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(`Now monitoring ${variables.appName}!`);
      queryClient.invalidateQueries({ queryKey: ['monitored-apps', variables.organizationId] });
    },
    onError: (error: any) => {
      console.error('Error adding monitored app:', error);
      toast.error(error.message || 'Failed to add app to monitoring');
    },
  });
};

/**
 * Update monitored app (tags, notes, etc.)
 */
export const useUpdateMonitoredApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appId,
      organizationId,
      tags,
      notes,
      monitorType,
    }: {
      appId: string;
      organizationId: string;
      tags?: string[];
      notes?: string;
      monitorType?: 'reviews' | 'ratings' | 'both';
    }) => {
      const updateData: any = {};
      if (tags !== undefined) updateData.tags = tags.length > 0 ? tags : null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (monitorType) updateData.monitor_type = monitorType;

      const { error } = await supabaseCompat.fromAny('monitored_apps')
        .update(updateData)
        .eq('id', appId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Monitoring settings updated');
      queryClient.invalidateQueries({ queryKey: ['monitored-apps', variables.organizationId] });
    },
    onError: (error: any) => {
      console.error('Error updating monitored app:', error);
      toast.error('Failed to update monitoring settings');
    },
  });
};

/**
 * Remove monitored app
 */
export const useRemoveMonitoredApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appId,
      organizationId,
    }: {
      appId: string;
      organizationId: string;
    }) => {
      const { error } = await supabaseCompat.fromAny('monitored_apps')
        .delete()
        .eq('id', appId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('App removed from monitoring');
      queryClient.invalidateQueries({ queryKey: ['monitored-apps', variables.organizationId] });
    },
    onError: (error: any) => {
      console.error('Error removing monitored app:', error);
      toast.error('Failed to remove app');
    },
  });
};

/**
 * Update last checked timestamp
 */
export const useUpdateLastChecked = () => {
  return useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabaseCompat.fromAny('monitored_apps')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', appId);

      if (error) throw error;
    },
  });
};
