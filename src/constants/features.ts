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

export const FEATURE_LABELS: Record<PlatformFeature, string> = {
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
  [PLATFORM_FEATURES.ADMIN_PANEL]: 'Admin Panel'
};