/**
 * iTunes Search API Adapter
 *
 * Primary metadata source for iOS apps.
 * Uses iTunes Search API (no authentication required).
 *
 * Phase A: Core adapter with subtitle parsing fix
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

export class ItunesSearchAdapter implements MetadataSourceAdapter {
  readonly name = 'itunes-search';
  readonly version = '1.0.0';
  readonly priority = ADAPTER_PRIORITIES.ITUNES_SEARCH;
  enabled = true;

  private baseUrl = 'https://itunes.apple.com/search';
  private rateLimiter: RateLimiter;
  private healthMetrics: AdapterHealth = {
    status: 'healthy',
    lastSuccess: null,
    lastFailure: null,
    successRate: 1.0,
    avgLatency: 0,
    errorCount: 0,
    requestCount: 0,
  };

  constructor(rateLimiter?: RateLimiter) {
    this.rateLimiter = rateLimiter || RateLimiterFactory.createItunesLimiter();
  }

  async fetch(searchTerm: string, options?: AdapterFetchOptions): Promise<RawMetadata> {
    const startTime = Date.now();
    const country = options?.country || 'us';
    const limit = options?.limit || 25;
    const timeout = options?.timeout || 10000;

    this.healthMetrics.requestCount++;

    try {
      // Acquire rate limit token
      await this.rateLimiter.acquire();

      const url = this.buildUrl(searchTerm, country, limit);

      console.log(`[${this.name}] Fetching metadata:`, { searchTerm, country, limit });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'YodelASOInsights/1.0 (+https://yodel.com/bot)',
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Update health metrics
      const latency = Date.now() - startTime;
      this.updateHealthSuccess(latency);

      console.log(`[${this.name}] Success:`, {
        resultCount: data.resultCount || 0,
        latency: `${latency}ms`,
      });

      return {
        source: this.name,
        timestamp: new Date(),
        data: data.results || [],
        headers: {
          'content-type': response.headers.get('content-type') || '',
        },
        statusCode: response.status,
      };

    } catch (error: any) {
      const latency = Date.now() - startTime;
      this.updateHealthFailure();

      console.error(`[${this.name}] Fetch failed:`, {
        error: error.message,
        latency: `${latency}ms`,
      });

      throw new Error(`iTunes Search fetch failed: ${error.message}`);
    }
  }

  validate(raw: RawMetadata): boolean {
    if (!Array.isArray(raw.data)) {
      console.warn(`[${this.name}] Invalid data: expected array, got ${typeof raw.data}`);
      return false;
    }

    if (raw.data.length === 0) {
      console.warn(`[${this.name}] Invalid data: empty results array`);
      return false;
    }

    const firstResult = raw.data[0];
    const hasRequiredFields = firstResult.trackId !== undefined && firstResult.trackName !== undefined;

    if (!hasRequiredFields) {
      console.warn(`[${this.name}] Invalid data: missing required fields`, firstResult);
    }

    return hasRequiredFields;
  }

  transform(raw: RawMetadata): ScrapedMetadata {
    if (!this.validate(raw)) {
      throw new Error(`${this.name}: Invalid raw metadata`);
    }

    const app = raw.data[0]; // First result (most relevant from iTunes algorithm)

    console.log('[ITUNES-SEARCH] 📦 Raw API data:', {
      trackId: app.trackId,
      trackName: app.trackName,
      trackCensoredName: app.trackCensoredName,
    });

    // Phase D: Use FULL trackName as app name, NO subtitle parsing
    // iTunes API does NOT provide the real App Store subtitle
    // The trackName IS the full canonical app name (e.g., "Pimsleur | Language Learning")
    const fullName = (app.trackName || 'Unknown App').trim();
    const noSubtitle = ''; // No real subtitle available in iTunes API

    console.log('[ITUNES-SEARCH] 🎯 Final transformed metadata:', {
      appId: String(app.trackId),
      name: fullName,
      title: fullName,
      subtitle: noSubtitle,
      fallbackName: fullName,
      fallbackSubtitle: noSubtitle,
      _htmlExtraction: false,
    });

    return {
      // Core fields
      appId: String(app.trackId),
      name: fullName, // Phase D: Use full trackName as name
      url: app.trackViewUrl || '',
      locale: 'en-US', // iTunes Search API returns US English by default

      // Phase B: Source-specific fields (fallback only - no HTML access)
      fallbackName: fullName,
      fallbackSubtitle: noSubtitle,
      _htmlExtraction: false,

      // Computed fields (Phase D: no parsing)
      title: fullName,
      subtitle: noSubtitle,

      // Metadata
      description: app.description || '',
      applicationCategory: app.primaryGenreName || 'Unknown',
      developer: app.artistName || 'Unknown Developer',

      // Metrics
      rating: app.averageUserRating || 0,
      reviews: app.userRatingCount || 0,
      price: app.formattedPrice || 'Free',

      // Creative assets
      icon: app.artworkUrl512 || app.artworkUrl100,
      screenshots: app.screenshotUrls || [],
    };
  }

  /**
   * Parse title and subtitle from iTunes trackName
   *
   * CRITICAL FIX: Handles subtitle duplication bug
   *
   * iTunes API returns "AppName - Subtitle" in trackName
   * But trackCensoredName just returns the same value (not helpful)
   *
   * This method:
   * 1. Looks for " - " separator (common iTunes pattern)
   * 2. Splits into title + subtitle
   * 3. Validates that both parts have content
   * 4. Returns empty subtitle if no separator found
   *
   * Examples:
   * - "Instagram - Share & Connect" → title: "Instagram", subtitle: "Share & Connect"
   * - "WhatsApp Messenger" → title: "WhatsApp Messenger", subtitle: ""
   * - "TikTok - Make Your Day" → title: "TikTok", subtitle: "Make Your Day"
   */
  private parseTitle(trackName: string): { title: string; subtitle: string } {
    console.log('[ITUNES-SEARCH] 🔍 parseTitle called with:', trackName);

    if (!trackName || typeof trackName !== 'string') {
      return { title: 'Unknown App', subtitle: '' };
    }

    const trimmed = trackName.trim();

    // Check for common separators (must match normalizer separator list)
    const separators = [' - ', ' – ', ' — ', ' | ', ': ', ' · ', ' • '];
    console.log('[ITUNES-SEARCH] 🔍 Using separators:', separators);

    for (const sep of separators) {
      const parts = trimmed.split(sep);

      // Only split if we have exactly 2 parts and the first part has content
      if (parts.length === 2 && parts[0].trim().length > 0) {
        const result = {
          title: parts[0].trim(),
          subtitle: parts[1].trim(),
        };
        console.log('[ITUNES-SEARCH] ✅ Parsed with separator "' + sep + '":', result);
        return result;
      }

      // Handle cases with multiple separators (take first as title, rest as subtitle)
      if (parts.length > 2 && parts[0].trim().length > 0) {
        const result = {
          title: parts[0].trim(),
          subtitle: parts.slice(1).join(sep).trim(),
        };
        console.log('[ITUNES-SEARCH] ✅ Parsed with separator "' + sep + '" (multi-part):', result);
        return result;
      }
    }

    // No separator found - entire string is the title
    console.log('[ITUNES-SEARCH] ⚠️ No separator found, using full trackName as title');
    return {
      title: trimmed,
      subtitle: '',
    };
  }

  getHealth(): AdapterHealth {
    return { ...this.healthMetrics };
  }

  private buildUrl(searchTerm: string, country: string, limit: number): string {
    const params = new URLSearchParams({
      term: searchTerm,
      country: country.toLowerCase(),
      entity: 'software',
      limit: String(limit),
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  private updateHealthSuccess(latency: number): void {
    this.healthMetrics.lastSuccess = new Date();

    // Exponential moving average for latency
    this.healthMetrics.avgLatency =
      this.healthMetrics.avgLatency === 0
        ? latency
        : (this.healthMetrics.avgLatency * 0.9) + (latency * 0.1);

    // Update success rate (sliding window approximation)
    this.healthMetrics.successRate = Math.min(1.0, this.healthMetrics.successRate + 0.01);

    this.healthMetrics.status = this.calculateStatus();
  }

  private updateHealthFailure(): void {
    this.healthMetrics.lastFailure = new Date();
    this.healthMetrics.errorCount++;

    // Decrease success rate on failure
    this.healthMetrics.successRate = Math.max(0.0, this.healthMetrics.successRate - 0.05);

    this.healthMetrics.status = this.calculateStatus();
  }

  private calculateStatus(): 'healthy' | 'degraded' | 'down' {
    if (this.healthMetrics.successRate >= 0.9) return 'healthy';
    if (this.healthMetrics.successRate >= 0.5) return 'degraded';
    return 'down';
  }

  /**
   * Get rate limiter status for monitoring
   */
  getRateLimiterStatus() {
    return this.rateLimiter.getStatus();
  }
}
