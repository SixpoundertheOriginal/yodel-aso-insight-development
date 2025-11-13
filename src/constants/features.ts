/**
 * UNIFIED FEATURE PERMISSION SYSTEM
 * Single source of truth for all platform features
 */

// Global AI Insights Kill-Switch with Super Admin Bypass
const bool = (v: any) => String(v).toLowerCase() === 'true' || v === true;
const AI_INSIGHTS_ENV_ENABLED = bool(import.meta.env.VITE_AI_INSIGHTS_ENABLED) || false;

/**
 * Check if AI Insights feature is enabled
 * @param isSuperAdmin - Whether the current user is a super admin
 * @returns true if AI Insights is enabled via environment variable OR user is super admin
 */
export const isAIInsightsEnabled = (isSuperAdmin: boolean = false): boolean => {
  return AI_INSIGHTS_ENV_ENABLED || isSuperAdmin;
};

// Legacy export for backward compatibility (deprecated - use isAIInsightsEnabled instead)
export const AI_INSIGHTS_ENABLED = AI_INSIGHTS_ENV_ENABLED;

export type UserRole = 'super_admin' | 'org_admin' | 'aso_manager' | 'analyst' | 'viewer' | 'client';

/**
 * UNIFIED PLATFORM FEATURES - 24 Features in 5 Categories
 * This is the single source of truth for all feature definitions
 */
export const PLATFORM_FEATURES_ENHANCED = {
  // Performance Intelligence (5 features)
  EXECUTIVE_DASHBOARD: 'executive_dashboard',
  ANALYTICS: 'analytics', 
  CONVERSION_INTELLIGENCE: 'conversion_intelligence',
  PERFORMANCE_INTELLIGENCE: 'performance_intelligence',
  PREDICTIVE_FORECASTING: 'predictive_forecasting',

  // AI Command Center (4 features)
  ASO_AI_HUB: 'aso_ai_hub',
  CHATGPT_VISIBILITY_AUDIT: 'chatgpt_visibility_audit',
  AI_METADATA_GENERATOR: 'metadata_generator',
  STRATEGIC_AUDIT_ENGINE: 'strategic_audit_engine',

  // Growth Accelerators (12 features)
  KEYWORD_INTELLIGENCE: 'keyword_intelligence',
  COMPETITIVE_INTELLIGENCE: 'competitive_intelligence',
  COMPETITOR_OVERVIEW: 'competitor_overview',
  THEME_ANALYSIS: 'theme_analysis',
  CREATIVE_REVIEW: 'creative_review',
  APP_DISCOVERY: 'app_discovery',
  ASO_CHAT: 'aso_chat',
  MARKET_INTELLIGENCE: 'market_intelligence',
  REVIEWS_PUBLIC_RSS_ENABLED: 'reviews_public_rss_enabled',
  CREATIVE_ANALYSIS: 'creative_analysis',
  KEYWORD_RANK_TRACKING: 'keyword_rank_tracking',
  VISIBILITY_OPTIMIZER: 'visibility_optimizer',

  // Control Center (3 features)
  APP_INTELLIGENCE: 'app_intelligence',
  PORTFOLIO_MANAGER: 'portfolio_manager',
  SYSTEM_CONTROL: 'system_control',

  // Account (2 features)
  PROFILE_MANAGEMENT: 'profile_management',
  PREFERENCES: 'preferences',
} as const;

export type PlatformFeature = typeof PLATFORM_FEATURES_ENHANCED[keyof typeof PLATFORM_FEATURES_ENHANCED];

/**
 * FEATURE CATEGORIES - Organized UI display
 */
