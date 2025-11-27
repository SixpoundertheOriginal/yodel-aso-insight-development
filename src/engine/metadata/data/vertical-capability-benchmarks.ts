/**
 * Vertical Capability Benchmarks
 *
 * Phase 3: Expected capabilities for each vertical
 * Used for gap analysis to identify missing features/benefits/trust signals
 *
 * Verticals: Language Learning, Finance, Fitness, Dating, Productivity, Gaming, E-commerce
 */

import type { VerticalCapabilityBenchmark, ExpectedCapability, BaseCapabilityBenchmark } from '@/types/gapAnalysis';

// ============================================================================
// LANGUAGE LEARNING VERTICAL
// ============================================================================

const LANGUAGE_LEARNING_BENCHMARK: VerticalCapabilityBenchmark = {
  verticalId: 'language_learning',
  verticalName: 'Language Learning',

  expectedFeatures: [
    {
      name: 'offline_mode',
      category: 'feature',
      severity: 'critical',
      description: 'Ability to learn without internet connection',
      keywords: ['offline', 'without internet', 'no connection needed'],
      examples: ['Learn offline', 'Practice without internet', 'Works offline'],
      prevalence: 85,
    },
    {
      name: 'voice_recognition',
      category: 'feature',
      severity: 'high',
      description: 'Speech recognition for pronunciation practice',
      keywords: ['voice', 'speech recognition', 'pronunciation', 'speak'],
      examples: ['Practice speaking', 'Voice recognition', 'Pronunciation feedback'],
      prevalence: 75,
    },
    {
      name: 'personalized_lessons',
      category: 'feature',
      severity: 'high',
      description: 'Adaptive learning paths based on user level',
      keywords: ['personalized', 'custom', 'adaptive', 'tailored'],
      examples: ['Personalized lessons', 'Custom learning path', 'Adaptive curriculum'],
      prevalence: 80,
    },
    {
      name: 'progress_tracking',
      category: 'feature',
      severity: 'medium',
      description: 'Track learning progress and achievements',
      keywords: ['progress', 'track', 'achievements', 'stats'],
      examples: ['Track your progress', 'Achievement badges', 'Learning stats'],
      prevalence: 70,
    },
    {
      name: 'gamification',
      category: 'feature',
      severity: 'medium',
      description: 'Game-like elements to increase engagement',
      keywords: ['game', 'fun', 'points', 'streaks', 'challenges'],
      examples: ['Earn points', 'Daily streaks', 'Fun challenges'],
      prevalence: 65,
    },
  ],

  expectedBenefits: [
    {
      name: 'fluency',
      category: 'benefit',
      severity: 'critical',
      description: 'Achieve fluency or conversational ability',
      keywords: ['fluent', 'speak fluently', 'conversational', 'master'],
      examples: ['Speak fluently', 'Master Spanish', 'Become conversational'],
      prevalence: 90,
    },
    {
      name: 'fast_learning',
      category: 'benefit',
      severity: 'high',
      description: 'Learn quickly and efficiently',
      keywords: ['fast', 'quick', 'efficiently', 'in weeks'],
      examples: ['Learn fast', 'Speak in weeks', 'Quick progress'],
      prevalence: 80,
    },
    {
      name: 'confidence',
      category: 'benefit',
      severity: 'high',
      description: 'Build confidence in speaking',
      keywords: ['confidence', 'confident', 'comfortable speaking'],
      examples: ['Build confidence', 'Speak confidently', 'Feel comfortable'],
      prevalence: 60,
    },
    {
      name: 'fun_engaging',
      category: 'benefit',
      severity: 'medium',
      description: 'Enjoyable and engaging learning experience',
      keywords: ['fun', 'engaging', 'enjoyable', 'entertaining'],
      examples: ['Make learning fun', 'Engaging lessons', 'Enjoy the process'],
      prevalence: 70,
    },
  ],

  expectedTrustSignals: [
    {
      name: 'user_base',
      category: 'trust',
      severity: 'high',
      description: 'Large user base as social proof',
      keywords: ['millions of users', 'trusted by', 'join millions'],
      examples: ['Join 100M+ learners', 'Trusted by millions', '#1 language app'],
      prevalence: 75,
    },
    {
      name: 'expert_backed',
      category: 'trust',
      severity: 'medium',
      description: 'Created or endorsed by language experts',
      keywords: ['expert', 'linguist', 'teachers', 'backed by'],
      examples: ['Expert-designed', 'Linguist-approved', 'Teacher-backed'],
      prevalence: 50,
    },
    {
      name: 'proven_method',
      category: 'trust',
      severity: 'medium',
      description: 'Research-backed or proven methodology',
      keywords: ['proven', 'research', 'scientific', 'effective'],
      examples: ['Proven method', 'Research-backed', 'Scientifically effective'],
      prevalence: 55,
    },
  ],

  minFeatureCount: 3,
  minBenefitCount: 2,
  minTrustSignalCount: 1,

  source: 'manual',
  lastUpdated: '2025-01-27',
};

