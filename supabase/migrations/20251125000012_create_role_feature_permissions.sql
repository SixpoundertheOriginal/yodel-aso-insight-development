-- ============================================
-- CREATE ROLE-BASED FEATURE PERMISSIONS SYSTEM
-- Date: 2025-11-25
-- Purpose: Implement global role-based feature access control
-- ============================================
-- This creates Phase 1 of the three-layer access system:
-- Layer 1: Organization Feature Entitlements (what org paid for)
-- Layer 2: Role-Based Permissions (what each role can access) ← THIS MIGRATION
-- Layer 3: User-Specific Overrides (individual exceptions) - Phase 2

-- ============================================
-- STEP 1: Create role_feature_permissions table
-- ============================================
-- Note: role column uses TEXT to store uppercase role names
-- This allows flexibility while maintaining compatibility with app_role enum
CREATE TABLE IF NOT EXISTS role_feature_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'ASO_MANAGER', 'ANALYST', 'VIEWER', 'CLIENT')),
  feature_key text NOT NULL,
  is_allowed boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, feature_key),
  CONSTRAINT fk_feature_key FOREIGN KEY (feature_key)
    REFERENCES platform_features(feature_key) ON DELETE CASCADE
);

COMMENT ON TABLE role_feature_permissions IS
'Global role-based feature permissions. Defines which features each role can access across all organizations.';

COMMENT ON COLUMN role_feature_permissions.role IS
'User role: SUPER_ADMIN, ORG_ADMIN, ASO_MANAGER, ANALYST, VIEWER, CLIENT';

COMMENT ON COLUMN role_feature_permissions.is_allowed IS
'Whether this role is allowed to access this feature (default: true)';

-- ============================================
-- STEP 2: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_role_feature_permissions_role
  ON role_feature_permissions(role);

CREATE INDEX IF NOT EXISTS idx_role_feature_permissions_feature_key
  ON role_feature_permissions(feature_key);

CREATE INDEX IF NOT EXISTS idx_role_feature_permissions_allowed
  ON role_feature_permissions(is_allowed) WHERE is_allowed = true;

-- ============================================
-- STEP 3: Seed role permissions from ROLE_FEATURE_DEFAULTS
-- ============================================
-- Source: src/constants/features.ts - ROLE_FEATURE_DEFAULTS

-- SUPER_ADMIN: All 25 features (complete platform access)
INSERT INTO role_feature_permissions (role, feature_key, is_allowed, description) VALUES
  -- Performance Intelligence (5)
  ('SUPER_ADMIN', 'executive_dashboard', true, 'High-level KPI dashboard'),
  ('SUPER_ADMIN', 'analytics', true, 'Advanced analytics'),
  ('SUPER_ADMIN', 'conversion_intelligence', true, 'Conversion optimization insights'),
  ('SUPER_ADMIN', 'performance_intelligence', true, 'App performance metrics'),
  ('SUPER_ADMIN', 'predictive_forecasting', true, 'ML-powered forecasting'),
  -- AI Command Center (4)
  ('SUPER_ADMIN', 'aso_ai_hub', true, 'AI-powered ASO tools hub'),
  ('SUPER_ADMIN', 'chatgpt_visibility_audit', true, 'ChatGPT visibility audit'),
  ('SUPER_ADMIN', 'metadata_generator', true, 'AI metadata generation'),
  ('SUPER_ADMIN', 'strategic_audit_engine', true, 'Comprehensive ASO strategy'),
  -- Growth Accelerators (11)
  ('SUPER_ADMIN', 'keyword_intelligence', true, 'Keyword research and tracking'),
  ('SUPER_ADMIN', 'competitive_intelligence', true, 'Competitor analysis'),
  ('SUPER_ADMIN', 'competitor_overview', true, 'Competitor overview dashboard'),
  ('SUPER_ADMIN', 'creative_review', true, 'Creative asset performance'),
  ('SUPER_ADMIN', 'app_discovery', true, 'App store discovery optimization'),
  ('SUPER_ADMIN', 'aso_chat', true, 'AI chat assistant'),
  ('SUPER_ADMIN', 'market_intelligence', true, 'Market trends analysis'),
  ('SUPER_ADMIN', 'reviews_public_rss_enabled', true, 'Public reviews RSS feeds'),
  ('SUPER_ADMIN', 'creative_analysis', true, 'Creative A/B testing'),
  ('SUPER_ADMIN', 'keyword_rank_tracking', true, 'Keyword ranking monitoring'),
  ('SUPER_ADMIN', 'visibility_optimizer', true, 'Visibility optimization tools'),
  -- Control Center (3)
  ('SUPER_ADMIN', 'app_intelligence', true, 'App performance dashboard'),
  ('SUPER_ADMIN', 'portfolio_manager', true, 'Multi-app portfolio management'),
  ('SUPER_ADMIN', 'system_control', true, 'System administration'),
  -- Account (2)
  ('SUPER_ADMIN', 'profile_management', true, 'User profile settings'),
  ('SUPER_ADMIN', 'preferences', true, 'Personal preferences')
