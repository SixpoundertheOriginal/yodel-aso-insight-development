-- Migration: Allow VIEWER role to manage competitors
-- Date: 2026-01-29
-- Purpose: Fix RLS policy to allow VIEWER role to add/update/remove competitors
-- Context: Users with VIEWER role couldn't add competitors due to RLS policy

-- ==============================================================================
-- Drop existing restrictive policies
-- ==============================================================================

DROP POLICY IF EXISTS "Users can add competitors" ON app_competitors;
DROP POLICY IF EXISTS "Users can update competitors" ON app_competitors;
DROP POLICY IF EXISTS "Users can remove competitors" ON app_competitors;

-- ==============================================================================
-- Create new permissive policies that allow VIEWER role
-- ==============================================================================

-- Policy: Any authenticated user in the organization can add competitors
CREATE POLICY "Users can add competitors"
ON app_competitors
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = app_competitors.organization_id
      -- Allow ANY role including VIEWER
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST', 'VIEWER')
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- Policy: Any authenticated user in the organization can update competitors
CREATE POLICY "Users can update competitors"
ON app_competitors
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = app_competitors.organization_id
      -- Allow ANY role including VIEWER
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST', 'VIEWER')
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- Policy: Any authenticated user in the organization can remove competitors
CREATE POLICY "Users can remove competitors"
ON app_competitors
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = app_competitors.organization_id
      -- Allow ANY role including VIEWER
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST', 'VIEWER')
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- ==============================================================================
-- Comments
-- ==============================================================================

COMMENT ON POLICY "Users can add competitors" ON app_competitors IS
  'Allow all organization members (including VIEWER) to add competitors. This enables self-service competitive analysis workflow.';

COMMENT ON POLICY "Users can update competitors" ON app_competitors IS
  'Allow all organization members (including VIEWER) to update competitor priorities and metadata.';

COMMENT ON POLICY "Users can remove competitors" ON app_competitors IS
  'Allow all organization members (including VIEWER) to remove competitors from their analysis.';
