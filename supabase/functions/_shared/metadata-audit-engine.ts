/**
 * Metadata Audit Engine (Deno-compatible)
 *
 * Lightweight version for Edge Functions.
 * Core scoring logic extracted from frontend engine.
 *
 * Phase 1: ASO Bible Integration - Vertical-aware recommendations
 * Phase 2: Intent Classification Engine - Intent-based recommendations
 * Phase 3: Vertical-Aware Hook Patterns - Description hook evaluation
 */

import { detectVertical, type VerticalDetectionResult } from './vertical-detector.ts';
import { loadVerticalRuleSet, formatGenericPhraseExamples, type VerticalRuleSet } from './ruleset-loader.ts';
import { classifyMetadataIntent, type IntentCoverage } from './intent-classifier.ts';

// v2.0 imports - Description Intelligence + Gap Analysis + Executive Recommendations
import { extractCapabilities, type AppCapabilityMap } from './description-intelligence.ts';
import { analyzeCapabilityGaps, type GapAnalysisResult } from './gap-analysis.ts';
import { generateExecutiveRecommendations, type ExecutiveRecommendations } from './executive-recommendations.ts';

// v2.1 imports - Brand Filtering for Ranking Combos
import { extractBrandKeywords, filterGenericCombos, getBrandStats } from './brand-utils.ts';

// ==================== TYPES ====================

export type MetadataElement = 'app_name' | 'title' | 'subtitle' | 'description';

/**
 * Combo Strength Classification
 * Based on confirmed App Store ranking behavior
 */
export enum ComboStrength {
  // Tier 1: Title-only (Strongest)
  TITLE_CONSECUTIVE = 'title_consecutive',                 // 🔥🔥🔥 Consecutive words in title

  // Tier 2: Title-based (Very Strong)
  TITLE_NON_CONSECUTIVE = 'title_non_consecutive',         // 🔥🔥 Words in title but not consecutive
  TITLE_KEYWORDS_CROSS = 'title_keywords_cross',           // 🔥⚡ Title + Keywords field (2nd tier)

  // Tier 3: Cross-element title-subtitle (Medium)
  CROSS_ELEMENT = 'cross_element',                         // ⚡ Title + Subtitle

  // Tier 4: Keywords/Subtitle same-field (Weak)
  KEYWORDS_CONSECUTIVE = 'keywords_consecutive',           // 💤 Consecutive in keywords field
  SUBTITLE_CONSECUTIVE = 'subtitle_consecutive',           // 💤 Consecutive in subtitle

  // Tier 5: Keywords/Subtitle cross (Very Weak)
  KEYWORDS_SUBTITLE_CROSS = 'keywords_subtitle_cross',     // 💤⚡ Keywords + Subtitle cross

  // Tier 6: Non-consecutive in weak fields (Very Very Weak)
  KEYWORDS_NON_CONSECUTIVE = 'keywords_non_consecutive',   // 💤💤 Non-consecutive in keywords
  SUBTITLE_NON_CONSECUTIVE = 'subtitle_non_consecutive',   // 💤💤 Non-consecutive in subtitle

  // Tier 7: Three-way cross (Weakest existing)
  THREE_WAY_CROSS = 'three_way_cross',                     // 💤💤💤 Title + Subtitle + Keywords (3 elements)

  // Missing
  MISSING = 'missing',                                     // ❌ Not in metadata
}

/**
 * Generated Combo with full metadata
 */
export interface GeneratedCombo {
  id: string;  // UUID for stable identity
  text: string;
  keywords: string[];
  length: number;
  exists: boolean;
  source: 'title' | 'subtitle' | 'keywords' | 'both' | 'cross' | 'missing';

  // Strength classification
  strength: ComboStrength;
  strengthScore: number;  // 0-100 based on tier
  isConsecutive: boolean;

  // Strategic analysis
  canStrengthen: boolean;
  strengtheningSuggestion?: string;

  // Brand filtering
  isBranded: boolean;
  isGeneric: boolean;
}

export interface RuleEvaluationResult {
  ruleId: string;
  passed: boolean;
  score: number;
  bonus?: number;
  penalty?: number;
  message: string;
  evidence?: string[];
}

export interface ElementScoringResult {
  element: MetadataElement;
  score: number;
  ruleResults: RuleEvaluationResult[];
  recommendations: string[];
  insights: string[];
  metadata: {
    text: string; // v2.1: Store original text for reuse
    characterUsage: number;
    maxCharacters: number;
    keywords: string[];
    combos?: string[];
  };
}

export interface VerticalContext {
  verticalId: string;
  verticalName: string;
  confidence: number;
  matchedSignals: string[];
  ruleSetSource: 'base' | 'vertical';
}

/**
 * Keyword Frequency Analysis
 * Shows which keywords appear in the most combinations (strategic keywords)
 */
export interface KeywordFrequencyResult {
  keyword: string;
  totalCombos: number;
  twoWordCombos: number;
  threeWordCombos: number;
  fourPlusCombos: number;
  sampleCombos: string[]; // Max 5 samples
}

export interface UnifiedMetadataAuditResult {
  overallScore: number;
  elements: {
    app_name: ElementScoringResult;
    title: ElementScoringResult;
    subtitle: ElementScoringResult;
    description: ElementScoringResult;
  };
  topRecommendations: string[];
  keywordCoverage: {
    totalUniqueKeywords: number;
    titleKeywords: string[];
    subtitleNewKeywords: string[];
    descriptionNewKeywords: string[];
  };
  comboCoverage: {
    // v2.2: Rich combo objects (backend as single source of truth)
    combos: GeneratedCombo[];

    // v2.2: Enhanced stats with strength breakdown
    stats: {
      totalPossible: number;
      existing: number;
      missing: number;
      coveragePct: number;

      // Strength-based breakdown (10 tiers)
      titleConsecutive: number;
      titleNonConsecutive: number;
      titleKeywordsCross: number;
      crossElement: number;
      keywordsConsecutive: number;
      subtitleConsecutive: number;
      keywordsSubtitleCross: number;
      keywordsNonConsecutive: number;
      subtitleNonConsecutive: number;
      threeWayCross: number;
    };

    // Legacy fields (deprecated - kept for backward compat during migration)
    totalCombos: number;
    titleCombos: string[];
    subtitleNewCombos: string[];
    allCombinedCombos: string[];
  };
  verticalContext?: VerticalContext;
  intentCoverage?: IntentCoverage;
  // v2.0: Description Intelligence (Phase 2)
  capabilityMap?: AppCapabilityMap;
  // v2.0: Gap Analysis (Phase 3)
  gapAnalysis?: GapAnalysisResult;
  // v2.0: Executive Recommendations (Phase 4)
  executiveRecommendations?: ExecutiveRecommendations;
  // v2.1: Keyword Frequency Analysis (Competitive Intelligence)
  keywordFrequency?: KeywordFrequencyResult[];
}

interface ScrapedMetadata {
  name?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  keywords?: string; // v2.2: App Store Connect keywords field (100 chars, comma-separated)
  applicationCategory?: string;
  brandKeywords?: string[]; // v2.1: User-defined or auto-detected brand keywords
  competitorBrandKeywords?: string[]; // v2.1: Competitor brand keywords (for competitive analysis)
}

interface EvaluationContext {
  metadata: ScrapedMetadata;
  category?: string;
  titleTokens: string[];
  subtitleTokens: string[];
  descriptionTokens: string[];
  stopwords: Set<string>;
  verticalRuleSet?: VerticalRuleSet | null;
}

interface RuleConfig {
  id: string;
  name: string;
  description: string;
  weight: number;
  evaluator: (text: string, context: EvaluationContext) => RuleEvaluationResult;
}

interface ElementConfig {
  element: MetadataElement;
  maxCharacters: number;
  weight: number;
  rules: RuleConfig[];
}

