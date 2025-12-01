/**
 * Refresh Keyword Popularity Edge Function
 *
 * Called daily by pg_cron to update popularity scores for all tracked keywords.
 *
 * Flow:
 * 1. Extract unique tokens from monitored apps
 * 2. Fetch autocomplete scores (via autocomplete-intelligence)
 * 3. Calculate intent scores from combo_rankings_cache
 * 4. Compute length priors
 * 5. Apply formula → popularity_score (0-100)
 * 6. Upsert to keyword_popularity_scores table
 *
 * MVP Formula (Option A - No Google Trends):
 * popularity = (autocomplete * 0.60) + (intent * 0.30) + (length * 0.10)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface PopularityScore {
  keyword: string;
  locale: string;
  platform: string;
  autocomplete_score: number;
  autocomplete_rank: number | null;
  autocomplete_appears: boolean;
  intent_score: number;
  combo_participation_count: number;
  length_prior: number;
  word_count: number;
  popularity_score: number;
  data_quality: 'complete' | 'partial' | 'estimated';
  fetch_errors?: Record<string, string>;
}

const FORMULA_WEIGHTS = {
  autocomplete: 0.60, // Increased from 50% (no Trends in MVP)
  intent: 0.30,       // Increased from 20%
  length: 0.10,       // Kept same
};

serve(async (req) => {
  try {
    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[refresh-keyword-popularity] 🚀 Starting refresh job...');

    // Step 1: Extract unique tokens from monitored apps
    const tokens = await extractUniqueTokens(supabase);
    console.log(`[refresh-keyword-popularity] 📝 Found ${tokens.length} unique tokens`);

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          updated: 0,
          message: 'No tokens found to process',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Calculate intent scores from combo participation
    const intentScores = await calculateIntentScores(supabase, 'us', 'ios');
    console.log(`[refresh-keyword-popularity] 🧠 Calculated intent scores for ${Object.keys(intentScores).length} tokens`);

    // Step 3: Fetch autocomplete scores for each token
    const autocompleteScores = await fetchAutocompleteScores(supabase, tokens, 'us', 'ios');
    console.log(`[refresh-keyword-popularity] 🔍 Fetched autocomplete scores for ${Object.keys(autocompleteScores).length} tokens`);

    // Step 4: Compute popularity scores
    const scores: PopularityScore[] = [];

    for (const token of tokens) {
      const autocomplete = autocompleteScores[token] || { score: 0, rank: null, appears: false };
      const intent = intentScores[token] || { score: 0, combo_count: 0 };
      const length = calculateLengthPrior(token);

      // Apply formula (MVP version without trends)
      const popularityScore = Math.round(
        (autocomplete.score * FORMULA_WEIGHTS.autocomplete +
         intent.score * FORMULA_WEIGHTS.intent +
         length.score * FORMULA_WEIGHTS.length) * 100
      );

      scores.push({
        keyword: token,
        locale: 'us',
        platform: 'ios',
        autocomplete_score: autocomplete.score,
        autocomplete_rank: autocomplete.rank,
        autocomplete_appears: autocomplete.appears,
        intent_score: intent.score,
        combo_participation_count: intent.combo_count,
        length_prior: length.score,
        word_count: length.word_count,
        popularity_score: popularityScore,
        data_quality: 'complete',
      });
    }

    console.log(`[refresh-keyword-popularity] 💯 Computed ${scores.length} popularity scores`);

    // Step 5: Upsert to database
    const { error } = await supabase
      .from('keyword_popularity_scores')
      .upsert(
        scores.map(s => ({
          ...s,
          scoring_version: 'v1-mvp-no-trends',
          last_checked_at: new Date().toISOString(),
        })),
        {
          onConflict: 'keyword,locale,platform',
        }
      );

    if (error) {
      throw new Error(`Database upsert failed: ${error.message}`);
    }

    console.log(`[refresh-keyword-popularity] ✅ Successfully updated ${scores.length} scores`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: scores.length,
        message: `Updated popularity scores for ${scores.length} keywords`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[refresh-keyword-popularity] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract unique tokens from all monitored apps
 */
