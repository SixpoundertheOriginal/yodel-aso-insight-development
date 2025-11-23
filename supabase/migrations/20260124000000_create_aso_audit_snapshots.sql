-- =====================================================================
-- Migration: Create aso_audit_snapshots table (Phase 19)
-- Purpose: Store Bible-driven Metadata Audit V2 results for monitored apps
-- Features:
--   - Stores full UnifiedMetadataAuditResult from metadata-audit-v2
--   - Includes KPI Engine results (43 KPIs across 6 families)
--   - Tracks Bible ruleset version and configuration
--   - Stores Intent Coverage data (Phase 17)
--   - Links to monitored_apps for audit history
--   - Enables time-series analysis and trend tracking
-- Replaces: audit_snapshots (deprecated, Phase 2 format)
-- =====================================================================

BEGIN;

-- ============================================================================
-- Table: aso_audit_snapshots
-- ============================================================================

CREATE TABLE public.aso_audit_snapshots (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to monitored app (FK with cascade delete)
  monitored_app_id UUID NOT NULL REFERENCES public.monitored_apps(id) ON DELETE CASCADE,

  -- Multi-tenant isolation (denormalized from monitored_apps for query performance)
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- App identification (denormalized for query performance)
  app_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  locale TEXT NOT NULL DEFAULT 'us',

  -- Snapshot metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'cache' CHECK (source IN ('live', 'cache', 'manual')),

  -- Metadata at time of audit (for quick reference)
  title TEXT,
  subtitle TEXT,
  description TEXT,

  -- ========================================================================
  -- AUDIT RESULT: Full Bible-driven analysis (Phases 9-18.5)
  -- ========================================================================

  -- Full UnifiedMetadataAuditResult from metadata-audit-v2 edge function
  -- Contains: overallScore, elements, recommendations, keywordCoverage, comboCoverage, intentCoverage
  audit_result JSONB NOT NULL,

  -- Extracted overall score for fast querying (denormalized from audit_result)
  overall_score INT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- ========================================================================
  -- KPI ENGINE RESULT (Phase 18)
  -- ========================================================================

  -- Full KpiEngineResult containing 43 KPIs across 6 families
  -- Contains: version, vector[], kpis{}, families{}, overallScore, debug
  kpi_result JSONB,

  -- Extracted KPI overall score for fast querying (denormalized)
  kpi_overall_score INT CHECK (kpi_overall_score IS NULL OR (kpi_overall_score >= 0 AND kpi_overall_score <= 100)),

  -- Family scores (denormalized for fast queries)
  -- Structure: { "clarity_structure": 75, "keyword_architecture": 82, ..., "intent_quality": 68 }
  kpi_family_scores JSONB,

  -- ========================================================================
  -- BIBLE METADATA (Phase 9-13)
  -- ========================================================================

  -- Bible ruleset metadata for reproducibility
  -- Structure: { version: "v1", rulesetId: "ios_us_learning", mergedRules: 234, overridesApplied: 12 }
  bible_metadata JSONB,

  -- Engine version for schema compatibility
  audit_version TEXT NOT NULL DEFAULT 'v2',
  kpi_version TEXT DEFAULT 'v1',

  -- ========================================================================
  -- VERSIONING & CACHE LINKAGE
  -- ========================================================================

  -- Links to app_metadata_cache for metadata version tracking
  metadata_version_hash TEXT,

  -- Hash of audit_result for change detection (computed on insert)
  audit_hash TEXT,

  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Primary queries: Fetch all snapshots for a monitored app (audit history)
CREATE INDEX idx_aso_audit_snapshots_monitored_app
  ON public.aso_audit_snapshots(monitored_app_id, created_at DESC);

-- Org-based queries (for admin/reporting)
CREATE INDEX idx_aso_audit_snapshots_org_created
  ON public.aso_audit_snapshots(organization_id, created_at DESC);

-- App-based queries (for cross-org analysis by internal users)
CREATE INDEX idx_aso_audit_snapshots_app_locale
  ON public.aso_audit_snapshots(app_id, locale, created_at DESC);

-- Score-based queries (for benchmarking)
CREATE INDEX idx_aso_audit_snapshots_scores
  ON public.aso_audit_snapshots(overall_score, kpi_overall_score);

-- Hash-based queries (for deduplication)
CREATE INDEX idx_aso_audit_snapshots_hash
  ON public.aso_audit_snapshots(audit_hash);

-- Recent snapshots (for dashboard)
CREATE INDEX idx_aso_audit_snapshots_created
  ON public.aso_audit_snapshots(created_at DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.aso_audit_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can read snapshots for their organization
CREATE POLICY "Users can read audit snapshots for their organization"
  ON public.aso_audit_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = aso_audit_snapshots.organization_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
        AND ur.organization_id IS NULL
    )
  );