// ==================== UTILITIES ====================

/**
 * Normalize text for accurate character counting
 * Decodes HTML entities, removes invisible characters, and normalizes whitespace
 */
function normalizeText(text: string): string {
  // First decode HTML entities
  const decoded = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Then normalize Unicode and whitespace
  return decoded
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Replace non-breaking spaces with regular spaces
    .replace(/\u00A0/g, ' ')
    // Replace other Unicode whitespace with regular spaces
    .replace(/[\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Collapse multiple spaces into one
    .replace(/\s+/g, ' ')
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Simple tokenizer
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Generate n-grams
 */
function generateNgrams(tokens: string[], n: number, stopwords: Set<string>): string[] {
  const ngrams: string[] = [];

  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n);
    // Skip if all tokens are stopwords
    if (gram.every(t => stopwords.has(t))) continue;
    ngrams.push(gram.join(' '));
  }

  return ngrams;
}

/**
 * Analyze combinations
 */
function analyzeCombinations(tokens: string[], stopwords: Set<string>, minN: number, maxN: number): string[] {
  const allCombos: string[] = [];

  for (let n = minN; n <= maxN; n++) {
    const ngrams = generateNgrams(tokens, n, stopwords);
    allCombos.push(...ngrams);
  }

  return allCombos;
}

/**
 * Count syllables (for readability)
 */
function countSyllables(word: string): number {
  if (!word || word.length === 0) return 0;

  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  // Adjust for silent 'e'
  if (word.endsWith('e') && count > 1) {
    count--;
  }

  return Math.max(1, count);
}

// ==================== DEFAULT STOPWORDS ====================

const DEFAULT_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their', 'them'
]);

// ==================== SCORING REGISTRY ====================

