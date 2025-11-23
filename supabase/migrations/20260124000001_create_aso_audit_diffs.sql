-- =====================================================================
-- Migration: Create aso_audit_diffs table (Phase 19)
-- Purpose: Track changes between consecutive audit snapshots
-- Features:
--   - Stores delta/diff between two snapshots
--   - Tracks KPI score changes
--   - Identifies metadata text changes
--   - Highlights severity shifts
--   - Enables "What changed?" queries
-- =====================================================================

BEGIN;

-- ============================================================================
-- Table: aso_audit_diffs
-- ============================================================================

CREATE TABLE public.aso_audit_diffs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to two consecutive snapshots
  from_snapshot_id UUID NOT NULL REFERENCES public.aso_audit_snapshots(id) ON DELETE CASCADE,
  to_snapshot_id UUID NOT NULL REFERENCES public.aso_audit_snapshots(id) ON DELETE CASCADE,

  -- Multi-tenant isolation (denormalized for query performance)
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Link to monitored app (denormalized for query performance)
  monitored_app_id UUID NOT NULL REFERENCES public.monitored_apps(id) ON DELETE CASCADE,

  -- Diff metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ========================================================================
  -- SCORE CHANGES
  -- ========================================================================

  -- Overall audit score change
  overall_score_delta INT NOT NULL, -- Positive = improvement, Negative = decline

  -- KPI overall score change
  kpi_overall_score_delta INT, -- Positive = improvement, Negative = decline

  -- Family score changes (JSONB map of family_id -> delta)
  -- Example: { "clarity_structure": +5, "keyword_architecture": -3, "intent_quality": +8 }
  kpi_family_deltas JSONB,

  -- ========================================================================
  -- METADATA CHANGES
  -- ========================================================================

  -- Flags for text changes
  title_changed BOOLEAN NOT NULL DEFAULT false,
  subtitle_changed BOOLEAN NOT NULL DEFAULT false,
  description_changed BOOLEAN NOT NULL DEFAULT false,

  -- Text diffs (optional, can be large)
  title_diff TEXT,
  subtitle_diff TEXT,

  -- ========================================================================
  -- SEMANTIC CHANGES
  -- ========================================================================

  -- New keywords added
  keywords_added TEXT[],

  -- Keywords removed
  keywords_removed TEXT[],

  -- Keyword count change
  keyword_count_delta INT,

  -- Combo count change
  combo_count_delta INT,

  -- ========================================================================
  -- SEVERITY & RECOMMENDATIONS
  -- ========================================================================

  -- Number of new critical issues
  new_critical_issues INT DEFAULT 0,

  -- Number of resolved critical issues
  resolved_critical_issues INT DEFAULT 0,

  -- Number of new recommendations
  new_recommendations INT DEFAULT 0,

  -- ========================================================================
  -- CHANGE SUMMARY (JSONB for extensibility)
  -- ========================================================================

  -- Detailed change summary
  -- Structure: {
  --   scoreImprovement: true/false,
  --   significantChanges: ["Title updated", "5 new keywords", "Intent quality +12"],
  --   topKpiChanges: [{ kpiId, label, delta, direction }],
  --   impactLevel: "high" | "medium" | "low"
  -- }
  change_summary JSONB NOT NULL,

  -- ========================================================================
  -- CONSTRAINTS
  -- ========================================================================

  -- Ensure snapshots are different
  CONSTRAINT aso_audit_diffs_different_snapshots
    CHECK (from_snapshot_id != to_snapshot_id),

  -- Ensure snapshots are in chronological order (from < to)
  -- Note: This is enforced at application level, not database level
  -- to allow flexibility for non-sequential comparisons

  -- Unique constraint: Only one diff per snapshot pair
  CONSTRAINT aso_audit_diffs_unique_pair
    UNIQUE (from_snapshot_id, to_snapshot_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Primary queries: Fetch diffs for a monitored app
CREATE INDEX idx_aso_audit_diffs_monitored_app
  ON public.aso_audit_diffs(monitored_app_id, created_at DESC);

-- Fetch diffs from a specific snapshot
CREATE INDEX idx_aso_audit_diffs_from
  ON public.aso_audit_diffs(from_snapshot_id);

-- Fetch diffs to a specific snapshot
CREATE INDEX idx_aso_audit_diffs_to
  ON public.aso_audit_diffs(to_snapshot_id);

-- Org-based queries (for reporting)
CREATE INDEX idx_aso_audit_diffs_org
  ON public.aso_audit_diffs(organization_id, created_at DESC);

-- Score improvement queries (for highlighting wins)
CREATE INDEX idx_aso_audit_diffs_improvements
  ON public.aso_audit_diffs(overall_score_delta DESC)
  WHERE overall_score_delta > 0;

-- Score decline queries (for alerts)
CREATE INDEX idx_aso_audit_diffs_declines
  ON public.aso_audit_diffs(overall_score_delta ASC)
  WHERE overall_score_delta < 0;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.aso_audit_diffs ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can read diffs for their organization
CREATE POLICY "Users can read audit diffs for their organization"
  ON public.aso_audit_diffs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = aso_audit_diffs.organization_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
        AND ur.organization_id IS NULL
    )
  );

