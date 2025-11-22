/**
 * App Store HTML Adapter
 *
 * Calls the appstore-html-fetch Supabase Edge Function for server-side HTML scraping.
 * Extracts subtitle and metadata from fully rendered HTML pages, bypassing CORS and JS restrictions.
 *
 * Priority: 2 (between appstore-web=1 and appstore-edge=5)
 *
 * Features:
 * - Server-side HTML fetch via Edge Function
 * - Bypasses CORS restrictions
 * - DOM-based subtitle extraction
 * - Full telemetry (latency, HTML size, extraction metrics)
 * - Graceful error handling
 * - No side effects on existing adapters
 *
 * Phase 2: HTML Edge Function Integration
 */

import { ScrapedMetadata } from '@/types/aso';
import {
  MetadataSourceAdapter,
  RawMetadata,
  AdapterFetchOptions,
  AdapterHealth,
} from './types';

/**
 * Edge Function Response Schema
 * Matches HtmlFetchResponse from supabase/functions/appstore-html-fetch/index.ts
 */
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
}

/**
 * App Store HTML Adapter
 *
 * Fetches HTML from App Store pages via Edge Function and extracts metadata.
 */
export class AppStoreHtmlAdapter implements MetadataSourceAdapter {
  readonly name = 'appstore-html';
  readonly version = '1.0.0';
  readonly priority = 2; // Between web (1) and edge (5)
  enabled = true;

  private supabaseUrl: string;
  private supabaseAnonKey: string | null;
  private edgeEndpoint = '/functions/v1/appstore-html-fetch';
  private healthMetrics: AdapterHealth = {
    status: 'healthy',
    lastSuccess: null,
    lastFailure: null,
    successRate: 1.0,
    avgLatency: 0,
    errorCount: 0,
    requestCount: 0,
  };

  constructor() {
    // Load Supabase URL from environment
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

    if (!this.supabaseUrl) {
      console.warn('[appstore-html] VITE_SUPABASE_URL not set - adapter will be disabled');
      this.enabled = false;
    }

    // Load Supabase publishable key (anon key) from environment
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || null;

    if (!this.supabaseAnonKey) {
      this.enabled = false;
      console.warn('[appstore-html] Disabled: Missing VITE_SUPABASE_PUBLISHABLE_KEY');
    }

    console.log('[appstore-html] Adapter initialized:', {
      enabled: this.enabled,
      supabaseUrl: this.supabaseUrl ? '✓' : '✗',
      supabaseAnonKey: this.supabaseAnonKey ? '✓' : '✗',
      endpoint: this.edgeEndpoint,
      priority: this.priority,
    });
  }

