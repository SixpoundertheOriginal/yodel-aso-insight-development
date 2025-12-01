/**
 * Check Combo Rankings Edge Function
 *
 * Fetches App Store rankings for keyword combos (multi-word phrases) using iTunes Search API.
 * Supports top 100 rankings and caches results for 24 hours.
 *
 * Flow:
 * 1. Validate request (appId, combos[], country)
 * 2. Check database cache (< 24h = use cached)
 * 3. For each combo, query iTunes Search API
 * 4. Find app's position in results (1-100 or null)
 * 5. Calculate trend vs previous snapshot
 * 6. Store in keyword_rankings table
 * 7. Return results
 *
 * @endpoint POST /functions/v1/check-combo-rankings
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

console.log('🔵 [MODULE] check-combo-rankings module loading...');

// Types
interface CheckComboRankingsRequest {
  appId: string; // iTunes trackId
  combos: string[]; // Array of keyword combos (e.g., ["wellness self", "mental health"])
  country?: string; // ISO 3166-1 alpha-2 (default: 'us')
  platform?: string; // 'ios' or 'android' (default: 'ios')
  organizationId: string;
}

interface ComboRankingResult {
  combo: string;
  position: number | null; // 1-200 or null if not ranking
  isRanking: boolean;
  totalResults: number | null; // Total apps in results, or null if data unavailable
  checkedAt: string;
  trend: 'up' | 'down' | 'stable' | 'new' | null;
  positionChange: number | null;
}

interface CheckComboRankingsResponse {
  success: boolean;
  results?: ComboRankingResult[];
  cached?: boolean;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface iTunesSearchResult {
  resultCount: number;
  results: Array<{
    trackId: number;
    trackName: string;
    artistName: string;
    artworkUrl512?: string;
  }>;
}

// Constants
const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
const CACHE_TTL_HOURS = 24;
const MAX_PARALLEL_REQUESTS = 10;
const REQUEST_DELAY_MS = 50; // Delay between batches to respect rate limits
const TOP_N_RESULTS = 200; // Check top 200 (iTunes API maximum)

// Security & Validation Constants
const MAX_COMBOS_PER_REQUEST = 100;
const MAX_COMBO_LENGTH = 100;
const SUPPORTED_COUNTRIES = ['us', 'gb', 'ca', 'au', 'de', 'fr', 'es', 'it', 'jp', 'kr'];

// ============================================================================
// RATE LIMITER (Token Bucket Algorithm)
// ============================================================================

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens = 20;      // Max burst capacity
  private readonly refillRate = 2;       // Tokens per second

  constructor() {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    // Refill tokens based on time elapsed
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + (elapsedSeconds * this.refillRate)
    );
    this.lastRefill = now;

    // Wait if no tokens available
    if (this.tokens < 1) {
      const waitMs = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
      console.log(`[RateLimiter] Waiting ${waitMs}ms for token`);
      await delay(waitMs);
      this.tokens = 1;
    }

    this.tokens -= 1;
  }
}

console.log('🔵 [MODULE] Creating RateLimiter...');
const itunesRateLimiter = new RateLimiter();
console.log('🔵 [MODULE] RateLimiter created');

// ============================================================================
// CIRCUIT BREAKER (Prevent hammering failed APIs)
// ============================================================================

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 5;
  private readonly timeoutMs = 60000;  // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If circuit is open, check if timeout elapsed
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.timeoutMs) {
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN state');
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker OPEN - iTunes API temporarily unavailable');
      }
    }

    try {
      const result = await fn();

      // Success in HALF_OPEN state -> close circuit
      if (this.state === 'HALF_OPEN') {
        console.log('[CircuitBreaker] Success in HALF_OPEN, closing circuit');
        this.state = 'CLOSED';
        this.failures = 0;
      }

      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();

      // Open circuit if threshold reached
      if (this.failures >= this.failureThreshold) {
        console.error(`[CircuitBreaker] Threshold reached (${this.failures} failures), opening circuit`);
        this.state = 'OPEN';
      }

      throw err;
    }
  }

  getState(): string {
    return this.state;
  }
}

console.log('🔵 [MODULE] Creating CircuitBreaker...');
const itunesCircuitBreaker = new CircuitBreaker();
console.log('🔵 [MODULE] CircuitBreaker created');

// ============================================================================
// REQUEST DEDUPLICATION (Prevent duplicate in-flight fetches)
// ============================================================================

console.log('🔵 [MODULE] Creating inFlightRequests Map...');
const inFlightRequests = new Map<string, Promise<ComboRankingResult>>();
console.log('🔵 [MODULE] inFlightRequests Map created');

function getRequestKey(appId: string, combo: string, country: string, platform: string): string {
  return `${appId}:${combo}:${country}:${platform}`;
}

// ============================================================================
// STRUCTURED LOGGING
// ============================================================================

interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  metadata?: any;
}

function logEvent(level: LogEvent['level'], event: string, metadata?: any): void {
  const logEntry: LogEvent = {
    timestamp: new Date().toISOString(),
    level,
    event,
    metadata,
  };
  console.log(JSON.stringify(logEntry));
}

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

interface PerformanceMetrics {
  requestStart: number;
  cacheCheckDuration?: number;
  apiCallsDuration?: number;
  totalCombos: number;
  cachedCombos: number;
  fetchedCombos: number;
  rankingCombos: number;
  errorCombos: number;
}

function createMetrics(): PerformanceMetrics {
  return {
    requestStart: Date.now(),
    totalCombos: 0,
    cachedCombos: 0,
    fetchedCombos: 0,
    rankingCombos: 0,
    errorCombos: 0,
  };
}

// ============================================================================
// RETRY LOGIC (Exponential Backoff)
// ============================================================================

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isLastAttempt = attempt === maxRetries - 1;

      // Don't retry certain errors
      if (err.message?.includes('404') || err.message?.includes('401') || err.message?.includes('Circuit breaker')) {
        throw err;
      }

      if (isLastAttempt) {
        throw err;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delayMs}ms:`, err.message);
      await delay(delayMs);
    }
  }
  throw new Error('Retry logic exhausted');
}

// ============================================================================
// TIMEOUT WRAPPER
// ============================================================================

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Yodel-ASO-Platform/1.0',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw err;
  }
}

// Main handler
console.log('🔵 [MODULE] About to call serve()...');
serve(async (req) => {
  console.log('[check-combo-rankings] 🚀 Handler invoked');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[check-combo-rankings] Method:', req.method);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[check-combo-rankings] Supabase client created');

    // ============================================================================
    // AUTHENTICATION & AUTHORIZATION
    // ============================================================================

    // Extract JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid Authorization header',
          },
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.warn('[check-combo-rankings] Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CheckComboRankingsRequest = await req.json();
    const { appId, combos, country = 'us', platform = 'ios', organizationId } = body;

    console.log('[check-combo-rankings] Request:', {
      appId,
      combosCount: combos?.length,
      country,
      platform,
      organizationId: organizationId?.slice(0, 8) + '...'
    });

    // Verify user has access to organization
    const { data: orgAccess, error: orgError } = await supabase
      .from('user_roles')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (orgError || !orgAccess) {
      console.warn('[check-combo-rankings] Org access denied:', { userId: user.id, organizationId });
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'No access to this organization',
          },
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize performance metrics
    const metrics = createMetrics();
    metrics.totalCombos = combos.length;

    logEvent('info', 'request_started', {
      userId: user.id,
      organizationId,
      appId,
      combosCount: combos.length,
      country,
      platform,
      userRole: orgAccess.role,
    });

    // ============================================================================
    // INPUT VALIDATION
    // ============================================================================

    // Validate required fields
    if (!appId || !combos || !Array.isArray(combos) || combos.length === 0 || !organizationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: appId, combos (array), organizationId',
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate combos count
    if (combos.length > MAX_COMBOS_PER_REQUEST) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'LIMIT_EXCEEDED',
            message: `Maximum ${MAX_COMBOS_PER_REQUEST} combos allowed per request. Received: ${combos.length}`,
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each combo
    for (const combo of combos) {
      if (typeof combo !== 'string' || combo.trim().length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_COMBO',
              message: 'Each combo must be a non-empty string',
            },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (combo.length > MAX_COMBO_LENGTH) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'COMBO_TOO_LONG',
              message: `Combo exceeds maximum length of ${MAX_COMBO_LENGTH} characters: "${combo.substring(0, 50)}..."`,
            },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate country code
    if (!SUPPORTED_COUNTRIES.includes(country.toLowerCase())) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNSUPPORTED_COUNTRY',
            message: `Country '${country}' not supported. Supported countries: ${SUPPORTED_COUNTRIES.join(', ')}`,
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate appId format (iTunes app IDs are numeric)
    if (!/^\d+$/.test(appId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_APP_ID',
            message: `Invalid appId format. Must be numeric. Received: "${appId}"`,
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Check if app is monitored (for historical tracking)
    const { data: appData } = await supabase
      .from('monitored_apps')
      .select('id')
      .eq('app_id', appId)
      .eq('platform', platform)
      .single();

    const isMonitored = !!appData;
    const appUUID = appData?.id || null; // null = ephemeral mode (no database writes)
    const results: ComboRankingResult[] = [];

    logEvent('info', 'app_mode_detected', {
      appId,
      isMonitored,
      mode: isMonitored ? 'tracked' : 'ephemeral',
    });

    // Step 1: Check cache for all combos (check combo_rankings_cache first - works for ALL apps)
    const cacheCheckStart = Date.now();

    // Check combo_rankings_cache first (no FK constraints, works even if app FK is broken)
    let cachedRankingsMap = await checkComboCache(supabase, appId, combos, platform, country);

    // If still have uncached combos and app is monitored, try keywords table cache (has FK constraints)
    if (cachedRankingsMap.size < combos.length && isMonitored) {
      const uncachedCombos = combos.filter(c => !cachedRankingsMap.has(c));
      const keywordsCache = await getBatchCachedRankings(supabase, appUUID!, uncachedCombos, platform, country);
      // Merge caches
      for (const [combo, data] of keywordsCache.entries()) {
        cachedRankingsMap.set(combo, data);
      }
    }

    metrics.cacheCheckDuration = Date.now() - cacheCheckStart;

    // Separate cached vs fresh combos
    const cachedResults: string[] = [];
    const freshResults: string[] = [];

    for (const combo of combos) {
      const cached = cachedRankingsMap.get(combo);
      if (cached) {
        results.push(cached);
        cachedResults.push(combo);
        metrics.cachedCombos++;
        if (cached.isRanking) metrics.rankingCombos++;
      } else {
        freshResults.push(combo);
      }
    }

    const cacheHitRate = (cachedResults.length / combos.length * 100).toFixed(1);
    logEvent('info', 'cache_check_complete', {
      cached: cachedResults.length,
      needsFetch: freshResults.length,
      cacheHitRate: `${cacheHitRate}%`,
      duration: metrics.cacheCheckDuration,
    });

    // Step 2: Fetch fresh rankings for uncached combos in batches
    if (freshResults.length > 0) {
      const apiCallsStart = Date.now();
      const batches = chunkArray(freshResults, MAX_PARALLEL_REQUESTS);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logEvent('info', 'processing_batch', {
          batchNumber: i + 1,
          totalBatches: batches.length,
          batchSize: batch.length,
        });

        const batchResults = await Promise.all(
          batch.map((combo) => fetchAndStoreRanking(supabase, appUUID, appId, combo, country, platform, organizationId))
        );

        results.push(...batchResults);

        // Count fetched combos and errors
        for (const result of batchResults) {
          metrics.fetchedCombos++;
          if (result.isRanking) metrics.rankingCombos++;
          if ((result as any).error) metrics.errorCombos++;
        }

        // Delay between batches to respect rate limits
        if (i < batches.length - 1) {
          await delay(REQUEST_DELAY_MS);
        }
      }

      metrics.apiCallsDuration = Date.now() - apiCallsStart;
    }

    // Sort results by position (ranking first, then non-ranking)
    results.sort((a, b) => {
      if (a.position === null && b.position === null) return 0;
      if (a.position === null) return 1;
      if (b.position === null) return -1;
      return a.position - b.position;
    });

    // Log completion with full metrics
    const totalDuration = Date.now() - metrics.requestStart;
    logEvent('info', 'request_completed', {
      totalDuration,
      cacheCheckDuration: metrics.cacheCheckDuration,
      apiCallsDuration: metrics.apiCallsDuration,
      totalCombos: metrics.totalCombos,
      cachedCombos: metrics.cachedCombos,
      fetchedCombos: metrics.fetchedCombos,
      rankingCombos: metrics.rankingCombos,
      errorCombos: metrics.errorCombos,
      cacheHitRate: `${((metrics.cachedCombos / metrics.totalCombos) * 100).toFixed(1)}%`,
      successRate: `${(((metrics.totalCombos - metrics.errorCombos) / metrics.totalCombos) * 100).toFixed(1)}%`,
      circuitBreakerState: itunesCircuitBreaker.getState(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        cached: cachedResults.length === combos.length,
      } as CheckComboRankingsResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[check-combo-rankings] Error:', error);
    logEvent('error', 'request_failed', {
      error: error.message,
      stack: error.stack,
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
          details: error,
        },
      } as CheckComboRankingsResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Save to combo_rankings_cache (no FK constraints, always works)
async function saveToComboCache(
  supabase: any,
  organizationId: string,
  appId: string,
  combo: string,
  platform: string,
  country: string,
  rankingData: {
    position: number | null;
    isRanking: boolean;
    totalResults: number | null;
    trend: string | null;
    positionChange: number | null;
  }
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('combo_rankings_cache')
      .upsert({
        organization_id: organizationId,
        app_store_id: appId,
        combo,
        platform,
        country,
        position: rankingData.position,
        is_ranking: rankingData.isRanking,
        total_results: rankingData.totalResults,
        snapshot_date: today,
        checked_at: new Date().toISOString(),
        trend: rankingData.trend,
        position_change: rankingData.positionChange,
      }, {
        onConflict: 'app_store_id,combo,platform,country,snapshot_date'
      });

    if (error) {
      console.warn(`[saveToComboCache] Failed to save "${combo}":`, error);
    } else {
      console.log(`[saveToComboCache] ✅ Saved "${combo}" to cache`);
    }
  } catch (err) {
    console.error(`[saveToComboCache] Error for "${combo}":`, err);
  }
}

// Helper: Check combo_rankings_cache table (no FK constraints, works for all apps)
async function checkComboCache(
  supabase: any,
  appId: string,
  combos: string[],
  platform: string,
  country: string
): Promise<Map<string, ComboRankingResult>> {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[checkComboCache] Checking cache for ${combos.length} combos (date: ${today})`);

    const { data, error } = await supabase
      .from('combo_rankings_cache')
      .select('*')
      .eq('app_store_id', appId)
      .eq('platform', platform)
      .eq('country', country)
      .eq('snapshot_date', today)
      .in('combo', combos);

    if (error) {
      console.warn('[checkComboCache] Query error:', error);
      return new Map();
    }

    const resultsMap = new Map<string, ComboRankingResult>();
    for (const row of data || []) {
      resultsMap.set(row.combo, {
        combo: row.combo,
        position: row.position,
        isRanking: row.is_ranking,
        totalResults: row.total_results,
        checkedAt: row.checked_at,
        trend: row.trend,
        positionChange: row.position_change,
      });
    }

    console.log(`[checkComboCache] Cache hits: ${resultsMap.size}/${combos.length}`);
    return resultsMap;
  } catch (err) {
    console.error('[checkComboCache] Error:', err);
    return new Map();
  }
}

// Helper: Batch get cached rankings for all combos (MUCH faster than sequential)
async function getBatchCachedRankings(
  supabase: any,
  appUUID: string,
  combos: string[],
  platform: string,
  country: string
): Promise<Map<string, ComboRankingResult>> {
  try {
    console.log(`[getBatchCachedRankings] Checking cache for ${combos.length} combos`);

    // Single query to get all rankings at once (instead of N queries)
    const { data, error } = await supabase
      .from('keywords')
      .select(`
        keyword,
        keyword_rankings!inner (
          position,
          is_ranking,
          snapshot_date,
          position_change,
          trend,
          visibility_score,
          serp_snapshot
        )
      `)
      .eq('app_id', appUUID)
      .eq('platform', platform)
      .eq('region', country)
      .in('keyword', combos)
      .order('snapshot_date', { foreignTable: 'keyword_rankings', ascending: false });

    if (error) {
      console.warn('[getBatchCachedRankings] Query error:', error);
      return new Map();
    }

    const resultsMap = new Map<string, ComboRankingResult>();
    const now = new Date();

    for (const row of data || []) {
      const rankings = row.keyword_rankings;
      if (!rankings || rankings.length === 0) continue;

      const latestRanking = rankings[0]; // Already sorted by date DESC
      const snapshotDate = new Date(latestRanking.snapshot_date);
      const hoursSince = (now.getTime() - snapshotDate.getTime()) / (1000 * 60 * 60);

      // Only use if fresh (< 24h)
      if (hoursSince < CACHE_TTL_HOURS) {
        resultsMap.set(row.keyword, {
          combo: row.keyword,
          position: latestRanking.position,
          isRanking: latestRanking.is_ranking,
          totalResults: latestRanking.serp_snapshot?.total_results ?? 0,
          checkedAt: latestRanking.snapshot_date,
          trend: latestRanking.trend,
          positionChange: latestRanking.position_change,
        });
      }
    }

    console.log(`[getBatchCachedRankings] Cache hits: ${resultsMap.size}/${combos.length}`);
    return resultsMap;
  } catch (err) {
    console.error('[getBatchCachedRankings] Error:', err);
    return new Map();
  }
}

// Helper: Get cached ranking if fresh (< 24h) - DEPRECATED: Use getBatchCachedRankings instead
async function getCachedRanking(
  supabase: any,
  appUUID: string,
  combo: string,
  platform: string,
  country: string
): Promise<ComboRankingResult | null> {
  try {
    // Query latest ranking using helper function
    const { data, error } = await supabase.rpc('get_latest_combo_ranking', {
      p_app_id: appUUID,
      p_combo: combo,
      p_platform: platform,
      p_region: country,
    });

    if (error) {
      console.warn('[getCachedRanking] Query error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const ranking = data[0];

    // Check if fresh (< 24h)
    const snapshotDate = new Date(ranking.snapshot_date);
    const now = new Date();
    const hoursSinceSnapshot = (now.getTime() - snapshotDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSnapshot > CACHE_TTL_HOURS) {
      console.log(`[getCachedRanking] Cache expired for "${combo}" (${Math.round(hoursSinceSnapshot)}h old)`);
      return null;
    }

    console.log(`[getCachedRanking] Cache hit for "${combo}" (${Math.round(hoursSinceSnapshot)}h old)`);

    return {
      combo,
      position: ranking.position,
      isRanking: ranking.is_ranking,
      totalResults: ranking.serp_snapshot?.total_results ?? 0,
      checkedAt: ranking.snapshot_date,
      trend: ranking.trend,
      positionChange: ranking.position_change,
    };
  } catch (err) {
    console.error('[getCachedRanking] Error:', err);
    return null;
  }
}

// Helper: Fetch ranking from iTunes and optionally store in DB
// If appUUID is null, runs in ephemeral mode (no database writes)
async function fetchAndStoreRanking(
  supabase: any,
  appUUID: string | null,
  appId: string,
  combo: string,
  country: string,
  platform: string,
  organizationId: string
): Promise<ComboRankingResult> {
  // ============================================================================
  // REQUEST DEDUPLICATION: Check if identical request is already in-flight
  // ============================================================================
  const requestKey = getRequestKey(appId, combo, country, platform);

  if (inFlightRequests.has(requestKey)) {
    logEvent('info', 'request_deduplicated', { combo, appId, country });
    console.log(`[Deduplication] Reusing in-flight request for "${combo}"`);
    return await inFlightRequests.get(requestKey)!;
  }

  // Create new request promise
  const requestPromise = (async (): Promise<ComboRankingResult> => {
    try {
      console.log(`[fetchAndStoreRanking] 🔵 START: Fetching ranking for "${combo}"`);

      // Step 1: Query iTunes Search API with rate limiting, retry, circuit breaker, and timeout
      const searchUrl = `${ITUNES_SEARCH_URL}?term=${encodeURIComponent(combo)}&country=${country}&entity=software&limit=${TOP_N_RESULTS}`;
      console.log(`[fetchAndStoreRanking] 🌐 iTunes URL: ${searchUrl}`);

      console.log(`[fetchAndStoreRanking] ⏳ Waiting for rate limiter...`);
      const searchData: iTunesSearchResult = await retryWithBackoff(async () => {
        // Wait for rate limit token
        await itunesRateLimiter.waitForToken();
        console.log(`[fetchAndStoreRanking] ✅ Rate limiter passed`);

        // Execute with circuit breaker protection
        console.log(`[fetchAndStoreRanking] 🔌 Executing with circuit breaker (state: ${itunesCircuitBreaker.getState()})`);
        return await itunesCircuitBreaker.execute(async () => {
          console.log(`[fetchAndStoreRanking] 📡 Calling fetchWithTimeout...`);
          // Fetch with timeout
          const searchResponse = await fetchWithTimeout(searchUrl, 10000);
          console.log(`[fetchAndStoreRanking] ✅ fetchWithTimeout returned: status ${searchResponse.status}`);

          // Handle rate limit response (429)
          if (searchResponse.status === 429) {
            const retryAfter = searchResponse.headers.get('Retry-After');
            const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
            console.warn(`[iTunes API] Rate limited! Waiting ${waitMs}ms`);
            await delay(waitMs);
            throw new Error('Rate limited - will retry');
          }

          if (!searchResponse.ok) {
            throw new Error(`iTunes API error: ${searchResponse.status} ${searchResponse.statusText}`);
          }

          return await searchResponse.json();
        });
      }, 3, 1000);

    console.log(`[fetchAndStoreRanking] iTunes API success for "${combo}": resultCount=${searchData.resultCount}, results.length=${searchData.results?.length}`);

    // Step 2: Find app's position in results
    const position = searchData.results.findIndex((app) => String(app.trackId) === appId) + 1;
    const isRanking = position > 0 && position <= TOP_N_RESULTS;
    const finalPosition = isRanking ? position : null;

    console.log(`[fetchAndStoreRanking] "${combo}" -> Position: ${finalPosition || 'Not Ranked'}`);

    // Calculate trend and position change
    let trend: 'up' | 'down' | 'stable' | 'new' | null = null;
    let positionChange: number | null = null;

    // Steps 3-5: Save to database (ONLY if app is monitored)
    if (appUUID !== null) {
      try {
        // Step 3: Get or create keyword entry
        const { data: keywordData, error: keywordError } = await supabase
          .from('keywords')
          .upsert(
            {
              organization_id: organizationId,
              app_id: appUUID,
              keyword: combo,
              platform,
              region: country,
              keyword_type: 'combo',
              is_tracked: true,
              last_tracked_at: new Date().toISOString(),
            },
            {
              onConflict: 'app_id,keyword,platform,region',
              ignoreDuplicates: false,
            }
          )
          .select('id')
          .single();

        if (keywordError) {
          // Check if it's a foreign key constraint error (app doesn't exist in apps table)
          if (keywordError.code === '23503') {
            console.warn(`[fetchAndStoreRanking] ⚠️ Foreign key error for "${combo}": app_id ${appUUID} not in apps table. Falling back to ephemeral mode.`);
            // Fall back to ephemeral mode (skip database writes, just return data)
            throw new Error('FK_CONSTRAINT_SKIP_DB');
          }
          console.error('[fetchAndStoreRanking] Keyword upsert error:', keywordError);
          throw keywordError;
        }

      const keywordId = keywordData.id;

      // Step 4: Get previous ranking to calculate trend
      const { data: prevRanking } = await supabase
        .from('keyword_rankings')
        .select('position')
        .eq('keyword_id', keywordId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (!prevRanking) {
        trend = isRanking ? 'new' : null;
      } else {
        const prevPosition = prevRanking.position;

        if (prevPosition === null && finalPosition !== null) {
          trend = 'new'; // Started ranking
        } else if (prevPosition !== null && finalPosition === null) {
          trend = 'lost' as any; // Lost ranking
          positionChange = null;
        } else if (prevPosition !== null && finalPosition !== null) {
          positionChange = prevPosition - finalPosition; // Positive = improved
          if (positionChange > 0) trend = 'up';
          else if (positionChange < 0) trend = 'down';
          else trend = 'stable';
        }
      }

      // Step 5: Store ranking snapshot
      const { error: rankingError } = await supabase.from('keyword_rankings').insert({
        keyword_id: keywordId,
        position: finalPosition,
        is_ranking: isRanking,
        serp_snapshot: { total_results: searchData.resultCount, checked_top_n: TOP_N_RESULTS },
        snapshot_date: new Date().toISOString().split('T')[0], // Store as date only
        position_change: positionChange,
        trend,
        visibility_score: 0, // TODO: Calculate if we have search volume data
        estimated_traffic: null,
      });

      if (rankingError) {
        console.error('[fetchAndStoreRanking] Ranking insert error:', rankingError);
        throw rankingError;
      }

        console.log(`[fetchAndStoreRanking] ✅ Saved ranking for "${combo}" to database`);
      } catch (dbError: any) {
        // If foreign key constraint fails, fall back to ephemeral mode
        if (dbError.message === 'FK_CONSTRAINT_SKIP_DB') {
          console.log(`[fetchAndStoreRanking] ⚡ Falling back to ephemeral mode for "${combo}"`);
          trend = null;
          positionChange = null;
        } else {
          // Re-throw other database errors
          throw dbError;
        }
      }
    } else {
      console.log(`[fetchAndStoreRanking] ⚡ Ephemeral mode: skipping database write for "${combo}"`);
      // Ephemeral mode: no historical trend data
      trend = null;
      positionChange = null;
    }

    // Log searchData to debug why resultCount might be missing
    if (searchData.resultCount === undefined) {
      console.warn(`[fetchAndStoreRanking] ⚠️ searchData.resultCount is undefined for "${combo}"`, {
        hasResults: !!searchData.results,
        resultsLength: searchData.results?.length,
        searchDataKeys: Object.keys(searchData)
      });
    }

    // Save to combo_rankings_cache (ALWAYS, even if FK error prevented saving to keywords table)
    await saveToComboCache(supabase, organizationId, appId, combo, platform, country, {
      position: finalPosition,
      isRanking,
      totalResults: searchData.resultCount ?? 0,
      trend,
      positionChange,
    });

    return {
      combo,
      position: finalPosition,
      isRanking,
        totalResults: searchData.resultCount ?? 0,
        checkedAt: new Date().toISOString(),
        trend,
        positionChange,
      };
    } catch (err: any) {
      console.error(`[fetchAndStoreRanking] ❌ Error for "${combo}":`, err.message || err);
      console.error(`[fetchAndStoreRanking] Error stack:`, err.stack);
      logEvent('error', 'fetch_ranking_failed', { combo, appId, error: err.message });

      // Return error result (data unavailable)
      // Note: totalResults is null (not 0) to indicate "data unavailable" vs "no competition"
      return {
        combo,
        position: null,
        isRanking: false,
        totalResults: null,
        checkedAt: new Date().toISOString(),
        trend: null,
        positionChange: null,
      };
    } finally {
      // Clean up in-flight request tracking
      inFlightRequests.delete(requestKey);
    }
  })();

  // Store promise in map before awaiting
  inFlightRequests.set(requestKey, requestPromise);

  // Return the promise (will be awaited by caller)
  return await requestPromise;
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
