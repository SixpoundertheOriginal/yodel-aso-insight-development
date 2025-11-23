/**
 * Token Relevance Overrides by Vertical
 *
 * Maps vertical IDs to token relevance scores (0-3).
 * Used to override global token relevance for vertical-specific keywords.
 *
 * Relevance levels:
 * - 0: Filler/stopword (e.g., "the", "and")
 * - 1: Low relevance (e.g., "app", "free")
 * - 2: Medium relevance (e.g., category keywords)
 * - 3: High relevance (e.g., core value propositions)
 *
 * Phase 9: Intelligence layer for vertical-aware token scoring
 */

export type TokenRelevance = 0 | 1 | 2 | 3;

export type TokenRelevanceMap = Record<string, TokenRelevance>;

/**
 * Token relevance overrides for language learning vertical
 */
export const LANGUAGE_LEARNING_TOKEN_OVERRIDES: TokenRelevanceMap = {
  // Core value propositions (3)
  learn: 3,
  speak: 3,
  fluent: 3,
  master: 3,
  practice: 3,

  // Important features (2)
  grammar: 2,
  vocabulary: 2,
  pronunciation: 2,
  conversation: 2,
  lessons: 2,
  course: 2,
  words: 2,
  phrases: 2,
  reading: 2,
  writing: 2,
  listening: 2,

  // Supporting terms (1)
  study: 1,
  improve: 1,
  beginner: 1,
  advanced: 1,
  tutorial: 1,
};

/**
 * Token relevance overrides for rewards vertical
 */
export const REWARDS_TOKEN_OVERRIDES: TokenRelevanceMap = {
  // Core value propositions (3)
  earn: 3,
  cash: 3,
  rewards: 3,
  money: 3,
  free: 3, // High relevance in rewards (unlike general apps)

  // Important features (2)
  gift: 2,
  giftcard: 2,
  redeem: 2,
  points: 2,
  cashback: 2,
  payout: 2,
  paypal: 2,
  amazon: 2,
  prizes: 2,
  bonus: 2,

  // Supporting terms (1)
  play: 1,
  game: 1,
  win: 1,
  claim: 1,
  balance: 1,
  wallet: 1,
};

/**
 * Token relevance overrides for finance vertical
 */
export const FINANCE_TOKEN_OVERRIDES: TokenRelevanceMap = {
  // Core value propositions (3)
  invest: 3,
  save: 3,
  budget: 3,
  secure: 3,
  trusted: 3,

  // Important features (2)
  trade: 2,
  stock: 2,
  crypto: 2,
  portfolio: 2,
  banking: 2,
  account: 2,
  transfer: 2,
  deposit: 2,
  interest: 2,
  financial: 2,

  // Supporting terms (1)
  track: 1,
  balance: 1,
  transaction: 1,
  expense: 1,
  income: 1,
  wealth: 1,
  retirement: 1,
  tax: 1,
};

/**
 * Token relevance overrides for dating vertical
 */
export const DATING_TOKEN_OVERRIDES: TokenRelevanceMap = {
  // Core value propositions (3)
  match: 3,
  meet: 3,
  dating: 3,
  love: 3,
  connect: 3,

  // Important features (2)
  relationship: 2,
  singles: 2,
  chat: 2,
  message: 2,
  profile: 2,
  swipe: 2,
  like: 2,
  date: 2,

  // Supporting terms (1)
  flirt: 1,
  compatible: 1,
  soulmate: 1,
  partner: 1,
  verified: 1,
  real: 1,
};

/**
 * Token relevance overrides for productivity vertical
 */
export const PRODUCTIVITY_TOKEN_OVERRIDES: TokenRelevanceMap = {
  // Core value propositions (3)
  organize: 3,
  plan: 3,
  manage: 3,
  productivity: 3,
  track: 3,

  // Important features (2)
  tasks: 2,
  calendar: 2,
  notes: 2,
  reminders: 2,
  schedule: 2,
  project: 2,
  workflow: 2,
  collaboration: 2,
  sync: 2,

  // Supporting terms (1)
  goals: 1,
  habits: 1,
  focus: 1,
  efficient: 1,
  simple: 1,
};

