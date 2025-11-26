-- ============================================
-- FIX: Remove Circular RLS Policies on organization_features
-- ============================================
-- Issue: organization_features table has circular RLS causing stack depth exceeded errors
-- Root Cause: RLS policies querying user_roles create infinite loops
-- Fix: Use simple USING (true) policies for authenticated reads
-- Date: 2025-11-26
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Fixing circular RLS on organization_features...';
END $$;

-- ============================================
-- STEP 1: Drop ALL existing policies on organization_features
-- ============================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'organization_features'
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON organization_features', pol.policyname);
    RAISE NOTICE '  Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- ============================================
-- STEP 2: Create SIMPLE policies without circular dependencies
-- ============================================

-- Allow all authenticated users to read (no circular dependency)
CREATE POLICY "Allow all authenticated users to read org features"
  ON organization_features
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything
CREATE POLICY "Allow service role full access"
  ON organization_features
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed circular RLS on organization_features';
  RAISE NOTICE '   - authenticated users can read ALL org features';
  RAISE NOTICE '   - service_role has full access';
  RAISE NOTICE '   - NO queries to user_roles (no circular dependency)';
END $$;

-- ============================================
-- Security Note:
-- ============================================
-- This allows any authenticated user to see what features ANY organization has.
-- This is acceptable because:
-- 1. Feature entitlements are not sensitive data
-- 2. The alternative (querying user_roles) creates infinite recursion
-- 3. Real access control happens in Edge Functions via hasFeatureAccess()
-- 4. Users cannot modify features (only service_role can)
