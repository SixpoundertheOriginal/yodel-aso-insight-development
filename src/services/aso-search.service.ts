import { supabase } from '@/integrations/supabase/client';
import { inputDetectionService, SearchParameters } from './input-detection.service';
import { bypassPatternsService } from './bypass-patterns.service';
import { correlationTracker } from './correlation-tracker.service';
import { requestTransmissionService } from './request-transmission.service';
import { AmbiguousSearchError } from '@/types/search-errors';
import { ScrapedMetadata } from '@/types/aso';
import { CircuitBreaker } from '@/lib/utils/circuit-breaker';

// Import new bulletproof error handling services
import { retryStrategyService, RetryResult } from './retry-strategy.service';
import { multiLevelCircuitBreakerService } from './multi-level-circuit-breaker.service';
import { cacheFallbackService } from './cache-fallback.service';
import { userExperienceShieldService, LoadingState, UserFriendlyError } from './user-experience-shield.service';
import { failureAnalyticsService } from './failure-analytics.service';

// Import Phase A adapters for modern metadata ingestion
import { metadataOrchestrator } from './metadata-adapters';
import { metadataNormalizer } from './metadata-adapters/normalizer';

export interface SearchResult {
  targetApp: ScrapedMetadata;
  competitors: ScrapedMetadata[];
  searchContext: {
    query: string;
    type: 'url' | 'keyword' | 'brand';
    totalResults: number;
    category: string;
    country: string;
    source: 'primary' | 'fallback' | 'cache' | 'similar';
    responseTime: number;
    backgroundRetries: number;
  };
  intelligence: {
    keywordDifficulty?: number;
    marketSaturation?: number;
    trendingScore?: number;
    opportunities: string[];
  };
}

export interface SearchConfig {
  organizationId: string;
  includeIntelligence?: boolean;
  cacheResults?: boolean;
  debugMode?: boolean;
  onLoadingUpdate?: (state: LoadingState) => void;
  country?: string;
}

/**
 * Query type classification for determining auto-import vs. picker behavior
 */
export type QueryType = 'name' | 'url' | 'appId';

/**
 * Helper: Detect if query is an App Store URL
 */
function isAppStoreUrl(query: string): boolean {
  return query.includes('apps.apple.com') || query.includes('itunes.apple.com');
}

/**
 * Helper: Detect if query is a numeric App ID
 */
function isNumericAppId(query: string): boolean {
  // Match pure numeric IDs (6-12 digits) or "id" prefix format
  return /^(id)?\d{6,12}$/i.test(query.trim());
}

/**
 * Classify query type to determine search behavior
 *
 * - URL/ID → auto-import (skip picker)
 * - Name → always show picker (even for 1 result)
 */
function classifyQueryType(query: string): QueryType {
  const trimmed = query.trim();

  if (isAppStoreUrl(trimmed)) {
    return 'url';
  }

  if (isNumericAppId(trimmed)) {
    return 'appId';
  }

  return 'name';
}

class AsoSearchService {
  private maxRetries = 2;
  private baseDelay = 1000;
  
  // Legacy circuit breaker (keeping for compatibility)
  private edgeFunctionCircuitBreaker = new CircuitBreaker({
    maxFailures: 5,
    resetTimeMs: 60000,
    name: 'EdgeFunction'
  });

