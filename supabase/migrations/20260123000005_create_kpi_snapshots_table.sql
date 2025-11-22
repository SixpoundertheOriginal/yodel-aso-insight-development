-- =====================================================================
-- Migration: Create app_metadata_kpi_snapshots table
-- Purpose: Store KPI Engine vectors and scores for metadata optimization
-- Features:
--   - Multi-tenant via organization_id
--   - Stores KPI vectors (34-dimensional float arrays)
--   - Stores full KPI breakdown as JSONB
--   - Family scores for rollup analysis
--   - Version tracking for ML model compatibility
--   - Time-series support for trend analysis and comparison
-- =====================================================================

-- Table: app_metadata_kpi_snapshots
CREATE TABLE public.app_metadata_kpi_snapshots (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- App identification
  app_id TEXT NOT NULL,
  bundle_id TEXT,
  market TEXT NOT NULL DEFAULT 'us',
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),

  -- KPI Engine versioning
  metadata_version TEXT NOT NULL, -- KPI Engine version (e.g., 'v1')

  -- KPI Vector (34-dimensional array for ML/similarity analysis)
  kpi_vector FLOAT8[] NOT NULL,

  -- Full KPI breakdown (all 34 KPIs with raw + normalized values)
  kpi_json JSONB NOT NULL,

  -- Overall score (weighted average of family scores)
  score_overall FLOAT8 NOT NULL,

  -- Family scores (6 families with individual scores)
  score_families JSONB NOT NULL,

  -- Metadata at time of KPI computation
  title TEXT,
  subtitle TEXT,

  -- Snapshot metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT kpi_snapshots_platform_check
    CHECK (platform IN ('ios', 'android')),

  CONSTRAINT kpi_snapshots_score_range
    CHECK (score_overall >= 0 AND score_overall <= 100),

  CONSTRAINT kpi_snapshots_version_not_empty
    CHECK (length(metadata_version) > 0)
);

-- Indexes for performance
CREATE INDEX idx_kpi_snapshots_app_org
  ON public.app_metadata_kpi_snapshots(app_id, organization_id);

CREATE INDEX idx_kpi_snapshots_org_created
  ON public.app_metadata_kpi_snapshots(organization_id, created_at DESC);

CREATE INDEX idx_kpi_snapshots_app_market
  ON public.app_metadata_kpi_snapshots(app_id, market, created_at DESC);

CREATE INDEX idx_kpi_snapshots_created_at
  ON public.app_metadata_kpi_snapshots(created_at DESC);

CREATE INDEX idx_kpi_snapshots_platform_market
  ON public.app_metadata_kpi_snapshots(platform, market, created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.app_metadata_kpi_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT - Users can read KPI snapshots for their organization
CREATE POLICY "Users can read KPI snapshots for their organization"
  ON public.app_metadata_kpi_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_kpi_snapshots.organization_id
    )
  );

-- RLS Policy: INSERT - Users can insert KPI snapshots for their organization
CREATE POLICY "Users can insert KPI snapshots for their organization"
  ON public.app_metadata_kpi_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_kpi_snapshots.organization_id
    )
  );

-- RLS Policy: UPDATE - Users can update KPI snapshots for their organization
CREATE POLICY "Users can update KPI snapshots for their organization"
  ON public.app_metadata_kpi_snapshots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_kpi_snapshots.organization_id
    )
  );

-- RLS Policy: DELETE - Users can delete KPI snapshots for their organization
CREATE POLICY "Users can delete KPI snapshots for their organization"
  ON public.app_metadata_kpi_snapshots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_kpi_snapshots.organization_id
    )
  );

-- Comments
COMMENT ON TABLE public.app_metadata_kpi_snapshots IS
  'Stores KPI Engine snapshots for metadata optimization tracking. Contains 34-dimensional KPI vectors for ML analysis, family scores, and full KPI breakdown. Enables trend analysis, competitor comparison, and metadata version tracking.';

COMMENT ON COLUMN public.app_metadata_kpi_snapshots.kpi_vector IS
  '34-dimensional float array containing normalized KPI values (0-100 scale). Used for ML similarity analysis, clustering, and vector-based comparisons.';

COMMENT ON COLUMN public.app_metadata_kpi_snapshots.kpi_json IS
  'Full KPI breakdown as JSONB. Contains all 34 KPIs with both raw values and normalized scores. Structure: { [kpi_id]: { id, value, normalized, definition } }';

COMMENT ON COLUMN public.app_metadata_kpi_snapshots.score_overall IS
  'Overall metadata quality score (0-100). Weighted average of all family scores based on KPI Engine weights.';

COMMENT ON COLUMN public.app_metadata_kpi_snapshots.score_families IS
  'Family-level scores as JSONB. Contains 6 families: clarity_structure, keyword_architecture, hook_strength, brand_vs_generic, psychology_alignment, intent_alignment. Structure: { [family_id]: { score, weight, kpiIds } }';

COMMENT ON COLUMN public.app_metadata_kpi_snapshots.metadata_version IS
  'KPI Engine version identifier (e.g., "v1"). Critical for ML model compatibility and schema migration tracking.';
