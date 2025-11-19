/**
 * Metadata Orchestrator
 *
 * Manages multiple metadata adapters with priority-based fallback logic.
 * Handles source selection, retry logic, normalization, and telemetry.
 *
 * Phase A: Core orchestration with automatic fallback
 */

import { ScrapedMetadata } from '@/types/aso';
import {
  MetadataSourceAdapter,
  AdapterFetchOptions,
  NormalizedMetadata,
} from './types';
import { MetadataNormalizer } from './normalizer';
import { ItunesSearchAdapter } from './itunes-search.adapter';
import { ItunesLookupAdapter } from './itunes-lookup.adapter';
import { AppStoreWebAdapter } from './appstore-web.adapter';
import { AppStoreEdgeAdapter } from './appstore-edge.adapter';

export interface OrchestrationOptions extends AdapterFetchOptions {
  skipNormalization?: boolean;
  preferredSource?: string;
  maxRetries?: number;
}

export interface FetchResult {
  success: boolean;
  metadata?: NormalizedMetadata;
  source?: string;
  latency: number;
  error?: string;
  attemptedSources: string[];
}

export class MetadataOrchestrator {
  private adapters: Map<string, MetadataSourceAdapter> = new Map();
  private normalizer: MetadataNormalizer;

  constructor() {
    this.normalizer = new MetadataNormalizer();
    this.registerDefaultAdapters();
  }

  /**
   * Register default adapters in priority order
   *
   * Priority order (lower number = higher priority):
   * 1. AppStoreEdge (priority 5) - Server-side scraping via Edge Function (CORS-free)
   * 2. AppStoreWeb (priority 10, if enabled) - Browser-based scraping (CORS-blocked)
   * 3. ItunesSearch (priority 10) - Fast, but treats appId as search term
   * 4. ItunesLookup (priority 20) - Reliable fallback for single app queries
   */
  private registerDefaultAdapters(): void {
    // Phase A.6: App Store Edge Adapter (server-side scraping)
    // Always register - it will disable itself if env vars missing
    const edgeAdapter = new AppStoreEdgeAdapter();
    this.registerAdapter(edgeAdapter);
    if (edgeAdapter.enabled) {
      console.log('[ORCHESTRATOR] Edge adapter enabled - server-side scraping (priority 5)');
    } else {
      console.log('[ORCHESTRATOR] Edge adapter disabled - missing Supabase config');
    }

    // Phase A.5: App Store Web Adapter (browser-based, CORS-blocked)
    // Use import.meta.env for Vite (browser-compatible)
    const enableWebAdapter = import.meta.env.VITE_ENABLE_WEB_ADAPTER === 'true';

    if (enableWebAdapter) {
      const webAdapter = new AppStoreWebAdapter();
      this.registerAdapter(webAdapter);
      console.log('[ORCHESTRATOR] Web adapter enabled (priority 10) - browser fallback (CORS may block)');
    } else {
      console.log('[ORCHESTRATOR] Web adapter disabled');
    }

    // iTunes API adapters (always enabled)
    this.registerAdapter(new ItunesSearchAdapter());
    this.registerAdapter(new ItunesLookupAdapter());
  }

  /**
   * Register a metadata source adapter
   */
  registerAdapter(adapter: MetadataSourceAdapter): void {
    this.adapters.set(adapter.name, adapter);
    console.log(`[ORCHESTRATOR] Registered adapter: ${adapter.name} (priority: ${adapter.priority})`);
  }