async function extractUniqueTokens(supabase: any): Promise<string[]> {
  // Get all combos from cache (last 30 days)
  const { data, error } = await supabase
    .from('combo_rankings_cache')
    .select('combo')
    .gte('snapshot_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  if (error) {
    console.warn(`[extractUniqueTokens] Failed to fetch combos: ${error.message}`);
    return [];
  }

  if (!data || data.length === 0) {
    console.warn('[extractUniqueTokens] No combos found in cache');
    return [];
  }

  // Extract unique tokens
  const tokens = new Set<string>();
  for (const row of data) {
    const words = row.combo.toLowerCase().split(' ');
    for (const word of words) {
      if (word.length > 1) { // Skip single letters
        tokens.add(word);
      }
    }
  }

  // Limit to 1000 for MVP
  const tokenArray = Array.from(tokens).slice(0, 1000);
  console.log(`[extractUniqueTokens] Extracted ${tokens.size} unique tokens, returning ${tokenArray.length} for processing`);

  return tokenArray;
}

/**
 * Calculate intent scores from combo participation
 */
async function calculateIntentScores(
  supabase: any,
  locale: string,
  platform: string
): Promise<Record<string, { score: number; combo_count: number }>> {
  const { data, error } = await supabase.rpc('calculate_token_intent_scores', {
    p_locale: locale,
    p_platform: platform,
  });

  if (error) {
    console.warn('[calculateIntentScores] RPC failed, using empty scores:', error);
    return {};
  }

  const scores: Record<string, { score: number; combo_count: number }> = {};
  for (const row of data || []) {
    scores[row.token] = {
      score: row.intent_score,
      combo_count: row.combo_count,
    };
  }

  return scores;
}

/**
 * Fetch autocomplete scores via existing autocomplete-intelligence function
 */
async function fetchAutocompleteScores(
  supabase: any,
  tokens: string[],
  locale: string,
  platform: string
): Promise<Record<string, { score: number; rank: number | null; appears: boolean }>> {
  const scores: Record<string, { score: number; rank: number | null; appears: boolean }> = {};

  // Batch requests to avoid overwhelming the API
  const BATCH_SIZE = 10;
  const DELAY_MS = 100; // 100ms between batches

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    console.log(`[fetchAutocompleteScores] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tokens.length / BATCH_SIZE)}`);

    await Promise.all(
      batch.map(async (token) => {
        try {
          // Call existing autocomplete-intelligence function
          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/autocomplete-intelligence`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                keyword: token,
                platform: platform,
                region: locale,
              }),
            }
          );

          if (!response.ok) {
            console.warn(`[fetchAutocompleteScores] API error for "${token}": ${response.statusText}`);
            scores[token] = { score: 0, rank: null, appears: false };
            return;
          }

          const result = await response.json();

          if (result.ok && result.suggestions?.length > 0) {
            // Check if token appears in suggestions
            const match = result.suggestions.find((s: any) =>
              s.text.toLowerCase() === token.toLowerCase()
            );

            if (match) {
              scores[token] = {
                score: (11 - match.rank) / 10, // Rank 1 → 1.0, Rank 10 → 0.1
                rank: match.rank,
                appears: true,
              };
            } else {
              scores[token] = { score: 0, rank: null, appears: false };
            }
          } else {
            scores[token] = { score: 0, rank: null, appears: false };
          }
        } catch (error) {
          console.warn(`[fetchAutocompleteScores] Failed for token "${token}":`, error);
          scores[token] = { score: 0, rank: null, appears: false };
        }
      })
    );

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return scores;
}

/**
 * Calculate length prior (short-tail bias)
 */
function calculateLengthPrior(keyword: string): { score: number; word_count: number } {
  const words = keyword.trim().split(/\s+/);
  const word_count = words.length;

  // Formula: 1 / word_count (normalized)
  // 1 word → 1.0
  // 2 words → 0.5
  // 3 words → 0.33
  // 4+ words → 0.25
  const score = 1 / Math.min(word_count, 4);

  return { score, word_count };
}
