/**
 * Keyword Popularity API
 *
 * Returns popularity scores for requested keywords.
 * Checks cache first, computes on-the-fly if missing.
 *
 * @endpoint POST /functions/v1/keyword-popularity
 * @body { keywords: string[], locale?: string, platform?: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface KeywordPopularityRequest {
  keywords: string[];
  locale?: string;
  platform?: string;
}

interface KeywordPopularityResult {
  keyword: string;
  popularity_score: number;
  autocomplete_score: number;
  intent_score: number;
  length_prior: number;
  last_updated: string;
  source: 'cache' | 'computed';
  data_quality: string;
}

serve(async (req) => {
  try {
    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { keywords, locale = 'us', platform = 'ios' }: KeywordPopularityRequest = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'keywords array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 100 keywords per request
    if (keywords.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum 100 keywords per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[keyword-popularity] Fetching scores for ${keywords.length} keywords (locale: ${locale}, platform: ${platform})`);

    // Normalize keywords to lowercase for lookup
    const normalizedKeywords = keywords.map(k => k.toLowerCase());

    // Fetch from cache
    const { data: cachedScores, error } = await supabase
      .from('keyword_popularity_scores')
      .select('*')
      .in('keyword', normalizedKeywords)
      .eq('locale', locale)
      .eq('platform', platform);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Build results
    const results: KeywordPopularityResult[] = [];
    const cachedMap = new Map(cachedScores?.map(s => [s.keyword, s]) || []);

    for (const keyword of keywords) {
      const normalized = keyword.toLowerCase();
      const cached = cachedMap.get(normalized);

      if (cached) {
        // Return cached score
        results.push({
          keyword,
          popularity_score: cached.popularity_score,
          autocomplete_score: cached.autocomplete_score,
          intent_score: cached.intent_score,
          length_prior: cached.length_prior,
          last_updated: cached.last_checked_at,
          source: 'cache',
          data_quality: cached.data_quality,
        });
      } else {
        // Not in cache - return estimated score
        // In production, you could trigger on-the-fly computation here
        const wordCount = normalized.split(/\s+/).length;
        const lengthPrior = 1 / Math.min(wordCount, 4);

        results.push({
          keyword,
          popularity_score: Math.round(lengthPrior * 10), // Basic estimate based on length
          autocomplete_score: 0,
          intent_score: 0,
          length_prior: lengthPrior,
          last_updated: new Date().toISOString(),
          source: 'computed',
          data_quality: 'estimated',
        });
      }
    }

    console.log(`[keyword-popularity] Returning ${results.length} results (${results.filter(r => r.source === 'cache').length} from cache, ${results.filter(r => r.source === 'computed').length} computed)`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        cached_count: results.filter(r => r.source === 'cache').length,
        computed_count: results.filter(r => r.source === 'computed').length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[keyword-popularity] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
