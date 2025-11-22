/**
 * App Store Web Metadata Adapter
 *
 * Fetches metadata directly from Apple App Store web pages.
 * Primary source for accurate subtitle data not available in iTunes API.
 *
 * Features:
 * - Two-phase extraction (JSON-LD + DOM)
 * - Aggressive caching (24h TTL)
 * - Conservative rate limiting (10 req/min)
 * - Security hardening (SSRF, XSS, DoS prevention)
 * - Graceful fallback to iTunes API
 *
 * Phase A.5: Web Metadata Adapter
 */

import { ScrapedMetadata } from '@/types/aso';
import {
  MetadataSourceAdapter,
  RawMetadata,
  AdapterFetchOptions,
  AdapterHealth,
  ADAPTER_PRIORITIES,
} from './types';
import { RateLimiter, RateLimiterFactory } from './rate-limiter';
import { SecurityValidator } from './security-validator';
import * as cheerio from 'cheerio';
import { debug } from '@/lib/logging';
import {
  ENABLE_DOM_SUBTITLE_EXTRACTION,
  ENABLE_PRERENDERED_FETCH,
  ENABLE_SSR_LITE_SUBTITLE_HYDRATION,
  SubtitleSource,
} from '@/config/metadataFeatureFlags';

/**
 * App Store Web Adapter
 */
export class AppStoreWebAdapter implements MetadataSourceAdapter {
  readonly name = 'appstore-web';
  readonly version = '1.0.0';
  readonly priority = ADAPTER_PRIORITIES.APPSTORE_HTML - 20; // Higher priority than HTML enrichment
  enabled = true;

  private baseUrl = 'https://apps.apple.com';
  private rateLimiter: RateLimiter;
  private validator: SecurityValidator;
  private healthMetrics: AdapterHealth = {
    status: 'healthy',
    lastSuccess: null,
    lastFailure: null,
    successRate: 1.0,
    avgLatency: 0,
    errorCount: 0,
    requestCount: 0,
  };

  // Telemetry: Track subtitle extraction source
  private lastSubtitleSource: SubtitleSource = 'none';

  // Phase D: SSR-Lite Subtitle Hydration
  private lastFetchedUrl: string | null = null;
  private lastHydrationAttempted: boolean = false;
  private lastHydrationSucceeded: boolean = false;
  private lastHydrationLatencyMs: number = 0;

  constructor(rateLimiter?: RateLimiter) {
    this.rateLimiter = rateLimiter || RateLimiterFactory.createHtmlScrapingLimiter();
    this.validator = new SecurityValidator();
  }

