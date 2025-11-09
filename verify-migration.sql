-- ============================================================================
-- Migration Verification Script
-- Run this in Supabase SQL Editor after applying migration
-- ============================================================================

-- Test 1: Check table exists
SELECT
  '✅ Test 1: Table Exists' as test_name,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END as result,
  COUNT(*) as actual_count,
  1 as expected_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'apps_metadata';

-- Test 2: Check column count
SELECT
  '✅ Test 2: Column Count' as test_name,
  CASE WHEN COUNT(*) >= 35 THEN 'PASS' ELSE 'FAIL' END as result,
  COUNT(*) as actual_count,
  '35+' as expected_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'apps_metadata';

-- Test 3: Check critical columns exist
SELECT
  '✅ Test 3: Critical Columns' as test_name,
  CASE
    WHEN COUNT(DISTINCT column_name) = 10 THEN 'PASS'
    ELSE 'FAIL - Missing: ' || STRING_AGG(missing.col, ', ')
  END as result,
  COUNT(DISTINCT column_name) as found_columns,
  10 as expected_columns
FROM (
  SELECT unnest(ARRAY[
    'id', 'app_store_id', 'app_name', 'developer_name',
    'category', 'average_rating', 'description', 'screenshot_urls',
    'created_at', 'updated_at'
  ]) as col
) required
LEFT JOIN information_schema.columns c
  ON c.column_name = required.col
  AND c.table_name = 'apps_metadata'
LEFT JOIN LATERAL (
  SELECT required.col
  WHERE c.column_name IS NULL
) missing ON true
GROUP BY missing.col;

-- Test 4: Check indexes exist
SELECT
  '✅ Test 4: Indexes' as test_name,
  CASE WHEN COUNT(*) >= 7 THEN 'PASS' ELSE 'FAIL' END as result,
  COUNT(*) as actual_count,
  '7+' as expected_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'apps_metadata';

-- Test 5: Check RLS enabled
SELECT
  '✅ Test 5: RLS Enabled' as test_name,
  CASE WHEN relrowsecurity = true THEN 'PASS' ELSE 'FAIL' END as result,
  relrowsecurity as actual_value,
  true as expected_value
FROM pg_class
WHERE relname = 'apps_metadata';

-- Test 6: Check RLS policies exist
SELECT
  '✅ Test 6: RLS Policies' as test_name,
  CASE WHEN COUNT(*) >= 2 THEN 'PASS' ELSE 'FAIL' END as result,
  COUNT(*) as actual_count,
  '2+' as expected_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'apps_metadata';

-- Test 7: Check unique constraint on app_store_id
SELECT
  '✅ Test 7: Unique Constraint' as test_name,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END as result,
  COUNT(*) as actual_count,
  1 as expected_count
FROM pg_constraint
WHERE conrelid = 'apps_metadata'::regclass
  AND contype = 'u'
  AND conname LIKE '%app_store_id%';

-- Test 8: Check triggers exist
SELECT
  '✅ Test 8: Triggers' as test_name,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END as result,
  COUNT(*) as actual_count,
  1 as expected_count
FROM pg_trigger
WHERE tgrelid = 'apps_metadata'::regclass
  AND tgname = 'apps_metadata_updated_at';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT
  '🎯 OVERALL SUMMARY' as summary,
  '' as spacer;

SELECT
  COUNT(*) FILTER (WHERE result = 'PASS') as tests_passed,
  COUNT(*) FILTER (WHERE result LIKE 'FAIL%') as tests_failed,
  COUNT(*) as total_tests,
  CASE
    WHEN COUNT(*) FILTER (WHERE result LIKE 'FAIL%') = 0
    THEN '✅ ALL TESTS PASSED - Ready to continue!'
    ELSE '⚠️ SOME TESTS FAILED - Review output above'
  END as overall_result
FROM (
  SELECT 'PASS' as result FROM information_schema.tables WHERE table_name = 'apps_metadata' LIMIT 1
  UNION ALL SELECT CASE WHEN COUNT(*) >= 35 THEN 'PASS' ELSE 'FAIL' END FROM information_schema.columns WHERE table_name = 'apps_metadata'
  UNION ALL SELECT CASE WHEN COUNT(*) >= 7 THEN 'PASS' ELSE 'FAIL' END FROM pg_indexes WHERE tablename = 'apps_metadata'
  UNION ALL SELECT CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END FROM pg_class WHERE relname = 'apps_metadata'
  UNION ALL SELECT CASE WHEN COUNT(*) >= 2 THEN 'PASS' ELSE 'FAIL' END FROM pg_policies WHERE tablename = 'apps_metadata'
  UNION ALL SELECT CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END FROM pg_constraint WHERE conrelid = 'apps_metadata'::regclass AND contype = 'u'
  UNION ALL SELECT CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END FROM pg_trigger WHERE tgrelid = 'apps_metadata'::regclass
) tests;

-- ============================================================================
-- If all tests pass, check table details
-- ============================================================================

SELECT '📋 Table Details' as section, '' as spacer;

SELECT
  pg_size_pretty(pg_total_relation_size('apps_metadata')) as table_size,
  COUNT(*) as current_row_count,
  'Run a search to populate data' as note
FROM apps_metadata;

-- ============================================================================
-- List all columns for reference
-- ============================================================================

SELECT '📋 Column List' as section, '' as spacer;

SELECT
  column_name,
  data_type,
  CASE WHEN is_nullable = 'NO' THEN '✓' ELSE '' END as required,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'apps_metadata'
ORDER BY ordinal_position;