-- Policy: INSERT - Users can insert diffs for their organization
CREATE POLICY "Users can insert audit diffs for their organization"
  ON public.aso_audit_diffs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = aso_audit_diffs.organization_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
    )
  );

-- Policy: DELETE - Users can delete diffs for their organization
CREATE POLICY "Users can delete audit diffs for their organization"
  ON public.aso_audit_diffs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = aso_audit_diffs.organization_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.aso_audit_diffs IS
  'Phase 19: Tracks changes between consecutive audit snapshots. Stores score deltas, metadata text changes, keyword/combo changes, and semantic diffs. Enables "What changed?" queries and trend analysis.';

COMMENT ON COLUMN public.aso_audit_diffs.overall_score_delta IS
  'Change in overall audit score (to_snapshot - from_snapshot). Positive values indicate improvement, negative indicate decline.';

COMMENT ON COLUMN public.aso_audit_diffs.kpi_family_deltas IS
  'Map of KPI family score changes. Structure: { "family_id": delta }. Example: { "clarity_structure": +5, "intent_quality": -3 }.';

COMMENT ON COLUMN public.aso_audit_diffs.change_summary IS
  'Detailed change summary JSONB. Contains: scoreImprovement (bool), significantChanges (string[]), topKpiChanges (array), impactLevel (high/medium/low).';

COMMENT ON COLUMN public.aso_audit_diffs.keywords_added IS
  'Array of keywords added in to_snapshot that were not in from_snapshot.';

COMMENT ON COLUMN public.aso_audit_diffs.keywords_removed IS
  'Array of keywords removed from from_snapshot that are not in to_snapshot.';

-- ============================================================================
-- Migration Notes
-- ============================================================================

-- This table is OPTIONAL for Phase 19 but provides rich diff functionality.
-- Diffs can be computed on-demand or pre-computed and stored.

-- Recommended usage:
-- 1. Compute diff when new snapshot is created (in save-monitored-app edge function)
-- 2. Store diff in aso_audit_diffs table
-- 3. Use diffs for UI features like "What changed?" modal

-- Phase 19 implementation:
-- - CREATE table (this migration)
-- - Implement diff computation function (edge function helper)
-- - Store diffs when new snapshot created
-- - Add UI for viewing diffs (Phase 19 or Phase 20)

COMMIT;

-- ============================================================================
-- Verification Query (run manually if needed)
-- ============================================================================
-- SELECT COUNT(*) FROM aso_audit_diffs;
-- SELECT * FROM aso_audit_diffs ORDER BY created_at DESC LIMIT 5;