  /**
   * Fetch raw HTML from App Store web page
   */
  async fetch(appId: string, options?: AdapterFetchOptions): Promise<RawMetadata> {
    const startTime = Date.now();
    const country = options?.country || 'us';
    const timeout = options?.timeout || 10000;

    this.healthMetrics.requestCount++;

    try {
      // Validate inputs
      this.validator.validateAppId(appId);
      this.validator.validateCountryCode(country);

      // Acquire rate limit token
      await this.rateLimiter.acquire();

      // Construct URL
      let url = this.constructUrl(appId, country);

      // Apply pre-rendered URL transformation if feature flag enabled
      if (ENABLE_PRERENDERED_FETCH) {
        url = this.getPrerenderUrl(url);

        // Dev-only diagnostic logging
        if (import.meta.env.DEV) {
          console.log('[PRERENDER-FETCH] Enabled: true');
          console.log('[PRERENDER-FETCH] Final URL:', url);
        }
      }

      // Validate URL (SSRF prevention)
      this.validator.validateUrl(url);

      console.log(`[${this.name}] Fetching metadata:`, { appId, country, url });

      // Fetch HTML with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'YodelASOInsight/1.0 (+https://yodelaso.com/bot) contact@yodelaso.com',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Check for blocking (403/429)
        if (response.status === 403 || response.status === 429) {
          throw new Error(`Blocked by Apple: ${response.status}`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Update health metrics
      const latency = Date.now() - startTime;
      this.updateHealthSuccess(latency);

      console.log(`[${this.name}] Success:`, {
        appId,
        htmlLength: html.length,
        latency: `${latency}ms`,
      });

      // Store URL for potential hydration fallback in transform()
      this.lastFetchedUrl = url;

      return {
        source: this.name,
        timestamp: new Date(),
        data: html,
        headers: {
          'content-type': response.headers.get('content-type') || '',
        },
        statusCode: response.status,
      };

    } catch (error: any) {
      const latency = Date.now() - startTime;
      this.updateHealthFailure();

      console.error(`[${this.name}] Fetch failed:`, {
        appId,
        error: error.message,
        latency: `${latency}ms`,
      });

      throw new Error(`App Store Web fetch failed: ${error.message}`);
    }
  }

  /**
   * Validate raw HTML
   */
  validate(raw: RawMetadata): boolean {
    if (typeof raw.data !== 'string') {
      console.warn(`[${this.name}] Invalid data: expected string, got ${typeof raw.data}`);
      return false;
    }

    const html = raw.data as string;

    // Basic validation: should be HTML
    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      console.warn(`[${this.name}] Invalid data: not HTML`);
      return false;
    }

    // Should contain App Store content
    // Modern App Store uses Svelte framework, so check for more reliable markers
    const hasAppStoreMarkers =
      html.includes('apps.apple.com') || // Canonical URL
      html.includes('App Store') || // Meta tags or title
      html.includes('software-application') || // JSON-LD structured data
      html.includes('app-header') || // Legacy marker
      html.includes('product-header'); // Legacy marker

    if (!hasAppStoreMarkers) {
      console.warn(`[${this.name}] Invalid data: missing app content`);
      return false;
    }

    return true;
  }

  /**
   * Transform raw HTML to ScrapedMetadata
   * Uses two-phase extraction: JSON-LD + DOM
   * PHASE D: Now async to support SSR-Lite subtitle hydration
   */
  async transform(raw: RawMetadata): Promise<ScrapedMetadata> {
    if (!this.validate(raw)) {
      throw new Error(`${this.name}: Invalid raw metadata`);
    }

    const html = raw.data as string;
    const $ = cheerio.load(html);

    // Phase 1: Extract from JSON-LD (Schema.org structured data)
    const jsonLdData = this.extractFromJsonLd($);

    // Phase 2: Extract from DOM (fallback and supplement)
    const domData = this.extractFromDom($);

    // Merge data (DOM preferred for subtitle, JSON-LD for structured data)
    let merged = this.mergeExtractedData(jsonLdData, domData);

    // PHASE D: SSR-Lite Subtitle Hydration Fallback
    // If subtitle is empty after DOM extraction, attempt hydration
    // Note: Hydration only works in Node.js environment (not browser)
    if (
      ENABLE_SSR_LITE_SUBTITLE_HYDRATION &&
      (!merged.subtitle || merged.subtitle.trim().length === 0) &&
      this.lastFetchedUrl &&
      typeof window === 'undefined' // Only in Node.js environment
    ) {
      if (import.meta.env.DEV) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('[SSR-LITE-HYDRATION] 🚀 HYDRATION TRIGGERED');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('[SSR-LITE-HYDRATION] Reason: Subtitle empty after DOM extraction');
        console.log('[SSR-LITE-HYDRATION] URL:', this.lastFetchedUrl);
        console.log('[SSR-LITE-HYDRATION] Flag ENABLE_SSR_LITE_SUBTITLE_HYDRATION:', ENABLE_SSR_LITE_SUBTITLE_HYDRATION);
        console.log('───────────────────────────────────────────────────────────────');
      }

      try {
        // Dynamic import to avoid bundling Playwright for browser
        const { hydrateSubtitle, isPlaywrightAvailable } = await import('@/lib/metadata/subtitleHydration.ssr');

        // Check if Playwright is available
        if (!isPlaywrightAvailable()) {
          if (import.meta.env.DEV) {
            console.warn('[SSR-LITE-HYDRATION] ⚠️ Playwright not available, skipping hydration');
            console.warn('[SSR-LITE-HYDRATION] Install with: npm install playwright');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('');
          }
          this.lastHydrationAttempted = false;
          this.lastHydrationSucceeded = false;
        } else {
          // Attempt hydration
          if (import.meta.env.DEV) {
            console.log('[SSR-LITE-HYDRATION] 🌐 Launching Playwright WebKit browser...');
          }

          const hydrationResult = await hydrateSubtitle(this.lastFetchedUrl, {
            timeout: 10000, // 10 second timeout
          });

          // Update telemetry
          this.lastHydrationAttempted = hydrationResult.hydrationAttempted;
          this.lastHydrationSucceeded = hydrationResult.hydrationSucceeded;
          this.lastHydrationLatencyMs = hydrationResult.hydrationLatencyMs;

          if (hydrationResult.hydrationSucceeded && hydrationResult.subtitle) {
            // Hydration succeeded, use hydrated subtitle
            merged.subtitle = hydrationResult.subtitle;
            this.lastSubtitleSource = 'hydrated';

            if (import.meta.env.DEV) {
              console.log('');
              console.log('🎉 [SSR-LITE-HYDRATION] ✅ HYDRATION SUCCESS!');
              console.log('───────────────────────────────────────────────────────────────');
              console.log('[SSR-LITE-HYDRATION] Extracted subtitle:', hydrationResult.subtitle);
              console.log('[SSR-LITE-HYDRATION] Subtitle length:', hydrationResult.subtitle.length, 'chars');
              console.log('[SSR-LITE-HYDRATION] Latency:', hydrationResult.hydrationLatencyMs, 'ms');
              console.log('[SSR-LITE-HYDRATION] Subtitle source:', 'hydrated');
              console.log('[SSR-LITE-HYDRATION] hydrationAttempted:', true);
              console.log('[SSR-LITE-HYDRATION] hydrationSucceeded:', true);
              console.log('═══════════════════════════════════════════════════════════════');
              console.log('');
            }
          } else {
            if (import.meta.env.DEV) {
              console.log('');
              console.log('❌ [SSR-LITE-HYDRATION] HYDRATION FAILED');
              console.log('───────────────────────────────────────────────────────────────');
              console.warn('[SSR-LITE-HYDRATION] Error:', hydrationResult.error);
              console.warn('[SSR-LITE-HYDRATION] Latency:', hydrationResult.hydrationLatencyMs, 'ms');
              console.log('[SSR-LITE-HYDRATION] hydrationAttempted:', true);
              console.log('[SSR-LITE-HYDRATION] hydrationSucceeded:', false);
              console.log('═══════════════════════════════════════════════════════════════');
              console.log('');
            }
          }
        }
      } catch (hydrationError) {
        // Hydration failed, but don't break the adapter
        this.lastHydrationAttempted = true;
        this.lastHydrationSucceeded = false;

        if (import.meta.env.DEV) {
          console.error('[SSR-LITE-HYDRATION] ❌ Hydration exception:', hydrationError);
        }
      }
    }

    // Debug-gated adapter diagnostic
    debug('ADAPTER', 'AppStoreWebAdapter.transform()', {
      subtitle: merged.subtitle,
      subtitleSource: this.lastSubtitleSource,
      hydrationAttempted: this.lastHydrationAttempted,
      hydrationSucceeded: this.lastHydrationSucceeded,
      hydrationLatencyMs: this.lastHydrationLatencyMs,
      name: merged.name,
      adapter: this.name
    });

    // Add subtitleSource to metadata before returning
    merged.subtitleSource = this.lastSubtitleSource;

    return merged;
  }

