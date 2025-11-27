-- Migration: Allow VIEWER role to add and update monitored apps
-- Date: 2025-11-27
-- Purpose: Fix RLS policy to allow VIEWER role to monitor apps
-- Context: Users with VIEWER role couldn't add apps to monitor due to RLS policy

-- ==============================================================================
-- Drop existing restrictive policies
-- ==============================================================================

DROP POLICY IF EXISTS "Users can add monitored apps" ON monitored_apps;
DROP POLICY IF EXISTS "Users can update monitored apps" ON monitored_apps;

-- ==============================================================================
-- Create new permissive policies that allow VIEWER role
-- ==============================================================================

-- Policy: Any authenticated user in the organization can add apps to monitor
CREATE POLICY "Users can add monitored apps"
ON monitored_apps
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = monitored_apps.organization_id
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

-- Policy: Any authenticated user in the organization can update monitored apps
CREATE POLICY "Users can update monitored apps"
ON monitored_apps
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = monitored_apps.organization_id
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

COMMENT ON POLICY "Users can add monitored apps" ON monitored_apps IS
  'Allow all organization members (including VIEWER) to add apps to monitor. This enables self-service ASO audit workflow.';

COMMENT ON POLICY "Users can update monitored apps" ON monitored_apps IS
  'Allow all organization members (including VIEWER) to update monitored apps metadata (tags, notes, etc.).';
