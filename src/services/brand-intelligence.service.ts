/**
 * Brand Intelligence Service - Phase 5
 *
 * Unified brand detection and classification engine used by:
 *   1. Combo Coverage (Audit V2)
 *   2. Autocomplete Intent Intelligence (Phases 2-4)
 *
 * This service provides brand-awareness to existing subsystems without
 * modifying core logic. All brand detection is post-processing enrichment.
 *
 * Architecture:
 *   - Registry-first (no parallel registries)
 *   - Multi-tenant safe (uses existing RLS)
 *   - Fully typed (no any types)
 *   - Zero external API calls
 *   - Graceful fallbacks (never throws)
 *
 * @see docs/BRAND_INTELLIGENCE_PHASE5_COMPLETE.md
 */

import type { ScrapedMetadata } from '@/types/aso';
import type { IntentCluster } from './intent-intelligence.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Brand information extracted from app metadata
 */
export interface BrandInfo {
  /** Canonical brand name (normalized) */
  canonicalBrand: string;

  /** Brand aliases (variations for matching) */
  aliases: string[];

  /** Developer/publisher name (source) */
  developer: string;

  /** App name (for context) */
  appName: string;
}

/**
 * Brand classification for tokens/combos/keywords
 */
export type BrandClassification = 'brand' | 'generic' | 'competitor';

/**
 * Enriched combo with brand classification
 */
export interface EnrichedCombo {
  combo: string;
  classification: BrandClassification;
  matchedBrandAlias?: string;  // Which alias matched (if brand)
  matchedCompetitor?: string;  // Which competitor matched (if competitor)
}

/**
 * Enriched intent cluster with brand classification
 */
export interface EnrichedIntentCluster extends IntentCluster {
  /** Brand classification for this cluster */
  brandClassification: BrandClassification;

  /** Brand keywords in this cluster */
  brandKeywords: string[];

  /** Generic keywords in this cluster */
  genericKeywords: string[];

  /** Competitor keywords in this cluster */
  competitorKeywords: string[];
}

/**
 * Competitor brand entry (can be extended to registry later)
 */
export interface CompetitorBrand {
  name: string;
  aliases: string[];
  category?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Common language learning app competitors
 * TODO: Move to database registry in future phase
 */
const LANGUAGE_LEARNING_COMPETITORS: CompetitorBrand[] = [
  { name: 'Duolingo', aliases: ['duolingo', 'duo lingo'] },
  { name: 'Babbel', aliases: ['babbel'] },
  { name: 'Rosetta Stone', aliases: ['rosetta stone', 'rosetta'] },
  { name: 'Memrise', aliases: ['memrise'] },
  { name: 'Busuu', aliases: ['busuu'] },
  { name: 'Mondly', aliases: ['mondly'] },
];

/**
 * Generic stop words that are NOT brand indicators
 */
const BRAND_STOP_WORDS = new Set([
  'app',
  'apps',
  'application',
  'software',
  'learn',
  'language',
  'languages',
  'learning',
  'lessons',
  'course',
  'courses',
  'free',
  'download',
  'get',
  'best',
  'top',
  'new',
]);

// ============================================================================
// BRAND INTELLIGENCE SERVICE
// ============================================================================

/**
 * BrandIntelligenceService
 *
 * Static methods for brand detection and classification.
 * All methods are null-safe and return sensible defaults on error.
 */
export class BrandIntelligenceService {
  /**
   * Extract canonical brand information from app metadata
   *
   * @param metadata - Scraped app metadata
   * @returns BrandInfo with canonical brand and aliases
   *
   * @example
   * ```typescript
   * const brandInfo = BrandIntelligenceService.extractCanonicalBrand(metadata);
   * // {
   * //   canonicalBrand: 'pimsleur',
   * //   aliases: ['pimsleur', 'pimsleur language', 'pimsleur app'],
   * //   developer: 'Simon & Schuster',
   * //   appName: 'Pimsleur Language Learning'
   * // }
   * ```
   */
  static extractCanonicalBrand(metadata: ScrapedMetadata): BrandInfo {
    try {
      // Extract developer name (most reliable source)
      const developer = metadata.developer || '';
      const appName = metadata.title || metadata.name || '';

      // Extract brand from app name (first word usually)
      // e.g., "Pimsleur Language Learning" → "Pimsleur"
      const appNameTokens = appName.split(/\s+/);
      const potentialBrand = appNameTokens[0] || '';

      // Normalize brand (lowercase, trim)
      const canonicalBrand = potentialBrand.toLowerCase().trim();

      // Generate aliases
      const aliases = this.generateBrandAliases(canonicalBrand);

      return {
        canonicalBrand,
        aliases,
        developer,
        appName,
      };
    } catch (error) {
      console.error('BrandIntelligenceService.extractCanonicalBrand error:', error);
      return {
        canonicalBrand: '',
        aliases: [],
        developer: metadata.developer || '',
        appName: metadata.title || '',
      };
    }
  }

