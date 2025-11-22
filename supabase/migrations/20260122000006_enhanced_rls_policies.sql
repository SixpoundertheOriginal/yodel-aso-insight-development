-- =====================================================================
-- Migration: Enhanced RLS Policies for Monitored Apps System
-- Purpose: Secure multi-tenant access with service role bypass
-- Type: IDEMPOTENT
-- Date: 2026-01-22
-- =====================================================================

-- ============================================================================
-- MONITORED_APPS: Enhanced RLS Policies
-- ============================================================================

-- Drop existing policies to rebuild cleanly
DROP POLICY IF EXISTS "Users see their org monitored apps" ON public.monitored_apps;
DROP POLICY IF EXISTS "Users can add monitored apps" ON public.monitored_apps;
DROP POLICY IF EXISTS "Users can update monitored apps" ON public.monitored_apps;
DROP POLICY IF EXISTS "Users can remove monitored apps" ON public.monitored_apps;
DROP POLICY IF EXISTS "org_members_select_monitored_apps" ON public.monitored_apps;
DROP POLICY IF EXISTS "org_members_insert_monitored_apps" ON public.monitored_apps;
DROP POLICY IF EXISTS "org_members_update_monitored_apps" ON public.monitored_apps;
DROP POLICY IF EXISTS "org_members_delete_monitored_apps" ON public.monitored_apps;

-- Policy: SELECT - Users + Service Role
CREATE POLICY "org_members_select_monitored_apps"
  ON public.monitored_apps
  FOR SELECT
  USING (
    -- Service role bypass (for edge functions)
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Organization members
    organization_id IN (
      SELECT ur.organization_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- Policy: INSERT - Org members + Service Role
CREATE POLICY "org_members_insert_monitored_apps"
  ON public.monitored_apps
  FOR INSERT
  WITH CHECK (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Organization members with appropriate roles
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = monitored_apps.organization_id
        AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
    )
  );

-- Policy: UPDATE - Org members + Service Role
CREATE POLICY "org_members_update_monitored_apps"
  ON public.monitored_apps
  FOR UPDATE
  USING (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Organization members
    organization_id IN (
      SELECT ur.organization_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- Policy: DELETE - Org members only (no service role bypass for safety)
CREATE POLICY "org_members_delete_monitored_apps"
  ON public.monitored_apps
  FOR DELETE
  USING (
    organization_id IN (
      SELECT ur.organization_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- ============================================================================
-- APP_METADATA_CACHE: RLS Policies (Immutable except via service role)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read cache for their organization" ON public.app_metadata_cache;
DROP POLICY IF EXISTS "Users can insert cache for their organization" ON public.app_metadata_cache;
DROP POLICY IF EXISTS "Users can update cache for their organization" ON public.app_metadata_cache;
DROP POLICY IF EXISTS "Users can delete cache for their organization" ON public.app_metadata_cache;
DROP POLICY IF EXISTS "org_members_select_metadata_cache" ON public.app_metadata_cache;
DROP POLICY IF EXISTS "service_role_insert_metadata_cache" ON public.app_metadata_cache;
DROP POLICY IF EXISTS "org_members_delete_metadata_cache" ON public.app_metadata_cache;

-- Policy: SELECT
CREATE POLICY "org_members_select_metadata_cache"
  ON public.app_metadata_cache
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    organization_id IN (
      SELECT ur.organization_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- Policy: INSERT (service role only for audit integrity)
CREATE POLICY "service_role_insert_metadata_cache"
  ON public.app_metadata_cache
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Policy: DELETE (org members can delete cache to force refresh)
CREATE POLICY "org_members_delete_metadata_cache"
  ON public.app_metadata_cache
  FOR DELETE
  USING (
    organization_id IN (
      SELECT ur.organization_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- ============================================================================
-- AUDIT_SNAPSHOTS: RLS Policies (Immutable audit trail)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read snapshots for their organization" ON public.audit_snapshots;
DROP POLICY IF EXISTS "Users can insert snapshots for their organization" ON public.audit_snapshots;
DROP POLICY IF EXISTS "Users can update snapshots for their organization" ON public.audit_snapshots;
DROP POLICY IF EXISTS "Users can delete snapshots for their organization" ON public.audit_snapshots;
DROP POLICY IF EXISTS "org_members_select_audit_snapshots" ON public.audit_snapshots;
DROP POLICY IF EXISTS "service_role_insert_audit_snapshots" ON public.audit_snapshots;
DROP POLICY IF EXISTS "org_admins_delete_audit_snapshots" ON public.audit_snapshots;

-- Policy: SELECT
CREATE POLICY "org_members_select_audit_snapshots"
  ON public.audit_snapshots
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    organization_id IN (
      SELECT ur.organization_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- Policy: INSERT (service role only for audit integrity)
CREATE POLICY "service_role_insert_audit_snapshots"
  ON public.audit_snapshots
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Policy: DELETE (org admins only, for GDPR compliance)
CREATE POLICY "org_admins_delete_audit_snapshots"
  ON public.audit_snapshots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = audit_snapshots.organization_id
        AND ur.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "service_role_insert_metadata_cache" ON public.app_metadata_cache IS
  'Only edge functions (service_role) can insert metadata cache to ensure data quality and prevent tampering.';

COMMENT ON POLICY "service_role_insert_audit_snapshots" ON public.audit_snapshots IS
  'Only edge functions (service_role) can create audit snapshots to maintain immutable audit trail integrity.';
