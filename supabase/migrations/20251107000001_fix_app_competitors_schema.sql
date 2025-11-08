-- Migration: Fix app_competitors schema - competitors don't need to be monitored
-- Date: 2025-11-07
-- Purpose: Store competitor metadata directly, remove dependency on monitored_apps

-- ==============================================================================
-- Drop existing table and recreate with correct schema
-- ==============================================================================

DROP TABLE IF EXISTS public.app_competitors CASCADE;

-- ==============================================================================
-- Table: app_competitors (CORRECTED)
-- Purpose: Link target apps to their competitors (by App Store ID)
-- ==============================================================================

CREATE TABLE public.app_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Target app (must be monitored)
  target_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,

  -- Competitor app (does NOT need to be monitored - just an App Store app)
  competitor_app_store_id TEXT NOT NULL,      -- iTunes App Store ID
  competitor_app_name TEXT NOT NULL,          -- App name
  competitor_app_icon TEXT,                   -- App icon URL
  competitor_bundle_id TEXT,                  -- Bundle ID (optional)
  competitor_developer TEXT,                  -- Developer name
  competitor_category TEXT,                   -- App category

  -- Snapshot at time of adding (cached for display)
  competitor_rating DECIMAL(3,2),             -- Rating when added
  competitor_review_count INTEGER,            -- Review count when added
  country TEXT NOT NULL,                      -- Country for comparison (e.g., 'us', 'gb')

  -- Metadata
  comparison_context TEXT,                    -- Why is this a competitor?
  priority INTEGER DEFAULT 1,                 -- 1=primary, 2=secondary, etc.
  is_active BOOLEAN DEFAULT TRUE,             -- Soft delete

  -- Last analysis cache
  last_compared_at TIMESTAMPTZ,               -- When was last comparison run?
  comparison_summary JSONB,                   -- Cache comparison results

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Prevent duplicates: same target + competitor + country
  UNIQUE(organization_id, target_app_id, competitor_app_store_id, country)
);

-- ==============================================================================
-- Indexes for Performance
-- ==============================================================================

CREATE INDEX idx_app_competitors_target
  ON app_competitors(target_app_id)
  WHERE is_active = TRUE;

CREATE INDEX idx_app_competitors_org
  ON app_competitors(organization_id);

CREATE INDEX idx_app_competitors_target_active
  ON app_competitors(target_app_id, is_active, priority)
  WHERE is_active = TRUE;

CREATE INDEX idx_app_competitors_app_store_id
  ON app_competitors(competitor_app_store_id);

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE app_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their org app competitors"
ON app_competitors FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "Users can add competitors"
ON app_competitors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = app_competitors.organization_id
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "Users can update competitors"
ON app_competitors FOR UPDATE
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "Users can remove competitors"
ON app_competitors FOR DELETE
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- ==============================================================================
-- Comments
-- ==============================================================================

COMMENT ON TABLE app_competitors IS
  'Links target apps (monitored) to their competitors (App Store apps). Competitors do NOT need to be monitored - we fetch their reviews on-demand.';

COMMENT ON COLUMN app_competitors.target_app_id IS
  'The monitored app being analyzed (YOUR app)';

COMMENT ON COLUMN app_competitors.competitor_app_store_id IS
  'App Store ID of competitor (THEIR app). Does not need to be in monitored_apps table.';

COMMENT ON COLUMN app_competitors.country IS
  'Country for comparison (e.g., us, gb). Same competitor can be added for different countries.';

COMMENT ON COLUMN app_competitors.competitor_rating IS
  'Cached rating at time of adding. May be stale - refresh when comparing.';

-- ==============================================================================
-- Helper Function
-- ==============================================================================

-- Drop existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS get_target_app_competitors(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION get_target_app_competitors(
  p_target_app_id UUID,
  p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  competitor_id UUID,
  competitor_app_store_id TEXT,
  competitor_app_name TEXT,
  competitor_app_icon TEXT,
  competitor_rating DECIMAL,
  competitor_review_count INTEGER,
  competitor_developer TEXT,
  competitor_category TEXT,
  country TEXT,
  priority INTEGER,
  last_compared_at TIMESTAMPTZ,
  comparison_context TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.id AS competitor_id,
    ac.competitor_app_store_id,
    ac.competitor_app_name,
    ac.competitor_app_icon,
    ac.competitor_rating,
    ac.competitor_review_count,
    ac.competitor_developer,
    ac.competitor_category,
    ac.country,
    ac.priority,
    ac.last_compared_at,
    ac.comparison_context
  FROM app_competitors ac
  WHERE ac.target_app_id = p_target_app_id
    AND (ac.is_active = TRUE OR p_include_inactive = TRUE)
  ORDER BY ac.priority ASC, ac.competitor_app_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- Success Message
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Schema fixed: app_competitors now stores competitors independently';
  RAISE NOTICE '📊 Competitors: No longer require monitored_apps entry';
  RAISE NOTICE '🔗 Target apps: Still linked to monitored_apps (YOUR apps)';
  RAISE NOTICE '⚡ Competitor data: Stored directly in app_competitors table';
  RAISE NOTICE '🌍 Multi-country: Same competitor can be added per country';
END $$;