  /**
   * Generate brand aliases for matching
   *
   * @param brand - Canonical brand name
   * @returns Array of brand aliases (lowercase)
   *
   * @example
   * ```typescript
   * const aliases = BrandIntelligenceService.generateBrandAliases('pimsleur');
   * // ['pimsleur', 'pimsleur language', 'pimsleur app', 'pimsleur learning']
   * ```
   */
  static generateBrandAliases(brand: string): string[] {
    if (!brand || brand.trim() === '') {
      return [];
    }

    const normalized = brand.toLowerCase().trim();
    const aliases = new Set<string>();

    // Base alias
    aliases.add(normalized);

    // Common suffixes
    const suffixes = ['app', 'language', 'learning', 'lessons', 'course'];
    for (const suffix of suffixes) {
      aliases.add(`${normalized} ${suffix}`);
    }

    // Common prefixes
    const prefixes = ['the', 'official'];
    for (const prefix of prefixes) {
      aliases.add(`${prefix} ${normalized}`);
    }

    return Array.from(aliases);
  }

  /**
   * Detect if any token matches brand aliases
   *
   * @param tokens - Array of tokens to check
   * @param aliases - Brand aliases to match against
   * @returns True if any token is a brand token
   *
   * @example
   * ```typescript
   * const isBrand = BrandIntelligenceService.detectBrandTokens(
   *   ['pimsleur', 'spanish'],
   *   ['pimsleur', 'pimsleur language']
   * );
   * // true
   * ```
   */
  static detectBrandTokens(tokens: string[], aliases: string[]): boolean {
    if (!tokens || tokens.length === 0 || !aliases || aliases.length === 0) {
      return false;
    }

    const normalizedTokens = tokens.map((t) => t.toLowerCase().trim());
    const normalizedAliases = aliases.map((a) => a.toLowerCase().trim());

    // Check single token matches
    for (const token of normalizedTokens) {
      if (normalizedAliases.includes(token)) {
        return true;
      }
    }

    // Check multi-token matches (e.g., "pimsleur language")
    const tokenString = normalizedTokens.join(' ');
    for (const alias of normalizedAliases) {
      if (tokenString.includes(alias)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect if text contains competitor brand
   *
   * @param text - Text to check
   * @param competitors - List of competitor brands
   * @returns Matched competitor or null
   *
   * @example
   * ```typescript
   * const competitor = BrandIntelligenceService.detectCompetitorBrand(
   *   'learn spanish like duolingo',
   *   LANGUAGE_LEARNING_COMPETITORS
   * );
   * // { name: 'Duolingo', aliases: ['duolingo', 'duo lingo'] }
   * ```
   */
  static detectCompetitorBrand(
    text: string,
    competitors: CompetitorBrand[] = LANGUAGE_LEARNING_COMPETITORS
  ): CompetitorBrand | null {
    if (!text || text.trim() === '') {
      return null;
    }

    const normalizedText = text.toLowerCase().trim();

    for (const competitor of competitors) {
      for (const alias of competitor.aliases) {
        if (normalizedText.includes(alias.toLowerCase())) {
          return competitor;
        }
      }
    }

    return null;
  }

  /**
   * Classify a single token/keyword as brand/generic/competitor
   *
   * @param token - Token to classify
   * @param brandAliases - Brand aliases
   * @param competitors - Competitor brands
   * @returns Brand classification
   *
   * @example
   * ```typescript
   * const classification = BrandIntelligenceService.classifyToken(
   *   'pimsleur',
   *   ['pimsleur', 'pimsleur language'],
   *   LANGUAGE_LEARNING_COMPETITORS
   * );
   * // 'brand'
   * ```
   */
  static classifyToken(
    token: string,
    brandAliases: string[],
    competitors: CompetitorBrand[] = LANGUAGE_LEARNING_COMPETITORS
  ): BrandClassification {
    if (!token || token.trim() === '') {
      return 'generic';
    }

    const normalized = token.toLowerCase().trim();

    // Check if competitor
    const competitor = this.detectCompetitorBrand(normalized, competitors);
    if (competitor) {
      return 'competitor';
    }

    // Check if brand
    const isBrand = this.detectBrandTokens([normalized], brandAliases);
    if (isBrand) {
      return 'brand';
    }

    // Default: generic
    return 'generic';
  }

  /**
   * Classify multiple tokens as brand/generic/competitor
   *
   * @param tokens - Tokens to classify
   * @param brandAliases - Brand aliases
   * @param competitors - Competitor brands
   * @returns Brand classification for the token set
   *
   * @example
   * ```typescript
   * const classification = BrandIntelligenceService.classifyTokens(
   *   ['pimsleur', 'spanish'],
   *   ['pimsleur', 'pimsleur language'],
   *   LANGUAGE_LEARNING_COMPETITORS
   * );
   * // 'brand' (contains brand token)
   * ```
   */
  static classifyTokens(
    tokens: string[],
    brandAliases: string[],
    competitors: CompetitorBrand[] = LANGUAGE_LEARNING_COMPETITORS
  ): BrandClassification {
    if (!tokens || tokens.length === 0) {
      return 'generic';
    }

    // Join tokens to check for multi-word matches
    const joined = tokens.join(' ').toLowerCase();

    // Check if competitor
    const competitor = this.detectCompetitorBrand(joined, competitors);
    if (competitor) {
      return 'competitor';
    }

    // Check if brand
    const isBrand = this.detectBrandTokens(tokens, brandAliases);
    if (isBrand) {
      return 'brand';
    }

    // Default: generic
    return 'generic';
  }

  /**
   * Classify combos with brand awareness
   *
   * @param combos - Array of combo strings
   * @param brandInfo - Brand information from metadata
   * @param competitors - Competitor brands
   * @returns Array of enriched combos with brand classification
   *
   * @example
   * ```typescript
   * const enriched = BrandIntelligenceService.classifyCombos(
   *   ['pimsleur spanish', 'learn spanish', 'duolingo alternative'],
   *   brandInfo,
   *   LANGUAGE_LEARNING_COMPETITORS
   * );
   * // [
   * //   { combo: 'pimsleur spanish', classification: 'brand', matchedBrandAlias: 'pimsleur' },
   * //   { combo: 'learn spanish', classification: 'generic' },
   * //   { combo: 'duolingo alternative', classification: 'competitor', matchedCompetitor: 'Duolingo' }
   * // ]
   * ```
   */
  static classifyCombos(
    combos: string[],
    brandInfo: BrandInfo,
    competitors: CompetitorBrand[] = LANGUAGE_LEARNING_COMPETITORS
  ): EnrichedCombo[] {
    if (!combos || combos.length === 0) {
      return [];
    }

    return combos.map((combo) => {
      const normalized = combo.toLowerCase().trim();

      // Check competitor
      const competitor = this.detectCompetitorBrand(normalized, competitors);
      if (competitor) {
        return {
          combo,
          classification: 'competitor' as BrandClassification,
          matchedCompetitor: competitor.name,
        };
      }

      // Check brand
      for (const alias of brandInfo.aliases) {
        if (normalized.includes(alias.toLowerCase())) {
          return {
            combo,
            classification: 'brand' as BrandClassification,
            matchedBrandAlias: alias,
          };
        }
      }

      // Default: generic
      return {
        combo,
        classification: 'generic' as BrandClassification,
      };
    });
  }

  /**
   * Classify intent clusters with brand awareness
   *
   * @param clusters - Intent clusters from Phase 2/3
   * @param brandInfo - Brand information from metadata
   * @param competitors - Competitor brands
   * @returns Array of enriched clusters with brand classification
   *
   * @example
   * ```typescript
   * const enriched = BrandIntelligenceService.classifyIntentClusters(
   *   intentClusters,
   *   brandInfo,
   *   LANGUAGE_LEARNING_COMPETITORS
   * );
   * // Clusters now have brandClassification, brandKeywords, genericKeywords, competitorKeywords
   * ```
   */
  static classifyIntentClusters(
    clusters: IntentCluster[],
    brandInfo: BrandInfo,
    competitors: CompetitorBrand[] = LANGUAGE_LEARNING_COMPETITORS
  ): EnrichedIntentCluster[] {
    if (!clusters || clusters.length === 0) {
      return [];
    }

    return clusters.map((cluster) => {
      const brandKeywords: string[] = [];
      const genericKeywords: string[] = [];
      const competitorKeywords: string[] = [];

      // Classify each keyword in the cluster
      for (const keyword of cluster.keywords) {
        const classification = this.classifyToken(keyword, brandInfo.aliases, competitors);

        if (classification === 'brand') {
          brandKeywords.push(keyword);
        } else if (classification === 'competitor') {
          competitorKeywords.push(keyword);
        } else {
          genericKeywords.push(keyword);
        }
      }

      // Determine overall cluster classification
      // Priority: competitor > brand > generic
      let brandClassification: BrandClassification = 'generic';
      if (competitorKeywords.length > 0) {
        brandClassification = 'competitor';
      } else if (brandKeywords.length > 0) {
        brandClassification = 'brand';
      }

      return {
        ...cluster,
        brandClassification,
        brandKeywords,
        genericKeywords,
        competitorKeywords,
      };
    });
  }

  /**
   * Filter out competitor keywords from recommendations
   *
   * @param keywords - Keywords to filter
   * @param competitors - Competitor brands
   * @returns Filtered keywords (competitor keywords removed)
   *
   * @example
   * ```typescript
   * const filtered = BrandIntelligenceService.filterCompetitorKeywords(
   *   ['learn spanish', 'duolingo alternative', 'best language app'],
   *   LANGUAGE_LEARNING_COMPETITORS
   * );
   * // ['learn spanish', 'best language app']
   * ```
   */
  static filterCompetitorKeywords(
    keywords: string[],
    competitors: CompetitorBrand[] = LANGUAGE_LEARNING_COMPETITORS
  ): string[] {
    if (!keywords || keywords.length === 0) {
      return [];
    }

    return keywords.filter((keyword) => {
      const competitor = this.detectCompetitorBrand(keyword, competitors);
      return competitor === null;
    });
  }

  /**
   * Get brand-focused recommendations
   *
   * @param brandInfo - Brand information
   * @param intentClusters - Intent clusters (enriched)
   * @returns Array of brand-focused recommendations
   *
   * @example
   * ```typescript
   * const recs = BrandIntelligenceService.getBrandRecommendations(
   *   brandInfo,
   *   enrichedClusters
   * );
   * // [
   * //   '[BRAND][moderate] Competitor brand "Duolingo" detected. Consider alternative phrasing.',
   * //   '[BRAND][success] Strong brand presence: "Pimsleur" used 3 times.'
   * // ]
   * ```
   */
  static getBrandRecommendations(
    brandInfo: BrandInfo,
    intentClusters: EnrichedIntentCluster[]
  ): string[] {
    const recommendations: string[] = [];

    if (!intentClusters || intentClusters.length === 0) {
      return recommendations;
    }

    // Count brand vs generic vs competitor
    let totalBrand = 0;
    let totalGeneric = 0;
    let totalCompetitor = 0;
    const competitorsDetected = new Set<string>();

    for (const cluster of intentClusters) {
      totalBrand += cluster.brandKeywords.length;
      totalGeneric += cluster.genericKeywords.length;
      totalCompetitor += cluster.competitorKeywords.length;

      // Track which competitors were detected
      for (const keyword of cluster.competitorKeywords) {
        const competitor = this.detectCompetitorBrand(keyword);
        if (competitor) {
          competitorsDetected.add(competitor.name);
        }
      }
    }

    const total = totalBrand + totalGeneric + totalCompetitor;

    // Recommendation 1: Competitor detected
    if (totalCompetitor > 0) {
      const competitorList = Array.from(competitorsDetected).join(', ');
      recommendations.push(
        `[BRAND][moderate] Competitor brand${competitorsDetected.size > 1 ? 's' : ''} detected: ${competitorList}. Consider using alternative phrasing to avoid trademark issues.`
      );
    }

    // Recommendation 2: Too brand-heavy
    if (total > 0 && totalBrand / total > 0.7) {
      recommendations.push(
        `[BRAND][strong] Metadata is heavily brand-focused (${Math.round((totalBrand / total) * 100)}% brand keywords). Consider adding more generic discovery keywords to reach non-brand-aware users.`
      );
    }

    // Recommendation 3: Good brand presence
    if (totalBrand >= 2 && totalBrand <= 4 && totalGeneric >= 2) {
      recommendations.push(
        `[BRAND][success] Good brand-generic balance detected. Brand keywords: ${totalBrand}, Generic keywords: ${totalGeneric}.`
      );
    }

    // Recommendation 4: No brand presence
    if (totalBrand === 0 && total > 0) {
      recommendations.push(
        `[BRAND][moderate] No brand keywords detected. Consider adding your brand name ("${brandInfo.canonicalBrand}") to improve branded search visibility.`
      );
    }

    return recommendations;
  }
}
