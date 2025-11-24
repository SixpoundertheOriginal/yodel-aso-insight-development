-- Multi-Market Support Migration
-- Created: 2025-01-24
-- Purpose: Enable monitoring apps in multiple markets simultaneously (AppTweak-style)
--
-- Changes:
-- 1. Create monitored_app_markets junction table
-- 2. Migrate existing apps to new schema
-- 3. Update aso_audit_snapshots to link to specific markets
-- 4. Add indexes for performance

-- ============================================================================
-- STEP 1: CREATE monitored_app_markets TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.monitored_app_markets (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  monitored_app_id UUID NOT NULL REFERENCES public.monitored_apps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Market identification
  market_code TEXT NOT NULL CHECK (
    market_code IN ('gb', 'us', 'ca', 'au', 'de', 'fr', 'es', 'it', 'nl', 'se', 'no', 'dk', 'fi', 'pl', 'br')
  ),

  -- Market-specific metadata (can differ by market)
  title TEXT,                          -- App title in this market
  subtitle TEXT,                       -- Subtitle in this market
  description TEXT,                    -- Description in this market
  keywords TEXT,                       -- Keywords in this market (if available from API)

  -- Market-specific pricing
  price_amount DECIMAL(10, 2),         -- e.g., 4.99
  price_currency TEXT,                 -- e.g., 'GBP', 'USD', 'EUR'

  -- Market status
  is_active BOOLEAN NOT NULL DEFAULT true,        -- Currently monitoring this market?
  is_available BOOLEAN NOT NULL DEFAULT true,     -- App available in this market?
  last_fetched_at TIMESTAMPTZ,                    -- Last time we fetched metadata

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(monitored_app_id, market_code)  -- One entry per app per market
);

-- Add table comment
COMMENT ON TABLE public.monitored_app_markets IS 'Junction table for multi-market app monitoring. Each row represents one app in one market.';

-- Add column comments
COMMENT ON COLUMN public.monitored_app_markets.market_code IS 'ISO 3166-1 alpha-2 country code (e.g., gb, us, de)';
COMMENT ON COLUMN public.monitored_app_markets.title IS 'App title in this specific market (can differ from other markets)';
COMMENT ON COLUMN public.monitored_app_markets.is_active IS 'Whether we are actively monitoring this market';
COMMENT ON COLUMN public.monitored_app_markets.is_available IS 'Whether the app is available in this market';

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for app lookups (most common query)
CREATE INDEX idx_monitored_app_markets_app_id
  ON public.monitored_app_markets(monitored_app_id);

-- Index for market filtering
CREATE INDEX idx_monitored_app_markets_market
  ON public.monitored_app_markets(market_code);

-- Index for active market queries (used in app list views)
CREATE INDEX idx_monitored_app_markets_active
  ON public.monitored_app_markets(monitored_app_id, is_active);

-- Index for organization queries (multi-tenant isolation)
CREATE INDEX idx_monitored_app_markets_org
  ON public.monitored_app_markets(organization_id);

-- ============================================================================
-- STEP 3: MIGRATE EXISTING APPS TO NEW SCHEMA
-- ============================================================================

-- Migrate all existing monitored_apps with primary_country to monitored_app_markets
-- This creates one market entry per existing app
INSERT INTO public.monitored_app_markets (
  monitored_app_id,
  organization_id,
  market_code,
  title,
  is_active,
  created_at,
  updated_at
)
SELECT
  id,
  organization_id,
  COALESCE(primary_country, 'gb') as market_code,  -- Default to 'gb' if NULL
  app_name as title,
  true as is_active,
  created_at,
  updated_at
FROM public.monitored_apps
WHERE NOT EXISTS (
  -- Don't migrate if already exists (in case of re-run)
  SELECT 1 FROM public.monitored_app_markets mam
  WHERE mam.monitored_app_id = monitored_apps.id
);

-- Log migration count
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM public.monitored_app_markets;
  RAISE NOTICE 'Migrated % existing apps to monitored_app_markets', migrated_count;
END $$;

-- ============================================================================
-- STEP 4: UPDATE aso_audit_snapshots TABLE
-- ============================================================================

-- Add foreign key to monitored_app_markets
ALTER TABLE public.aso_audit_snapshots
  ADD COLUMN IF NOT EXISTS monitored_app_market_id UUID
  REFERENCES public.monitored_app_markets(id) ON DELETE CASCADE;

-- Create index for market-specific audit queries
CREATE INDEX IF NOT EXISTS idx_audit_snapshots_market
  ON public.aso_audit_snapshots(monitored_app_market_id);

