/**
 * Competitor Audit Service
 *
 * Runs the SAME metadata audit engine on competitor apps using ASO Brain.
 * Stores complete audit results in competitor_audit_snapshots table.
 *
 * Flow:
 * 1. Fetch competitor metadata (or use cached)
 * 2. Run full metadata audit engine
 * 3. Store audit snapshot with CASCADE DELETE
 * 4. Update competitor record with audit summary
 *
 * @module services/competitor-audit
 */

import { supabase } from '@/integrations/supabase/client';
import { MetadataAuditEngine } from '@/engine/metadata/metadataAuditEngine.legacy'; // TODO: Migrate competitor audit to edge function
import { fetchCompetitorMetadata, type CompetitorMetadataResult } from './competitor-metadata.service';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { validateCompetitorAudit } from './competitor-audit.validator';
import { attachAuditSnapshotMetadata } from './competitor-audit.telemetry';

// =====================================================================
// TYPE DEFINITIONS
// =====================================================================

export interface AuditCompetitorInput {
  competitorId: string; // UUID from app_competitors table
  targetAppId: string; // UUID of target app
  organizationId: string; // For RLS and rule context
  ruleConfig?: {
    vertical?: string;
    market?: string;
    useTargetAppRules?: boolean; // If true, use same rules as target app
  };
  forceRefresh?: boolean; // Bypass cache, fetch fresh metadata
}

export interface AuditCompetitorResult {
  auditId: string; // UUID of audit snapshot
  competitorId: string;
  metadata: CompetitorMetadataResult;
  auditData: UnifiedMetadataAuditResult;
  audit: UnifiedMetadataAuditResult;
  overallScore: number;
  cached: boolean; // Was audit pulled from cache?
  snapshotCreatedAt?: string;
}

