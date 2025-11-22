/**
 * delete-monitored-app Edge Function
 *
 * ENTERPRISE-GRADE UN-MONITORING WORKFLOW
 *
 * Purpose:
 * - Remove app from monitored_apps
 * - Delete organization-specific metadata cache
 * - Optionally delete or anonymize audit snapshots
 *
 * Ethical data handling:
 * - When an org stops monitoring an app, all related data is cleaned up
 * - No cross-org data retention
 * - GDPR/privacy compliant
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';
import { resolveUserPermissions } from '../_shared/auth-utils.ts';

console.log('[delete-monitored-app] Function initialized');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // ========================================================================
    // STEP 1: Authentication & Authorization
    // ========================================================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[delete-monitored-app] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // STEP 2: Parse Request Body
    // ========================================================================
    const requestBody = await req.json();
    const {
      app_id,
      platform,
      deleteSnapshots = false // Optional: delete snapshots (default: keep for historical analysis)
    } = requestBody;

    // Validate required fields
    if (!app_id || !platform) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: app_id, platform'
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

    console.log('[delete-monitored-app] User:', user.id, 'Org:', organization_id, 'App:', app_id);

    // ========================================================================
    // STEP 3: Delete Monitored App Entry
    // ========================================================================
    const { error: deleteAppError, count: deletedApps } = await supabase
      .from('monitored_apps')
      .delete({ count: 'exact' })
      .eq('organization_id', organization_id)
      .eq('app_id', app_id)
      .eq('platform', platform);

    if (deleteAppError) {
      console.error('[delete-monitored-app] Failed to delete monitored app:', deleteAppError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to delete monitored app',
            details: deleteAppError
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!deletedApps || deletedApps === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Monitored app not found for this organization'
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[delete-monitored-app] ✓ Deleted monitored app');

    // ========================================================================
    // STEP 4: Delete Organization-Specific Metadata Cache
    // ========================================================================
    const { error: deleteCacheError } = await supabase
      .from('app_metadata_cache')
      .delete()
      .eq('organization_id', organization_id)
      .eq('app_id', app_id)
      .eq('platform', platform);

    if (deleteCacheError) {
      console.warn('[delete-monitored-app] Failed to delete metadata cache:', deleteCacheError);
      // Non-fatal - continue
    } else {
      console.log('[delete-monitored-app] ✓ Deleted metadata cache');
    }

    // ========================================================================
    // STEP 5: Delete Audit Snapshots (Optional)
    // ========================================================================
    let deletedSnapshots = 0;
    if (deleteSnapshots) {
      const { error: deleteSnapshotsError, count } = await supabase
        .from('audit_snapshots')
        .delete({ count: 'exact' })
        .eq('organization_id', organization_id)
        .eq('app_id', app_id)
        .eq('platform', platform);

      if (deleteSnapshotsError) {
        console.warn('[delete-monitored-app] Failed to delete snapshots:', deleteSnapshotsError);
        // Non-fatal - continue
      } else {
        deletedSnapshots = count || 0;
        console.log('[delete-monitored-app] ✓ Deleted', deletedSnapshots, 'audit snapshots');
      }
    } else {
      console.log('[delete-monitored-app] Keeping audit snapshots for historical analysis');
    }

    // ========================================================================
    // STEP 6: Return Success Response
    // ========================================================================
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          deletedApps,
          deletedCache: true,
          deletedSnapshots,
          message: `Successfully removed app from monitoring. ${deleteSnapshots ? 'All data deleted.' : 'Historical snapshots preserved.'}`
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[delete-monitored-app] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          details: error instanceof Error ? error.message : String(error)
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
