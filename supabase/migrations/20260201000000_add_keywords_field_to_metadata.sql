-- =====================================================================
-- Migration: Add keywords field to metadata tables
-- Purpose: Support 4-element combination generation (title, subtitle, keywords, promo)
-- Date: 2026-02-01
-- =====================================================================

-- Add keywords field to app_metadata_cache
-- This stores the 100-character App Store Connect keywords field
-- Format: Comma-separated keywords (e.g., "meditation,sleep,mindfulness,relaxation")
ALTER TABLE public.app_metadata_cache
  ADD COLUMN keywords TEXT;

COMMENT ON COLUMN public.app_metadata_cache.keywords IS
  'App Store Connect 100-character keywords field. Comma-separated keywords used for backend search indexing. Not visible to users in App Store.';

-- Add keywords field to monitored_apps
-- This allows users to manually input keywords for monitored apps
ALTER TABLE public.monitored_apps
  ADD COLUMN keywords TEXT;

COMMENT ON COLUMN public.monitored_apps.keywords IS
  'App Store Connect 100-character keywords field. User-provided for owned apps, reverse-engineered or manually researched for competitors.';

-- Add promotional text field to app_metadata_cache (for future Phase 4)
-- This is a 170-character field shown at the top of App Store listings
ALTER TABLE public.app_metadata_cache
  ADD COLUMN promotional_text TEXT;

COMMENT ON COLUMN public.app_metadata_cache.promotional_text IS
  'App Store promotional text (170 characters max). Shown at top of listing, frequently updated for events/seasons. Indexed for search but lower weight than title/subtitle.';

-- Update version_hash trigger to include keywords in change detection
-- This ensures keywords field changes trigger new audit snapshots
-- Note: We'll need to update the hash computation function if it exists

-- Indexes for keyword search (optional - for future keyword analytics)
CREATE INDEX idx_metadata_cache_keywords
  ON public.app_metadata_cache
  USING gin(to_tsvector('english', COALESCE(keywords, '')))
  WHERE keywords IS NOT NULL;

COMMENT ON INDEX idx_metadata_cache_keywords IS
  'Full-text search index on keywords field for future analytics queries.';
