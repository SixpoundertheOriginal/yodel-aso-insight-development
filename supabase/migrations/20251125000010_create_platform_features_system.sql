-- ============================================
-- CREATE PLATFORM FEATURES SYSTEM
-- Date: 2025-11-25
-- Purpose: Create proper feature management tables for admin UI
-- ============================================

-- 1. Create platform_features table (master list of all features)
CREATE TABLE IF NOT EXISTS platform_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  description text,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create org_feature_entitlements table (replaces organization_features)
CREATE TABLE IF NOT EXISTS org_feature_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  is_enabled boolean DEFAULT false,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, feature_key),
  FOREIGN KEY (feature_key) REFERENCES platform_features(feature_key) ON DELETE CASCADE
);

-- 3. Seed platform_features with all available features (MUST be before migration)
INSERT INTO platform_features (feature_key, feature_name, description, category, is_active) VALUES
  -- Performance Intelligence
  ('executive_dashboard', 'Executive Dashboard', 'High-level KPI dashboard for executives and stakeholders', 'performance_intelligence', true),
  ('analytics', 'Advanced Analytics', 'Advanced analytics with custom reports and data visualization', 'performance_intelligence', true),
  ('conversion_intelligence', 'Conversion Intelligence', 'Conversion optimization insights and benchmarking', 'performance_intelligence', true),
  ('performance_intelligence', 'Performance Intelligence', 'App performance metrics and trend analysis', 'performance_intelligence', true),
  ('predictive_forecasting', 'Predictive Forecasting', 'ML-powered forecasting and predictive analytics', 'performance_intelligence', true),

  -- AI Command Center
  ('aso_ai_hub', 'ASO AI Hub', 'Central hub for all AI-powered ASO tools and insights', 'ai_command_center', true),
  ('chatgpt_visibility_audit', 'ChatGPT Visibility Audit', 'Audit app visibility in ChatGPT and AI search results', 'ai_command_center', true),
  ('metadata_generator', 'AI Metadata Generator', 'AI-powered app metadata generation and optimization', 'ai_command_center', true),
  ('strategic_audit_engine', 'Strategic Audit Engine', 'Comprehensive ASO strategy analysis and recommendations', 'ai_command_center', true),

  -- Growth Accelerators
  ('keyword_intelligence', 'Keyword Intelligence', 'Advanced keyword research, tracking and optimization tools', 'growth_accelerators', true),
  ('competitive_intelligence', 'Competitive Intelligence', 'Competitor analysis, benchmarking and market intelligence', 'growth_accelerators', true),
  ('competitor_overview', 'Competitor Overview', 'Competitor overview dashboard with comparative metrics', 'growth_accelerators', true),
  ('creative_review', 'Creative Review', 'Creative asset performance analysis and optimization', 'growth_accelerators', true),
  ('app_discovery', 'App Discovery', 'App store discovery optimization and ranking insights', 'growth_accelerators', true),
  ('aso_chat', 'ASO Chat Assistant', 'AI chat assistant for ASO strategy and optimization guidance', 'growth_accelerators', true),
  ('market_intelligence', 'Market Intelligence', 'Market trends, category analysis and opportunity identification', 'growth_accelerators', true),
  ('reviews_public_rss_enabled', 'Public Reviews RSS', 'Public RSS feeds for app reviews monitoring', 'growth_accelerators', true),
  ('creative_analysis', 'Creative Analysis', 'Creative asset A/B testing and performance insights', 'growth_accelerators', true),
  ('keyword_rank_tracking', 'Keyword Rank Tracking', 'Real-time keyword ranking monitoring and alerts', 'growth_accelerators', true),
  ('visibility_optimizer', 'Visibility Optimizer', 'App store visibility optimization and enhancement tools', 'growth_accelerators', true),

  -- Control Center
  ('app_intelligence', 'App Intelligence', 'Comprehensive app performance and intelligence dashboard', 'control_center', true),
  ('portfolio_manager', 'Portfolio Manager', 'Multi-app portfolio management and optimization', 'control_center', true),
  ('system_control', 'System Control', 'System administration and configuration controls', 'control_center', true),

  -- Account
  ('profile_management', 'Profile Management', 'User profile settings and account management', 'account', true),
  ('preferences', 'Preferences', 'Personal preferences and notification settings', 'account', true),

  -- Additional features found in database
  ('analytics_access', 'Analytics Access', 'Access to analytics features', 'performance_intelligence', true),
  ('app_core_access', 'App Core Access', 'Core app functionality access', 'control_center', true),
  ('org_admin_access', 'Org Admin Access', 'Organization admin features', 'control_center', true),
  ('reviews', 'Reviews', 'Review management features', 'growth_accelerators', true),
  ('reporting_v2', 'Reporting V2', 'New reporting dashboard', 'performance_intelligence', true),
  ('review_management', 'Review Management', 'Advanced review management tools', 'growth_accelerators', true),

  -- Missing features from database
  ('admin_access', 'Admin Access', 'Administrative access and controls', 'control_center', true),
  ('conversion_access', 'Conversion Access', 'Access to conversion features', 'performance_intelligence', true),
  ('dashboard_access', 'Dashboard Access', 'Access to dashboard features', 'performance_intelligence', true),
  ('dashboard_ai_chat', 'Dashboard AI Chat', 'AI-powered chat for dashboard insights', 'ai_command_center', true),
  ('theme_analysis', 'Theme Analysis', 'Theme and design analysis tools', 'growth_accelerators', true)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = now();

