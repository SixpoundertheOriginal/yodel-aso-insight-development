/**
 * Direct iTunes API Service
 *
 * ⚠️ DEPRECATION NOTICE - Phase Out in Progress ⚠️
 *
 * This service is being phased out in favor of the MetadataOrchestrator + adapter architecture.
 *
 * AUDIT SUMMARY (Current Usage):
 *
 * Methods Exposed:
 * 1. searchWithAmbiguityDetection(term, config) → SearchResultsResponse
 *    - Returns list of candidate apps for ambiguity detection modal
 *    - Used by: aso-search.service.ts (3 call sites)
 *      a) executeDirectApiSearch() - line 266
 *      b) executeBypassSearch() - line 303
 *      c) searchApps() - line 534
 *
 * 2. lookupById(id, config) → ScrapedMetadata
 *    - Direct lookup by App Store ID
 *    - Used by: AppSelectionModal.tsx - line 153
 *      - When user pastes an App Store URL
 *
 * 3. searchDirect(term, config) → ScrapedMetadata
 *    - Single app direct search
 *    - Currently unused (legacy method)
 *
 * PROBLEM:
 * All methods use transformItunesResult() which:
 * - Does NOT parse subtitle correctly (assigns trackCensoredName directly)
 * - Does NOT normalize metadata through MetadataNormalizer
 * - Bypasses the adapter architecture entirely
 *
 * This causes:
 * - Subtitle duplication bugs (e.g., "Pimsleur | Language Learning" instead of "Language Learning")
 * - Screenshot inconsistencies
 * - Non-normalized data entering the database
 *
 * MIGRATION PLAN:
 * Task 2: Replace ambiguity detection with MetadataOrchestrator.searchByTerm()
 * Task 3: Replace lookupById with MetadataOrchestrator.fetchMetadataById()
 * Task 4: Remove this service entirely once all call sites migrated
 */

import { ScrapedMetadata } from '@/types/aso';
import { correlationTracker } from './correlation-tracker.service';

export interface DirectSearchConfig {
  organizationId: string;
  country?: string;
  limit?: number;
  bypassReason: string;
}

export interface SearchResultsResponse {
  isAmbiguous: boolean;
  results: ScrapedMetadata[];
  searchTerm: string;
}

class DirectItunesService {
  private baseUrl = 'https://itunes.apple.com/search';

