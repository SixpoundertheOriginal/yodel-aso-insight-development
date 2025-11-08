-- ============================================
-- PHASE 2 TEST VALIDATION SCRIPT
-- Tests that cli@yodelmobile.com still has access after Phase 2 migrations
-- ============================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🧪 PHASE 2 VALIDATION TESTS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Test 1: Verify cli@yodelmobile.com user role
\echo '📋 TEST 1: User Role Check'
\echo '────────────────────────────────────────'
SELECT
  'TEST 1' as test,
  CASE
    WHEN user_id = '8920ac57-63da-4f8e-9970-719be1e2569c'
      AND organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
      AND role::text = 'org_admin'
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  user_id,
  organization_id,
  role::text as role
FROM public.user_roles
WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

\echo ''

-- Test 2: Verify RLS is enabled on user_roles
\echo '📋 TEST 2: RLS Enabled on user_roles'
\echo '────────────────────────────────────────'
SELECT
  'TEST 2' as test,
  CASE
    WHEN rowsecurity = true THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_roles';

\echo ''

-- Test 3: Verify RLS policies exist
\echo '📋 TEST 3: RLS Policies on user_roles'
\echo '────────────────────────────────────────'
SELECT
  'TEST 3' as test,
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_roles';

\echo ''
\echo 'Policy Details:'
SELECT
  policyname,
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_roles'
ORDER BY policyname;

\echo ''

-- Test 4: Verify lowercase constraint exists
\echo '📋 TEST 4: Lowercase Role Constraint'
\echo '────────────────────────────────────────'
SELECT
  'TEST 4' as test,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  COUNT(*) as constraint_exists
FROM pg_constraint
WHERE conname = 'role_lowercase_only'
  AND conrelid = 'public.user_roles'::regclass;

\echo ''

-- Test 5: Verify no uppercase roles remain
\echo '📋 TEST 5: All Roles are Lowercase'
\echo '────────────────────────────────────────'
SELECT
  'TEST 5' as test,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  COUNT(*) as uppercase_count
FROM user_roles
WHERE role IN ('ORG_ADMIN'::app_role, 'SUPER_ADMIN'::app_role);

\echo ''

-- Test 6: Verify user_permissions_unified view works
\echo '📋 TEST 6: user_permissions_unified View'
\echo '────────────────────────────────────────'
SELECT
  'TEST 6' as test,
  CASE
    WHEN user_id = '8920ac57-63da-4f8e-9970-719be1e2569c'
      AND role = 'org_admin'
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  user_id,
  organization_id,
  role,
  organization_name,
  user_email
FROM public.user_permissions_unified
WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

\echo ''

-- Test 7: Verify app access still works
\echo '📋 TEST 7: App Access (org_app_access)'
\echo '────────────────────────────────────────'
SELECT
  'TEST 7' as test,
  CASE
    WHEN COUNT(*) >= 8 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  COUNT(*) as app_count,
  array_agg(app_id ORDER BY app_id) as app_ids
FROM public.org_app_access
WHERE organization_id IN (
  -- Agency org
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
  -- Client orgs (from agency_clients)
  SELECT client_org_id
  FROM agency_clients
  WHERE agency_org_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
    AND is_active = true
)
AND detached_at IS NULL;

\echo ''

-- Test 8: Verify agency relationships
\echo '📋 TEST 8: Agency Client Relationships'
\echo '────────────────────────────────────────'
SELECT
  'TEST 8' as test,
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  COUNT(*) as client_count,
  array_agg(client_org_id ORDER BY client_org_id) as client_org_ids
FROM agency_clients
WHERE agency_org_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
  AND is_active = true;

\echo ''

-- Test 9: Verify is_super_admin_db function exists
\echo '📋 TEST 9: is_super_admin_db Function'
\echo '────────────────────────────────────────'
SELECT
  'TEST 9' as test,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  COUNT(*) as function_exists
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'is_super_admin_db';

\echo ''

-- Test 10: Verify old is_super_admin function is gone
\echo '📋 TEST 10: Old is_super_admin Removed'
\echo '────────────────────────────────────────'
SELECT
  'TEST 10' as test,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  COUNT(*) as old_function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'is_super_admin';

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 TEST SUMMARY'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo 'Run this script with: psql <connection-string> -f test-phase2-fixes.sql'
\echo ''
\echo 'Expected: All 10 tests should show ✅ PASS'
\echo 'If any show ❌ FAIL, check the details above'
\echo ''