  /**
   * Bulletproof search with comprehensive error handling and fallback chain
   */
  async search(input: string, config: SearchConfig): Promise<SearchResult> {
    const correlationContext = correlationTracker.createContext('aso-search', config.organizationId);
    const startTime = Date.now();
    
    console.group(`🚀 [ASO-SEARCH] Bulletproof search starting`);
    console.log('Input:', input);
    console.log('Config:', config);
    
    // Start UX shield
    const loadingState = userExperienceShieldService.startLoading(input);
    config.onLoadingUpdate?.(loadingState);

    correlationTracker.log('info', 'Bulletproof ASO search initiated', { input, config });

    try {
      // Phase E: CACHING DISABLED - Always fetch fresh metadata from backend
      // No cache retrieval, no stale data

      // Execute bulletproof search chain (always fresh)
      const result = await this.executeBulletproofSearchChain(input, config, startTime);

      // Phase E: CACHING DISABLED - Do not store metadata in cache

      console.groupEnd();
      return result;

    } catch (error: any) {
      console.groupEnd();
      
      // Handle ambiguous search - let it bubble up for user selection
      if (error instanceof AmbiguousSearchError) {
        userExperienceShieldService.reset();
        throw error;
      }

      // Record failure for analytics (only for actual failures)
      failureAnalyticsService.recordFailure({
        component: 'aso-search-orchestrator',
        method: 'bulletproof-search',
        error: error.message,
        searchTerm: input,
        organizationId: config.organizationId,
        context: { config, startTime }
      });

      // Handle with UX shield
      const userError = userExperienceShieldService.handleError(error, {
        searchTerm: input,
        attempts: 3 // Assuming full fallback chain was attempted
      });
      config.onLoadingUpdate?.(userExperienceShieldService.getCurrentState());

      // Phase E: NO CACHE FALLBACK - Always fail cleanly instead of returning stale data

      throw new Error(userError.message);
    }
  }

  /**
   * Execute the bulletproof search chain with intelligent fallbacks
   * FIXED: Check for ambiguity first before calling edge function
   */
  private async executeBulletproofSearchChain(input: string, config: SearchConfig, startTime: number): Promise<SearchResult> {
    // FIXED: Reorder to check ambiguity first, then call edge function only for confirmed apps
    const searchMethods = [
      { name: 'direct-itunes-api', handler: () => this.executeDirectApiSearch(input, config) },
      { name: 'enhanced-edge-function', handler: () => this.executeEnhancedEdgeFunctionSearch(input, config) },
      { name: 'bypass-search', handler: () => this.executeBypassSearch(input, config) }
    ];

    let lastError: Error | undefined;
    let totalRetries = 0;

    for (const method of searchMethods) {
      const isAvailable = multiLevelCircuitBreakerService.isAvailable(method.name);
      
      if (!isAvailable) {
        console.log(`🚫 [BULLETPROOF-SEARCH] Skipping ${method.name} - circuit breaker open`);
        continue;
      }

      // Update loading stage
      const stage = method.name === 'enhanced-edge-function' ? 'searching' : 'fallback';
      const stageState = userExperienceShieldService.updateStage(stage);
      config.onLoadingUpdate?.(stageState);

      console.log(`🎯 [BULLETPROOF-SEARCH] Attempting ${method.name}`);

      try {
        // FIXED: Handle AmbiguousSearchError immediately without retry
        const result = await method.handler();
        
        // If we get here, it's a successful result (not ambiguous)
        multiLevelCircuitBreakerService.recordSuccess(method.name);
        
        // Calculate final response time
        const responseTime = Date.now() - startTime;

        // Update search context with recovery info
        result.searchContext.source = method.name === 'enhanced-edge-function' ? 'primary' : 'fallback';
        result.searchContext.responseTime = responseTime;
        result.searchContext.backgroundRetries = totalRetries;

        // Complete loading
        const feedback = {
          searchTerm: input,
          resultSource: result.searchContext.source,
          responseTime,
          userVisible: true,
          backgroundRetries: totalRetries
        };

        const completeState = userExperienceShieldService.completeLoading(feedback);
        config.onLoadingUpdate?.(completeState);

        // Record recovery if there were previous failures
        if (lastError) {
          failureAnalyticsService.recordRecovery(
            { component: method.name, searchTerm: input },
            method.name,
            responseTime
          );
        }

        console.log(`✅ [BULLETPROOF-SEARCH] Success via ${method.name} (${responseTime}ms)`);
        return result;

      } catch (error: any) {
        // FIXED: Let AmbiguousSearchError bubble up immediately
        if (error instanceof AmbiguousSearchError) {
          console.log(`🎯 [BULLETPROOF-SEARCH] ${method.name} found multiple candidates - bubbling up for user selection`);
          throw error;
        }

        // For actual failures, record and continue to next method
        lastError = error;
        multiLevelCircuitBreakerService.recordFailure(method.name, error);
        
        failureAnalyticsService.recordFailure({
          component: method.name,
          method: 'bulletproof-search-method',
          error: error.message,
          searchTerm: input,
          organizationId: config.organizationId,
          context: { totalRetries }
        });

        console.log(`❌ [BULLETPROOF-SEARCH] ${method.name} failed: ${error.message}`);
      }
    }

    // All methods failed
    throw lastError || new Error('All search methods exhausted');
  }

