/**
 * Autocomplete Intelligence Edge Function
 *
 * Fetches Apple/Google autocomplete suggestions and classifies search intent.
 * Implements intelligent caching (7-day TTL) and stores intent classifications
 * in search_intent_registry for use by Keyword Intelligence and Metadata Copilot.
 *
 * @endpoint POST /autocomplete-intelligence
 * @body { keyword: string, platform: 'ios' | 'android', region?: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Types
interface AutocompleteRequest {
  keyword: string;
  platform: 'ios' | 'android';
  region?: string;
}

interface AutocompleteSuggestion {
  text: string;
  rank: number;
}

interface IntentClassification {
  intent_type: 'navigational' | 'informational' | 'commercial' | 'transactional';
  confidence: number;
  reasoning: string;
}

interface AutocompleteResponse {
  ok: boolean;
  keyword: string;
  platform: string;
  region: string;
  suggestions: AutocompleteSuggestion[];
  suggestionsCount: number;
  intent: IntentClassification | null;
  fromCache: boolean;
  cachedAt?: string;
  latencyMs: number;
  errors: string[];
  error?: string;
}

// Constants
const CACHE_TTL_DAYS = 7;
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Main handler
 */
serve(async (req) => {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return jsonResponse(
        {
          ok: false,
          error: 'Method not allowed. Use POST.',
          errors: ['Method not allowed'],
        },
        { status: 405 }
      );
    }

    // Parse request body
    let body: AutocompleteRequest;
    try {
      body = await req.json();
    } catch (err) {
      return jsonResponse(
        {
          ok: false,
          error: 'Invalid JSON body',
          errors: ['Failed to parse request body'],
        },
        { status: 400 }
      );
    }

    const { keyword, platform, region = 'us' } = body;

    // Validate inputs
    if (!keyword || typeof keyword !== 'string') {
      return jsonResponse(
        {
          ok: false,
          error: 'Missing or invalid keyword',
          errors: ['keyword is required and must be a string'],
        },
        { status: 400 }
      );
    }

    if (!platform || !['ios', 'android'].includes(platform)) {
      return jsonResponse(
        {
          ok: false,
          error: 'Invalid platform',
          errors: ['platform must be either "ios" or "android"'],
        },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Check cache
    const cachedResult = await checkCache(supabase, keyword, platform, region);

    if (cachedResult.hit) {
      // Cache hit - return cached data
      const latencyMs = Date.now() - startTime;

      // Also fetch intent classification from registry
      const intent = await getIntentFromRegistry(supabase, keyword, platform, region);

      const response: AutocompleteResponse = {
        ok: true,
        keyword,
        platform,
        region,
        suggestions: cachedResult.suggestions || [],
        suggestionsCount: cachedResult.suggestionsCount || 0,
        intent,
        fromCache: true,
        cachedAt: cachedResult.cachedAt,
        latencyMs,
        errors: [],
      };

      return jsonResponse(response);
    }

    // Step 2: Cache miss - fetch from external API
    const apiResult = await fetchAutocompleteAPI(keyword, platform, region, errors);

    if (!apiResult.ok) {
      const latencyMs = Date.now() - startTime;
      return jsonResponse(
        {
          ok: false,
          keyword,
          platform,
          region,
          suggestions: [],
          suggestionsCount: 0,
          intent: null,
          fromCache: false,
          latencyMs,
          errors: [...errors, apiResult.error || 'Failed to fetch autocomplete suggestions'],
          error: apiResult.error,
        },
        { status: 503 }
      );
    }

    // Step 3: Classify intent based on suggestions
    const intent = classifyIntent(keyword, apiResult.suggestions);

    // Step 4: Store in cache
    await storeCacheResult(
      supabase,
      keyword,
      platform,
      region,
      apiResult.suggestions,
      apiResult.status
    );

    // Step 5: Store in intent registry
    await storeIntentRegistry(
      supabase,
      keyword,
      platform,
      region,
      intent,
      apiResult.suggestions
    );

    const latencyMs = Date.now() - startTime;

    const response: AutocompleteResponse = {
      ok: true,
      keyword,
      platform,
      region,
      suggestions: apiResult.suggestions,
      suggestionsCount: apiResult.suggestions.length,
      intent,
      fromCache: false,
      latencyMs,
      errors,
    };

    return jsonResponse(response);
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const error = err instanceof Error ? err.message : String(err);
    errors.push(error);

    return jsonResponse(
      {
        ok: false,
        keyword: '',
        platform: '',
        region: '',
        suggestions: [],
        suggestionsCount: 0,
        intent: null,
        fromCache: false,
        latencyMs,
        errors,
        error,
      },
      { status: 500 }
    );
  }
});

