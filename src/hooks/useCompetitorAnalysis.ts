/**
 * useCompetitorAnalysis Hook
 *
 * Manages the complete competitor analysis workflow:
 * 1. Load competitors
 * 2. Audit competitors
 * 3. Run comparison
 * 4. Cache results
 *
 * @module hooks/useCompetitorAnalysis
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  auditAllCompetitorsForApp,
  getLatestCompetitorAuditsForApp,
  type AuditCompetitorResult,
} from '@/services/competitor-audit.service';
import { attachAuditSnapshotMetadata } from '@/services/competitor-audit.telemetry';
import { validateCompetitorAudit } from '@/services/competitor-audit.validator';
import {
  compareWithCompetitors,
  getCachedComparison,
  type CompetitorComparisonResult,
} from '@/services/competitor-comparison.service';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { toast } from 'sonner';

interface UseCompetitorAnalysisOptions {
  targetAppId: string;
  organizationId: string;
  targetAudit: UnifiedMetadataAuditResult | null;
  targetMetadata: {
    title: string;
    subtitle: string;
    description: string;
  };
  autoLoad?: boolean; // Auto-load on mount
  ruleConfig?: {
    vertical?: string;
    market?: string;
  };
}

interface UseCompetitorAnalysisReturn {
  // State
  competitors: any[];
  competitorAudits: AuditCompetitorResult[];
  comparison: CompetitorComparisonResult | null;
  loading: boolean;
  auditing: boolean;
  comparing: boolean;
  error: string | null;

  // Actions
  loadCompetitors: () => Promise<void>;
  auditCompetitors: (forceRefresh?: boolean) => Promise<void>;
  runComparison: (providedAudits?: AuditCompetitorResult[]) => Promise<void>;
  refreshAll: () => Promise<void>;

  // Helpers
  hasCompetitors: boolean;
  hasAudits: boolean;
  hasComparison: boolean;
  needsAudit: boolean;
}

export function useCompetitorAnalysis(
  options: UseCompetitorAnalysisOptions
): UseCompetitorAnalysisReturn {
  const {
    targetAppId,
    organizationId,
    targetAudit,
    targetMetadata,
    autoLoad = true,
    ruleConfig,
  } = options;

  // State
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [competitorAudits, setCompetitorAudits] = useState<AuditCompetitorResult[]>([]);
  const [comparison, setComparison] = useState<CompetitorComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterValidAudits = useCallback((audits: AuditCompetitorResult[]) => {
    return audits
      .map((audit) => validateCompetitorAudit(audit, { context: 'useCompetitorAnalysis' }))
      .map((audit) => (audit ? attachAuditSnapshotMetadata(audit, audit.snapshotCreatedAt) : null))
      .filter((audit): audit is AuditCompetitorResult => Boolean(audit));
  }, []);

  // Load competitors from database
  const loadCompetitors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('app_competitors')
        .select('*')
        .eq('target_app_id', targetAppId)
        .eq('is_active', true);

      if (dbError) throw dbError;

      setCompetitors(data || []);

      // If competitors exist, try to load their audits
      if (data && data.length > 0) {
        const audits = await getLatestCompetitorAuditsForApp(targetAppId);
        const validAudits = filterValidAudits(audits);
        setCompetitorAudits(validAudits);

        // Try to load cached comparison
        if (validAudits.length > 0) {
          const competitorIds = validAudits.map((a) => a.competitorId);
          const cached = await getCachedComparison(targetAppId, competitorIds);
          if (cached) {
            setComparison(cached);
          }
        }
      }
    } catch (err: any) {
      console.error('[useCompetitorAnalysis] Failed to load competitors:', err);
      setError(err.message || 'Failed to load competitors');
    } finally {
      setLoading(false);
    }
  }, [targetAppId]);

  // Audit all competitors
  const auditCompetitors = useCallback(
    async (forceRefresh: boolean = false) => {
      if (competitors.length === 0) {
        toast.error('No competitors to audit');
        return;
      }

      try {
        setAuditing(true);
        setError(null);

        toast.info(`Auditing ${competitors.length} competitors...`);

        const results = await auditAllCompetitorsForApp(
          targetAppId,
          organizationId,
          ruleConfig,
          forceRefresh
        );

        const successfulAudits = filterValidAudits(
          results.filter((r) => !('error' in r)) as AuditCompetitorResult[]
        );
        const failedCount = results.filter((r) => 'error' in r).length;

        if (successfulAudits.length > 0) {
          setCompetitorAudits(successfulAudits);
          toast.success(`Successfully audited ${successfulAudits.length}/${competitors.length} competitors`);
        }

        if (failedCount > 0) {
          toast.warning(`${failedCount} audits failed`);
        }
      } catch (err: any) {
        console.error('[useCompetitorAnalysis] Failed to audit competitors:', err);
        setError(err.message || 'Failed to audit competitors');
        toast.error('Failed to audit competitors');
      } finally {
        setAuditing(false);
      }
    },
    [competitors, targetAppId, organizationId, ruleConfig]
  );

  // Run comparison
  const runComparison = useCallback(async (providedAudits?: AuditCompetitorResult[]) => {
    if (!targetAudit) {
      toast.error('Target app audit not available');
      return;
    }

    // Use provided audits or fall back to state
    const auditsToCompare = providedAudits || competitorAudits;
    const validAudits = filterValidAudits(auditsToCompare);

    if (validAudits.length === 0) {
      toast.error('No competitor audits available. Please audit competitors first.');
      return;
    }

    try {
      setComparing(true);
      setError(null);

      // Update state with provided audits if any
      if (providedAudits && providedAudits.length > 0) {
        setCompetitorAudits(validAudits);
      }

      toast.info('Comparing with competitors...');

      const result = await compareWithCompetitors({
        targetAppId,
        targetAudit,
        competitorAudits: validAudits,
        organizationId,
        comparisonType: '1-to-many',
        ruleConfig,
        targetMetadata,
      });

      setComparison(result);
      toast.success('Comparison complete');
    } catch (err: any) {
      console.error('[useCompetitorAnalysis] Failed to compare:', err);
      setError(err.message || 'Failed to run comparison');
      toast.error('Failed to compare with competitors');
    } finally {
      setComparing(false);
    }
  }, [targetAudit, competitorAudits, targetAppId, organizationId, ruleConfig, targetMetadata]);

  // Refresh all (load → audit → compare)
  const refreshAll = useCallback(async () => {
    await loadCompetitors();
    await auditCompetitors(true); // Force refresh
    await runComparison();
  }, [loadCompetitors, auditCompetitors, runComparison]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadCompetitors();
    }
  }, [autoLoad, loadCompetitors]);

  // Helpers
  const hasCompetitors = competitors.length > 0;
  const hasAudits = competitorAudits.length > 0;
  const hasComparison = comparison !== null;
  const needsAudit = competitors.length > 0 && competitorAudits.length === 0;

  return {
    // State
    competitors,
    competitorAudits,
    comparison,
    loading,
    auditing,
    comparing,
    error,

    // Actions
    loadCompetitors,
    auditCompetitors,
    runComparison,
    refreshAll,

    // Helpers
    hasCompetitors,
    hasAudits,
    hasComparison,
    needsAudit,
  };
}
