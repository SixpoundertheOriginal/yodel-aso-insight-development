/**
 * Vertical Profiles Registry
 *
 * Defines category signatures for automatic vertical detection.
 * Each vertical has:
 * - Keywords for content-based detection
 * - App Store categories for category-based detection
 * - Optional rule set reference
 *
 * Phase 8: Base profiles only (no rule sets yet)
 */

import type { VerticalProfile } from '../ruleset.types';

// ============================================================================
// Base Vertical (Fallback)
// ============================================================================

const BASE_VERTICAL: VerticalProfile = {
  id: 'base',
  label: 'Base (Vertical-Agnostic)',
  keywords: [],
  categories: [],
  description: 'Fallback vertical for apps that do not match any specific category',
};

// ============================================================================
// Language Learning Vertical
// ============================================================================

const LANGUAGE_LEARNING_VERTICAL: VerticalProfile = {
  id: 'language_learning',
  label: 'Language Learning',
  keywords: [
    'learn',
    'language',
    'speak',
    'fluency',
    'fluent',
    'study',
    'spanish',
    'french',
    'german',
    'italian',
    'chinese',
    'japanese',
    'korean',
    'portuguese',
    'russian',
    'arabic',
    'lesson',
    'lessons',
    'course',
    'courses',
    'grammar',
    'vocabulary',
    'pronunciation',
  ],
  categories: ['Education'],
  description: 'Language learning apps (e.g., Duolingo, Babbel, Rosetta Stone)',
};

// ============================================================================
// Rewards Vertical
// ============================================================================

const REWARDS_VERTICAL: VerticalProfile = {
  id: 'rewards',
  label: 'Rewards & Cashback',
  keywords: [
    'earn',
    'reward',
    'rewards',
    'cashback',
    'cash',
    'money',
    'points',
    'redeem',
    'giftcard',
    'gift card',
    'paypal',
    'amazon',
    'play',
    'game',
    'games',
    'win',
    'prizes',
  ],
  categories: ['Entertainment', 'Lifestyle'],
  description: 'Reward and cashback apps (e.g., Mistplay, Fetch Rewards, Rakuten)',
};

// ============================================================================
// Finance Vertical
// ============================================================================

const FINANCE_VERTICAL: VerticalProfile = {
  id: 'finance',
  label: 'Finance & Investing',
  keywords: [
    'invest',
    'investing',
    'stock',
    'stocks',
    'trade',
    'trading',
    'crypto',
    'bitcoin',
    'ethereum',
    'portfolio',
    'bank',
    'banking',
    'savings',
    'save',
    'budget',
    'finance',
    'financial',
    'money',
    'wealth',
    '401k',
    'retirement',
  ],
  categories: ['Finance', 'Business'],
  description: 'Finance and investing apps (e.g., Robinhood, Coinbase, Acorns)',
};

// ============================================================================
// Dating Vertical
// ============================================================================

const DATING_VERTICAL: VerticalProfile = {
  id: 'dating',
  label: 'Dating & Relationships',
  keywords: [
    'date',
    'dating',
    'match',
    'matches',
    'matchmaking',
    'meet',
    'singles',
    'relationship',
    'relationships',
    'love',
    'romance',
    'partner',
    'chat',
    'swipe',
    'profile',
  ],
  categories: ['Social Networking', 'Lifestyle'],
  description: 'Dating and relationship apps (e.g., Tinder, Bumble, Hinge)',
};

// ============================================================================
// Productivity Vertical
// ============================================================================

const PRODUCTIVITY_VERTICAL: VerticalProfile = {
  id: 'productivity',
  label: 'Productivity & Task Management',
  keywords: [
    'productivity',
    'task',
    'tasks',
    'todo',
    'to-do',
    'organize',
    'organizer',
    'planner',
    'schedule',
    'calendar',
    'notes',
    'note-taking',
    'project',
    'workflow',
    'team',
    'collaboration',
  ],
  categories: ['Productivity', 'Business'],
  description: 'Productivity and task management apps (e.g., Notion, Todoist, Trello)',
};

// ============================================================================
// Health & Fitness Vertical
// ============================================================================

const HEALTH_VERTICAL: VerticalProfile = {
  id: 'health',
  label: 'Health & Fitness',
  keywords: [
    'health',
    'fitness',
    'workout',
    'exercise',
    'train',
    'training',
    'gym',
    'run',
    'running',
    'yoga',
    'meditation',
    'diet',
    'nutrition',
    'calorie',
    'calories',
    'weight',
    'lose weight',
    'muscle',
    'cardio',
  ],
  categories: ['Health & Fitness'],
  description: 'Health and fitness apps (e.g., MyFitnessPal, Headspace, Strava)',
};

// ============================================================================
// Entertainment Vertical (Generic)
// ============================================================================

const ENTERTAINMENT_VERTICAL: VerticalProfile = {
  id: 'entertainment',
  label: 'Entertainment',
  keywords: [
    'watch',
    'video',
    'videos',
    'stream',
    'streaming',
    'music',
    'listen',
    'play',
    'movie',
    'movies',
    'tv',
    'show',
    'shows',
    'podcast',
    'podcasts',
  ],
  categories: ['Entertainment'],
  description: 'Entertainment apps (e.g., Netflix, Spotify, YouTube)',
};

// ============================================================================
// Vertical Registry
// ============================================================================

export const VERTICAL_PROFILES: Record<string, VerticalProfile> = {
  base: BASE_VERTICAL,
  language_learning: LANGUAGE_LEARNING_VERTICAL,
  rewards: REWARDS_VERTICAL,
  finance: FINANCE_VERTICAL,
  dating: DATING_VERTICAL,
  productivity: PRODUCTIVITY_VERTICAL,
  health: HEALTH_VERTICAL,
  entertainment: ENTERTAINMENT_VERTICAL,
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getAllVerticals(): VerticalProfile[] {
  return Object.values(VERTICAL_PROFILES);
}

export function getVerticalById(id: string): VerticalProfile | undefined {
  return VERTICAL_PROFILES[id];
}

export function getVerticalsByCategory(category: string): VerticalProfile[] {
  return getAllVerticals().filter((v) => v.categories.includes(category));
}
