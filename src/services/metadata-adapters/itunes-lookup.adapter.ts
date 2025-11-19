/**
 * iTunes Lookup API Adapter
 *
 * Secondary/fallback metadata source for iOS apps.
 * Uses iTunes Lookup API for direct app ID lookups.
 *
 * Phase A: Fallback adapter for single app fetches
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

export class ItunesLookupAdapter implements MetadataSourceAdapter {
  readonly name = 'itunes-lookup';
  readonly version = '1.0.0';
  readonly priority = ADAPTER_PRIORITIES.ITUNES_LOOKUP;
  enabled = true;

  private baseUrl = 'https://itunes.apple.com/lookup';
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
    this.rateLimiter = rateLimiter || RateLimiterFactory.createLookupLimiter();
  }

  async fetch(appId: string, options?: AdapterFetchOptions): Promise<RawMetadata> {
    const startTime = Date.now();
    const country = options?.country || 'us';
    const timeout = options?.timeout || 10000;

    this.healthMetrics.requestCount++;

    // Extract numeric app ID if URL provided
    const numericId = this.extractAppId(appId);

    if (!numericId) {
      throw new Error(`${this.name}: Invalid app ID format: ${appId}`);
    }

    try {
      // Acquire rate limit token
      await this.rateLimiter.acquire();

      const url = this.buildUrl(numericId, country);

      console.log(`[${this.name}] Fetching metadata:`, { appId: numericId, country });

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
        throw new Error(`iTunes Lookup API error: ${response.status} ${response.statusText}`);
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

      throw new Error(`iTunes Lookup fetch failed: ${error.message}`);
    }
  }

  validate(raw: RawMetadata): boolean {
    if (!Array.isArray(raw.data)) {
      console.warn(`[${this.name}] Invalid data: expected array, got ${typeof raw.data}`);
      return false;
    }

    if (raw.data.length === 0) {
      console.warn(`[${this.name}] Invalid data: empty results array (app not found)`);
      return false;
    }

    const result = raw.data[0];
    const hasRequiredFields = result.trackId !== undefined && result.trackName !== undefined;

    if (!hasRequiredFields) {
      console.warn(`[${this.name}] Invalid data: missing required fields`, result);
    }

    return hasRequiredFields;
  }

  transform(raw: RawMetadata): ScrapedMetadata {
    if (!this.validate(raw)) {
      throw new Error(`${this.name}: Invalid raw metadata`);
    }

    const app = raw.data[0];

    // Phase D: Use FULL trackName as app name, NO subtitle parsing
    // iTunes API does NOT provide the real App Store subtitle
    // The trackName IS the full canonical app name (e.g., "Pimsleur | Language Learning")
    const fullName = (app.trackName || 'Unknown App').trim();
    const noSubtitle = ''; // No real subtitle available in iTunes API

    return {
      // Core fields
      appId: String(app.trackId),
      name: fullName, // Phase D: Use full trackName as name
      url: app.trackViewUrl || '',
      locale: 'en-US',

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
   * Parse title and subtitle from trackName
   * Same logic as ItunesSearchAdapter
   */
  private parseTitle(trackName: string): { title: string; subtitle: string } {
    if (!trackName || typeof trackName !== 'string') {
      return { title: 'Unknown App', subtitle: '' };
    }

    const trimmed = trackName.trim();
    // Check for common separators (must match normalizer separator list)
    const separators = [' - ', ' – ', ' — ', ' | ', ': ', ' · ', ' • '];

    for (const sep of separators) {
      const parts = trimmed.split(sep);

      if (parts.length === 2 && parts[0].trim().length > 0) {
        return {
          title: parts[0].trim(),
          subtitle: parts[1].trim(),
        };
      }

      if (parts.length > 2 && parts[0].trim().length > 0) {
        return {
          title: parts[0].trim(),
          subtitle: parts.slice(1).join(sep).trim(),
        };
      }
    }

    return {
      title: trimmed,
      subtitle: '',
    };
  }

  /**
   * Extract numeric app ID from various formats
   * Supports:
   * - Numeric ID: "389801252"
   * - App Store URL: "https://apps.apple.com/us/app/instagram/id389801252"
   * - Direct app ID: "id389801252"
   */
  private extractAppId(input: string): string | null {
    if (!input) return null;

    const trimmed = input.trim();

    // Check if already numeric
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }

    // Extract from URL (e.g., /id389801252)
    const urlMatch = trimmed.match(/\/id(\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Extract from "id389801252" format
    const idMatch = trimmed.match(/^id(\d+)$/);
    if (idMatch) {
      return idMatch[1];
    }

    return null;
  }

  getHealth(): AdapterHealth {
    return { ...this.healthMetrics };
  }

  private buildUrl(appId: string, country: string): string {
    const params = new URLSearchParams({
      id: appId,
      country: country.toLowerCase(),
    });

    return `${this.baseUrl}?${params.toString()}`;
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
}
