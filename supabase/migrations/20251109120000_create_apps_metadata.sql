-- ============================================================================
-- MIGRATION: Unified App Metadata Storage
-- Purpose: Central cache for all App Store app data
-- Created: 2025-11-09
-- ============================================================================

-- Table: apps_metadata
CREATE TABLE IF NOT EXISTS public.apps_metadata (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- App Store Identity (UNIQUE - no duplicates)
  app_store_id TEXT UNIQUE NOT NULL,
  bundle_id TEXT,

  -- Basic Info
  app_name TEXT NOT NULL,
  developer_name TEXT NOT NULL,
  developer_id TEXT,
  app_icon_url TEXT,

  -- App Store Metadata
  category TEXT,
  subcategory TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  release_date TIMESTAMPTZ,
  current_version TEXT,
  minimum_os_version TEXT,

  -- Ratings & Reviews
  average_rating DECIMAL(3,2),
  rating_count INTEGER,
  review_count INTEGER,

  -- Content
  description TEXT,
  short_description TEXT,
  release_notes TEXT,

  -- Media (JSON arrays)
  screenshot_urls JSONB DEFAULT '[]'::jsonb,
  video_preview_urls JSONB DEFAULT '[]'::jsonb,

  -- Technical Details
  file_size_bytes BIGINT,
  supported_devices TEXT[] DEFAULT ARRAY[]::TEXT[],
  languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  content_rating TEXT,

  -- Data Source & Tracking
  data_source TEXT NOT NULL CHECK (data_source IN (
    'itunes_api',
    'app_store_connect',
    'manual'
  )) DEFAULT 'itunes_api',

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scrape_count INTEGER NOT NULL DEFAULT 1,
  is_available BOOLEAN NOT NULL DEFAULT true,

  -- Raw Data (for debugging/reprocessing)
  raw_metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Primary lookup by App Store ID
CREATE INDEX IF NOT EXISTS idx_apps_metadata_app_store_id
  ON public.apps_metadata(app_store_id);

-- Lookup by bundle ID
CREATE INDEX IF NOT EXISTS idx_apps_metadata_bundle_id
  ON public.apps_metadata(bundle_id) WHERE bundle_id IS NOT NULL;

-- Search by developer
CREATE INDEX IF NOT EXISTS idx_apps_metadata_developer
  ON public.apps_metadata(developer_name);

-- Filter by category
CREATE INDEX IF NOT EXISTS idx_apps_metadata_category
  ON public.apps_metadata(category) WHERE category IS NOT NULL;

-- Sort by last scraped (find stale data)
CREATE INDEX IF NOT EXISTS idx_apps_metadata_last_scraped
  ON public.apps_metadata(last_scraped_at DESC);

-- Sort by rating (find top apps)
CREATE INDEX IF NOT EXISTS idx_apps_metadata_rating
  ON public.apps_metadata(average_rating DESC NULLS LAST)
  WHERE average_rating IS NOT NULL;

-- Full-text search on app name and developer
CREATE INDEX IF NOT EXISTS idx_apps_metadata_search
  ON public.apps_metadata
  USING GIN(to_tsvector('english',
    app_name || ' ' || COALESCE(developer_name, '')
  ));

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.apps_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all app metadata (public data)
CREATE POLICY "apps_metadata_read_authenticated"
ON public.apps_metadata
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only service role can write (edge functions only)
CREATE POLICY "apps_metadata_write_service_role"
ON public.apps_metadata
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_apps_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Increment scrape count if data is being refreshed
  IF TG_OP = 'UPDATE' THEN
    NEW.scrape_count = COALESCE(OLD.scrape_count, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER apps_metadata_updated_at
  BEFORE UPDATE ON public.apps_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_apps_metadata_updated_at();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.apps_metadata IS
  'Unified cache for all App Store app metadata. Central data layer that powers reviews, keywords, title analysis, and spy tools. Data is scraped from iTunes API and persisted here to avoid re-scraping.';

COMMENT ON COLUMN public.apps_metadata.app_store_id IS
  'iTunes App Store ID (trackId from iTunes API). Primary identifier for apps. Example: 389801252 for Instagram';

COMMENT ON COLUMN public.apps_metadata.data_source IS
  'Source of the metadata: itunes_api (public iTunes Search/Lookup API), app_store_connect (official Apple API for own apps), manual (user input)';

COMMENT ON COLUMN public.apps_metadata.last_scraped_at IS
  'Last time this app metadata was fetched from the source. Used to determine if cached data is stale (> 24 hours).';

COMMENT ON COLUMN public.apps_metadata.raw_metadata IS
  'Complete raw response from iTunes API stored as JSONB. Enables reprocessing if we add new fields without re-scraping.';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- DROP TRIGGER apps_metadata_updated_at ON public.apps_metadata;
-- DROP FUNCTION public.update_apps_metadata_updated_at();
-- DROP TABLE public.apps_metadata CASCADE;