ON CONFLICT (role, feature_key) DO NOTHING;

-- ORG_ADMIN: Comprehensive access except strategic audit and system controls
INSERT INTO role_feature_permissions (role, feature_key, is_allowed, description) VALUES
  -- Performance Intelligence (5)
  ('ORG_ADMIN', 'executive_dashboard', true, 'High-level KPI dashboard'),
  ('ORG_ADMIN', 'analytics', true, 'Advanced analytics'),
  ('ORG_ADMIN', 'conversion_intelligence', true, 'Conversion optimization insights'),
  ('ORG_ADMIN', 'performance_intelligence', true, 'App performance metrics'),
  ('ORG_ADMIN', 'predictive_forecasting', true, 'ML-powered forecasting'),
  -- AI Command Center (2 of 4 - no strategic audit, no chatgpt audit)
  ('ORG_ADMIN', 'aso_ai_hub', true, 'AI-powered ASO tools hub'),
  ('ORG_ADMIN', 'metadata_generator', true, 'AI metadata generation'),
  -- Growth Accelerators (11)
  ('ORG_ADMIN', 'keyword_intelligence', true, 'Keyword research and tracking'),
  ('ORG_ADMIN', 'competitive_intelligence', true, 'Competitor analysis'),
  ('ORG_ADMIN', 'competitor_overview', true, 'Competitor overview dashboard'),
  ('ORG_ADMIN', 'creative_review', true, 'Creative asset performance'),
  ('ORG_ADMIN', 'app_discovery', true, 'App store discovery optimization'),
  ('ORG_ADMIN', 'aso_chat', true, 'AI chat assistant'),
  ('ORG_ADMIN', 'market_intelligence', true, 'Market trends analysis'),
  ('ORG_ADMIN', 'reviews_public_rss_enabled', true, 'Public reviews RSS feeds'),
  ('ORG_ADMIN', 'creative_analysis', true, 'Creative A/B testing'),
  ('ORG_ADMIN', 'keyword_rank_tracking', true, 'Keyword ranking monitoring'),
  ('ORG_ADMIN', 'visibility_optimizer', true, 'Visibility optimization tools'),
  -- Control Center (2 of 3 - no system control)
  ('ORG_ADMIN', 'app_intelligence', true, 'App performance dashboard'),
  ('ORG_ADMIN', 'portfolio_manager', true, 'Multi-app portfolio management'),
  -- Account (2)
  ('ORG_ADMIN', 'profile_management', true, 'User profile settings'),
  ('ORG_ADMIN', 'preferences', true, 'Personal preferences')
ON CONFLICT (role, feature_key) DO NOTHING;

-- ASO_MANAGER: Core ASO tools and basic analytics
INSERT INTO role_feature_permissions (role, feature_key, is_allowed, description) VALUES
  -- Performance Intelligence (2)
  ('ASO_MANAGER', 'analytics', true, 'Advanced analytics'),
  ('ASO_MANAGER', 'performance_intelligence', true, 'App performance metrics'),
  -- AI Command Center (2)
  ('ASO_MANAGER', 'aso_ai_hub', true, 'AI-powered ASO tools hub'),
  ('ASO_MANAGER', 'metadata_generator', true, 'AI metadata generation'),
  -- Growth Accelerators (4 core ASO tools)
  ('ASO_MANAGER', 'keyword_intelligence', true, 'Keyword research and tracking'),
  ('ASO_MANAGER', 'competitive_intelligence', true, 'Competitor analysis'),
  ('ASO_MANAGER', 'creative_review', true, 'Creative asset performance'),
  ('ASO_MANAGER', 'aso_chat', true, 'AI chat assistant'),
  -- Account (2)
  ('ASO_MANAGER', 'profile_management', true, 'User profile settings'),
  ('ASO_MANAGER', 'preferences', true, 'Personal preferences')
ON CONFLICT (role, feature_key) DO NOTHING;

-- ANALYST: Analytics-focused tools
INSERT INTO role_feature_permissions (role, feature_key, is_allowed, description) VALUES
  -- Performance Intelligence (2)
  ('ANALYST', 'analytics', true, 'Advanced analytics'),
  ('ANALYST', 'conversion_intelligence', true, 'Conversion optimization insights'),
  -- Growth Accelerators (2 data analysis tools)
  ('ANALYST', 'competitive_intelligence', true, 'Competitor analysis'),
  ('ANALYST', 'keyword_intelligence', true, 'Keyword research and tracking'),
  -- Account (2)
  ('ANALYST', 'profile_management', true, 'User profile settings'),
  ('ANALYST', 'preferences', true, 'Personal preferences')
