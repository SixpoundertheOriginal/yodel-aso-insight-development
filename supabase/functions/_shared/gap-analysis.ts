/**
 * Gap Analysis Engine (Deno-compatible)
 *
 * Phase 3: Simplified gap analysis for edge functions
 * Detects missing capabilities by comparing against vertical benchmarks
 */

import type { AppCapabilityMap } from './description-intelligence.ts';

// ============================================================================
// TYPES
// ============================================================================

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface DetectedGap {
  id: string;
  category: 'feature' | 'benefit' | 'trust';
  severity: GapSeverity;
  capability: string;
  description: string;
  impactScore: number;
  recommendedAction: string;
  examples?: string[];
}

export interface CapabilityGapAnalysis {
  category: 'feature' | 'benefit' | 'trust';
  detectedCount: number;
  expectedCount: number;
  missingCount: number;
  coveragePercentage: number;
  gaps: DetectedGap[];
  strengths: string[];
}

export interface GapAnalysisResult {
  overallGapScore: number;
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
  featureGaps: CapabilityGapAnalysis;
  benefitGaps: CapabilityGapAnalysis;
  trustGaps: CapabilityGapAnalysis;
  prioritizedGaps: DetectedGap[];
  topRecommendations: string[];
  verticalId: string;
  benchmarkSource: 'vertical' | 'base';
  analysisTimestamp: string;
}

interface ExpectedCapability {
  name: string;
  category: 'feature' | 'benefit' | 'trust';
  severity: GapSeverity;
  description: string;
  keywords: string[];
  examples: string[];
  prevalence: number;
}

// ============================================================================
// EMBEDDED BENCHMARKS (SIMPLIFIED)
// ============================================================================

const LANGUAGE_LEARNING_BENCHMARK = {
  features: [
    {
      name: 'offline_mode',
      category: 'feature' as const,
      severity: 'critical' as GapSeverity,
      description: 'Ability to learn without internet connection',
      keywords: ['offline', 'without internet', 'no connection'],
      examples: ['Learn offline', 'Works offline'],
      prevalence: 85,
    },
    {
      name: 'voice_recognition',
      category: 'feature' as const,
      severity: 'high' as GapSeverity,
      description: 'Speech recognition for pronunciation',
      keywords: ['voice', 'speech', 'pronunciation', 'speak'],
      examples: ['Practice speaking', 'Voice recognition'],
      prevalence: 75,
    },
    {
      name: 'personalized',
      category: 'feature' as const,
      severity: 'high' as GapSeverity,
      description: 'Personalized learning paths',
      keywords: ['personalized', 'custom', 'adaptive', 'tailored'],
      examples: ['Personalized lessons', 'Custom path'],
      prevalence: 80,
    },
  ],
  benefits: [
    {
      name: 'fluency',
      category: 'benefit' as const,
      severity: 'critical' as GapSeverity,
      description: 'Achieve fluency',
      keywords: ['fluent', 'speak fluently', 'conversational', 'master'],
      examples: ['Speak fluently', 'Master Spanish'],
      prevalence: 90,
    },
    {
      name: 'fast_learning',
      category: 'benefit' as const,
      severity: 'high' as GapSeverity,
      description: 'Learn quickly',
      keywords: ['fast', 'quick', 'efficiently', 'in weeks'],
      examples: ['Learn fast', 'Speak in weeks'],
      prevalence: 80,
    },
  ],
  trust: [
    {
      name: 'user_base',
      category: 'trust' as const,
      severity: 'high' as GapSeverity,
      description: 'Large user base',
      keywords: ['millions', 'trusted by', 'join millions'],
      examples: ['Join 100M+ learners', 'Trusted by millions'],
      prevalence: 75,
    },
  ],
};

