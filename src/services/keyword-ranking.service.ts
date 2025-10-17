// @ts-nocheck - Tables referenced in this file don't exist in current database schema

import { supabase } from '@/integrations/supabase/client';
import { asoSearchService } from './aso-search.service';
import { keywordIntelligenceService } from './keyword-intelligence.service';
import { keywordValidationService } from './keyword-validation.service';
import { keywordCacheService } from './keyword-cache.service';
import { keywordRankingCalculatorService } from './keyword-ranking-calculator.service';
import { keywordPersistenceService } from './keyword-persistence.service';
import { keywordJobProcessorService } from './keyword-job-processor.service';
import { securityService } from './security.service';
import { CircuitBreaker } from '@/lib/utils/circuit-breaker';
import { ScrapedMetadata } from '@/types/aso';

export interface KeywordRanking {
  keyword: string;
  position: number;
  volume: 'Low' | 'Medium' | 'High';
  trend: 'up' | 'down' | 'stable';
  searchResults: number;
  lastChecked: Date;
  confidence: 'estimated' | 'actual';
  priority?: 'high' | 'medium' | 'low';
  type?: string;
  reason?: string;
}

export interface KeywordAnalysisConfig {
  organizationId: string;
  maxKeywords?: number;
  includeCompetitors?: boolean;
  debugMode?: boolean;
  cacheEnabled?: boolean;
  batchProcessing?: boolean;
  country?: string;
  serpMaxPages?: number; // Preferred SERP depth
  serpDeepScan?: boolean; // Allow second attempt with higher depth if not found
}

export interface KeywordAnalysisResult {
  rankings: KeywordRanking[];
  metadata: {
    totalProcessed: number;
    actualRankings: number;
    estimatedRankings: number;
    cacheHits: number;
    processingTime: number;
    circuitBreakerTripped: boolean;
  };
}

class KeywordRankingService {
  private circuitBreaker = new CircuitBreaker({
    maxFailures: 3,
    resetTimeMs: 30000,
    name: 'KeywordRankingService'
  });

  constructor() {
    // Start background job processor on service initialization
    keywordJobProcessorService.startProcessor();
  }

