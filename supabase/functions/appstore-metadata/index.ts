/**
 * App Store Metadata Edge Function - Hardened Architecture
 *
 * Server-side scraping of Apple App Store with robust validation and fallback.
 *
 * Features:
 * - HTML Signature Detection (PRODUCT_PAGE vs REVIEW_MODAL vs ERROR_PAGE)
 * - Response Validation (content-type, size, structure)
 * - iTunes Lookup API Fallback (when scraping fails)
 * - Strict Extraction (only from verified product page elements)
 * - Pattern-Based Validation (reject review-like strings)
 * - Comprehensive Logging (full diagnostic visibility)
 *
 * Security: SSRF protection, URL validation, rate limiting, input sanitization
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

// Phase E: Schema versioning to invalidate stale cached metadata
const METADATA_SCHEMA_VERSION = 5;

// ==================== TYPES ====================

enum HTMLSignature {
  PRODUCT_PAGE = 'PRODUCT_PAGE',
  REVIEW_MODAL = 'REVIEW_MODAL',
  ERROR_PAGE = 'ERROR_PAGE',
  BLOCKED_PAGE = 'BLOCKED_PAGE',
  UNKNOWN = 'UNKNOWN',
}

interface WebMetadataResponse {
  appId: string;
  country: string;
  success: boolean;

  // Phase B: Source-specific fields
  appStoreName?: string;        // From HTML <h1> only
  appStoreSubtitle?: string;    // From HTML <h2> only
  fallbackName?: string;        // From iTunes trackName (parsed)
  fallbackSubtitle?: string;    // From iTunes trackName (parsed)
  _htmlExtraction?: boolean;    // True if from HTML, false if from API

  // Computed fields (backward compatibility)
  title: string;
  subtitle: string;
  name: string;
  developer: string;

  description: string;
  rating: number | null;
  ratingCount: number | null;

  screenshots: string[];
  icon: string | null;

  error?: string;
  _debugInfo?: {
    htmlLength: number;
    extractionTimeMs: number;
    htmlSignature: string;
    source: 'edge-scrape' | 'itunes-lookup-fallback';
    rejectionReason?: string;
  };
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

// ==================== CORS ====================

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowedOrigins = (Deno.env.get('CORS_ALLOW_ORIGIN') || '*').split(',').map(o => o.trim());

  let allowOrigin = '*';
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  } else if (!allowedOrigins.includes('*')) {
    allowOrigin = allowedOrigins[0];
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// ==================== VALIDATION ====================

function validateAppId(appId: string): void {
  if (!/^\d{6,12}$/.test(appId)) {
    throw new Error('Invalid appId: must be 6-12 digits');
  }
}

function validateCountry(country: string): void {
  if (!/^[a-z]{2}$/i.test(country)) {
    throw new Error('Invalid country: must be 2-letter ISO code');
  }
}

function validateUrl(url: string): void {
  const parsed = new URL(url);

  // SSRF Protection: Only allow apps.apple.com and itunes.apple.com
  if (parsed.hostname !== 'apps.apple.com' && parsed.hostname !== 'itunes.apple.com') {
    throw new Error('SSRF protection: Only apps.apple.com and itunes.apple.com allowed');
  }

  // Ensure HTTPS
  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }
}

// ==================== HTML SIGNATURE DETECTION ====================

/**
 * Detect what type of HTML Apple returned
 *
 * PRODUCT_PAGE: Valid app store product page
 * REVIEW_MODAL: Review modal or review-focused page
 * ERROR_PAGE: Not found or error page
 * BLOCKED_PAGE: Access denied / bot detection
 * UNKNOWN: Unrecognized structure
 */
