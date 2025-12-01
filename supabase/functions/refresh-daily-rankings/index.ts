/**
 * Refresh Daily Rankings Cron Job
 *
 * Automatically refreshes combo rankings for all tracked apps once per day.
 * Runs at 3:00 AM UTC daily via Supabase cron.
 *
 * Flow:
 * 1. Query all tracked combos from keywords table
 * 2. Group by app + country
 * 3. For each app, batch combos into groups of 50
 * 4. Call check-combo-rankings for each batch
 * 5. Update keyword_refresh_queue status
 * 6. Log results
 *
 * @endpoint POST /functions/v1/refresh-daily-rankings
 * @trigger Cron schedule (3:00 AM UTC daily)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Types
interface RefreshDailyRankingsRequest {
  source?: 'cron' | 'manual';
  appId?: string; // Optional: refresh specific app only
  dryRun?: boolean; // Optional: preview what would be refreshed
}

interface RefreshDailyRankingsResponse {
  success: boolean;
  summary?: {
    totalApps: number;
    totalCombos: number;
    successful: number;
    failed: number;
    duration: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface AppComboGroup {
  appId: string;
  appUUID: string;
  organizationId: string;
  platform: string;
  region: string;
  combos: string[];
}

// Constants
const BATCH_SIZE = 50; // Max combos per check-combo-rankings call
const STALE_THRESHOLD_HOURS = 24;

// Main handler
serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const body: RefreshDailyRankingsRequest = req.method === 'POST' ? await req.json() : {};
    const { source = 'manual', appId = null, dryRun = false } = body;

    console.log('[refresh-daily-rankings] Starting refresh:', { source, appId, dryRun });

    // Step 1: Query all stale combos grouped by app
    const { data: staleComboData, error: querError } = await supabase
      .from('keywords')
      .select(`
        id,
        keyword,
        app_id,
        organization_id,
        platform,
        region,
        last_tracked_at,
        apps!inner(app_id)
      `)
      .eq('keyword_type', 'combo')
      .eq('is_tracked', true)
      .or(`last_tracked_at.is.null,last_tracked_at.lt.${getStaleThreshold()}`)
      .order('last_tracked_at', { ascending: true, nullsFirst: true });

    if (queryError) {
      console.error('[refresh-daily-rankings] Query error:', queryError);
      throw queryError;
    }

    if (!staleComboData || staleComboData.length === 0) {
      console.log('[refresh-daily-rankings] No stale combos found');
      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            totalApps: 0,
            totalCombos: 0,
            successful: 0,
            failed: 0,
            duration: formatDuration(Date.now() - startTime),
          },
        } as RefreshDailyRankingsResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[refresh-daily-rankings] Found ${staleComboData.length} stale combos`);

    // Step 2: Group combos by app + country
    const appGroups = groupCombosByApp(staleComboData, appId);

    console.log(`[refresh-daily-rankings] Grouped into ${appGroups.length} app contexts`);

    // Step 3: Process each app group
    let successfulCount = 0;
    let failedCount = 0;

    for (const group of appGroups) {
      console.log(`[refresh-daily-rankings] Processing app ${group.appId} (${group.combos.length} combos)`);

      // Split combos into batches
      const batches = chunkArray(group.combos, BATCH_SIZE);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        if (dryRun) {
          console.log(`[refresh-daily-rankings] [DRY RUN] Would refresh batch ${i + 1}/${batches.length}: ${batch.join(', ')}`);
          successfulCount += batch.length;
          continue;
        }

        try {
          // Call check-combo-rankings edge function
          const response = await fetch(`${supabaseUrl}/functions/v1/check-combo-rankings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              appId: group.appId,
              combos: batch,
              country: group.region,
              platform: group.platform,
              organizationId: group.organizationId,
            }),
          });

          if (!response.ok) {
            throw new Error(`check-combo-rankings failed: ${response.statusText}`);
          }

          const result = await response.json();

          if (result.success) {
            successfulCount += batch.length;
            console.log(`[refresh-daily-rankings] ✅ Batch ${i + 1}/${batches.length} succeeded (${batch.length} combos)`);
          } else {
            failedCount += batch.length;
            console.error(`[refresh-daily-rankings] ❌ Batch ${i + 1}/${batches.length} failed:`, result.error);
          }
        } catch (err) {
          failedCount += batch.length;
          console.error(`[refresh-daily-rankings] ❌ Error processing batch ${i + 1}/${batches.length}:`, err);
        }

        // Small delay between batches to avoid rate limits
        if (i < batches.length - 1) {
          await delay(100);
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log('[refresh-daily-rankings] Complete:', {
      totalApps: appGroups.length,
      totalCombos: staleComboData.length,
      successful: successfulCount,
      failed: failedCount,
      duration: formatDuration(duration),
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalApps: appGroups.length,
          totalCombos: staleComboData.length,
          successful: successfulCount,
          failed: failedCount,
          duration: formatDuration(duration),
        },
      } as RefreshDailyRankingsResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[refresh-daily-rankings] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
          details: error,
        },
      } as RefreshDailyRankingsResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Get stale threshold timestamp (24 hours ago)
function getStaleThreshold(): string {
  const date = new Date();
  date.setHours(date.getHours() - STALE_THRESHOLD_HOURS);
  return date.toISOString();
}

// Helper: Group combos by app + country
function groupCombosByApp(data: any[], filterAppId: string | null): AppComboGroup[] {
  const groups = new Map<string, AppComboGroup>();

  for (const item of data) {
    const appId = item.apps.app_id;

    // Filter by specific app if requested
    if (filterAppId && appId !== filterAppId) {
      continue;
    }

    const groupKey = `${item.app_id}_${item.platform}_${item.region}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        appId,
        appUUID: item.app_id,
        organizationId: item.organization_id,
        platform: item.platform,
        region: item.region,
        combos: [],
      });
    }

    groups.get(groupKey)!.combos.push(item.keyword);
  }

  return Array.from(groups.values());
}

// Helper: Chunk array into smaller batches
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper: Delay execution
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper: Format duration in human-readable format
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