-- Policy: INSERT - Users can insert snapshots for their organization
CREATE POLICY "Users can insert audit snapshots for their organization"
  ON public.aso_audit_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = aso_audit_snapshots.organization_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
    )
  );

-- Policy: UPDATE - Users can update snapshots for their organization
CREATE POLICY "Users can update audit snapshots for their organization"
  ON public.aso_audit_snapshots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = aso_audit_snapshots.organization_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
    )
  );

-- Policy: DELETE - Users can delete snapshots for their organization
CREATE POLICY "Users can delete audit snapshots for their organization"
  ON public.aso_audit_snapshots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = aso_audit_snapshots.organization_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_aso_audit_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER aso_audit_snapshots_updated_at
  BEFORE UPDATE ON public.aso_audit_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_aso_audit_snapshots_updated_at();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.aso_audit_snapshots IS
  'Phase 19: Stores Bible-driven Metadata Audit V2 results for monitored apps. Includes full UnifiedMetadataAuditResult, KPI Engine results (43 KPIs), Intent Coverage, and Bible ruleset metadata. Enables audit history, trend analysis, and metadata version tracking.';

COMMENT ON COLUMN public.aso_audit_snapshots.audit_result IS
  'Full UnifiedMetadataAuditResult from metadata-audit-v2 edge function. Contains: overallScore, elements{title, subtitle, description}, topRecommendations[], keywordCoverage, comboCoverage, conversionInsights, intentCoverage (Phase 17).';

COMMENT ON COLUMN public.aso_audit_snapshots.kpi_result IS
  'Full KpiEngineResult containing 43 KPIs across 6 families (including Intent Quality from Phase 18). Structure: { version, vector[], kpis{}, families{}, overallScore, debug }.';

COMMENT ON COLUMN public.aso_audit_snapshots.bible_metadata IS
  'Bible ruleset metadata for reproducibility. Contains: version, rulesetId, mergedRules count, overridesApplied count. Critical for A/B testing and historical analysis.';

COMMENT ON COLUMN public.aso_audit_snapshots.kpi_family_scores IS
  'Denormalized family scores for fast querying. Contains 6 families: clarity_structure, keyword_architecture, hook_strength, brand_vs_generic, psychology_alignment, intent_quality.';

COMMENT ON COLUMN public.aso_audit_snapshots.audit_hash IS
  'SHA256 hash of audit_result JSONB for change detection. Used to avoid storing duplicate snapshots.';

COMMENT ON COLUMN public.aso_audit_snapshots.source IS
  'Source of metadata: "live" (fresh scrape), "cache" (from app_metadata_cache), "manual" (user-triggered).';

-- ============================================================================
-- Migration Notes
-- ============================================================================

-- This table REPLACES audit_snapshots (deprecated, Phase 2 format).
-- audit_snapshots is kept for backwards compatibility but marked as deprecated.
-- New audits should ONLY be stored in aso_audit_snapshots.

-- Migration strategy:
-- 1. Keep audit_snapshots table (no breaking changes)
-- 2. Update save-monitored-app to write to aso_audit_snapshots
-- 3. Update useMonitoredAudit to read from aso_audit_snapshots
-- 4. Fallback to audit_snapshots if aso_audit_snapshots is empty (backwards compat)

COMMIT;

-- ============================================================================
-- Verification Query (run manually if needed)
-- ============================================================================
-- SELECT COUNT(*) FROM aso_audit_snapshots;
-- SELECT * FROM aso_audit_snapshots ORDER BY created_at DESC LIMIT 1;