const FINANCE_BENCHMARK = {
  features: [
    {
      name: 'budget_tracking',
      category: 'feature' as const,
      severity: 'critical' as GapSeverity,
      description: 'Track spending and budgets',
      keywords: ['budget', 'track spending', 'expense'],
      examples: ['Track your budget', 'Monitor spending'],
      prevalence: 90,
    },
    {
      name: 'secure',
      category: 'feature' as const,
      severity: 'critical' as GapSeverity,
      description: 'Bank-level security',
      keywords: ['secure', 'encrypted', 'bank-level', 'protected'],
      examples: ['Bank-level encryption', 'Secure and private'],
      prevalence: 95,
    },
    {
      name: 'insights',
      category: 'feature' as const,
      severity: 'high' as GapSeverity,
      description: 'Financial insights',
      keywords: ['insights', 'analytics', 'reports'],
      examples: ['Financial insights', 'Spending analysis'],
      prevalence: 75,
    },
  ],
  benefits: [
    {
      name: 'save_money',
      category: 'benefit' as const,
      severity: 'critical' as GapSeverity,
      description: 'Save money',
      keywords: ['save money', 'cut costs', 'reduce spending'],
      examples: ['Save $1000s', 'Cut spending'],
      prevalence: 85,
    },
    {
      name: 'build_wealth',
      category: 'benefit' as const,
      severity: 'high' as GapSeverity,
      description: 'Build wealth',
      keywords: ['build wealth', 'grow savings', 'financial freedom'],
      examples: ['Build wealth', 'Financial freedom'],
      prevalence: 75,
    },
  ],
  trust: [
    {
      name: 'security',
      category: 'trust' as const,
      severity: 'critical' as GapSeverity,
      description: 'Security certifications',
      keywords: ['certified', 'compliant', 'regulated', 'audited'],
      examples: ['SOC 2 certified', 'Bank-level security'],
      prevalence: 80,
    },
  ],
};

const FITNESS_BENCHMARK = {
  features: [
    {
      name: 'workout_plans',
      category: 'feature' as const,
      severity: 'critical' as GapSeverity,
      description: 'Workout plans',
      keywords: ['workout', 'training', 'exercise', 'programs'],
      examples: ['Workout plans', 'Training programs'],
      prevalence: 90,
    },
    {
      name: 'progress_tracking',
      category: 'feature' as const,
      severity: 'high' as GapSeverity,
      description: 'Track progress',
      keywords: ['track', 'log', 'measure', 'progress'],
      examples: ['Track progress', 'Log workouts'],
      prevalence: 85,
    },
  ],
  benefits: [
    {
      name: 'get_fit',
      category: 'benefit' as const,
      severity: 'critical' as GapSeverity,
      description: 'Get fit',
      keywords: ['get fit', 'lose weight', 'build muscle', 'tone'],
      examples: ['Get fit fast', 'Lose weight'],
      prevalence: 90,
    },
    {
      name: 'transform',
      category: 'benefit' as const,
      severity: 'high' as GapSeverity,
      description: 'Transform body',
      keywords: ['transform', 'transformation', 'look great', 'feel amazing'],
      examples: ['Transform your body', 'Look amazing'],
      prevalence: 80,
    },
  ],
  trust: [
    {
      name: 'professional',
      category: 'trust' as const,
      severity: 'high' as GapSeverity,
      description: 'Professional trainers',
      keywords: ['certified', 'trainer', 'expert', 'professional'],
      examples: ['Certified trainers', 'Expert-designed'],
      prevalence: 70,
    },
  ],
};

const BASE_BENCHMARK = {
  features: [
    {
      name: 'easy_to_use',
      category: 'feature' as const,
      severity: 'high' as GapSeverity,
      description: 'Easy to use',
      keywords: ['easy', 'simple', 'intuitive', 'user-friendly'],
      examples: ['Easy to use', 'Simple interface'],
      prevalence: 70,
    },
    {
      name: 'free',
      category: 'feature' as const,
      severity: 'medium' as GapSeverity,
      description: 'Free or affordable',
      keywords: ['free', 'affordable', 'no cost'],
      examples: ['Free to use', 'Affordable pricing'],
      prevalence: 60,
    },
  ],
  benefits: [
    {
      name: 'save_time',
      category: 'benefit' as const,
      severity: 'high' as GapSeverity,
      description: 'Save time',
      keywords: ['save time', 'faster', 'efficient'],
      examples: ['Save time', 'Work faster'],
      prevalence: 65,
    },
  ],
  trust: [
    {
      name: 'privacy',
      category: 'trust' as const,
      severity: 'high' as GapSeverity,
      description: 'Privacy and security',
      keywords: ['private', 'secure', 'encrypted', 'safe'],
      examples: ['Your data is private', 'Secure'],
      prevalence: 70,
    },
  ],
};

// ============================================================================
// GAP DETECTION LOGIC
// ============================================================================

function getBenchmark(verticalId: string) {
  switch (verticalId) {
    case 'language_learning':
      return LANGUAGE_LEARNING_BENCHMARK;
    case 'finance':
      return FINANCE_BENCHMARK;
    case 'fitness':
      return FITNESS_BENCHMARK;
    default:
      return BASE_BENCHMARK;
  }
}

function hasBenchmark(verticalId: string): boolean {
  return ['language_learning', 'finance', 'fitness'].includes(verticalId);
}

