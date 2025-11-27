/**
 * Description Intelligence Layer (Deno-compatible)
 *
 * Phase 2: Extract app capabilities from description text
 * Detects: Features, Benefits, Trust Signals
 *
 * v2.0: Uses 50 generic patterns (20 feature, 20 benefit, 10 trust)
 * v2.1: Will expand to vertical-specific patterns (50-80 per vertical)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DetectedCapability {
  text: string;
  category: string;
  pattern: string;
  confidence: number; // 0-1 (based on criticality)
}

export interface CapabilityGroup {
  detected: DetectedCapability[];
  count: number;
  categories: string[];
}

export interface AppCapabilityMap {
  features: CapabilityGroup;
  benefits: CapabilityGroup;
  trust: CapabilityGroup;
}

export interface CapabilityPattern {
  pattern: string | RegExp;
  category: string;
  criticality: 'critical' | 'high' | 'moderate';
}

// ============================================================================
// GENERIC PATTERNS (Phase 2 - Baseline)
// ============================================================================

const GENERIC_FEATURE_PATTERNS: CapabilityPattern[] = [
  // Core Features (Critical)
  { pattern: /\b(free|no cost|zero cost)\b/i, category: 'free', criticality: 'critical' },
  { pattern: /\b(offline|without internet)\b/i, category: 'offline', criticality: 'critical' },
  { pattern: /\b(ad-free|no ads|ad free)\b/i, category: 'ad_free', criticality: 'critical' },
  { pattern: /\b(customizable|personalize|custom)\b/i, category: 'customization', criticality: 'high' },
  { pattern: /\b(sync|synchronize|cloud)\b/i, category: 'sync', criticality: 'high' },

  // Advanced Features (High)
  { pattern: /\b(ai|artificial intelligence|machine learning)\b/i, category: 'ai', criticality: 'high' },
  { pattern: /\b(voice|speech recognition|voice control)\b/i, category: 'voice', criticality: 'high' },
  { pattern: /\b(notification|alert|reminder)\b/i, category: 'notifications', criticality: 'moderate' },
  { pattern: /\b(analytics|statistics|insights|reports)\b/i, category: 'analytics', criticality: 'moderate' },
  { pattern: /\b(share|social|connect)\b/i, category: 'social', criticality: 'moderate' },

  // User Experience (Moderate)
  { pattern: /\b(easy|simple|intuitive|user-friendly)\b/i, category: 'ease_of_use', criticality: 'moderate' },
  { pattern: /\b(fast|quick|instant|speed)\b/i, category: 'performance', criticality: 'moderate' },
  { pattern: /\b(beautiful|elegant|modern|clean)\b/i, category: 'design', criticality: 'moderate' },
  { pattern: /\b(powerful|advanced|professional)\b/i, category: 'advanced', criticality: 'moderate' },
  { pattern: /\b(support|help|tutorial|guide)\b/i, category: 'support', criticality: 'moderate' },

  // Platform Features
  { pattern: /\b(widget|apple watch|ipad)\b/i, category: 'platform', criticality: 'moderate' },
  { pattern: /\b(export|import|backup)\b/i, category: 'data_portability', criticality: 'moderate' },
  { pattern: /\b(multi-language|multilingual|translation)\b/i, category: 'multilingual', criticality: 'moderate' },
  { pattern: /\b(dark mode|light mode|theme)\b/i, category: 'themes', criticality: 'moderate' },
  { pattern: /\b(integrate|integration|compatible)\b/i, category: 'integration', criticality: 'moderate' },
];

const GENERIC_BENEFIT_PATTERNS: CapabilityPattern[] = [
  // User Outcomes (Critical)
  { pattern: /\b(save time|time-saving|faster)\b/i, category: 'time_saving', criticality: 'critical' },
  { pattern: /\b(save money|cost-saving|affordable)\b/i, category: 'cost_saving', criticality: 'critical' },
  { pattern: /\b(improve|enhance|boost|increase)\b/i, category: 'improvement', criticality: 'high' },
  { pattern: /\b(achieve|reach|accomplish|succeed)\b/i, category: 'achievement', criticality: 'high' },
  { pattern: /\b(learn|master|understand|discover)\b/i, category: 'learning', criticality: 'high' },

  // Emotional Benefits (High)
  { pattern: /\b(enjoy|fun|entertaining|engaging)\b/i, category: 'enjoyment', criticality: 'high' },
  { pattern: /\b(confidence|confident|assured)\b/i, category: 'confidence', criticality: 'moderate' },
  { pattern: /\b(peace of mind|secure|safe|protected)\b/i, category: 'security', criticality: 'high' },
  { pattern: /\b(stress-free|relax|calm|simplify)\b/i, category: 'stress_reduction', criticality: 'moderate' },
  { pattern: /\b(motivate|inspire|encourage)\b/i, category: 'motivation', criticality: 'moderate' },

  // Productivity Benefits (Moderate)
  { pattern: /\b(organized|organize|track)\b/i, category: 'organization', criticality: 'moderate' },
  { pattern: /\b(efficient|streamline|optimize)\b/i, category: 'efficiency', criticality: 'moderate' },
  { pattern: /\b(productive|productivity|focus)\b/i, category: 'productivity', criticality: 'moderate' },
  { pattern: /\b(convenience|convenient|accessible)\b/i, category: 'convenience', criticality: 'moderate' },
  { pattern: /\b(control|manage|monitor)\b/i, category: 'control', criticality: 'moderate' },

  // Growth Benefits
  { pattern: /\b(grow|growth|develop|progress)\b/i, category: 'growth', criticality: 'moderate' },
  { pattern: /\b(transform|change|revolutionize)\b/i, category: 'transformation', criticality: 'moderate' },
  { pattern: /\b(connect|community|network)\b/i, category: 'connection', criticality: 'moderate' },
  { pattern: /\b(stay informed|updated|current)\b/i, category: 'information', criticality: 'moderate' },
  { pattern: /\b(make better decisions|informed choices)\b/i, category: 'decision_making', criticality: 'moderate' },
];

const GENERIC_TRUST_PATTERNS: CapabilityPattern[] = [
  // Authority Signals (Critical)
  { pattern: /\b(trusted by \d+|millions of users|#1|best)\b/i, category: 'social_proof', criticality: 'critical' },
  { pattern: /\b(award|featured|recognized|certified)\b/i, category: 'recognition', criticality: 'high' },
  { pattern: /\b(expert|professional|trusted)\b/i, category: 'expertise', criticality: 'high' },

  // Privacy & Security (Critical)
  { pattern: /\b(private|privacy|secure|encrypted)\b/i, category: 'privacy', criticality: 'critical' },
  { pattern: /\b(no data collection|no tracking|anonymous)\b/i, category: 'data_privacy', criticality: 'critical' },

  // Reliability (High)
  { pattern: /\b(reliable|dependable|proven)\b/i, category: 'reliability', criticality: 'high' },
  { pattern: /\b(support|customer service|help)\b/i, category: 'customer_support', criticality: 'moderate' },
  { pattern: /\b(guarantee|warranty|refund)\b/i, category: 'guarantee', criticality: 'high' },

  // Transparency
  { pattern: /\b(transparent|honest|authentic)\b/i, category: 'transparency', criticality: 'moderate' },
  { pattern: /\b(regular updates|constantly improving)\b/i, category: 'maintenance', criticality: 'moderate' },
];

// ============================================================================
// EXTRACTION LOGIC
// ============================================================================

/**
 * Extract a single capability type from text
 */
