-- =====================================================================
-- Migration: Create app_metadata_cache table
-- Purpose: Store raw + structured metadata snapshots for ASO audit caching
-- Features:
--   - Multi-tenant via organization_id
--   - Version hashing for change detection
--   - Extensible JSONB fields for future metadata
--   - Unique constraint per org + app + locale + platform
-- =====================================================================

-- Table: app_metadata_cache
CREATE TABLE public.app_metadata_cache (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- App identification
  app_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios', -- 'ios' | 'android'
  locale TEXT NOT NULL DEFAULT 'us',

  -- Cache metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Core Apple metadata (text fields)
  title TEXT,
  subtitle TEXT,
  description TEXT,
  developer_name TEXT,
  app_icon_url TEXT,

  -- Visual assets (JSONB for flexibility)
  screenshots JSONB DEFAULT '[]'::jsonb,

  -- Full raw JSON response (for future ML/analysis)
  app_json JSONB,

  -- Extendable fields (future features)
  screenshot_captions JSONB DEFAULT '[]'::jsonb,
  feature_cards JSONB DEFAULT '[]'::jsonb,
  preview_analysis JSONB DEFAULT '{}'::jsonb,

  -- Version hash for change detection
  -- Computed from: title + subtitle + description + developer_name + screenshots
  version_hash TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT app_metadata_cache_unique_per_org
    UNIQUE(organization_id, app_id, locale, platform),

  CONSTRAINT app_metadata_cache_platform_check
    CHECK (platform IN ('ios', 'android')),

  CONSTRAINT app_metadata_cache_version_hash_not_empty
    CHECK (length(version_hash) > 0)
);

-- Indexes for performance
CREATE INDEX idx_metadata_cache_app_org
  ON public.app_metadata_cache(app_id, organization_id);

CREATE INDEX idx_metadata_cache_org_fetched
  ON public.app_metadata_cache(organization_id, fetched_at DESC);

CREATE INDEX idx_metadata_cache_hash
  ON public.app_metadata_cache(version_hash);

CREATE INDEX idx_metadata_cache_fetched_at
  ON public.app_metadata_cache(fetched_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.app_metadata_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT - Users can read cache for their organization
CREATE POLICY "Users can read cache for their organization"
  ON public.app_metadata_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_cache.organization_id
    )
  );

-- RLS Policy: INSERT - Users can insert cache for their organization
CREATE POLICY "Users can insert cache for their organization"
  ON public.app_metadata_cache
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_cache.organization_id
    )
  );

-- RLS Policy: UPDATE - Users can update cache for their organization
CREATE POLICY "Users can update cache for their organization"
  ON public.app_metadata_cache
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_cache.organization_id
    )
  );

-- RLS Policy: DELETE - Users can delete cache for their organization
CREATE POLICY "Users can delete cache for their organization"
  ON public.app_metadata_cache
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_cache.organization_id
    )
  );

-- Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_app_metadata_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_metadata_cache_updated_at
  BEFORE UPDATE ON public.app_metadata_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_app_metadata_cache_updated_at();

-- Comments
COMMENT ON TABLE public.app_metadata_cache IS
  'Stores cached app metadata snapshots for ASO audit optimization. Includes version hashing for change detection and extensible JSONB fields for future metadata layers (screenshot captions, OCR, feature cards).';

COMMENT ON COLUMN public.app_metadata_cache.version_hash IS
  'SHA256 hash of (title + subtitle + description + developer_name + screenshots). Used for detecting metadata changes between snapshots.';

COMMENT ON COLUMN public.app_metadata_cache.app_json IS
  'Full raw JSON response from App Store API. Preserved for future ML analysis and advanced feature extraction.';

COMMENT ON COLUMN public.app_metadata_cache.screenshot_captions IS
  'Future: AI-extracted captions from app screenshots';

COMMENT ON COLUMN public.app_metadata_cache.feature_cards IS
  'Future: Structured data about app feature cards';

COMMENT ON COLUMN public.app_metadata_cache.preview_analysis IS
  'Future: OCR and video analysis from app preview videos';
