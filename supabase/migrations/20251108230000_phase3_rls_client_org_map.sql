-- ============================================
-- PHASE 3: Security Hardening - Add RLS to client_org_map
-- Date: November 8, 2025
-- Risk Level: LOW (Table not currently used in access paths)
-- ============================================

-- ============================================
-- BACKGROUND
-- ============================================
-- The client_org_map table has NO RLS policies.
-- This is a security gap but currently NOT in the critical path for:
-- - Dashboard V2
-- - Reviews Page
-- - cli@yodelmobile.com access
--
-- However, it exposes organization mapping information that should be protected.
--
-- SAFE because:
-- - Table is not queried by current working features
-- - Adding RLS won't break existing functionality
-- - Permissive policies allow legitimate access
--
-- IMPACT: ZERO for current Yodel Mobile users
-- ============================================

-- ============================================
-- STEP 1: Verify table exists
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'client_org_map'
  ) THEN
    RAISE NOTICE '✅ client_org_map table exists';
  ELSE
    RAISE NOTICE '⚠️  client_org_map table does not exist (migration will be skipped)';
  END IF;
END $$;

-- ============================================
-- STEP 2: Enable RLS on client_org_map
-- ============================================

DO $$
BEGIN
  -- Only proceed if table exists
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'client_org_map'
  ) THEN
    -- Check if RLS already enabled
    IF NOT EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = 'client_org_map'
        AND rowsecurity = true
    ) THEN
      ALTER TABLE public.client_org_map ENABLE ROW LEVEL SECURITY;
      RAISE NOTICE '✅ RLS enabled on client_org_map';
    ELSE
      RAISE NOTICE '⚠️  RLS already enabled on client_org_map';
    END IF;
  END IF;
END $$;

-- ============================================
-- STEP 3: Create RLS policies
-- ============================================

-- Policy 1: Users can see mappings for their own organization
DO $$
DECLARE
  v_has_client_id boolean;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'client_org_map'
  ) THEN
    -- Check if client_id column exists
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'client_org_map'
        AND column_name = 'client_id'
    ) INTO v_has_client_id;

    IF NOT v_has_client_id THEN
      RAISE NOTICE '⚠️  client_org_map table exists but has different schema - skipping RLS policies';
      RETURN;
    END IF;

    DROP POLICY IF EXISTS "Users can view own org mappings" ON public.client_org_map;

    CREATE POLICY "Users can view own org mappings"
    ON public.client_org_map
    FOR SELECT
    TO authenticated
    USING (
      -- User's organization matches either side of the mapping
      organization_id IN (
        SELECT organization_id
        FROM user_roles
        WHERE user_id = auth.uid()
      )
      OR client_id IN (
        SELECT organization_id
        FROM user_roles
        WHERE user_id = auth.uid()
      )
    );

    RAISE NOTICE '✅ Created policy: Users can view own org mappings';
  END IF;
END $$;

-- Policy 2: Service role (Edge Functions) has full access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'client_org_map'
  ) THEN
    DROP POLICY IF EXISTS "Service role full access" ON public.client_org_map;

    CREATE POLICY "Service role full access"
    ON public.client_org_map
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    RAISE NOTICE '✅ Created policy: Service role full access';
  END IF;
END $$;

-- ============================================
-- STEP 4: Grant permissions
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'client_org_map'
  ) THEN
    GRANT SELECT ON public.client_org_map TO authenticated;
    RAISE NOTICE '✅ Granted SELECT to authenticated users';
  END IF;
END $$;

-- ============================================
-- STEP 5: Add comments
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'client_org_map'
  ) THEN
    -- Only add comment if the policy exists
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'client_org_map'
        AND policyname = 'Users can view own org mappings'
    ) THEN
      COMMENT ON POLICY "Users can view own org mappings" ON public.client_org_map IS
      'Users can see mappings where their organization appears on either side.';
    END IF;

    -- Service role policy should always exist
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'client_org_map'
        AND policyname = 'Service role full access'
    ) THEN
      COMMENT ON POLICY "Service role full access" ON public.client_org_map IS
      'Edge Functions with service_role key have full access for admin operations.';
    END IF;

    RAISE NOTICE '✅ Policy comments added (if policies exist)';
  END IF;
END $$;

-- ============================================
-- STEP 6: Verification
-- ============================================

DO $$
DECLARE
  v_table_exists boolean;
  v_rls_enabled boolean;
  v_policy_count int;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'client_org_map'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE NOTICE '⚠️  client_org_map table does not exist - migration skipped';
    RETURN;
  END IF;

  -- Check RLS enabled
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'client_org_map';

  IF v_rls_enabled THEN
    RAISE NOTICE '✅ RLS is enabled on client_org_map';
  ELSE
    RAISE WARNING '⚠️  RLS is NOT enabled on client_org_map';
  END IF;

  -- Check policies exist
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'client_org_map';

  IF v_policy_count >= 2 THEN
    RAISE NOTICE '✅ Found % RLS policies on client_org_map', v_policy_count;
  ELSE
    RAISE WARNING '⚠️  Expected 2+ policies, found only %', v_policy_count;
  END IF;

  -- Skip listing policies to avoid variable type conflict
END $$;

-- ============================================
-- ROLLBACK PLAN (if needed)
-- ============================================
-- To rollback this migration:
-- 1. DROP POLICY "Users can view own org mappings" ON public.client_org_map;
-- 2. DROP POLICY "Service role full access" ON public.client_org_map;
-- 3. ALTER TABLE public.client_org_map DISABLE ROW LEVEL SECURITY;
--
-- Or create a new migration with the above commands.
-- ============================================

-- ============================================
-- EXPECTED BEHAVIOR AFTER THIS MIGRATION
-- ============================================
--
-- IF client_org_map table exists:
-- ✅ RLS enabled
-- ✅ Users can only see mappings for their organization
-- ✅ Service role (Edge Functions) has full access
-- ✅ Closes security gap
--
-- IF client_org_map table does NOT exist:
-- ✅ Migration completes successfully (no-op)
-- ✅ No errors
-- ✅ System continues working
--
-- Impact on current features:
-- ✅ Dashboard V2: No impact (doesn't use this table)
-- ✅ Reviews Page: No impact (doesn't use this table)
-- ✅ cli@yodelmobile.com: No impact (doesn't query this table)
-- ============================================
