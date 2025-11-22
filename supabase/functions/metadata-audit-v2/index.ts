/**
 * Metadata Audit V2 Edge Function
 *
 * Unified metadata scoring engine that consolidates:
 * - Existing Metadata Scoring Analysis logic
 * - Curated rules from Element-by-Element Analysis
 *
 * Returns comprehensive audit results with rule-by-rule evaluation.
 *
 * Input: app_id, platform, locale (or organization_id + monitored_app_id)
 * Output: UnifiedMetadataAuditResult (JSON)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { MetadataAuditEngine, type UnifiedMetadataAuditResult } from '../_shared/metadata-audit-engine.ts';

// ==================== TYPES ====================

interface MetadataAuditRequest {
  // Option 1: Direct app lookup
  app_id?: string;
  platform?: 'ios' | 'android';
  locale?: string;

  // Option 2: Monitored app lookup
  monitored_app_id?: string;
  organization_id?: string;
}

interface MetadataAuditResponse {
  success: boolean;
  data?: UnifiedMetadataAuditResult;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  _meta?: {
    app_id: string;
    platform: string;
    locale: string;
    source: 'metadata_cache' | 'monitored_app' | 'direct_fetch';
    executionTimeMs: number;
  };
}

// ==================== MAIN HANDLER ====================

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { app_id, platform, locale, monitored_app_id, organization_id }: MetadataAuditRequest =
      await req.json();

    // Validate input
    if (!app_id && !monitored_app_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Either app_id or monitored_app_id must be provided'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let metadata: any = null;
    let resolvedAppId = app_id;
    let resolvedPlatform = platform || 'ios';
    let resolvedLocale = locale || 'us';
    let source: 'metadata_cache' | 'monitored_app' | 'direct_fetch' = 'direct_fetch';

    // Option 1: Lookup via monitored_app_id
    if (monitored_app_id) {
      console.log('[metadata-audit-v2] Looking up monitored app:', monitored_app_id);

      const { data: monitoredApp, error: monitoredAppError } = await supabase
        .from('monitored_apps')
        .select('*')
        .eq('id', monitored_app_id)
        .maybeSingle();

      if (monitoredAppError || !monitoredApp) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'MONITORED_APP_NOT_FOUND',
              message: 'Monitored app not found',
              details: monitoredAppError
            }
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      resolvedAppId = monitoredApp.app_id;
      resolvedPlatform = monitoredApp.platform;
      resolvedLocale = monitoredApp.locale || 'us';

      // Try to load from cache
      const { data: cachedMetadata } = await supabase
        .from('app_metadata_cache')
        .select('*')
        .eq('organization_id', monitoredApp.organization_id)
        .eq('app_id', resolvedAppId)
        .eq('platform', resolvedPlatform)
        .eq('locale', resolvedLocale)
        .maybeSingle();

      if (cachedMetadata) {
        metadata = {
          name: cachedMetadata.app_name,
          title: cachedMetadata.title,
          subtitle: cachedMetadata.subtitle,
          description: cachedMetadata.description,
          applicationCategory: cachedMetadata.category
        };
        source = 'metadata_cache';
        console.log('[metadata-audit-v2] Loaded from cache');
      } else {
        source = 'monitored_app';
      }
    }

    // If no cached metadata, fetch from App Store
    if (!metadata) {
      console.log('[metadata-audit-v2] Fetching metadata for:', resolvedAppId, resolvedPlatform, resolvedLocale);

      if (resolvedPlatform === 'ios') {
        const metadataUrl = `${supabaseUrl}/functions/v1/appstore-metadata?id=${resolvedAppId}&country=${resolvedLocale}`;

        const metadataResponse = await fetch(metadataUrl, {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (!metadataResponse.ok) {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'METADATA_FETCH_FAILED',
                message: 'Failed to fetch app metadata',
                details: { status: metadataResponse.status }
              }
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const metadataData = await metadataResponse.json();

        metadata = {
          name: metadataData.name || metadataData.title,
          title: metadataData.title,
          subtitle: metadataData.subtitle,
          description: metadataData.description,
          applicationCategory: metadataData.category
        };

        source = 'direct_fetch';
      } else {
        // Android support can be added later
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'PLATFORM_NOT_SUPPORTED',
              message: 'Android platform not yet supported in metadata-audit-v2'
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Run audit engine
    console.log('[metadata-audit-v2] Running audit engine');
    const auditResult = MetadataAuditEngine.evaluate(metadata);

    const executionTimeMs = Date.now() - startTime;

    // Return result
    const response: MetadataAuditResponse = {
      success: true,
      data: auditResult,
      _meta: {
        app_id: resolvedAppId!,
        platform: resolvedPlatform,
        locale: resolvedLocale,
        source,
        executionTimeMs
      }
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[metadata-audit-v2] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