export const FEATURE_CATEGORIES = {
  PERFORMANCE_INTELLIGENCE: {
    name: 'Performance Intelligence',
    description: 'Analytics, dashboards and performance metrics',
    features: ['executive_dashboard', 'analytics', 'conversion_intelligence', 'performance_intelligence', 'predictive_forecasting']
  },
  AI_COMMAND_CENTER: {
    name: 'AI Command Center',
    description: 'AI-powered optimization and audit tools',
    features: ['aso_ai_hub', 'chatgpt_visibility_audit', 'metadata_generator', 'strategic_audit_engine']
  },
  GROWTH_ACCELERATORS: {
    name: 'Growth Accelerators',
    description: 'User acquisition and growth optimization tools',
    features: ['keyword_intelligence', 'competitive_intelligence', 'competitor_overview', 'theme_analysis', 'creative_review', 'app_discovery', 'aso_chat', 'market_intelligence', 'reviews_public_rss_enabled', 'creative_analysis', 'keyword_rank_tracking', 'visibility_optimizer']
  },
  CONTROL_CENTER: {
    name: 'Control Center',
    description: 'App management and portfolio control',
    features: ['app_intelligence', 'portfolio_manager', 'system_control']
  },
  ACCOUNT: {
    name: 'Account',
    description: 'User profile and account settings',
    features: ['profile_management', 'preferences']
  }
} as const;

/**
 * FEATURE LABELS - Human readable names
 */
export const FEATURE_LABELS: Record<string, string> = {
  // Performance Intelligence
  [PLATFORM_FEATURES_ENHANCED.EXECUTIVE_DASHBOARD]: 'Executive Dashboard',
  [PLATFORM_FEATURES_ENHANCED.ANALYTICS]: 'Advanced Analytics',
  [PLATFORM_FEATURES_ENHANCED.CONVERSION_INTELLIGENCE]: 'Conversion Intelligence',
  [PLATFORM_FEATURES_ENHANCED.PERFORMANCE_INTELLIGENCE]: 'Performance Intelligence',
  [PLATFORM_FEATURES_ENHANCED.PREDICTIVE_FORECASTING]: 'Predictive Forecasting',

  // AI Command Center
  [PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB]: 'ASO AI Hub',
  [PLATFORM_FEATURES_ENHANCED.CHATGPT_VISIBILITY_AUDIT]: 'ChatGPT Visibility Audit',
  [PLATFORM_FEATURES_ENHANCED.AI_METADATA_GENERATOR]: 'AI Metadata Generator',
  [PLATFORM_FEATURES_ENHANCED.STRATEGIC_AUDIT_ENGINE]: 'Strategic Audit Engine',

  // Growth Accelerators
  [PLATFORM_FEATURES_ENHANCED.KEYWORD_INTELLIGENCE]: 'Keyword Intelligence',
  [PLATFORM_FEATURES_ENHANCED.COMPETITIVE_INTELLIGENCE]: 'Competitive Intelligence',
  [PLATFORM_FEATURES_ENHANCED.COMPETITOR_OVERVIEW]: 'Competitor Overview',
  [PLATFORM_FEATURES_ENHANCED.THEME_ANALYSIS]: 'Theme Analysis',
  [PLATFORM_FEATURES_ENHANCED.CREATIVE_REVIEW]: 'Creative Review',
  [PLATFORM_FEATURES_ENHANCED.APP_DISCOVERY]: 'App Discovery',
  [PLATFORM_FEATURES_ENHANCED.ASO_CHAT]: 'ASO Chat Assistant',
  [PLATFORM_FEATURES_ENHANCED.MARKET_INTELLIGENCE]: 'Market Intelligence',
  [PLATFORM_FEATURES_ENHANCED.REVIEWS_PUBLIC_RSS_ENABLED]: 'Public Reviews RSS',
  [PLATFORM_FEATURES_ENHANCED.CREATIVE_ANALYSIS]: 'Creative Analysis',
  [PLATFORM_FEATURES_ENHANCED.KEYWORD_RANK_TRACKING]: 'Keyword Rank Tracking',
  [PLATFORM_FEATURES_ENHANCED.VISIBILITY_OPTIMIZER]: 'Visibility Optimizer',

  // Control Center
  [PLATFORM_FEATURES_ENHANCED.APP_INTELLIGENCE]: 'App Intelligence',
  [PLATFORM_FEATURES_ENHANCED.PORTFOLIO_MANAGER]: 'Portfolio Manager',
  [PLATFORM_FEATURES_ENHANCED.SYSTEM_CONTROL]: 'System Control',

  // Account
  [PLATFORM_FEATURES_ENHANCED.PROFILE_MANAGEMENT]: 'Profile Management',
  [PLATFORM_FEATURES_ENHANCED.PREFERENCES]: 'Preferences',
};

