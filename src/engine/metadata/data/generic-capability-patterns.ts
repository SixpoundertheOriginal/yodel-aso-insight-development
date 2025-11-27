/**
 * Generic Capability Patterns for ASO Audit v2.0
 *
 * Phase 2: Description Intelligence Layer
 * These patterns work across ALL verticals (generic, not vertical-specific)
 *
 * v2.0: Start with 20 feature, 20 benefit, 10 trust patterns
 * v2.1: Expand to 50-80 patterns per vertical (when ASO team provides taxonomy)
 *
 * Pattern matching strategy:
 * - Regex patterns for flexibility
 * - Word boundary matching (\b) to avoid partial matches
 * - Case-insensitive (i flag)
 * - Categories for gap severity calculation
 */

import type { CapabilityPattern } from '@/types/auditV2';

// ============================================================================
// FEATURE PATTERNS (20 total)
// ============================================================================

/**
 * Feature patterns detect app capabilities mentioned in description
 * Categories: functionality, performance, interface, data, integration, personalization
 */
export const GENERIC_FEATURE_PATTERNS: CapabilityPattern[] = [
  // === FUNCTIONALITY (Core app capabilities) ===
  {
    pattern: /\b(offline|without internet|no connection required)\b/i,
    category: 'functionality',
    criticality: 'high'
  },
  {
    pattern: /\b(real-time|live|instant)\b/i,
    category: 'performance',
    criticality: 'high'
  },
  {
    pattern: /\b(voice|speech|audio)\b/i,
    category: 'interface',
    criticality: 'moderate'
  },
  {
    pattern: /\b(video|visual|watch)\b/i,
    category: 'interface',
    criticality: 'moderate'
  },
  {
    pattern: /\b(notification|alert|reminder)\b/i,
    category: 'functionality',
    criticality: 'moderate'
  },

  // === DATA & SYNC ===
  {
    pattern: /\b(sync|synchronize|cloud)\b/i,
    category: 'data',
    criticality: 'high'
  },
  {
    pattern: /\b(backup|restore|save)\b/i,
    category: 'data',
    criticality: 'moderate'
  },
  {
    pattern: /\b(export|import|share)\b/i,
    category: 'integration',
    criticality: 'moderate'
  },

  // === PERSONALIZATION ===
  {
    pattern: /\b(custom|personalized|tailored|adaptive)\b/i,
    category: 'personalization',
    criticality: 'moderate'
  },
  {
    pattern: /\b(smart|intelligent|AI|machine learning)\b/i,
    category: 'personalization',
    criticality: 'high'
  },

  // === TRACKING & ANALYTICS ===
  {
    pattern: /\b(track|monitor|measure|analyze)\b/i,
    category: 'functionality',
    criticality: 'high'
  },
  {
    pattern: /\b(progress|stats|statistics|insights)\b/i,
    category: 'functionality',
    criticality: 'moderate'
  },
  {
    pattern: /\b(goal|target|milestone)\b/i,
    category: 'functionality',
    criticality: 'moderate'
  },

  // === SOCIAL & COMMUNITY ===
  {
    pattern: /\b(chat|message|communicate)\b/i,
    category: 'social',
    criticality: 'moderate'
  },
  {
    pattern: /\b(community|forum|group)\b/i,
    category: 'social',
    criticality: 'moderate'
  },
  {
    pattern: /\b(leaderboard|compete|challenge)\b/i,
    category: 'social',
    criticality: 'moderate'
  },

  // === GAMIFICATION ===
  {
    pattern: /\b(reward|points|badge|achievement)\b/i,
    category: 'gamification',
    criticality: 'moderate'
  },
  {
    pattern: /\b(level|unlock|earn)\b/i,
    category: 'gamification',
    criticality: 'moderate'
  },

  // === CONTENT & LIBRARY ===
  {
    pattern: /\b(library|collection|database)\b/i,
    category: 'content',
    criticality: 'moderate'
  },
  {
    pattern: /\b(search|find|discover)\b/i,
    category: 'functionality',
    criticality: 'moderate'
  }
];

