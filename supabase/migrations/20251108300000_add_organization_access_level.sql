-- Migration: Add Organization Access Level
-- Description: Adds access_level column to organizations table for scalable route access control
-- Date: 2025-11-08
-- Phase: 2 of 2-phase access control improvement

-- ============================================================================
-- ADD ACCESS LEVEL COLUMN
-- ============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'full'
  CHECK (access_level IN ('full', 'reporting_only', 'custom'));

-- ============================================================================
-- SET ACCESS LEVEL FOR EXISTING ORGANIZATIONS
-- ============================================================================

-- Yodel Mobile: Restrict to reporting/analytics pages only
UPDATE organizations
SET access_level = 'reporting_only'
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

-- All other existing orgs: Full access (maintains current behavior)
UPDATE organizations
SET access_level = 'full'
WHERE access_level IS NULL OR access_level = 'full';

-- ============================================================================
-- ADD COLUMN COMMENT
-- ============================================================================

COMMENT ON COLUMN organizations.access_level IS
  'Controls route access level for organization users:
  - "full": Access to all routes (default for most orgs)
  - "reporting_only": Limited to dashboard and analytics pages only (7 routes)
  - "custom": Reserved for future use with organization_allowed_routes table';

-- ============================================================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_access_level
  ON organizations(access_level)
  WHERE access_level != 'full';

COMMENT ON INDEX idx_organizations_access_level IS
  'Optimizes queries filtering organizations by non-default access levels';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  yodel_access_level TEXT;
  total_orgs INTEGER;
  restricted_orgs INTEGER;
BEGIN
  -- Check Yodel Mobile access level
  SELECT access_level INTO yodel_access_level
  FROM organizations
  WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  -- Count total organizations
  SELECT COUNT(*) INTO total_orgs
  FROM organizations;

  -- Count restricted organizations
  SELECT COUNT(*) INTO restricted_orgs
  FROM organizations
  WHERE access_level = 'reporting_only';

  -- Report results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organization Access Level - Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Column added: organizations.access_level';
  RAISE NOTICE 'Default value: "full"';
  RAISE NOTICE 'Allowed values: "full", "reporting_only", "custom"';
  RAISE NOTICE '';

  IF yodel_access_level = 'reporting_only' THEN
    RAISE NOTICE '✅ SUCCESS: Yodel Mobile set to "reporting_only"';
  ELSE
    RAISE WARNING '❌ FAILED: Yodel Mobile access_level is "%"', yodel_access_level;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Total organizations: %', total_orgs;
  RAISE NOTICE 'Restricted organizations: %', restricted_orgs;
  RAISE NOTICE 'Full access organizations: %', total_orgs - restricted_orgs;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- LIST ORGANIZATIONS BY ACCESS LEVEL
-- ============================================================================

SELECT
  id,
  name,
  slug,
  access_level,
  subscription_tier
FROM organizations
ORDER BY
  CASE access_level
    WHEN 'reporting_only' THEN 1
    WHEN 'custom' THEN 2
    WHEN 'full' THEN 3
  END,
  name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