  /**
   * Get all registered adapters sorted by priority
   */
  private getActiveAdapters(preferredSource?: string): MetadataSourceAdapter[] {
    const adapters = Array.from(this.adapters.values())
      .filter(adapter => adapter.enabled);

    // If preferred source specified and available, put it first
    if (preferredSource) {
      const preferred = adapters.find(a => a.name === preferredSource);
      if (preferred) {
        const others = adapters.filter(a => a.name !== preferredSource);
        return [preferred, ...others.sort((a, b) => a.priority - b.priority)];
      }
    }

    // Default: sort by priority
    return adapters.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Fetch metadata with automatic fallback across sources
   *
   * @param appIdentifier - App ID, URL, or search term
   * @param options - Fetch options
   * @returns Normalized metadata
   */
  async fetchMetadata(
    appIdentifier: string,
    options?: OrchestrationOptions
  ): Promise<NormalizedMetadata> {
    const result = await this.fetchMetadataWithResult(appIdentifier, options);

    if (!result.success || !result.metadata) {
      throw new Error(result.error || 'All metadata sources failed');
    }

    return result.metadata;
  }

  /**
   * Fetch metadata with detailed result information
   *
   * STRICT APP ID-ONLY FALLBACK CHAIN:
   * 1. Try WebAdapter.fetch(appId)
   * 2. If fail → try ItunesLookupAdapter.fetch(appId)
   * 3. If both fail → return error
   *
   * 🚫 NO name-based search fallback (prevents wrong app imports)
   *
   * Includes source used, latency, and error details
   */
  async fetchMetadataWithResult(
    appIdentifier: string,
    options?: OrchestrationOptions
  ): Promise<FetchResult> {
    const startTime = Date.now();
    const attemptedSources: string[] = [];
    const maxRetries = options?.maxRetries || 1;

    const activeAdapters = this.getActiveAdapters(options?.preferredSource);

    if (activeAdapters.length === 0) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: 'No active metadata adapters available',
        attemptedSources,
      };
    }

    console.log(`[ORCHESTRATOR] 🔍 Fetching metadata for appId: ${appIdentifier}`);
    console.log(`[ORCHESTRATOR] 📋 Adapter fallback chain: ${activeAdapters.map(a => a.name).join(' → ')}`);
    console.log(`[ORCHESTRATOR] 🚫 Name-based fallback: DISABLED (appId-only mode)`);

    // ========== DEBUG LOGGING: FETCH START ==========
    console.log('[DEBUG-FETCH-START] fetchMetadata called with:', {
      appId: appIdentifier,
      activeAdapters: activeAdapters.map(a => ({
        name: a.name,
        priority: a.priority,
        enabled: a.enabled,
      })),
      country: options?.country || 'default',
      skipNormalization: options?.skipNormalization || false,
    });
    // ================================================

