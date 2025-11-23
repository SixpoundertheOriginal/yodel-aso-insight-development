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
import { getKeyFromMetadata } from '@/utils/monitoringKeys';

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
      // STEP 0: Normalize composite key (CRITICAL for cache hits)
      // ========================================================================
      const normalizedKey = getKeyFromMetadata(input.organizationId, {
        appId: input.app_id,
        platform: input.platform,
        locale: input.locale
      });

      console.log('[usePersistAuditSnapshot] Normalized key:', {
        app_id: normalizedKey.app_id,
        platform: normalizedKey.platform,
        locale: normalizedKey.locale
      });

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
      // STEP 2: Upsert metadata cache (using normalized key)
      // ========================================================================
      const cachePayload = {
        organization_id: normalizedKey.organization_id,
        app_id: normalizedKey.app_id,
        platform: normalizedKey.platform,
        locale: normalizedKey.locale,
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
      // STEP 3: Find or create monitored_app (for aso_audit_snapshots FK)
      // ========================================================================
      const { data: existingMonitoredApp } = await supabase
        .from('monitored_apps')
        .select('id')
        .eq('organization_id', normalizedKey.organization_id)
        .eq('app_id', normalizedKey.app_id)
        .eq('platform', normalizedKey.platform)
        .maybeSingle();

      let monitored_app_id = existingMonitoredApp?.id;

      // If no monitored app exists, create one (for audit history tracking)
      if (!monitored_app_id) {
        const { data: newMonitoredApp, error: createError } = await supabase
          .from('monitored_apps')
          .insert({
            organization_id: normalizedKey.organization_id,
            app_id: normalizedKey.app_id,
            platform: normalizedKey.platform,
            app_name: input.metadata.name || input.metadata.title || 'Unknown App',
            locale: normalizedKey.locale,
            primary_country: normalizedKey.locale,
            monitor_type: 'audit',
            audit_enabled: false, // Not actively monitored, just storing audits
            bundle_id: input.metadata.bundleId || null,
            app_icon_url: input.metadata.icon || null,
            developer_name: input.metadata.developer || null,
            category: input.metadata.applicationCategory || null
          })
          .select('id')
          .single();

        if (createError) {
          console.warn('[usePersistAuditSnapshot] Failed to create monitored_app:', createError);
          // Continue without monitored_app_id (will fail snapshot insert, but acceptable)
        } else {
          monitored_app_id = newMonitoredApp.id;
          console.log('[usePersistAuditSnapshot] ✓ Monitored app created:', monitored_app_id);
        }
      }

      // ========================================================================
      // STEP 4: Create Bible-driven audit snapshot (Phase 19)
      // ========================================================================
      // Note: This is frontend-generated audit data, not full Bible audit
      // When user clicks "Monitor App", edge function will generate proper Bible audit

      // Compute audit hash for deduplication
      const auditResultForHash = {
        overallScore: input.auditData.overallScore,
        metadataScore: input.auditData.metadataScore,
        keywordScore: input.auditData.keywordScore
      };
      const auditStr = JSON.stringify(auditResultForHash);
      const encoder = new TextEncoder();
      const data = encoder.encode(auditStr);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const audit_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const snapshotPayload = {
        monitored_app_id,
        organization_id: normalizedKey.organization_id,
        app_id: normalizedKey.app_id,
        platform: normalizedKey.platform,
        locale: normalizedKey.locale,
        title: cachePayload.title,
        subtitle: cachePayload.subtitle,
        description: cachePayload.description,
        // Store full frontend audit data as JSONB
        audit_result: {
          overallScore: input.auditData.overallScore,
          metadataScore: input.auditData.metadataScore,
          keywordScore: input.auditData.keywordScore,
          competitorScore: input.auditData.competitorScore,
          creativeScore: input.auditData.creativeScore,
          opportunityCount: input.auditData.opportunityCount,
          metadataAnalysis: input.auditData.metadataAnalysis,
          recommendations: input.auditData.recommendations,
          currentKeywords: input.auditData.currentKeywords,
          // Mark as frontend audit
          source: 'frontend',
          engine: 'useEnhancedAppAudit'
        },
        overall_score: Math.round(input.auditData.overallScore),
        kpi_result: null, // Frontend audit doesn't have KPI Engine
        kpi_overall_score: null,
        kpi_family_scores: null,
        bible_metadata: {
          source: 'frontend',
          note: 'Frontend-generated audit. Click "Monitor App" for full Bible-driven audit.',
          timestamp: new Date().toISOString()
        },
        audit_version: 'v2-frontend',
        kpi_version: null,
        metadata_version_hash: version_hash,
        audit_hash,
        source: 'manual' // User-triggered from UI
      };

      const { data: auditSnapshot, error: snapshotError } = await supabase
        .from('aso_audit_snapshots') // NEW TABLE (Phase 19)
        .insert(snapshotPayload)
        .select()
        .single();

      if (snapshotError) {
        console.error('[usePersistAuditSnapshot] Failed to create snapshot:', snapshotError);
        throw new Error(`Failed to create audit snapshot: ${snapshotError.message}`);
      }

      console.log('[usePersistAuditSnapshot] ✓ Audit snapshot created:', auditSnapshot.id);

      // ========================================================================
      // STEP 5: Update monitored_apps if requested (using normalized key)
      // ========================================================================
      if (input.updateMonitoredApp && monitored_app_id) {
        const { error: updateError } = await supabase
          .from('monitored_apps')
          .update({
            latest_audit_score: Math.round(input.auditData.overallScore),
            latest_audit_at: new Date().toISOString(),
            metadata_last_refreshed_at: new Date().toISOString(),
            validated_state: 'valid',
            validated_at: new Date().toISOString(),
            validation_error: null
          })
          .eq('id', monitored_app_id);

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
      queryClient.invalidateQueries({
        queryKey: ['aso-audit-snapshots', variables.organizationId, variables.app_id]
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