function detectHTMLSignature(html: string): HTMLSignature {
  console.log('[HTML-SIGNATURE] Analyzing HTML structure...');

  // PRODUCT_PAGE: Must have product-header structure
  const hasProductHeader = html.includes('product-header__title') &&
                          html.includes('product-header__subtitle');

  if (hasProductHeader) {
    console.log('[HTML-SIGNATURE] ✅ PRODUCT_PAGE detected (has product-header structure)');
    return HTMLSignature.PRODUCT_PAGE;
  }

  // REVIEW_MODAL: Contains review-specific elements
  const hasReviewElements = html.includes('review-body') ||
                           html.includes('modal-content') ||
                           html.includes('customer-review') ||
                           html.includes('ugc-review');

  if (hasReviewElements) {
    console.log('[HTML-SIGNATURE] ❌ REVIEW_MODAL detected (has review elements)');
    return HTMLSignature.REVIEW_MODAL;
  }

  // ERROR_PAGE: Contains error messages
  const hasErrorMessages = html.includes('Not Found') ||
                          html.includes('could not find') ||
                          html.includes('404') ||
                          html.includes('does not exist');

  if (hasErrorMessages) {
    console.log('[HTML-SIGNATURE] ❌ ERROR_PAGE detected (has error messages)');
    return HTMLSignature.ERROR_PAGE;
  }

  // BLOCKED_PAGE: Access denied
  const hasBlockedMessages = html.includes('403 Forbidden') ||
                            html.includes('Access Denied') ||
                            html.includes('blocked');

  if (hasBlockedMessages) {
    console.log('[HTML-SIGNATURE] ❌ BLOCKED_PAGE detected (access denied)');
    return HTMLSignature.BLOCKED_PAGE;
  }

  console.log('[HTML-SIGNATURE] ⚠️ UNKNOWN signature (no recognizable structure)');
  return HTMLSignature.UNKNOWN;
}

/**
 * Validate HTTP response before processing
 */
function validateResponse(response: Response, html: string, requestId: string): boolean {
  console.log(`[${requestId}] [VALIDATION] Validating HTTP response...`);

  // Check status
  if (response.status !== 200) {
    console.error(`[${requestId}] [VALIDATION] ❌ Invalid status: ${response.status}`);
    return false;
  }

  // Check content-type
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('text/html')) {
    console.error(`[${requestId}] [VALIDATION] ❌ Invalid content-type: ${contentType}`);
    return false;
  }

  // Check size (valid product pages are >50KB)
  if (html.length < 50000) {
    console.warn(`[${requestId}] [VALIDATION] ⚠️ HTML too small: ${html.length} bytes (expected >50KB)`);
    return false;
  }

  console.log(`[${requestId}] [VALIDATION] ✅ Response valid: ${response.status}, ${html.length} bytes, ${contentType}`);
  return true;
}

// ==================== PATTERN VALIDATION ====================

/**
 * Detect if a string looks like a review title (not an app name)
 */
function isReviewLikeString(text: string): boolean {
  if (!text || text.length === 0) return false;

  // Contains ellipsis (common in reviews)
  if (text.includes('…') || text.includes('...')) {
    console.log(`[PATTERN-VALIDATION] ❌ Review pattern: contains ellipsis`);
    return true;
  }

  // First-person pronouns (reviews use "I", "my", "me")
  if (/\b(I|my|me|we|our)\b/i.test(text)) {
    console.log(`[PATTERN-VALIDATION] ❌ Review pattern: first-person pronouns`);
    return true;
  }

  // All-caps shouting (review titles often SHOUT)
  const hasLetters = /[a-zA-Z]/.test(text);
  const isAllCaps = text === text.toUpperCase();
  if (hasLetters && isAllCaps && text.length > 10) {
    console.log(`[PATTERN-VALIDATION] ❌ Review pattern: all-caps shouting`);
    return true;
  }

  // Length checks (app names typically 15-50 chars)
  if (text.length < 15 || text.length > 60) {
    console.log(`[PATTERN-VALIDATION] ⚠️ Unusual length: ${text.length} chars`);
    return true;
  }

  return false;
}

// ==================== PHASE C: COMPUTE FINAL FIELDS ====================

/**
 * Phase C: Compute final name/title/subtitle from source-specific fields
 *
 * Rules:
 * - When _htmlExtraction === true: Use ONLY HTML fields (appStoreName, appStoreSubtitle)
 * - When _htmlExtraction === false: Use ONLY fallback fields, reconstruct name if subtitle exists
 */
/**
 * Phase E: CRITICAL FIX - Compute final metadata fields
 *
 * HTML Mode: Use real App Store data (h1 + h2)
 * Fallback Mode: Use FULL trackName as name, NO subtitle (iTunes API doesn't have real subtitles)
 */