  /**
   * Enhanced direct API search with retry logic
   * MIGRATED: Now uses MetadataOrchestrator instead of DirectItunesService
   *
   * UX BEHAVIOR (Post-Fall 2025):
   * - Name searches: ALWAYS show picker (even for 1 result)
   * - URL/ID searches: Auto-import (skip picker)
   */
  private async executeDirectApiSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    correlationTracker.log('info', 'Executing bulletproof direct API search via orchestrator');

    // Classify query type for picker vs. auto-import behavior
    const queryType = classifyQueryType(input);
    console.log(`[DIRECT-API] 🔍 Query type: ${queryType} → input="${input}"`);

    try {
      // Use orchestrator for normalized, properly parsed metadata
      const normalizedResults = await metadataOrchestrator.searchApps(input, {
        country: config.country || 'us',
        limit: 15,
      });

      if (normalizedResults.length === 0) {
        throw new Error(`No apps found for "${input}". Try different keywords or check the spelling.`);
      }

      // QUERY-TYPE-BASED PICKER LOGIC:
      // - Name searches: ALWAYS show picker (even 1 result)
      // - URL/ID searches: Auto-import (skip picker)
      const shouldShowPicker = queryType === 'name' || normalizedResults.length > 1;

      if (shouldShowPicker) {
        if (queryType === 'name') {
          console.log(`🎯 [DIRECT-API] Query type: name → showing picker (${normalizedResults.length} results)`);
        } else {
          console.log(`🎯 [DIRECT-API] Multiple results (${normalizedResults.length}) → showing picker`);
        }

        // Return all results for user selection (up to 10)
        const candidates = normalizedResults.slice(0, 10);
        throw new AmbiguousSearchError(candidates as ScrapedMetadata[], input);
      }

      // URL/ID with single result - auto-import
      console.log(`✅ [DIRECT-API] Query type: ${queryType} → auto-import (1 result)`);
      return this.wrapDirectResult(normalizedResults[0] as ScrapedMetadata, input, 'bulletproof-direct-api', config.country || 'us');

    } catch (error: any) {
      if (error instanceof AmbiguousSearchError) {
        throw error;
      }

      correlationTracker.log('error', 'Bulletproof direct API search failed', { error: error.message });
      throw new Error(`Direct API search failed: ${error.message}`);
    }
  }

  /**
   * Enhanced bypass search with retry logic
   * MIGRATED: Now uses MetadataOrchestrator instead of DirectItunesService
   *
   * UX BEHAVIOR (Post-Fall 2025):
   * - Name searches: ALWAYS show picker (even for 1 result)
   * - URL/ID searches: Auto-import (skip picker)
   */
  private async executeBypassSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    const bypassAnalysis = bypassPatternsService.analyzeForBypass(input);
    correlationTracker.log('info', 'Executing bulletproof bypass search via orchestrator', bypassAnalysis);

    // Classify query type for picker vs. auto-import behavior
    const queryType = classifyQueryType(input);
    console.log(`[BYPASS-SEARCH] 🔍 Query type: ${queryType} → input="${input}"`);

    try {
      // Use orchestrator for normalized, properly parsed metadata
      const normalizedResults = await metadataOrchestrator.searchApps(input, {
        country: config.country || 'us',
        limit: 25,
      });

      if (normalizedResults.length === 0) {
        throw new Error(`No apps found for "${input}". Try different keywords or check the spelling.`);
      }

      // QUERY-TYPE-BASED PICKER LOGIC:
      // - Name searches: ALWAYS show picker (even 1 result)
      // - URL/ID searches: Auto-import (skip picker)
      const shouldShowPicker = queryType === 'name' || normalizedResults.length > 1;

      if (shouldShowPicker) {
        if (queryType === 'name') {
          console.log(`🎯 [BYPASS-SEARCH] Query type: name → showing picker (${normalizedResults.length} results)`);
        } else {
          console.log(`🎯 [BYPASS-SEARCH] Multiple results (${normalizedResults.length}) → showing picker`);
        }

        // Return all results for user selection (up to 10)
        const candidates = normalizedResults.slice(0, 10);
        throw new AmbiguousSearchError(candidates as ScrapedMetadata[], input);
      }

      // URL/ID with single result - auto-import
      console.log(`✅ [BYPASS-SEARCH] Query type: ${queryType} → auto-import (1 result)`);
      return this.wrapDirectResult(normalizedResults[0] as ScrapedMetadata, input, 'bulletproof-bypass', config.country || 'us');

    } catch (error: any) {
      if (error instanceof AmbiguousSearchError) {
        throw error;
      }

      throw error;
    }
  }

  /**
   * Phase A.2: Enhanced metadata search using Phase A adapters
   * MIGRATED from Edge Function to adapter-based architecture
   */
  private async executeEnhancedEdgeFunctionSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    console.log('🔍 [PHASE-A-ADAPTER] Using Phase A metadata adapters for search');
    console.log('📡 [PHASE-A-ADAPTER] Input:', input, 'Country:', config.country || 'us');

    try {
      // Use Phase A adapter orchestrator for metadata fetching
      const metadata = await metadataOrchestrator.fetchMetadata(input, {
        country: config.country || 'us',
        timeout: 30000,
        retries: 2
      });

      console.log('✅ [PHASE-A-ADAPTER] Metadata fetched successfully:', {
        name: metadata.name,
        appId: metadata.appId,
        hasScreenshots: !!metadata.screenshots?.length,
        hasSubtitle: !!metadata.subtitle,
        source: metadata._source
      });

      // [DIAGNOSTIC] Frontend fetch layer - subtitle flow trace
      if (import.meta.env.DEV) {
        console.log('[DIAGNOSTIC-FRONTEND-FETCH] Metadata received from orchestrator:', {
          'metadata.subtitle': metadata.subtitle,
          'metadata.subtitleSource': (metadata as any).subtitleSource,
          'metadata.name': metadata.name,
          'metadata._source': metadata._source
        });
      }

      // Transform Phase A adapter result to SearchResult format
      const searchResult = {
        targetApp: {
          ...metadata,
          // Ensure all required ScrapedMetadata fields are present
          name: metadata.name,
          appId: metadata.appId,
          title: metadata.title,
          subtitle: metadata.subtitle || '',
          subtitleSource: metadata.subtitleSource ?? null,
          description: metadata.description || '',
          url: metadata.url || '',
          icon: metadata.icon || '',
          rating: metadata.rating || 0,
          reviews: metadata.reviews || 0,
          developer: metadata.developer || '',
          applicationCategory: metadata.applicationCategory || 'Unknown',
          locale: metadata.locale,
          screenshots: metadata.screenshots || []
        },
        competitors: [], // Phase A adapters don't fetch competitors (handled separately)
        searchContext: {
          query: input,
          type: 'keyword' as const,
          totalResults: 1,
          category: metadata.applicationCategory || 'Unknown',
          country: config.country || 'us',
          source: 'primary',
          responseTime: 0, // Will be set by caller
          backgroundRetries: 0 // Will be set by caller
        },
        intelligence: {
          opportunities: [
            'Metadata fetched using Phase A adapters with enhanced reliability',
            metadata.screenshots?.length ? `Found ${metadata.screenshots.length} screenshots` : 'No screenshots available',
            metadata.subtitle ? 'Subtitle extracted and normalized' : 'No subtitle available'
          ]
        }
      };

      // [DIAGNOSTIC] Frontend fetch layer - after transformation
      if (import.meta.env.DEV) {
        console.log('[DIAGNOSTIC-FRONTEND-FETCH] After transformation to SearchResult:', {
          'searchResult.targetApp.subtitle': searchResult.targetApp.subtitle,
          'searchResult.targetApp.subtitleSource': searchResult.targetApp.subtitleSource,
          'searchResult.targetApp.name': searchResult.targetApp.name
        });
      }

      return searchResult;

    } catch (error: any) {
      console.error('❌ [PHASE-A-ADAPTER] Adapter fetch failed:', error);

      // Phase A.3: No fallback - adapters are proven stable
      // Throw error with helpful message for debugging
      throw new Error(`Failed to fetch app metadata: ${error.message || 'Unknown error'}. Please verify the app name or ID and try again.`);
    }
  }

  /**
   * Wrap cached result for consistent interface
   */
  private wrapCachedResult(
    app: ScrapedMetadata,
    input: string,
    source: 'cache' | 'similar' = 'cache',
    country = 'us'
  ): SearchResult {
    return {
      targetApp: app,
      competitors: [],
      searchContext: {
        query: input,
        type: 'keyword',
        totalResults: 1,
        category: app.applicationCategory || 'Unknown',
        country,
        source,
        responseTime: 0,
        backgroundRetries: 0
      },
      intelligence: {
        opportunities: [
          source === 'similar' ? 
            `Similar cached result for "${input}"` : 
            `Cached result for "${input}"`
        ]
      }
    };
  }

  /**
   * Transform edge function result
   */
  private transformEdgeFunctionResult(data: any, input: string, country: string): SearchResult {
    const responseData = data.data;
    const targetApp = {
      name: responseData.name || responseData.title,
      appId: responseData.appId,
      title: responseData.title,
      subtitle: responseData.subtitle || '',
      description: responseData.description || '',
      url: responseData.url || '',
      icon: responseData.icon || '',
      rating: responseData.rating || 0,
      reviews: responseData.reviews || 0,
      developer: responseData.developer || '',
      applicationCategory: responseData.applicationCategory || 'Unknown',
      locale: responseData.locale || 'en-US',
      // FIX: Add screenshots field (was missing - caused screenshot loss)
      screenshots: responseData.screenshots || responseData.screenshotUrls || []
    } as ScrapedMetadata;

    return {
      targetApp,
      competitors: responseData.competitors || [],
      searchContext: {
        query: input,
        type: 'keyword' as const,
        totalResults: (responseData.competitors?.length || 0) + 1,
        category: responseData.applicationCategory || 'Unknown',
        country,
        source: 'primary',
        responseTime: 0,
        backgroundRetries: 0
      },
      intelligence: { 
        opportunities: data.searchContext?.includeCompetitors ? 
          [`Found ${responseData.competitors?.length || 0} competitors for analysis`] : 
          ['App successfully imported for analysis']
      }
    };
  }

  /**
   * Wrap direct iTunes result
   *
   * FIX #3 (Phase A.4): Normalize metadata before returning to ensure:
   * - Subtitle duplication is fixed (trackCensoredName contains full title)
   * - Screenshots are preserved
   * - All metadata conforms to Phase A schema
   */
  private wrapDirectResult(
    app: ScrapedMetadata,
    input: string,
    pattern: string,
    country: string
  ): SearchResult {
    correlationTracker.log('info', 'Wrapping direct iTunes result', {
      appName: app.name,
      pattern
    });

    // FIX: Normalize metadata through Phase A normalizer
    // This fixes subtitle duplication and ensures consistent schema
    const normalized = metadataNormalizer.normalize(app, 'direct-itunes-fallback');

    correlationTracker.log('info', 'Normalized fallback metadata', {
      originalSubtitle: app.subtitle,
      normalizedSubtitle: normalized.subtitle,
      screenshotsCount: normalized.screenshots?.length || 0
    });

    return {
      targetApp: normalized,  // ← Changed from raw 'app' to 'normalized'
      competitors: [],
      searchContext: {
        query: input,
        type: pattern.includes('brand') ? 'brand' : 'keyword',
        totalResults: 1,
        category: normalized.applicationCategory || 'Unknown',
        country,
        source: 'fallback',
        responseTime: 0,
        backgroundRetries: 0
      },
      intelligence: {
        opportunities: [
          pattern.includes('fallback') ?
            `Fallback match found for "${input}"` :
            `Direct match found for "${input}"`
        ]
      }
    };
  }

  /**
   * Lightweight search helper for the app selection modal
   *
   * ⚡ LIGHTWEIGHT SEARCH - Returns minimal metadata for fast search results
   *
   * Returns ONLY:
   * - appId
   * - name
   * - developer
   * - icon
   * - applicationCategory
   *
   * ❌ Does NOT return: subtitle, screenshots, description, reviews, rating
   *
   * MIGRATED: Now uses MetadataOrchestrator instead of DirectItunesService
   */
  async searchApps(query: string, country: string = 'US'): Promise<ScrapedMetadata[]> {
    console.log(`[ASO-SEARCH] 🔍 LIGHTWEIGHT SEARCH → "${query}" (country: ${country})`);

    const normalizedResults = await metadataOrchestrator.searchApps(query, {
      country,
      limit: 10,
    });

    console.log(`[ASO-SEARCH] ✅ SEARCH → Returning ${normalizedResults.length} lightweight candidates`);

    // Cast to ScrapedMetadata[] - they're compatible (NormalizedMetadata extends ScrapedMetadata)
    return normalizedResults.slice(0, 10) as ScrapedMetadata[];
  }

  searchByKeyword(keyword: string, country?: string) {
    return this.searchApps(keyword, country);
  }

  /**
   * Get circuit breaker state for debugging
   */
  getCircuitBreakerState() {
    return this.edgeFunctionCircuitBreaker.getState();
  }

  /**
   * Reset circuit breaker (for manual recovery)
   */
  resetCircuitBreaker() {
    this.edgeFunctionCircuitBreaker.reset();
    console.log('🔄 [MANUAL-RESET] Circuit breaker manually reset');
  }

  /**
   * Get transmission statistics
   */
  getTransmissionStats() {
    return requestTransmissionService.getTransmissionStats();
  }

  /**
   * Get comprehensive system health
   */
  getSystemHealth() {
    return {
      circuitBreakers: multiLevelCircuitBreakerService.getSummary(),
      failureAnalytics: failureAnalyticsService.getSystemHealth(),
      recoveryStats: failureAnalyticsService.getRecoveryStats(),
      cacheStats: cacheFallbackService.getStats(),
      retryStats: retryStrategyService.getRetryStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get failure predictions
   */
  getFailurePredictions() {
    return failureAnalyticsService.predictFailures();
  }

  /**
   * Manual recovery operations
   */
  triggerRecovery() {
    // Reset circuit breakers
    const components = ['enhanced-edge-function', 'edge-function', 'direct-itunes-api', 'bypass-search', 'transmission-json', 'transmission-url-params'];
    components.forEach(component => {
      multiLevelCircuitBreakerService.reset(component);
    });

    // Clean up cache
    cacheFallbackService.cleanup();

    console.log('🔄 [BULLETPROOF-RECOVERY] Manual recovery triggered');
    
    return {
      message: 'Recovery operations completed',
      timestamp: new Date().toISOString(),
      resetComponents: components.length
    };
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('no apps found')) {
      return error.message;
    }
    if (message.includes('rate limit')) {
      return 'You have made too many requests. Please wait a few minutes before trying again.';
    }
    if (message.includes('invalid') || message.includes('validation')) {
      return 'Please enter a valid app name, keywords, or App Store URL.';
    }
    if (message.includes('network') || message.includes('unavailable') || message.includes('temporarily')) {
      return 'Search service is temporarily unavailable. Please try again in a few minutes.';
    }
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'Authentication required. Please log in and try again.';
    }
    if (message.includes('edge function') || message.includes('service error')) {
      return 'Search service encountered an error. Please try again with different keywords.';
    }
    
    return 'Search failed. Please try again with different keywords or check your internet connection.';
  }
}

export const asoSearchService = new AsoSearchService();