const METADATA_SCORING_REGISTRY: ElementConfig[] = [
  // APP NAME
  {
    element: 'app_name',
    maxCharacters: 30,
    weight: 0.15,
    rules: [
      {
        id: 'app_name_memorability',
        name: 'Memorability',
        description: 'Evaluates name memorability',
        weight: 0.35,
        evaluator: (text, ctx) => {
          const normalizedText = normalizeText(text);
          const length = normalizedText.length;
          const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;

          let score = 60;
          if (wordCount === 1 && length <= 10) score = 90;
          else if (wordCount === 1 && length <= 15) score = 85;
          else if (wordCount === 2 && length <= 15) score = 80;
          else if (wordCount === 2 && length <= 20) score = 70;

          return {
            ruleId: 'app_name_memorability',
            passed: score >= 70,
            score,
            message: `${wordCount} word${wordCount > 1 ? 's' : ''}, ${length} characters`,
            evidence: []
          };
        }
      },
      {
        id: 'app_name_brand_strength',
        name: 'Brand Strength',
        description: 'Evaluates brand identity',
        weight: 0.40,
        evaluator: (text, ctx) => {
          const lowerText = text.toLowerCase();
          const hasGenericWords = ['app', 'the', 'best', 'pro', 'lite', 'mobile', 'free'].some(w => lowerText.includes(w));
          const hasUniqueWords = text.split(/\s+/).some(word => word.length > 5);

          let score = 60;
          if (hasUniqueWords && !hasGenericWords) score = 90;
          else if (hasUniqueWords) score = 75;
          else if (!hasGenericWords) score = 70;

          return {
            ruleId: 'app_name_brand_strength',
            passed: score >= 70,
            score,
            message: hasGenericWords ? 'Contains generic terms' : 'Strong brand potential',
            evidence: []
          };
        }
      },
      {
        id: 'app_name_search_visibility',
        name: 'Search Visibility',
        description: 'Evaluates discoverability',
        weight: 0.25,
        evaluator: (text, ctx) => {
          const score = 70; // Simplified for edge function
          return {
            ruleId: 'app_name_search_visibility',
            passed: true,
            score,
            message: 'Acceptable search visibility',
            evidence: []
          };
        }
      }
    ]
  },

  // TITLE
  {
    element: 'title',
    maxCharacters: 30,
    weight: 0.40,
    rules: [
      {
        id: 'title_character_usage',
        name: 'Character Usage',
        description: 'Character efficiency',
        weight: 0.25,
        evaluator: (text, ctx) => {
          const normalizedText = normalizeText(text);
          const charCount = normalizedText.length;
          const usagePercent = (charCount / 30) * 100;

          let score = 0;
          if (usagePercent < 50) score = 40;
          else if (usagePercent < 70) score = 60;
          else if (usagePercent < 90) score = 85;
          else if (usagePercent <= 100) score = 100;
          else score = 0;

          return {
            ruleId: 'title_character_usage',
            passed: usagePercent >= 70 && usagePercent <= 100,
            score,
            message: `Using ${charCount}/30 characters (${Math.round(usagePercent)}%)`,
            evidence: []
          };
        }
      },
      {
        id: 'title_unique_keywords',
        name: 'Unique Keywords',
        description: 'Keyword coverage',
        weight: 0.30,
        evaluator: (text, ctx) => {
          const tokens = tokenize(text);
          const contentWords = tokens.filter(t => !ctx.stopwords.has(t) && t.length > 2);
          const uniqueContent = new Set(contentWords);

          const density = tokens.length > 0 ? (uniqueContent.size / tokens.length) * 100 : 0;
          const score = Math.min(100, density * 1.5);

          return {
            ruleId: 'title_unique_keywords',
            passed: uniqueContent.size >= 2,
            score,
            message: `${uniqueContent.size} unique keywords`,
            evidence: Array.from(uniqueContent)
          };
        }
      },
      {
        id: 'title_combo_coverage',
        name: 'Combo Coverage',
        description: 'Multi-word combinations',
        weight: 0.30,
        evaluator: (text, ctx) => {
          const tokens = tokenize(text);
          const combos = analyzeCombinations(tokens, ctx.stopwords, 2, 4);

          let score = 0;
          if (combos.length === 0) score = 20;
          else if (combos.length <= 2) score = 50;
          else if (combos.length <= 5) score = 75;
          else score = 90;

          return {
            ruleId: 'title_combo_coverage',
            passed: combos.length >= 2,
            score,
            message: `${combos.length} combinations`,
            evidence: combos.slice(0, 5)
          };
        }
      },
      {
        id: 'title_filler_penalty',
        name: 'Filler Penalty',
        description: 'Stopword penalty',
        weight: 0.15,
        evaluator: (text, ctx) => {
          const tokens = tokenize(text);
          const fillerTokens = tokens.filter(t => ctx.stopwords.has(t));
          const fillerRatio = tokens.length > 0 ? fillerTokens.length / tokens.length : 0;

          let penalty = 0;
          if (fillerRatio > 0.5) penalty = 30;
          else if (fillerRatio > 0.3) penalty = 15;

          const score = Math.max(0, 100 - penalty);

          return {
            ruleId: 'title_filler_penalty',
            passed: fillerRatio <= 0.3,
            score,
            penalty,
            message: `${fillerTokens.length} filler tokens (${Math.round(fillerRatio * 100)}%)`,
            evidence: fillerTokens
          };
        }
      }
    ]
  },

  // SUBTITLE
  {
    element: 'subtitle',
    maxCharacters: 30,
    weight: 0.30,
    rules: [
      {
        id: 'subtitle_character_usage',
        name: 'Character Usage',
        description: 'Character efficiency',
        weight: 0.20,
        evaluator: (text, ctx) => {
          const normalizedText = normalizeText(text);
          const charCount = normalizedText.length;
          const usagePercent = charCount > 0 ? (charCount / 30) * 100 : 0;

          let score = 0;
          if (charCount === 0) score = 0;
          else if (usagePercent < 50) score = 40;
          else if (usagePercent < 70) score = 60;
          else if (usagePercent < 90) score = 85;
          else if (usagePercent <= 100) score = 100;
          else score = 0;

          return {
            ruleId: 'subtitle_character_usage',
            passed: usagePercent >= 70 && usagePercent <= 100,
            score,
            message: charCount > 0 ? `Using ${charCount}/30 characters` : 'No subtitle',
            evidence: []
          };
        }
      },
      {
        id: 'subtitle_incremental_value',
        name: 'Incremental Value',
        description: 'New keywords vs title',
        weight: 0.40,
        evaluator: (text, ctx) => {
          if (!text || text.length === 0) {
            return { ruleId: 'subtitle_incremental_value', passed: false, score: 0, message: 'No subtitle', evidence: [] };
          }

          const titleTokenSet = new Set(ctx.titleTokens);
          const subtitleTokens = tokenize(text);
          const newTokens = subtitleTokens.filter(t => !titleTokenSet.has(t) && !ctx.stopwords.has(t) && t.length > 2);
          const newTokenRatio = subtitleTokens.length > 0 ? newTokens.length / subtitleTokens.length : 0;

          const score = Math.min(100, newTokenRatio * 120);

          return {
            ruleId: 'subtitle_incremental_value',
            passed: newTokenRatio >= 0.5,
            score,
            message: `${newTokens.length} new keywords (${Math.round(newTokenRatio * 100)}%)`,
            evidence: newTokens
          };
        }
      },
      {
        id: 'subtitle_combo_coverage',
        name: 'New Combos',
        description: 'New combinations',
        weight: 0.25,
        evaluator: (text, ctx) => {
          if (!text || text.length === 0) {
            return { ruleId: 'subtitle_combo_coverage', passed: false, score: 0, message: 'No subtitle', evidence: [] };
          }

          const titleCombos = analyzeCombinations(ctx.titleTokens, ctx.stopwords, 2, 4);
          const titleComboSet = new Set(titleCombos);

          const combinedTokens = [...ctx.titleTokens, ...tokenize(text)];
          const combinedCombos = analyzeCombinations(combinedTokens, ctx.stopwords, 2, 4);
          const newCombos = combinedCombos.filter(c => !titleComboSet.has(c));

          let score = 0;
          if (newCombos.length === 0) score = 20;
          else if (newCombos.length <= 2) score = 50;
          else if (newCombos.length <= 5) score = 80;
          else score = 95;

          return {
            ruleId: 'subtitle_combo_coverage',
            passed: newCombos.length >= 2,
            score,
            message: `${newCombos.length} new combinations`,
            evidence: newCombos.slice(0, 5)
          };
        }
      },
      {
        id: 'subtitle_complementarity',
        name: 'Complementarity',
        description: 'Title alignment',
        weight: 0.15,
        evaluator: (text, ctx) => {
          if (!text || text.length === 0) {
            return { ruleId: 'subtitle_complementarity', passed: false, score: 0, message: 'No subtitle', evidence: [] };
          }

          const titleTokenSet = new Set(ctx.titleTokens.filter(t => !ctx.stopwords.has(t)));
          const subtitleTokens = tokenize(text).filter(t => !ctx.stopwords.has(t));
          const overlapTokens = subtitleTokens.filter(t => titleTokenSet.has(t));
          const overlapRatio = subtitleTokens.length > 0 ? overlapTokens.length / subtitleTokens.length : 0;

          const score = Math.max(0, (1 - overlapRatio) * 100);

          return {
            ruleId: 'subtitle_complementarity',
            passed: overlapRatio < 0.4,
            score,
            message: overlapRatio < 0.3 ? 'Excellent complementarity' : 'Good complementarity',
            evidence: overlapTokens
          };
        }
      }
    ]
  },

  // DESCRIPTION
  {
    element: 'description',
    maxCharacters: 4000,
    weight: 0.15,
    rules: [
      {
        id: 'description_hook_strength',
        name: 'Hook Strength',
        description: 'Opening hook',
        weight: 0.30,
        evaluator: (text, ctx) => {
          if (!text || text.length === 0) {
            return { ruleId: 'description_hook_strength', passed: false, score: 0, message: 'No description', evidence: [] };
          }

          const firstParagraph = text.split('\n')[0] || '';

          // Phase 3: Use vertical-specific hook patterns
          const hookKeywords = ctx.verticalRuleSet?.hookPatterns || [
            'discover', 'experience', 'transform', 'achieve', 'unlock'
          ];

          const firstParaLower = firstParagraph.toLowerCase();
          const matchedHooks = hookKeywords.filter(k => firstParaLower.includes(k.toLowerCase()));
          const hasHookKeyword = matchedHooks.length > 0;

          const score = hasHookKeyword ? 85 : 65;

          return {
            ruleId: 'description_hook_strength',
            passed: score >= 70,
            score,
            message: hasHookKeyword ? 'Strong opening hook' : 'Consider adding hook words',
            evidence: matchedHooks
          };
        }
      },
      {
        id: 'description_feature_mentions',
        name: 'Feature Mentions',
        description: 'Feature count',
        weight: 0.25,
        evaluator: (text, ctx) => {
          if (!text || text.length === 0) {
            return { ruleId: 'description_feature_mentions', passed: false, score: 0, message: 'No description', evidence: [] };
          }

          const featureCount = (text.match(/\b(feature|tool|function|capability|benefit)\b/gi) || []).length;
          const score = Math.min(100, featureCount * 15);

          return {
            ruleId: 'description_feature_mentions',
            passed: featureCount >= 3,
            score,
            message: `${featureCount} feature mentions`,
            evidence: []
          };
        }
      },
      {
        id: 'description_cta_strength',
        name: 'CTA Strength',
        description: 'Call-to-action',
        weight: 0.20,
        evaluator: (text, ctx) => {
          if (!text || text.length === 0) {
            return { ruleId: 'description_cta_strength', passed: false, score: 0, message: 'No description', evidence: [] };
          }

          const ctaVerbs = ['download', 'try', 'start', 'get', 'join', 'subscribe'];
          const lowerText = text.toLowerCase();
          const foundCtas = ctaVerbs.filter(v => lowerText.includes(v));

          const score = Math.min(100, foundCtas.length * 25);

          return {
            ruleId: 'description_cta_strength',
            passed: foundCtas.length >= 2,
            score,
            message: `${foundCtas.length} CTAs detected`,
            evidence: foundCtas
          };
        }
      },
      {
        id: 'description_readability',
        name: 'Readability',
        description: 'Flesch-Kincaid score',
        weight: 0.25,
        evaluator: (text, ctx) => {
          if (!text || text.length === 0) {
            return { ruleId: 'description_readability', passed: false, score: 0, message: 'No description', evidence: [] };
          }

          const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const words = text.split(/\s+/).filter(w => w.length > 0);

          if (sentences.length === 0 || words.length === 0) {
            return { ruleId: 'description_readability', passed: false, score: 0, message: 'Insufficient content', evidence: [] };
          }

          const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
          const avgWordsPerSentence = words.length / sentences.length;
          const avgSyllablesPerWord = syllables / words.length;

          const readingEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
          const score = Math.max(0, Math.min(100, Math.round(readingEase)));

          return {
            ruleId: 'description_readability',
            passed: score >= 60,
            score,
            message: `Flesch-Kincaid: ${score}/100`,
            evidence: []
          };
        }
      }
    ]
  }
];

// ==================== AUDIT ENGINE ====================

