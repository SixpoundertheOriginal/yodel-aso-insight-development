-- Migration: Create app-centric competitor relationships
-- Date: 2025-11-07
-- Purpose: Link target apps to their specific competitors for comparison analysis
-- Breaking Changes: NONE - This is purely additive

-- ==============================================================================
-- Table: app_competitors
-- Purpose: Link target apps to their specific competitors (many-to-many)
-- ==============================================================================

CREATE TABLE public.app_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Relationship (many-to-many)
  target_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  competitor_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,

  -- Metadata
  comparison_context TEXT,                    -- Why is this a competitor? (optional notes)
  priority INTEGER DEFAULT 1,                 -- 1=primary, 2=secondary, 3=tertiary, etc.
  is_active BOOLEAN DEFAULT TRUE,             -- Can deactivate without deleting

  -- Last analysis cache
  last_compared_at TIMESTAMPTZ,               -- When was last comparison run?
  comparison_summary JSONB,                   -- Cache last comparison results (optional)

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(organization_id, target_app_id, competitor_app_id),
  CHECK (target_app_id != competitor_app_id)  -- Prevent self-reference
);

-- ==============================================================================
-- Indexes for Performance
-- ==============================================================================

-- Most common query: Get competitors for a target app
CREATE INDEX idx_app_competitors_target
  ON app_competitors(target_app_id)
  WHERE is_active = TRUE;

-- Organization-scoped queries
CREATE INDEX idx_app_competitors_org
  ON app_competitors(organization_id);

-- Composite index for filtered queries
CREATE INDEX idx_app_competitors_target_active
  ON app_competitors(target_app_id, is_active, priority)
  WHERE is_active = TRUE;

-- Reverse lookup: Which apps consider this as a competitor?
CREATE INDEX idx_app_competitors_competitor
  ON app_competitors(competitor_app_id)
  WHERE is_active = TRUE;

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE app_competitors ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their organization's competitor relationships
CREATE POLICY "Users see their org app competitors"
ON app_competitors
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

-- Policy: Org admins and ASO managers can add competitors
CREATE POLICY "Users can add competitors"
ON app_competitors
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = app_competitors.organization_id
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- Policy: Users can update their org's competitor relationships
CREATE POLICY "Users can update competitors"
ON app_competitors
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

-- Policy: Users can remove their org's competitor relationships
CREATE POLICY "Users can remove competitors"
ON app_competitors
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
-- Comments for Documentation
-- ==============================================================================

COMMENT ON TABLE app_competitors IS
  'Links target apps to their specific competitors for comparison analysis. Many-to-many relationship allowing one app to have multiple competitors and one app to be a competitor to multiple targets.';

COMMENT ON COLUMN app_competitors.target_app_id IS
  'The app being analyzed (the "your app" in comparisons)';

COMMENT ON COLUMN app_competitors.competitor_app_id IS
  'The competitor app to compare against';

COMMENT ON COLUMN app_competitors.priority IS
  '1=primary competitor (most important), 2=secondary, 3=tertiary, etc. Used for sorting in UI';

COMMENT ON COLUMN app_competitors.comparison_context IS
  'Optional user notes: why is this a competitor? (e.g., "direct competitor in fitness category")';

COMMENT ON COLUMN app_competitors.is_active IS
  'Allows temporarily disabling a competitor without deleting the relationship';

COMMENT ON COLUMN app_competitors.comparison_summary IS
  'Cached results from last comparison (gaps, opportunities, strengths, threats). JSON format matching CompetitiveIntelligence type.';

COMMENT ON COLUMN app_competitors.last_compared_at IS
  'Timestamp of when comparison was last run. Used to show data freshness in UI.';

-- ==============================================================================
-- Helper Functions (Optional but useful)
-- ==============================================================================

-- Function to get all competitors for a target app (with full app details)
CREATE OR REPLACE FUNCTION get_target_app_competitors(
  p_target_app_id UUID,
  p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  competitor_relationship_id UUID,
  competitor_app_id UUID,
  competitor_app_name TEXT,
  competitor_app_icon TEXT,
  competitor_rating DECIMAL,
  competitor_review_count INTEGER,
  priority INTEGER,
  last_compared_at TIMESTAMPTZ,
  comparison_context TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.id AS competitor_relationship_id,
    ma.id AS competitor_app_id,
    ma.app_name AS competitor_app_name,
    ma.app_icon_url AS competitor_app_icon,
    ma.snapshot_rating AS competitor_rating,
    ma.snapshot_review_count AS competitor_review_count,
    ac.priority,
    ac.last_compared_at,
    ac.comparison_context
  FROM app_competitors ac
  INNER JOIN monitored_apps ma ON ma.id = ac.competitor_app_id
  WHERE ac.target_app_id = p_target_app_id
    AND (ac.is_active = TRUE OR p_include_inactive = TRUE)
  ORDER BY ac.priority ASC, ma.app_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if two apps are already linked
CREATE OR REPLACE FUNCTION are_apps_linked_as_competitors(
  p_org_id UUID,
  p_target_app_id UUID,
  p_competitor_app_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM app_competitors
    WHERE organization_id = p_org_id
      AND target_app_id = p_target_app_id
      AND competitor_app_id = p_competitor_app_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- Success Message
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: app_competitors table created successfully';
  RAISE NOTICE '📊 Table: app_competitors';
  RAISE NOTICE '🔗 Relationships: Many-to-many (target apps ↔ competitor apps)';
  RAISE NOTICE '🔒 RLS: Enabled with organization-scoped policies';
  RAISE NOTICE '⚡ Indexes: Optimized for target_app_id queries';
  RAISE NOTICE '🛠️ Functions: get_target_app_competitors(), are_apps_linked_as_competitors()';
  RAISE NOTICE '✨ Zero breaking changes - existing system unaffected';
END $$;