// ============================================================================
// FINANCE VERTICAL
// ============================================================================

const FINANCE_BENCHMARK: VerticalCapabilityBenchmark = {
  verticalId: 'finance',
  verticalName: 'Finance & Banking',

  expectedFeatures: [
    {
      name: 'budget_tracking',
      category: 'feature',
      severity: 'critical',
      description: 'Track spending and budgets',
      keywords: ['budget', 'track spending', 'expense tracking'],
      examples: ['Track your budget', 'Monitor spending', 'Budget automatically'],
      prevalence: 90,
    },
    {
      name: 'secure_encrypted',
      category: 'feature',
      severity: 'critical',
      description: 'Bank-level security and encryption',
      keywords: ['secure', 'encrypted', 'bank-level security', 'protected'],
      examples: ['Bank-level encryption', 'Secure and private', '256-bit encryption'],
      prevalence: 95,
    },
    {
      name: 'investment_tools',
      category: 'feature',
      severity: 'high',
      description: 'Investment tracking or recommendations',
      keywords: ['invest', 'portfolio', 'stocks', 'investment'],
      examples: ['Track investments', 'Smart investing', 'Portfolio management'],
      prevalence: 70,
    },
    {
      name: 'financial_insights',
      category: 'feature',
      severity: 'high',
      description: 'Analytics and financial insights',
      keywords: ['insights', 'analytics', 'reports', 'trends'],
      examples: ['Financial insights', 'Spending analysis', 'Custom reports'],
      prevalence: 75,
    },
    {
      name: 'sync_accounts',
      category: 'feature',
      severity: 'medium',
      description: 'Connect and sync bank accounts',
      keywords: ['sync', 'connect accounts', 'link bank'],
      examples: ['Sync all accounts', 'Connect your bank', 'Link cards'],
      prevalence: 65,
    },
  ],

  expectedBenefits: [
    {
      name: 'save_money',
      category: 'benefit',
      severity: 'critical',
      description: 'Save money and reduce expenses',
      keywords: ['save money', 'cut costs', 'reduce spending'],
      examples: ['Save $1000s', 'Cut unnecessary spending', 'Keep more money'],
      prevalence: 85,
    },
    {
      name: 'build_wealth',
      category: 'benefit',
      severity: 'high',
      description: 'Build wealth and grow savings',
      keywords: ['build wealth', 'grow savings', 'financial freedom'],
      examples: ['Build wealth over time', 'Grow your savings', 'Achieve financial freedom'],
      prevalence: 75,
    },
    {
      name: 'financial_control',
      category: 'benefit',
      severity: 'high',
      description: 'Take control of finances',
      keywords: ['take control', 'manage finances', 'financial clarity'],
      examples: ['Take control of your money', 'Master your finances', 'Get financial clarity'],
      prevalence: 70,
    },
    {
      name: 'peace_of_mind',
      category: 'benefit',
      severity: 'medium',
      description: 'Reduce financial stress',
      keywords: ['peace of mind', 'stress-free', 'confidence', 'worry-free'],
      examples: ['Financial peace of mind', 'Stress-free budgeting', 'Sleep better'],
      prevalence: 60,
    },
  ],

  expectedTrustSignals: [
    {
      name: 'security_certification',
      category: 'trust',
      severity: 'critical',
      description: 'Security certifications and compliance',
      keywords: ['certified', 'compliant', 'regulated', 'audited'],
      examples: ['Bank-level security', 'SOC 2 certified', 'FDIC insured'],
      prevalence: 80,
    },
    {
      name: 'large_user_base',
      category: 'trust',
      severity: 'high',
      description: 'Trusted by millions of users',
      keywords: ['millions', 'trusted by', '#1 finance app'],
      examples: ['Trusted by 10M+ users', '#1 finance app', 'Join millions'],
      prevalence: 70,
    },
    {
      name: 'awards_recognition',
      category: 'trust',
      severity: 'medium',
      description: 'Awards and media recognition',
      keywords: ['award', 'featured', 'best app', 'recognized'],
      examples: ['Award-winning app', 'Featured in Forbes', 'Best Finance App 2024'],
      prevalence: 55,
    },
  ],

  minFeatureCount: 4,
  minBenefitCount: 3,
  minTrustSignalCount: 2,

  source: 'manual',
  lastUpdated: '2025-01-27',
};