export class MetadataAuditEngine {
  static evaluate(metadata: ScrapedMetadata): UnifiedMetadataAuditResult {
    console.log('[AUDIT-ENGINE] Starting metadata audit...');

    const stopwords = DEFAULT_STOPWORDS;

    // Phase 1: Detect vertical
    const verticalDetection = detectVertical(metadata);
    const verticalRuleSet = loadVerticalRuleSet(verticalDetection.verticalId);

    console.log(`[AUDIT-ENGINE] Vertical detected: ${verticalDetection.verticalId} (${verticalDetection.confidence.toFixed(2)})`);
    console.log(`[AUDIT-ENGINE] RuleSet loaded: ${verticalRuleSet?.verticalId || 'none'}`);

    // Tokenize
    const titleTokens = tokenize(metadata.title || '');
    const subtitleTokens = tokenize(metadata.subtitle || '');
    const descriptionTokens = tokenize(metadata.description || '');
    // v2.2: Tokenize keywords field (comma-separated)
    const keywordsTokens = (metadata.keywords || '')
      .split(',')
      .map(kw => kw.trim().toLowerCase())
      .filter(kw => kw.length > 0);

    const context: EvaluationContext = {
      metadata,
      category: metadata.applicationCategory,
      titleTokens,
      subtitleTokens,
      descriptionTokens,
      stopwords,
      verticalRuleSet
    };

    // Evaluate each element
    const elementResults: Record<MetadataElement, ElementScoringResult> = {
      app_name: this.evaluateElement('app_name', metadata.name || '', context),
      title: this.evaluateElement('title', metadata.title || '', context),
      subtitle: this.evaluateElement('subtitle', metadata.subtitle || '', context),
      description: this.evaluateElement('description', metadata.description || '', context)
    };

    // Calculate overall score
    const overallScore = this.calculateOverallScore(elementResults);

    // Keyword coverage
    const keywordCoverage = this.analyzeKeywordCoverage(titleTokens, subtitleTokens, descriptionTokens, stopwords);

    // v2.1: Get brand keywords (user-defined or auto-detect)
    const ownBrandKeywords = metadata.brandKeywords || extractBrandKeywords(metadata.name || metadata.title || '');
    const competitorBrandKeywords = metadata.competitorBrandKeywords || [];

    console.log(`[AUDIT-ENGINE] Brand keywords: own=[${ownBrandKeywords.join(', ')}], competitors=[${competitorBrandKeywords.join(', ')}]`);

    // Combo coverage (v2.2: Enhanced with keywords field + 4-word combos)
    const comboCoverage = this.analyzeRankingCombinations(
      titleTokens,
      subtitleTokens,
      keywordsTokens,
      stopwords,
      ownBrandKeywords,
      competitorBrandKeywords,
      metadata.title || '',
      metadata.subtitle || '',
      metadata.keywords || ''
    );

    // Phase 2: Classify intent coverage
    console.log('[AUDIT-ENGINE] Classifying search intent...');
    const intentCoverage = classifyMetadataIntent(titleTokens, subtitleTokens);
    console.log(`[AUDIT-ENGINE] Intent coverage score: ${intentCoverage.coverageScore}/100`);
    console.log(`[AUDIT-ENGINE] Title intent - Info: ${intentCoverage.titleIntent?.informational}%, Commercial: ${intentCoverage.titleIntent?.commercial}%, Trans: ${intentCoverage.titleIntent?.transactional}%`);

    // Phase 1 & 2: Generate vertical-aware and intent-aware recommendations
    const topRecommendations = this.aggregateTopRecommendations(elementResults, verticalRuleSet, verticalDetection, intentCoverage);

    // Phase 2-4: v2.0 features (Description Intelligence + Gap Analysis + Executive Recommendations)
    console.log('[AUDIT-ENGINE] Extracting app capabilities from description...');
    const capabilityMap = extractCapabilities(metadata.description || '');
    console.log(`[AUDIT-ENGINE] Capabilities extracted: ${capabilityMap.features.count} features, ${capabilityMap.benefits.count} benefits, ${capabilityMap.trust.count} trust signals`);

    console.log('[AUDIT-ENGINE] Analyzing capability gaps...');
    const gapAnalysis = analyzeCapabilityGaps(capabilityMap, verticalDetection.verticalId);
    console.log(`[AUDIT-ENGINE] Gap analysis complete: ${gapAnalysis.totalGaps} gaps found, score: ${gapAnalysis.overallGapScore}/100`);

    console.log('[AUDIT-ENGINE] Generating executive recommendations...');
    const executiveRecommendations = generateExecutiveRecommendations(gapAnalysis, capabilityMap, verticalDetection.verticalId);
    console.log(`[AUDIT-ENGINE] Executive recommendations generated: ${executiveRecommendations.totalActionItems} action items, priority: ${executiveRecommendations.overallPriority}`);

    // v2.1: Keyword Frequency Analysis (for competitive intelligence)
    console.log('[AUDIT-ENGINE] Analyzing keyword frequency (top 20 strategic keywords)...');
    const keywordFrequency = this.analyzeKeywordFrequency(comboCoverage.allCombinedCombos, 20);
    console.log(`[AUDIT-ENGINE] Keyword frequency analysis complete: ${keywordFrequency.length} strategic keywords identified`);

    // Build vertical context
    const verticalContext: VerticalContext = {
      verticalId: verticalDetection.verticalId,
      verticalName: verticalDetection.verticalLabel,
      confidence: verticalDetection.confidence,
      matchedSignals: verticalDetection.matchedSignals,
      ruleSetSource: verticalDetection.verticalId === 'base' ? 'base' : 'vertical',
    };

    console.log('[AUDIT-ENGINE] Audit complete!');

    return {
      overallScore,
      elements: elementResults,
      topRecommendations,
      keywordCoverage,
      comboCoverage,
      verticalContext,
      intentCoverage,
      capabilityMap,
      gapAnalysis,
      executiveRecommendations,
      keywordFrequency,
    };
  }

  private static evaluateElement(
    element: MetadataElement,
    text: string,
    context: EvaluationContext
  ): ElementScoringResult {
    const config = METADATA_SCORING_REGISTRY.find(c => c.element === element);
    if (!config) {
      throw new Error(`No config for element: ${element}`);
    }

    const ruleResults = config.rules.map(rule => rule.evaluator(text, context));

    const score = ruleResults.reduce((total, result, index) => {
      return total + (result.score * config.rules[index].weight);
    }, 0);

    const recommendations = ruleResults.filter(r => !r.passed).map(r => r.message);
    const insights = ruleResults.filter(r => r.passed && r.evidence && r.evidence.length > 0).map(r => r.message);

    const keywords = tokenize(text).filter(t => !context.stopwords.has(t) && t.length > 2);
    const combos = analyzeCombinations(tokenize(text), context.stopwords, 2, 4).slice(0, 10);

    return {
      element,
      score: Math.round(score),
      ruleResults,
      recommendations,
      insights,
      metadata: {
        text, // v2.1: Store original text for reuse
        characterUsage: normalizeText(text).length,
        maxCharacters: config.maxCharacters,
        keywords,
        combos
      }
    };
  }

  private static calculateOverallScore(elementResults: Record<MetadataElement, ElementScoringResult>): number {
    const weightedSum = METADATA_SCORING_REGISTRY.reduce((total, config) => {
      const elementResult = elementResults[config.element];
      return total + (elementResult.score * config.weight);
    }, 0);

    return Math.round(weightedSum);
  }

