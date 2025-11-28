/**
 * App Store HTML Fetch Edge Function
 *
 * Server-side HTML fetcher for App Store pages that:
 * - Bypasses CORS restrictions
 * - Bypasses browser JS restrictions
 * - Returns sanitized DOM snapshot
 * - Supports subtitle extraction
 * - Implements retry logic with exponential backoff
 * - Rotates User-Agent headers
 * - Provides full telemetry
 * - Completely isolated (does not modify existing scrapers)
 *
 * @endpoint POST /appstore-html-fetch
 * @body { appId: string, country: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { selectUserAgent, getRandomUserAgent } from './_shared/ua.ts';
import { sanitizeAndTruncate } from './_shared/sanitize.ts';
import { buildSnapshot, extractSubtitle, validateSubtitle, extractDescription, validateDescription, extractTitle, extractDeveloper } from './_shared/dom.ts';

// Types
interface FetchRequest {
  appId: string;
  country: string;
}

interface HtmlFetchResponse {
  ok: boolean;
  appId: string;
  country: string;
  finalUrl: string;
  status: number;
  html: string;            // sanitized HTML (300KB max)
  htmlLength: number;      // original HTML length before trimming
  snapshot: string;        // minimal DOM snapshot (<header> only)
  subtitle: string | null; // extracted subtitle, if available
  description: string | null; // extracted description from JSON-LD, if available
  latencyMs: number;
  uaUsed: string;
  errors: string[];
  error?: string;
  stack?: string;
  // Enhanced: data source tracking
  dataSource?: 'html-scrape' | 'itunes-fallback';
  // Enhanced: extracted metadata for audit
  name?: string;
  title?: string;
  developer?: string;
}

interface ItunesLookupResponse {
  resultCount: number;
  results: Array<{
    trackId: number;
    trackName: string;
    artistName?: string;
    description?: string;
    averageUserRating?: number;
    userRatingCount?: number;
    artworkUrl512?: string;
    artworkUrl100?: string;
    screenshotUrls?: string[];
  }>;
}

// Constants
const OVERALL_TIMEOUT_MS = 9000;
const RETRY_DELAYS_MS = [200, 500, 1000]; // 3 attempts with increasing delays
const MAX_RETRIES = RETRY_DELAYS_MS.length;

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
        headers: getCorsHeaders(),
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
    let body: FetchRequest;
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

    const { appId, country } = body;

    // Validate inputs
    if (!appId || typeof appId !== 'string') {
      return jsonResponse(
        {
          ok: false,
          error: 'Missing or invalid appId',
          errors: ['appId is required and must be a string'],
        },
        { status: 400 }
      );
    }

    if (!country || typeof country !== 'string') {
      return jsonResponse(
        {
          ok: false,
          error: 'Missing or invalid country',
          errors: ['country is required and must be a string'],
        },
        { status: 400 }
      );
    }

    // Construct App Store URL
    const url = `https://apps.apple.com/${country}/app/id${appId}`;

    // Execute fetch with retry logic and overall timeout
    const result = await withTimeout(
      fetchWithRetry(url, appId, errors),
      OVERALL_TIMEOUT_MS,
      'Overall request timeout exceeded'
    );

    const latencyMs = Date.now() - startTime;

    // Process successful response
    if (result.ok) {
      // IMPORTANT: Extract ALL metadata from RAW HTML BEFORE sanitization
      // The sanitize step removes ALL <script> tags, including JSON-LD blocks
      const description = extractDescription(result.html);
      const validatedDescription = validateDescription(description) ? description : null;

      const title = extractTitle(result.html);
      const developer = extractDeveloper(result.html);

      // Now sanitize and truncate HTML
      const { sanitized, originalLength } = sanitizeAndTruncate(result.html);
      const snapshot = buildSnapshot(sanitized);
      const subtitle = extractSubtitle(sanitized);
      const validatedSubtitle = validateSubtitle(subtitle) ? subtitle : null;

      const response: HtmlFetchResponse = {
        ok: true,
        appId,
        country,
        finalUrl: url,
        status: result.status,
        html: sanitized,
        htmlLength: originalLength,
        snapshot,
        subtitle: validatedSubtitle,
        description: validatedDescription,
        latencyMs,
        uaUsed: result.uaUsed,
        errors,
        dataSource: 'html-scrape',
        name: title || undefined,
        title: title || undefined,
        developer: developer || undefined,
      };

      return jsonResponse(response);
    } else {
      // HTML scraping failed - try iTunes API fallback
      console.log('[MAIN] HTML scraping failed, attempting iTunes fallback...');
      errors.push(`HTML scraping failed: ${result.error}`);

      try {
        const itunesData = await fetchViaItunesLookup(appId, country);

        // Return iTunes data (NO subtitle, NO HTML)
        const response: HtmlFetchResponse = {
          ok: true,
          appId,
          country,
          finalUrl: url,
          status: 200,
          html: '',
          htmlLength: 0,
          snapshot: '',
          subtitle: '', // iTunes API does NOT have subtitle
          description: itunesData.description || null,
          latencyMs: Date.now() - startTime,
          uaUsed: result.uaUsed,
          errors: [...errors, 'HTML scraping failed, using iTunes API fallback'],
          dataSource: 'itunes-fallback',
          name: itunesData.name,
          title: itunesData.name,
          developer: itunesData.developer,
        };

        console.log('[MAIN] ✅ iTunes fallback successful');
        return jsonResponse(response);
      } catch (itunesError) {
        // Both HTML and iTunes failed - return error
        const errorMsg = itunesError instanceof Error ? itunesError.message : String(itunesError);
        console.log('[MAIN] ❌ iTunes fallback also failed:', errorMsg);

        const response: HtmlFetchResponse = {
          ok: false,
          appId,
          country,
          finalUrl: url,
          status: result.status,
          html: '',
          htmlLength: 0,
          snapshot: '',
          subtitle: null,
          description: null,
          latencyMs: Date.now() - startTime,
          uaUsed: result.uaUsed,
          errors: [...errors, result.error || 'Unknown error', `iTunes fallback failed: ${errorMsg}`],
          error: `HTML scraping and iTunes fallback both failed: ${result.error}`,
        };

        return jsonResponse(response, { status: result.status >= 500 ? 503 : 400 });
      }
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    errors.push(error);

    const response = {
      ok: false,
      appId: '',
      country: '',
      finalUrl: '',
      status: 500,
      html: '',
      htmlLength: 0,
      snapshot: '',
      subtitle: null,
      description: null,
      latencyMs,
      uaUsed: '',
      errors,
      error,
      stack: isDev() ? stack : undefined,
    };

    return jsonResponse(response, { status: 500 });
  }
});

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(
  url: string,
  appId: string,
  errors: string[]
): Promise<{
  ok: boolean;
  status: number;
  html: string;
  uaUsed: string;
  error?: string;
}> {
  let lastError = 'Unknown error';
  let lastStatus = 500;
  let uaUsed = selectUserAgent(appId);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Use consistent UA for first attempt, random for retries
      if (attempt > 0) {
        uaUsed = getRandomUserAgent();
        // Wait before retry
        await sleep(RETRY_DELAYS_MS[attempt - 1]);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OVERALL_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': uaUsed,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is OK
      if (response.ok) {
        const html = await response.text();
        return {
          ok: true,
          status: response.status,
          html,
          uaUsed,
        };
      } else {
        lastStatus = response.status;
        lastError = `HTTP ${response.status}: ${response.statusText}`;
        errors.push(`Attempt ${attempt + 1}: ${lastError}`);

        // Don't retry on 4xx errors (except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      lastError = error;
      errors.push(`Attempt ${attempt + 1}: ${error}`);

      // Check if it's an abort error
      if (error.includes('abort')) {
        lastError = 'Request timeout';
        break;
      }
    }
  }

  // All retries failed
  return {
    ok: false,
    status: lastStatus,
    html: '',
    uaUsed,
    error: lastError,
  };
}

/**
 * iTunes Lookup API Fallback
 * Used when HTML scraping completely fails (all retry attempts exhausted)
 */
async function fetchViaItunesLookup(
  appId: string,
  country: string
): Promise<{ name: string; developer: string; description: string }> {
  console.log('[ITUNES-FALLBACK] Attempting iTunes Lookup API...');

  const url = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'YodelASO/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`iTunes Lookup failed: HTTP ${response.status}`);
  }

  const data: ItunesLookupResponse = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('App not found in iTunes Lookup API');
  }

  const app = data.results[0];

  const name = (app.trackName || 'Unknown App').trim();
  const developer = (app.artistName || 'Unknown Developer').trim();
  const description = (app.description || '').trim();

  console.log('[ITUNES-FALLBACK] ✅ Fetched from iTunes API:', {
    name,
    developer,
    hasDescription: description.length > 0,
  });

  return { name, developer, description };
}

/**
 * Timeout wrapper
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: number;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * JSON response helper
 */
function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(),
      ...init?.headers,
    },
  });
}

/**
 * CORS headers
 */
function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/**
 * Check if running in development mode
 */
function isDev(): boolean {
  return Deno.env.get('ENVIRONMENT') === 'development' ||
         Deno.env.get('DENO_DEPLOYMENT_ID') === undefined;
}