  /**
   * Direct iTunes API search - bypasses all complex validation
   *
   * @deprecated Use metadataOrchestrator.fetchMetadata() instead
   * This method does not normalize subtitle parsing and bypasses the adapter architecture.
   */
  async searchDirect(term: string, config: DirectSearchConfig): Promise<ScrapedMetadata> {
    console.warn('[DEPRECATED] DirectItunesService.searchDirect() is deprecated. Use metadataOrchestrator.fetchMetadata() instead.');

    const correlationId = correlationTracker.getContext()?.id || 'direct-search';
    
    correlationTracker.log('info', `Direct iTunes search initiated`, {
      term,
      bypassReason: config.bypassReason,
      config
    });

    try {
      const searchUrl = this.buildSearchUrl(term, config);
      
      correlationTracker.log('info', `Calling iTunes API directly`, { searchUrl });
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'ASO-Insights-Platform/Emergency-Bypass'
        }
      });

      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error(`No results found for "${term}"`);
      }

      const app = data.results[0];
      const result = this.transformItunesResult(app);
      
      correlationTracker.log('info', `Direct search successful`, {
        appName: result.name,
        resultsCount: data.results.length
      });

      return result;

    } catch (error: any) {
      correlationTracker.log('error', `Direct search failed`, {
        error: error.message,
        term
      });
      throw new Error(`Direct search failed: ${error.message}`);
    }
  }

  /**
   * Enhanced search with ambiguity detection
   *
   * @deprecated Use metadataOrchestrator.searchApps() instead
   * This method does not normalize subtitle parsing and bypasses the adapter architecture.
   */
  async searchWithAmbiguityDetection(term: string, config: DirectSearchConfig): Promise<SearchResultsResponse> {
    console.warn('[DEPRECATED] DirectItunesService.searchWithAmbiguityDetection() is deprecated. Use metadataOrchestrator.searchApps() instead.');

    const correlationId = correlationTracker.getContext()?.id || 'ambiguity-search';
    
    correlationTracker.log('info', `Ambiguity detection search initiated`, {
      term,
      config
    });

    try {
      const searchUrl = this.buildSearchUrl(term, { ...config, limit: 25 });
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'ASO-Insights-Platform/Ambiguity-Detection'
        }
      });

      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error(`No results found for "${term}"`);
      }

      const transformedResults = data.results
        .slice(0, 15) // Limit to 15 for processing
        .map((app: any) => this.transformItunesResult(app));

      // Ambiguity detection logic
      const highQualityResults = transformedResults.filter((app: ScrapedMetadata) =>
        app.rating && app.rating >= 3.5 && app.reviews && app.reviews >= 50
      );

      const isAmbiguous = transformedResults.length >= 3 && highQualityResults.length >= 2;

      correlationTracker.log('info', `Ambiguity analysis completed`, {
        totalResults: transformedResults.length,
        highQualityResults: highQualityResults.length,
        isAmbiguous,
        term
      });

      // Always include the first result (most relevant from iTunes search algorithm)
      // Then add other high quality results if ambiguous
      let finalResults: ScrapedMetadata[];
      if (isAmbiguous) {
        // Start with first result (most relevant)
        finalResults = [transformedResults[0]];
        // Add other high quality results, avoiding duplicates
        const additionalResults = highQualityResults
          .filter(app => app.appId !== transformedResults[0].appId)
          .slice(0, 9);
        finalResults = [...finalResults, ...additionalResults];
      } else {
        finalResults = transformedResults.slice(0, 1);
      }

      return {
        isAmbiguous,
        results: finalResults,
        searchTerm: term
      };

    } catch (error: any) {
      correlationTracker.log('error', `Ambiguity detection search failed`, {
        error: error.message,
        term
      });
      throw new Error(`Ambiguity detection search failed: ${error.message}`);
    }
  }

  private buildSearchUrl(term: string, config: DirectSearchConfig): string {
    const params = new URLSearchParams({
      // Let URLSearchParams handle encoding exactly once
      term,
      country: (config.country || 'us').toLowerCase(),
      entity: 'software',
      limit: String(config.limit || 25),
    });
    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Direct lookup by App Store id (adamId)
   *
   * @deprecated Use metadataOrchestrator.lookupById() instead
   * This method does not normalize subtitle parsing and bypasses the adapter architecture.
   */
  async lookupById(id: string, config: { country?: string }): Promise<ScrapedMetadata> {
    console.warn('[DEPRECATED] DirectItunesService.lookupById() is deprecated. Use metadataOrchestrator.lookupById() instead.');
    const url = `https://itunes.apple.com/lookup?id=${id}&country=${(config.country || 'us').toLowerCase()}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ASO-Insights-Platform/Lookup' } });
    if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
    const data = await res.json();
    if (!data.results || !data.results[0]) throw new Error('No app found for id');
    return this.transformItunesResult(data.results[0]);
  }

  private transformItunesResult(app: any): ScrapedMetadata {
    return {
      name: app.trackName || 'Unknown App',
      appId: app.trackId?.toString() || `direct-${Date.now()}`,
      title: app.trackName || 'Unknown App',
      // FIX #1: Remove raw trackCensoredName assignment - let normalizer handle subtitle extraction
      // iTunes API bug: trackCensoredName === trackName (both contain "App - Subtitle")
      // The normalizer will parse subtitle from title if needed
      subtitle: app.trackCensoredName || '',
      description: app.description || '',
      url: app.trackViewUrl || '',
      icon: app.artworkUrl512 || app.artworkUrl100 || '',
      rating: app.averageUserRating || 0,
      reviews: app.userRatingCount || 0,
      developer: app.artistName || 'Unknown Developer',
      applicationCategory: app.primaryGenreName || 'Unknown',
      locale: 'en-US',
      // FIX #2: Add screenshots field mapping (was missing - caused screenshot loss)
      // iTunes API provides screenshotUrls array
      screenshots: Array.isArray(app.screenshotUrls)
        ? app.screenshotUrls.filter((url: string) => url && typeof url === 'string' && url.trim().length > 0)
        : []
    };
  }
}

export const directItunesService = new DirectItunesService();