  private static aggregateTopRecommendations(
    elementResults: Record<MetadataElement, ElementScoringResult>,
    verticalRuleSet: VerticalRuleSet | null,
    verticalDetection: VerticalDetectionResult,
    intentCoverage: IntentCoverage
  ): string[] {
    const allRecs: Array<{ message: string; priority: number; severity: string }> = [];

    // 1. Add basic recommendations from element evaluation
    Object.entries(elementResults).forEach(([element, result]) => {
      result.recommendations.forEach(rec => {
        const priority = 100 - result.score;
        allRecs.push({
          message: `[${element.toUpperCase()}] ${rec}`,
          priority,
          severity: 'moderate'
        });
      });
    });

    // 2. Phase 2: Add intent-based recommendations
    if (intentCoverage.titleIntent) {
      const titleIntent = intentCoverage.titleIntent;

      // Low informational intent (< 20%)
      if (titleIntent.informational < 20 && verticalDetection.verticalId === 'language_learning') {
        allRecs.push({
          message: "[RANKING] Low informational intent detected. Language learning apps benefit from learning-focused keywords like 'learn', 'practice', 'study', or 'master' to improve educational search visibility.",
          priority: 120,
          severity: 'warning'
        });
      }

      // Low commercial intent (< 15%)
      if (titleIntent.commercial < 15) {
        allRecs.push({
          message: "[RANKING] Consider adding comparative or quality signals like 'best', 'top', or 'leading' to improve commercial intent visibility for users comparing options.",
          priority: 90,
          severity: 'info'
        });
      }

      // High navigational intent (> 50%) - brand-heavy
      if (titleIntent.navigational > 50) {
        allRecs.push({
          message: "[RANKING] Title is very brand-focused (high navigational intent). Consider adding generic discovery keywords to reach non-brand-aware users.",
          priority: 110,
          severity: 'warning'
        });
      }

      // Low transactional intent (< 10%)
      if (titleIntent.transactional < 10 && intentCoverage.coverageScore < 60) {
        allRecs.push({
          message: "[RANKING] Low transactional intent. Adding action-oriented keywords like 'free', 'download', or 'get' can improve conversion signals.",
          priority: 85,
          severity: 'info'
        });
      }
    }

    // 3. Phase 1: Add vertical-specific recommendations from ASO Bible
    if (verticalRuleSet && verticalRuleSet.recommendations) {
      const metadata = elementResults.title.metadata;
      const titleText = metadata.keywords.join(' ').toLowerCase();
      const subtitleText = elementResults.subtitle.metadata.keywords.join(' ').toLowerCase();
      const combinedText = `${titleText} ${subtitleText}`;

      console.log(`[RECOMMENDATIONS] Checking ${Object.keys(verticalRuleSet.recommendations).length} vertical-specific templates...`);

      // Check each vertical recommendation template
      Object.values(verticalRuleSet.recommendations).forEach(template => {
        let shouldAdd = false;

        // Trigger detection logic based on template ID
        switch (template.id) {
          case 'missing_learning_hook':
            shouldAdd = !/(learn|practice|speak|study|master)/i.test(combinedText);
            break;
          case 'missing_earning_term':
            shouldAdd = !/(earn|reward|cash|money|points|win)/i.test(combinedText);
            break;
          case 'missing_trust_term':
            shouldAdd = !/(secure|safe|trust|fdic|insured|bank)/i.test(combinedText);
            break;
          case 'missing_social_term':
            shouldAdd = !/(meet|match|date|chat|connect)/i.test(combinedText);
            break;
          case 'missing_action_verb':
            shouldAdd = !/(organize|plan|track|manage|create|build)/i.test(combinedText);
            break;
          case 'missing_fitness_keyword':
            shouldAdd = !/(fitness|workout|health|wellness|exercise|train)/i.test(combinedText);
            break;
          case 'missing_consumption_intent':
            shouldAdd = !/(watch|play|stream|listen|view)/i.test(combinedText);
            break;
          default:
            // For other templates, add based on severity
            if (template.severity === 'critical') {
              shouldAdd = Math.random() < 0.3; // 30% chance for critical
            }
        }

        if (shouldAdd) {
          const priorityBoost = template.severity === 'critical' ? 50 :
                               template.severity === 'warning' ? 30 : 10;

          // Add vertical-specific phrase examples if available
          let message = template.message;
          if (message.includes('generic phrases') || message.includes('e.g.')) {
            const examples = formatGenericPhraseExamples(verticalDetection.verticalId, 2);
            if (examples) {
              message = message.replace(/\(e\.g\.[^)]*\)/, examples);
            }
          }

          allRecs.push({
            message,
            priority: 85 + priorityBoost,
            severity: template.severity
          });

          console.log(`[RECOMMENDATIONS] Added: ${template.id} (${template.severity})`);
        }
      });
    }

