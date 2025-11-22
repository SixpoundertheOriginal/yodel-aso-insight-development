/**
 * Validate Monitored Apps - Scheduled Job
 *
 * Purpose: Background job to maintain monitored app consistency
 * Runs: Hourly (configure in Supabase dashboard: Edge Functions > Cron)
 *
 * Workflow:
 * 1. Scan for monitored apps with validated_state != 'valid'
 * 2. Validate each one (check cache/snapshot)
 * 3. Rebuild if needed
 * 4. Log results
 *
 * Ensures all monitored apps are always ready for viewing without errors.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ==================== CONFIGURATION ====================

const BATCH_SIZE = 50; // Process 50 apps per run
const MAX_VALIDATION_TIME_MS = 540000; // 9 minutes (leave 1min buffer for 10min timeout)

// ==================== MAIN HANDLER ====================

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use service role key for admin access (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    console.log('[validate-monitored-apps] Starting scheduled validation...');

    // ========================================================================
    // STEP 1: Find monitored apps that need validation
    // ========================================================================
    const { data: invalidApps, error: fetchError } = await supabase
      .from('monitored_apps')
      .select('id, app_id, app_name, platform, validated_state, validated_at, organization_id')
      .in('validated_state', ['invalid', 'stale', 'unknown'])
      .order('validated_at', { ascending: true, nullsFirst: true }) // Prioritize never-validated
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('[validate-monitored-apps] Failed to fetch invalid apps:', fetchError);
      throw fetchError;
    }

    if (!invalidApps || invalidApps.length === 0) {
      console.log('[validate-monitored-apps] ✓ No invalid apps found - all healthy!');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No invalid apps found',
          processed: 0,
          validated: 0,
          rebuilt: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[validate-monitored-apps] Found ${invalidApps.length} apps needing validation`);

    // ========================================================================
    // STEP 2: Process each invalid app
    // ========================================================================
    const results = {
      processed: 0,
      validated: 0,
      rebuilt: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const app of invalidApps) {
      // Check timeout
      if (Date.now() - startTime > MAX_VALIDATION_TIME_MS) {
        console.warn('[validate-monitored-apps] Approaching timeout, stopping batch');
        break;
      }

      console.log(`[validate-monitored-apps] Processing: ${app.app_name} (${app.id})`);

      try {
        // ====================================================================
        // STEP 2a: Validate consistency
        // ====================================================================
        const validateRes = await fetch(`${supabaseUrl}/functions/v1/validate-monitored-app-consistency`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ monitored_app_id: app.id })
        });

        if (!validateRes.ok) {
          console.error(`[validate-monitored-apps] Validation failed for ${app.app_name}`);
          results.failed++;
          results.errors.push(`${app.app_name}: Validation request failed`);
          continue;
        }

        const validateData = await validateRes.json();

        if (!validateData.success) {
          console.error(`[validate-monitored-apps] Validation error for ${app.app_name}:`, validateData.error);
          results.failed++;
          results.errors.push(`${app.app_name}: ${validateData.error?.message || 'Unknown error'}`);
          continue;
        }

        results.validated++;
        console.log(`[validate-monitored-apps] ✓ Validated ${app.app_name}: ${validateData.data.validated_state}`);

        // ====================================================================
        // STEP 2b: Rebuild if needed
        // ====================================================================
        if (validateData.data.needs_rebuild) {
          console.log(`[validate-monitored-apps] Rebuilding ${app.app_name}...`);

          const rebuildRes = await fetch(`${supabaseUrl}/functions/v1/rebuild-monitored-app`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ monitored_app_id: app.id })
          });

          if (!rebuildRes.ok) {
            console.error(`[validate-monitored-apps] Rebuild request failed for ${app.app_name}`);
            results.failed++;
            results.errors.push(`${app.app_name}: Rebuild request failed`);
            continue;
          }

          const rebuildData = await rebuildRes.json();

          if (!rebuildData.success) {
            console.error(`[validate-monitored-apps] Rebuild error for ${app.app_name}:`, rebuildData.error);
            results.failed++;
            results.errors.push(`${app.app_name}: ${rebuildData.error?.message || 'Rebuild failed'}`);
            continue;
          }

          results.rebuilt++;
          console.log(`[validate-monitored-apps] ✓ Rebuilt ${app.app_name} (score: ${rebuildData.data.audit_score})`);
        }

        results.processed++;
      } catch (error) {
        console.error(`[validate-monitored-apps] Error processing ${app.app_name}:`, error);
        results.failed++;
        results.errors.push(`${app.app_name}: ${error.message}`);
      }
    }

    // ========================================================================
    // STEP 3: Return results
    // ========================================================================
    const elapsedMs = Date.now() - startTime;
    console.log('[validate-monitored-apps] Batch complete:', {
      processed: results.processed,
      validated: results.validated,
      rebuilt: results.rebuilt,
      failed: results.failed,
      elapsed_ms: elapsedMs
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Validated ${results.validated} apps, rebuilt ${results.rebuilt}`,
        ...results,
        elapsed_ms: elapsedMs
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[validate-monitored-apps] Unexpected error:', error);

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