function computeFinalFields(params: {
  appStoreName?: string;
  appStoreSubtitle?: string;
  fallbackName?: string;
  fallbackSubtitle?: string;
  _htmlExtraction: boolean;
}): { name: string; title: string; subtitle: string } {
  const { appStoreName, appStoreSubtitle, fallbackName, _htmlExtraction } = params;

  if (_htmlExtraction) {
    // HTML mode: Use ONLY HTML fields (real App Store data)
    const name = appStoreName || 'Unknown App';
    return {
      name,
      title: name, // Backward compatibility
      subtitle: appStoreSubtitle || '',
    };
  } else {
    // Phase E FIX: Fallback mode - Use FULL trackName as name, NO subtitle
    // iTunes API does NOT provide the real App Store subtitle
    // The trackName IS the full canonical app name (e.g., "Pimsleur | Language Learning")
    const fullName = fallbackName || 'Unknown App';

    return {
      name: fullName,       // Full trackName (e.g., "Pimsleur | Language Learning")
      title: fullName,      // Backward compatibility
      subtitle: '',         // ✅ FIX: No real subtitle in iTunes API
    };
  }
}

// ==================== ITUNES LOOKUP FALLBACK ====================

/**
 * Parse title and subtitle from iTunes trackName
 *
 * iTunes API returns combined "Title - Subtitle" or "Title | Subtitle" in trackName.
 * This function splits it using common separators.
 *
 * Examples:
 * - "Pimsleur | Language Learning" → { title: "Pimsleur", subtitle: "Language Learning" }
 * - "Instagram" → { title: "Instagram", subtitle: "" }
 * - "TikTok - Make Your Day" → { title: "TikTok", subtitle: "Make Your Day" }
 */
function parseTrackName(trackName: string): { title: string; subtitle: string } {
  if (!trackName || typeof trackName !== 'string') {
    return { title: 'Unknown App', subtitle: '' };
  }

  const trimmed = trackName.trim();

  // Check for common separators (must match frontend iTunes adapter logic)
  const separators = [' - ', ' – ', ' — ', ' | ', ': ', ' · ', ' • '];

  for (const sep of separators) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep);

      // Only split if we have exactly 2 parts and the first part has content
      if (parts.length === 2 && parts[0].trim().length > 0) {
        return {
          title: parts[0].trim(),
          subtitle: parts[1].trim(),
        };
      }

      // Handle cases with multiple separators (take first as title, rest as subtitle)
      if (parts.length > 2 && parts[0].trim().length > 0) {
        return {
          title: parts[0].trim(),
          subtitle: parts.slice(1).join(sep).trim(),
        };
      }
    }
  }

  // No separator found - entire string is the title, no subtitle
  return {
    title: trimmed,
    subtitle: '',
  };
}

/**
 * Fallback to iTunes Lookup API when scraping fails
 */
