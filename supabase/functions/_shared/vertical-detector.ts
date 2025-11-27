/**
 * Vertical Detection Engine for Edge Functions
 *
 * Detects app vertical based on category and metadata content.
 * Returns vertical profile for ruleset loading.
 *
 * Phase 1: ASO Bible Integration
 */

export interface VerticalProfile {
  id: string;
  label: string;
  keywords: string[];
  categories: string[];
  description?: string;
  discoveryThresholds?: {
    excellent: number;
    good: number;
    moderate: number;
  };
}

export interface VerticalDetectionResult {
  verticalId: string;
  verticalLabel: string;
  confidence: number; // 0-1
  matchedSignals: string[];
  profile: VerticalProfile;
}

// ============================================================================
// Vertical Profiles (Deno-compatible - no imports from src/)
// ============================================================================

const DEFAULT_DISCOVERY_THRESHOLDS = {
  excellent: 5,
  good: 3,
  moderate: 1,
};

const VERTICAL_PROFILES: Record<string, VerticalProfile> = {
  language_learning: {
    id: 'language_learning',
    label: 'Language Learning',
    keywords: [
      'learn', 'language', 'speak', 'fluency', 'fluent', 'study',
      'spanish', 'french', 'german', 'italian', 'chinese', 'japanese',
      'korean', 'portuguese', 'russian', 'arabic', 'lesson', 'lessons',
      'course', 'courses', 'grammar', 'vocabulary', 'pronunciation'
    ],
    categories: ['Education'],
    discoveryThresholds: { excellent: 6, good: 4, moderate: 2 },
  },
  rewards: {
    id: 'rewards',
    label: 'Rewards & Cashback',
    keywords: [
      'earn', 'reward', 'rewards', 'cashback', 'cash', 'money', 'points',
      'redeem', 'giftcard', 'gift card', 'paypal', 'amazon', 'play',
      'game', 'games', 'win', 'prizes'
    ],
    categories: ['Entertainment', 'Lifestyle'],
    discoveryThresholds: { excellent: 5, good: 3, moderate: 2 },
  },
  finance: {
    id: 'finance',
    label: 'Finance & Investing',
    keywords: [
      'invest', 'investing', 'stock', 'stocks', 'trade', 'trading',
      'crypto', 'bitcoin', 'ethereum', 'portfolio', 'bank', 'banking',
      'savings', 'save', 'budget', 'finance', 'financial', 'money',
      'wealth', '401k', 'retirement'
    ],
    categories: ['Finance', 'Business'],
    discoveryThresholds: { excellent: 8, good: 5, moderate: 3 },
  },
  dating: {
    id: 'dating',
    label: 'Dating & Relationships',
    keywords: [
      'date', 'dating', 'match', 'matches', 'matchmaking', 'meet',
      'singles', 'relationship', 'relationships', 'love', 'romance',
      'partner', 'chat', 'swipe', 'profile'
    ],
    categories: ['Social Networking', 'Lifestyle'],
    discoveryThresholds: { excellent: 5, good: 3, moderate: 2 },
  },
  productivity: {
    id: 'productivity',
    label: 'Productivity & Task Management',
    keywords: [
      'productivity', 'task', 'tasks', 'todo', 'to-do', 'organize',
      'organizer', 'planner', 'schedule', 'calendar', 'notes',
      'note-taking', 'project', 'workflow', 'team', 'collaboration'
    ],
    categories: ['Productivity', 'Business'],
    discoveryThresholds: { excellent: 6, good: 4, moderate: 2 },
  },
  health: {
    id: 'health',
    label: 'Health & Fitness',
    keywords: [
      'health', 'fitness', 'workout', 'exercise', 'train', 'training',
      'gym', 'run', 'running', 'yoga', 'meditation', 'diet',
      'nutrition', 'calorie', 'calories', 'weight', 'lose weight',
      'muscle', 'cardio'
    ],
    categories: ['Health & Fitness'],
    discoveryThresholds: { excellent: 6, good: 4, moderate: 2 },
  },
  entertainment: {
    id: 'entertainment',
    label: 'Entertainment',
    keywords: [
      'watch', 'video', 'videos', 'stream', 'streaming', 'music',
      'listen', 'play', 'movie', 'movies', 'tv', 'show', 'shows',
      'podcast', 'podcasts'
    ],
    categories: ['Entertainment'],
    discoveryThresholds: { excellent: 4, good: 3, moderate: 1 },
  },
  base: {
    id: 'base',
    label: 'Base (Vertical-Agnostic)',
    keywords: [],
    categories: [],
    discoveryThresholds: DEFAULT_DISCOVERY_THRESHOLDS,
  },
};