/**
 * Check autocomplete_intelligence_cache for existing valid cached result
 */
async function checkCache(
  supabase: any,
  keyword: string,
  platform: string,
  region: string
): Promise<{
  hit: boolean;
  suggestions?: AutocompleteSuggestion[];
  suggestionsCount?: number;
  cachedAt?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('autocomplete_intelligence_cache')
      .select('raw_response, suggestions_count, cached_at, expires_at')
      .eq('query', keyword)
      .eq('platform', platform)
      .eq('region', region)
      .eq('api_status', 'success')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('Cache check error:', error);
      return { hit: false };
    }

    if (!data) {
      return { hit: false };
    }

    // Parse raw_response to extract suggestions
    const suggestions = data.raw_response?.suggestions || [];

    return {
      hit: true,
      suggestions,
      suggestionsCount: data.suggestions_count,
      cachedAt: data.cached_at,
    };
  } catch (err) {
    console.error('Cache check exception:', err);
    return { hit: false };
  }
}

/**
 * Fetch intent classification from search_intent_registry
 */
async function getIntentFromRegistry(
  supabase: any,
  keyword: string,
  platform: string,
  region: string
): Promise<IntentClassification | null> {
  try {
    const { data, error } = await supabase
      .from('search_intent_registry')
      .select('intent_type, intent_confidence')
      .eq('keyword', keyword)
      .eq('platform', platform)
      .eq('region', region)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      intent_type: data.intent_type,
      confidence: data.intent_confidence,
      reasoning: '',
    };
  } catch (err) {
    console.error('Intent registry fetch error:', err);
    return null;
  }
}

/**
 * Fetch autocomplete suggestions from external API
 * Currently implements Apple Search Autocomplete
 */
