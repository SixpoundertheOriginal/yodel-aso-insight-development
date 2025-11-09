import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AppCompetitor } from './useMonitoredApps';

/**
 * Fetch competitors for a specific target app
 */
export const useAppCompetitors = (targetAppId?: string) => {
  return useQuery({
    queryKey: ['app-competitors', targetAppId],
    queryFn: async (): Promise<AppCompetitor[]> => {
      if (!targetAppId) {
        throw new Error('Target app ID is required');
      }

      const { data, error } = await supabase
        .from('app_competitors')
        .select('*')
        .eq('target_app_id', targetAppId)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) {
        console.error('Error fetching app competitors:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!targetAppId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch ALL competitors across all monitored apps for an organization
 * Returns unique competitor apps that have been added to any monitored app
 */
export const useAllCompetitors = (organizationId?: string) => {
  return useQuery({
    queryKey: ['all-competitors', organizationId],
    queryFn: async (): Promise<AppCompetitor[]> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await supabase
        .from('app_competitors')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all competitors:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Add competitor to a target app
 * Takes App Store app data directly - no need for competitor to be monitored
 */
export const useAddCompetitor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      targetAppId,
      competitorAppStoreId,
      competitorAppName,
      competitorAppIcon,
      competitorBundleId,
      competitorDeveloper,
      competitorCategory,
      competitorRating,
      competitorReviewCount,
      country,
      context,
      priority = 1,
    }: {
      organizationId: string;
      targetAppId: string;
      competitorAppStoreId: string;
      competitorAppName: string;
      competitorAppIcon?: string;
      competitorBundleId?: string;
      competitorDeveloper?: string;
      competitorCategory?: string;
      competitorRating?: number;
      competitorReviewCount?: number;
      country: string;
      context?: string;
      priority?: number;
    }) => {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // Insert competitor relationship
      const { data, error } = await supabase
        .from('app_competitors')
        .insert({
          organization_id: organizationId,
          target_app_id: targetAppId,
          competitor_app_store_id: competitorAppStoreId,
          competitor_app_name: competitorAppName,
          competitor_app_icon: competitorAppIcon || null,
          competitor_bundle_id: competitorBundleId || null,
          competitor_developer: competitorDeveloper || null,
          competitor_category: competitorCategory || null,
          competitor_rating: competitorRating || null,
          competitor_review_count: competitorReviewCount || null,
          country,
          comparison_context: context || null,
          priority,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate key error
        if (error.code === '23505') {
          throw new Error('This competitor is already added for this country');
        }
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.competitorAppName} added as competitor!`);
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['app-competitors', variables.targetAppId] });
    },
    onError: (error: any) => {
      console.error('Error adding competitor:', error);
      toast.error(error.message || 'Failed to add competitor');
    },
  });
};

/**
 * Remove competitor from a target app
 */
export const useRemoveCompetitor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitorId,
      targetAppId,
    }: {
      competitorId: string;
      targetAppId: string;
    }) => {
      const { error } = await supabase
        .from('app_competitors')
        .delete()
        .eq('id', competitorId);

      if (error) throw error;

      return { targetAppId };
    },
    onSuccess: (result) => {
      toast.success('Competitor removed');
      queryClient.invalidateQueries({ queryKey: ['app-competitors', result.targetAppId] });
    },
    onError: (error: any) => {
      console.error('Error removing competitor:', error);
      toast.error('Failed to remove competitor');
    },
  });
};

/**
 * Update competitor priority (for reordering)
 */
export const useUpdateCompetitorPriority = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitorId,
      targetAppId,
      priority,
    }: {
      competitorId: string;
      targetAppId: string;
      priority: number;
    }) => {
      const { error } = await supabase
        .from('app_competitors')
        .update({ priority })
        .eq('id', competitorId);

      if (error) throw error;

      return { targetAppId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['app-competitors', result.targetAppId] });
    },
    onError: (error: any) => {
      console.error('Error updating competitor priority:', error);
      toast.error('Failed to update priority');
    },
  });
};

/**
 * Update comparison summary cache after running analysis
 */
export const useUpdateComparisonSummary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetAppId,
      competitorAppStoreId,
      summary,
    }: {
      targetAppId: string;
      competitorAppStoreId: string;
      summary: any; // CompetitiveIntelligence JSON
    }) => {
      const { error } = await supabase
        .from('app_competitors')
        .update({
          comparison_summary: summary,
          last_compared_at: new Date().toISOString(),
        })
        .eq('target_app_id', targetAppId)
        .eq('competitor_app_store_id', competitorAppStoreId);

      if (error) throw error;

      return { targetAppId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['app-competitors', result.targetAppId] });
    },
    onError: (error: any) => {
      console.error('Error updating comparison summary:', error);
    },
  });
};
