-- Migration: Row-Level Security Policies for Keyword Tracking System
-- Description: Ensures users can only access keyword data for their organization
-- Date: 2025-11-06

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_search_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_refresh_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Check Organization Membership
-- ============================================================================

CREATE OR REPLACE FUNCTION user_belongs_to_organization(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.organization_id = org_id
      AND ur.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_belongs_to_organization(UUID) TO authenticated;

-- ============================================================================
-- RLS POLICIES: keywords
-- ============================================================================

-- Policy: Users can view keywords for their organization's apps
CREATE POLICY "Users can view keywords for own organization"
  ON keywords
  FOR SELECT
  USING (
    user_belongs_to_organization(organization_id)
  );

-- Policy: Users can insert keywords for their organization's apps
CREATE POLICY "Users can insert keywords for own organization"
  ON keywords
  FOR INSERT
  WITH CHECK (
    user_belongs_to_organization(organization_id)
  );

-- Policy: Users can update keywords for their organization's apps
CREATE POLICY "Users can update keywords for own organization"
  ON keywords
  FOR UPDATE
  USING (
    user_belongs_to_organization(organization_id)
  )
  WITH CHECK (
    user_belongs_to_organization(organization_id)
  );

-- Policy: Users can delete keywords for their organization's apps
CREATE POLICY "Users can delete keywords for own organization"
  ON keywords
  FOR DELETE
  USING (
    user_belongs_to_organization(organization_id)
  );

-- ============================================================================
-- RLS POLICIES: keyword_rankings
-- ============================================================================

-- Policy: Users can view rankings for keywords they have access to
CREATE POLICY "Users can view rankings for own keywords"
  ON keyword_rankings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM keywords k
      WHERE k.id = keyword_rankings.keyword_id
        AND user_belongs_to_organization(k.organization_id)
    )
  );

-- Policy: System can insert rankings (service role)
-- Users cannot directly insert rankings - only through background jobs
CREATE POLICY "Service role can insert rankings"
  ON keyword_rankings
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
  );

-- Policy: Service role can update rankings
CREATE POLICY "Service role can update rankings"
  ON keyword_rankings
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role'
  );

-- Policy: Service role can delete rankings
CREATE POLICY "Service role can delete rankings"
  ON keyword_rankings
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role'
  );

-- ============================================================================
-- RLS POLICIES: keyword_search_volumes
-- ============================================================================

-- Policy: All authenticated users can view search volumes (shared data)
CREATE POLICY "Authenticated users can view search volumes"
  ON keyword_search_volumes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role can manage search volumes
CREATE POLICY "Service role can insert search volumes"
  ON keyword_search_volumes
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "Service role can update search volumes"
  ON keyword_search_volumes
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "Service role can delete search volumes"
  ON keyword_search_volumes
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role'
  );

-- ============================================================================
-- RLS POLICIES: competitor_keywords
-- ============================================================================

-- Policy: Users can view competitor data for their keywords
CREATE POLICY "Users can view competitors for own keywords"
  ON competitor_keywords
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM keywords k
      WHERE k.id = competitor_keywords.keyword_id
        AND user_belongs_to_organization(k.organization_id)
    )
  );

-- Policy: Service role can manage competitor data
CREATE POLICY "Service role can insert competitor data"
  ON competitor_keywords
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "Service role can update competitor data"
  ON competitor_keywords
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "Service role can delete competitor data"
  ON competitor_keywords
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role'
  );

-- ============================================================================
-- RLS POLICIES: keyword_refresh_queue
-- ============================================================================

-- Policy: Users can view queue entries for their keywords
CREATE POLICY "Users can view refresh queue for own keywords"
  ON keyword_refresh_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM keywords k
      WHERE k.id = keyword_refresh_queue.keyword_id
        AND user_belongs_to_organization(k.organization_id)
    )
  );

-- Policy: Users can insert queue entries for on-demand refresh
CREATE POLICY "Users can insert refresh queue for own keywords"
  ON keyword_refresh_queue
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM keywords k
      WHERE k.id = keyword_refresh_queue.keyword_id
        AND user_belongs_to_organization(k.organization_id)
    )
  );

-- Policy: Service role can manage queue
CREATE POLICY "Service role can update refresh queue"
  ON keyword_refresh_queue
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "Service role can delete refresh queue"
  ON keyword_refresh_queue
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role'
  );

-- ============================================================================
-- SUPERADMIN BYPASS POLICIES
-- Superadmins can access all data
-- ============================================================================

-- Note: Using existing is_super_admin() function from the system
-- No need to create a new function - it already exists in migrations:
-- 20251201090000_rls_apps_and_superadmin.sql

-- Superadmin policies for keywords
CREATE POLICY "Superadmins can view all keywords"
  ON keywords
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Superadmins can manage all keywords"
  ON keywords
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Superadmin policies for keyword_rankings
CREATE POLICY "Superadmins can view all rankings"
  ON keyword_rankings
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Superadmin policies for competitor_keywords
CREATE POLICY "Superadmins can view all competitors"
  ON competitor_keywords
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Superadmin policies for keyword_refresh_queue
CREATE POLICY "Superadmins can view all queue entries"
  ON keyword_refresh_queue
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view keywords for own organization" ON keywords IS
  'Users can only view keywords for apps belonging to their organization';

COMMENT ON POLICY "Service role can insert rankings" ON keyword_rankings IS
  'Only background jobs (service role) can insert ranking data to ensure data integrity';

COMMENT ON POLICY "Authenticated users can view search volumes" ON keyword_search_volumes IS
  'Search volume data is shared across all users (not organization-specific)';

COMMENT ON FUNCTION user_belongs_to_organization(UUID) IS
  'Helper function to check if current user belongs to specified organization via user_roles table';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON keywords TO authenticated;
GRANT SELECT ON keyword_rankings TO authenticated;
GRANT SELECT ON keyword_search_volumes TO authenticated;
GRANT SELECT ON competitor_keywords TO authenticated;
GRANT SELECT, INSERT ON keyword_refresh_queue TO authenticated;

-- Grant full permissions to service role
GRANT ALL ON keywords TO service_role;
GRANT ALL ON keyword_rankings TO service_role;
GRANT ALL ON keyword_search_volumes TO service_role;
GRANT ALL ON competitor_keywords TO service_role;
GRANT ALL ON keyword_refresh_queue TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
