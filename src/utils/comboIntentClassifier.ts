/**
 * Combo Intent Classifier
 *
 * Classifies keyword combinations into intent categories:
 * - learning: User wants to learn/study (informational intent)
 * - outcome: User seeks proficiency/fluency (commercial/transactional intent)
 * - brand: Contains brand name (navigational intent)
 * - noise: Low-value or user-marked (unknown intent)
 *
 * Phase 16.7: Now powered by Intent Engine (Bible-first with fallback)
 * Uses aso_intent_patterns table when available, falls back to minimal defaults
 */

import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { mapComboToSearchIntent, type ComboIntentType } from './intentTypeMapping';
import {
  classifyComboIntent,
  mapSearchIntentToComboIntent,
  type IntentPatternConfig,
} from '@/engine/asoBible/intentEngine';

export type IntentClass = ComboIntentType; // Alias for backward compatibility

/**
 * Cached intent patterns
 * Loaded once per session, refreshed when Admin UI updates patterns
 */
let cachedPatterns: IntentPatternConfig[] | null = null;

/**
 * Set intent patterns (called by metadata audit engine during initialization)
 * @param patterns - Intent patterns loaded from DB or fallback
 */
export function setIntentPatterns(patterns: IntentPatternConfig[]): void {
  cachedPatterns = patterns;
}

/**
 * Classifies a combo's search intent
 *
 * Phase 16.7: Uses Intent Engine for Bible-driven classification
 * If patterns are loaded → uses Intent Engine
 * If patterns not loaded → falls back to legacy heuristics
 *
 * @param combo - Classified combo to analyze
 * @returns Intent class (learning, outcome, brand, noise)
 */
export function classifyIntent(combo: ClassifiedCombo): IntentClass {
  const text = combo.text.toLowerCase();

  // Noise: Low-value or user-marked (highest priority)
  if (combo.type === 'low_value' || (combo as any).userMarkedAsNoise) {
    return 'noise';
  }

  // Brand: Contains brand alias (Phase 5)
  if ('brandClassification' in combo && combo.brandClassification === 'brand') {
    return 'brand';
  }

  // Legacy brand detection
  if (combo.type === 'branded') {
    return 'brand';
  }

  // Use Intent Engine if patterns are loaded
  if (cachedPatterns && cachedPatterns.length > 0) {
    const classification = classifyComboIntent(text, cachedPatterns);
    return mapSearchIntentToComboIntent(classification.dominantIntent);
  }

  // Fallback: Legacy heuristics (when patterns not loaded)
  // Learning: Contains learning/action verbs
  const learningPatterns = /\b(learn|study|practice|master|improve|teach|train|memorize|review|understand)\b/i;
  if (learningPatterns.test(text)) {
    return 'learning';
  }

  // Outcome: Contains proficiency/fluency indicators
  const outcomePatterns = /\b(fluency|fluent|proficiency|proficient|advanced|beginner|intermediate|native|conversational|expert|mastery)\b/i;
  if (outcomePatterns.test(text)) {
    return 'outcome';
  }

  // Default: learning (most generic combos imply learning intent)
  return 'learning';
}

/**
 * Gets a human-readable description of the intent class
 */
export function getIntentDescription(intent: IntentClass): string {
  switch (intent) {
    case 'learning':
      return 'User wants to learn or acquire skills';
    case 'outcome':
      return 'User seeks proficiency or end result';
    case 'brand':
      return 'User searching for specific brand/app';
    case 'noise':
      return 'Low-value or irrelevant for ranking';
  }
}

/**
 * Gets badge color for intent class
 */
export function getIntentColor(intent: IntentClass): string {
  switch (intent) {
    case 'learning':
      return 'border-blue-400/30 text-blue-400 bg-blue-900/10';
    case 'outcome':
      return 'border-green-400/30 text-green-400 bg-green-900/10';
    case 'brand':
      return 'border-purple-400/30 text-purple-400 bg-purple-900/10';
    case 'noise':
      return 'border-zinc-700 text-zinc-500 bg-zinc-900/10';
  }
}