    // Sort by priority and severity, return top 8
    const sorted = allRecs.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (b.severity === 'critical' && a.severity !== 'critical') return 1;
      return b.priority - a.priority;
    });

    const final = sorted.slice(0, 8).map(r => r.message);
    console.log(`[RECOMMENDATIONS] Returning ${final.length} recommendations (${allRecs.length} total generated)`);

    return final;
  }

  private static analyzeKeywordCoverage(
    titleTokens: string[],
    subtitleTokens: string[],
    descriptionTokens: string[],
    stopwords: Set<string>
  ) {
    const titleKeywords = titleTokens.filter(t => !stopwords.has(t) && t.length > 2);
    const titleKeywordSet = new Set(titleKeywords);

    const subtitleKeywords = subtitleTokens.filter(t => !stopwords.has(t) && t.length > 2);
    const subtitleNewKeywords = subtitleKeywords.filter(t => !titleKeywordSet.has(t));

    const allTitleSubtitleSet = new Set([...titleKeywords, ...subtitleKeywords]);
    const descriptionKeywords = descriptionTokens.filter(t => !stopwords.has(t) && t.length > 2);
    const descriptionNewKeywords = descriptionKeywords.filter(t => !allTitleSubtitleSet.has(t)).slice(0, 20);

    // Only count title + subtitle keywords for algorithmic visibility (description doesn't impact ranking)
    const allUniqueKeywords = new Set([...titleKeywords, ...subtitleKeywords]);

    return {
      totalUniqueKeywords: allUniqueKeywords.size,
      titleKeywords,
      subtitleNewKeywords,
      descriptionNewKeywords
    };
  }

  /**
   * Analyze combo presence in text with consecutive detection
   */
  private static analyzeComboInText(
    combo: string,
    text: string
  ): { exists: boolean; isConsecutive: boolean; positions: number[] } {
    const normalizedText = text.toLowerCase();
    const normalizedCombo = combo.toLowerCase();
    const comboWords = normalizedCombo.split(' ');

    // Check for exact phrase match (consecutive)
    if (normalizedText.includes(normalizedCombo)) {
      return {
        exists: true,
        isConsecutive: true,
        positions: [normalizedText.indexOf(normalizedCombo)],
      };
    }

    // Check for words in order (non-consecutive)
    const positions: number[] = [];
    let lastIndex = -1;
    for (const word of comboWords) {
      const index = normalizedText.indexOf(word, lastIndex + 1);
      if (index === -1) {
        return { exists: false, isConsecutive: false, positions: [] };
      }
      positions.push(index);
      lastIndex = index;
    }

    // Words found in order but not consecutive
    return {
      exists: true,
      isConsecutive: false,
      positions,
    };
  }

  /**
   * Classify combo strength based on App Store ranking algorithm
   */
  private static classifyComboStrength(
    comboText: string,
    titleText: string,
    subtitleText: string,
    titleKeywords: string[],
    subtitleKeywords: string[],
    keywordsText?: string,
    keywordsFieldKeywords?: string[]
  ): {
    strength: ComboStrength;
    strengthScore: number;
    isConsecutive: boolean;
    canStrengthen: boolean;
    strengtheningSuggestion?: string;
  } {
    const titleAnalysis = this.analyzeComboInText(comboText, titleText);
    const subtitleAnalysis = this.analyzeComboInText(comboText, subtitleText);
    const keywordsAnalysis = keywordsText
      ? this.analyzeComboInText(comboText, keywordsText)
      : { exists: false, isConsecutive: false, positions: [] };
    const comboWords = comboText.split(' ');

    // Determine which fields contain the complete combo phrase
    const inTitle = titleAnalysis.exists;
    const inSubtitle = subtitleAnalysis.exists;
    const inKeywords = keywordsAnalysis.exists;

    // Determine which fields contribute individual keywords (for cross-element detection)
    const hasWordsFromTitle = comboWords.some((word) =>
      titleKeywords.some((kw) => kw.toLowerCase() === word.toLowerCase())
    );
    const hasWordsFromSubtitle = comboWords.some((word) =>
      subtitleKeywords.some((kw) => kw.toLowerCase() === word.toLowerCase())
    );
    const hasWordsFromKeywords =
      keywordsFieldKeywords &&
      comboWords.some((word) =>
        keywordsFieldKeywords.some((kw) => kw.toLowerCase() === word.toLowerCase())
      );

    // Count how many fields contribute keywords to this combo
    const fieldContributions = [
      hasWordsFromTitle,
      hasWordsFromSubtitle,
      hasWordsFromKeywords,
    ].filter(Boolean).length;

    // Determine strength based on App Store algorithm hierarchy
    let strength: ComboStrength;
    let strengthScore: number;
    let isConsecutive = false;
    let canStrengthen = false;
    let strengtheningSuggestion: string | undefined;

    // TIER 1: Title Consecutive (score: 100)
    if (inTitle && titleAnalysis.isConsecutive) {
      strength = ComboStrength.TITLE_CONSECUTIVE;
      strengthScore = 100;
      isConsecutive = true;
      canStrengthen = false;

      // TIER 2: Title Non-Consecutive (score: 85)
    } else if (inTitle && !inSubtitle && !inKeywords && !titleAnalysis.isConsecutive) {
      strength = ComboStrength.TITLE_NON_CONSECUTIVE;
      strengthScore = 85;
      isConsecutive = false;
      canStrengthen = true;
      strengtheningSuggestion = `Make words consecutive in title for maximum ranking power`;

      // TIER 2: Title + Keywords Cross (score: 85)
    } else if (
      hasWordsFromTitle &&
      hasWordsFromKeywords &&
      !hasWordsFromSubtitle &&
      fieldContributions === 2
    ) {
      strength = ComboStrength.TITLE_KEYWORDS_CROSS;
      strengthScore = 85;
      isConsecutive = false;
      canStrengthen = true;
      strengtheningSuggestion = `Move keywords from keywords field to title for stronger ranking`;

      // TIER 3: Title + Subtitle Cross (score: 70)
    } else if (
      hasWordsFromTitle &&
      hasWordsFromSubtitle &&
      !hasWordsFromKeywords &&
      fieldContributions === 2
    ) {
      strength = ComboStrength.CROSS_ELEMENT;
      strengthScore = 70;
      isConsecutive = false;
      canStrengthen = true;
      strengtheningSuggestion = `Move all keywords to title to strengthen from MEDIUM to STRONG`;

      // TIER 4: Keywords Consecutive (score: 50)
    } else if (inKeywords && !inTitle && !inSubtitle && keywordsAnalysis.isConsecutive) {
      strength = ComboStrength.KEYWORDS_CONSECUTIVE;
      strengthScore = 50;
      isConsecutive = true;
      canStrengthen = true;
      strengtheningSuggestion = `Move to title to strengthen from WEAK to STRONG`;

      // TIER 4: Subtitle Consecutive (score: 50)
    } else if (inSubtitle && !inTitle && !inKeywords && subtitleAnalysis.isConsecutive) {
      strength = ComboStrength.SUBTITLE_CONSECUTIVE;
      strengthScore = 50;
      isConsecutive = true;
      canStrengthen = true;
      strengtheningSuggestion = `Move to title to strengthen from WEAK to STRONG`;

      // TIER 5: Keywords + Subtitle Cross (score: 35)
    } else if (
      hasWordsFromKeywords &&
      hasWordsFromSubtitle &&
      !hasWordsFromTitle &&
      fieldContributions === 2
    ) {
      strength = ComboStrength.KEYWORDS_SUBTITLE_CROSS;
      strengthScore = 35;
      isConsecutive = false;
      canStrengthen = true;
      strengtheningSuggestion = `Move all keywords to title to strengthen to STRONG`;

      // TIER 6: Keywords Non-Consecutive (score: 25)
    } else if (inKeywords && !inTitle && !inSubtitle && !keywordsAnalysis.isConsecutive) {
      strength = ComboStrength.KEYWORDS_NON_CONSECUTIVE;
      strengthScore = 25;
      isConsecutive = false;
      canStrengthen = true;
      strengtheningSuggestion = `Move to title and make consecutive for maximum ranking`;

      // TIER 6: Subtitle Non-Consecutive (score: 25)
    } else if (inSubtitle && !inTitle && !inKeywords && !subtitleAnalysis.isConsecutive) {
      strength = ComboStrength.SUBTITLE_NON_CONSECUTIVE;
      strengthScore = 25;
      isConsecutive = false;
      canStrengthen = true;
      strengtheningSuggestion = `Move to title and make consecutive for maximum ranking`;

      // TIER 7: Three-way Cross (score: 15)
    } else if (fieldContributions === 3) {
      strength = ComboStrength.THREE_WAY_CROSS;
      strengthScore = 15;
      isConsecutive = false;
      canStrengthen = true;
      strengtheningSuggestion = `Consolidate all keywords into title for much stronger ranking`;

      // MISSING: Not in any field (score: 0)
    } else {
      strength = ComboStrength.MISSING;
      strengthScore = 0;
      isConsecutive = false;

      // Check if we can strengthen by moving existing keywords
      const allWordsInSubtitle = comboWords.every((word) =>
        subtitleKeywords.some((kw) => kw.toLowerCase() === word.toLowerCase())
      );
      const allWordsInKeywords =
        keywordsFieldKeywords &&
        comboWords.every((word) =>
          keywordsFieldKeywords.some((kw) => kw.toLowerCase() === word.toLowerCase())
        );
      const someWordsInTitle = comboWords.some((word) =>
        titleKeywords.some((kw) => kw.toLowerCase() === word.toLowerCase())
      );

      if (allWordsInSubtitle || allWordsInKeywords || someWordsInTitle) {
        canStrengthen = true;
        strengtheningSuggestion = `Add to title to enable ranking for this combination`;
      } else {
        canStrengthen = false; // Would need to add brand new keywords
      }
    }

    return {
      strength,
      strengthScore,
      isConsecutive,
      canStrengthen,
      strengtheningSuggestion,
    };
  }

  private static analyzeComboCoverage(
    titleTokens: string[],
    subtitleTokens: string[],
    stopwords: Set<string>
  ) {
    const titleCombos = analyzeCombinations(titleTokens, stopwords, 2, 4);
    const titleComboSet = new Set(titleCombos);

    const combinedTokens = [...titleTokens, ...subtitleTokens];
    const allCombinedCombos = analyzeCombinations(combinedTokens, stopwords, 2, 4);

    const subtitleNewCombos = allCombinedCombos.filter(c => !titleComboSet.has(c));

    return {
      totalCombos: allCombinedCombos.length,
      titleCombos,
      subtitleNewCombos,
      allCombinedCombos
    };
  }

  /**
   * Helper: Calculate stats from a filtered combo array
   * Used to generate stats for different brand type filters (all, generic, branded)
   */
  private static calculateComboStats(combos: GeneratedCombo[]) {
    const existingCombos = combos.filter(c => c.exists);
    const missingCombos = combos.filter(c => !c.exists);

    return {
      totalPossible: combos.length,
      existing: existingCombos.length,
      missing: missingCombos.length,
      coveragePct: combos.length > 0
        ? Math.round((existingCombos.length / combos.length) * 100)
        : 0,
      titleConsecutive: combos.filter(c => c.strength === ComboStrength.TITLE_CONSECUTIVE).length,
      titleNonConsecutive: combos.filter(c => c.strength === ComboStrength.TITLE_NON_CONSECUTIVE).length,
      titleKeywordsCross: combos.filter(c => c.strength === ComboStrength.TITLE_KEYWORDS_CROSS).length,
      crossElement: combos.filter(c => c.strength === ComboStrength.CROSS_ELEMENT).length,
      keywordsConsecutive: combos.filter(c => c.strength === ComboStrength.KEYWORDS_CONSECUTIVE).length,
      subtitleConsecutive: combos.filter(c => c.strength === ComboStrength.SUBTITLE_CONSECUTIVE).length,
      keywordsSubtitleCross: combos.filter(c => c.strength === ComboStrength.KEYWORDS_SUBTITLE_CROSS).length,
      keywordsNonConsecutive: combos.filter(c => c.strength === ComboStrength.KEYWORDS_NON_CONSECUTIVE).length,
      subtitleNonConsecutive: combos.filter(c => c.strength === ComboStrength.SUBTITLE_NON_CONSECUTIVE).length,
      threeWayCross: combos.filter(c => c.strength === ComboStrength.THREE_WAY_CROSS).length,
    };
  }

  /**
   * Analyze ranking combinations with full permutations (v2.1)
   *
   * This replaces n-gram based analyzeComboCoverage for ranking potential analysis.
   * Generates ALL permutations of 2-word combos (both orders) and 3-word combos (one order).
   * Filters out branded combos to focus on generic keyword ranking potential.
   *
   * Key differences from analyzeComboCoverage:
   *   - Uses permutations instead of n-grams (e.g., both "care wellness" AND "wellness care")
   *   - Filters out brand keywords (own brand + competitor brands)
   *   - Only 2-word and 3-word combos (no 4-word to avoid explosion)
   *   - Returns generic combos only for fair competitive analysis
   *
   * @param titleTokens - Tokens from title
   * @param subtitleTokens - Tokens from subtitle
   * @param stopwords - Stopwords to filter
   * @param ownBrandKeywords - App's own brand keywords (to exclude from generic combos)
   * @param competitorBrandKeywords - Competitor brand keywords (to exclude from generic combos)
   * @returns Ranking combo coverage with generic combos only
   */
  private static analyzeRankingCombinations(
    titleTokens: string[],
    subtitleTokens: string[],
    keywordsTokens: string[] = [],
    stopwords: Set<string>,
    ownBrandKeywords: string[] = [],
    competitorBrandKeywords: string[] = [],
    titleText: string = '',
    subtitleText: string = '',
    keywordsText: string = ''
  ) {
    // 1. Combine title + subtitle + keywords tokens and filter stopwords to get keywords
    const allTokens = [...titleTokens, ...subtitleTokens, ...keywordsTokens];
    const keywords = allTokens.filter(t => !stopwords.has(t));

    console.log(`[AUDIT-ENGINE] Ranking combos: ${keywords.length} keywords from title + subtitle + keywords field (title: ${titleTokens.length}, subtitle: ${subtitleTokens.length}, keywords: ${keywordsTokens.length})`);

    // 2. Generate all 2-word permutations (BOTH orders)
    const twoWordCombos: string[] = [];
    for (let i = 0; i < keywords.length - 1; i++) {
      for (let j = i + 1; j < keywords.length; j++) {
        twoWordCombos.push(`${keywords[i]} ${keywords[j]}`);
        twoWordCombos.push(`${keywords[j]} ${keywords[i]}`); // Both orders
      }
    }

    // 3. Generate all 3-word combinations (one order - C(n,3))
    const threeWordCombos: string[] = [];
    for (let i = 0; i < keywords.length - 2; i++) {
      for (let j = i + 1; j < keywords.length - 1; j++) {
        for (let k = j + 1; k < keywords.length; k++) {
          threeWordCombos.push(`${keywords[i]} ${keywords[j]} ${keywords[k]}`);
        }
      }
    }

    // 4. Generate all 4-word combinations (one order - C(n,4))
    const fourWordCombos: string[] = [];
    for (let i = 0; i < keywords.length - 3; i++) {
      for (let j = i + 1; j < keywords.length - 2; j++) {
        for (let k = j + 1; k < keywords.length - 1; k++) {
          for (let l = k + 1; l < keywords.length; l++) {
            fourWordCombos.push(`${keywords[i]} ${keywords[j]} ${keywords[k]} ${keywords[l]}`);
          }
        }
      }
    }

    // 5. Combine all combos before filtering
    const allUnfilteredCombos = [...twoWordCombos, ...threeWordCombos, ...fourWordCombos];

    console.log(`[AUDIT-ENGINE] Generated ${allUnfilteredCombos.length} combos (${twoWordCombos.length} 2-word + ${threeWordCombos.length} 3-word + ${fourWordCombos.length} 4-word)`);

    // 6. Filter out branded combos (own brand + competitor brands)
    const genericCombos = filterGenericCombos(
      allUnfilteredCombos,
      ownBrandKeywords,
      competitorBrandKeywords
    );

    const genericTwoWord = filterGenericCombos(twoWordCombos, ownBrandKeywords, competitorBrandKeywords);
    const genericThreeWord = filterGenericCombos(threeWordCombos, ownBrandKeywords, competitorBrandKeywords);
    const genericFourWord = filterGenericCombos(fourWordCombos, ownBrandKeywords, competitorBrandKeywords);

    // 7. Log brand filtering stats
    const brandStats = getBrandStats(allUnfilteredCombos, ownBrandKeywords, competitorBrandKeywords);
    console.log(`[AUDIT-ENGINE] Brand filtering: ${brandStats.brand} brand, ${brandStats.competitorBrand} competitor, ${brandStats.generic} generic (${(brandStats.genericRatio * 100).toFixed(1)}% generic)`);

    // 7. Separate title-only vs subtitle-new combos (for tracking subtitle value)
    const titleKeywords = titleTokens.filter(t => !stopwords.has(t));
    const titleOnlyCombos: string[] = [];

    // Generate title-only 2-word combos
    for (let i = 0; i < titleKeywords.length - 1; i++) {
      for (let j = i + 1; j < titleKeywords.length; j++) {
        titleOnlyCombos.push(`${titleKeywords[i]} ${titleKeywords[j]}`);
        titleOnlyCombos.push(`${titleKeywords[j]} ${titleKeywords[i]}`);
      }
    }

    // Generate title-only 3-word combos
    for (let i = 0; i < titleKeywords.length - 2; i++) {
      for (let j = i + 1; j < titleKeywords.length - 1; j++) {
        for (let k = j + 1; k < titleKeywords.length; k++) {
          titleOnlyCombos.push(`${titleKeywords[i]} ${titleKeywords[j]} ${titleKeywords[k]}`);
        }
      }
    }

    const genericTitleOnly = filterGenericCombos(titleOnlyCombos, ownBrandKeywords, competitorBrandKeywords);
    const titleComboSet = new Set(genericTitleOnly);
    const subtitleNewCombos = genericCombos.filter(c => !titleComboSet.has(c));

    console.log(`[AUDIT-ENGINE] Ranking combos result: ${genericCombos.length} total generic (${genericTitleOnly.length} title-only + ${subtitleNewCombos.length} subtitle-new)`);

    // Generate rich GeneratedCombo objects with strength classification
    const titleKeywordTokens = titleTokens.filter(t => !stopwords.has(t));
    const subtitleKeywordTokens = subtitleTokens.filter(t => !stopwords.has(t));
    const keywordsKeywordTokens = keywordsTokens.filter(t => !stopwords.has(t));

    const generatedCombos: GeneratedCombo[] = allUnfilteredCombos.map((comboText) => {
      const comboKeywords = comboText.split(' ');
      const comboLength = comboKeywords.length;

      // Classify strength
      const strengthAnalysis = this.classifyComboStrength(
        comboText,
        titleText,
        subtitleText,
        titleKeywordTokens,
        subtitleKeywordTokens,
        keywordsText,
        keywordsKeywordTokens
      );

      // Determine if combo contains brand keywords
      const lowerCombo = comboText.toLowerCase();
      const containsOwnBrand = ownBrandKeywords.some(brand =>
        lowerCombo.includes(brand.toLowerCase())
      );
      const containsCompetitorBrand = competitorBrandKeywords.some(brand =>
        lowerCombo.includes(brand.toLowerCase())
      );
      const isBranded = containsOwnBrand || containsCompetitorBrand;
      const isGeneric = !isBranded;

      // Determine source
      let source: 'title' | 'subtitle' | 'keywords' | 'both' | 'cross' | 'missing';
      const inTitleOnly = titleComboSet.has(comboText);
      const inAllCombos = genericCombos.includes(comboText);

      if (strengthAnalysis.strength === ComboStrength.MISSING) {
        source = 'missing';
      } else if (
        strengthAnalysis.strength === ComboStrength.CROSS_ELEMENT ||
        strengthAnalysis.strength === ComboStrength.TITLE_KEYWORDS_CROSS ||
        strengthAnalysis.strength === ComboStrength.KEYWORDS_SUBTITLE_CROSS ||
        strengthAnalysis.strength === ComboStrength.THREE_WAY_CROSS
      ) {
        source = 'cross';
      } else if (inTitleOnly) {
        source = 'title';
      } else if (
        strengthAnalysis.strength === ComboStrength.SUBTITLE_CONSECUTIVE ||
        strengthAnalysis.strength === ComboStrength.SUBTITLE_NON_CONSECUTIVE
      ) {
        source = 'subtitle';
      } else if (
        strengthAnalysis.strength === ComboStrength.KEYWORDS_CONSECUTIVE ||
        strengthAnalysis.strength === ComboStrength.KEYWORDS_NON_CONSECUTIVE
      ) {
        source = 'keywords';
      } else {
        source = 'both';
      }

      const generatedCombo: GeneratedCombo = {
        id: `combo-${comboText.replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: comboText,
        keywords: comboKeywords,
        length: comboLength,
        exists: strengthAnalysis.strength !== ComboStrength.MISSING,
        source,
        strength: strengthAnalysis.strength,
        strengthScore: strengthAnalysis.strengthScore,
        isConsecutive: strengthAnalysis.isConsecutive,
        canStrengthen: strengthAnalysis.canStrengthen,
        strengtheningSuggestion: strengthAnalysis.strengtheningSuggestion,
        isBranded,
        isGeneric,
      };

      return generatedCombo;
    });

    console.log(`[AUDIT-ENGINE] Generated ${generatedCombos.length} GeneratedCombo objects with strength classification`);

    // Calculate strength tier stats
    const strengthStats = {
      titleConsecutive: generatedCombos.filter(c => c.strength === ComboStrength.TITLE_CONSECUTIVE).length,
      titleNonConsecutive: generatedCombos.filter(c => c.strength === ComboStrength.TITLE_NON_CONSECUTIVE).length,
      titleKeywordsCross: generatedCombos.filter(c => c.strength === ComboStrength.TITLE_KEYWORDS_CROSS).length,
      crossElement: generatedCombos.filter(c => c.strength === ComboStrength.CROSS_ELEMENT).length,
      keywordsConsecutive: generatedCombos.filter(c => c.strength === ComboStrength.KEYWORDS_CONSECUTIVE).length,
      subtitleConsecutive: generatedCombos.filter(c => c.strength === ComboStrength.SUBTITLE_CONSECUTIVE).length,
      keywordsSubtitleCross: generatedCombos.filter(c => c.strength === ComboStrength.KEYWORDS_SUBTITLE_CROSS).length,
      keywordsNonConsecutive: generatedCombos.filter(c => c.strength === ComboStrength.KEYWORDS_NON_CONSECUTIVE).length,
      subtitleNonConsecutive: generatedCombos.filter(c => c.strength === ComboStrength.SUBTITLE_NON_CONSECUTIVE).length,
      threeWayCross: generatedCombos.filter(c => c.strength === ComboStrength.THREE_WAY_CROSS).length,
      missing: generatedCombos.filter(c => c.strength === ComboStrength.MISSING).length,
    };

    const existingCombosCount = generatedCombos.filter(c => c.exists).length;
    const coveragePct = allUnfilteredCombos.length > 0
      ? Math.round((existingCombosCount / allUnfilteredCombos.length) * 100)
      : 0;

    // Calculate stats by brand type (v2.3: Frontend brand filtering support)
    const genericOnlyCombos = generatedCombos.filter(c => c.isGeneric);
    const brandedOnlyCombos = generatedCombos.filter(c => c.isBranded);

    const statsAll = {
      totalPossible: allUnfilteredCombos.length,
      existing: existingCombosCount,
      missing: generatedCombos.filter(c => !c.exists).length,
      coveragePct,
      ...strengthStats,
    };
    const statsGeneric = this.calculateComboStats(genericOnlyCombos);
    const statsBranded = this.calculateComboStats(brandedOnlyCombos);

    console.log(`[AUDIT-ENGINE] Stats breakdown: all=${statsAll.totalPossible}, generic=${statsGeneric.totalPossible}, branded=${statsBranded.totalPossible}`);

    return {
      // NEW: Rich combo objects with strength classification
      combos: generatedCombos,
      stats: statsAll,  // Keep for backwards compatibility
      // NEW: Pre-calculated stats for each brand type
      statsByBrandType: {
        all: statsAll,
        generic: statsGeneric,
        branded: statsBranded,
      },
      // Legacy fields for backward compatibility
      totalCombos: genericCombos.length,
      titleCombos: genericTitleOnly,
      subtitleNewCombos: subtitleNewCombos,
      allCombinedCombos: genericCombos,
      twoWordCombos: genericTwoWord.length,
      threeWordCombos: genericThreeWord.length,
      fourWordCombos: genericFourWord.length,
      // Include brand stats for debugging
      brandStats
    };
  }

  /**
   * Analyze keyword frequency across all combinations
   * Returns keywords sorted by total combo count (descending)
   *
   * Used for competitive intelligence - identifying strategic keywords
   * that appear in the most combinations from title + subtitle.
   */
  private static analyzeKeywordFrequency(
    allCombos: string[],
    topN: number = 20
  ): KeywordFrequencyResult[] {
    // Map to track keyword stats
    const keywordStats = new Map<string, {
      total: number;
      twoWord: number;
      threeWord: number;
      fourPlus: number;
      combos: Set<string>;
    }>();

    // Process each combo
    for (const combo of allCombos) {
      // Extract individual keywords from combo text
      const keywords = combo
        .toLowerCase()
        .split(/\s+/)
        .filter(k => k.length > 0);

      const comboLength = keywords.length;

      // Track each keyword
      for (const keyword of keywords) {
        if (!keywordStats.has(keyword)) {
          keywordStats.set(keyword, {
            total: 0,
            twoWord: 0,
            threeWord: 0,
            fourPlus: 0,
            combos: new Set(),
          });
        }

        const stats = keywordStats.get(keyword)!;
        stats.total += 1;
        stats.combos.add(combo);

        // Increment length-specific counter
        if (comboLength === 2) {
          stats.twoWord += 1;
        } else if (comboLength === 3) {
          stats.threeWord += 1;
        } else if (comboLength >= 4) {
          stats.fourPlus += 1;
        }
      }
    }

    // Convert to array and sort by total count
    const results: KeywordFrequencyResult[] = Array.from(keywordStats.entries())
      .map(([keyword, stats]) => ({
        keyword,
        totalCombos: stats.total,
        twoWordCombos: stats.twoWord,
        threeWordCombos: stats.threeWord,
        fourPlusCombos: stats.fourPlus,
        sampleCombos: Array.from(stats.combos).slice(0, 5), // Max 5 samples
      }))
      .sort((a, b) => b.totalCombos - a.totalCombos)
      .slice(0, topN); // Return top N

    return results;
  }
}