function extractCapabilityType(
  text: string,
  patterns: CapabilityPattern[],
  type: 'feature' | 'benefit' | 'trust'
): DetectedCapability[] {
  const detected: DetectedCapability[] = [];
  const normalized = text.toLowerCase();

  for (const pattern of patterns) {
    let matched = false;
    let matchedText = '';

    if (typeof pattern.pattern === 'string') {
      // String pattern (simple contains check)
      if (normalized.includes(pattern.pattern.toLowerCase())) {
        matched = true;
        matchedText = pattern.pattern;
      }
    } else {
      // Regex pattern
      const regex = pattern.pattern;
      const match = normalized.match(regex);
      if (match) {
        matched = true;
        matchedText = match[0];
      }
    }

    if (matched) {
      detected.push({
        text: matchedText,
        category: pattern.category,
        pattern: typeof pattern.pattern === 'string' ? pattern.pattern : pattern.pattern.source,
        confidence: pattern.criticality === 'critical' ? 1.0 : pattern.criticality === 'high' ? 0.8 : 0.6,
      });
    }
  }

  return detected;
}

/**
 * Extract all capabilities from description text
 *
 * @param description - App description text
 * @returns Complete capability map
 */
export function extractCapabilities(description: string): AppCapabilityMap {
  // Extract each capability type
  const features = extractCapabilityType(description, GENERIC_FEATURE_PATTERNS, 'feature');
  const benefits = extractCapabilityType(description, GENERIC_BENEFIT_PATTERNS, 'benefit');
  const trust = extractCapabilityType(description, GENERIC_TRUST_PATTERNS, 'trust');

  // Get unique categories for each type
  const featureCategories = [...new Set(features.map(f => f.category))];
  const benefitCategories = [...new Set(benefits.map(b => b.category))];
  const trustCategories = [...new Set(trust.map(t => t.category))];

  return {
    features: {
      detected: features,
      count: features.length,
      categories: featureCategories,
    },
    benefits: {
      detected: benefits,
      count: benefits.length,
      categories: benefitCategories,
    },
    trust: {
      detected: trust,
      count: trust.length,
      categories: trustCategories,
    },
  };
}

/**
 * Get summary statistics for capability map
 */
export function getCapabilitySummary(capabilityMap: AppCapabilityMap): {
  totalCapabilities: number;
  featureCount: number;
  benefitCount: number;
  trustCount: number;
  uniqueCategories: number;
  topCategories: string[];
} {
  const totalCapabilities =
    capabilityMap.features.count +
    capabilityMap.benefits.count +
    capabilityMap.trust.count;

  // Aggregate all categories with counts
  const categoryCounts = new Map<string, number>();

  for (const feature of capabilityMap.features.detected) {
    categoryCounts.set(feature.category, (categoryCounts.get(feature.category) || 0) + 1);
  }
  for (const benefit of capabilityMap.benefits.detected) {
    categoryCounts.set(benefit.category, (categoryCounts.get(benefit.category) || 0) + 1);
  }
  for (const trust of capabilityMap.trust.detected) {
    categoryCounts.set(trust.category, (categoryCounts.get(trust.category) || 0) + 1);
  }

  // Sort categories by count
  const sortedCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  return {
    totalCapabilities,
    featureCount: capabilityMap.features.count,
    benefitCount: capabilityMap.benefits.count,
    trustCount: capabilityMap.trust.count,
    uniqueCategories: categoryCounts.size,
    topCategories: sortedCategories.slice(0, 5),
  };
}
