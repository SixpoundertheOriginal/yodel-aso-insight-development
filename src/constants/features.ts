/**
 * Application Feature Permission Keys
 * 
 * These constants define the available application features that can be controlled
 * through the organization-level permission system.
 */

// Legacy platform features (for backward compatibility)
export const PLATFORM_FEATURES = {
  PERFORMANCE_INTELLIGENCE: 'performance_intelligence',
  EXECUTIVE_DASHBOARD: 'executive_dashboard',
  ANALYTICS: 'analytics',
  CONVERSION_INTELLIGENCE: 'conversion_intelligence',
  KEYWORD_INTELLIGENCE: 'keyword_intelligence',
  METADATA_GENERATOR: 'metadata_generator',
  CREATIVE_REVIEW: 'creative_review',
  ASO_CHAT: 'aso_chat',
  COMPETITIVE_INTELLIGENCE: 'competitive_intelligence',
  APP_DISCOVERY: 'app_discovery',
  ADMIN_PANEL: 'admin_panel'
} as const;

export type PlatformFeature = typeof PLATFORM_FEATURES[keyof typeof PLATFORM_FEATURES];

// Legacy feature labels (for backward compatibility)
export const FEATURE_LABELS: Record<string, string> = {
  [PLATFORM_FEATURES.PERFORMANCE_INTELLIGENCE]: 'Performance Intelligence',
  [PLATFORM_FEATURES.EXECUTIVE_DASHBOARD]: 'Executive Dashboard',
  [PLATFORM_FEATURES.ANALYTICS]: 'Analytics',
  [PLATFORM_FEATURES.CONVERSION_INTELLIGENCE]: 'Conversion Intelligence',
  [PLATFORM_FEATURES.KEYWORD_INTELLIGENCE]: 'Keyword Intelligence',
  [PLATFORM_FEATURES.METADATA_GENERATOR]: 'Metadata Generator',
  [PLATFORM_FEATURES.CREATIVE_REVIEW]: 'Creative Review',
  [PLATFORM_FEATURES.ASO_CHAT]: 'ASO Chat',
  [PLATFORM_FEATURES.COMPETITIVE_INTELLIGENCE]: 'Competitive Intelligence',
  [PLATFORM_FEATURES.APP_DISCOVERY]: 'App Discovery',
  [PLATFORM_FEATURES.ADMIN_PANEL]: 'Admin Panel',
};

// New application feature permission keys (for UI Permission Management)
export const FEATURE_KEYS = {
  ASO_AI_AUDIT: 'features.aso_ai_audit',
  GROWTH_ACCELERATORS: 'features.growth_accelerators',
  METADATA_GENERATOR: 'features.metadata_generator',
  KEYWORD_INTELLIGENCE: 'features.keyword_intelligence',
  CREATIVE_INTELLIGENCE: 'features.creative_intelligence',
  COMPETITIVE_ANALYSIS: 'features.competitive_analysis',
  ADVANCED_ANALYTICS: 'features.advanced_analytics',
} as const;

// Add new feature labels to existing labels object
Object.assign(FEATURE_LABELS, {
  [FEATURE_KEYS.ASO_AI_AUDIT]: 'ASO AI Audit',
  [FEATURE_KEYS.GROWTH_ACCELERATORS]: 'Growth Accelerators',
  [FEATURE_KEYS.METADATA_GENERATOR]: 'AI Metadata Generator',
  [FEATURE_KEYS.KEYWORD_INTELLIGENCE]: 'Keyword Intelligence',
  [FEATURE_KEYS.CREATIVE_INTELLIGENCE]: 'Creative Intelligence',
  [FEATURE_KEYS.COMPETITIVE_ANALYSIS]: 'Competitive Analysis',
  [FEATURE_KEYS.ADVANCED_ANALYTICS]: 'Advanced Analytics',
});

export const FEATURE_DESCRIPTIONS = {
  [FEATURE_KEYS.ASO_AI_AUDIT]: 'AI-powered app store optimization analysis and recommendations',
  [FEATURE_KEYS.GROWTH_ACCELERATORS]: 'User acquisition and retention optimization tools',
  [FEATURE_KEYS.METADATA_GENERATOR]: 'AI-generated app store metadata and optimization suggestions',
  [FEATURE_KEYS.KEYWORD_INTELLIGENCE]: 'Advanced keyword research, tracking and optimization tools',
  [FEATURE_KEYS.CREATIVE_INTELLIGENCE]: 'Asset performance analysis and creative optimization insights',
  [FEATURE_KEYS.COMPETITIVE_ANALYSIS]: 'Competitor tracking, benchmarking and market intelligence',
  [FEATURE_KEYS.ADVANCED_ANALYTICS]: 'Deep dive analytics dashboards and custom reporting',
} as const;

/**
 * Role-based default permissions for application features
 */
export const ROLE_FEATURE_DEFAULTS = {
  SUPER_ADMIN: Object.values(FEATURE_KEYS),
  ORGANIZATION_ADMIN: Object.values(FEATURE_KEYS),
  ASO_MANAGER: [
    FEATURE_KEYS.ASO_AI_AUDIT,
    FEATURE_KEYS.METADATA_GENERATOR,
    FEATURE_KEYS.KEYWORD_INTELLIGENCE,
    FEATURE_KEYS.COMPETITIVE_ANALYSIS,
  ],
  ANALYST: [
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.COMPETITIVE_ANALYSIS,
  ],
  VIEWER: [],
  CLIENT: [],
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];
export type RoleKey = keyof typeof ROLE_FEATURE_DEFAULTS;