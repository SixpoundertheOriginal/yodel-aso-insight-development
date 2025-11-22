-- Migration: Create Autocomplete Intelligence Layer Tables
-- Description: Adds search_intent_registry and autocomplete_intelligence_cache tables
--              for storing keyword intent classifications and autocomplete API responses
-- Date: 2026-01-23
-- Phase: Autocomplete Intelligence V1 - Database Layer

-- ============================================================
-- TABLE: search_intent_registry
-- Purpose: Store keyword intent classifications from autocomplete analysis
-- ============================================================

CREATE TABLE IF NOT EXISTS search_intent_registry (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  region TEXT NOT NULL DEFAULT 'us',

  -- Intent classification
  intent_type TEXT NOT NULL CHECK (intent_type IN (
    'navigational',   -- User searching for specific app (e.g., "facebook", "spotify")
    'informational',  -- User seeking information (e.g., "how to learn spanish")
    'commercial',     -- User researching products (e.g., "best fitness tracker")
    'transactional'   -- User ready to download (e.g., "free photo editor")
  )),
  intent_confidence NUMERIC(5,2) CHECK (intent_confidence BETWEEN 0 AND 100),

  -- Autocomplete data
  autocomplete_suggestions JSONB,  -- Array of suggestion objects from Apple/Google API
  autocomplete_volume_estimate INTEGER,  -- Estimated search volume (if available)
  autocomplete_rank INTEGER,  -- Position in autocomplete results (1-10)

  -- Metadata
  last_refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  data_source TEXT DEFAULT 'apple_autocomplete',  -- 'apple_autocomplete', 'google_autocomplete', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(keyword, platform, region)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_intent_keyword ON search_intent_registry(keyword);
CREATE INDEX IF NOT EXISTS idx_search_intent_platform_region ON search_intent_registry(platform, region);
CREATE INDEX IF NOT EXISTS idx_search_intent_intent_type ON search_intent_registry(intent_type);
CREATE INDEX IF NOT EXISTS idx_search_intent_last_refreshed ON search_intent_registry(last_refreshed_at);

-- Comment
COMMENT ON TABLE search_intent_registry IS 'Stores keyword intent classifications derived from autocomplete analysis. Used by Keyword Intelligence and Metadata Copilot for semantic keyword expansion.';

-- ============================================================
-- TABLE: autocomplete_intelligence_cache
-- Purpose: Cache autocomplete API responses to reduce external API calls
-- ============================================================

CREATE TABLE IF NOT EXISTS autocomplete_intelligence_cache (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  region TEXT NOT NULL DEFAULT 'us',

  -- Cached response data
  raw_response JSONB NOT NULL,  -- Full API response
  suggestions_count INTEGER,

  -- Cache metadata
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,  -- TTL: 7 days from cached_at
  api_status TEXT CHECK (api_status IN ('success', 'partial', 'error')),
  error_message TEXT,

  -- Request metadata
  request_source TEXT,  -- 'keyword_intelligence', 'metadata_copilot', 'competitor_intel'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(query, platform, region)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_autocomplete_cache_query ON autocomplete_intelligence_cache(query);
CREATE INDEX IF NOT EXISTS idx_autocomplete_cache_platform_region ON autocomplete_intelligence_cache(platform, region);
CREATE INDEX IF NOT EXISTS idx_autocomplete_cache_expires_at ON autocomplete_intelligence_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_autocomplete_cache_cached_at ON autocomplete_intelligence_cache(cached_at);

-- Comment
COMMENT ON TABLE autocomplete_intelligence_cache IS 'Caches autocomplete API responses with 7-day TTL to reduce external API costs and improve response times.';

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE search_intent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE autocomplete_intelligence_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read search_intent_registry
CREATE POLICY "Allow authenticated users to read search intent registry"
  ON search_intent_registry
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to manage search_intent_registry
CREATE POLICY "Allow service role to manage search intent registry"
  ON search_intent_registry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read autocomplete_intelligence_cache
CREATE POLICY "Allow authenticated users to read autocomplete cache"
  ON autocomplete_intelligence_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to manage autocomplete_intelligence_cache
CREATE POLICY "Allow service role to manage autocomplete cache"
  ON autocomplete_intelligence_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- HELPER FUNCTION: Auto-update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_search_intent_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_intent_registry_updated_at
  BEFORE UPDATE ON search_intent_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_search_intent_registry_updated_at();

-- ============================================================
-- HELPER FUNCTION: Auto-set expires_at to 7 days from cached_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_autocomplete_cache_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NEW.cached_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_autocomplete_cache_expires_at
  BEFORE INSERT ON autocomplete_intelligence_cache
  FOR EACH ROW
  EXECUTE FUNCTION set_autocomplete_cache_expires_at();
