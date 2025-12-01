/**
 * One-time migration applier
 * This function applies the keyword_popularity_scores migration
 * DELETE THIS FUNCTION AFTER USE
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[apply-migration] Starting migration...');

    // Execute SQL statements one by one
    const statements = [
      // 1. Create table
      `CREATE TABLE IF NOT EXISTS keyword_popularity_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword TEXT NOT NULL,
        locale TEXT NOT NULL DEFAULT 'us',
        platform TEXT NOT NULL DEFAULT 'ios',
        autocomplete_score FLOAT DEFAULT 0,
        autocomplete_rank INTEGER,
        autocomplete_appears BOOLEAN DEFAULT false,
        intent_score FLOAT DEFAULT 0,
        combo_participation_count INTEGER DEFAULT 0,
        length_prior FLOAT DEFAULT 0,
        word_count INTEGER,
        popularity_score FLOAT NOT NULL,
        scoring_version TEXT DEFAULT 'v1-mvp-no-trends',
        last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        fetch_errors JSONB,
        data_quality TEXT DEFAULT 'complete',
        UNIQUE(keyword, locale, platform)
      )`,

      // 2. Create indexes
      `CREATE INDEX IF NOT EXISTS idx_popularity_scores_lookup
        ON keyword_popularity_scores(locale, platform, popularity_score DESC)`,

      `CREATE INDEX IF NOT EXISTS idx_popularity_scores_keyword
        ON keyword_popularity_scores(keyword, locale)`,

      `CREATE INDEX IF NOT EXISTS idx_popularity_scores_stale
        ON keyword_popularity_scores(last_checked_at)
        WHERE data_quality IN ('stale', 'partial')`,

      // 3. Enable RLS
      `ALTER TABLE keyword_popularity_scores ENABLE ROW LEVEL SECURITY`,

      // 4. Create RLS policies
      `DROP POLICY IF EXISTS "Users can read keyword popularity scores" ON keyword_popularity_scores`,
      `CREATE POLICY "Users can read keyword popularity scores"
        ON keyword_popularity_scores FOR SELECT USING (true)`,

      `DROP POLICY IF EXISTS "Service role can manage keyword popularity scores" ON keyword_popularity_scores`,
      `CREATE POLICY "Service role can manage keyword popularity scores"
        ON keyword_popularity_scores FOR ALL
        USING (auth.jwt() ->> 'role' = 'service_role')
        WITH CHECK (auth.jwt() ->> 'role' = 'service_role')`,

      // 5. Create trigger function
      `CREATE OR REPLACE FUNCTION update_popularity_scores_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql`,

      // 6. Create trigger
      `DROP TRIGGER IF EXISTS popularity_scores_updated_at ON keyword_popularity_scores`,
      `CREATE TRIGGER popularity_scores_updated_at
        BEFORE UPDATE ON keyword_popularity_scores
        FOR EACH ROW
        EXECUTE FUNCTION update_popularity_scores_updated_at()`,

      // 7. Create helper function
      `CREATE OR REPLACE FUNCTION get_stale_keywords(
        max_age_hours INTEGER DEFAULT 24,
        batch_size INTEGER DEFAULT 1000
      )
      RETURNS TABLE (keyword TEXT, locale TEXT, platform TEXT) AS $$
      BEGIN
        RETURN QUERY
        SELECT kps.keyword, kps.locale, kps.platform
        FROM keyword_popularity_scores kps
        WHERE kps.last_checked_at < NOW() - (max_age_hours || ' hours')::INTERVAL
        ORDER BY kps.last_checked_at ASC
        LIMIT batch_size;
      END;
      $$ LANGUAGE plpgsql`,

      // 8. Create RPC function for intent scores
      `CREATE OR REPLACE FUNCTION calculate_token_intent_scores(
        p_locale TEXT DEFAULT 'us',
        p_platform TEXT DEFAULT 'ios'
      )
      RETURNS TABLE (
        token TEXT,
        combo_count INTEGER,
        intent_score FLOAT
      ) AS $$
      BEGIN
        RETURN QUERY
        WITH token_combos AS (
          SELECT
            UNNEST(string_to_array(LOWER(combo), ' ')) AS token,
            COUNT(*) AS combo_count
          FROM combo_rankings_cache
          WHERE platform = p_platform
            AND country = p_locale
            AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY token
        ),
        token_stats AS (
          SELECT
            tc.token,
            tc.combo_count,
            CASE
              WHEN MAX(tc.combo_count) OVER () = MIN(tc.combo_count) OVER () THEN 0.5
              ELSE (tc.combo_count::float - MIN(tc.combo_count) OVER ()) /
                   NULLIF(MAX(tc.combo_count) OVER () - MIN(tc.combo_count) OVER (), 0)
            END AS intent_score
          FROM token_combos tc
          WHERE LENGTH(tc.token) > 1
        )
        SELECT
          ts.token,
          ts.combo_count::INTEGER,
          COALESCE(ts.intent_score, 0)::FLOAT AS intent_score
        FROM token_stats ts
        ORDER BY ts.intent_score DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER`,
    ];

    const results = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`[apply-migration] Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { query: stmt });

        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
          // This is just to test connection, actual SQL execution needs different approach

          results.push({
            statement: i + 1,
            success: false,
            error: error.message,
            note: 'SQL execution via Supabase client has limitations'
          });
        } else {
          results.push({
            statement: i + 1,
            success: true
          });
        }
      } catch (error: any) {
        results.push({
          statement: i + 1,
          success: false,
          error: error.message
        });
      }
    }

    // Check if table exists now
    const { data: tableCheck, error: checkError } = await supabase
      .from('keyword_popularity_scores')
      .select('*')
      .limit(1);

    const tableExists = !checkError;

    return new Response(
      JSON.stringify({
        success: tableExists,
        message: tableExists
          ? 'Migration applied successfully! Table exists.'
          : 'Migration may have failed. Please apply via Dashboard SQL Editor.',
        tableExists,
        results,
        note: 'For best results, apply migration via Dashboard SQL Editor'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