async function fetchViaItunesLookup(appId: string, country: string, requestId: string): Promise<WebMetadataResponse> {
  console.log(`[${requestId}] [ITUNES-LOOKUP] Fetching via fallback API...`);

  const url = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;
  validateUrl(url);

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

  // A. Diagnostic: Log raw iTunes API data
  console.log('=== DIAG LOOKUP RAW ===', {
    trackName: app.trackName,
    trackCensoredName: app.trackCensoredName,
    artistName: app.artistName,
    appId,
  });

  // Phase C: Use full trackName as app name, NO subtitle parsing
  // iTunes API does NOT provide the real App Store subtitle
  // The trackName IS the full canonical app name (e.g., "Pimsleur | Language Learning")
  const fallbackName = (app.trackName || 'Unknown App').trim();
  const fallbackSubtitle = ''; // No real subtitle available in iTunes API

  console.log(`[${requestId}] [ITUNES-LOOKUP] ✅ Fetched via iTunes API (no parsing):`, {
    trackName: app.trackName,
    fallbackName,
    fallbackSubtitle,
    developer: app.artistName,
  });

  // Phase C: Compute final fields
  const computed = computeFinalFields({
    fallbackName,
    fallbackSubtitle,
    _htmlExtraction: false,
  });

  // Phase C: Diagnostic log for computed fields
  console.log('=== PHASE C COMPUTED (FALLBACK) ===', {
    _htmlExtraction: false,
    fallbackName,
    fallbackSubtitle,
    computedName: computed.name,
    computedTitle: computed.title,
    computedSubtitle: computed.subtitle,
  });

  // Final diagnostic log
  console.log('=== FINAL FALLBACK METADATA ===', {
    appId,
    trackName: app.trackName,
    fallbackName,
    fallbackSubtitle,
    finalName: computed.name,
    finalTitle: computed.title,
    finalSubtitle: computed.subtitle,
    _htmlExtraction: false,
    source: 'itunes-lookup-fallback',
  });

  return {
    appId,
    country,
    success: true,

    // Phase B: Source-specific fields (fallback mode)
    fallbackName,
    fallbackSubtitle,
    _htmlExtraction: false,

    // Phase C: Computed fields (using new logic)
    name: computed.name,
    title: computed.title,
    subtitle: computed.subtitle,
    developer: app.artistName || 'Unknown Developer',
    description: app.description || '',
    rating: app.averageUserRating || null,
    ratingCount: app.userRatingCount || null,
    screenshots: app.screenshotUrls || [],
    icon: app.artworkUrl512 || app.artworkUrl100 || null,
    _debugInfo: {
      schemaVersion: METADATA_SCHEMA_VERSION,
      htmlLength: 0,
      extractionTimeMs: 0,
      htmlSignature: 'N/A',
      source: 'itunes-lookup-fallback',
      note: 'Full trackName used as app name, no subtitle parsing',
    },
  };
}

// ==================== STRICT EXTRACTION (PRODUCT PAGE ONLY) ====================

/**
 * Extract title from product page - STRICT selectors only
 * Only uses h1.product-header__title (no fallbacks)
 */
function extractTitle($: cheerio.CheerioAPI): string {
  // STRICT: Only product-header__title
  const element = $('h1.product-header__title').first();
  if (element && element.text()) {
    const title = element.text().trim();
    console.log(`[EXTRACTION] ✅ Extracted title from <h1.product-header__title>: "${title}"`);
    return title;
  }

  console.log(`[EXTRACTION] ❌ No title found (h1.product-header__title not present)`);
  return '';
}

/**
 * Extract subtitle from product page - STRICT selectors only
 */
function extractSubtitle($: cheerio.CheerioAPI): string {
  // STRICT: Only product-header__subtitle
  const element = $('h2.product-header__subtitle, .product-header__subtitle').first();
  if (element && element.text()) {
    const subtitle = element.text().trim();
    console.log(`[EXTRACTION] ✅ Extracted subtitle: "${subtitle}"`);
    return subtitle;
  }

  console.log(`[EXTRACTION] ⚠️ No subtitle found`);
  return '';
}

function extractDeveloper($: cheerio.CheerioAPI): string {
  const selectors = [
    '.product-header__identity a',
    '.product-header__identity .link',
    'a[href*="/developer/"]',
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element && element.text()) {
      return element.text().trim();
    }
  }

  return '';
}

function extractIcon($: cheerio.CheerioAPI): string | null {
  const selectors = [
    '.product-header__icon source',
    '.product-header__icon img',
    'picture.app-icon source',
    'picture.app-icon img',
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    const url = element.attr('srcset') || element.attr('src');
    if (url) {
      try {
        const firstUrl = url.split(',')[0].trim().split(' ')[0];
        return firstUrl;
      } catch {
        continue;
      }
    }
  }

  return null;
}

function extractScreenshots($: cheerio.CheerioAPI): string[] {
  const screenshots: string[] = [];

  const selectors = [
    'picture[class*="screenshot"] source',
    'picture[class*="screenshot"] img',
    '.we-screenshot-viewer picture source',
    '.we-screenshot-viewer picture img',
  ];

  for (const selector of selectors) {
    const elements = $(selector);

    elements.each((_: number, el: cheerio.Element) => {
      const element = $(el);
      const srcset = element.attr('srcset');
      const src = element.attr('src');

      if (srcset) {
        try {
          const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
          screenshots.push(...urls);
        } catch {
          // Skip invalid srcset
        }
      } else if (src) {
        screenshots.push(src);
      }
    });

    if (screenshots.length > 0) {
      break;
    }
  }

  return screenshots.slice(0, 10);
}