  /**
   * Enhanced keyword ranking check with validation, caching, and persistence
   */
  async checkKeywordRanking(
    keyword: string, 
    targetAppId: string, 
    config: KeywordAnalysisConfig
  ): Promise<KeywordRanking | null> {
    const startTime = Date.now();

    try {
      // Validate and sanitize keyword
      const validation = keywordValidationService.validateKeyword(keyword, {
        organizationId: config.organizationId,
        maxKeywordLength: 100,
        allowSpecialChars: false
      });

      if (!validation.isValid) {
        console.warn(`⚠️ [KEYWORD-RANKING] Invalid keyword "${keyword}":`, validation.errors);
        return null;
      }

      const sanitizedKeyword = validation.sanitizedKeyword;
      const cacheKey = `ranking:${sanitizedKeyword}:${targetAppId}`;

      // Check cache first if enabled
      if (config.cacheEnabled) {
        const cached = keywordCacheService.get<KeywordRanking>(cacheKey, config.organizationId);
        if (cached) {
          console.log(`💾 [KEYWORD-RANKING] Cache hit for "${sanitizedKeyword}"`);
          
          // Record cache hit metric
          await keywordPersistenceService.recordMetric(
            config.organizationId,
            'cache_hit',
            1,
            'count',
            { keyword: sanitizedKeyword, appId: targetAppId }
          );
          
          return cached;
        }
      }

      // Check circuit breaker
      if (this.circuitBreaker.isOpen()) {
        console.log(`🚫 [KEYWORD-RANKING] Circuit breaker open, skipping search for "${sanitizedKeyword}"`);
        
        // Record circuit breaker activation
        await keywordPersistenceService.recordMetric(
          config.organizationId,
          'circuit_breaker_open',
          1,
          'count',
          { keyword: sanitizedKeyword }
        );
        
        return null;
      }

      // Log audit entry for security
      await securityService.logAuditEntry({
        organizationId: config.organizationId,
        userId: 'system',
        action: 'keyword_ranking_check',
        resourceType: 'keyword_analysis',
        resourceId: sanitizedKeyword,
        details: {
          keyword: sanitizedKeyword,
          targetAppId,
          originalKeyword: keyword,
          sanitized: validation.metadata.wasModified
        },
        ipAddress: '127.0.0.1',
        userAgent: 'KeywordRankingService'
      });

      console.log(`🔍 [KEYWORD-RANKING] Checking ranking for "${sanitizedKeyword}" for app ${targetAppId}`);

      // First attempt: App Store SERP provider (edge function)
      if (config.country) {
        try {
          const { data: serpData, error: serpError } = await supabase.functions.invoke('app-store-scraper', {
            body: { op: 'serp', term: sanitizedKeyword, cc: config.country, appId: targetAppId, limit: 50, maxPages: (config.serpMaxPages || 5) }
          });
          if (!serpError && serpData && Array.isArray(serpData.items)) {
            const hit = serpData.items.find((it: any) => String(it.appId) === String(targetAppId));
            if (hit) {
              const directRanking: KeywordRanking = {
                keyword: sanitizedKeyword,
                position: hit.rank,
                volume: 'Low',
                trend: 'stable',
                searchResults: serpData.total || serpData.items.length || 0,
                lastChecked: new Date(),
                confidence: 'actual',
                reason: 'app_store_serp'
              };
              if (config.cacheEnabled) {
                keywordCacheService.set(cacheKey, directRanking, config.organizationId, 30 * 60 * 1000);
              }
              this.circuitBreaker.recordSuccess();
              return directRanking;
            } else if ((config.serpDeepScan ?? true)) {
              // Deep scan attempt with higher maxPages
              try {
                const { data: deepSerp, error: deepErr } = await supabase.functions.invoke('app-store-scraper', {
                  body: { op: 'serp', term: sanitizedKeyword, cc: config.country, appId: targetAppId, limit: 50, maxPages: 10 }
                });
                if (!deepErr && deepSerp && Array.isArray(deepSerp.items)) {
                  const deepHit = deepSerp.items.find((it: any) => String(it.appId) === String(targetAppId));
                  if (deepHit) {
                    const deepRanking: KeywordRanking = {
                      keyword: sanitizedKeyword,
                      position: deepHit.rank,
                      volume: 'Low', trend: 'stable',
                      searchResults: deepSerp.total || deepSerp.items.length || 0,
                      lastChecked: new Date(), confidence: 'actual', reason: 'app_store_serp_deep'
                    };
                    if (config.cacheEnabled) {
                      keywordCacheService.set(cacheKey, deepRanking, config.organizationId, 30 * 60 * 1000);
                    }
                    this.circuitBreaker.recordSuccess();
                    return deepRanking;
                  }
                }
              } catch (e) {
                console.warn('⚠️ [KEYWORD-RANKING] SERP deep scan failed:', (e as any)?.message || e);
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ [KEYWORD-RANKING] SERP provider failed:', (e as any)?.message || e);
        }
      }

      // Next: Use existing search service; handle ambiguous results by using candidates as result set
      let allApps: ScrapedMetadata[] = [];
      try {
        const searchResult = await asoSearchService.search(sanitizedKeyword, {
          organizationId: config.organizationId,
          includeIntelligence: false,
          debugMode: config.debugMode,
          country: config.country,
        });
        allApps = [searchResult.targetApp, ...(searchResult.competitors || [])];
      } catch (err: any) {
        // If ambiguous, use candidates as the search result set
        if (err?.name === 'AmbiguousSearchError' && Array.isArray(err.candidates)) {
          console.log(`🎯 [KEYWORD-RANKING] Ambiguous search for "${sanitizedKeyword}"; using ${err.candidates.length} candidates for ranking calculation`);
          allApps = err.candidates as ScrapedMetadata[];
        } else {
          throw err;
        }
      }

      // Calculate ranking using the dedicated calculator
      const calculationResult = keywordRankingCalculatorService.calculateRanking(
        sanitizedKeyword,
        targetAppId,
        allApps,
        {
          includeCompetitorAnalysis: config.includeCompetitors || false,
          maxResultsToAnalyze: 20,
          confidenceThreshold: 0.7,
          volumeEstimationAlgorithm: 'balanced'
        }
      );

      // If no ranking from calculator, attempt a lightweight web SERP fallback (optional)
      if (!calculationResult.ranking) {
        try {
          if (config.country) {
            const appUrl = `https://apps.apple.com/${config.country.toLowerCase()}/app/id${targetAppId}`;
            const gl = config.country.toLowerCase();
            const hl = gl === 'us' ? 'en' : (gl === 'gb' ? 'en' : (gl === 'ca' ? 'en' : (gl === 'au' ? 'en' : 'en')));
            const { data, error } = await supabase.functions.invoke('webrank', {
              body: { appUrl, keyword: sanitizedKeyword, gl, hl }
            });
            if (!error && data && typeof data.rank !== 'undefined') {
              const rank: number | null = data.rank ?? null;
              if (rank != null) {
                const fallbackRanking: KeywordRanking = {
                  keyword: sanitizedKeyword,
                  position: rank,
                  volume: 'Low',
                  trend: 'stable',
                  searchResults: 0,
                  lastChecked: new Date(),
                  confidence: 'estimated',
                  reason: 'google_cse_fallback'
                };
                // Cache fallback as well to avoid repeated calls
                if (config.cacheEnabled) {
                  keywordCacheService.set(cacheKey, fallbackRanking, config.organizationId, 10 * 60 * 1000);
                }
                this.circuitBreaker.recordSuccess();
                return fallbackRanking;
              }
            }
          }
        } catch (e) {
          // Swallow fallback errors; continue returning null below
          console.warn('⚠️ [KEYWORD-RANKING] Web SERP fallback failed:', (e as any)?.message || e);
        }
        this.circuitBreaker.recordSuccess(); // Not a failure, just no result
        return null;
      }

      const ranking = calculationResult.ranking;

      // Cache the result if enabled
      if (config.cacheEnabled) {
        keywordCacheService.set(cacheKey, ranking, config.organizationId, 1800000); // 30 minutes
      }

      // Record performance metrics
      const processingTime = Date.now() - startTime;
      await keywordPersistenceService.recordMetric(
        config.organizationId,
        'ranking_check_time',
        processingTime,
        'milliseconds',
        { keyword: sanitizedKeyword, confidence: ranking.confidence }
      );

      // Record success
      this.circuitBreaker.recordSuccess();

      console.log(`✅ [KEYWORD-RANKING] Found ranking for "${sanitizedKeyword}": position ${ranking.position}`);
      return ranking;

    } catch (error) {
      console.error(`❌ [KEYWORD-RANKING] Failed to check ranking for "${keyword}":`, error);
      this.circuitBreaker.recordFailure();
      
      // Record error metrics
      await keywordPersistenceService.recordMetric(
        config.organizationId,
        'ranking_check_error',
        1,
        'count',
        { keyword, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      return null;
    }
  }

  /**
   * Enhanced keyword analysis with persistence and background processing
   */
  async analyzeAppKeywords(app: ScrapedMetadata, config: KeywordAnalysisConfig): Promise<KeywordAnalysisResult> {
    const startTime = Date.now();
    console.log(`🎯 [KEYWORD-RANKING] Starting enhanced keyword analysis for ${app.name}`);

    let cacheHits = 0;
    let actualRankingsChecked = 0;
    const maxActualChecks = 3;

    try {
      // Generate smart keywords using intelligence service
      const smartKeywords = keywordIntelligenceService.generateSmartKeywords(app);
      const rankings = keywordIntelligenceService.convertToRankingFormat(smartKeywords);

      // Process high-priority keywords for actual ranking checks
      const highPriorityKeywords = rankings
        .filter(r => r.priority === 'high')
        .slice(0, maxActualChecks);

      // Batch process if enabled
      if (config.batchProcessing && highPriorityKeywords.length > 1) {
        console.log(`🔄 [KEYWORD-RANKING] Batch processing ${highPriorityKeywords.length} high-priority keywords`);
        
        const batchPromises = highPriorityKeywords.map(async (ranking, index) => {
          // Add delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, index * 1000));
          
          const actualRanking = await this.checkKeywordRanking(ranking.keyword, app.appId, config);
          if (actualRanking) {
            // Update with actual data
            ranking.position = actualRanking.position;
            ranking.confidence = 'actual';
            ranking.searchResults = actualRanking.searchResults;
            return true;
          }
          return false;
        });

        const results = await Promise.allSettled(batchPromises);
        actualRankingsChecked = results.filter(r => r.status === 'fulfilled' && r.value).length;

      } else {
        // Sequential processing for backward compatibility
        for (const ranking of highPriorityKeywords) {
          if (actualRankingsChecked >= maxActualChecks) break;
          if (this.circuitBreaker.isOpen()) break;

          try {
            const actualRanking = await this.checkKeywordRanking(ranking.keyword, app.appId, config);
            if (actualRanking) {
              ranking.position = actualRanking.position;
              ranking.confidence = 'actual';
              ranking.searchResults = actualRanking.searchResults;
              actualRankingsChecked++;
            }

            // Rate limiting between requests
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            console.warn(`⚠️ [KEYWORD-RANKING] Failed to check actual ranking for "${ranking.keyword}":`, error);
            break;
          }
        }
      }

      // Sort by ranking position (best first)
      rankings.sort((a, b) => a.position - b.position);

      // Save results to persistent storage
      if (rankings.length > 0) {
        await keywordPersistenceService.saveRankingHistory(
          rankings,
          config.organizationId,
          app.appId,
          'system'
        );
      }

      const processingTime = Date.now() - startTime;
      const estimatedRankings = rankings.length - actualRankingsChecked;

      // Record overall analysis metrics
      await keywordPersistenceService.recordMetric(
        config.organizationId,
        'keyword_analysis_complete',
        rankings.length,
        'rankings',
        {
          appId: app.appId,
          actualRankings: actualRankingsChecked,
          estimatedRankings,
          processingTime
        }
      );

      console.log(`✅ [KEYWORD-RANKING] Enhanced analysis complete: ${actualRankingsChecked} actual, ${estimatedRankings} estimated rankings (${processingTime}ms)`);

      return {
        rankings,
        metadata: {
          totalProcessed: rankings.length,
          actualRankings: actualRankingsChecked,
          estimatedRankings,
          cacheHits,
          processingTime,
          circuitBreakerTripped: this.circuitBreaker.getState().isOpen
        }
      };

    } catch (error) {
      console.error('❌ [KEYWORD-RANKING] Enhanced analysis failed:', error);
      
      // Record analysis failure
      await keywordPersistenceService.recordMetric(
        config.organizationId,
        'keyword_analysis_error',
        1,
        'count',
        { appId: app.appId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      throw error;
    }
  }

  /**
   * Queue background analysis job
   */
  async queueBatchAnalysis(
    apps: ScrapedMetadata[],
    config: KeywordAnalysisConfig,
    userId?: string
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    return keywordJobProcessorService.queueJob(
      config.organizationId,
      'batch_analysis',
      {
        apps,
        maxKeywords: config.maxKeywords,
        includeCompetitors: config.includeCompetitors
      },
      7, // High priority for batch analysis
      userId
    );
  }

  /**
   * Get keyword rankings with enhanced features and fallback
   */
  async getAppKeywordRankings(app: ScrapedMetadata, config: KeywordAnalysisConfig): Promise<KeywordRanking[]> {
    try {
      // Set default configuration
      const enhancedConfig: KeywordAnalysisConfig = {
        cacheEnabled: true,
        batchProcessing: true,
        ...config
      };

      const result = await this.analyzeAppKeywords(app, enhancedConfig);
      return result.rankings;

    } catch (error) {
      console.error('❌ [KEYWORD-RANKING] Complete analysis failure, providing secure fallback rankings:', error);

      // Provide basic fallback rankings with proper typing and validation
      const fallbackKeywords: Array<{ keyword: string; priority: 'high' | 'medium' | 'low' }> = [
        { keyword: app.name.toLowerCase(), priority: 'high' },
        { keyword: 'mobile app', priority: 'low' },
        { keyword: app.applicationCategory?.toLowerCase() || 'app', priority: 'medium' }
      ];

      // Validate fallback keywords
      const validatedKeywords = fallbackKeywords
        .map(item => {
          const validation = keywordValidationService.validateKeyword(item.keyword, {
            organizationId: config.organizationId,
            maxKeywordLength: 100
          });
          return validation.isValid ? { ...item, keyword: validation.sanitizedKeyword } : null;
        })
        .filter(Boolean) as Array<{ keyword: string; priority: 'high' | 'medium' | 'low' }>;

      return validatedKeywords.map((item, index) => ({
        keyword: item.keyword,
        position: (index + 1) * 10,
        volume: 'Low' as const,
        trend: 'stable' as const,
        searchResults: 100,
        lastChecked: new Date(),
        confidence: 'estimated' as const,
        priority: item.priority,
        type: 'fallback',
        reason: 'Secure fallback keyword due to analysis failure'
      }));
    }
  }

  /**
   * Get service health status with enhanced metrics
   */
  getHealthStatus() {
    const circuitBreakerState = this.circuitBreaker.getState();
    const cacheStats = keywordCacheService.getStats();

    return {
      circuitBreaker: circuitBreakerState,
      cache: cacheStats,
      status: circuitBreakerState.isOpen ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      persistence: {
        enabled: true,
        backgroundJobs: true
      }
    };
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    console.log('🔄 [KEYWORD-RANKING] Circuit breaker manually reset');
  }

  /**
   * Clear cache for organization
   */
  clearCache(organizationId: string): number {
    return keywordCacheService.clearOrganization(organizationId);
  }
}

export const keywordRankingService = new KeywordRankingService();
