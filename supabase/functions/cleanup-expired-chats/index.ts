import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cleanup Expired Chats - Cron Function
 *
 * Automatically deletes expired chat sessions (and their messages via CASCADE).
 * Runs every 6 hours via Supabase cron schedule.
 *
 * Retention Policy:
 * - Sessions expire after 24 hours by default
 * - Pinned sessions (is_pinned = true) are never deleted
 * - Messages are cascaded-deleted when session is deleted
 *
 * Schedule: 0 */6 * * * (every 6 hours)
 */

serve(async (req) => {
  try {
    console.log('[cleanup-expired-chats] Starting cleanup...');

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Delete expired sessions (not pinned)
    // CASCADE will automatically delete related chat_messages
    const { data: deletedSessions, error } = await supabase
      .from('chat_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .eq('is_pinned', false)
      .select('id, title, organization_id');

    if (error) {
      console.error('[cleanup-expired-chats] Error:', error);
      throw error;
    }

    const deletedCount = deletedSessions?.length || 0;

    console.log(`[cleanup-expired-chats] Deleted ${deletedCount} expired sessions`);

    // Log per-organization cleanup stats
    if (deletedSessions && deletedSessions.length > 0) {
      const orgStats = deletedSessions.reduce((acc: any, session: any) => {
        const orgId = session.organization_id;
        acc[orgId] = (acc[orgId] || 0) + 1;
        return acc;
      }, {});

      console.log('[cleanup-expired-chats] Cleanup by organization:');
      Object.entries(orgStats).forEach(([orgId, count]) => {
        console.log(`  - Org ${orgId}: ${count} sessions`);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedCount,
        timestamp: new Date().toISOString(),
        message: `Deleted ${deletedCount} expired chat sessions`
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[cleanup-expired-chats] Fatal error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