function isCapabilityDetected(expected: ExpectedCapability, detectedCategories: string[]): boolean {
  const normalized = detectedCategories.map(c => c.toLowerCase());

  for (const keyword of expected.keywords) {
    const keywordLower = keyword.toLowerCase();
    for (const detected of normalized) {
      if (detected.includes(keywordLower) || keywordLower.includes(detected)) {
        return true;
      }
    }
  }

  return false;
}

function calculateImpactScore(expected: ExpectedCapability): number {
  const severityWeights = { critical: 1.0, high: 0.8, medium: 0.5, low: 0.3 };
  const categoryWeights = { feature: 1.0, benefit: 0.8, trust: 0.6 };

  const severityWeight = severityWeights[expected.severity];
  const prevalenceScore = expected.prevalence / 100;
  const categoryWeight = categoryWeights[expected.category];

  const impactScore = prevalenceScore * 0.4 + severityWeight * 0.4 + categoryWeight * 0.2;

  return Math.round(impactScore * 100);
}

function analyzeCategory(
  expected: ExpectedCapability[],
  detectedCategories: string[]
): CapabilityGapAnalysis {
  const gaps: DetectedGap[] = [];
  const strengths: string[] = [];

  for (const exp of expected) {
    const isDetected = isCapabilityDetected(exp, detectedCategories);

    if (!isDetected) {
      const impactScore = calculateImpactScore(exp);
      const action = `Add "${exp.name.replace(/_/g, ' ')}" to description`;

      gaps.push({
        id: `gap_${exp.category}_${exp.name}`,
        category: exp.category,
        severity: exp.severity,
        capability: exp.name,
        description: exp.description,
        impactScore,
        recommendedAction: action,
        examples: exp.examples,
      });
    } else {
      strengths.push(exp.name);
    }
  }

  const detectedCount = strengths.length;
  const expectedCount = expected.length;
  const missingCount = gaps.length;
  const coveragePercentage = expectedCount > 0 ? (detectedCount / expectedCount) * 100 : 0;

  return {
    category: expected[0]?.category || 'feature',
    detectedCount,
    expectedCount,
    missingCount,
    coveragePercentage,
    gaps,
    strengths,
  };
}

/**
 * Perform gap analysis
 */
export function analyzeCapabilityGaps(
  capabilityMap: AppCapabilityMap,
  verticalId: string
): GapAnalysisResult {
  const benchmark = getBenchmark(verticalId);
  const benchmarkSource = hasBenchmark(verticalId) ? 'vertical' : 'base';

  // Analyze each category
  const featureGaps = analyzeCategory(benchmark.features, capabilityMap.features.categories);
  const benefitGaps = analyzeCategory(benchmark.benefits, capabilityMap.benefits.categories);
  const trustGaps = analyzeCategory(benchmark.trust, capabilityMap.trust.categories);

  // Combine and sort gaps
  const allGaps = [...featureGaps.gaps, ...benefitGaps.gaps, ...trustGaps.gaps];
  const prioritizedGaps = allGaps.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (b.severity === 'critical' && a.severity !== 'critical') return 1;
    return b.impactScore - a.impactScore;
  });

  // Count by severity
  const criticalGaps = prioritizedGaps.filter(g => g.severity === 'critical').length;
  const highGaps = prioritizedGaps.filter(g => g.severity === 'high').length;
  const mediumGaps = prioritizedGaps.filter(g => g.severity === 'medium').length;
  const lowGaps = prioritizedGaps.filter(g => g.severity === 'low').length;

  // Calculate overall score
  const overallGapScore = Math.round(
    featureGaps.coveragePercentage * 0.4 +
      benefitGaps.coveragePercentage * 0.35 +
      trustGaps.coveragePercentage * 0.25
  );

  // Generate recommendations
  const topRecommendations: string[] = [];
  for (const gap of prioritizedGaps.slice(0, 10)) {
    const emoji = gap.severity === 'critical' ? '🔴' : gap.severity === 'high' ? '🟠' : gap.severity === 'medium' ? '🟡' : '🟢';
    topRecommendations.push(`${emoji} ${gap.recommendedAction}`);
  }

  return {
    overallGapScore,
    totalGaps: prioritizedGaps.length,
    criticalGaps,
    highGaps,
    mediumGaps,
    lowGaps,
    featureGaps,
    benefitGaps,
    trustGaps,
    prioritizedGaps,
    topRecommendations,
    verticalId,
    benchmarkSource,
    analysisTimestamp: new Date().toISOString(),
  };
}
