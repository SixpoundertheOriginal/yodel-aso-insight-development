/**
 * ASO-Aware Tokenization Utility
 *
 * Provides tokenization and stopword filtering specifically designed for App Store metadata analysis.
 *
 * Key Features:
 * - Normalizes visual separators (|, –, —) to spaces
 * - Removes punctuation correctly without creating ghost tokens
 * - Provides both raw tokens and filtered keywords
 * - Exposes noise ratio for quality scoring
 */

/**
 * Extended stopword list for ASO metadata analysis
 *
 * Includes:
 * - Common English stopwords
 * - ASO-specific terms (app, free, iphone, ipad)
 * - Generic qualifiers (best, top, great, new)
 * - Numbers and ordinals
 */
const ASO_STOPWORDS = new Set([
  // Articles & Determiners
  'a', 'an', 'and', 'the', 'for', 'with', 'on', 'in', 'to', 'of', 'by', 'is', 'it', 'at', 'or', 'as',

  // Verbs (common, low-value)
  'are', 'be', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must',

  // Pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'theirs', 'our', 'ours', 'your', 'yours',
  'my', 'mine', 'his', 'her', 'hers', 'its', 'this', 'that', 'these', 'those',

  // Conjunctions & Prepositions
  'but', 'if', 'or', 'because', 'as', 'until', 'while', 'about', 'above', 'across', 'after', 'against',
  'along', 'among', 'around', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond',
  'during', 'except', 'inside', 'into', 'near', 'off', 'onto', 'over', 'through', 'toward', 'under',
  'underneath', 'upon', 'within', 'without',

  // Adverbs & Adjectives (generic)
  'all', 'any', 'both', 'each', 'every', 'few', 'more', 'most', 'much', 'many', 'little', 'less',
  'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',

  // Location & Direction
  'there', 'here', 'where', 'when', 'how', 'why', 'what', 'which', 'who', 'whom', 'whose',
  'up', 'down', 'out', 'in', 'on', 'off',

  // Numbers
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',

  // Ordinals
  'first', 'second', 'third', 'fourth', 'fifth', 'last', 'next',

  // Generic qualifiers (ASO noise)
  'new', 'best', 'top', 'great', 'good', 'better', 'amazing', 'awesome', 'perfect', 'ultimate',
  'premium', 'pro', 'plus', 'lite', 'free',

  // ASO-specific platform terms
  'app', 'apps', 'application', 'iphone', 'ipad', 'ios', 'apple', 'watch', 'mac',

  // Connectors often used in descriptions
  'from', 'then', 'now', 'get', 'lets', "let's"
]);

/**
 * Tokenization result with both raw and filtered tokens
 */
export interface TokenizationResult {
  /** All tokens after normalization */
  allTokens: string[];

  /** Meaningful keywords (stopwords removed, length > 2) */
  keywords: string[];

  /** Ignored tokens (stopwords + short tokens) */
  ignored: string[];

  /** Noise ratio (0-1): proportion of tokens that are stopwords/short */
  noiseRatio: number;
}

/**
 * Tokenizes text for ASO metadata analysis
 *
 * Process:
 * 1. Lowercase conversion
 * 2. Normalize visual separators (|, –, —) to spaces
 * 3. Strip punctuation (but preserve apostrophes in contractions)
 * 4. Split on whitespace
 * 5. Remove empty tokens
 *
 * Examples:
 * - "Pimsleur | Language Learning" → ["pimsleur", "language", "learning"]
 * - "Learn Spanish – Fast & Easy!" → ["learn", "spanish", "fast", "easy"]
 * - "Don't miss out" → ["don't", "miss", "out"] or ["dont", "miss", "out"]
 *
 * @param text - Raw metadata text
 * @returns Array of normalized tokens
 */
export function tokenizeForASO(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  return text
    .toLowerCase()
    // Normalize visual separators to spaces BEFORE stripping punctuation
    .replace(/[|–—]/g, ' ')
    // Replace common punctuation with spaces (preserve word boundaries)
    .replace(/[^\w\s']/g, ' ')
    // Handle apostrophes: remove them entirely for simplicity
    // "don't" → "dont", "it's" → "its"
    .replace(/'/g, '')
    // Split on whitespace
    .split(/\s+/)
    // Remove empty tokens
    .filter(token => token.length > 0);
}

/**
 * Filters tokens into keywords and ignored tokens
 *
 * Filtering logic:
 * - Stopwords (from ASO_STOPWORDS set) → ignored
 * - Tokens with length <= 2 (e.g., "50", "in", "x") → ignored
 * - Everything else → keywords
 *
 * @param tokens - Array of tokens from tokenizeForASO()
 * @param customStopwords - Optional additional stopwords to filter (merged with ASO_STOPWORDS)
 * @returns Object with keywords, ignored tokens, and noise ratio
 */
export function filterStopwords(
  tokens: string[],
  customStopwords?: Set<string>
): TokenizationResult {
  if (!tokens || tokens.length === 0) {
    return {
      allTokens: [],
      keywords: [],
      ignored: [],
      noiseRatio: 0
    };
  }

  // Merge default ASO stopwords with custom stopwords
  const stopwords = customStopwords
    ? new Set([...ASO_STOPWORDS, ...customStopwords])
    : ASO_STOPWORDS;

  const keywords: string[] = [];
  const ignored: string[] = [];

  for (const token of tokens) {
    // Filter out stopwords and short tokens (length <= 2)
    if (stopwords.has(token) || token.length <= 2) {
      ignored.push(token);
    } else {
      keywords.push(token);
    }
  }

  // Calculate noise ratio
  const noiseRatio = tokens.length > 0 ? ignored.length / tokens.length : 0;

  return {
    allTokens: tokens,
    keywords,
    ignored,
    noiseRatio
  };
}

/**
 * One-step tokenization + filtering for convenience
 *
 * Combines tokenizeForASO() and filterStopwords() into a single call.
 *
 * @param text - Raw metadata text
 * @param customStopwords - Optional additional stopwords
 * @returns TokenizationResult with keywords and noise metrics
 */
export function analyzeText(
  text: string,
  customStopwords?: Set<string>
): TokenizationResult {
  const tokens = tokenizeForASO(text);
  return filterStopwords(tokens, customStopwords);
}

/**
 * Gets the default ASO stopwords set (for external use)
 *
 * Useful for rules that need to check if a specific token is a stopword.
 *
 * @returns Set of ASO stopwords
 */
export function getASOStopwords(): Set<string> {
  return new Set(ASO_STOPWORDS);
}