-- Migrate existing audit snapshots to link to correct market
-- Match based on monitored_app_id + locale
UPDATE public.aso_audit_snapshots
SET monitored_app_market_id = (
  SELECT mam.id
  FROM public.monitored_app_markets mam
  WHERE mam.monitored_app_id = aso_audit_snapshots.monitored_app_id
    AND mam.market_code = COALESCE(aso_audit_snapshots.locale, 'us')
  LIMIT 1
)
WHERE monitored_app_market_id IS NULL;

-- Log audit snapshot migration
DO $$
DECLARE
  linked_count INTEGER;
  unlinked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO linked_count
  FROM public.aso_audit_snapshots
  WHERE monitored_app_market_id IS NOT NULL;

  SELECT COUNT(*) INTO unlinked_count
  FROM public.aso_audit_snapshots
  WHERE monitored_app_market_id IS NULL;

  RAISE NOTICE 'Linked % audit snapshots to markets', linked_count;
  IF unlinked_count > 0 THEN
    RAISE WARNING '% audit snapshots could not be linked (orphaned)', unlinked_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: ADD RLS (ROW LEVEL SECURITY) POLICIES
-- ============================================================================

-- Enable RLS on monitored_app_markets
ALTER TABLE public.monitored_app_markets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view markets for their organization
CREATE POLICY "Users can view markets for their organization"
  ON public.monitored_app_markets
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert markets for their organization
CREATE POLICY "Users can insert markets for their organization"
  ON public.monitored_app_markets
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can update markets for their organization
CREATE POLICY "Users can update markets for their organization"
  ON public.monitored_app_markets
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete markets for their organization
CREATE POLICY "Users can delete markets for their organization"
  ON public.monitored_app_markets
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get active markets for an app
CREATE OR REPLACE FUNCTION public.get_active_markets(app_id UUID)
RETURNS TABLE (
  market_code TEXT,
  title TEXT,
  is_available BOOLEAN,
  last_fetched_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mam.market_code,
    mam.title,
    mam.is_available,
    mam.last_fetched_at
  FROM public.monitored_app_markets mam
  WHERE mam.monitored_app_id = app_id
    AND mam.is_active = true
  ORDER BY mam.market_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count markets per app
CREATE OR REPLACE FUNCTION public.count_active_markets(app_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.monitored_app_markets
  WHERE monitored_app_id = app_id
    AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_monitored_app_markets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_monitored_app_markets_updated_at
  BEFORE UPDATE ON public.monitored_app_markets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_monitored_app_markets_updated_at();

-- ============================================================================
-- STEP 8: VERIFICATION QUERIES
-- ============================================================================

-- Verify all apps have at least one market
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.monitored_apps ma
  WHERE NOT EXISTS (
    SELECT 1 FROM public.monitored_app_markets mam
    WHERE mam.monitored_app_id = ma.id
  );

  IF orphaned_count > 0 THEN
    RAISE WARNING '% apps have no markets assigned!', orphaned_count;
  ELSE
    RAISE NOTICE 'All apps have at least one market assigned ✓';
  END IF;
END $$;

-- Verify audit snapshots are linked
DO $$
DECLARE
  orphaned_snapshots INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_snapshots
  FROM public.aso_audit_snapshots
  WHERE monitored_app_market_id IS NULL
    AND monitored_app_id IS NOT NULL;  -- Exclude test/orphaned snapshots

  IF orphaned_snapshots > 0 THEN
    RAISE WARNING '% audit snapshots are not linked to markets', orphaned_snapshots;
  ELSE
    RAISE NOTICE 'All audit snapshots are linked to markets ✓';
  END IF;
END $$;

-- ============================================================================
-- STEP 9: DROP OLD COLUMN (OPTIONAL - COMMENTED OUT FOR SAFETY)
-- ============================================================================

-- Uncomment these lines after verifying migration is successful
-- and all code has been updated to use monitored_app_markets

-- ALTER TABLE public.monitored_apps DROP COLUMN IF EXISTS primary_country;
-- COMMENT ON TABLE public.monitored_apps IS 'Base app entities. Use monitored_app_markets for market-specific data.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log completion
DO $$
DECLARE
  total_apps INTEGER;
  total_markets INTEGER;
  total_snapshots INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_apps FROM public.monitored_apps;
  SELECT COUNT(*) INTO total_markets FROM public.monitored_app_markets;
  SELECT COUNT(*) INTO total_snapshots FROM public.aso_audit_snapshots WHERE monitored_app_market_id IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Multi-Market Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total apps: %', total_apps;
  RAISE NOTICE 'Total markets: %', total_markets;
  RAISE NOTICE 'Linked snapshots: %', total_snapshots;
  RAISE NOTICE '========================================';
END $$;
