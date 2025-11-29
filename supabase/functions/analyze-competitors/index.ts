/**
 * Analyze Competitors Edge Function
 *
 * Fetches and analyzes multiple competitor apps to identify:
 * - Missing keywords (keywords competitors use but target app doesn't)
 * - Missing combos (combos competitors have but target app doesn't)
 * - Opportunity scores (which keywords/combos give best ROI)
 * - Frequency gaps (keyword usage comparison)
 *
 * Features:
 * - Rate-limited fetching (2 concurrent, 1s delay between batches)
 * - 24h caching via competitor_comparison_cache
 * - Progress tracking via streaming response
 * - Automatic storage in app_competitors table
 *
 * Flow:
 * 1. Fetch target app metadata (or use existing audit)
 * 2. Fetch competitor metadata (rate-limited, with retries)
 * 3. Run MetadataAuditEngine.evaluate() for each competitor
 * 4. Perform gap analysis (missing keywords, combos, opportunities)
 * 5. Store competitors in app_competitors table
 * 6. Cache results for 24h
 *
 * @module supabase/functions/analyze-competitors
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { MetadataAuditEngine } from '../_shared/metadata-audit-engine.ts';
import type { UnifiedMetadataAuditResult, KeywordFrequencyResult } from '../_shared/metadata-audit-engine.ts';

// =====================================================================
// TYPES
// =====================================================================

interface AnalyzeCompetitorsRequest {
  targetAppId: string; // App Store ID of target app
  competitorAppStoreIds: string[]; // Max 10 competitor App Store IDs
  organizationId: string; // For RLS and storage
  forceRefresh?: boolean; // Bypass cache
  // v2.1: Optional monitored app ID to fetch brand keywords
  monitoredAppId?: string;
  // v2.1: Optional existing audit result to reuse (avoid re-audit)
  targetAudit?: UnifiedMetadataAuditResult;
}

interface CompetitorAnalysisResult {
  appStoreId: string;
  name: string;
  subtitle: string | null;
  audit: UnifiedMetadataAuditResult;
  fetchedAt: string;
}

interface GapAnalysisResult {
  // Missing Keywords: Keywords competitors use but target doesn't
  missingKeywords: Array<{
    keyword: string;
    usedByCompetitors: number; // How many competitors use it
    avgFrequency: number; // Average combo count across competitors
    topCompetitor: string; // Competitor using it most
    opportunityScore: number; // 0-100 (higher = better ROI)
  }>;

  // Missing Combos: Combos competitors have but target doesn't
  missingCombos: Array<{
    combo: string;
    usedByCompetitors: number;
    topCompetitor: string;
    opportunityScore: number;
  }>;

  // Frequency Gaps: Keywords target uses less than competitors
  frequencyGaps: Array<{
    keyword: string;
    targetFrequency: number;
    competitorAvgFrequency: number;
    gap: number; // competitor avg - target
    recommendation: string;
  }>;

  // Summary Stats
  summary: {
    totalMissingKeywords: number;
    totalMissingCombos: number;
    totalFrequencyGaps: number;
    avgCompetitorKeywordCount: number;
    targetKeywordCount: number;
    avgCompetitorComboCount: number;
    targetComboCount: number;
  };
}

interface AnalyzeCompetitorsData {
  targetApp: {
    appStoreId: string;
    name: string;
    subtitle: string | null;
    audit: UnifiedMetadataAuditResult;
  };
  competitors: CompetitorAnalysisResult[];
  gapAnalysis: GapAnalysisResult;
}

interface AnalyzeCompetitorsResponse {
  success: boolean;
  data?: AnalyzeCompetitorsData;
  cached?: boolean; // True if returned from cache
  cachedAt?: string; // When cache was created
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Fetch app metadata using HTML scraping (via appstore-html-fetch edge function)
 * This ensures we get the subtitle field which iTunes API doesn't provide
 */