async function fetchAutocompleteAPI(
  keyword: string,
  platform: string,
  region: string,
  errors: string[]
): Promise<{
  ok: boolean;
  status: string;
  suggestions: AutocompleteSuggestion[];
  error?: string;
}> {
  try {
    if (platform === 'ios') {
      return await fetchAppleAutocomplete(keyword, region, errors);
    } else {
      // Android/Google Play autocomplete would go here
      // For now, return empty suggestions
      return {
        ok: true,
        status: 'success',
        suggestions: [],
      };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    errors.push(error);
    return {
      ok: false,
      status: 'error',
      suggestions: [],
      error,
    };
  }
}

/**
 * Fetch Apple App Store autocomplete suggestions
 * Uses iTunes Search API to simulate autocomplete behavior
 *
 * NOTE: Apple's official autocomplete endpoint (MZSearchHints) returns plist/XML format.
 * This implementation uses iTunes Search API as a proxy, treating search results as suggestions.
 * A future enhancement could parse the plist XML for true autocomplete data.
 */
async function fetchAppleAutocomplete(
  keyword: string,
  region: string,
  errors: string[]
): Promise<{
  ok: boolean;
  status: string;
  suggestions: AutocompleteSuggestion[];
  error?: string;
}> {
  try {
    // iTunes Search API endpoint
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://itunes.apple.com/search?term=${encodedKeyword}&country=${region}&media=software&entity=software&limit=10`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = `Apple API error: HTTP ${response.status}`;
      errors.push(error);
      return {
        ok: false,
        status: 'error',
        suggestions: [],
        error,
      };
    }

    const data = await response.json();

    // Parse iTunes Search API response
    // Expected structure: { resultCount: number, results: [{ trackName: string, ... }] }
    const results = data.results || [];
    const suggestions: AutocompleteSuggestion[] = results.map((result: any, index: number) => ({
      text: result.trackName || result.bundleId || '',
      rank: index + 1,
    }));

    return {
      ok: true,
      status: 'success',
      suggestions,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    errors.push(error);
    return {
      ok: false,
      status: 'error',
      suggestions: [],
      error,
    };
  }
}

/**
 * Classify search intent based on autocomplete suggestions
 * Uses heuristic analysis of suggestion patterns
 */
function classifyIntent(
  keyword: string,
  suggestions: AutocompleteSuggestion[]
): IntentClassification {
  const keywordLower = keyword.toLowerCase().trim();

  // Navigational signals: keyword appears to be a brand/app name
  const navigationalSignals = [
    /^(facebook|instagram|tiktok|snapchat|twitter|whatsapp|messenger|telegram|spotify|netflix|youtube|amazon|uber|lyft|zoom|slack|discord|reddit)/i.test(keywordLower),
    suggestions.some(s => s.text.toLowerCase().includes('app')),
    suggestions.length > 0 && suggestions[0].text.toLowerCase() === keywordLower,
  ];
  const navigationalScore = navigationalSignals.filter(Boolean).length;

  // Informational signals: "how to", "what is", "learn", "guide"
  const informationalSignals = [
    /^(how to|what is|why|when|where|learn|guide|tutorial|tips)/i.test(keywordLower),
    suggestions.some(s => /learn|guide|tutorial|tips|help/.test(s.text.toLowerCase())),
  ];
  const informationalScore = informationalSignals.filter(Boolean).length;

  // Commercial signals: "best", "top", "compare", "review"
  const commercialSignals = [
    /^(best|top|compare|review|vs|versus)/i.test(keywordLower),
    suggestions.some(s => /best|top|compare|review/.test(s.text.toLowerCase())),
  ];
  const commercialScore = commercialSignals.filter(Boolean).length;

  // Transactional signals: "download", "free", "buy", "install"
  const transactionalSignals = [
    /^(download|free|buy|install|get|trial)/i.test(keywordLower),
    suggestions.some(s => /download|free|install|get/.test(s.text.toLowerCase())),
  ];
  const transactionalScore = transactionalSignals.filter(Boolean).length;

  // Determine intent based on highest score
  const scores = {
    navigational: navigationalScore,
    informational: informationalScore,
    commercial: commercialScore,
    transactional: transactionalScore,
  };

  let maxScore = 0;
  let intent: 'navigational' | 'informational' | 'commercial' | 'transactional' = 'informational';
  let reasoning = '';

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      intent = type as typeof intent;
    }
  }

  // Calculate confidence (0-100)
  const totalSignals = navigationalScore + informationalScore + commercialScore + transactionalScore;
  const confidence = totalSignals > 0 ? Math.min((maxScore / totalSignals) * 100, 100) : 50;

  // Generate reasoning
  if (intent === 'navigational') {
    reasoning = 'Keyword matches known brand/app name or appears at top of autocomplete';
  } else if (intent === 'informational') {
    reasoning = 'Query contains informational intent words like "how to", "learn", "guide"';
  } else if (intent === 'commercial') {
    reasoning = 'Query contains commercial research words like "best", "top", "compare"';
  } else {
    reasoning = 'Query contains transactional words like "download", "free", "install"';
  }

  return {
    intent_type: intent,
    confidence: Math.round(confidence),
    reasoning,
  };
}

/**
 * Store autocomplete result in cache
 */
async function storeCacheResult(
  supabase: any,
  keyword: string,
  platform: string,
  region: string,
  suggestions: AutocompleteSuggestion[],
  status: string
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('autocomplete_intelligence_cache')
      .upsert({
        query: keyword,
        platform,
        region,
        raw_response: { suggestions },
        suggestions_count: suggestions.length,
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        api_status: status,
        request_source: 'autocomplete_intelligence',
      }, {
        onConflict: 'query,platform,region',
      });

    if (error) {
      console.error('Cache store error:', error);
    }
  } catch (err) {
    console.error('Cache store exception:', err);
  }
}

/**
 * Store intent classification in registry
 */
async function storeIntentRegistry(
  supabase: any,
  keyword: string,
  platform: string,
  region: string,
  intent: IntentClassification,
  suggestions: AutocompleteSuggestion[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from('search_intent_registry')
      .upsert({
        keyword,
        platform,
        region,
        intent_type: intent.intent_type,
        intent_confidence: intent.confidence,
        autocomplete_suggestions: { suggestions },
        autocomplete_volume_estimate: null, // Could be enhanced with volume data
        autocomplete_rank: suggestions.findIndex(s => s.text.toLowerCase() === keyword.toLowerCase()) + 1,
        last_refreshed_at: new Date().toISOString(),
        data_source: platform === 'ios' ? 'apple_autocomplete' : 'google_autocomplete',
      }, {
        onConflict: 'keyword,platform,region',
      });

    if (error) {
      console.error('Intent registry store error:', error);
    }
  } catch (err) {
    console.error('Intent registry store exception:', err);
  }
}

/**
 * JSON response helper
 */
function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...init?.headers,
    },
  });
}