ON CONFLICT (role, feature_key) DO NOTHING;

-- VIEWER: Basic read-only access
INSERT INTO role_feature_permissions (role, feature_key, is_allowed, description) VALUES
  -- Performance Intelligence (1)
  ('VIEWER', 'analytics', true, 'Advanced analytics (read-only)'),
  -- Control Center (1)
  ('VIEWER', 'app_intelligence', true, 'App performance dashboard (read-only)'),
  -- Account (2)
  ('VIEWER', 'profile_management', true, 'User profile settings'),
  ('VIEWER', 'preferences', true, 'Personal preferences')
ON CONFLICT (role, feature_key) DO NOTHING;

-- CLIENT: Minimal client access
INSERT INTO role_feature_permissions (role, feature_key, is_allowed, description) VALUES
  -- Performance Intelligence (1)
  ('CLIENT', 'analytics', true, 'Advanced analytics (limited)'),
  -- Account (2)
  ('CLIENT', 'profile_management', true, 'User profile settings'),
  ('CLIENT', 'preferences', true, 'Personal preferences')
ON CONFLICT (role, feature_key) DO NOTHING;

-- ============================================
-- STEP 4: Create RLS policies
-- ============================================
ALTER TABLE role_feature_permissions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins can do everything
CREATE POLICY "Super admins have full access to role permissions"
  ON role_feature_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );

-- Policy 2: All authenticated users can read role permissions (to check their own access)
CREATE POLICY "Authenticated users can read role permissions"
  ON role_feature_permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 5: Create helper function to check role permission
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_role_permission(
  check_user_id uuid,
  check_feature_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  -- Check if user's role has permission for this feature
  -- Cast both role columns to text for comparison (ur.role is app_role enum, rfp.role is text)
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_feature_permissions rfp ON rfp.role = ur.role::text
    WHERE ur.user_id = check_user_id
      AND rfp.feature_key = check_feature_key
      AND rfp.is_allowed = true
  );
$$;

COMMENT ON FUNCTION public.user_has_role_permission(uuid, text) IS
'Check if a user has role-based permission to access a feature.
Returns true if user''s role has is_allowed=true for the feature.
Used in conjunction with org_feature_entitlements for complete access control.';

-- ============================================
-- STEP 6: Create view for easy access checking
-- ============================================
CREATE OR REPLACE VIEW user_role_permissions AS
SELECT
  ur.user_id,
  ur.organization_id,
  ur.role,
  rfp.feature_key,
  rfp.is_allowed,
  pf.feature_name,
  pf.category,
  pf.description
FROM user_roles ur
JOIN role_feature_permissions rfp ON rfp.role = ur.role::text
JOIN platform_features pf ON pf.feature_key = rfp.feature_key
WHERE rfp.is_allowed = true;

COMMENT ON VIEW user_role_permissions IS
'Denormalized view showing all features each user has role-based access to.
Does not include org entitlements check - use in conjunction with org_feature_entitlements.';

-- ============================================
-- STEP 7: Verification queries
-- ============================================
DO $$
DECLARE
  v_super_admin_count integer;
  v_org_admin_count integer;
  v_aso_manager_count integer;
  v_analyst_count integer;
  v_viewer_count integer;
  v_client_count integer;
  v_total_count integer;
BEGIN
  -- Count permissions by role
  SELECT COUNT(*) INTO v_super_admin_count FROM role_feature_permissions WHERE role = 'SUPER_ADMIN';
  SELECT COUNT(*) INTO v_org_admin_count FROM role_feature_permissions WHERE role = 'ORG_ADMIN';
  SELECT COUNT(*) INTO v_aso_manager_count FROM role_feature_permissions WHERE role = 'ASO_MANAGER';
  SELECT COUNT(*) INTO v_analyst_count FROM role_feature_permissions WHERE role = 'ANALYST';
  SELECT COUNT(*) INTO v_viewer_count FROM role_feature_permissions WHERE role = 'VIEWER';
  SELECT COUNT(*) INTO v_client_count FROM role_feature_permissions WHERE role = 'CLIENT';
  SELECT COUNT(*) INTO v_total_count FROM role_feature_permissions;

  RAISE NOTICE '=== Role Feature Permissions Seeded ===';
  RAISE NOTICE 'SUPER_ADMIN: % features', v_super_admin_count;
  RAISE NOTICE 'ORG_ADMIN: % features', v_org_admin_count;
  RAISE NOTICE 'ASO_MANAGER: % features', v_aso_manager_count;
  RAISE NOTICE 'ANALYST: % features', v_analyst_count;
  RAISE NOTICE 'VIEWER: % features', v_viewer_count;
  RAISE NOTICE 'CLIENT: % features', v_client_count;
  RAISE NOTICE 'Total role-feature mappings: %', v_total_count;
  RAISE NOTICE '✅ Role-based permission system created successfully!';
END $$;