async function fetchAppMetadata(
  appStoreId: string,
  country: string = 'us',
  supabaseUrl: string,
  supabaseKey: string
) {
  try {
    console.log(`[ANALYZE-COMPETITORS] Fetching metadata for ${appStoreId} via HTML scraping...`);

    // Call appstore-html-fetch edge function
    const htmlFetchUrl = `${supabaseUrl}/functions/v1/appstore-html-fetch`;
    const response = await fetch(htmlFetchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appId: appStoreId,
        country: country,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTML fetch returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'HTML fetch failed');
    }

    // v2.1: Debug - Log HTML fetch response
    console.log(`[ANALYZE-COMPETITORS] HTML fetch response for ${appStoreId}:`, {
      ok: data.ok,
      dataSource: data.dataSource,
      name: data.name,
      title: data.title,
      subtitle: data.subtitle,
      subtitleLength: data.subtitle?.length || 0,
      hasDescription: !!data.description,
      htmlLength: data.htmlLength,
      errors: data.errors,
    });

    // Extract metadata from HTML fetch response
    return {
      appStoreId: appStoreId,
      name: data.name || data.title || 'Unknown',
      subtitle: data.subtitle || null,
      description: data.description || '',
      developer: data.developer || null,
      iconUrl: null, // HTML scraping doesn't provide icon URL
    };
  } catch (error) {
    console.error(`[ANALYZE-COMPETITORS] Failed to fetch ${appStoreId}:`, error);
    throw error;
  }
}

/**
 * Fetch multiple competitors with rate limiting
 * Batch size: 2 concurrent, 2s delay between batches (slower for HTML scraping)
 */
