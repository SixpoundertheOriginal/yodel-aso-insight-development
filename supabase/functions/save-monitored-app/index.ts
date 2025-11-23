/**
 * Save Monitored App Edge Function
 *
 * Complete workflow for saving apps with ASO audit support:
 * 1. Authenticate user and resolve organization_id
 * 2. Create/update monitored_apps entry
 * 3. Fetch app metadata (with caching)
 * 4. Compute version_hash for change detection
 * 5. Upsert metadata cache
 * 6. Generate audit snapshot
 * 7. Update monitored_apps with audit results
 *
 * Partial Failure Handling: App save succeeds even if audit generation fails.
 * Timeout: Must complete in <45 seconds.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createClient,
  SupabaseClient
} from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveUserPermissions } from '../_shared/auth-utils.ts';
import { corsHeaders } from '../_shared/cors.ts';

// ==================== TYPES ====================

interface SaveMonitoredAppRequest {
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

  // ========================================================================
  // UI-PROVIDED DATA (prevents server re-fetch and improves audit quality)
  // ========================================================================

  /**
   * Metadata already fetched by the UI from Apple/Google servers.
   * If provided, the edge function will use this instead of re-fetching.
   * This eliminates CORS, rate-limiting, and geo-blocking issues.
   */
  metadata?: any; // NormalizedAppMetadata from UI

  /**
   * Pre-computed audit snapshot from frontend useEnhancedAppAudit.
   * If provided, the edge function will use this high-quality audit
   * instead of generating a placeholder audit.
   *
   * This is the RECOMMENDED path for best audit quality, as the frontend
   * has access to full metadataScoringService, semanticClusteringService, etc.
   */
  auditSnapshot?: {
    audit_score: number;
    combinations: any[];
    metrics: any;
    insights: any;
    metadata_health?: any;
  };
}

interface SaveMonitoredAppResponse {
  success: boolean;
  data?: {
    monitoredApp: any;
    metadataCache: any | null;
    auditSnapshot: any | null;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  partial?: {
    monitoredAppSaved: boolean;
    metadataCached: boolean;
    auditCreated: boolean;
    failureReason?: string;
  };
}


// ==================== VERSION HASH ====================

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

// ==================== METADATA FETCHING ====================

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
  console.log('[save-monitored-app] Fetching metadata for:', appId, platform, locale);

