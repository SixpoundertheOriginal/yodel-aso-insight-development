-- =====================================================================
-- Migration: Deprecate old audit_snapshots table (Phase 19)
-- Purpose: Mark audit_snapshots as deprecated in favor of aso_audit_snapshots
-- Strategy: Additive migration - NO breaking changes
-- Features:
--   - Updates table comment to mark as deprecated
--   - Adds deprecation notice
--   - Keeps table for backwards compatibility
--   - Existing data remains queryable
-- =====================================================================

BEGIN;

-- ============================================================================
-- Update Table Comment with Deprecation Notice
-- ============================================================================

COMMENT ON TABLE public.audit_snapshots IS
  '⚠️ DEPRECATED (Phase 19): This table stores Phase 2 combination analysis (pre-Bible era).

  Use aso_audit_snapshots for all new Bible-driven audits (Phases 9-18.5).

  This table is kept for backwards compatibility only. Existing data remains queryable.

  Migration path:
  - New audits → aso_audit_snapshots
  - Historical audits → audit_snapshots (read-only)
  - Fallback logic: If aso_audit_snapshots empty, use audit_snapshots

  Schema: Phase 2 format (combinations, metrics, insights)
  Replacement: aso_audit_snapshots (UnifiedMetadataAuditResult + KPI Engine + Bible metadata)';

-- ============================================================================
-- Add Deprecation Flag Column (Optional, for programmatic checks)
-- ============================================================================

-- Add a flag to indicate this is deprecated (optional, for clarity)
ALTER TABLE public.audit_snapshots
  ADD COLUMN IF NOT EXISTS deprecated BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.audit_snapshots.deprecated IS
  'Deprecation flag (always true). This table is deprecated in favor of aso_audit_snapshots.';

-- ============================================================================
-- Migration Notes
-- ============================================================================

-- This migration is SAFE and NON-BREAKING:
-- 1. Does NOT drop audit_snapshots table
-- 2. Does NOT modify existing data
-- 3. Does NOT change RLS policies
-- 4. Does NOT alter FK constraints
-- 5. Only adds comments + optional deprecation flag

-- Backwards compatibility:
-- - Existing queries continue to work
-- - Edge functions can still read audit_snapshots
-- - Frontend hooks can implement fallback logic
-- - No data migration required

-- Cleanup strategy (Future Phase 20+):
-- - After 3-6 months, evaluate usage of audit_snapshots
-- - If zero reads, consider dropping table
-- - Before dropping, backup data to cold storage

COMMIT;

-- ============================================================================
-- Verification Query (run manually if needed)
-- ============================================================================
-- SELECT COUNT(*) FROM audit_snapshots WHERE deprecated = true;
-- \d+ audit_snapshots  -- Show table comment