// ============================================================================
// BENEFIT PATTERNS (20 total)
// ============================================================================

/**
 * Benefit patterns detect user value propositions mentioned in description
 * Categories: efficiency, usability, achievement, skill_development, cost, time, quality
 */
export const GENERIC_BENEFIT_PATTERNS: CapabilityPattern[] = [
  // === EFFICIENCY & SPEED ===
  {
    pattern: /\b(save time|faster|quick|speed up)\b/i,
    category: 'efficiency',
    criticality: 'high'
  },
  {
    pattern: /\b(efficient|streamline|optimize)\b/i,
    category: 'efficiency',
    criticality: 'high'
  },
  {
    pattern: /\b(automate|automatic|hands-free)\b/i,
    category: 'efficiency',
    criticality: 'moderate'
  },

  // === USABILITY & EASE ===
  {
    pattern: /\b(easy|simple|effortless)\b/i,
    category: 'usability',
    criticality: 'high'
  },
  {
    pattern: /\b(intuitive|user-friendly|straightforward)\b/i,
    category: 'usability',
    criticality: 'moderate'
  },
  {
    pattern: /\b(convenient|hassle-free|no setup)\b/i,
    category: 'usability',
    criticality: 'moderate'
  },

  // === ACHIEVEMENT & IMPROVEMENT ===
  {
    pattern: /\b(improve|boost|enhance|increase)\b/i,
    category: 'achievement',
    criticality: 'high'
  },
  {
    pattern: /\b(achieve|reach|accomplish|succeed)\b/i,
    category: 'achievement',
    criticality: 'moderate'
  },
  {
    pattern: /\b(transform|change|revolutionize)\b/i,
    category: 'achievement',
    criticality: 'moderate'
  },

  // === SKILL & MASTERY ===
  {
    pattern: /\b(master|expert|fluent|proficient)\b/i,
    category: 'skill_development',
    criticality: 'high'
  },
  {
    pattern: /\b(learn|practice|train|develop)\b/i,
    category: 'skill_development',
    criticality: 'high'
  },
  {
    pattern: /\b(skill|ability|knowledge|expertise)\b/i,
    category: 'skill_development',
    criticality: 'moderate'
  },

  // === COST & VALUE ===
  {
    pattern: /\b(free|affordable|budget|low cost)\b/i,
    category: 'cost',
    criticality: 'moderate'
  },
  {
    pattern: /\b(value|worth|investment)\b/i,
    category: 'cost',
    criticality: 'moderate'
  },

  // === TIME SAVINGS ===
  {
    pattern: /\b(minutes|hours|daily|weekly)\s+(save|gain|spend less)\b/i,
    category: 'time',
    criticality: 'high'
  },
  {
    pattern: /\b(anytime|anywhere|on-the-go)\b/i,
    category: 'time',
    criticality: 'moderate'
  },

  // === QUALITY & RESULTS ===
  {
    pattern: /\b(quality|premium|professional|superior)\b/i,
    category: 'quality',
    criticality: 'moderate'
  },
  {
    pattern: /\b(proven|tested|validated|reliable)\b/i,
    category: 'quality',
    criticality: 'moderate'
  },
  {
    pattern: /\b(effective|powerful|comprehensive)\b/i,
    category: 'quality',
    criticality: 'moderate'
  },

  // === CONFIDENCE & CONTROL ===
  {
    pattern: /\b(confident|sure|certain|trust)\b/i,
    category: 'emotional',
    criticality: 'moderate'
  }
];

// ============================================================================
// TRUST PATTERNS (10 total)
// ============================================================================

/**
 * Trust patterns detect credibility signals mentioned in description
 * Categories: security, privacy, certification, recognition, social_proof
 */
