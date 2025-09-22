-- Create comprehensive feature permission system
-- Phase 1: Platform Features Registry

-- Create enum for feature categories
CREATE TYPE feature_category AS ENUM (
  'performance_intelligence',
  'ai_command_center', 
  'growth_accelerators',
  'control_center',
  'account'
);

-- Create platform features registry table
CREATE TABLE platform_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR(100) NOT NULL UNIQUE,
  feature_name VARCHAR(200) NOT NULL,
  description TEXT,
  category feature_category NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_features ENABLE ROW LEVEL SECURITY;

-- Platform features are readable by all authenticated users
CREATE POLICY "Allow authenticated users to read platform features"
ON platform_features FOR SELECT
TO authenticated
USING (is_active = true);

-- Only super admins can manage platform features
CREATE POLICY "Super admins can manage platform features"
ON platform_features FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- Create user feature overrides table
CREATE TABLE user_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL, 
  feature_key VARCHAR(100) NOT NULL REFERENCES platform_features(feature_key) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, feature_key)
);

-- Enable RLS on user overrides
ALTER TABLE user_feature_overrides ENABLE ROW LEVEL SECURITY;

-- Users can view their own overrides
CREATE POLICY "Users can view their own feature overrides"
ON user_feature_overrides FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Organization admins and super admins can manage overrides in their org
CREATE POLICY "Org admins can manage user feature overrides"
ON user_feature_overrides FOR ALL
TO authenticated
USING (
  is_super_admin(auth.uid()) OR 
  (organization_id = get_current_user_organization_id() AND 
   EXISTS (
     SELECT 1 FROM user_roles ur 
     WHERE ur.user_id = auth.uid() 
     AND ur.organization_id = user_feature_overrides.organization_id
     AND ur.role IN ('ORGANIZATION_ADMIN', 'ASO_MANAGER')
   )
  )
);

-- Create feature usage logs table
CREATE TABLE feature_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  usage_type VARCHAR(50) NOT NULL DEFAULT 'access', -- access, action, etc
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on usage logs
ALTER TABLE feature_usage_logs ENABLE ROW LEVEL SECURITY;

-- Organization users can view their org's usage logs
CREATE POLICY "Organization users can view usage logs"
ON feature_usage_logs FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) OR 
  organization_id = get_current_user_organization_id()
);

-- System can insert usage logs
CREATE POLICY "System can insert usage logs"
ON feature_usage_logs FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND 
  organization_id = get_current_user_organization_id()
);

-- Add indexes for performance
CREATE INDEX idx_org_feature_access_lookup ON org_feature_access(organization_id, feature_key);
CREATE INDEX idx_user_feature_overrides_lookup ON user_feature_overrides(user_id, feature_key);
CREATE INDEX idx_feature_usage_logs_org_date ON feature_usage_logs(organization_id, created_at);
CREATE INDEX idx_platform_features_category ON platform_features(category, is_active);

-- Insert platform features based on requirements
INSERT INTO platform_features (feature_key, feature_name, description, category) VALUES
-- Performance Intelligence
('executive_dashboard', 'Executive Dashboard', 'High-level KPI dashboard for executives', 'performance_intelligence'),
('analytics', 'Analytics', 'Detailed performance analytics and reporting', 'performance_intelligence'), 
('conversion_intelligence', 'Conversion Intelligence', 'Conversion rate optimization insights', 'performance_intelligence'),

-- AI Command Center  
('aso_ai_hub', 'Strategic Audit Engine', 'AI-powered strategic ASO auditing', 'ai_command_center'),
('chatgpt_visibility_audit', 'AI Visibility Optimizer', 'AI visibility optimization and auditing', 'ai_command_center'),

-- Growth Accelerators
('strategy_brain', 'Strategy Brain', 'Strategic growth planning and insights', 'growth_accelerators'),
('metadata_generator', 'Metadata Optimizer', 'AI-powered metadata generation and optimization', 'growth_accelerators'),
('opportunity_scanner', 'Opportunity Scanner', 'Market opportunity identification', 'growth_accelerators'),
('feature_maximizer', 'Feature Maximizer', 'Feature optimization recommendations', 'growth_accelerators'),
('creative_review', 'Creative Analysis', 'Creative asset performance analysis', 'growth_accelerators'),
('web_rank_apps', 'Web Rank (Apps)', 'Web-based app ranking intelligence', 'growth_accelerators'),
('keyword_intelligence', 'Keyword Intelligence', 'Advanced keyword research and tracking', 'growth_accelerators'),
('competitive_intelligence', 'Competitor Overview', 'Competitive analysis and benchmarking', 'growth_accelerators'),
('review_management', 'Review Management', 'App review management and response tools', 'growth_accelerators'),
('review_management_v2', 'Review Management v2', 'Enhanced review management features', 'growth_accelerators'),

-- Control Center
('app_intelligence', 'App Intelligence', 'Comprehensive app performance intelligence', 'control_center'),
('portfolio_manager', 'Portfolio Manager', 'Multi-app portfolio management', 'control_center'),
('admin_panel', 'System Control', 'Administrative controls and system management', 'control_center'),

-- Account
('profile_management', 'Profile', 'User profile and account settings', 'account'),
('preferences', 'Preferences', 'User preferences and customization', 'account');

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_features_updated_at
  BEFORE UPDATE ON platform_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_feature_overrides_updated_at  
  BEFORE UPDATE ON user_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();