/**
 * usePersistAuditSnapshot Hook
 *
 * Persists frontend audit results to database for caching and historical tracking.
 *
 * This hook solves the critical issue where useEnhancedAppAudit generates rich
 * audit data on the frontend but never persists it to the database.
 *
 * Call this hook after audit completion to:
 * 1. Write metadata to app_metadata_cache (for fast re-loading)
 * 2. Write audit snapshot to audit_snapshots (for historical comparison)
 * 3. Optionally update monitored_apps latest_audit_score
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ScrapedMetadata } from '@/types/aso';

/**
 * Enhanced audit data structure from useEnhancedAppAudit
 */
interface EnhancedAuditData {
  overallScore: number;
  metadataScore: number;
  keywordScore: number;
  competitorScore: number;
  creativeScore: number;
  opportunityCount: number;
  rankDistribution: any;
  keywordClusters: any[];
  keywordTrends: any[];
  competitorAnalysis: any[];
  currentKeywords: string[];
  metadataAnalysis: {
    scores: any;
    recommendations: any[];
    combinations?: any[];
    metrics?: any;
    insights?: any;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    category: 'metadata' | 'keywords' | 'competitors';
    impact: number;
  }>;
  narratives?: any;
  brandRisk?: any;
}

/**
 * Input for persisting audit snapshot
 */
export interface PersistAuditSnapshotInput {
  organizationId: string;
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
  metadata: ScrapedMetadata;
  auditData: EnhancedAuditData;
  updateMonitoredApp?: boolean; // If true, also updates monitored_apps.latest_audit_score
}

/**
 * Computes SHA256 hash for metadata versioning
 * Copied from edge function logic for consistency
 */
async function computeVersionHash(input: {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  developerName?: string | null;
  screenshots?: string[] | null;
}): Promise<string> {
  const title = input.title?.trim() || '';
  const subtitle = input.subtitle?.trim() || '';
  const description = input.description?.trim() || '';
  const developerName = input.developerName?.trim() || '';
  const screenshots = input.screenshots || [];

  const screenshotsStr = screenshots.join(',');
  const combined = `${title}|${subtitle}|${description}|${developerName}|[${screenshotsStr}]`;

  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Hook to persist audit snapshot to database
 */
export function usePersistAuditSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PersistAuditSnapshotInput) => {
      console.log('[usePersistAuditSnapshot] Persisting audit for:', input.app_id);

      // ========================================================================
      // STEP 1: Compute version hash
      // ========================================================================
      const version_hash = await computeVersionHash({
        title: input.metadata.title || input.metadata.name,
        subtitle: input.metadata.subtitle || input.metadata.appStoreSubtitle,
        description: input.metadata.description,
        developerName: input.metadata.developer,
        screenshots: input.metadata.screenshots || []
      });

      console.log('[usePersistAuditSnapshot] Version hash:', version_hash);

      // ========================================================================
      // STEP 2: Upsert metadata cache
      // ========================================================================
      const cachePayload = {
        organization_id: input.organizationId,
        app_id: input.app_id,
        platform: input.platform,
        locale: input.locale,
        title: input.metadata.title || input.metadata.name || null,
        subtitle: input.metadata.subtitle || input.metadata.appStoreSubtitle || null,
        description: input.metadata.description || null,
        developer_name: input.metadata.developer || null,
        app_icon_url: input.metadata.icon || null,
        screenshots: input.metadata.screenshots || [],
        app_json: null, // Don't store raw UI metadata (privacy)
        version_hash,
        fetched_at: new Date().toISOString(),
        screenshot_captions: [],
        feature_cards: [],
        preview_analysis: {},
        _metadata_source: 'ui' // Track source for debugging
      };

      const { data: metadataCache, error: cacheError } = await supabase
        .from('app_metadata_cache')
        .upsert(cachePayload, {
          onConflict: 'organization_id,app_id,platform,locale',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (cacheError) {
        console.error('[usePersistAuditSnapshot] Failed to upsert cache:', cacheError);
        throw new Error(`Failed to cache metadata: ${cacheError.message}`);
      }

      console.log('[usePersistAuditSnapshot] ✓ Metadata cached:', metadataCache.id);

      // ========================================================================
      // STEP 3: Create audit snapshot
      // ========================================================================
      const snapshotPayload = {
        organization_id: input.organizationId,
        app_id: input.app_id,
        platform: input.platform,
        locale: input.locale,
        title: cachePayload.title,
        subtitle: cachePayload.subtitle,
        // Use metadataAnalysis if available, fallback to empty structures
        combinations: input.auditData.metadataAnalysis?.combinations || [],
        metrics: input.auditData.metadataAnalysis?.metrics || {
          longTailStrength: 0,
          intentDiversity: 0,
          categoryCoverage: 0,
          redundancyIndex: 0,
          avgFillerRatio: 0
        },
        insights: input.auditData.metadataAnalysis?.insights || {
          missingClusters: [],
          potentialCombos: [],
          estimatedGain: 0,
          actionableInsights: []
        },
        audit_score: Math.round(input.auditData.overallScore),
        metadata_version_hash: version_hash,
        metadata_source: 'live', // This is a fresh UI audit
        competitor_overlap: {},
        metadata_health: {
          metadataScore: input.auditData.metadataScore,
          keywordScore: input.auditData.keywordScore,
          competitorScore: input.auditData.competitorScore,
          creativeScore: input.auditData.creativeScore,
          opportunityCount: input.auditData.opportunityCount
        },
        metadata_version: 'v2' // Enhanced frontend audit
      };

      const { data: auditSnapshot, error: snapshotError } = await supabase
        .from('audit_snapshots')
        .insert(snapshotPayload)
        .select()
        .single();

      if (snapshotError) {
        console.error('[usePersistAuditSnapshot] Failed to create snapshot:', snapshotError);
        throw new Error(`Failed to create audit snapshot: ${snapshotError.message}`);
      }

      console.log('[usePersistAuditSnapshot] ✓ Audit snapshot created:', auditSnapshot.id);

      // ========================================================================
      // STEP 4: Update monitored_apps if requested
      // ========================================================================
      if (input.updateMonitoredApp) {
        const { error: updateError } = await supabase
          .from('monitored_apps')
          .update({
            latest_audit_score: Math.round(input.auditData.overallScore),
            latest_audit_at: new Date().toISOString(),
            metadata_last_refreshed_at: new Date().toISOString()
          })
          .eq('organization_id', input.organizationId)
          .eq('app_id', input.app_id)
          .eq('platform', input.platform);

        if (updateError) {
          console.warn('[usePersistAuditSnapshot] Failed to update monitored_apps:', updateError);
          // Non-fatal - snapshot was saved successfully
        } else {
          console.log('[usePersistAuditSnapshot] ✓ Monitored app updated');
        }
      }

      return {
        metadataCache,
        auditSnapshot
      };
    },
    onSuccess: (result, variables) => {
      console.log('[usePersistAuditSnapshot] Success:', {
        cacheId: result.metadataCache.id,
        snapshotId: result.auditSnapshot.id,
        score: result.auditSnapshot.audit_score
      });

      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ['monitored-audit', variables.organizationId]
      });
      queryClient.invalidateQueries({
        queryKey: ['app-metadata-cache', variables.organizationId, variables.app_id]
      });
      queryClient.invalidateQueries({
        queryKey: ['audit-snapshots', variables.organizationId, variables.app_id]
      });
    },
    onError: (error) => {
      console.error('[usePersistAuditSnapshot] Error:', error);
      toast.error('Failed to save audit results', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