-- 4. Migrate data from organization_features to org_feature_entitlements
INSERT INTO org_feature_entitlements (organization_id, feature_key, is_enabled, created_at, updated_at)
SELECT organization_id, feature_key, is_enabled, created_at, updated_at
FROM organization_features
ON CONFLICT (organization_id, feature_key) DO NOTHING;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_org_feature_entitlements_org_id ON org_feature_entitlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_feature_entitlements_feature_key ON org_feature_entitlements(feature_key);
CREATE INDEX IF NOT EXISTS idx_platform_features_category ON platform_features(category);
CREATE INDEX IF NOT EXISTS idx_platform_features_active ON platform_features(is_active);

-- 6. Add RLS policies
ALTER TABLE platform_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_feature_entitlements ENABLE ROW LEVEL SECURITY;

-- Super admins can read all platform features
CREATE POLICY "Super admins can read platform features"
  ON platform_features
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'SUPER_ADMIN'
    )
  );

-- Super admins can manage org feature entitlements
CREATE POLICY "Super admins can manage org entitlements"
  ON org_feature_entitlements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'SUPER_ADMIN'
    )
  );

-- Org admins can read their org's entitlements
CREATE POLICY "Org admins can read their org entitlements"
  ON org_feature_entitlements
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
  );

-- 7. Add comment
COMMENT ON TABLE platform_features IS 'Master list of all platform features available across the system';
COMMENT ON TABLE org_feature_entitlements IS 'Organization-specific feature entitlements and access control';

-- 8. Create view for backwards compatibility
CREATE OR REPLACE VIEW organization_features_view AS
SELECT
  ofe.id,
  ofe.organization_id,
  ofe.feature_key,
  ofe.is_enabled,
  ofe.created_at,
  ofe.updated_at,
  pf.feature_name,
  pf.description,
  pf.category
FROM org_feature_entitlements ofe
JOIN platform_features pf ON pf.feature_key = ofe.feature_key;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Platform features system created successfully';
  RAISE NOTICE '   - platform_features table: Master feature list';
  RAISE NOTICE '   - org_feature_entitlements table: Organization access control';
  RAISE NOTICE '   - Data migrated from organization_features';
  RAISE NOTICE '   - RLS policies enabled';
  RAISE NOTICE '   - Indexes created';
END $$;