export const GENERIC_TRUST_PATTERNS: CapabilityPattern[] = [
  // === SECURITY ===
  {
    pattern: /\b(secure|encrypted|protected|safe)\b/i,
    category: 'security',
    criticality: 'critical'  // Security is critical for Finance, Health, Dating
  },
  {
    pattern: /\b(security|encryption|protection)\b/i,
    category: 'security',
    criticality: 'critical'
  },

  // === PRIVACY ===
  {
    pattern: /\b(privacy|private|confidential)\b/i,
    category: 'privacy',
    criticality: 'critical'
  },

  // === CERTIFICATION & APPROVAL ===
  {
    pattern: /\b(verified|certified|approved|validated)\b/i,
    category: 'certification',
    criticality: 'high'
  },
  {
    pattern: /\b(licensed|accredited|endorsed)\b/i,
    category: 'certification',
    criticality: 'high'
  },

  // === RECOGNITION & AWARDS ===
  {
    pattern: /\b(award|winner|rated|featured)\b/i,
    category: 'recognition',
    criticality: 'moderate'
  },
  {
    pattern: /\b(best|top|leading|#1)\b/i,
    category: 'recognition',
    criticality: 'moderate'
  },

  // === SOCIAL PROOF ===
  {
    pattern: /\b(\d+[MKmk]?\+?\s*(users|downloads|customers|members))\b/i,
    category: 'social_proof',
    criticality: 'high'
  },
  {
    pattern: /\b(trusted by|used by|loved by)\b/i,
    category: 'social_proof',
    criticality: 'moderate'
  },

  // === PROFESSIONAL & EXPERT ===
  {
    pattern: /\b(expert|professional|specialist|doctor|certified)\b/i,
    category: 'expertise',
    criticality: 'high'
  }
];

// ============================================================================
// PATTERN UTILITIES
// ============================================================================

/**
 * Get all capability patterns (50 total in v2.0)
 */
export function getAllCapabilityPatterns() {
  return {
    features: GENERIC_FEATURE_PATTERNS,
    benefits: GENERIC_BENEFIT_PATTERNS,
    trust: GENERIC_TRUST_PATTERNS
  };
}

/**
 * Get pattern count for validation
 */
export function getPatternCounts() {
  return {
    features: GENERIC_FEATURE_PATTERNS.length,
    benefits: GENERIC_BENEFIT_PATTERNS.length,
    trust: GENERIC_TRUST_PATTERNS.length,
    total: GENERIC_FEATURE_PATTERNS.length + GENERIC_BENEFIT_PATTERNS.length + GENERIC_TRUST_PATTERNS.length
  };
}

/**
 * Get patterns by category
 */
export function getPatternsByCategory(type: 'features' | 'benefits' | 'trust') {
  const patterns = {
    features: GENERIC_FEATURE_PATTERNS,
    benefits: GENERIC_BENEFIT_PATTERNS,
    trust: GENERIC_TRUST_PATTERNS
  }[type];

  const byCategory: Record<string, CapabilityPattern[]> = {};

  for (const pattern of patterns) {
    if (!byCategory[pattern.category]) {
      byCategory[pattern.category] = [];
    }
    byCategory[pattern.category].push(pattern);
  }

  return byCategory;
}

/**
 * Validate pattern set completeness
 */
export function validatePatternSet(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (GENERIC_FEATURE_PATTERNS.length < 15) {
    errors.push(`Feature patterns insufficient: ${GENERIC_FEATURE_PATTERNS.length} (expected ≥15)`);
  }

  if (GENERIC_BENEFIT_PATTERNS.length < 15) {
    errors.push(`Benefit patterns insufficient: ${GENERIC_BENEFIT_PATTERNS.length} (expected ≥15)`);
  }

  if (GENERIC_TRUST_PATTERNS.length < 8) {
    errors.push(`Trust patterns insufficient: ${GENERIC_TRUST_PATTERNS.length} (expected ≥8)`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
