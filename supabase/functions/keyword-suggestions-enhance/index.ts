/**
 * Keyword Suggestions Enhancement Edge Function
 *
 * Phase 2: Progressive Enhancement Architecture
 *
 * Receives basic client-side suggestions and enriches them with:
 * - Search volume estimates (heuristic-based for now, can integrate ASO APIs later)
 * - Competition analysis
 * - Competitor brand filtering
 * - Re-calculated strategic scores
 *
 * Caches results for 24h to reduce compute costs.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BasicSuggestion {
  text: string;
  keywords: string[];
  length: number;
  exists: boolean;
  source?: string;
  strategicValue?: number;
}

interface EnhancedSuggestion extends BasicSuggestion {
  searchVolumeEstimate: 'high' | 'medium' | 'low' | 'unknown';
  competitionLevel: 'high' | 'medium' | 'low' | 'unknown';
  enhancedStrategicValue: number;
  isCompetitorBranded: boolean;
  confidence: number; // 0-100: How confident are we in the enhancement?
}

interface EnhanceRequest {
  appId: string;
  title: string;
  subtitle: string;
  basicSuggestions: BasicSuggestion[];
  category?: string; // Optional: App category for better estimates
}

interface EnhanceResponse {
  suggestions: EnhancedSuggestion[];
  stats: {
    totalProcessed: number;
    competitorBrandedFiltered: number;
    cacheHit: boolean;
    processingTimeMs: number;
  };
  cached: boolean;
}

/**
 * Estimate search volume based on heuristics
 *
 * Future: Replace with Apple Search Ads API or other data source
 */
function estimateSearchVolume(combo: BasicSuggestion): 'high' | 'medium' | 'low' | 'unknown' {
  const { text, length } = combo;

  // Heuristic: Shorter combos generally have higher search volume
  if (length === 2) {
    // 2-word combos: Check if contains common keywords
    const commonKeywords = ['app', 'free', 'best', 'new', 'top', 'premium', 'pro'];
    const hasCommonKeyword = commonKeywords.some(kw => text.toLowerCase().includes(kw));
    return hasCommonKeyword ? 'high' : 'medium';
  }

  if (length === 3) {
    // 3-word combos: Medium to low volume (more specific)
    return 'medium';
  }

  if (length >= 4) {
    // 4+ word combos: Low volume (very specific long-tail)
    return 'low';
  }

  return 'unknown';
}

/**
 * Estimate competition level
 *
 * Future: Analyze actual app store competition
 */
function estimateCompetition(combo: BasicSuggestion): 'high' | 'medium' | 'low' | 'unknown' {
  const { text, length } = combo;

  // Heuristic: Shorter = more competition, longer = less competition
  if (length === 2) {
    // Generic 2-word combos have high competition
    const genericPatterns = ['app for', 'free app', 'best app'];
    const isGeneric = genericPatterns.some(pattern => text.toLowerCase().includes(pattern));
    return isGeneric ? 'high' : 'medium';
  }

  if (length === 3) {
    return 'medium';
  }

  if (length >= 4) {
    return 'low'; // Long-tail has less competition
  }

  return 'unknown';
}

/**
 * Get competitor brands for filtering
 *
 * Future: Build database of competitor brands per category
 */
function getCompetitorBrands(category?: string): string[] {
  // Placeholder: Common competitor brands in wellness/meditation category
  // In production, this would come from a database
  const wellnessCompetitors = [
    'calm', 'headspace', 'betterhelp', 'talkspace', 'sanvello',
    'happify', 'shine', 'fabulous', 'youper', 'woebot'
  ];

  // TODO: Expand for other categories
  return wellnessCompetitors;
}

/**
 * Check if combo contains competitor brand
 */
function isCompetitorBranded(comboText: string, competitorBrands: string[]): boolean {
  const normalized = comboText.toLowerCase();
  return competitorBrands.some(brand => normalized.includes(brand));
}

/**
 * Re-calculate strategic value with enhanced data
 */
function recalculateStrategicValue(
  combo: BasicSuggestion,
  searchVolume: string,
  competition: string
): number {
  let score = combo.strategicValue || 50;

  // Bonus for high search volume
  if (searchVolume === 'high') score += 15;
  if (searchVolume === 'medium') score += 10;
  if (searchVolume === 'low') score += 5;

  // Penalty for high competition
  if (competition === 'high') score -= 10;
  if (competition === 'medium') score -= 5;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate confidence in enhancement
 */
function calculateConfidence(combo: BasicSuggestion): number {
  // Currently using heuristics, so confidence is moderate
  // When we integrate real APIs, confidence will be higher

  let confidence = 50; // Base confidence for heuristic approach

  // Higher confidence for simpler combos (easier to estimate)
  if (combo.length === 2) confidence += 20;
  if (combo.length === 3) confidence += 10;

  return Math.min(100, confidence);
}

/**
 * Main enhancement logic
 */
function enhanceSuggestions(
  basicSuggestions: BasicSuggestion[],
  category?: string
): EnhancedSuggestion[] {
  const competitorBrands = getCompetitorBrands(category);

  return basicSuggestions.map(combo => {
    const searchVolume = estimateSearchVolume(combo);
    const competition = estimateCompetition(combo);
    const isCompBranded = isCompetitorBranded(combo.text, competitorBrands);
    const enhancedValue = recalculateStrategicValue(combo, searchVolume, competition);
    const confidence = calculateConfidence(combo);

    return {
      ...combo,
      searchVolumeEstimate: searchVolume,
      competitionLevel: competition,
      enhancedStrategicValue: enhancedValue,
      isCompetitorBranded: isCompBranded,
      confidence,
    };
  });
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const body: EnhanceRequest = await req.json();
    const { appId, title, subtitle, basicSuggestions, category } = body;

    // Validate input
    if (!appId || !basicSuggestions || basicSuggestions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: appId, basicSuggestions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for caching
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first (24h TTL)
    const cacheKey = `keyword-suggestions:${appId}:${title}:${subtitle}`;
    const { data: cachedData } = await supabase
      .from('cache')
      .select('value, created_at')
      .eq('key', cacheKey)
      .single();

    const now = new Date();
    const cacheAge = cachedData
      ? (now.getTime() - new Date(cachedData.created_at).getTime()) / 1000 / 60 / 60
      : Infinity;

    // Return cached if < 24h old
    if (cachedData && cacheAge < 24) {
      const processingTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          ...cachedData.value,
          cached: true,
          stats: {
            ...cachedData.value.stats,
            cacheHit: true,
            processingTimeMs: processingTime,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enhance suggestions
    const enhancedSuggestions = enhanceSuggestions(basicSuggestions, category);

    // Filter out competitor-branded combos
    const genericSuggestions = enhancedSuggestions.filter(s => !s.isCompetitorBranded);

    // Calculate stats
    const stats = {
      totalProcessed: basicSuggestions.length,
      competitorBrandedFiltered: enhancedSuggestions.length - genericSuggestions.length,
      cacheHit: false,
      processingTimeMs: Date.now() - startTime,
    };

    const response: EnhanceResponse = {
      suggestions: genericSuggestions,
      stats,
      cached: false,
    };

    // Cache result (24h)
    await supabase
      .from('cache')
      .upsert({
        key: cacheKey,
        value: response,
        created_at: now.toISOString(),
      });

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error enhancing suggestions:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