/**
 * FEATURE DESCRIPTIONS - Detailed explanations
 */
export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  // Performance Intelligence
  [PLATFORM_FEATURES_ENHANCED.EXECUTIVE_DASHBOARD]: 'High-level KPI dashboard for executives and stakeholders',
  [PLATFORM_FEATURES_ENHANCED.ANALYTICS]: 'Advanced analytics with custom reports and data visualization',
  [PLATFORM_FEATURES_ENHANCED.CONVERSION_INTELLIGENCE]: 'Conversion optimization insights and benchmarking',
  [PLATFORM_FEATURES_ENHANCED.PERFORMANCE_INTELLIGENCE]: 'App performance metrics and trend analysis',
  [PLATFORM_FEATURES_ENHANCED.PREDICTIVE_FORECASTING]: 'ML-powered forecasting and predictive analytics',

  // AI Command Center
  [PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB]: 'Central hub for all AI-powered ASO tools and insights',
  [PLATFORM_FEATURES_ENHANCED.CHATGPT_VISIBILITY_AUDIT]: 'Audit app visibility in ChatGPT and AI search results',
  [PLATFORM_FEATURES_ENHANCED.AI_METADATA_GENERATOR]: 'AI-powered app metadata generation and optimization',
  [PLATFORM_FEATURES_ENHANCED.STRATEGIC_AUDIT_ENGINE]: 'Comprehensive ASO strategy analysis and recommendations',

  // Growth Accelerators
  [PLATFORM_FEATURES_ENHANCED.KEYWORD_INTELLIGENCE]: 'Advanced keyword research, tracking and optimization tools',
  [PLATFORM_FEATURES_ENHANCED.COMPETITIVE_INTELLIGENCE]: 'Competitor analysis, benchmarking and market intelligence',
  [PLATFORM_FEATURES_ENHANCED.COMPETITOR_OVERVIEW]: 'Competitor overview dashboard with comparative metrics',
  [PLATFORM_FEATURES_ENHANCED.THEME_ANALYSIS]: 'Review theme analysis and sentiment insights',
  [PLATFORM_FEATURES_ENHANCED.CREATIVE_REVIEW]: 'Creative asset performance analysis and optimization',
  [PLATFORM_FEATURES_ENHANCED.APP_DISCOVERY]: 'App store discovery optimization and ranking insights',
  [PLATFORM_FEATURES_ENHANCED.ASO_CHAT]: 'AI chat assistant for ASO strategy and optimization guidance',
  [PLATFORM_FEATURES_ENHANCED.MARKET_INTELLIGENCE]: 'Market trends, category analysis and opportunity identification',
  [PLATFORM_FEATURES_ENHANCED.REVIEWS_PUBLIC_RSS_ENABLED]: 'Public RSS feeds for app reviews monitoring',
  [PLATFORM_FEATURES_ENHANCED.CREATIVE_ANALYSIS]: 'Creative asset A/B testing and performance insights',
  [PLATFORM_FEATURES_ENHANCED.KEYWORD_RANK_TRACKING]: 'Real-time keyword ranking monitoring and alerts',
  [PLATFORM_FEATURES_ENHANCED.VISIBILITY_OPTIMIZER]: 'App store visibility optimization and enhancement tools',

  // Control Center
  [PLATFORM_FEATURES_ENHANCED.APP_INTELLIGENCE]: 'Comprehensive app performance and intelligence dashboard',
  [PLATFORM_FEATURES_ENHANCED.PORTFOLIO_MANAGER]: 'Multi-app portfolio management and optimization',
  [PLATFORM_FEATURES_ENHANCED.SYSTEM_CONTROL]: 'System administration and configuration controls',

  // Account
  [PLATFORM_FEATURES_ENHANCED.PROFILE_MANAGEMENT]: 'User profile settings and account management',
  [PLATFORM_FEATURES_ENHANCED.PREFERENCES]: 'Personal preferences and notification settings',
};