  // For iOS, use appstore-metadata edge function
  if (platform === 'ios') {
    const metadataUrl = `${supabaseUrl}/functions/v1/appstore-metadata?id=${appId}&country=${locale}`;

    const response = await fetch(metadataUrl, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      console.error('[save-monitored-app] Metadata fetch failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  }

  // For Android, use google-play-scraper or similar
  // TODO: Add Android support
  console.warn('[save-monitored-app] Android metadata fetching not yet implemented');
  return null;
}

// ==================== AUDIT GENERATION ====================

/**
 * Phase 19: Call Bible-driven metadata-audit-v2 edge function
 */
async function callMetadataAuditV2(
  supabase: SupabaseClient,
  metadata: any,
  organizationId: string
): Promise<{auditResult: any; kpiResult: any; auditHash: string} | null> {
  try {
    console.log('[save-monitored-app] Calling metadata-audit-v2 for Bible-driven audit');

    const { data, error } = await supabase.functions.invoke('metadata-audit-v2', {
      body: {
        metadata,
        organization_id: organizationId,
        // Force Bible audit (no placeholder)
        skipPlaceholder: true
      }
    });

    if (error) {
      console.error('[save-monitored-app] metadata-audit-v2 error:', error);
      return null;
    }

    if (!data || !data.audit) {
      console.warn('[save-monitored-app] metadata-audit-v2 returned no audit data');
      return null;
    }

    // Compute audit hash for deduplication
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
    console.error('[save-monitored-app] Failed to call metadata-audit-v2:', err);
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
    // Initialize Supabase client
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
      console.error('[save-monitored-app] Auth error:', authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid authentication' }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const requestBody: SaveMonitoredAppRequest = await req.json();
    const {
      app_id,
      platform,
      app_name,
      locale = 'us',
      bundle_id,
      app_icon_url,
      developer_name,
      category,
      primary_country = 'us',
      audit_enabled = true,
      tags,
      notes,
      metadata: uiMetadata // CRITICAL: Metadata from UI to prevent server re-fetch
    } = requestBody;

    // Validate required fields
    if (!app_id || !platform || !app_name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: app_id, platform, app_name'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log('[save-monitored-app] User:', user.id, 'Org:', organization_id, 'App:', app_id);

    // Track partial failures
    let monitoredAppSaved = false;
    let metadataCached = false;
    let auditCreated = false;
    let failureReason: string | undefined;
    let acceptableFailure = false; // NEW: Track if failure is acceptable

    let monitoredApp: any = null;
    let metadataCache: any = null;
    let auditSnapshot: any = null;

    // ========================================================================
    // STEP 1: UPSERT monitored_apps entry (IDEMPOTENT)
    // ========================================================================
    try {
      const appPayload = {
        organization_id,
        app_id,
        platform,
        app_name,
        bundle_id: bundle_id || null,
        app_icon_url: app_icon_url || null,
        developer_name: developer_name || null,
        category: category || null,
        primary_country,
        monitor_type: 'audit',
        locale,
        audit_enabled,
        tags: tags || null,
        notes: notes || null
      };

      // Use upsert with composite unique key for idempotency
      const { data, error } = await supabase
        .from('monitored_apps')
        .upsert(appPayload, {
          onConflict: 'organization_id,app_id,platform',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;
      monitoredApp = data;
      monitoredAppSaved = true;
      console.log('[save-monitored-app] Monitored app upserted:', monitoredApp.id);
    } catch (error) {
      console.error('[save-monitored-app] Failed to save monitored app:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to save monitored app',
            details: error
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 2: Check cache status
    try {
      const { data: existingCache } = await supabase
        .from('app_metadata_cache')
        .select('*')
        .eq('organization_id', organization_id)
        .eq('app_id', app_id)
        .eq('platform', platform)
        .eq('locale', locale)
        .maybeSingle();

      const now = Date.now();
      const cacheAgeMs = existingCache
        ? now - new Date(existingCache.fetched_at).getTime()
        : Infinity;
      const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
      const needsRefresh = cacheAgeMs > CACHE_TTL_MS;

      console.log('[save-monitored-app] Cache status:', {
        exists: !!existingCache,
        ageMs: cacheAgeMs,
        needsRefresh,
        hasUIMetadata: !!uiMetadata
      });

      // ========================================================================
      // STEP 3: Determine effective metadata (PRIORITY: UI > Server > Cache)
      // ========================================================================
      let effectiveMetadata: any = null;
      let metadataSource: 'ui' | 'server' | 'cache' = 'cache';

      if (uiMetadata) {
        // PRIORITY 1: Use UI-provided metadata (prevents server re-fetch)
        console.log('[save-monitored-app] ✓ Using UI-provided metadata (best path)');
        effectiveMetadata = uiMetadata;
        metadataSource = 'ui';
      } else if (!existingCache || needsRefresh) {
        // PRIORITY 2: Fetch from server (fallback when UI didn't provide)
        console.log('[save-monitored-app] Fetching fresh metadata from server...');
        const fetchedMetadata = await fetchAppMetadata(
          app_id,
          platform,
          locale,
          supabaseUrl,
          supabaseKey
        );

        if (fetchedMetadata) {
          effectiveMetadata = fetchedMetadata;
          metadataSource = 'server';
        } else {
          console.warn('[save-monitored-app] Server fetch failed');
          if (!existingCache) {
            failureReason = 'Metadata fetch failed and no cache available';
            acceptableFailure = false; // CRITICAL FAILURE
          } else {
            // PRIORITY 3: Use stale cache as last resort
            console.log('[save-monitored-app] Using stale cache as fallback');
            effectiveMetadata = existingCache;
            metadataSource = 'cache';
            failureReason = 'Metadata fetch failed, using stale cache';
            acceptableFailure = true; // ACCEPTABLE - we have cache
          }
        }
      } else {
        // PRIORITY 3: Use existing valid cache
        console.log('[save-monitored-app] Using cached metadata');
        effectiveMetadata = existingCache;
        metadataSource = 'cache';
        metadataCache = existingCache;
      }

      console.log('[save-monitored-app] Metadata source:', metadataSource);

      // ========================================================================
      // STEP 4: Upsert metadata cache (if we have effective metadata)
      // ========================================================================
      if (effectiveMetadata && metadataSource !== 'cache') {
        // Only update cache if we have fresh metadata (UI or server)
        // Don't re-cache if we're just using existing cache
        const title = effectiveMetadata.title || effectiveMetadata.name || null;
        const subtitle = effectiveMetadata.subtitle || null;
        const description = effectiveMetadata.description || null;
        const developerName = effectiveMetadata.developer_name || effectiveMetadata.developer || null;
        const screenshots = effectiveMetadata.screenshots || [];
        const iconUrl = effectiveMetadata.app_icon_url || effectiveMetadata.icon || null;

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
          locale,
          title,
          subtitle,
          description,
          developer_name: developerName,
          app_icon_url: iconUrl,
          screenshots,
          app_json: metadataSource === 'ui' ? null : effectiveMetadata, // Don't store raw UI metadata
          version_hash,
          fetched_at: new Date().toISOString(),
          screenshot_captions: [],
          feature_cards: [],
          preview_analysis: {},
          // Add source tracking for debugging
          _metadata_source: metadataSource
        };

        const { data: cacheData, error: cacheError } = await supabase
          .from('app_metadata_cache')
          .upsert(cachePayload, {
            onConflict: 'organization_id,app_id,platform,locale',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (cacheError) {
          console.error('[save-monitored-app] Failed to upsert cache:', cacheError);
          failureReason = 'Failed to cache metadata';
        } else {
          metadataCache = cacheData;
          metadataCached = true;
          console.log('[save-monitored-app] Metadata cached:', version_hash);
        }

        // STEP 5: Generate Bible-driven audit snapshot (Phase 19)
        try {
          // Call metadata-audit-v2 for Bible-driven audit
          const bibleAudit = await callMetadataAuditV2(supabase, effectiveMetadata, organization_id);

          if (!bibleAudit) {
            console.warn('[save-monitored-app] Bible audit generation failed');
            failureReason = 'Bible audit generation failed';
            acceptableFailure = true;

            // Still update monitored_apps to mark as needs_rebuild
            await supabase
              .from('monitored_apps')
              .update({
                metadata_last_refreshed_at: new Date().toISOString(),
                validated_state: 'needs_rebuild',
                validated_at: new Date().toISOString(),
                validation_error: 'Bible audit generation failed'
              })
              .eq('id', monitoredApp.id);
          } else {
            // Extract KPI scores
            const kpiResult = bibleAudit.kpiResult;
            const kpiOverallScore = kpiResult?.overallScore || null;
            const kpiFamilyScores = kpiResult?.families ? Object.fromEntries(
              Object.entries(kpiResult.families).map(([k, v]: [string, any]) => [k, v.score || 0])
            ) : null;

            const snapshotPayload = {
              monitored_app_id: monitoredApp.id,
              organization_id,
              app_id,
              platform,
              locale,
              title,
              subtitle,
              description: effectiveMetadata.description || null,
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
              source: metadataSource === 'cache' ? 'cache' : 'live'
            };

            const { data: snapshotData, error: snapshotError } = await supabase
              .from('aso_audit_snapshots')
              .insert(snapshotPayload)
              .select()
              .single();

            if (snapshotError) {
              console.error('[save-monitored-app] Failed to create Bible audit snapshot:', snapshotError);
              failureReason = 'Failed to create Bible audit snapshot';
              acceptableFailure = true;

              // Still update monitored_apps to mark as needs_rebuild
              await supabase
                .from('monitored_apps')
                .update({
                  metadata_last_refreshed_at: new Date().toISOString(),
                  validated_state: 'needs_rebuild',
                  validated_at: new Date().toISOString(),
                  validation_error: 'Failed to create Bible audit snapshot'
                })
                .eq('id', monitoredApp.id);
            } else {
              auditSnapshot = snapshotData;
              auditCreated = true;
              console.log('[save-monitored-app] Bible audit snapshot created:', snapshotData.id);

              // STEP 6: Update monitored_apps with audit results and validation state
              await supabase
                .from('monitored_apps')
                .update({
                  latest_audit_score: snapshotData.overall_score,
                  latest_audit_at: new Date().toISOString(),
                  metadata_last_refreshed_at: new Date().toISOString(),
                  validated_state: 'valid',
                  validated_at: new Date().toISOString(),
                  validation_error: null
                })
                .eq('id', monitoredApp.id);
            }
          }
        } catch (auditError) {
          console.error('[save-monitored-app] Audit generation failed:', auditError);
          failureReason = 'Audit generation failed';
          acceptableFailure = true; // Acceptable - app is monitored, audit can be regenerated

          // Still update monitored_apps to mark as needs_rebuild
          await supabase
            .from('monitored_apps')
            .update({
              metadata_last_refreshed_at: new Date().toISOString(),
              validated_state: 'needs_rebuild',
              validated_at: new Date().toISOString(),
              validation_error: `Audit generation failed: ${auditError.message || 'Unknown error'}`
            })
            .eq('id', monitoredApp.id);
        }
      } else if (effectiveMetadata && metadataSource === 'cache') {
        // We're using existing cache - generate Bible audit from it
        metadataCache = effectiveMetadata;
        metadataCached = true;

        const title = effectiveMetadata.title || null;
        const subtitle = effectiveMetadata.subtitle || null;

        try {
          // Call metadata-audit-v2 for Bible-driven audit
          const bibleAudit = await callMetadataAuditV2(supabase, effectiveMetadata, organization_id);

          if (!bibleAudit) {
            console.warn('[save-monitored-app] Bible audit generation from cache failed');
            failureReason = failureReason || 'Bible audit generation from cache failed';
            acceptableFailure = true;

            // Still update monitored_apps to mark as needs_rebuild
            await supabase
              .from('monitored_apps')
              .update({
                metadata_last_refreshed_at: effectiveMetadata.fetched_at,
                validated_state: 'needs_rebuild',
                validated_at: new Date().toISOString(),
                validation_error: 'Bible audit generation from cache failed'
              })
              .eq('id', monitoredApp.id);
          } else {
            // Extract KPI scores
            const kpiResult = bibleAudit.kpiResult;
            const kpiOverallScore = kpiResult?.overallScore || null;
            const kpiFamilyScores = kpiResult?.families ? Object.fromEntries(
              Object.entries(kpiResult.families).map(([k, v]: [string, any]) => [k, v.score || 0])
            ) : null;

            const snapshotPayload = {
              monitored_app_id: monitoredApp.id,
              organization_id,
              app_id,
              platform,
              locale,
              title,
              subtitle,
              description: effectiveMetadata.description || null,
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
              metadata_version_hash: effectiveMetadata.version_hash,
              audit_hash: bibleAudit.auditHash,
              source: 'cache'
            };

            const { data: snapshotData, error: snapshotError } = await supabase
              .from('aso_audit_snapshots')
              .insert(snapshotPayload)
              .select()
              .single();

            if (snapshotError) {
              console.error('[save-monitored-app] Failed to create Bible audit snapshot from cache:', snapshotError);
              failureReason = failureReason || 'Failed to create Bible audit snapshot from cache';
              acceptableFailure = true;

              // Still update monitored_apps to mark as needs_rebuild
              await supabase
                .from('monitored_apps')
                .update({
                  metadata_last_refreshed_at: effectiveMetadata.fetched_at,
                  validated_state: 'needs_rebuild',
                  validated_at: new Date().toISOString(),
                  validation_error: 'Failed to create Bible audit snapshot from cache'
                })
                .eq('id', monitoredApp.id);
            } else {
              auditSnapshot = snapshotData;
              auditCreated = true;
              console.log('[save-monitored-app] Bible audit snapshot created from cache:', snapshotData.id);

              // Update monitored_apps with audit results and validation state
              await supabase
                .from('monitored_apps')
                .update({
                  latest_audit_score: snapshotData.overall_score,
                  latest_audit_at: new Date().toISOString(),
                  metadata_last_refreshed_at: effectiveMetadata.fetched_at,
                  validated_state: 'valid',
                  validated_at: new Date().toISOString(),
                  validation_error: null
                })
                .eq('id', monitoredApp.id);
            }
          }
        } catch (auditError) {
          console.error('[save-monitored-app] Audit generation from cache failed:', auditError);
          failureReason = failureReason || 'Audit generation from cache failed';
          acceptableFailure = true; // Acceptable - app is monitored, audit can be regenerated

          // Still update monitored_apps to mark as needs_rebuild
          await supabase
            .from('monitored_apps')
            .update({
              metadata_last_refreshed_at: effectiveMetadata.fetched_at,
              validated_state: 'needs_rebuild',
              validated_at: new Date().toISOString(),
              validation_error: `Audit generation from cache failed: ${auditError.message || 'Unknown error'}`
            })
            .eq('id', monitoredApp.id);
        }
      }
    } catch (error) {
      console.error('[save-monitored-app] Workflow error:', error);
      failureReason = `Workflow error: ${error}`;
    }

    // Build response
    const response: SaveMonitoredAppResponse = {
      success: monitoredAppSaved,
      data: {
        monitoredApp,
        metadataCache,
        auditSnapshot
      },
      partial: {
        monitoredAppSaved,
        metadataCached,
        auditCreated,
        failureReason,
        acceptableFailure
      }
    };

    console.log('[save-monitored-app] Workflow complete:', response.partial);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[save-monitored-app] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error occurred',
          details: error
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
