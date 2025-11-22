/**
 * Combo Engine V2
 *
 * Advanced combo generation with:
 * - Stopword-bridged combinations
 * - Cross-element combinations (title ↔ subtitle)
 * - ASO relevance-driven pairing
 * - Semantic pairing detection (language + action verbs)
 * - Enhanced brand detection
 */

export type TokenRelevance = 0 | 1 | 2 | 3;

export interface ComboGenerationOptions {
  titleTokens: string[];
  subtitleTokens: string[];
  stopwords: Set<string>;
  getTokenRelevance: (token: string) => TokenRelevance;
  minLength?: number;
  maxLength?: number;
}

export interface EnhancedCombo {
  text: string;
  type: 'sequential' | 'stopword_bridged' | 'cross_element' | 'semantic_pair';
  relevanceScore: number;
  source: 'title' | 'subtitle' | 'title+subtitle';
}

/**
 * Detects semantic pairs (language + action verb)
 * e.g., "learn spanish", "speak french", "practice english"
 */
function detectSemanticPair(
  word1: string,
  word2: string,
  getRelevance: (token: string) => TokenRelevance
): boolean {
  const languages = /^(english|spanish|french|german|italian|chinese|japanese|korean|portuguese|russian|arabic|hindi|mandarin)$/i;
  const actionVerbs = /^(learn|speak|study|master|practice|improve|understand|read|write|listen|teach)$/i;

  const w1Lower = word1.toLowerCase();
  const w2Lower = word2.toLowerCase();

  // Check if one is a language and one is an action verb
  const hasLanguage = languages.test(w1Lower) || languages.test(w2Lower);
  const hasAction = actionVerbs.test(w1Lower) || actionVerbs.test(w2Lower);

  return hasLanguage && hasAction;
}

/**
 * Generates stopword-bridged combinations
 * Allows 1 stopword between meaningful tokens
 * e.g., "learn the language" → "learn language" is sequential, but we keep "learn the language"
 */
function generateStopwordBridgedCombos(
  tokens: string[],
  stopwords: Set<string>,
  getRelevance: (token: string) => TokenRelevance,
  maxLength: number
): EnhancedCombo[] {
  const combos: EnhancedCombo[] = [];

  for (let i = 0; i < tokens.length; i++) {
    // Only start with meaningful tokens
    if (stopwords.has(tokens[i]) || tokens[i].length <= 2) continue;

    for (let len = 2; len <= maxLength; len++) {
      if (i + len > tokens.length) break;

      const slice = tokens.slice(i, i + len);
      const text = slice.join(' ');

      // Check if contains exactly 1 stopword bridging 2+ meaningful tokens
      const meaningfulTokens = slice.filter(t => !stopwords.has(t) && t.length > 2);
      const stopwordCount = slice.length - meaningfulTokens.length;

      // Only accept if:
      // 1. Has 2+ meaningful tokens
      // 2. Has exactly 1 stopword in between (not at start/end)
      if (meaningfulTokens.length >= 2 && stopwordCount === 1) {
        // Check stopword is not at start or end
        if (!stopwords.has(slice[0]) && !stopwords.has(slice[slice.length - 1])) {
          const avgRelevance = meaningfulTokens.reduce((sum, t) => sum + getRelevance(t), 0) / meaningfulTokens.length;

          combos.push({
            text,
            type: 'stopword_bridged',
            relevanceScore: avgRelevance,
            source: 'title' // Will be updated by caller
          });
        }
      }
    }
  }

  return combos;
}

/**
 * Generates cross-element combinations (title token + subtitle token)
 * Only generates high-relevance pairings
 */
function generateCrossElementCombos(
  titleTokens: string[],
  subtitleTokens: string[],
  stopwords: Set<string>,
  getRelevance: (token: string) => TokenRelevance
): EnhancedCombo[] {
  const combos: EnhancedCombo[] = [];

  // Filter to meaningful tokens only
  const meaningfulTitle = titleTokens.filter(t => !stopwords.has(t) && t.length > 2 && getRelevance(t) >= 2);
  const meaningfulSubtitle = subtitleTokens.filter(t => !stopwords.has(t) && t.length > 2 && getRelevance(t) >= 2);

  // Generate 2-word cross-element combos
  for (const titleToken of meaningfulTitle) {
    for (const subtitleToken of meaningfulSubtitle) {
      // Check for semantic pairing
      const isSemantic = detectSemanticPair(titleToken, subtitleToken, getRelevance);

      const text = `${titleToken} ${subtitleToken}`;
      const avgRelevance = (getRelevance(titleToken) + getRelevance(subtitleToken)) / 2;

      combos.push({
        text,
        type: isSemantic ? 'semantic_pair' : 'cross_element',
        relevanceScore: isSemantic ? 3 : avgRelevance,
        source: 'title+subtitle'
      });
    }
  }

  return combos;
}

/**
 * Generates sequential combos (standard ngrams)
 * Enhanced with relevance scoring
 */
