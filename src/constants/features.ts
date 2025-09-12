/**
 * Application Feature Permission Keys
 * 
 * These constants define the available application features that can be controlled
 * through the organization-level permission system.
 */

// Global AI Insights Kill-Switch
const bool = (v: any) => String(v).toLowerCase() === 'true' || v === true;
export const AI_INSIGHTS_ENABLED = bool(import.meta.env.VITE_AI_INSIGHTS_ENABLED) || false;

// Define user roles and feature flags
export type UserRole = 'super_admin' | 'org_admin' | 'aso_manager' | 'analyst' | 'viewer' | 'client';
export type FeatureFlag = { enabled: boolean; roles?: UserRole[] };

// Platform feature flags with role-based access control
export const PLATFORM_FEATURES_CONFIG: Record<string, FeatureFlag> = {
  PERFORMANCE_INTELLIGENCE: { enabled: true },
  EXECUTIVE_DASHBOARD: { enabled: true },
  ANALYTICS: { enabled: true },
  CONVERSION_INTELLIGENCE: { enabled: true },
  KEYWORD_INTELLIGENCE: { enabled: true },
  METADATA_GENERATOR: { enabled: true },
  CREATIVE_REVIEW: { enabled: true },
  ASO_CHAT: { enabled: true },
  COMPETITIVE_INTELLIGENCE: { enabled: true },
  APP_DISCOVERY: { enabled: true },
  ADMIN_PANEL: { enabled: true, roles: ['super_admin', 'org_admin'] },
  // New AI audit features
  ASO_AI_HUB: { enabled: true, roles: ['super_admin'] },
  CHATGPT_VISIBILITY_AUDIT: { enabled: true, roles: ['super_admin'] },
  // Growth Accelerators
  REVIEWS_PUBLIC_RSS_ENABLED: { enabled: true }, // Enabled for testing
};

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
  ADMIN_PANEL: 'admin_panel',
  ASO_AI_HUB: 'aso_ai_hub',
  CHATGPT_VISIBILITY_AUDIT: 'chatgpt_visibility_audit',
  REVIEWS_PUBLIC_RSS_ENABLED: 'reviews_public_rss_enabled'
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

/**
 * Defensive helper to check feature access for a role
 * Prevents super_admin lockout due to missing flags
 */
export function featureEnabledForRole(
  key: keyof typeof PLATFORM_FEATURES_CONFIG,
  role: UserRole
): boolean {
  const feature = PLATFORM_FEATURES_CONFIG[key];
  if (!feature) {
    // Safety valve: never lock out super_admin due to a missing flag
    return role === 'super_admin';
  }
  const roleAllowed = feature.roles ? feature.roles.includes(role) : true;
  return Boolean(feature.enabled && roleAllowed);
}