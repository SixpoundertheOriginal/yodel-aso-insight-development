-- =====================================================================
-- Migration: Create audit_snapshots table
-- Purpose: Store audit analysis results for ASO metadata optimization
-- Features:
--   - Multi-tenant via organization_id
--   - Stores Phase 2 combination analysis (combos, metrics, insights)
--   - Version hash linking to app_metadata_cache
--   - Extensible for competitor overlap and health scoring
--   - Time-series support for delta analysis
-- =====================================================================

-- Table: audit_snapshots
CREATE TABLE public.audit_snapshots (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- App identification
  app_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios', -- 'ios' | 'android'
  locale TEXT NOT NULL DEFAULT 'us',

  -- Snapshot metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Metadata at time of audit
  title TEXT,
  subtitle TEXT,

  -- Phase 2: Advanced Combination Analysis
  combinations JSONB, -- ClassifiedCombo[] from analyzeEnhancedCombinations
  metrics JSONB, -- { longTailStrength, intentDiversity, categoryCoverage, redundancyIndex, avgFillerRatio }
  insights JSONB, -- OpportunityInsights { missingClusters, potentialCombos, estimatedGain, actionableInsights }

  -- Overall audit score (0-100)
  audit_score INT,

  -- Versioning and source tracking
  metadata_version_hash TEXT NOT NULL, -- Links to app_metadata_cache.version_hash
  metadata_source TEXT DEFAULT 'cache', -- 'live' | 'cache'

  -- Future extensibility
  competitor_overlap JSONB DEFAULT '{}'::jsonb, -- Future: Competitor keyword overlap analysis
  metadata_health JSONB DEFAULT '{}'::jsonb, -- Future: Health scoring (completeness, quality)
  metadata_version TEXT DEFAULT 'v1', -- Schema version for migrations

  -- Constraints
  CONSTRAINT audit_snapshots_platform_check
    CHECK (platform IN ('ios', 'android')),

  CONSTRAINT audit_snapshots_source_check
    CHECK (metadata_source IN ('live', 'cache')),

  CONSTRAINT audit_snapshots_score_range
    CHECK (audit_score IS NULL OR (audit_score >= 0 AND audit_score <= 100)),

  CONSTRAINT audit_snapshots_version_hash_not_empty
    CHECK (length(metadata_version_hash) > 0)
);

-- Indexes for performance
CREATE INDEX idx_audit_snapshots_app_org
  ON public.audit_snapshots(app_id, organization_id);

CREATE INDEX idx_audit_snapshots_org_created
  ON public.audit_snapshots(organization_id, created_at DESC);

CREATE INDEX idx_audit_snapshots_hash
  ON public.audit_snapshots(metadata_version_hash);

CREATE INDEX idx_audit_snapshots_created_at
  ON public.audit_snapshots(created_at DESC);

CREATE INDEX idx_audit_snapshots_app_locale
  ON public.audit_snapshots(app_id, locale, created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.audit_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT - Users can read snapshots for their organization
CREATE POLICY "Users can read snapshots for their organization"
  ON public.audit_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = audit_snapshots.organization_id
    )
  );

-- RLS Policy: INSERT - Users can insert snapshots for their organization
CREATE POLICY "Users can insert snapshots for their organization"
  ON public.audit_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = audit_snapshots.organization_id
    )
  );

-- RLS Policy: UPDATE - Users can update snapshots for their organization
CREATE POLICY "Users can update snapshots for their organization"
  ON public.audit_snapshots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = audit_snapshots.organization_id
    )
  );

-- RLS Policy: DELETE - Users can delete snapshots for their organization
CREATE POLICY "Users can delete snapshots for their organization"
  ON public.audit_snapshots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = audit_snapshots.organization_id
    )
  );

-- Comments
COMMENT ON TABLE public.audit_snapshots IS
  'Stores ASO audit analysis snapshots including Phase 2 combination intelligence, metrics, and insights. Enables historical comparison, delta analysis, and metadata optimization tracking.';

COMMENT ON COLUMN public.audit_snapshots.combinations IS
  'Full ClassifiedCombo[] array from analyzeEnhancedCombinations. Each combo includes: length, intent, hasBrand, hasCategory, hasBenefit, hasVerb, hasTimeHint, fillerRatio, impactScore, isNew, isRedundant.';

COMMENT ON COLUMN public.audit_snapshots.metrics IS
  'Aggregate metrics: { longTailStrength, intentDiversity, categoryCoverage, redundancyIndex, avgFillerRatio }. All values 0-100 except avgFillerRatio (0-1).';

COMMENT ON COLUMN public.audit_snapshots.insights IS
  'OpportunityInsights: { missingClusters[], potentialCombos[], estimatedGain, actionableInsights[] }. Provides strategic recommendations for metadata optimization.';

COMMENT ON COLUMN public.audit_snapshots.metadata_version_hash IS
  'SHA256 hash linking to app_metadata_cache.version_hash. Used to detect which metadata version this audit analyzed.';

COMMENT ON COLUMN public.audit_snapshots.metadata_source IS
  'Source of metadata for this audit: "live" (fresh scrape) or "cache" (from app_metadata_cache). Affects determinism and reproducibility.';

COMMENT ON COLUMN public.audit_snapshots.competitor_overlap IS
  'Future: Competitor keyword overlap analysis. Reserved for competitive intelligence features.';

COMMENT ON COLUMN public.audit_snapshots.metadata_health IS
  'Future: Metadata health scoring based on completeness, quality, and best practices compliance.';