/**
 * ROLE-BASED FEATURE ACCESS - Default permissions by role
 */
export const ROLE_FEATURE_DEFAULTS: Record<UserRole, string[]> = {
  super_admin: Object.values(PLATFORM_FEATURES_ENHANCED),
  org_admin: [
    // Performance Intelligence - Full access
    ...FEATURE_CATEGORIES.PERFORMANCE_INTELLIGENCE.features,
    // AI Command Center - Limited access (no strategic audit)
    PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB,
    PLATFORM_FEATURES_ENHANCED.AI_METADATA_GENERATOR,
    // Growth Accelerators - Full access except system controls
    ...FEATURE_CATEGORIES.GROWTH_ACCELERATORS.features,
    // Control Center - Limited access
    PLATFORM_FEATURES_ENHANCED.APP_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.PORTFOLIO_MANAGER,
    // Account - Full access
    ...FEATURE_CATEGORIES.ACCOUNT.features,
  ],
  aso_manager: [
    // Performance Intelligence - Basic access
    PLATFORM_FEATURES_ENHANCED.ANALYTICS,
    PLATFORM_FEATURES_ENHANCED.PERFORMANCE_INTELLIGENCE,
    // AI Command Center - Basic access
    PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB,
    PLATFORM_FEATURES_ENHANCED.AI_METADATA_GENERATOR,
    // Growth Accelerators - Core ASO tools
    PLATFORM_FEATURES_ENHANCED.KEYWORD_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.COMPETITIVE_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.CREATIVE_REVIEW,
    PLATFORM_FEATURES_ENHANCED.ASO_CHAT,
    // Account
    ...FEATURE_CATEGORIES.ACCOUNT.features,
  ],
  analyst: [
    // Performance Intelligence - Analytics focused
    PLATFORM_FEATURES_ENHANCED.ANALYTICS,
    PLATFORM_FEATURES_ENHANCED.CONVERSION_INTELLIGENCE,
    // Growth Accelerators - Data analysis tools
    PLATFORM_FEATURES_ENHANCED.COMPETITIVE_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.KEYWORD_INTELLIGENCE,
    // Account
    ...FEATURE_CATEGORIES.ACCOUNT.features,
  ],
  viewer: [
    // Basic read-only access
    PLATFORM_FEATURES_ENHANCED.ANALYTICS,
    PLATFORM_FEATURES_ENHANCED.APP_INTELLIGENCE,
    // Account
    ...FEATURE_CATEGORIES.ACCOUNT.features,
  ],
  client: [
    // Minimal client access
    PLATFORM_FEATURES_ENHANCED.ANALYTICS,
    // Account
    ...FEATURE_CATEGORIES.ACCOUNT.features,
  ],
};

/**
 * Helper function to check if a feature is enabled for a role
 */
export function featureEnabledForRole(
  featureKey: string,
  role: UserRole
): boolean {
  // Super admin bypass - always has access
  if (role === 'super_admin') {
    return true;
  }
  
  const roleFeatures = ROLE_FEATURE_DEFAULTS[role] || [];
  return roleFeatures.includes(featureKey);
}

/**
 * LEGACY COMPATIBILITY - Keep for backward compatibility during migration
 */
// Legacy compatibility - use PLATFORM_FEATURES_ENHANCED directly
export const PLATFORM_FEATURES = PLATFORM_FEATURES_ENHANCED;

export type FeatureKey = PlatformFeature;
export type RoleKey = UserRole;