    // Try each adapter in priority order
    for (const adapter of activeAdapters) {
      attemptedSources.push(adapter.name);

      // Retry logic for current adapter
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[ORCHESTRATOR] ⏳ Trying ${adapter.name} (attempt ${attempt}/${maxRetries}) for appId: ${appIdentifier}`);

          // Fetch raw metadata using ONLY appId
          const raw = await adapter.fetch(appIdentifier, options);

          // Validate
          if (!adapter.validate(raw)) {
            console.warn(`[ORCHESTRATOR] ❌ ${adapter.name} returned invalid data (validation failed)`);
            break; // Move to next adapter (don't retry validation failures)
          }

          // Transform to ScrapedMetadata
          const metadata = adapter.transform(raw);

          // Verify appId matches (safety check)
          if (metadata.appId && metadata.appId !== appIdentifier) {
            console.error(`[ORCHESTRATOR] ⚠️ APP ID MISMATCH! Requested: ${appIdentifier}, Got: ${metadata.appId}`);
            console.error(`[ORCHESTRATOR] 🚨 This indicates a fallback bug - rejecting this result`);
            break; // Reject mismatched results
          }

          // Normalize (unless skipped)
          const normalized = options?.skipNormalization
            ? metadata
            : this.normalizer.normalize(metadata, adapter.name);

          const latency = Date.now() - startTime;

          console.log(`[ORCHESTRATOR] ✅ Success with ${adapter.name}`, {
            appId: normalized.appId,
            name: normalized.name,
            latency: `${latency}ms`,
            completeness: this.normalizer.calculateCompleteness(metadata).completeness,
          });

          // ========== DEBUG LOGGING: FETCH RESULT ==========
          console.log('[DEBUG-FETCH-RESULT] Metadata fetch complete:', {
            appId: appIdentifier,
            adapterUsed: adapter.name,
            normalizationRan: !options?.skipNormalization,
            rawOutputFromAdapter: {
              appId: metadata.appId,
              name: metadata.name,
              title: metadata.title,
              subtitle: metadata.subtitle,
              developer: metadata.developer,
              description: metadata.description?.substring(0, 100) + '...',
              screenshots: metadata.screenshots?.length || 0,
              _source: (metadata as any)._source,
            },
            normalizedOutput: {
              appId: normalized.appId,
              name: normalized.name,
              title: normalized.title,
              subtitle: normalized.subtitle,
              developer: normalized.developer,
              description: normalized.description?.substring(0, 100) + '...',
              screenshots: normalized.screenshots?.length || 0,
              _source: (normalized as any)._source,
            },
            attemptedSources,
            latency: `${latency}ms`,
          });
          // =================================================

          // DIAGNOSTIC: Log final metadata BEFORE return
          console.log(`[DIAGNOSTIC-NAME-ORCHESTRATOR] BEFORE return:`, {
            'finalMetadata.name': normalized.name,
            'finalMetadata.title': normalized.title,
            'finalMetadata.subtitle': normalized.subtitle,
            'source': adapter.name,
          });

          return {
            success: true,
            metadata: normalized,
            source: adapter.name,
            latency,
            attemptedSources,
          };

        } catch (error: any) {
          console.error(`[ORCHESTRATOR] ❌ ${adapter.name} attempt ${attempt} failed for appId ${appIdentifier}:`, error.message);

          // If last attempt with this adapter failed, move to next adapter
          if (attempt === maxRetries) {
            console.log(`[ORCHESTRATOR] ⏭️ ${adapter.name} exhausted all retries → trying next adapter`);
            break;
          }

          // Exponential backoff before retry
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[ORCHESTRATOR] 🔄 Retrying ${adapter.name} in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All adapters failed - NO NAME-BASED FALLBACK
    const latency = Date.now() - startTime;
    const error = `All metadata sources failed for appId: ${appIdentifier}. Attempted: ${attemptedSources.join(', ')}`;

    console.error(`[ORCHESTRATOR] ❌ All adapters failed for appId: ${appIdentifier}`);
    console.error(`[ORCHESTRATOR] 🚫 Name-based fallback: DISABLED (for safety - prevents wrong app imports)`);
    console.error(`[ORCHESTRATOR] ⏹️ Aborting - cannot fetch metadata without valid appId`);

    return {
      success: false,
      latency,
      error,
      attemptedSources,
    };
  }

  /**
   * Search for multiple app candidates by search term
   *
   * ⚡ LIGHTWEIGHT SEARCH - Returns minimal metadata for fast search results
   *
   * Used for ambiguity detection and app selection modals.
   * Returns ONLY lightweight fields for fast performance:
   * - appId
   * - name
   * - developer
   * - icon
   * - country
   *
   * ❌ Does NOT return: subtitle, screenshots, description, reviews, etc.
   *
   * Strategy:
   * 1. Use iTunes Search API to get list of apps (fast, supports multi-result)
   * 2. Return lightweight metadata for each app (NO fetchMetadata calls)
   * 3. When user selects an app, caller should use fetchMetadata() to get full data
   *
   * @param searchTerm - Search query (app name, keyword, etc.)
   * @param options - Search options (limit, country, etc.)
   * @returns Array of lightweight metadata for matching apps
   */
  async searchApps(
    searchTerm: string,
    options?: OrchestrationOptions & { limit?: number }
  ): Promise<NormalizedMetadata[]> {
    const startTime = Date.now();
    const limit = options?.limit || 15;

    console.log(`[ORCHESTRATOR] 🔍 LIGHTWEIGHT SEARCH for: "${searchTerm}" (limit: ${limit})`);

    // Use iTunes Search adapter to get list of apps
    const activeAdapters = this.getActiveAdapters(options?.preferredSource);
    const searchAdapter = activeAdapters.find(a => a.name === 'itunes-search');

    if (!searchAdapter) {
      console.error('[ORCHESTRATOR] iTunes Search adapter not available');
      return [];
    }

    try {
      // Fetch raw metadata with limit
      const raw = await searchAdapter.fetch(searchTerm, {
        ...options,
        limit,
      });

      // Validate raw response
      if (!Array.isArray(raw.data) || raw.data.length === 0) {
        console.warn(`[ORCHESTRATOR] No results found for: ${searchTerm}`);
        return [];
      }

      const latency = Date.now() - startTime;
      console.log(`[ORCHESTRATOR] ✅ SEARCH → Returning ${raw.data.length} lightweight candidates (${latency}ms)`);

      // Return lightweight metadata ONLY - no fetchMetadata calls
      const lightweightResults: NormalizedMetadata[] = raw.data
        .map((appData: any) => {
          const appId = appData.trackId?.toString();
          if (!appId) {
            return null;
          }

          // Return ONLY lightweight fields
          return {
            appId,
            name: appData.trackName || 'Unknown App',
            developer: appData.artistName || 'Unknown Developer',
            icon: appData.artworkUrl512 || appData.artworkUrl100 || '',
            applicationCategory: appData.primaryGenreName || 'Unknown',
            locale: 'en-US',

            // Required fields (minimal/empty values)
            title: appData.trackName || 'Unknown App',
            subtitle: '', // ❌ Not included in lightweight search
            description: '', // ❌ Not included in lightweight search
            url: appData.trackViewUrl || '',
            rating: 0, // ❌ Not included in lightweight search
            reviews: 0, // ❌ Not included in lightweight search
            screenshots: [], // ❌ Not included in lightweight search

            _source: 'itunes-search-lightweight',
          } as NormalizedMetadata;
        })
        .filter((app): app is NormalizedMetadata => app !== null);

      console.log(`[ORCHESTRATOR] 📦 SEARCH → ${lightweightResults.length} apps ready for selection`);

      return lightweightResults;

    } catch (error: any) {
      console.error(`[ORCHESTRATOR] Search failed for "${searchTerm}":`, error.message);
      return [];
    }
  }

  /**
   * Lookup app by App Store ID
   *
   * Convenience method for looking up apps by numeric ID or App Store URL.
   * Uses the iTunes Lookup adapter for fast, direct lookups.
   *
   * @param appId - Numeric app ID, "id123456", or App Store URL
   * @param options - Lookup options (country, etc.)
   * @returns Normalized metadata for the app
   */
  async lookupById(
    appId: string,
    options?: OrchestrationOptions
  ): Promise<NormalizedMetadata> {
    console.log(`[ORCHESTRATOR] Looking up app by ID: ${appId}`);

    // Use the lookup adapter for direct ID lookups
    const activeAdapters = this.getActiveAdapters();
    const lookupAdapter = activeAdapters.find(a => a.name === 'itunes-lookup');

    if (!lookupAdapter) {
      console.error('[ORCHESTRATOR] iTunes Lookup adapter not available');
      throw new Error('Lookup adapter not available');
    }

    try {
      // Fetch raw metadata
      const raw = await lookupAdapter.fetch(appId, options);

      // Validate
      if (!lookupAdapter.validate(raw)) {
        throw new Error(`Invalid app data for ID: ${appId}`);
      }

      // Transform to ScrapedMetadata (this calls parseTitle!)
      const metadata = lookupAdapter.transform(raw);

      // Normalize (unless skipped)
      const normalized = options?.skipNormalization
        ? metadata
        : this.normalizer.normalize(metadata, lookupAdapter.name);

      console.log(`[ORCHESTRATOR] Lookup successful for ID: ${appId}`);
      return normalized;

    } catch (error: any) {
      console.error(`[ORCHESTRATOR] Lookup failed for ID "${appId}":`, error.message);
      throw new Error(`Lookup failed: ${error.message}`);
    }
  }

  /**
   * Fetch metadata from multiple apps in parallel with rate limiting
   */
  async fetchBatch(
    appIdentifiers: string[],
    options?: OrchestrationOptions
  ): Promise<Map<string, FetchResult>> {
    const results = new Map<string, FetchResult>();

    console.log(`[ORCHESTRATOR] Batch fetch: ${appIdentifiers.length} apps`);

    // Process in parallel (rate limiting handled by individual adapters)
    const promises = appIdentifiers.map(async (appId) => {
      const result = await this.fetchMetadataWithResult(appId, options);
      results.set(appId, result);
    });

    await Promise.all(promises);

    const successCount = Array.from(results.values()).filter(r => r.success).length;
    console.log(`[ORCHESTRATOR] Batch complete: ${successCount}/${appIdentifiers.length} successful`);

    return results;
  }

  /**
   * Get health status of all adapters
   */
  getAdaptersHealth(): Map<string, any> {
    const health = new Map();

    for (const [name, adapter] of this.adapters) {
      health.set(name, {
        name,
        enabled: adapter.enabled,
        priority: adapter.priority,
        version: adapter.version,
        health: adapter.getHealth(),
      });
    }

    return health;
  }

  /**
   * Enable or disable an adapter
   */
  setAdapterEnabled(name: string, enabled: boolean): boolean {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      console.warn(`[ORCHESTRATOR] Adapter not found: ${name}`);
      return false;
    }

    adapter.enabled = enabled;
    console.log(`[ORCHESTRATOR] Adapter ${name} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Get adapter by name
   */
  getAdapter(name: string): MetadataSourceAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get all registered adapter names
   */
  getAdapterNames(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Export singleton instance
export const metadataOrchestrator = new MetadataOrchestrator();
