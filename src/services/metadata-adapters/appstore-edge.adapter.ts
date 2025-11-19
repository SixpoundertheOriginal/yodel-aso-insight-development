/**
 * App Store Edge Adapter
 *
 * Calls Supabase Edge Function for server-side App Store metadata scraping.
 * Bypasses CORS restrictions by proxying through Edge Function.
 *
 * Priority: 5 (highest - tried before all iTunes adapters)
 *
 * Phase A.6: Server-side metadata fetching
 */

import { ScrapedMetadata } from '@/types/aso';
import {
  MetadataSourceAdapter,
  RawMetadata,
  AdapterFetchOptions,
  AdapterHealth,
} from './types';

interface EdgeMetadataResponse {
  appId: string;
  country: string;
  success: boolean;

  // Phase B: Source-specific fields
  appStoreName?: string;
  appStoreSubtitle?: string;
  fallbackName?: string;
  fallbackSubtitle?: string;
  _htmlExtraction?: boolean;

  // Computed fields (backward compatibility)
  name: string;
  title: string;
  subtitle: string;
  developer: string;
  description: string;
  rating: number | null;
  ratingCount: number | null;
  screenshots: string[];
  icon: string | null;
  error?: string;
  _debugInfo?: {
    schemaVersion?: number;  // Phase E: Schema versioning
    htmlLength: number;
    extractionTimeMs: number;
    jsonLdFound?: boolean;
    htmlSignature?: string;
    source?: 'edge-scrape' | 'itunes-lookup-fallback';
  };
}

export class AppStoreEdgeAdapter implements MetadataSourceAdapter {
  readonly name = 'appstore-edge';
  readonly version = '1.0.0';
  readonly priority = 5; // Highest priority (lower number = higher priority)
  enabled = true;

  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private edgeEndpoint: string;
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
    // Load from environment variables
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    this.edgeEndpoint = import.meta.env.VITE_EDGE_METADATA_ENDPOINT || '/functions/v1/appstore-metadata';

    if (!this.supabaseUrl) {
      console.warn('[appstore-edge] VITE_SUPABASE_URL not set - adapter will be disabled');
      this.enabled = false;
    }

    if (!this.supabaseAnonKey) {
      console.warn('[appstore-edge] VITE_SUPABASE_PUBLISHABLE_KEY not set - adapter will be disabled');
      this.enabled = false;
    }

