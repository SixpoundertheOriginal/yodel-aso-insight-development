-- Check and enable RLS on agency_clients table
-- RLS policies won't work if RLS is not enabled

DO $$
DECLARE
  rls_enabled boolean;
BEGIN
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'agency_clients'
    AND relnamespace = 'public'::regnamespace;

  RAISE NOTICE '🔍 Checking RLS status for agency_clients table...';
  RAISE NOTICE '   RLS Enabled: %', rls_enabled;

  IF NOT rls_enabled THEN
    RAISE NOTICE '❌ RLS is NOT enabled! Enabling now...';
    ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS enabled on agency_clients';
  ELSE
    RAISE NOTICE '✅ RLS is already enabled';
  END IF;
END $$;

-- Verify RLS is now enabled
DO $$
DECLARE
  rls_enabled boolean;
  policy_count integer;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'agency_clients'
    AND relnamespace = 'public'::regnamespace;

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'agency_clients'
    AND schemaname = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '📊 Final Status:';
  RAISE NOTICE '   Table: agency_clients';
  RAISE NOTICE '   RLS Enabled: %', rls_enabled;
  RAISE NOTICE '   Policies: %', policy_count;
  RAISE NOTICE '';

  IF rls_enabled AND policy_count >= 4 THEN
    RAISE NOTICE '✅ RLS is properly configured!';
  ELSE
    IF NOT rls_enabled THEN
      RAISE WARNING '❌ RLS is still not enabled';
    END IF;
    IF policy_count < 4 THEN
      RAISE WARNING '⚠️  Expected 4 policies, found %', policy_count;
    END IF;
  END IF;
END $$;
