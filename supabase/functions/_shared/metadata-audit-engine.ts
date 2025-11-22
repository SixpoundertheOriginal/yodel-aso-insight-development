/**
 * Metadata Audit Engine (Deno-compatible)
 *
 * Lightweight version for Edge Functions.
 * Core scoring logic extracted from frontend engine.
 */

// ==================== TYPES ====================

export type MetadataElement = 'app_name' | 'title' | 'subtitle' | 'description';

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
    characterUsage: number;
    maxCharacters: number;
    keywords: string[];
    combos?: string[];
  };
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
    totalCombos: number;
    titleCombos: string[];
    subtitleNewCombos: string[];
    allCombinedCombos: string[];
  };
}

interface ScrapedMetadata {
  name?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  applicationCategory?: string;
}

interface EvaluationContext {
  metadata: ScrapedMetadata;
  category?: string;
  titleTokens: string[];
  subtitleTokens: string[];
  descriptionTokens: string[];
  stopwords: Set<string>;
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
          const length = text.length;
          const wordCount = text.split(/\s+/).filter(Boolean).length;

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
          const charCount = text.length;
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
          const charCount = text.length;
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
          const hookKeywords = ['discover', 'experience', 'transform', 'achieve', 'unlock'];
          const hasHookKeyword = hookKeywords.some(k => firstParagraph.toLowerCase().includes(k));

          const score = hasHookKeyword ? 85 : 65;

          return {
            ruleId: 'description_hook_strength',
            passed: score >= 70,
            score,
            message: hasHookKeyword ? 'Strong opening hook' : 'Consider adding hook words',
            evidence: hasHookKeyword ? hookKeywords.filter(k => firstParagraph.toLowerCase().includes(k)) : []
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
    const stopwords = DEFAULT_STOPWORDS;

    // Tokenize
    const titleTokens = tokenize(metadata.title || '');
    const subtitleTokens = tokenize(metadata.subtitle || '');
    const descriptionTokens = tokenize(metadata.description || '');

    const context: EvaluationContext = {
      metadata,
      category: metadata.applicationCategory,
      titleTokens,
      subtitleTokens,
      descriptionTokens,
      stopwords
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

    // Top recommendations
    const topRecommendations = this.aggregateTopRecommendations(elementResults);

    // Keyword coverage
    const keywordCoverage = this.analyzeKeywordCoverage(titleTokens, subtitleTokens, descriptionTokens, stopwords);

    // Combo coverage
    const comboCoverage = this.analyzeComboCoverage(titleTokens, subtitleTokens, stopwords);

    return {
      overallScore,
      elements: elementResults,
      topRecommendations,
      keywordCoverage,
      comboCoverage
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
        characterUsage: text.length,
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

  private static aggregateTopRecommendations(elementResults: Record<MetadataElement, ElementScoringResult>): string[] {
    const allRecs: Array<{ message: string; priority: number }> = [];

    Object.entries(elementResults).forEach(([element, result]) => {
      result.recommendations.forEach(rec => {
        const priority = 100 - result.score;
        allRecs.push({ message: `[${element.toUpperCase()}] ${rec}`, priority });
      });
    });

    return allRecs.sort((a, b) => b.priority - a.priority).slice(0, 5).map(r => r.message);
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

    const allUniqueKeywords = new Set([...titleKeywords, ...subtitleKeywords, ...descriptionKeywords]);

    return {
      totalUniqueKeywords: allUniqueKeywords.size,
      titleKeywords,
      subtitleNewKeywords,
      descriptionNewKeywords
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
}