async function fetchCompetitorsWithRateLimit(
  appStoreIds: string[],
  country: string = 'us',
  supabaseUrl: string,
  supabaseKey: string
) {
  const results = [];
  const batchSize = 2; // Keep at 2 concurrent requests
  const delayMs = 2000; // Increase to 2s for HTML scraping (was 1s for iTunes API)

  for (let i = 0; i < appStoreIds.length; i += batchSize) {
    const batch = appStoreIds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(appStoreIds.length / batchSize);

    console.log(`[ANALYZE-COMPETITORS] Fetching batch ${batchNum}/${totalBatches} (${batch.length} apps)`);

    // Fetch batch in parallel with retry logic
    const batchResults = await Promise.allSettled(
      batch.map((appStoreId) =>
        retryWithBackoff(() =>
          fetchAppMetadata(appStoreId, country, supabaseUrl, supabaseKey)
        )
      )
    );

    // Collect successful results
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('[ANALYZE-COMPETITORS] Batch fetch error:', result.reason);
      }
    }

    // Delay before next batch
    if (i + batchSize < appStoreIds.length) {
      console.log(`[ANALYZE-COMPETITORS] Waiting ${delayMs}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 500
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt); // Exponential: 500ms, 1s, 2s
        console.log(`[ANALYZE-COMPETITORS] Retry attempt ${attempt + 1}/${maxRetries - 1} after ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Perform gap analysis between target app and competitors
 */
function analyzeGaps(
  targetAudit: UnifiedMetadataAuditResult,
  competitorAudits: Array<{ name: string; audit: UnifiedMetadataAuditResult }>
): GapAnalysisResult {
  console.log('[ANALYZE-COMPETITORS] Performing gap analysis...');

  // Extract target keywords and combos
  const targetKeywords = new Set([
    ...(targetAudit.keywordCoverage?.titleKeywords || []),
    ...(targetAudit.keywordCoverage?.subtitleNewKeywords || []),
  ]);

  const targetCombos = new Set([
    ...(targetAudit.comboCoverage?.titleCombos || []),
    ...(targetAudit.comboCoverage?.subtitleNewCombos || []),
  ]);

  // Build keyword frequency map from target
  const targetKeywordFrequency = new Map<string, number>();
  if (targetAudit.keywordFrequency) {
    for (const kf of targetAudit.keywordFrequency) {
      targetKeywordFrequency.set(kf.keyword, kf.totalCombos);
    }
  }

  // Collect competitor keywords and combos
  const competitorKeywordUsage = new Map<string, { count: number; frequencies: number[]; competitors: string[] }>();
  const competitorComboUsage = new Map<string, { count: number; competitors: string[] }>();

  for (const { name, audit } of competitorAudits) {
    // Collect keywords
    const keywords = new Set([
      ...(audit.keywordCoverage?.titleKeywords || []),
      ...(audit.keywordCoverage?.subtitleNewKeywords || []),
    ]);

    for (const keyword of keywords) {
      if (!competitorKeywordUsage.has(keyword)) {
        competitorKeywordUsage.set(keyword, { count: 0, frequencies: [], competitors: [] });
      }
      const usage = competitorKeywordUsage.get(keyword)!;
      usage.count++;
      usage.competitors.push(name);

      // Track frequency
      const freq = audit.keywordFrequency?.find((kf) => kf.keyword === keyword)?.totalCombos || 0;
      usage.frequencies.push(freq);
    }

    // Collect combos
    const combos = new Set([
      ...(audit.comboCoverage?.titleCombos || []),
      ...(audit.comboCoverage?.subtitleNewCombos || []),
    ]);

    for (const combo of combos) {
      if (!competitorComboUsage.has(combo)) {
        competitorComboUsage.set(combo, { count: 0, competitors: [] });
      }
      const usage = competitorComboUsage.get(combo)!;
      usage.count++;
      usage.competitors.push(name);
    }
  }

  // 1. Missing Keywords (keywords competitors use but target doesn't)
  const missingKeywords = Array.from(competitorKeywordUsage.entries())
    .filter(([keyword]) => !targetKeywords.has(keyword))
    .map(([keyword, usage]) => {
      const avgFrequency = usage.frequencies.length > 0
        ? usage.frequencies.reduce((a, b) => a + b, 0) / usage.frequencies.length
        : 0;

      // Opportunity Score: Higher if used by more competitors and has high frequency
      const opportunityScore = Math.min(100, Math.round(
        (usage.count / competitorAudits.length) * 50 + // 50% based on competitor usage
        (avgFrequency / 10) * 50 // 50% based on frequency
      ));

      return {
        keyword,
        usedByCompetitors: usage.count,
        avgFrequency: Math.round(avgFrequency * 10) / 10,
        topCompetitor: usage.competitors[0],
        opportunityScore,
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 20); // Top 20 opportunities

  // 2. Missing Combos (combos competitors have but target doesn't)
  const missingCombos = Array.from(competitorComboUsage.entries())
    .filter(([combo]) => !targetCombos.has(combo))
    .map(([combo, usage]) => {
      const opportunityScore = Math.min(100, Math.round(
        (usage.count / competitorAudits.length) * 100
      ));

      return {
        combo,
        usedByCompetitors: usage.count,
        topCompetitor: usage.competitors[0],
        opportunityScore,
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 20); // Top 20 opportunities

  // 3. Frequency Gaps (keywords target uses less than competitors)
  const frequencyGaps = Array.from(competitorKeywordUsage.entries())
    .filter(([keyword]) => targetKeywords.has(keyword)) // Only keywords target already has
    .map(([keyword, usage]) => {
      const targetFreq = targetKeywordFrequency.get(keyword) || 0;
      const avgCompetitorFreq = usage.frequencies.length > 0
        ? usage.frequencies.reduce((a, b) => a + b, 0) / usage.frequencies.length
        : 0;
      const gap = avgCompetitorFreq - targetFreq;

      return {
        keyword,
        targetFrequency: targetFreq,
        competitorAvgFrequency: Math.round(avgCompetitorFreq * 10) / 10,
        gap: Math.round(gap * 10) / 10,
        recommendation: gap > 3
          ? `Consider using "${keyword}" in more combinations (competitors average ${Math.round(avgCompetitorFreq)} combos)`
          : `Frequency is competitive`,
      };
    })
    .filter((g) => g.gap > 1) // Only show significant gaps
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 20); // Top 20 gaps

  // 4. Summary Stats
  const avgCompetitorKeywordCount = competitorAudits.length > 0
    ? competitorAudits.reduce((sum, c) => sum + (c.audit.keywordCoverage?.totalUniqueKeywords || 0), 0) / competitorAudits.length
    : 0;

  const avgCompetitorComboCount = competitorAudits.length > 0
    ? competitorAudits.reduce((sum, c) => sum + (c.audit.comboCoverage?.totalCombos || 0), 0) / competitorAudits.length
    : 0;

  console.log(`[ANALYZE-COMPETITORS] Gap analysis complete: ${missingKeywords.length} missing keywords, ${missingCombos.length} missing combos, ${frequencyGaps.length} frequency gaps`);

  return {
    missingKeywords,
    missingCombos,
    frequencyGaps,
    summary: {
      totalMissingKeywords: missingKeywords.length,
      totalMissingCombos: missingCombos.length,
      totalFrequencyGaps: frequencyGaps.length,
      avgCompetitorKeywordCount: Math.round(avgCompetitorKeywordCount),
      targetKeywordCount: targetAudit.keywordCoverage?.totalUniqueKeywords || 0,
      avgCompetitorComboCount: Math.round(avgCompetitorComboCount),
      targetComboCount: targetAudit.comboCoverage?.totalCombos || 0,
    },
  };
}

/**
 * Get or create monitored_app record for a competitor (by App Store ID)
 * Returns the monitored_app UUID
 */
async function getOrCreateMonitoredApp(
  supabase: any,
  appStoreId: string,
  metadata: { name: string; subtitle: string | null; developer: string | null },
  organizationId: string,
  country: string = 'us'
): Promise<string | null> {
  try {
    // Check if monitored_app already exists for this org + app + country
    const { data: existingApp, error: selectError } = await supabase
      .from('monitored_apps')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('app_store_id', appStoreId)
      .eq('primary_country', country)
      .maybeSingle();

    if (selectError) {
      console.error('[ANALYZE-COMPETITORS] Error checking for existing monitored_app:', selectError);
      return null;
    }

    if (existingApp) {
      console.log(`[ANALYZE-COMPETITORS] Found existing monitored_app: ${existingApp.id}`);
      return existingApp.id;
    }

    // Create new monitored_app record
    console.log(`[ANALYZE-COMPETITORS] Creating new monitored_app for ${appStoreId} (${metadata.name})`);

    const { data: newApp, error: insertError } = await supabase
      .from('monitored_apps')
      .insert({
        organization_id: organizationId,
        app_store_id: appStoreId,
        app_name: metadata.name,
        developer_name: metadata.developer,
        primary_country: country,
        monitor_type: 'competitor', // Tag as competitor app
        tags: ['competitor'], // Add competitor tag
        notes: `Auto-created from competitive analysis on ${new Date().toISOString().split('T')[0]}`,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[ANALYZE-COMPETITORS] Error creating monitored_app:', insertError);
      return null;
    }

    console.log(`[ANALYZE-COMPETITORS] Created monitored_app: ${newApp.id}`);
    return newApp.id;
  } catch (error) {
    console.error('[ANALYZE-COMPETITORS] Unexpected error in getOrCreateMonitoredApp:', error);
    return null;
  }
}

/**
 * Store competitor relationships in app_competitors table
 * Only called after successful analysis when monitoredAppId is provided
 */
async function storeCompetitorRelationships(
  supabase: any,
  targetMonitoredAppId: string,
  competitorAnalysis: CompetitorAnalysisResult[],
  organizationId: string,
  country: string = 'us'
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[ANALYZE-COMPETITORS] Storing ${competitorAnalysis.length} competitor relationships...`);

    const relationshipsToStore = [];

    // Get or create monitored_app records for each competitor
    for (const competitor of competitorAnalysis) {
      const competitorMonitoredAppId = await getOrCreateMonitoredApp(
        supabase,
        competitor.appStoreId,
        {
          name: competitor.name,
          subtitle: competitor.subtitle,
          developer: null, // TODO: Extract developer if available
        },
        organizationId,
        country
      );

      if (!competitorMonitoredAppId) {
        console.warn(`[ANALYZE-COMPETITORS] Failed to get/create monitored_app for ${competitor.name}`);
        continue;
      }

      // Check if relationship already exists
      const { data: existing, error: checkError } = await supabase
        .from('app_competitors')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('target_app_id', targetMonitoredAppId)
        .eq('competitor_app_id', competitorMonitoredAppId)
        .maybeSingle();

      if (checkError) {
        console.error('[ANALYZE-COMPETITORS] Error checking existing relationship:', checkError);
        continue;
      }

      if (existing) {
        // Update existing relationship
        console.log(`[ANALYZE-COMPETITORS] Updating existing relationship: ${existing.id}`);

        const { error: updateError } = await supabase
          .from('app_competitors')
          .update({
            last_compared_at: new Date().toISOString(),
            is_active: true, // Reactivate if was inactive
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('[ANALYZE-COMPETITORS] Error updating relationship:', updateError);
        }
      } else {
        // Create new relationship
        relationshipsToStore.push({
          organization_id: organizationId,
          target_app_id: targetMonitoredAppId,
          competitor_app_id: competitorMonitoredAppId,
          priority: 1, // Default priority
          is_active: true,
          last_compared_at: new Date().toISOString(),
          comparison_context: `Added via competitive analysis`,
        });
      }
    }

    // Insert new relationships in batch
    if (relationshipsToStore.length > 0) {
      console.log(`[ANALYZE-COMPETITORS] Inserting ${relationshipsToStore.length} new relationships...`);

      const { error: insertError } = await supabase
        .from('app_competitors')
        .insert(relationshipsToStore);

      if (insertError) {
        console.error('[ANALYZE-COMPETITORS] Error inserting relationships:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`[ANALYZE-COMPETITORS] ✅ Successfully stored ${relationshipsToStore.length} new competitor relationships`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('[ANALYZE-COMPETITORS] Unexpected error storing competitors:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store comparison results in cache
 */
async function storeComparisonCache(
  supabase: any,
  targetAppId: string,
  competitorAppStoreIds: string[],
  organizationId: string,
  analysisResult: AnalyzeCompetitorsData
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[ANALYZE-COMPETITORS] Storing comparison cache...');

    // Generate cache key
    const sortedCompetitorIds = [...competitorAppStoreIds].sort();
    const cacheKey = `${targetAppId}:${sortedCompetitorIds.join(',')}:default`;

    // Extract audit IDs for smart invalidation
    const sourceAuditIds = [
      // Target audit ID would go here if we had it stored
      // For now, just track competitor IDs
    ];

    // Prepare cache entry
    const cacheEntry = {
      organization_id: organizationId,
      target_app_id: targetAppId, // This needs to be the monitored_app UUID, not App Store ID
      comparison_config: {
        competitor_ids: competitorAppStoreIds,
        comparison_type: '1-to-many',
        included_insights: ['keyword', 'combo', 'frequency'],
      },
      comparison_data: analysisResult,
      source_audit_ids: sourceAuditIds,
      cache_key: cacheKey,
      is_stale: false,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      computation_time_ms: 0, // TODO: Track actual computation time
    };

    // Upsert cache entry (insert or update if cache_key already exists)
    const { error: upsertError } = await supabase
      .from('competitor_comparison_cache')
      .upsert(cacheEntry, {
        onConflict: 'cache_key',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('[ANALYZE-COMPETITORS] Error storing cache:', upsertError);
      return { success: false, error: upsertError.message };
    }

    console.log('[ANALYZE-COMPETITORS] ✅ Cache stored successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[ANALYZE-COMPETITORS] Unexpected error storing cache:', error);
    return { success: false, error: error.message };
  }
}

// =====================================================================
// MAIN HANDLER
// =====================================================================

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request
    const { targetAppId, competitorAppStoreIds, organizationId, forceRefresh = false, monitoredAppId, targetAudit } = await req.json() as AnalyzeCompetitorsRequest;

    console.log(`[ANALYZE-COMPETITORS] Starting analysis: target=${targetAppId}, competitors=${competitorAppStoreIds.length}, monitoredAppId=${monitoredAppId || 'none'}, reusingTargetAudit=${!!targetAudit}`);

    // Get Supabase credentials for calling appstore-html-fetch
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate input
    if (!targetAppId || !competitorAppStoreIds || !organizationId) {
      throw new Error('Missing required fields: targetAppId, competitorAppStoreIds, organizationId');
    }

    if (competitorAppStoreIds.length === 0) {
      throw new Error('No competitors specified');
    }

    if (competitorAppStoreIds.length > 10) {
      throw new Error('Maximum 10 competitors allowed');
    }

    // v2.1: Fetch target app's brand keywords (if monitored app)
    let targetBrandKeywords: string[] = [];
    if (monitoredAppId) {
      console.log(`[ANALYZE-COMPETITORS] Fetching brand keywords for monitored app ${monitoredAppId}...`);

      const { data: monitoredApp, error: monitoredAppError } = await supabase
        .from('monitored_apps')
        .select('brand_keywords')
        .eq('id', monitoredAppId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!monitoredAppError && monitoredApp?.brand_keywords) {
        targetBrandKeywords = monitoredApp.brand_keywords;
        console.log(`[ANALYZE-COMPETITORS] Loaded brand keywords: [${targetBrandKeywords.join(', ')}]`);
      } else {
        console.log(`[ANALYZE-COMPETITORS] No brand keywords found, will use auto-detection`);
      }
    }

    // Step 1: Check cache first (unless forceRefresh)
    if (monitoredAppId && !forceRefresh) {
      console.log('[ANALYZE-COMPETITORS] Checking cache...');

      const sortedCompetitorIds = [...competitorAppStoreIds].sort();
      const cacheKey = `${monitoredAppId}:${sortedCompetitorIds.join(',')}:default`;

      const { data: cachedResult, error: cacheError } = await supabase
        .from('competitor_comparison_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!cacheError && cachedResult) {
        const now = new Date();
        const expiresAt = new Date(cachedResult.expires_at);
        const isExpired = now > expiresAt;
        const isStale = cachedResult.is_stale || isExpired;

        console.log(`[ANALYZE-COMPETITORS] ✓ Cache found: key=${cacheKey}, stale=${isStale}, expires=${expiresAt.toISOString()}`);

        if (!isStale) {
          // Return cached result immediately
          console.log('[ANALYZE-COMPETITORS] ✅ Returning fresh cache (no analysis needed)');

          const response: AnalyzeCompetitorsResponse = {
            success: true,
            data: cachedResult.comparison_data,
            cached: true,
            cachedAt: cachedResult.created_at,
          };

          return new Response(JSON.stringify(response), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'X-Cache-Status': 'HIT',
            },
          });
        } else {
          console.log('[ANALYZE-COMPETITORS] Cache is stale, running fresh analysis...');
        }
      } else {
        console.log('[ANALYZE-COMPETITORS] No cache found, running fresh analysis...');
      }
    }

    // v2.1: Use provided targetAudit if available (avoid re-audit, ensure consistency)
    let targetMetadata: any;
    let finalTargetAudit: UnifiedMetadataAuditResult;

    if (targetAudit) {
      // Reuse existing audit result
      console.log(`[ANALYZE-COMPETITORS] ✓ Reusing existing target audit (${targetAudit.comboCoverage?.totalCombos || 0} combos)`);
      finalTargetAudit = targetAudit;

      // Extract metadata from audit result (v2.1: now includes text field)
      targetMetadata = {
        appStoreId: targetAppId,
        name: targetAudit.elements?.title?.metadata?.text || 'Unknown',
        subtitle: targetAudit.elements?.subtitle?.metadata?.text || null,
      };

      console.log(`[ANALYZE-COMPETITORS] Extracted from audit: name="${targetMetadata.name}", subtitle="${targetMetadata.subtitle}"`);
    } else {
      // Fetch and audit target app (original flow)
      console.log(`[ANALYZE-COMPETITORS] Fetching target app metadata...`);
      targetMetadata = await fetchAppMetadata(targetAppId, 'us', supabaseUrl, supabaseKey);

      console.log(`[ANALYZE-COMPETITORS] Running audit on target app...`);
      finalTargetAudit = await MetadataAuditEngine.evaluate({
        title: targetMetadata.name,
        subtitle: targetMetadata.subtitle || '',
        description: targetMetadata.description || '',
        name: targetMetadata.name,
      });
    }

    // Step 3: Fetch competitor metadata (rate-limited)
    console.log(`[ANALYZE-COMPETITORS] Fetching ${competitorAppStoreIds.length} competitors...`);
    const competitorMetadata = await fetchCompetitorsWithRateLimit(
      competitorAppStoreIds,
      'us',
      supabaseUrl,
      supabaseKey
    );

    console.log(`[ANALYZE-COMPETITORS] Successfully fetched ${competitorMetadata.length}/${competitorAppStoreIds.length} competitors`);

    // Step 4: Run audit on each competitor
    console.log(`[ANALYZE-COMPETITORS] Running audits on ${competitorMetadata.length} competitors...`);
    const competitorAnalysis: CompetitorAnalysisResult[] = [];

    for (const metadata of competitorMetadata) {
      try {
        console.log(`[ANALYZE-COMPETITORS] Analyzing ${metadata.name}:`, {
          name: metadata.name,
          subtitle: metadata.subtitle,
          subtitleLength: metadata.subtitle?.length || 0,
          hasDescription: !!metadata.description,
          competitorBrands: targetBrandKeywords.length > 0 ? targetBrandKeywords : '(auto-detect)',
          fullMetadata: metadata, // v2.1: Debug - see full object
        });

        // v2.1: Pass target brand keywords as competitor brands
        // This filters out combos containing the target app's brand from competitor audits
        const audit = await MetadataAuditEngine.evaluate({
          title: metadata.name,
          subtitle: metadata.subtitle || '',
          description: metadata.description || '',
          name: metadata.name,
          competitorBrandKeywords: targetBrandKeywords, // Filter target brand from competitor combos
        });

        console.log(`[ANALYZE-COMPETITORS] ✅ ${metadata.name} - Keywords: ${audit.keywordCoverage?.totalUniqueKeywords || 0}, Combos: ${audit.comboCoverage?.totalCombos || 0}`);

        competitorAnalysis.push({
          appStoreId: metadata.appStoreId,
          name: metadata.name,
          subtitle: metadata.subtitle,
          audit,
          fetchedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`[ANALYZE-COMPETITORS] ❌ Failed to analyze ${metadata.name}:`, error);
      }
    }

    // Step 5: Perform gap analysis
    const gapAnalysis = analyzeGaps(
      finalTargetAudit,
      competitorAnalysis.map((c) => ({ name: c.name, audit: c.audit }))
    );

    console.log('[ANALYZE-COMPETITORS] ✅ Analysis complete!');

    // Prepare response data
    const analysisData: AnalyzeCompetitorsData = {
      targetApp: {
        appStoreId: targetMetadata.appStoreId,
        name: targetMetadata.name,
        subtitle: targetMetadata.subtitle,
        audit: finalTargetAudit,
      },
      competitors: competitorAnalysis,
      gapAnalysis,
    };

    // Step 6: Store competitors in app_competitors table (after successful analysis)
    if (monitoredAppId) {
      console.log('[ANALYZE-COMPETITORS] Storing competitor relationships...');
      const storeResult = await storeCompetitorRelationships(
        supabase,
        monitoredAppId,
        competitorAnalysis,
        organizationId,
        'us'
      );

      if (!storeResult.success) {
        console.warn('[ANALYZE-COMPETITORS] ⚠️  Failed to store competitors:', storeResult.error);
        // Don't fail the entire request, just log the warning
      }
    } else {
      console.log('[ANALYZE-COMPETITORS] Skipping competitor storage (no monitoredAppId provided)');
    }

    // Step 7: Cache results in competitor_comparison_cache (24h TTL)
    // Note: Cache storage requires target_app_id to be monitored_app UUID, not App Store ID
    // For now, only cache if monitoredAppId is provided
    if (monitoredAppId && !forceRefresh) {
      console.log('[ANALYZE-COMPETITORS] Storing comparison cache...');
      const cacheResult = await storeComparisonCache(
        supabase,
        monitoredAppId, // Use monitored app UUID for cache
        competitorAppStoreIds,
        organizationId,
        analysisData
      );

      if (!cacheResult.success) {
        console.warn('[ANALYZE-COMPETITORS] ⚠️  Failed to store cache:', cacheResult.error);
        // Don't fail the entire request, just log the warning
      }
    }

    const response: AnalyzeCompetitorsResponse = {
      success: true,
      data: analysisData,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('[ANALYZE-COMPETITORS] ❌ Error:', error);

    const response: AnalyzeCompetitorsResponse = {
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: error.message || 'Unknown error',
        details: error,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