    console.log('[appstore-edge] Adapter initialized:', {
      enabled: this.enabled,
      supabaseUrl: this.supabaseUrl ? '✓' : '✗',
      endpoint: this.edgeEndpoint,
    });
  }

  async fetch(appId: string, options?: AdapterFetchOptions): Promise<RawMetadata> {
    const startTime = Date.now();
    const country = options?.country || 'us';
    const timeout = options?.timeout || 10000;

    this.healthMetrics.requestCount++;

    try {
      // Build Edge Function URL
      const url = new URL(this.edgeEndpoint, this.supabaseUrl);
      url.searchParams.set('appId', appId);
      url.searchParams.set('country', country);

      console.log(`[${this.name}] Fetching metadata:`, {
        appId,
        country,
        url: url.toString(),
      });

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'apikey': this.supabaseAnonKey,
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Edge Function returned ${response.status}: ${response.statusText}`);
      }

      const data: EdgeMetadataResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Edge Function returned success: false');
      }

      // Update health metrics
      const latency = Date.now() - startTime;
      this.updateHealthSuccess(latency);

      console.log(`[${this.name}] Success:`, {
        appId: data.appId,
        title: data.title,
        subtitle: data.subtitle,
        screenshots: data.screenshots.length,
        latency: `${latency}ms`,
        extractionTime: data._debugInfo?.extractionTimeMs,
      });

      // Return in RawMetadata format
      return {
        source: this.name,
        timestamp: new Date(),
        data: data, // Store the full Edge response
        headers: {},
        statusCode: 200,
      };

    } catch (error: any) {
      const latency = Date.now() - startTime;
      this.updateHealthFailure();

      console.error(`[${this.name}] Fetch failed:`, {
        appId,
        error: error.message,
        latency: `${latency}ms`,
      });

      throw new Error(`Edge Function fetch failed: ${error.message}`);
    }
  }

  validate(raw: RawMetadata): boolean {
    const data = raw.data as EdgeMetadataResponse;

    if (!data || typeof data !== 'object') {
      console.warn(`[${this.name}] Invalid data: expected object, got ${typeof data}`);
      return false;
    }

    if (!data.success) {
      console.warn(`[${this.name}] Invalid data: success=false`, data.error);
      return false;
    }

    const hasRequiredFields = data.appId !== undefined && data.title !== undefined;

    if (!hasRequiredFields) {
      console.warn(`[${this.name}] Invalid data: missing required fields`, data);
    }

    return hasRequiredFields;
  }

  transform(raw: RawMetadata): ScrapedMetadata {
    if (!this.validate(raw)) {
      throw new Error(`${this.name}: Invalid raw metadata`);
    }

    const data = raw.data as EdgeMetadataResponse;

    // Phase E: SAFETY ASSERTION - Verify schema version
    const schemaVersion = data._debugInfo?.schemaVersion;
    if (!schemaVersion || schemaVersion < 5) {
      console.warn(`[PHASE E VERIFY] ⚠️ OLD SCHEMA DETECTED (v${schemaVersion || 'unknown'}) - Edge Function needs redeployment!`);
    } else {
      console.log(`[PHASE E VERIFY] ✅ Schema v${schemaVersion} - Fresh metadata`);
    }

    console.log(`[${this.name}] 🎯 Transforming Edge metadata:`, {
      appId: data.appId,
      title: data.title,
      subtitle: data.subtitle,
      developer: data.developer,
      screenshotCount: data.screenshots.length,
      schemaVersion,
    });

    // DIAGNOSTIC: Log name/title BEFORE mapping
    console.log(`[DIAGNOSTIC-NAME-EDGE] BEFORE transform:`, {
      'raw.data.title': data.title,
      'raw.data.name': data.name,
      'raw.data.subtitle': data.subtitle,
      'raw.data.appStoreName': data.appStoreName,
      'raw.data.appStoreSubtitle': data.appStoreSubtitle,
      'raw.data.fallbackName': data.fallbackName,
      'raw.data.fallbackSubtitle': data.fallbackSubtitle,
      'raw.data._htmlExtraction': data._htmlExtraction,
      'raw.data._debugInfo.source': data._debugInfo?.source,
    });

    const transformed = {
      // Core fields
      appId: data.appId,
      name: data.name, // Computed by Edge Function (appStoreName OR fallbackName)
      url: `https://apps.apple.com/${data.country}/app/id${data.appId}`,

      // Phase B: Source-specific fields (pass through)
      appStoreName: data.appStoreName,
      appStoreSubtitle: data.appStoreSubtitle,
      fallbackName: data.fallbackName,
      fallbackSubtitle: data.fallbackSubtitle,
      _htmlExtraction: data._htmlExtraction,

      // Metadata fields
      title: data.title, // Same as name - for backward compatibility
      subtitle: data.subtitle || '', // Computed by Edge Function
      developer: data.developer || 'Unknown Developer',
      applicationCategory: '', // Not extracted by Edge Function

      // Description
      description: data.description || '',

      // Creative assets
      icon: data.icon || '',
      screenshots: data.screenshots || [],

      // Metrics
      rating: data.rating || 0,
      reviews: data.ratingCount || 0,

      // System fields
      country: data.country,
      locale: 'en-US',

      // Source tracking
      _source: this.name,
      _debugInfo: data._debugInfo, // Pass through debug info from Edge Function
    };

    // DIAGNOSTIC: Log final transformed metadata
    console.log(`[DIAG-FETCH] Final metadata from Edge adapter:`, {
      name: transformed.name,
      title: transformed.title,
      subtitle: transformed.subtitle,
      appStoreName: transformed.appStoreName,
      appStoreSubtitle: transformed.appStoreSubtitle,
      fallbackName: transformed.fallbackName,
      fallbackSubtitle: transformed.fallbackSubtitle,
      _htmlExtraction: transformed._htmlExtraction,
      source: (transformed as any)._source,
      edgeFunctionSource: data._debugInfo?.source,
    });

    return transformed;
  }

  getHealth(): AdapterHealth {
    return { ...this.healthMetrics };
  }

  private updateHealthSuccess(latency: number): void {
    this.healthMetrics.lastSuccess = new Date();
    this.healthMetrics.status = 'healthy';

    // Update average latency (rolling average)
    const prevWeight = this.healthMetrics.requestCount - 1;
    const newWeight = 1;
    this.healthMetrics.avgLatency =
      (this.healthMetrics.avgLatency * prevWeight + latency * newWeight) /
      (prevWeight + newWeight);

    // Update success rate
    const totalRequests = this.healthMetrics.requestCount;
    const successCount = totalRequests - this.healthMetrics.errorCount;
    this.healthMetrics.successRate = successCount / totalRequests;
  }

  private updateHealthFailure(): void {
    this.healthMetrics.lastFailure = new Date();
    this.healthMetrics.errorCount++;

    // Update success rate
    const totalRequests = this.healthMetrics.requestCount;
    const successCount = totalRequests - this.healthMetrics.errorCount;
    this.healthMetrics.successRate = successCount / totalRequests;

    // Update status based on success rate
    if (this.healthMetrics.successRate < 0.5) {
      this.healthMetrics.status = 'down';
    } else if (this.healthMetrics.successRate < 0.8) {
      this.healthMetrics.status = 'degraded';
    }
  }
}
