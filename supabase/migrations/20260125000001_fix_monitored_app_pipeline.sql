-- =====================================================================
-- Migration: Fix Monitored App Pipeline
-- Purpose: Fix RLS and CHECK constraint issues blocking cache/snapshot writes
--
-- Root Causes Fixed:
--   1. CHECK constraint on aso_audit_snapshots.source only allowed ('live', 'cache', 'manual')
--      but edge function sends 'client' and 'server'
--   2. Ensure service_role can bypass RLS for edge function operations
--
-- Date: 2025-01-25
-- =====================================================================

-- ========================================================================
-- FIX 1: Expand source CHECK constraint to include 'client' and 'server'
-- ========================================================================

-- Drop existing constraint
ALTER TABLE public.aso_audit_snapshots
DROP CONSTRAINT IF EXISTS aso_audit_snapshots_source_check;

-- Add updated constraint with all valid source values
ALTER TABLE public.aso_audit_snapshots
ADD CONSTRAINT aso_audit_snapshots_source_check
  CHECK (source IN ('live', 'cache', 'manual', 'client', 'server'));

-- Add comment explaining source values
COMMENT ON COLUMN public.aso_audit_snapshots.source IS
  'Source of the audit:
  - ''live'': Generated from live app store data
  - ''cache'': Generated from cached metadata
  - ''manual'': Manually created/edited
  - ''client'': High-quality audit computed on client (UI) with full services
  - ''server'': Fallback audit generated on server (edge function)';

-- ========================================================================
-- FIX 2: Ensure service_role can bypass RLS
-- ========================================================================

-- Grant service_role permissions to bypass RLS
GRANT ALL ON public.app_metadata_cache TO service_role;
GRANT ALL ON public.aso_audit_snapshots TO service_role;
GRANT ALL ON public.monitored_apps TO service_role;

-- ========================================================================
-- FIX 3: Add INSERT policy for service_role on aso_audit_snapshots
-- ========================================================================

-- Check if policy exists and drop it
DROP POLICY IF EXISTS "Service role can insert audit snapshots" ON public.aso_audit_snapshots;

-- Create policy for service_role
CREATE POLICY "Service role can insert audit snapshots"
  ON public.aso_audit_snapshots
  FOR INSERT
  WITH CHECK (
    -- Allow service_role (edge functions)
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Allow users for their organization
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = aso_audit_snapshots.organization_id
    )
  );

-- Check if SELECT policy exists
DROP POLICY IF EXISTS "Service role can select audit snapshots" ON public.aso_audit_snapshots;

CREATE POLICY "Service role can select audit snapshots"
  ON public.aso_audit_snapshots
  FOR SELECT
  USING (
    -- Allow service_role (edge functions)
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Allow users for their organization
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = aso_audit_snapshots.organization_id
    )
  );

-- ========================================================================
-- FIX 4: Add service_role policies for app_metadata_cache
-- ========================================================================

-- Check if upsert policy exists and drop it
DROP POLICY IF EXISTS "Service role can upsert cache" ON public.app_metadata_cache;

-- Create policy for service_role upsert
CREATE POLICY "Service role can upsert cache"
  ON public.app_metadata_cache
  FOR ALL
  USING (
    -- Allow service_role (edge functions)
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Allow users for their organization
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_cache.organization_id
    )
  )
  WITH CHECK (
    -- Allow service_role (edge functions)
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Allow users for their organization
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_cache.organization_id
    )
  );

-- ========================================================================
-- Verification Queries (run after migration)
-- ========================================================================

-- Verify source constraint
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'aso_audit_snapshots_source_check';

-- Verify RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('app_metadata_cache', 'aso_audit_snapshots')
-- ORDER BY tablename, policyname;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