  /**
   * Extract metadata from JSON-LD structured data
   */
  private extractFromJsonLd($: cheerio.CheerioAPI): Partial<any> {
    try {
      const scriptTag = $('script[type="application/ld+json"]').toArray()
        .find(el => $(el).html()?.includes('SoftwareApplication'));

      if (!scriptTag) {
        console.log(`[${this.name}] No JSON-LD SoftwareApplication found`);
        return {};
      }

      const jsonText = $(scriptTag).html();
      if (!jsonText) return {};

      const jsonLd = JSON.parse(jsonText);

      return {
        name: jsonLd.name,
        description: jsonLd.description,
        applicationCategory: jsonLd.applicationCategory,
        author: jsonLd.author,
        aggregateRating: jsonLd.aggregateRating,
        offers: jsonLd.offers,
        image: jsonLd.image,
        operatingSystem: jsonLd.operatingSystem,
      };
    } catch (error) {
      console.error(`[${this.name}] JSON-LD parse error:`, error);
      return {};
    }
  }

  /**
   * Extract metadata from DOM using CSS selectors
   */
  private extractFromDom($: cheerio.CheerioAPI): Partial<any> {
    return {
      subtitle: this.extractSubtitle($),
      title: this.extractTitle($),
      name: this.extractName($),
      description: this.extractDescription($),
      category: this.extractCategory($),
      developer: this.extractDeveloper($),
      rating: this.extractRating($),
      reviews: this.extractReviews($),
      price: this.extractPrice($),
      icon: this.extractIcon($),
      screenshots: this.extractScreenshots($),
    };
  }