export interface AuditCompetitorError {
  error: string;
  code:
    | 'COMPETITOR_NOT_FOUND'
    | 'METADATA_FETCH_FAILED'
    | 'AUDIT_FAILED'
    | 'STORAGE_FAILED'
    | 'UNKNOWN_ERROR';
  details?: any;
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Get competitor details from database
 */
async function getCompetitor(competitorId: string) {
  const { data, error } = await supabase
    .from('app_competitors')
    .select('*')
    .eq('id', competitorId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Check if recent audit exists (within 24 hours)
 */
async function getCachedAudit(
  competitorId: string
): Promise<AuditCompetitorResult | null> {
  const { data, error } = await supabase
    .from('competitor_audit_snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('status', 'completed')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  console.log(`[CompetitorAudit] ✅ Found cached audit (${data.id}) from ${data.created_at}`);

  const result: AuditCompetitorResult = {
    auditId: data.id,
    competitorId: data.competitor_id,
    metadata: data.metadata as CompetitorMetadataResult,
    auditData: data.audit_data as UnifiedMetadataAuditResult,
    audit: data.audit_data as UnifiedMetadataAuditResult,
    overallScore: data.overall_score || 0,
    cached: true,
    snapshotCreatedAt: data.created_at,
  };

  attachAuditSnapshotMetadata(result, data.created_at);

  return validateCompetitorAudit(result, { context: 'getCachedAudit' });
}

/**
 * Store audit snapshot in database
 */
async function storeAuditSnapshot(
  competitorId: string,
  targetAppId: string,
  organizationId: string,
  metadata: CompetitorMetadataResult,
  auditData: UnifiedMetadataAuditResult,
  ruleConfig: any
): Promise<{ auditId: string } | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('competitor_audit_snapshots')
      .insert({
        organization_id: organizationId,
        target_app_id: targetAppId,
        competitor_id: competitorId,
        metadata: metadata as any,
        audit_data: auditData as any,
        rule_config: ruleConfig,
        status: 'completed',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[CompetitorAudit] ❌ Error storing audit snapshot:', error);
      return { error: error.message };
    }

    console.log(`[CompetitorAudit] ✅ Stored audit snapshot: ${data.id}`);

    return { auditId: data.id };
  } catch (error: any) {
    console.error('[CompetitorAudit] ❌ Unexpected error storing snapshot:', error);
    return { error: error.message || 'Unknown error' };
  }
}

// =====================================================================
// PUBLIC API
// =====================================================================

/**
 * Audit a single competitor
 *
 * @param input - Competitor ID, rule config, and options
 * @returns Complete audit result or error
 *
 * @example
 * const result = await auditCompetitor({
 *   competitorId: 'uuid-123',
 *   targetAppId: 'uuid-456',
 *   organizationId: 'uuid-789',
 *   ruleConfig: {
 *     vertical: 'education',
 *     market: 'language_learning',
 *     useTargetAppRules: true
 *   }
 * });
 */
export async function auditCompetitor(
  input: AuditCompetitorInput
): Promise<AuditCompetitorResult | AuditCompetitorError> {
  const { competitorId, targetAppId, organizationId, ruleConfig = {}, forceRefresh = false } = input;

  console.log(`[CompetitorAudit] Starting audit for competitor: ${competitorId}`);

  // Step 1: Check for cached audit (unless force refresh)
  if (!forceRefresh) {
    const cachedAudit = await getCachedAudit(competitorId);
    if (cachedAudit) {
      console.log(`[CompetitorAudit] ✅ Using cached audit`);
      return cachedAudit;
    }
  }

  // Step 2: Get competitor details
  const competitor = await getCompetitor(competitorId);
  if (!competitor) {
    return {
      error: `Competitor not found: ${competitorId}`,
      code: 'COMPETITOR_NOT_FOUND',
    };
  }

  // Step 3: Fetch competitor metadata from App Store
  console.log(`[CompetitorAudit] Fetching metadata for App Store ID: ${competitor.competitor_app_store_id}`);

  const metadataResult = await fetchCompetitorMetadata({
    appStoreId: competitor.competitor_app_store_id,
    country: 'US', // TODO: Make configurable
  });

  if ('error' in metadataResult) {
    return {
      error: `Failed to fetch competitor metadata: ${metadataResult.error}`,
      code: 'METADATA_FETCH_FAILED',
      details: metadataResult,
    };
  }

  const metadata = metadataResult;

  // Step 4: Run ASO Brain metadata audit
  console.log(`[CompetitorAudit] Running metadata audit for: ${metadata.name}`);

  try {
    // Convert CompetitorMetadataResult to ScrapedMetadata (required by audit engine)
    const scrapedMetadata: ScrapedMetadata = {
      name: metadata.name,
      url: `https://apps.apple.com/us/app/id${metadata.appStoreId}`,
      appId: metadata.appStoreId,
      title: metadata.name,
      subtitle: metadata.subtitle || '',
      description: metadata.description || '',
      applicationCategory: metadata.category || undefined,
      locale: metadata.country.toLowerCase() || 'us',
      icon: metadata.iconUrl || undefined,
      developer: metadata.developerName || undefined,
      sellerName: metadata.developerName || undefined,
      platform: 'ios' as const,
      rating: metadata.rating || undefined,
      reviews: metadata.reviewCount || undefined,
      price: metadata.price || undefined,
    };

    const auditData = await MetadataAuditEngine.evaluate(scrapedMetadata);

    console.log(`[CompetitorAudit] ✅ Audit completed. Overall score: ${auditData.overallScore}`);

    // Step 5: Store audit snapshot
    const storeResult = await storeAuditSnapshot(
      competitorId,
      targetAppId,
      organizationId,
      metadata,
      auditData,
      ruleConfig
    );

    if ('error' in storeResult) {
      return {
        error: `Failed to store audit snapshot: ${storeResult.error}`,
        code: 'STORAGE_FAILED',
        details: storeResult,
      };
    }

    // Step 6: Return result
    const snapshotCreatedAt = new Date().toISOString();
    const result: AuditCompetitorResult = {
      auditId: storeResult.auditId,
      competitorId,
      metadata,
      auditData,
      audit: auditData,
      overallScore: auditData.kpis?.overall_score || 0,
      cached: false,
      snapshotCreatedAt,
    };

    attachAuditSnapshotMetadata(result, snapshotCreatedAt);

    const validated = validateCompetitorAudit(result, { context: 'auditCompetitor' });
    if (!validated) {
      return {
        error: 'Metadata audit failed validation',
        code: 'AUDIT_FAILED',
        details: { competitorId, reason: 'validation_failed' },
      };
    }

    return validated;
  } catch (error: any) {
    console.error('[CompetitorAudit] ❌ Audit failed:', error);
    return {
      error: `Metadata audit failed: ${error.message}`,
      code: 'AUDIT_FAILED',
      details: error,
    };
  }
}

/**
 * Audit multiple competitors with optional rate limiting
 *
 * NOTE: This function does NOT need rate limiting for the audit itself,
 * because each audit checks for 24h cache first (line 190).
 * Rate limiting is handled by fetchCompetitorMetadata (with retry logic).
 *
 * However, if you want to limit concurrent audits (e.g., for database load),
 * you can use the batchSize option.
 *
 * @param inputs - Array of competitor audit inputs
 * @param options - Optional rate limiting for concurrent audits
 * @returns Array of results (success or error per competitor)
 *
 * @example
 * const results = await auditMultipleCompetitors([
 *   {
 *     competitorId: 'uuid-1',
 *     targetAppId: 'uuid-target',
 *     organizationId: 'uuid-org',
 *     ruleConfig: { vertical: 'education' }
 *   },
 *   {
 *     competitorId: 'uuid-2',
 *     targetAppId: 'uuid-target',
 *     organizationId: 'uuid-org',
 *     ruleConfig: { vertical: 'education' }
 *   }
 * ], { batchSize: 5, onProgress: (c, t) => console.log(`${c}/${t}`) });
 */
export async function auditMultipleCompetitors(
  inputs: AuditCompetitorInput[],
  options?: {
    batchSize?: number; // Concurrent audits per batch (default: 5)
    delayBetweenBatches?: number; // Delay in ms between batches (default: 0)
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<(AuditCompetitorResult | AuditCompetitorError)[]> {
  const { batchSize = 5, delayBetweenBatches = 0, onProgress } = options || {};

  console.log(
    `[CompetitorAudit] Auditing ${inputs.length} competitors (batchSize: ${batchSize})`
  );

  const results: (AuditCompetitorResult | AuditCompetitorError)[] = [];
  let completed = 0;

  // Process in batches (if batchSize < inputs.length)
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(inputs.length / batchSize);

    if (totalBatches > 1) {
      console.log(
        `[CompetitorAudit] Processing batch ${batchNumber}/${totalBatches} (${batch.length} competitors)`
      );
    }

    // Audit batch in parallel (each audit has its own retry logic + cache check)
    const batchResults = await Promise.all(batch.map((input) => auditCompetitor(input)));

    results.push(...batchResults);
    completed += batch.length;

    // Report progress
    if (onProgress) {
      onProgress(completed, inputs.length);
    }

    // Delay before next batch (if configured)
    if (delayBetweenBatches > 0 && i + batchSize < inputs.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  const successCount = results.filter((r) => !('error' in r)).length;
  console.log(
    `[CompetitorAudit] ✅ ${successCount}/${inputs.length} competitors audited successfully`
  );

  return results;
}

/**
 * Audit all competitors for a target app
 *
 * @param targetAppId - UUID of target app
 * @param organizationId - Organization ID
 * @param ruleConfig - Optional rule configuration
 * @param forceRefresh - Force fresh metadata fetch
 * @returns Array of audit results
 *
 * @example
 * const results = await auditAllCompetitorsForApp(
 *   'target-app-uuid',
 *   'org-uuid',
 *   { vertical: 'education', market: 'language_learning' }
 * );
 */
export async function auditAllCompetitorsForApp(
  targetAppId: string,
  organizationId: string,
  ruleConfig?: {
    vertical?: string;
    market?: string;
    useTargetAppRules?: boolean;
  },
  forceRefresh: boolean = false
): Promise<(AuditCompetitorResult | AuditCompetitorError)[]> {
  console.log(`[CompetitorAudit] Fetching all competitors for app: ${targetAppId}`);

  // Get all active competitors for this app
  const { data: competitors, error } = await supabase
    .from('app_competitors')
    .select('id')
    .eq('target_app_id', targetAppId)
    .eq('is_active', true);

  if (error || !competitors || competitors.length === 0) {
    console.log(`[CompetitorAudit] No competitors found for app: ${targetAppId}`);
    return [];
  }

  console.log(`[CompetitorAudit] Found ${competitors.length} competitors to audit`);

  // Audit all competitors in parallel
  const inputs: AuditCompetitorInput[] = competitors.map((c) => ({
    competitorId: c.id,
    targetAppId,
    organizationId,
    ruleConfig,
    forceRefresh,
  }));

  return await auditMultipleCompetitors(inputs);
}

/**
 * Get latest audit for a competitor
 *
 * @param competitorId - Competitor UUID
 * @returns Latest audit result or null
 */
export async function getLatestCompetitorAudit(
  competitorId: string
): Promise<AuditCompetitorResult | null> {
  return await getCachedAudit(competitorId);
}

/**
 * Get all latest audits for a target app's competitors
 *
 * @param targetAppId - Target app UUID
 * @returns Array of latest audits
 */
export async function getLatestCompetitorAuditsForApp(
  targetAppId: string
): Promise<AuditCompetitorResult[]> {
  const { data, error } = await supabase.rpc('get_latest_competitor_audits_for_app', {
    p_target_app_id: targetAppId,
  });

  if (error || !data) {
    console.error('[CompetitorAudit] ❌ Error fetching latest audits:', error);
    return [];
  }

  return data
    .map((audit: any) => ({
      auditId: audit.id,
      competitorId: audit.competitor_id,
      metadata: audit.metadata as CompetitorMetadataResult,
      auditData: audit.audit_data as UnifiedMetadataAuditResult,
      audit: audit.audit_data as UnifiedMetadataAuditResult,
      overallScore: audit.overall_score || 0,
      cached: true,
      snapshotCreatedAt: audit.created_at,
    }))
    .map((result) => attachAuditSnapshotMetadata(result, result.snapshotCreatedAt))
    .map((result) => validateCompetitorAudit(result, { context: 'getLatestCompetitorAuditsForApp' }))
    .filter((result): result is AuditCompetitorResult => Boolean(result));
}

/**
 * Invalidate (mark stale) all audits for a target app
 *
 * @param targetAppId - Target app UUID
 * @returns Number of audits marked stale
 */
export async function invalidateCompetitorAudits(targetAppId: string): Promise<number> {
  const { data, error } = await supabase.rpc('invalidate_comparison_cache', {
    p_target_app_id: targetAppId,
  });

  if (error) {
    console.error('[CompetitorAudit] ❌ Error invalidating audits:', error);
    return 0;
  }

  console.log(`[CompetitorAudit] ✅ Marked ${data} audits as stale`);
  return data || 0;
}
