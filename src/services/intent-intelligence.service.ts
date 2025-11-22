/**
 * Intent Intelligence Service - Phase 2
 *
 * Service layer for Autocomplete Intelligence that:
 * - Fetches intent classifications from search_intent_registry
 * - Calls autocomplete-intelligence Edge Function
 * - Provides intent clustering and analysis
 * - Maps intent signals to audit scoring
 * - Respects AUTOCOMPLETE_INTELLIGENCE_ENABLED feature flag
 *
 * INVARIANTS:
 * - Never calls external APIs directly (only via Edge Function)
 * - Registry-first architecture (check DB before Edge Function)
 * - Multi-tenant safe (organization_id not used per Phase 1 design)
 * - No modification of metadata pipeline or scoring engine
 *
 * @see docs/AUTOCOMPLETE_INTELLIGENCE_PHASE1_COMPLETE.md
 * @see supabase/functions/autocomplete-intelligence/index.ts
 */

import { supabase } from '@/integrations/supabase/client';
import { AUTOCOMPLETE_INTELLIGENCE_ENABLED, AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';
import { BrandIntelligenceService, type BrandInfo, type EnrichedIntentCluster } from './brand-intelligence.service';
import type { ScrapedMetadata } from '@/types/aso';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Intent type classification
 * Matches database CHECK constraint from Phase 1
 */
export type IntentType = 'navigational' | 'informational' | 'commercial' | 'transactional';

/**
 * Platform type
 * Matches database CHECK constraint from Phase 1
 */
export type Platform = 'ios' | 'android';

/**
 * Autocomplete suggestion
 * Returned by Edge Function
 */
export interface AutocompleteSuggestion {
  text: string;
  rank: number;
}

/**
 * Intent classification result
 * Matches Edge Function response format
 */
export interface IntentClassification {
  intent_type: IntentType;
  confidence: number; // 0-100
  reasoning: string;
}

/**
 * Registry entry from search_intent_registry table
 */
export interface IntentRegistryEntry {
  id: string;
  keyword: string;
  platform: Platform;
  region: string;
  intent_type: IntentType;
  intent_confidence: number;
  autocomplete_suggestions: {
    suggestions: AutocompleteSuggestion[];
  };
  autocomplete_rank: number | null;
  last_refreshed_at: string;
  data_source: string;
  created_at: string;
  updated_at: string;
}

/**
 * Cached autocomplete result from autocomplete_intelligence_cache table
 */
export interface CachedAutocompleteResult {
  id: string;
  query: string;
  platform: Platform;
  region: string;
  raw_response: {
    suggestions: AutocompleteSuggestion[];
  };
  suggestions_count: number;
  cached_at: string;
  expires_at: string;
  api_status: 'success' | 'partial' | 'error';
}

/**
 * Intent cluster - groups keywords by intent type
 */
export interface IntentCluster {
  intent_type: IntentType;
  keywords: string[];
  count: number;
  avgConfidence: number;
  topSuggestions: AutocompleteSuggestion[];
}

/**
 * Intent coverage analysis for metadata elements
 */
export interface IntentCoverageAnalysis {
  title: IntentSignals;
  subtitle: IntentSignals;
  overall: IntentSignals;
}

/**
 * Intent signals for a metadata element
 */
export interface IntentSignals {
  navigationalKeywords: string[];
  informationalKeywords: string[];
  commercialKeywords: string[];
  transactionalKeywords: string[];
  intentDistribution: {
    navigational: number;
    informational: number;
    commercial: number;
    transactional: number;
  };
  dominantIntent: IntentType | null;
  coverageScore: number; // 0-100
}

/**
 * Audit signals mapped from intent analysis
 * Used by Metadata Audit V2 engine
 */
export interface IntentAuditSignals {
  hasNavigationalIntent: boolean;
  hasInformationalIntent: boolean;
  hasCommercialIntent: boolean;
  hasTransactionalIntent: boolean;
  intentDiversity: number; // 0-100 (higher = more intent types covered)
  brandKeywordCount: number; // navigational keywords
  discoveryKeywordCount: number; // informational + commercial keywords
  conversionKeywordCount: number; // transactional keywords
  recommendations: string[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class IntentIntelligenceService {
  /**
   * Fetch intent registry entries for multiple keywords
   *
   * @param keywords - Array of keywords to fetch
   * @param platform - Platform (ios/android)
   * @param region - Region code (e.g., 'us')
   * @returns Array of intent registry entries
   */
  static async fetchIntentRegistry(
    keywords: string[],
    platform: Platform = 'ios',
    region: string = 'us'
  ): Promise<IntentRegistryEntry[]> {
    // Feature flag check
    if (!AUTOCOMPLETE_INTELLIGENCE_ENABLED) {
      console.log('⚠️ Intent Intelligence disabled by feature flag');
      return [];
    }

    try {
      console.log(`🔍 Fetching intent registry for ${keywords.length} keywords`);

      const { data, error } = await supabase
        .from('search_intent_registry')
        .select('*')
        .in('keyword', keywords)
        .eq('platform', platform)
        .eq('region', region);

      if (error) {
        console.error('❌ Error fetching intent registry:', error);
        return [];
      }

      console.log(`✅ Found ${data?.length || 0} registry entries`);
      return data || [];
    } catch (error) {
      console.error('IntentIntelligenceService.fetchIntentRegistry error:', error);
      return [];
    }
  }

  /**
   * Get cached autocomplete results for multiple queries
   *
   * @param queries - Array of queries to fetch
   * @param platform - Platform (ios/android)
   * @param region - Region code (e.g., 'us')
   * @returns Array of cached autocomplete results
   */
  static async getCachedIntents(
    queries: string[],
    platform: Platform = 'ios',
    region: string = 'us'
  ): Promise<CachedAutocompleteResult[]> {
    // Feature flag check
    if (!AUTOCOMPLETE_INTELLIGENCE_ENABLED) {
      console.log('⚠️ Intent Intelligence disabled by feature flag');
      return [];
    }

    try {
      console.log(`🔍 Fetching cached autocomplete for ${queries.length} queries`);

      const { data, error } = await supabase
        .from('autocomplete_intelligence_cache')
        .select('*')
        .in('query', queries)
        .eq('platform', platform)
        .eq('region', region)
        .gt('expires_at', new Date().toISOString()) // Only non-expired
        .eq('api_status', 'success'); // Only successful results

      if (error) {
        console.error('❌ Error fetching cached autocomplete:', error);
        return [];
      }

      console.log(`✅ Found ${data?.length || 0} cached entries`);
      return data || [];
    } catch (error) {
      console.error('IntentIntelligenceService.getCachedIntents error:', error);
      return [];
    }
  }

  /**
   * Enrich keywords with intent classifications
   * Checks registry first, calls Edge Function for missing keywords
   *
   * @param keywords - Array of keywords to enrich
   * @param platform - Platform (ios/android)
   * @param region - Region code (e.g., 'us')
   * @returns Map of keyword -> intent classification
   */
  static async enrichKeywordsWithIntent(
    keywords: string[],
    platform: Platform = 'ios',
    region: string = 'us'
  ): Promise<Map<string, IntentClassification>> {
    // Feature flag check
    if (!AUTOCOMPLETE_INTELLIGENCE_ENABLED) {
      return new Map();
    }

    try {
      const resultMap = new Map<string, IntentClassification>();

      // Step 1: Check registry for existing entries
      const registryEntries = await this.fetchIntentRegistry(keywords, platform, region);

      // Add registry entries to result map
      for (const entry of registryEntries) {
        resultMap.set(entry.keyword, {
          intent_type: entry.intent_type,
          confidence: entry.intent_confidence,
          reasoning: `Cached from ${entry.data_source}`,
        });
      }

      // Step 2: Find keywords missing from registry
      const missingKeywords = keywords.filter((kw) => !resultMap.has(kw));

      if (missingKeywords.length === 0) {
        console.log('✅ All keywords found in registry');
        return resultMap;
      }

      console.log(`📡 Fetching intent for ${missingKeywords.length} missing keywords via Edge Function`);

      // Step 3: Call Edge Function for missing keywords (batched)
      const edgeFunctionResults = await Promise.allSettled(
        missingKeywords.map((keyword) => this.callAutocompleteEdgeFunction(keyword, platform, region))
      );

      // Step 4: Add Edge Function results to map
      edgeFunctionResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const keyword = missingKeywords[index];
          resultMap.set(keyword, result.value);
        }
      });

      console.log(`✅ Enriched ${resultMap.size}/${keywords.length} keywords with intent`);
      return resultMap;
    } catch (error) {
      console.error('IntentIntelligenceService.enrichKeywordsWithIntent error:', error);
      return new Map();
    }
  }

  /**
   * Call autocomplete-intelligence Edge Function for a single keyword
   * Private helper method
   *
   * @param keyword - Keyword to analyze
   * @param platform - Platform (ios/android)
   * @param region - Region code (e.g., 'us')
   * @returns Intent classification or null
   */
  private static async callAutocompleteEdgeFunction(
    keyword: string,
    platform: Platform,
    region: string
  ): Promise<IntentClassification | null> {
    try {
      const { data, error } = await supabase.functions.invoke('autocomplete-intelligence', {
        body: {
          keyword,
          platform,
          region,
        },
      });

      if (error) {
        console.error(`❌ Edge Function error for "${keyword}":`, error);
        return null;
      }

      if (data?.ok && data?.intent) {
        return data.intent as IntentClassification;
      }

      return null;
    } catch (error) {
      console.error(`IntentIntelligenceService.callAutocompleteEdgeFunction error for "${keyword}":`, error);
      return null;
    }
  }

  /**
   * Get intent clusters from keywords
   * Groups keywords by intent type and calculates statistics
   *
   * @param keywords - Array of keywords
   * @param platform - Platform (ios/android)
   * @param region - Region code (e.g., 'us')
   * @returns Array of intent clusters
   */
  static async getIntentClusters(
    keywords: string[],
    platform: Platform = 'ios',
    region: string = 'us',
    metadata?: ScrapedMetadata  // Optional metadata for brand intelligence (Phase 5)
  ): Promise<IntentCluster[] | EnrichedIntentCluster[]> {
    // Feature flag check
    if (!AUTOCOMPLETE_INTELLIGENCE_ENABLED) {
      return [];
    }

    try {
      // Enrich keywords with intent
      const intentMap = await this.enrichKeywordsWithIntent(keywords, platform, region);

      // Group by intent type
      const clusters: Map<IntentType, IntentCluster> = new Map();

      intentMap.forEach((intent, keyword) => {
        const { intent_type, confidence } = intent;

        if (!clusters.has(intent_type)) {
          clusters.set(intent_type, {
            intent_type,
            keywords: [],
            count: 0,
            avgConfidence: 0,
            topSuggestions: [],
          });
        }

        const cluster = clusters.get(intent_type)!;
        cluster.keywords.push(keyword);
        cluster.count++;
        cluster.avgConfidence += confidence;
      });

      // Calculate average confidence for each cluster
      const result: IntentCluster[] = [];
      clusters.forEach((cluster) => {
        cluster.avgConfidence = Math.round(cluster.avgConfidence / cluster.count);
        result.push(cluster);
      });

      // Sort by count (descending)
      result.sort((a, b) => b.count - a.count);

      console.log(`✅ Generated ${result.length} intent clusters`);

      // PHASE 5: Brand Intelligence Enrichment
      // Add brand classification to clusters if metadata is provided
      // CONTROLLED BY: AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED feature flag
      if (AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED && metadata) {
        try {
          const brandInfo = BrandIntelligenceService.extractCanonicalBrand(metadata);
          const enrichedClusters = BrandIntelligenceService.classifyIntentClusters(
            result,
            brandInfo
          );
          console.log(`✅ [Brand Intelligence] Enriched ${enrichedClusters.length} intent clusters`);
          return enrichedClusters;
        } catch (error) {
          console.error('IntentIntelligenceService: Brand enrichment failed:', error);
          // Graceful fallback: return non-enriched clusters
          return result;
        }
      }

      return result;
    } catch (error) {
      console.error('IntentIntelligenceService.getIntentClusters error:', error);
      return [];
    }
  }

  /**
   * Map intent data to audit signals
   * Converts intent classifications into signals usable by Metadata Audit V2
   *
   * @param titleKeywords - Keywords found in title
   * @param subtitleKeywords - Keywords found in subtitle
   * @param platform - Platform (ios/android)
   * @param region - Region code (e.g., 'us')
   * @returns Intent audit signals
   */
  static async mapIntentToAuditSignals(
    titleKeywords: string[],
    subtitleKeywords: string[],
    platform: Platform = 'ios',
    region: string = 'us',
    metadata?: ScrapedMetadata  // Optional metadata for brand intelligence (Phase 5)
  ): Promise<IntentAuditSignals> {
    // Feature flag check or empty inputs
    if (!AUTOCOMPLETE_INTELLIGENCE_ENABLED || (titleKeywords.length === 0 && subtitleKeywords.length === 0)) {
      return this.getDefaultAuditSignals();
    }

    try {
      // Combine all keywords
      const allKeywords = [...new Set([...titleKeywords, ...subtitleKeywords])];

      // Enrich with intent
      const intentMap = await this.enrichKeywordsWithIntent(allKeywords, platform, region);

      // Count keywords by intent type
      let navigationalCount = 0;
      let informationalCount = 0;
      let commercialCount = 0;
      let transactionalCount = 0;

      intentMap.forEach((intent) => {
        switch (intent.intent_type) {
          case 'navigational':
            navigationalCount++;
            break;
          case 'informational':
            informationalCount++;
            break;
          case 'commercial':
            commercialCount++;
            break;
          case 'transactional':
            transactionalCount++;
            break;
        }
      });

      // Calculate intent diversity (0-100)
      // Higher score when multiple intent types are present
      const intentTypes = [
        navigationalCount > 0,
        informationalCount > 0,
        commercialCount > 0,
        transactionalCount > 0,
      ];
      const intentTypesPresent = intentTypes.filter(Boolean).length;
      const intentDiversity = (intentTypesPresent / 4) * 100;

      // Brand keywords = navigational
      const brandKeywordCount = navigationalCount;

      // Discovery keywords = informational + commercial
      const discoveryKeywordCount = informationalCount + commercialCount;

      // Conversion keywords = transactional
      const conversionKeywordCount = transactionalCount;

      // Generate recommendations
      const recommendations = this.generateIntentRecommendations(
        navigationalCount,
        informationalCount,
        commercialCount,
        transactionalCount,
        allKeywords.length
      );

      // PHASE 5: Brand Intelligence Recommendations
      // Add brand-focused recommendations if metadata is provided
      // CONTROLLED BY: AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED feature flag
      let brandRecommendations: string[] = [];
      if (AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED && metadata) {
        try {
          // Extract brand info
          const brandInfo = BrandIntelligenceService.extractCanonicalBrand(metadata);

          // Get intent clusters for brand analysis
          const clusters = await this.getIntentClusters(allKeywords, platform, region);

          // Enrich clusters with brand classification
          const enrichedClusters = BrandIntelligenceService.classifyIntentClusters(
            clusters,
            brandInfo
          );

          // Generate brand-specific recommendations
          brandRecommendations = BrandIntelligenceService.getBrandRecommendations(
            brandInfo,
            enrichedClusters
          );

          console.log(`✅ [Brand Intelligence] Generated ${brandRecommendations.length} brand recommendations`);
        } catch (error) {
          console.error('IntentIntelligenceService: Brand recommendations failed:', error);
          // Graceful fallback: no brand recommendations
        }
      }

      // Merge intent and brand recommendations
      const allRecommendations = [...recommendations, ...brandRecommendations];

      return {
        hasNavigationalIntent: navigationalCount > 0,
        hasInformationalIntent: informationalCount > 0,
        hasCommercialIntent: commercialCount > 0,
        hasTransactionalIntent: transactionalCount > 0,
        intentDiversity: Math.round(intentDiversity),
        brandKeywordCount,
        discoveryKeywordCount,
        conversionKeywordCount,
        recommendations: allRecommendations,
      };
    } catch (error) {
      console.error('IntentIntelligenceService.mapIntentToAuditSignals error:', error);
      return this.getDefaultAuditSignals();
    }
  }

  /**
   * Get default audit signals (null-safe fallback)
   */
  private static getDefaultAuditSignals(): IntentAuditSignals {
    return {
      hasNavigationalIntent: false,
      hasInformationalIntent: false,
      hasCommercialIntent: false,
      hasTransactionalIntent: false,
      intentDiversity: 0,
      brandKeywordCount: 0,
      discoveryKeywordCount: 0,
      conversionKeywordCount: 0,
      recommendations: [],
    };
  }

  /**
   * Generate intent-based recommendations
   * Private helper method
   */
  private static generateIntentRecommendations(
    navigational: number,
    informational: number,
    commercial: number,
    transactional: number,
    total: number
  ): string[] {
    const recommendations: string[] = [];

    // Too brand-focused (>70% navigational)
    if (navigational / total > 0.7 && total > 3) {
      recommendations.push(
        '[INTENT][strong] Metadata is heavily brand-focused (navigational intent). Consider adding more discovery keywords (informational/commercial) to reach non-brand-aware users.'
      );
    }

    // No discovery keywords
    if (informational === 0 && commercial === 0 && total > 3) {
      recommendations.push(
        '[INTENT][critical] No discovery keywords detected. Add informational keywords (e.g., "learn spanish", "language lessons") or commercial keywords (e.g., "best language app") to increase organic reach.'
      );
    }

    // No conversion keywords
    if (transactional === 0 && total > 5) {
      recommendations.push(
        '[INTENT][moderate] No transactional keywords detected. Adding download-intent keywords (e.g., "free", "download", "get") can improve conversion rates from search.'
      );
    }

    // Good diversity
    if (informational > 0 && commercial > 0 && transactional > 0) {
      recommendations.push(
        '[INTENT][success] Good intent diversity detected. Your keywords cover discovery, comparison, and conversion stages of the user journey.'
      );
    }

    return recommendations;
  }

  /**
   * Analyze intent coverage for metadata elements
   * Maps keywords to intent signals for title and subtitle separately
   *
   * @param titleKeywords - Keywords found in title
   * @param subtitleKeywords - Keywords found in subtitle
   * @param platform - Platform (ios/android)
   * @param region - Region code (e.g., 'us')
   * @returns Intent coverage analysis
   */
  static async analyzeIntentCoverage(
    titleKeywords: string[],
    subtitleKeywords: string[],
    platform: Platform = 'ios',
    region: string = 'us'
  ): Promise<IntentCoverageAnalysis> {
    // Feature flag check
    if (!AUTOCOMPLETE_INTELLIGENCE_ENABLED) {
      return {
        title: this.getDefaultIntentSignals(),
        subtitle: this.getDefaultIntentSignals(),
        overall: this.getDefaultIntentSignals(),
      };
    }

    try {
      // Enrich both sets of keywords
      const allKeywords = [...new Set([...titleKeywords, ...subtitleKeywords])];
      const intentMap = await this.enrichKeywordsWithIntent(allKeywords, platform, region);

      // Analyze title
      const titleSignals = this.extractIntentSignals(titleKeywords, intentMap);

      // Analyze subtitle
      const subtitleSignals = this.extractIntentSignals(subtitleKeywords, intentMap);

      // Analyze overall
      const overallSignals = this.extractIntentSignals(allKeywords, intentMap);

      return {
        title: titleSignals,
        subtitle: subtitleSignals,
        overall: overallSignals,
      };
    } catch (error) {
      console.error('IntentIntelligenceService.analyzeIntentCoverage error:', error);
      return {
        title: this.getDefaultIntentSignals(),
        subtitle: this.getDefaultIntentSignals(),
        overall: this.getDefaultIntentSignals(),
      };
    }
  }

  /**
   * Extract intent signals from keywords
   * Private helper method
   */
  private static extractIntentSignals(
    keywords: string[],
    intentMap: Map<string, IntentClassification>
  ): IntentSignals {
    const navigationalKeywords: string[] = [];
    const informationalKeywords: string[] = [];
    const commercialKeywords: string[] = [];
    const transactionalKeywords: string[] = [];

    keywords.forEach((kw) => {
      const intent = intentMap.get(kw);
      if (!intent) return;

      switch (intent.intent_type) {
        case 'navigational':
          navigationalKeywords.push(kw);
          break;
        case 'informational':
          informationalKeywords.push(kw);
          break;
        case 'commercial':
          commercialKeywords.push(kw);
          break;
        case 'transactional':
          transactionalKeywords.push(kw);
          break;
      }
    });

    const total = keywords.length;
    const navCount = navigationalKeywords.length;
    const infoCount = informationalKeywords.length;
    const commCount = commercialKeywords.length;
    const transCount = transactionalKeywords.length;

    // Calculate intent distribution (percentages)
    const intentDistribution = {
      navigational: total > 0 ? Math.round((navCount / total) * 100) : 0,
      informational: total > 0 ? Math.round((infoCount / total) * 100) : 0,
      commercial: total > 0 ? Math.round((commCount / total) * 100) : 0,
      transactional: total > 0 ? Math.round((transCount / total) * 100) : 0,
    };

    // Determine dominant intent
    let dominantIntent: IntentType | null = null;
    let maxCount = 0;
    if (navCount > maxCount) {
      dominantIntent = 'navigational';
      maxCount = navCount;
    }
    if (infoCount > maxCount) {
      dominantIntent = 'informational';
      maxCount = infoCount;
    }
    if (commCount > maxCount) {
      dominantIntent = 'commercial';
      maxCount = commCount;
    }
    if (transCount > maxCount) {
      dominantIntent = 'transactional';
      maxCount = transCount;
    }

    // Calculate coverage score (0-100)
    // Higher score when multiple intent types are present
    const intentTypesPresent = [
      navCount > 0,
      infoCount > 0,
      commCount > 0,
      transCount > 0,
    ].filter(Boolean).length;
    const coverageScore = (intentTypesPresent / 4) * 100;

    return {
      navigationalKeywords,
      informationalKeywords,
      commercialKeywords,
      transactionalKeywords,
      intentDistribution,
      dominantIntent,
      coverageScore: Math.round(coverageScore),
    };
  }

  /**
   * Get default intent signals (null-safe fallback)
   */
  private static getDefaultIntentSignals(): IntentSignals {
    return {
      navigationalKeywords: [],
      informationalKeywords: [],
      commercialKeywords: [],
      transactionalKeywords: [],
      intentDistribution: {
        navigational: 0,
        informational: 0,
        commercial: 0,
        transactional: 0,
      },
      dominantIntent: null,
      coverageScore: 0,
    };
  }
}