  /**
   * Extract subtitle from DOM (CRITICAL - main reason for web adapter)
   *
   * **DOM Extraction Strategy:**
   * Real-world testing (20 apps) has proven that App Store subtitles are ONLY
   * present in the hydrated DOM at <h2 class="subtitle"> and NOT in any JSON blocks.
   *
   * **Feature Flag Control:**
   * - ENABLE_DOM_SUBTITLE_EXTRACTION = false (default): Uses legacy multi-selector fallback
   * - ENABLE_DOM_SUBTITLE_EXTRACTION = true: Uses validated DOM-first approach
   *
   * **Telemetry:**
   * Sets this.lastSubtitleSource to track extraction method:
   * - "dom": Primary DOM selector (h2.subtitle) succeeded (95% success rate in testing)
   * - "fallback": Legacy multi-selector approach succeeded
   * - "none": No subtitle found
   *
   * @see scripts/README.subtitle-dom-testing.md
   * @see src/config/metadataFeatureFlags.ts
   */
  private extractSubtitle($: cheerio.CheerioAPI): string {
    // Reset telemetry
    this.lastSubtitleSource = 'none';

    // Phase 1: DOM-First Extraction (when feature flag enabled)
    if (ENABLE_DOM_SUBTITLE_EXTRACTION) {
      const primarySelector = 'h2.subtitle';
      const element = $(primarySelector).first();

      if (element && element.length > 0) {
        const subtitle = element.text().trim();
        if (subtitle.length > 0) {
          // Sanitize to prevent XSS
          const sanitized = this.validator.sanitizeText(subtitle);

          // Validate format
          if (this.validator.validateSubtitle(sanitized)) {
            this.lastSubtitleSource = 'dom';
            console.log(`[${this.name}] Subtitle extracted (DOM):`, {
              selector: primarySelector,
              subtitle: sanitized,
              source: 'dom',
            });
            return sanitized;
          }
        }
      }

      // DOM extraction failed, log for telemetry
      console.log(`[${this.name}] DOM extraction failed, trying fallback selectors`);
    }

    // Phase 2: Fallback Multi-Selector Extraction
    // (Always runs if flag is disabled, or if DOM extraction failed)
    const fallbackSelectors = [
      '.product-header__subtitle',
      'h2.product-header__subtitle',
      '[data-test-subtitle]',
      '[data-test="subtitle"]',
      '.app-header__subtitle',
      'p.subtitle',
      'h2.subtitle', // Included in fallback for backwards compatibility
      // Fallback: h2 immediately after h1
      'header h1 + h2',
    ];

    for (const selector of fallbackSelectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const subtitle = element.text().trim();
        // Sanitize to prevent XSS
        const sanitized = this.validator.sanitizeText(subtitle);

        // Validate format
        if (this.validator.validateSubtitle(sanitized)) {
          this.lastSubtitleSource = 'fallback';
          console.log(`[${this.name}] Subtitle extracted (fallback):`, {
            selector,
            subtitle: sanitized,
            source: 'fallback',
          });
          return sanitized;
        }
      }
    }