function generateSequentialCombos(
  tokens: string[],
  stopwords: Set<string>,
  getRelevance: (token: string) => TokenRelevance,
  minLength: number,
  maxLength: number,
  source: 'title' | 'subtitle' | 'title+subtitle'
): EnhancedCombo[] {
  const combos: EnhancedCombo[] = [];

  for (let n = minLength; n <= maxLength; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      const slice = tokens.slice(i, i + n);
      const text = slice.join(' ');

      // Must have at least one meaningful token
      const meaningfulTokens = slice.filter(t => !stopwords.has(t) && t.length > 2);
      if (meaningfulTokens.length === 0) continue;

      const avgRelevance = meaningfulTokens.reduce((sum, t) => sum + getRelevance(t), 0) / meaningfulTokens.length;

      // Check for semantic pairing in 2-word combos
      const isSemantic = slice.length === 2 && detectSemanticPair(slice[0], slice[1], getRelevance);

      combos.push({
        text,
        type: isSemantic ? 'semantic_pair' : 'sequential',
        relevanceScore: isSemantic ? 3 : avgRelevance,
        source
      });
    }
  }

  return combos;
}

/**
 * Main combo generation function - V2 engine
 * Generates all types of combos and deduplicates
 */
export function generateEnhancedCombos(options: ComboGenerationOptions): EnhancedCombo[] {
  const {
    titleTokens,
    subtitleTokens,
    stopwords,
    getTokenRelevance,
    minLength = 2,
    maxLength = 4
  } = options;

  const allCombos: EnhancedCombo[] = [];

  // 1. Sequential combos from title
  const titleSequential = generateSequentialCombos(
    titleTokens,
    stopwords,
    getTokenRelevance,
    minLength,
    maxLength,
    'title'
  );
  allCombos.push(...titleSequential);

  // 2. Stopword-bridged combos from title
  const titleBridged = generateStopwordBridgedCombos(
    titleTokens,
    stopwords,
    getTokenRelevance,
    maxLength
  );
  titleBridged.forEach(c => c.source = 'title');
  allCombos.push(...titleBridged);

  // 3. Sequential combos from combined (title + subtitle)
  const combinedTokens = [...titleTokens, ...subtitleTokens];
  const combinedSequential = generateSequentialCombos(
    combinedTokens,
    stopwords,
    getTokenRelevance,
    minLength,
    maxLength,
    'title+subtitle'
  );
  allCombos.push(...combinedSequential);

  // 4. Stopword-bridged combos from combined
  const combinedBridged = generateStopwordBridgedCombos(
    combinedTokens,
    stopwords,
    getTokenRelevance,
    maxLength
  );
  combinedBridged.forEach(c => c.source = 'title+subtitle');
  allCombos.push(...combinedBridged);

  // 5. Cross-element combos (title ↔ subtitle)
  const crossElement = generateCrossElementCombos(
    titleTokens,
    subtitleTokens,
    stopwords,
    getTokenRelevance
  );
  allCombos.push(...crossElement);

  // Deduplicate by text, keeping highest relevance score
  const comboMap = new Map<string, EnhancedCombo>();
  for (const combo of allCombos) {
    const existing = comboMap.get(combo.text);
    if (!existing || combo.relevanceScore > existing.relevanceScore) {
      comboMap.set(combo.text, combo);
    }
  }

  // Convert back to array and sort by relevance
  return Array.from(comboMap.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Filters combos to remove time-bound and numeric patterns
 */
export function filterLowValueCombos(combos: EnhancedCombo[]): {
  valuable: EnhancedCombo[];
  lowValue: EnhancedCombo[];
} {
  const valuable: EnhancedCombo[] = [];
  const lowValue: EnhancedCombo[] = [];

  const lowValuePatterns = [
    /^\d+/,  // Starts with number
    /\b\d+\b/,  // Contains standalone number
    /day|week|month|year|trial|limited|offer|sale|deal/i,  // Time-bound
    /new|latest|updated|version/i  // Version/update markers
  ];

  for (const combo of combos) {
    const isLowValue = lowValuePatterns.some(pattern => pattern.test(combo.text));

    if (isLowValue) {
      lowValue.push({ ...combo, relevanceScore: 0 });
    } else {
      valuable.push(combo);
    }
  }

  return { valuable, lowValue };
}

/**
 * Separates combos by source (title-only vs incremental from subtitle)
 */
export function separateCombosBySource(combos: EnhancedCombo[]): {
  titleOnly: EnhancedCombo[];
  subtitleIncremental: EnhancedCombo[];
} {
  const titleOnly: EnhancedCombo[] = [];
  const subtitleIncremental: EnhancedCombo[] = [];

  for (const combo of combos) {
    if (combo.source === 'title') {
      titleOnly.push(combo);
    } else {
      subtitleIncremental.push(combo);
    }
  }

  return { titleOnly, subtitleIncremental };
}