// ============================================================================
// FITNESS VERTICAL
// ============================================================================

const FITNESS_BENCHMARK: VerticalCapabilityBenchmark = {
  verticalId: 'fitness',
  verticalName: 'Health & Fitness',

  expectedFeatures: [
    {
      name: 'workout_plans',
      category: 'feature',
      severity: 'critical',
      description: 'Structured workout plans or routines',
      keywords: ['workout plans', 'training programs', 'exercise routines'],
      examples: ['Custom workout plans', 'Professional training programs', 'Guided workouts'],
      prevalence: 90,
    },
    {
      name: 'progress_tracking',
      category: 'feature',
      severity: 'high',
      description: 'Track fitness progress and metrics',
      keywords: ['track progress', 'log workouts', 'measure results'],
      examples: ['Track your progress', 'Log every workout', 'Measure results'],
      prevalence: 85,
    },
    {
      name: 'video_demos',
      category: 'feature',
      severity: 'high',
      description: 'Video demonstrations of exercises',
      keywords: ['video', 'demonstrations', 'follow along', 'guided'],
      examples: ['HD video demos', 'Follow-along videos', 'Visual guides'],
      prevalence: 75,
    },
    {
      name: 'nutrition_tracking',
      category: 'feature',
      severity: 'medium',
      description: 'Nutrition and meal tracking',
      keywords: ['nutrition', 'meal plans', 'calorie tracking', 'diet'],
      examples: ['Track nutrition', 'Custom meal plans', 'Calorie counter'],
      prevalence: 70,
    },
    {
      name: 'device_integration',
      category: 'feature',
      severity: 'medium',
      description: 'Sync with fitness devices and health apps',
      keywords: ['apple watch', 'sync', 'health app', 'fitbit'],
      examples: ['Sync with Apple Watch', 'Connect to Health app', 'Fitbit integration'],
      prevalence: 65,
    },
  ],

  expectedBenefits: [
    {
      name: 'get_fit',
      category: 'benefit',
      severity: 'critical',
      description: 'Achieve fitness goals',
      keywords: ['get fit', 'lose weight', 'build muscle', 'tone'],
      examples: ['Get fit fast', 'Lose weight', 'Build lean muscle'],
      prevalence: 90,
    },
    {
      name: 'transform_body',
      category: 'benefit',
      severity: 'high',
      description: 'Transform your body and appearance',
      keywords: ['transform', 'body transformation', 'look great', 'feel amazing'],
      examples: ['Transform your body', 'Look and feel amazing', 'Get the body you want'],
      prevalence: 80,
    },
    {
      name: 'stay_motivated',
      category: 'benefit',
      severity: 'medium',
      description: 'Stay motivated and consistent',
      keywords: ['motivated', 'consistent', 'stay on track'],
      examples: ['Stay motivated', 'Never miss a workout', 'Build lasting habits'],
      prevalence: 60,
    },
    {
      name: 'save_time',
      category: 'benefit',
      severity: 'medium',
      description: 'Efficient workouts that save time',
      keywords: ['quick workouts', 'time-efficient', 'busy schedule'],
      examples: ['Quick 15-min workouts', 'Perfect for busy schedules', 'Get results faster'],
      prevalence: 65,
    },
  ],

  expectedTrustSignals: [
    {
      name: 'professional_trainers',
      category: 'trust',
      severity: 'high',
      description: 'Created by certified trainers or experts',
      keywords: ['certified trainers', 'fitness experts', 'professional'],
      examples: ['Created by certified trainers', 'Expert-designed workouts', 'Professional coaching'],
      prevalence: 70,
    },
    {
      name: 'user_success',
      category: 'trust',
      severity: 'high',
      description: 'User success stories and results',
      keywords: ['success stories', 'real results', 'thousands transformed'],
      examples: ['Real success stories', 'Thousands transformed', 'See amazing results'],
      prevalence: 75,
    },
    {
      name: 'large_community',
      category: 'trust',
      severity: 'medium',
      description: 'Large supportive community',
      keywords: ['community', 'join millions', 'connect with others'],
      examples: ['Join 5M+ members', 'Supportive community', 'Never workout alone'],
      prevalence: 60,
    },
  ],

  minFeatureCount: 3,
  minBenefitCount: 2,
  minTrustSignalCount: 1,

  source: 'manual',
  lastUpdated: '2025-01-27',
};

