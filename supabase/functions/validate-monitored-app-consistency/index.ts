/**
 * Validate Monitored App Consistency Edge Function
 *
 * Purpose: Checks consistency of a monitored app without fixing it:
 * - 'valid': Cache and snapshot exist, data is fresh (<24h)
 * - 'stale': Cache exists but is old (>24h)
 * - 'invalid': Missing cache or snapshot
 *
 * Called by:
 * - Frontend (useMonitoredAppConsistency hook)
 * - Scheduled validation job (batch validation)
 *
 * Idempotent: Safe to call multiple times
 * Fast: Only performs SELECT queries, no heavy operations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveUserPermissions } from '../_shared/auth-utils.ts';
import { corsHeaders } from '../_shared/cors.ts';

// ==================== TYPES ====================

interface ValidateRequest {
  monitored_app_id: string;
}

interface ValidateResponse {
  success: boolean;
  data?: {
    validated_state: 'valid' | 'stale' | 'invalid' | 'unknown';
    has_cache: boolean;
    has_snapshot: boolean;
    cache_age_hours?: number;
    needs_rebuild: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ==================== CONSTANTS ====================

const CACHE_TTL_HOURS = 24;
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;

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
    const { monitored_app_id }: ValidateRequest = await req.json();

    if (!monitored_app_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Missing monitored_app_id' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[validate-consistency] Validating:', monitored_app_id);

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
      console.error('[validate-consistency] Monitored app not found:', fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Monitored app not found or access denied' }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { app_id, platform, locale } = monitoredApp;
    const normalizedLocale = locale || 'us';

    console.log('[validate-consistency] Checking consistency for:', app_id, platform, normalizedLocale);

    // ========================================================================
    // STEP 2: Check for metadata cache
    // ========================================================================
    const { data: cache, error: cacheError } = await supabase
      .from('app_metadata_cache')
      .select('fetched_at')
      .eq('organization_id', organization_id)
      .eq('app_id', app_id)
      .eq('platform', platform)
      .eq('locale', normalizedLocale)
      .maybeSingle();

    if (cacheError) {
      console.error('[validate-consistency] Cache query error:', cacheError);
    }

    const hasCache = Boolean(cache);
    let cacheAgeMs: number | undefined;
    let cacheAgeHours: number | undefined;

    if (hasCache && cache.fetched_at) {
      cacheAgeMs = Date.now() - new Date(cache.fetched_at).getTime();
      cacheAgeHours = Math.round(cacheAgeMs / (1000 * 60 * 60));
    }

    // ========================================================================
    // STEP 3: Check for audit snapshot
    // ========================================================================
    const { data: snapshot, error: snapshotError } = await supabase
      .from('audit_snapshots')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('app_id', app_id)
      .eq('platform', platform)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshotError) {
      console.error('[validate-consistency] Snapshot query error:', snapshotError);
    }

    const hasSnapshot = Boolean(snapshot);

    // ========================================================================
    // STEP 4: Determine validation state
    // ========================================================================
    let validated_state: 'valid' | 'stale' | 'invalid' = 'invalid';
    let needs_rebuild = false;

    if (!hasCache || !hasSnapshot) {
      // Missing critical data
      validated_state = 'invalid';
      needs_rebuild = true;
    } else if (cacheAgeMs !== undefined && cacheAgeMs > CACHE_TTL_MS) {
      // Cache is old
      validated_state = 'stale';
      needs_rebuild = true;
    } else {
      // All good!
      validated_state = 'valid';
      needs_rebuild = false;
    }

    console.log('[validate-consistency] Result:', {
      validated_state,
      has_cache: hasCache,
      has_snapshot: hasSnapshot,
      cache_age_hours: cacheAgeHours,
      needs_rebuild
    });

    // ========================================================================
    // STEP 5: Update monitored_apps with validation state
    // ========================================================================
    await supabase
      .from('monitored_apps')
      .update({
        validated_state,
        validated_at: new Date().toISOString(),
        validation_error: needs_rebuild ?
          (hasCache ? 'Cache is stale' : 'Missing cache or snapshot') :
          null
      })
      .eq('id', monitored_app_id);

    // ========================================================================
    // STEP 6: Return validation result
    // ========================================================================
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          validated_state,
          has_cache: hasCache,
          has_snapshot: hasSnapshot,
          cache_age_hours: cacheAgeHours,
          needs_rebuild
        }
      } as ValidateResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[validate-consistency] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error occurred'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