// ============================================================================
// Detection Logic
// ============================================================================

/**
 * Tokenize text for keyword matching
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Detect vertical from app metadata
 *
 * Strategy:
 * 1. Primary: Match by App Store category
 * 2. Secondary: Match by keywords in title + subtitle + description
 * 3. Fallback: Return 'base' vertical
 */
export function detectVertical(metadata: {
  applicationCategory?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  name?: string;
}): VerticalDetectionResult {
  const matchedSignals: string[] = [];
  const scores: Record<string, number> = {};

  // Normalize category
  const category = metadata.applicationCategory || '';

  // Step 1: Category-based matching (strong signal)
  for (const [verticalId, profile] of Object.entries(VERTICAL_PROFILES)) {
    if (verticalId === 'base') continue;

    // Check if category matches
    if (profile.categories.some(cat =>
      category.toLowerCase().includes(cat.toLowerCase()) ||
      cat.toLowerCase().includes(category.toLowerCase())
    )) {
      scores[verticalId] = (scores[verticalId] || 0) + 50; // Strong weight for category match
      matchedSignals.push(`category:${category}`);
    }
  }

  // Step 2: Keyword-based matching (content signal)
  const contentText = [
    metadata.name || '',
    metadata.title || '',
    metadata.subtitle || '',
    metadata.description || ''
  ].join(' ');

  const tokens = tokenize(contentText);
  const tokenSet = new Set(tokens);

  for (const [verticalId, profile] of Object.entries(VERTICAL_PROFILES)) {
    if (verticalId === 'base') continue;

    // Count keyword matches
    let keywordMatches = 0;
    for (const keyword of profile.keywords) {
      const keywordTokens = tokenize(keyword);
      // Check if all tokens of the keyword are present
      if (keywordTokens.every(t => tokenSet.has(t))) {
        keywordMatches++;
        matchedSignals.push(`keyword:${keyword}`);
      }
    }

    if (keywordMatches > 0) {
      // Score based on match ratio
      const matchRatio = keywordMatches / Math.max(profile.keywords.length, 1);
      scores[verticalId] = (scores[verticalId] || 0) + (matchRatio * 30); // Medium weight for keywords
    }
  }

  // Step 3: Find best match
  let bestVerticalId = 'base';
  let bestScore = 0;

  for (const [verticalId, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestVerticalId = verticalId;
    }
  }

  // Calculate confidence (0-1 scale)
  const confidence = Math.min(bestScore / 100, 1);

  // Require minimum confidence threshold
  if (confidence < 0.3) {
    bestVerticalId = 'base';
  }

  const profile = VERTICAL_PROFILES[bestVerticalId];

  console.log(`[VERTICAL-DETECTOR] Detected: ${bestVerticalId} (confidence: ${(confidence * 100).toFixed(1)}%)`);
  console.log(`[VERTICAL-DETECTOR] Matched signals: ${matchedSignals.slice(0, 5).join(', ')}`);

  return {
    verticalId: bestVerticalId,
    verticalLabel: profile.label,
    confidence,
    matchedSignals: matchedSignals.slice(0, 10), // Limit for response size
    profile,
  };
}

/**
 * Get vertical profile by ID
 */
export function getVerticalProfile(verticalId: string): VerticalProfile | undefined {
  return VERTICAL_PROFILES[verticalId];
}

/**
 * Get all available verticals
 */
export function getAllVerticalProfiles(): VerticalProfile[] {
  return Object.values(VERTICAL_PROFILES).filter(v => v.id !== 'base');
}