/**
 * Token relevance overrides for health vertical
 */
export const HEALTH_TOKEN_OVERRIDES: TokenRelevanceMap = {
  // Core value propositions (3)
  fitness: 3,
  health: 3,
  workout: 3,
  track: 3,
  wellness: 3,

  // Important features (2)
  steps: 2,
  calories: 2,
  exercise: 2,
  nutrition: 2,
  diet: 2,
  weight: 2,
  activity: 2,
  training: 2,
  sleep: 2,

  // Supporting terms (1)
  running: 1,
  walking: 1,
  cycling: 1,
  heart: 1,
  goals: 1,
  progress: 1,
};

/**
 * Token relevance overrides for entertainment vertical
 */
export const ENTERTAINMENT_TOKEN_OVERRIDES: TokenRelevanceMap = {
  // Core value propositions (3)
  watch: 3,
  stream: 3,
  play: 3,
  entertainment: 3,
  unlimited: 3,

  // Important features (2)
  movies: 2,
  shows: 2,
  music: 2,
  video: 2,
  episodes: 2,
  series: 2,
  content: 2,
  playlist: 2,

  // Supporting terms (1)
  browse: 1,
  discover: 1,
  listen: 1,
  premium: 1,
  exclusive: 1,
  original: 1,
};

/**
 * Map of all vertical token overrides
 */
export const VERTICAL_TOKEN_OVERRIDES: Record<string, TokenRelevanceMap> = {
  language_learning: LANGUAGE_LEARNING_TOKEN_OVERRIDES,
  rewards: REWARDS_TOKEN_OVERRIDES,
  finance: FINANCE_TOKEN_OVERRIDES,
  dating: DATING_TOKEN_OVERRIDES,
  productivity: PRODUCTIVITY_TOKEN_OVERRIDES,
  health: HEALTH_TOKEN_OVERRIDES,
  entertainment: ENTERTAINMENT_TOKEN_OVERRIDES,
};

/**
 * Get token relevance overrides for a specific vertical
 *
 * @param verticalId - Vertical ID (e.g., "rewards", "language_learning")
 * @returns Token relevance map or undefined if vertical not found
 */
export function getTokenOverridesForVertical(
  verticalId: string
): TokenRelevanceMap | undefined {
  return VERTICAL_TOKEN_OVERRIDES[verticalId];
}

/**
 * Get token relevance for a specific token in a vertical
 *
 * @param token - Token to check
 * @param verticalId - Vertical ID
 * @returns Token relevance (0-3) or undefined if no override exists
 */
export function getTokenRelevance(
  token: string,
  verticalId: string
): TokenRelevance | undefined {
  const overrides = getTokenOverridesForVertical(verticalId);
  if (!overrides) {
    return undefined;
  }

  const normalizedToken = token.toLowerCase().trim();
  return overrides[normalizedToken];
}

/**
 * Get all high-relevance tokens (score 3) for a vertical
 *
 * @param verticalId - Vertical ID
 * @returns Array of high-relevance tokens
 */
export function getHighRelevanceTokens(verticalId: string): string[] {
  const overrides = getTokenOverridesForVertical(verticalId);
  if (!overrides) {
    return [];
  }

  return Object.entries(overrides)
    .filter(([, relevance]) => relevance === 3)
    .map(([token]) => token);
}

/**
 * Merge global token relevance with vertical-specific overrides
 *
 * @param globalRelevance - Global token relevance map
 * @param verticalId - Vertical ID
 * @returns Merged token relevance map (vertical overrides take precedence)
 */
export function mergeTokenRelevance(
  globalRelevance: TokenRelevanceMap,
  verticalId: string
): TokenRelevanceMap {
  const verticalOverrides = getTokenOverridesForVertical(verticalId);
  if (!verticalOverrides) {
    return globalRelevance;
  }

  return {
    ...globalRelevance,
    ...verticalOverrides,
  };
}