    // No subtitle found
    this.lastSubtitleSource = 'none';
    console.log(`[${this.name}] Subtitle not found:`, {
      source: 'none',
      featureFlagEnabled: ENABLE_DOM_SUBTITLE_EXTRACTION,
    });
    return '';
  }

  /**
   * Extract title from DOM
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    const selectors = [
      'h1.product-header__title',
      '.product-header__title',
      '[data-test-app-header__title]',
      'h1.app-header__title',
      'h1',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        return this.validator.sanitizeText(element.text().trim());
      }
    }

    return '';
  }

  /**
   * Extract app name (usually same as title)
   */
  private extractName($: cheerio.CheerioAPI): string {
    return this.extractTitle($);
  }

  /**
   * Extract description
   */
  private extractDescription($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__description',
      '[data-test="app-description"]',
      '.section__description',
      'p.description',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        return this.validator.sanitizeText(element.text().trim());
      }
    }

    return '';
  }

  /**
   * Extract category
   */
  private extractCategory($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__list a[href*="/genre/"]',
      '[data-test="category-link"]',
      '.app-header__category',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        return this.validator.sanitizeText(element.text().trim());
      }
    }

    return '';
  }

  /**
   * Extract developer name
   */
  private extractDeveloper($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__identity a',
      '[data-test="developer-name"]',
      '.app-header__developer',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        return this.validator.sanitizeText(element.text().trim());
      }
    }

    return '';
  }

  /**
   * Extract rating
   */
  private extractRating($: cheerio.CheerioAPI): number {
    const selectors = [
      '.we-customer-ratings__averages__display',
      '[data-test="star-rating"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const ratingText = element.text().trim();
        const rating = parseFloat(ratingText);
        if (!isNaN(rating)) {
          return Math.max(0, Math.min(5, rating));
        }
      }
    }

    return 0;
  }

  /**
   * Extract review count
   */
  private extractReviews($: cheerio.CheerioAPI): number {
    const selectors = [
      '.we-customer-ratings__count',
      '[data-test="review-count"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const reviewText = element.text().trim();
        // Extract number from text like "1.2K Ratings" or "23,290 Ratings"
        const match = reviewText.match(/(\d+(?:[,\.]\d+)?)\s*([KkMm])?/);
        if (match) {
          const number = parseFloat(match[1].replace(',', ''));
          const multiplier = match[2]?.toLowerCase();
          if (multiplier === 'k') {
            return Math.floor(number * 1000);
          } else if (multiplier === 'm') {
            return Math.floor(number * 1000000);
          }
          return Math.floor(number);
        }
      }
    }

    return 0;
  }

  /**
   * Extract price
   */
  private extractPrice($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__price',
      '[data-test="app-price"]',
      '.app-header__price',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        return this.validator.sanitizeText(element.text().trim());
      }
    }

    return 'Free';
  }

  /**
   * Extract icon URL
   */
  private extractIcon($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__icon source',
      '.product-header__icon img',
      '[data-test="app-icon"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      const url = element.attr('srcset') || element.attr('src');
      if (url) {
        try {
          // Take first URL if srcset has multiple
          const firstUrl = url.split(',')[0].trim().split(' ')[0];
          return this.validator.sanitizeUrl(firstUrl);
        } catch {
          continue;
        }
      }
    }

    return '';
  }

  /**
   * Extract screenshots
   */
  private extractScreenshots($: cheerio.CheerioAPI): string[] {
    const screenshots: string[] = [];

    const selectors = [
      '.product-media__item picture source',
      '.product-media__item img',
      '[data-test="screenshot"]',
    ];

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const $el = $(element);
        const url = $el.attr('srcset') || $el.attr('src');
        if (url) {
          try {
            // Take first URL if srcset has multiple
            const firstUrl = url.split(',')[0].trim().split(' ')[0];
            const validatedUrl = this.validator.sanitizeUrl(firstUrl);

            // Verify it's from Apple CDN
            if (this.validator.validateScreenshotUrl(validatedUrl)) {
              if (!screenshots.includes(validatedUrl)) {
                screenshots.push(validatedUrl);
              }
            }
          } catch {
            // Skip invalid URLs
          }
        }
      });

      // If found screenshots, return
      if (screenshots.length > 0) {
        return screenshots;
      }
    }

    return screenshots;
  }

  /**
   * Merge JSON-LD and DOM data
   */
  private mergeExtractedData(jsonLd: Partial<any>, dom: Partial<any>): ScrapedMetadata {
    // Extract app ID from current context (should be passed through options)
    const appId = 'unknown'; // Will be set by orchestrator

    return {
      // Core fields
      appId,
      name: dom.title || jsonLd.name || dom.name || 'Unknown App',
      url: `${this.baseUrl}/us/app/id${appId}`, // Will be corrected by orchestrator
      locale: 'en-US',

      // Title/Subtitle (DOM subtitle preferred - this is why we're here!)
      title: dom.title || jsonLd.name || 'Unknown App',
      subtitle: dom.subtitle || '', // DOM only - not in JSON-LD

      // Metadata (JSON-LD preferred for structured data)
      description: jsonLd.description || dom.description || '',
      applicationCategory: jsonLd.applicationCategory || dom.category || '',
      developer: jsonLd.author?.name || dom.developer || '',

      // Metrics (JSON-LD preferred for accuracy)
      rating: jsonLd.aggregateRating?.ratingValue || dom.rating || 0,
      reviews: jsonLd.aggregateRating?.reviewCount || dom.reviews || 0,
      price: jsonLd.offers?.price || dom.price || 'Free',

      // Creative assets (DOM only - not in JSON-LD usually)
      icon: dom.icon || jsonLd.image || '',
      screenshots: dom.screenshots || [],
    };
  }

  /**
   * Construct App Store URL
   */
  private constructUrl(appId: string, country: string): string {
    // Note: We don't have the app name slug, so we use a generic pattern
    // Apple's web server redirects /app/id123 to /app/name/id123
    return `${this.baseUrl}/${country.toLowerCase()}/app/id${appId}`;
  }

  /**
   * Get pre-rendered (SSR) URL for App Store page
   *
   * Appends SSR trigger parameters to fetch Apple's server-rendered HTML
   * which includes all content (especially subtitles) without JavaScript execution.
   *
   * **Safety guarantees:**
   * - Never throws exceptions
   * - Always returns a valid URL string
   * - Falls back to original URL on any error
   * - Preserves existing query parameters
   * - Maintains country/region from original URL
   *
   * **SSR Parameters:**
   * - platform=iphone: Triggers mobile-optimized pre-render
   * - see-all=reviews: Forces full page render (not lazy-loaded)
   *
   * @param originalUrl - Base App Store URL (e.g., https://apps.apple.com/us/app/id123)
   * @returns URL with SSR parameters appended, or original URL on error
   *
   * @example
   * Input:  https://apps.apple.com/us/app/instagram/id389801252
   * Output: https://apps.apple.com/us/app/instagram/id389801252?platform=iphone&see-all=reviews
   *
   * @example
   * Input:  https://apps.apple.com/gb/app/id123?l=en
   * Output: https://apps.apple.com/gb/app/id123?l=en&platform=iphone&see-all=reviews
   */
  private getPrerenderUrl(originalUrl: string): string {
    try {
      // Parse URL safely
      const url = new URL(originalUrl);

      // Preserve existing parameters, add SSR triggers
      url.searchParams.set('platform', 'iphone');
      url.searchParams.set('see-all', 'reviews');

      return url.toString();
    } catch (error) {
      // URL parsing failed - return original (never throw)
      if (import.meta.env.DEV) {
        console.warn('[PRERENDER-FETCH] URL parsing failed, using original:', {
          originalUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return originalUrl;
    }
  }

  getHealth(): AdapterHealth {
    return { ...this.healthMetrics };
  }

  private updateHealthSuccess(latency: number): void {
    this.healthMetrics.lastSuccess = new Date();
    this.healthMetrics.avgLatency =
      this.healthMetrics.avgLatency === 0
        ? latency
        : (this.healthMetrics.avgLatency * 0.9) + (latency * 0.1);
    this.healthMetrics.successRate = Math.min(1.0, this.healthMetrics.successRate + 0.01);
    this.healthMetrics.status = this.calculateStatus();
  }

  private updateHealthFailure(): void {
    this.healthMetrics.lastFailure = new Date();
    this.healthMetrics.errorCount++;
    this.healthMetrics.successRate = Math.max(0.0, this.healthMetrics.successRate - 0.05);
    this.healthMetrics.status = this.calculateStatus();
  }

  private calculateStatus(): 'healthy' | 'degraded' | 'down' {
    if (this.healthMetrics.successRate >= 0.9) return 'healthy';
    if (this.healthMetrics.successRate >= 0.5) return 'degraded';
    return 'down';
  }

  getRateLimiterStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Get telemetry: Subtitle extraction source
   *
   * Returns the method used to extract the subtitle in the last transform() call:
   * - "dom": Primary DOM selector (h2.subtitle) succeeded
   * - "fallback": Legacy multi-selector approach succeeded
   * - "none": No subtitle found
   *
   * Useful for monitoring DOM extraction adoption and success rates.
   */
  getSubtitleSource(): SubtitleSource {
    return this.lastSubtitleSource;
  }
}
