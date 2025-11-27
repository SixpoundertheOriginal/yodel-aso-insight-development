/**
 * Description Intelligence Layer
 *
 * Phase 2: Extract app capabilities from description text
 * Detects: Features, Benefits, Trust Signals
 *
 * v2.0: Uses 50 generic patterns (20 feature, 20 benefit, 10 trust)
 * v2.1: Will expand to vertical-specific patterns (50-80 per vertical)
 */

import {
  GENERIC_FEATURE_PATTERNS,
  GENERIC_BENEFIT_PATTERNS,
  GENERIC_TRUST_PATTERNS,
} from '@/engine/metadata/data/generic-capability-patterns';
import type { AppCapabilityMap, DetectedCapability, CapabilityPattern } from '@/types/auditV2';
import { featureFlags } from '@/lib/featureFlags';

// ============================================================================
// EXTRACTION LOGIC
// ============================================================================

/**
 * Extract a single capability type from text
 *
 * @param text - Description text to analyze
 * @param patterns - Array of capability patterns
 * @param type - Type of capability (for logging)
 * @returns Array of detected capabilities
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
  // Check feature flag
  if (!featureFlags.descriptionIntelligence()) {
    // Feature disabled, return empty map
    return {
      features: { detected: [], count: 0, categories: [] },
      benefits: { detected: [], count: 0, categories: [] },
      trust: { detected: [], count: 0, categories: [] },
    };
  }

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

/**
 * Check if description mentions a specific capability
 * Useful for gap analysis
 */
export function hasCapability(
  capabilityMap: AppCapabilityMap,
  capabilityText: string,
  type?: 'feature' | 'benefit' | 'trust'
): boolean {
  const normalized = capabilityText.toLowerCase();

  const checkInList = (list: DetectedCapability[]) =>
    list.some(c => c.text.toLowerCase().includes(normalized) || normalized.includes(c.text.toLowerCase()));

  if (!type || type === 'feature') {
    if (checkInList(capabilityMap.features.detected)) return true;
  }
  if (!type || type === 'benefit') {
    if (checkInList(capabilityMap.benefits.detected)) return true;
  }
  if (!type || type === 'trust') {
    if (checkInList(capabilityMap.trust.detected)) return true;
  }

  return false;
}

/**
 * Get capabilities by category
 */
export function getCapabilitiesByCategory(
  capabilityMap: AppCapabilityMap,
  category: string
): {
  features: DetectedCapability[];
  benefits: DetectedCapability[];
  trust: DetectedCapability[];
} {
  return {
    features: capabilityMap.features.detected.filter(f => f.category === category),
    benefits: capabilityMap.benefits.detected.filter(b => b.category === category),
    trust: capabilityMap.trust.detected.filter(t => t.category === category),
  };
}

/**
 * Get high-confidence capabilities (confidence >= 0.8)
 */
export function getHighConfidenceCapabilities(capabilityMap: AppCapabilityMap): {
  features: DetectedCapability[];
  benefits: DetectedCapability[];
  trust: DetectedCapability[];
} {
  return {
    features: capabilityMap.features.detected.filter(f => (f.confidence || 0) >= 0.8),
    benefits: capabilityMap.benefits.detected.filter(b => (b.confidence || 0) >= 0.8),
    trust: capabilityMap.trust.detected.filter(t => (t.confidence || 0) >= 0.8),
  };
}

/**
 * Get capabilities by criticality (from patterns)
 */
export function getCriticalCapabilities(capabilityMap: AppCapabilityMap): {
  features: DetectedCapability[];
  benefits: DetectedCapability[];
  trust: DetectedCapability[];
} {
  // Critical capabilities have confidence = 1.0
  return {
    features: capabilityMap.features.detected.filter(f => (f.confidence || 0) === 1.0),
    benefits: capabilityMap.benefits.detected.filter(b => (b.confidence || 0) === 1.0),
    trust: capabilityMap.trust.detected.filter(t => (t.confidence || 0) === 1.0),
  };
}

// ============================================================================
// VALIDATION & DEBUGGING
// ============================================================================

/**
 * Validate capability extraction results
 * Useful for debugging pattern quality
 */
export function validateCapabilityExtraction(
  description: string,
  capabilityMap: AppCapabilityMap
): {
  valid: boolean;
  warnings: string[];
  stats: {
    descriptionLength: number;
    totalCapabilities: number;
    capabilitiesPerChar: number;
    duplicates: number;
  };
} {
  const warnings: string[] = [];

  // Check for empty description
  if (!description || description.trim().length === 0) {
    warnings.push('Description is empty');
  }

  // Check for suspiciously low extraction (description > 500 chars but < 3 capabilities)
  if (description.length > 500 && capabilityMap.features.count + capabilityMap.benefits.count < 3) {
    warnings.push('Low capability extraction rate for long description');
  }

  // Check for duplicate detections (same text multiple times)
  const allTexts = [
    ...capabilityMap.features.detected.map(f => f.text),
    ...capabilityMap.benefits.detected.map(b => b.text),
    ...capabilityMap.trust.detected.map(t => t.text),
  ];
  const uniqueTexts = new Set(allTexts);
  const duplicates = allTexts.length - uniqueTexts.size;

  if (duplicates > 0) {
    warnings.push(`Found ${duplicates} duplicate capability detections`);
  }

  const totalCapabilities = capabilityMap.features.count + capabilityMap.benefits.count + capabilityMap.trust.count;

  return {
    valid: warnings.length === 0,
    warnings,
    stats: {
      descriptionLength: description.length,
      totalCapabilities,
      capabilitiesPerChar: description.length > 0 ? totalCapabilities / description.length : 0,
      duplicates,
    },
  };
}

/**
 * Get extraction diagnostics for debugging
 */
export function getExtractionDiagnostics(): {
  patternsLoaded: boolean;
  patternCounts: {
    features: number;
    benefits: number;
    trust: number;
    total: number;
  };
  featureFlagEnabled: boolean;
} {
  return {
    patternsLoaded: true, // Patterns are always loaded (static imports)
    patternCounts: {
      features: GENERIC_FEATURE_PATTERNS.length,
      benefits: GENERIC_BENEFIT_PATTERNS.length,
      trust: GENERIC_TRUST_PATTERNS.length,
      total: GENERIC_FEATURE_PATTERNS.length + GENERIC_BENEFIT_PATTERNS.length + GENERIC_TRUST_PATTERNS.length,
    },
    featureFlagEnabled: featureFlags.descriptionIntelligence(),
  };
}