function extractDescription($: cheerio.CheerioAPI): string {
  const selectors = [
    '[data-test-bidi] p',
    '.product-description p',
    '.section__description p',
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element && element.text()) {
      const text = element.text().trim();
      if (text.length > 50) {
        return text.substring(0, 5000);
      }
    }
  }

  return '';
}

/**
 * Phase C: Extract metadata from inline JSON blocks
 *
 * Apple embeds structured data in <script type="application/ld+json"> blocks
 * or similar inline JSON. This function attempts to parse and extract subtitle.
 */
function extractInlineJsonMetadata($: cheerio.CheerioAPI): { subtitle?: string; name?: string } {
  try {
    // Search for JSON-LD script tags
    const scriptTags = $('script[type="application/ld+json"]');

    for (let i = 0; i < scriptTags.length; i++) {
      const scriptContent = $(scriptTags[i]).html();
      if (!scriptContent) continue;

      try {
        const json = JSON.parse(scriptContent);

        // Look for subtitle in common schema.org properties
        if (json.subtitle) {
          console.log('[EXTRACTION-JSON] ✅ Found subtitle in JSON-LD:', json.subtitle);
          return { subtitle: json.subtitle, name: json.name };
        }

        // Check for alternativeName or description that might be subtitle
        if (json.alternativeName && typeof json.alternativeName === 'string') {
          console.log('[EXTRACTION-JSON] ✅ Found alternativeName in JSON-LD:', json.alternativeName);
          return { subtitle: json.alternativeName, name: json.name };
        }
      } catch (parseError) {
        // Skip invalid JSON blocks
        continue;
      }
    }

    // Also check for data-amp-json or other inline data attributes
    const dataScripts = $('script[data-amp-json], script[type="application/json"]');
    for (let i = 0; i < dataScripts.length; i++) {
      const scriptContent = $(dataScripts[i]).html();
      if (!scriptContent) continue;

      try {
        const json = JSON.parse(scriptContent);
        if (json.subtitle) {
          console.log('[EXTRACTION-JSON] ✅ Found subtitle in data-amp-json:', json.subtitle);
          return { subtitle: json.subtitle, name: json.name };
        }
      } catch (parseError) {
        continue;
      }
    }

    console.log('[EXTRACTION-JSON] ⚠️ No subtitle found in inline JSON');
    return {};
  } catch (error) {
    console.log('[EXTRACTION-JSON] ❌ Error extracting inline JSON:', error);
    return {};
  }
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);

  try {
    console.log(`[${requestId}] 🔍 App Store metadata request received`);

    // Parse query parameters
    const url = new URL(req.url);
    const appId = url.searchParams.get('appId');
    const country = (url.searchParams.get('country') || 'us').toLowerCase();

    if (!appId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing appId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs
    validateAppId(appId);
    validateCountry(country);

    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';

    // Construct App Store URL
    const appStoreUrl = `https://apps.apple.com/${country}/app/id${appId}`;
    validateUrl(appStoreUrl);

    console.log(`[${requestId}] [EDGE-FETCH] → Requesting: ${appStoreUrl}`);

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(appStoreUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeoutId);

    const html = await response.text();

    console.log(`[${requestId}] [EDGE-FETCH] → Response: ${response.status}, ${html.length} bytes, ${response.headers.get('content-type')}`);

    // VALIDATION LAYER
    const isValidResponse = validateResponse(response, html, requestId);

    // HTML SIGNATURE DETECTION
    const htmlSignature = detectHTMLSignature(html);

    // REJECT if not PRODUCT_PAGE
    if (!isValidResponse || htmlSignature !== HTMLSignature.PRODUCT_PAGE) {
      const reason = !isValidResponse
        ? `Invalid response (status: ${response.status}, size: ${html.length})`
        : `Invalid HTML signature: ${htmlSignature}`;

      console.log(`[${requestId}] ❌ Scraping failed: ${reason}`);
      console.log(`[${requestId}] 🔄 Falling back to iTunes Lookup API...`);

      // FALLBACK to iTunes Lookup
      return new Response(
        JSON.stringify(await fetchViaItunesLookup(appId, country, requestId), null, 2),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store' // Phase E: Disable caching
          }
        }
      );
    }

    // EXTRACT from PRODUCT_PAGE only
    const $ = cheerio.load(html);

    const title = extractTitle($);
    const subtitleFromDom = extractSubtitle($);
    const developer = extractDeveloper($);
    const icon = extractIcon($);
    const screenshots = extractScreenshots($);
    const description = extractDescription($);

    // Phase C: Extract subtitle from inline JSON metadata
    const inlineJson = extractInlineJsonMetadata($);
    const subtitleFromJson = inlineJson?.subtitle;

    // Merge subtitle: prefer JSON over DOM (JSON is more reliable)
    const subtitle = subtitleFromJson || subtitleFromDom || '';

    console.log('[EXTRACTION] 📊 Subtitle merge:', {
      subtitleFromDom,
      subtitleFromJson,
      finalSubtitle: subtitle,
    });

    // VALIDATE extracted title
    if (!title || isReviewLikeString(title)) {
      console.log(`[${requestId}] ❌ Extracted title failed validation: "${title}"`);
      console.log(`[${requestId}] 🔄 Falling back to iTunes Lookup API...`);

      return new Response(
        JSON.stringify(await fetchViaItunesLookup(appId, country, requestId), null, 2),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store' // Phase E: Disable caching
          }
        }
      );
    }

    const extractionTime = Date.now() - startTime;

    // Phase C: Compute final fields
    const computed = computeFinalFields({
      appStoreName: title,
      appStoreSubtitle: subtitle,
      _htmlExtraction: true,
    });

    // Phase C: Diagnostic log for computed fields
    console.log('=== PHASE C COMPUTED (HTML) ===', {
      _htmlExtraction: true,
      appStoreName: title,
      appStoreSubtitle: subtitle,
      subtitleSource: subtitleFromJson ? 'JSON' : subtitleFromDom ? 'DOM' : 'NONE',
      computedName: computed.name,
      computedTitle: computed.title,
      computedSubtitle: computed.subtitle,
    });

    const result: WebMetadataResponse = {
      appId,
      country,
      success: true,

      // Phase B: Source-specific fields (HTML mode)
      appStoreName: title,
      appStoreSubtitle: subtitle,
      _htmlExtraction: true,

      // Phase C: Computed fields (using new logic)
      name: computed.name,
      title: computed.title,
      subtitle: computed.subtitle,
      developer,
      description,
      rating: null, // Would need JSON-LD extraction
      ratingCount: null,
      screenshots,
      icon,
      _debugInfo: {
        schemaVersion: METADATA_SCHEMA_VERSION,
        htmlLength: html.length,
        extractionTimeMs: extractionTime,
        htmlSignature: htmlSignature,
        source: 'edge-scrape',
      },
    };

    console.log(`[${requestId}] ✅ Extraction complete:`, {
      title,
      subtitle,
      developer,
      screenshotCount: screenshots.length,
      source: 'edge-scrape',
      extractionTimeMs: extractionTime,
    });

    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store' // Phase E: Disable caching
        }
      }
    );

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Error:`, error.message);

    // FALLBACK on any error
    try {
      const url = new URL(req.url);
      const appId = url.searchParams.get('appId');
      const country = (url.searchParams.get('country') || 'us').toLowerCase();

      if (appId) {
        console.log(`[${requestId}] 🔄 Error fallback to iTunes Lookup...`);
        return new Response(
          JSON.stringify(await fetchViaItunesLookup(appId, country, requestId), null, 2),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store' // Phase E: Disable caching
            }
          }
        );
      }
    } catch (fallbackError) {
      console.error(`[${requestId}] ❌ Fallback also failed:`, fallbackError);
    }

    const errorResponse: WebMetadataResponse = {
      appId: '',
      country: '',
      success: false,
      _htmlExtraction: false,
      name: '',
      title: '',
      subtitle: '',
      developer: '',
      description: '',
      rating: null,
      ratingCount: null,
      screenshots: [],
      icon: null,
      error: error.message,
    };

    return new Response(
      JSON.stringify(errorResponse, null, 2),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store' // Phase E: Disable caching
        }
      }
    );
  }
});
