-- Migration: Create monitored_apps table for Reviews page
-- Date: 2025-01-06
-- Purpose: Enable monitoring ANY App Store app (independent from BigQuery)

-- ==============================================================================
-- Table: monitored_apps
-- Purpose: Store apps that users want to monitor for reviews (ANY App Store app)
-- Note: This is SEPARATE from organization_apps (which is for BigQuery/ASC apps)
-- ==============================================================================

CREATE TABLE public.monitored_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- App Store Identity
  app_store_id TEXT NOT NULL,              -- iTunes app ID (e.g., "1239779099")
  app_name TEXT NOT NULL,                  -- App name (e.g., "Locate A Locum")
  bundle_id TEXT,                          -- Bundle ID (optional)
  app_icon_url TEXT,                       -- App icon URL

  -- App Metadata
  developer_name TEXT,                     -- Developer name
  category TEXT,                           -- App category
  primary_country TEXT NOT NULL,           -- Country where saved (e.g., 'gb', 'us')

  -- Monitoring Metadata
  monitor_type TEXT NOT NULL DEFAULT 'reviews',  -- 'reviews', 'ratings', 'both'
  tags TEXT[],                             -- User-defined tags: ['competitor', 'client', 'benchmark']
  notes TEXT,                              -- User notes about this app

  -- Snapshot at time of saving
  snapshot_rating DECIMAL(3,2),            -- Rating when saved (e.g., 2.48)
  snapshot_review_count INTEGER,           -- Review count when saved
  snapshot_taken_at TIMESTAMPTZ,           -- When snapshot was taken

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_checked_at TIMESTAMPTZ,             -- Last time reviews were fetched

  -- Prevent duplicates per org (same app + country combination)
  UNIQUE(organization_id, app_store_id, primary_country)
);

-- ==============================================================================
-- Indexes for Performance
-- ==============================================================================

CREATE INDEX idx_monitored_apps_org_id
  ON monitored_apps (organization_id);

CREATE INDEX idx_monitored_apps_country
  ON monitored_apps (organization_id, primary_country);

CREATE INDEX idx_monitored_apps_created_at
  ON monitored_apps (created_at DESC);

CREATE INDEX idx_monitored_apps_last_checked
  ON monitored_apps (last_checked_at DESC NULLS LAST);

-- ==============================================================================
-- Comments
-- ==============================================================================

COMMENT ON TABLE monitored_apps IS
  'Apps monitored for reviews/ratings - independent from BigQuery analytics apps. Universal monitoring like AppTweak.';

COMMENT ON COLUMN monitored_apps.app_store_id IS
  'iTunes App Store ID (trackId from iTunes API)';

COMMENT ON COLUMN monitored_apps.primary_country IS
  'Country code where app was saved (e.g., gb, us). Same app can be monitored in multiple countries.';

COMMENT ON COLUMN monitored_apps.tags IS
  'User-defined tags for categorization: competitor, client, benchmark, industry-leader, etc.';

COMMENT ON COLUMN monitored_apps.monitor_type IS
  'What to monitor: reviews, ratings, or both';

COMMENT ON COLUMN monitored_apps.last_checked_at IS
  'Last time reviews were fetched for this app. Used to show freshness in UI.';

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE monitored_apps ENABLE ROW LEVEL SECURITY;

-- Policy: Users see their organization's monitored apps
CREATE POLICY "Users see their org monitored apps"
ON monitored_apps
FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);

-- Policy: Org admins and members can add apps to monitor
CREATE POLICY "Users can add monitored apps"
ON monitored_apps
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = monitored_apps.organization_id
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- Policy: Users can update monitored apps (notes, tags, etc.)
CREATE POLICY "Users can update monitored apps"
ON monitored_apps
FOR UPDATE
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- Policy: Users can remove monitored apps
CREATE POLICY "Users can remove monitored apps"
ON monitored_apps
FOR DELETE
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- ==============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_monitored_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER monitored_apps_updated_at
  BEFORE UPDATE ON monitored_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_monitored_apps_updated_at();