// ============================================================================
// BASE (GENERIC) BENCHMARK
// ============================================================================

const BASE_BENCHMARK: BaseCapabilityBenchmark = {
  benchmarkId: 'base',

  coreFeatures: [
    {
      name: 'ease_of_use',
      category: 'feature',
      severity: 'high',
      description: 'Easy to use and user-friendly',
      keywords: ['easy', 'simple', 'intuitive', 'user-friendly'],
      examples: ['Easy to use', 'Simple interface', 'Intuitive design'],
      prevalence: 70,
    },
    {
      name: 'free_or_affordable',
      category: 'feature',
      severity: 'medium',
      description: 'Free or affordable pricing',
      keywords: ['free', 'affordable', 'no cost'],
      examples: ['Free to use', 'Affordable pricing', 'No hidden costs'],
      prevalence: 60,
    },
    {
      name: 'sync_backup',
      category: 'feature',
      severity: 'medium',
      description: 'Sync and backup across devices',
      keywords: ['sync', 'cloud', 'backup'],
      examples: ['Sync across devices', 'Cloud backup', 'Never lose data'],
      prevalence: 55,
    },
  ],

  coreBenefits: [
    {
      name: 'save_time',
      category: 'benefit',
      severity: 'high',
      description: 'Save time and increase efficiency',
      keywords: ['save time', 'faster', 'efficient'],
      examples: ['Save time', 'Get things done faster', 'Work more efficiently'],
      prevalence: 65,
    },
    {
      name: 'achieve_goals',
      category: 'benefit',
      severity: 'medium',
      description: 'Achieve your goals',
      keywords: ['achieve', 'reach goals', 'succeed'],
      examples: ['Achieve your goals', 'Reach your targets', 'Succeed faster'],
      prevalence: 60,
    },
  ],

  coreTrustSignals: [
    {
      name: 'privacy_security',
      category: 'trust',
      severity: 'high',
      description: 'Privacy and security protection',
      keywords: ['private', 'secure', 'encrypted', 'safe'],
      examples: ['Your data is private', 'Secure and encrypted', 'Safe to use'],
      prevalence: 70,
    },
    {
      name: 'reliability',
      category: 'trust',
      severity: 'medium',
      description: 'Reliable and trustworthy',
      keywords: ['reliable', 'trusted', 'dependable'],
      examples: ['Reliable service', 'Trusted by users', 'Dependable app'],
      prevalence: 55,
    },
  ],

  minFeatureCount: 2,
  minBenefitCount: 1,
  minTrustSignalCount: 1,
};

// ============================================================================
// BENCHMARK REGISTRY
// ============================================================================

/**
 * Registry of all vertical capability benchmarks
 */
export const VERTICAL_CAPABILITY_BENCHMARKS: Record<string, VerticalCapabilityBenchmark> = {
  language_learning: LANGUAGE_LEARNING_BENCHMARK,
  finance: FINANCE_BENCHMARK,
  fitness: FITNESS_BENCHMARK,
  // TODO: Add remaining verticals in next iteration
  // dating: DATING_BENCHMARK,
  // productivity: PRODUCTIVITY_BENCHMARK,
  // gaming: GAMING_BENCHMARK,
  // ecommerce: ECOMMERCE_BENCHMARK,
};

/**
 * Base benchmark for apps without vertical-specific benchmark
 */
export const BASE_CAPABILITY_BENCHMARK = BASE_BENCHMARK;

/**
 * Get capability benchmark for a vertical (with fallback to base)
 */
export function getCapabilityBenchmark(
  verticalId: string
): VerticalCapabilityBenchmark | BaseCapabilityBenchmark {
  return VERTICAL_CAPABILITY_BENCHMARKS[verticalId] || BASE_CAPABILITY_BENCHMARK;
}

/**
 * Check if a vertical has a specific benchmark
 */
export function hasVerticalBenchmark(verticalId: string): boolean {
  return verticalId in VERTICAL_CAPABILITY_BENCHMARKS;
}

/**
 * Get list of all available vertical benchmarks
 */
export function getAvailableBenchmarks(): string[] {
  return Object.keys(VERTICAL_CAPABILITY_BENCHMARKS);
}
