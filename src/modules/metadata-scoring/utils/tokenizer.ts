/**
 * Tokenizer Utility
 *
 * Tokenizes text and analyzes tokens for scoring purposes.
 */

import type { TokenAnalysis } from '../types';

/**
 * Tokenizes text into individual words, normalized and cleaned
 *
 * @param text - Input text to tokenize
 * @returns Array of normalized tokens (lowercase, no punctuation)
 */
export function tokenize(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Analyzes tokens and categorizes them into core, filler, and duplicates
 *
 * @param tokens - Array of tokens to analyze
 * @param stopwords - Set of stopwords to filter out
 * @returns TokenAnalysis with categorized tokens
 */
export function analyzeTokens(
  tokens: string[],
  stopwords: Set<string>
): TokenAnalysis {
  const coreTokens: string[] = [];
  const fillerTokens: string[] = [];
  const tokenCounts = new Map<string, number>();
  const duplicates: string[] = [];

  // Count occurrences
  for (const token of tokens) {
    const count = tokenCounts.get(token) || 0;
    tokenCounts.set(token, count + 1);
  }

  // Categorize tokens
  for (const token of tokens) {
    const count = tokenCounts.get(token) || 0;

    // Check if duplicate
    if (count > 1 && !duplicates.includes(token)) {
      duplicates.push(token);
    }

    // Check if filler (stopword)
    if (stopwords.has(token)) {
      if (!fillerTokens.includes(token)) {
        fillerTokens.push(token);
      }
    } else {
      // Core token (not stopword, counted once)
      if (!coreTokens.includes(token)) {
        coreTokens.push(token);
      }
    }
  }

  return {
    coreTokens,
    fillerTokens,
    duplicates
  };
}

/**
 * Finds tokens in array B that are NOT in array A (incremental tokens)
 *
 * @param tokensA - First array of tokens (e.g., title tokens)
 * @param tokensB - Second array of tokens (e.g., subtitle tokens)
 * @returns Array of tokens unique to B
 */
export function findNewTokens(tokensA: string[], tokensB: string[]): string[] {
  const setA = new Set(tokensA);
  const newTokens: string[] = [];

  for (const token of tokensB) {
    if (!setA.has(token) && !newTokens.includes(token)) {
      newTokens.push(token);
    }
  }

  return newTokens;
}

/**
 * Calculates character usage efficiency score
 *
 * @param text - Input text
 * @param maxChars - Maximum allowed characters
 * @returns Score from 0-100
 */
export function calculateCharacterUsage(text: string, maxChars: number): number {
  if (!text || maxChars <= 0) {
    return 0;
  }

  const length = text.length;

  if (length === 0) {
    return 0;
  }

  if (length > maxChars) {
    // Penalty for exceeding limit
    const overage = length - maxChars;
    const penaltyPerChar = 2; // -2 points per extra char
    return Math.max(0, 100 - (overage * penaltyPerChar));
  }

  // Reward for using available space efficiently
  const usageRatio = length / maxChars;

  // Optimal range: 80-100% usage gets full score
  if (usageRatio >= 0.8) {
    return 100;
  }

  // 50-80% usage: linear scale 70-100
  if (usageRatio >= 0.5) {
    return 70 + ((usageRatio - 0.5) / 0.3) * 30;
  }

  // Below 50%: penalize underutilization
  return usageRatio * 140; // 0% = 0, 50% = 70
}
