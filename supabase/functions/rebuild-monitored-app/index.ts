/**
 * Rebuild Monitored App Edge Function
 *
 * Purpose: Fixes invalid/stale monitored app entries by:
 * 1. Fetching fresh metadata from app store
 * 2. Generating new audit snapshot
 * 3. Updating cache
 * 4. Marking as 'valid'
 *
 * Called by:
 * - Frontend (when user opens workspace page with invalid entry)
 * - Scheduled validation job (hourly cleanup)
 * - Manual recovery operations
 *
 * Idempotent: Safe to call multiple times
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createClient,
  SupabaseClient
} from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveUserPermissions } from '../_shared/auth-utils.ts';
import { corsHeaders } from '../_shared/cors.ts';

// ==================== TYPES ====================

interface RebuildRequest {
  monitored_app_id: string;
}

interface RebuildResponse {
  success: boolean;
  data?: {
    validated_state: 'valid' | 'invalid' | 'stale';
    metadata_cached: boolean;
    audit_created: boolean;
    audit_score?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// ==================== UTILITIES ====================

/**
 * Computes SHA256 hash for metadata versioning
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
 * Fetches app metadata from appstore-metadata edge function
 */
async function fetchAppMetadata(
  appId: string,
  platform: 'ios' | 'android',
  locale: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<any> {
  console.log('[rebuild-monitored-app] Fetching metadata:', appId, platform, locale);

  if (platform === 'ios') {
    const metadataUrl = `${supabaseUrl}/functions/v1/appstore-metadata?id=${appId}&country=${locale}`;

    const response = await fetch(metadataUrl, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      console.error('[rebuild-monitored-app] Metadata fetch failed:', response.status);
      throw new Error(`Metadata fetch failed with status ${response.status}`);
    }

    return await response.json();
  }

  // Android not yet implemented
  throw new Error('Android metadata fetching not yet implemented');
}

/**
 * Phase 19: Call Bible-driven metadata-audit-v2 edge function
 */
async function callMetadataAuditV2(
  supabase: SupabaseClient,
  metadata: any,
  organizationId: string
): Promise<{auditResult: any; kpiResult: any; auditHash: string} | null> {
  try {
    console.log('[rebuild-monitored-app] Calling metadata-audit-v2 for Bible-driven audit');

    const { data, error } = await supabase.functions.invoke('metadata-audit-v2', {
      body: {
        metadata,
        organization_id: organizationId,
        skipPlaceholder: true
      }
    });

    if (error) {
      console.error('[rebuild-monitored-app] metadata-audit-v2 error:', error);
      return null;
    }

    if (!data || !data.audit) {
      console.warn('[rebuild-monitored-app] metadata-audit-v2 returned no audit data');
      return null;
    }

    // Compute audit hash
    const auditForHash = {
      overallScore: data.audit.overallScore || 0,
      metadataScore: data.audit.metadataScore || 0
    };
    const auditStr = JSON.stringify(auditForHash);
    const encoder = new TextEncoder();
    const auditData = encoder.encode(auditStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', auditData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const auditHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      auditResult: data.audit,
      kpiResult: data.kpi || null,
      auditHash
    };
  } catch (err) {
    console.error('[rebuild-monitored-app] Failed to call metadata-audit-v2:', err);
    return null;
  }
}

// ==================== MAIN HANDLER ====================

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    // Authenticate user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid authentication' }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { monitored_app_id }: RebuildRequest = await req.json();

    if (!monitored_app_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Missing monitored_app_id' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[rebuild-monitored-app] Rebuilding:', monitored_app_id);

    // Resolve organization permissions
    const permissions = await resolveUserPermissions(supabase, user.id);

    if (!permissions || !permissions.org_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'FORBIDDEN', message: 'No organization access' }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organization_id = permissions.org_id;

    // ========================================================================
    // STEP 1: Fetch monitored app (RLS-protected)
    // ========================================================================
    const { data: monitoredApp, error: fetchError } = await supabase
      .from('monitored_apps')
      .select('*')
      .eq('id', monitored_app_id)
      .eq('organization_id', organization_id) // RLS safety
      .single();

    if (fetchError || !monitoredApp) {
      console.error('[rebuild-monitored-app] Monitored app not found:', fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Monitored app not found or access denied' }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[rebuild-monitored-app] Found app:', monitoredApp.app_name);

    const { app_id, platform, locale } = monitoredApp;

    // ========================================================================
    // STEP 2: Fetch fresh metadata
    // ========================================================================
    let metadata: any;
    try {
      metadata = await fetchAppMetadata(
        app_id,
        platform,
        locale || 'us',
        supabaseUrl,
        supabaseKey
      );
    } catch (metadataError) {
      console.error('[rebuild-monitored-app] Metadata fetch failed:', metadataError);

      // Mark as invalid and return error
      await supabase
        .from('monitored_apps')
        .update({
          validated_state: 'invalid',
          validated_at: new Date().toISOString(),
          validation_error: `Metadata fetch failed: ${metadataError.message}`
        })
        .eq('id', monitored_app_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'METADATA_FETCH_FAILED',
            message: 'Failed to fetch app metadata',
            details: metadataError.message
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // STEP 3: Compute version hash and upsert cache
    // ========================================================================
    const title = metadata.title || metadata.name || null;
    const subtitle = metadata.subtitle || null;
    const description = metadata.description || null;
    const developerName = metadata.developer_name || metadata.developer || null;
    const screenshots = metadata.screenshots || [];
    const iconUrl = metadata.app_icon_url || metadata.icon || null;

    const version_hash = await computeVersionHash({
      title,
      subtitle,
      description,
      developerName,
      screenshots
    });

    const cachePayload = {
      organization_id,
      app_id,
      platform,
      locale: locale || 'us',
      title,
      subtitle,
      description,
      developer_name: developerName,
      app_icon_url: iconUrl,
      screenshots,
      app_json: metadata,
      version_hash,
      fetched_at: new Date().toISOString(),
      screenshot_captions: [],
      feature_cards: [],
      preview_analysis: {},
      _metadata_source: 'rebuild'
    };

    const { error: cacheError } = await supabase
      .from('app_metadata_cache')
      .upsert(cachePayload, {
        onConflict: 'organization_id,app_id,platform,locale',
        ignoreDuplicates: false
      });

    if (cacheError) {
      console.error('[rebuild-monitored-app] Cache upsert failed:', cacheError);
      throw new Error(`Cache upsert failed: ${cacheError.message}`);
    }

    console.log('[rebuild-monitored-app] ✓ Metadata cached');

    // ========================================================================
    // STEP 4: Generate Bible-driven audit snapshot (Phase 19)
    // ========================================================================
    const bibleAudit = await callMetadataAuditV2(supabase, metadata, organization_id);

    if (!bibleAudit) {
      console.error('[rebuild-monitored-app] Bible audit generation failed');
      throw new Error('Bible audit generation failed');
    }

    // Extract KPI scores
    const kpiResult = bibleAudit.kpiResult;
    const kpiOverallScore = kpiResult?.overallScore || null;
    const kpiFamilyScores = kpiResult?.families ? Object.fromEntries(
      Object.entries(kpiResult.families).map(([k, v]: [string, any]) => [k, v.score || 0])
    ) : null;

    const snapshotPayload = {
      monitored_app_id: monitored_app_id,
      organization_id,
      app_id,
      platform,
      locale: locale || 'us',
      title,
      subtitle,
      description,
      // Store FULL Bible audit as JSONB
      audit_result: bibleAudit.auditResult,
      overall_score: Math.round(bibleAudit.auditResult.overallScore || 0),
      // KPI Engine results
      kpi_result: kpiResult,
      kpi_overall_score: kpiOverallScore ? Math.round(kpiOverallScore) : null,
      kpi_family_scores: kpiFamilyScores,
      // Bible metadata
      bible_metadata: {
        ruleset: 'default',
        version: 'v2',
        timestamp: new Date().toISOString()
      },
      audit_version: 'v2',
      kpi_version: kpiResult ? 'v1' : null,
      metadata_version_hash: version_hash,
      audit_hash: bibleAudit.auditHash,
      source: 'manual' // User-triggered rebuild
    };

    const { error: snapshotError } = await supabase
      .from('aso_audit_snapshots')
      .insert(snapshotPayload);

    if (snapshotError) {
      console.error('[rebuild-monitored-app] Snapshot insert failed:', snapshotError);
      throw new Error(`Snapshot insert failed: ${snapshotError.message}`);
    }

    console.log('[rebuild-monitored-app] ✓ Bible audit snapshot created');

    const overallScore = Math.round(bibleAudit.auditResult.overallScore || 0);

    // ========================================================================
    // STEP 5: Update monitored_apps with validation state
    // ========================================================================
    await supabase
      .from('monitored_apps')
      .update({
        validated_state: 'valid',
        validated_at: new Date().toISOString(),
        validation_error: null,
        latest_audit_score: overallScore,
        latest_audit_at: new Date().toISOString(),
        metadata_last_refreshed_at: new Date().toISOString()
      })
      .eq('id', monitored_app_id);

    console.log('[rebuild-monitored-app] ✓ Rebuild complete');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          validated_state: 'valid',
          metadata_cached: true,
          audit_created: true,
          audit_score: overallScore
        }
      } as RebuildResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[rebuild-monitored-app] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error occurred',
          details: error.message
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