  /**
   * Fetch HTML from App Store via Edge Function
   *
   * @param appId - App Store ID (e.g., "389801252")
   * @param options - Fetch options (country, timeout, etc.)
   * @returns Raw metadata containing Edge Function response
   * @throws Error if fetch fails or Edge Function returns error
   */
  async fetch(appId: string, options?: AdapterFetchOptions): Promise<RawMetadata> {
    const startTime = Date.now();
    const country = options?.country || 'us';
    const timeout = options?.timeout || 12000; // 12s to accommodate Edge Function's 9s timeout

    this.healthMetrics.requestCount++;

    try {
      // Validate inputs
      if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
        throw new Error('Invalid appId: must be a non-empty string');
      }

      if (!this.enabled) {
        throw new Error('HTML adapter disabled due to missing Supabase key');
      }

      // Build Edge Function URL
      const url = `${this.supabaseUrl}${this.edgeEndpoint}`;

      console.log(`[${this.name}] Fetching HTML via Edge Function:`, {
        appId,
        country,
        url,
      });

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.supabaseAnonKey}`,
          },
          body: JSON.stringify({
            appId,
            country,
          }),
        });

        clearTimeout(timeoutId);

        // Parse response
        const data: HtmlFetchResponse = await response.json();

        // Check if Edge Function succeeded
        if (!data.ok) {
          throw new Error(data.error || `Edge Function failed: ${data.errors.join(', ')}`);
        }

        // Validate response data
        if (!data.html || typeof data.html !== 'string') {
          throw new Error('Invalid response: html field missing or not a string');
        }

        if (!data.snapshot || typeof data.snapshot !== 'string') {
          throw new Error('Invalid response: snapshot field missing or not a string');
        }

        // Update health metrics
        const latency = Date.now() - startTime;
        this.updateHealthSuccess(latency);

        console.log(`[${this.name}] Success:`, {
          appId: data.appId,
          country: data.country,
          subtitle: data.subtitle,
          htmlLength: data.htmlLength,
          snapshotLength: data.snapshot.length,
          latency: `${latency}ms`,
          edgeLatency: `${data.latencyMs}ms`,
        });

        // Return raw metadata
        return {
          source: this.name,
          timestamp: new Date(),
          data: data,
          headers: {
            'content-type': 'application/json',
          },
          statusCode: response.status,
        };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Check if it was a timeout
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }

        throw fetchError;
      }

    } catch (error: any) {
      const latency = Date.now() - startTime;
      this.updateHealthFailure();

      console.error(`[${this.name}] Fetch failed:`, {
        appId,
        country,
        error: error.message,
        latency: `${latency}ms`,
      });

      throw new Error(`HTML Edge fetch failed: ${error.message}`);
    }
  }

  /**
   * Validate raw metadata from Edge Function
   *
   * @param raw - Raw metadata to validate
   * @returns true if valid, false otherwise
   */
  validate(raw: RawMetadata): boolean {
    // Must be from this adapter
    if (raw.source !== this.name) {
      console.warn(`[${this.name}] Invalid source: expected "${this.name}", got "${raw.source}"`);
      return false;
    }

    // Data must be an HtmlFetchResponse object
    if (typeof raw.data !== 'object' || raw.data === null) {
      console.warn(`[${this.name}] Invalid data: expected object, got ${typeof raw.data}`);
      return false;
    }

    const data = raw.data as HtmlFetchResponse;

    // Must have html field (can be empty string but must be present)
    if (typeof data.html !== 'string') {
      console.warn(`[${this.name}] Invalid data: html field missing or not a string`);
      return false;
    }

    // Must have snapshot field (can be empty string but must be present)
    if (typeof data.snapshot !== 'string') {
      console.warn(`[${this.name}] Invalid data: snapshot field missing or not a string`);
      return false;
    }

    // Subtitle may be null (that's valid - means no subtitle found)
    // But if present, must be a string
    if (data.subtitle !== null && typeof data.subtitle !== 'string') {
      console.warn(`[${this.name}] Invalid data: subtitle must be string or null`);
      return false;
    }

    // Description may be null (that's valid - means no description found)
    // But if present, must be a string
    if (data.description !== null && typeof data.description !== 'string') {
      console.warn(`[${this.name}] Invalid data: description must be string or null`);
      return false;
    }

    return true;
  }

  /**
   * Transform raw Edge Function response to ScrapedMetadata
   *
   * @param raw - Raw metadata from fetch()
   * @returns Normalized ScrapedMetadata
   * @throws Error if validation fails
   */
  transform(raw: RawMetadata): ScrapedMetadata {
    if (!this.validate(raw)) {
      throw new Error(`${this.name}: Invalid raw metadata`);
    }

    const data = raw.data as HtmlFetchResponse;

    // Extract title from snapshot if available
    const title = this.extractTitleFromSnapshot(data.snapshot) || data.appId;

    // Extract developer from snapshot if available
    const developer = this.extractDeveloperFromSnapshot(data.snapshot) || '';

    console.log(`[${this.name}] Transform completed:`, {
      appId: data.appId,
      title,
      subtitle: data.subtitle || '(none)',
      description: data.description ? `${data.description.substring(0, 50)}...` : '(none)',
      developer,
      subtitleSource: 'html-edge',
      descriptionSource: data.description ? 'html-edge-jsonld' : 'none',
    });

    // Return normalized metadata
    return {
      // Core identification
      appId: data.appId,
      name: title,
      title: title,
      url: data.finalUrl,
      locale: data.country,

      // Subtitle (extracted from DOM)
      subtitle: data.subtitle || '',
      subtitleSource: 'html-edge', // Mark as extracted from HTML Edge Function

      // Description (extracted from JSON-LD)
      description: data.description || '', // Now extracted from schema.org JSON-LD block

      // Additional metadata
      developer,
      applicationCategory: '',

      // Metrics (not available from HTML snapshot)
      rating: 0,
      reviews: 0,
      price: 'Unknown',

      // Creative assets (not extracted from snapshot)
      icon: '',
      screenshots: [],

      // Telemetry: Store Edge Function metrics
      htmlEdgeLatency: data.latencyMs,
      htmlLength: data.htmlLength,
    };
  }

  /**
   * Get adapter health status
   *
   * @returns Health metrics
   */
  getHealth(): AdapterHealth {
    return { ...this.healthMetrics };
  }

  /**
   * Extract title from DOM snapshot
   * Looks for <h1> tags in the snapshot
   *
   * @param snapshot - Minimal DOM snapshot from Edge Function
   * @returns Extracted title or null
   */
  private extractTitleFromSnapshot(snapshot: string): string | null {
    if (!snapshot || snapshot.length === 0) {
      return null;
    }

    // Look for <h1>Title</h1>
    const h1Pattern = /<h1[^>]*>(.*?)<\/h1>/is;
    const match = snapshot.match(h1Pattern);

    if (match && match[1]) {
      // Strip HTML tags and normalize whitespace
      const title = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (title.length > 0) {
        return title;
      }
    }

    return null;
  }

  /**
   * Extract developer name from DOM snapshot
   * Looks for developer links in the snapshot
   *
   * @param snapshot - Minimal DOM snapshot from Edge Function
   * @returns Extracted developer name or null
   */
  private extractDeveloperFromSnapshot(snapshot: string): string | null {
    if (!snapshot || snapshot.length === 0) {
      return null;
    }

    // Look for <div class="developer">Developer Name</div>
    const devPattern = /<div[^>]*class="[^"]*developer[^"]*"[^>]*>(.*?)<\/div>/is;
    const match = snapshot.match(devPattern);

    if (match && match[1]) {
      // Strip HTML tags and normalize whitespace
      const developer = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (developer.length > 0) {
        return developer;
      }
    }

    return null;
  }

  /**
   * Update health metrics on successful fetch
   *
   * @param latency - Request latency in milliseconds
   */
  private updateHealthSuccess(latency: number): void {
    this.healthMetrics.lastSuccess = new Date();
    this.healthMetrics.avgLatency =
      this.healthMetrics.avgLatency === 0
        ? latency
        : (this.healthMetrics.avgLatency * 0.9) + (latency * 0.1);
    this.healthMetrics.successRate = Math.min(1.0, this.healthMetrics.successRate + 0.01);
    this.healthMetrics.status = this.calculateStatus();
  }

  /**
   * Update health metrics on failed fetch
   */
  private updateHealthFailure(): void {
    this.healthMetrics.lastFailure = new Date();
    this.healthMetrics.errorCount++;
    this.healthMetrics.successRate = Math.max(0.0, this.healthMetrics.successRate - 0.05);
    this.healthMetrics.status = this.calculateStatus();
  }

  /**
   * Calculate adapter health status based on success rate
   *
   * @returns Health status (healthy, degraded, or down)
   */
  private calculateStatus(): 'healthy' | 'degraded' | 'down' {
    if (this.healthMetrics.successRate >= 0.9) return 'healthy';
    if (this.healthMetrics.successRate >= 0.5) return 'degraded';
    return 'down';
  }
}
