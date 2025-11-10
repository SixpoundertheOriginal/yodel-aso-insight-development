-- ============================================================================
-- ROLLBACK MIGRATION FOR SEMANTIC INSIGHTS SYSTEM
-- ============================================================================
-- Purpose: Remove all database changes related to semantic insights redesign
-- When to use: If critical issues occur and we need to revert to old system
-- Risk: LOW - Only drops new tables, does not touch existing tables
-- ============================================================================

BEGIN;

-- Log rollback start
DO $$
BEGIN
  RAISE NOTICE '🔄 Starting rollback of semantic insights system...';
  RAISE NOTICE 'Time: %', NOW();
END $$;

-- ============================================================================
-- STEP 1: Drop new tables in reverse dependency order
-- ============================================================================

-- Drop aso_keyword_mapping (references semantic_insights)
DROP TABLE IF EXISTS public.aso_keyword_mapping CASCADE;
RAISE NOTICE '✓ Dropped aso_keyword_mapping table';

-- Drop insight_examples (references semantic_insights)
DROP TABLE IF EXISTS public.insight_examples CASCADE;
RAISE NOTICE '✓ Dropped insight_examples table';

-- Drop insight_trends (standalone, but related)
DROP TABLE IF EXISTS public.insight_trends CASCADE;
RAISE NOTICE '✓ Dropped insight_trends table';

-- Drop insight_classifications (standalone)
DROP TABLE IF EXISTS public.insight_classifications CASCADE;
RAISE NOTICE '✓ Dropped insight_classifications table';

-- Drop semantic_insights (core table)
DROP TABLE IF EXISTS public.semantic_insights CASCADE;
RAISE NOTICE '✓ Dropped semantic_insights table';

-- ============================================================================
-- STEP 2: Verify existing tables are intact (CRITICAL SAFETY CHECK)
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  -- Check competitor_analysis_cache exists
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'competitor_analysis_cache';

  IF table_count = 0 THEN
    RAISE EXCEPTION '❌ CRITICAL: competitor_analysis_cache table missing! Rollback failed.';
  ELSE
    RAISE NOTICE '✓ Verified: competitor_analysis_cache table intact';
  END IF;

  -- Check monitored_app_reviews exists
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'monitored_app_reviews';

  IF table_count = 0 THEN
    RAISE EXCEPTION '❌ CRITICAL: monitored_app_reviews table missing! Rollback failed.';
  ELSE
    RAISE NOTICE '✓ Verified: monitored_app_reviews table intact';
  END IF;

  -- Check review_intelligence_snapshots exists
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'review_intelligence_snapshots';

  IF table_count = 0 THEN
    RAISE EXCEPTION '❌ CRITICAL: review_intelligence_snapshots table missing! Rollback failed.';
  ELSE
    RAISE NOTICE '✓ Verified: review_intelligence_snapshots table intact';
  END IF;

  -- Check app_competitors exists
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'app_competitors';

  IF table_count = 0 THEN
    RAISE EXCEPTION '❌ CRITICAL: app_competitors table missing! Rollback failed.';
  ELSE
    RAISE NOTICE '✓ Verified: app_competitors table intact';
  END IF;

  -- Check monitored_apps exists
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'monitored_apps';

  IF table_count = 0 THEN
    RAISE EXCEPTION '❌ CRITICAL: monitored_apps table missing! Rollback failed.';
  ELSE
    RAISE NOTICE '✓ Verified: monitored_apps table intact';
  END IF;

  RAISE NOTICE '✅ All existing tables verified intact';
END $$;

-- ============================================================================
-- STEP 3: Verify data integrity
-- ============================================================================

DO $$
DECLARE
  cache_count INTEGER;
  reviews_count INTEGER;
BEGIN
  -- Count cached analyses
  SELECT COUNT(*) INTO cache_count FROM competitor_analysis_cache;
  RAISE NOTICE 'Cached analyses: %', cache_count;

  -- Count cached reviews
  SELECT COUNT(*) INTO reviews_count FROM monitored_app_reviews;
  RAISE NOTICE 'Cached reviews: %', reviews_count;

  RAISE NOTICE '✅ Data integrity verified';
END $$;

-- ============================================================================
-- STEP 4: Final verification
-- ============================================================================

DO $$
BEGIN
  -- Verify no semantic insight tables remain
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'semantic_insights',
        'insight_examples',
        'insight_trends',
        'aso_keyword_mapping',
        'insight_classifications'
      )
  ) THEN
    RAISE EXCEPTION '❌ ERROR: Some semantic insight tables still exist. Rollback incomplete.';
  END IF;

  RAISE NOTICE '✅ Rollback completed successfully';
  RAISE NOTICE 'Time: %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE '📋 ROLLBACK SUMMARY:';
  RAISE NOTICE '  - Dropped 5 semantic insight tables';
  RAISE NOTICE '  - Verified 5 existing tables intact';
  RAISE NOTICE '  - Data integrity maintained';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '  1. Set FEATURE_FLAGS.USE_SEMANTIC_INSIGHTS = false';
  RAISE NOTICE '  2. Redeploy frontend with old UI';
  RAISE NOTICE '  3. Monitor system for 24 hours';
  RAISE NOTICE '  4. Document rollback reason and learnings';
END $$;

COMMIT;

-- ============================================================================
-- END OF ROLLBACK MIGRATION
-- ============================================================================

-- To execute this rollback:
-- psql "$DATABASE_URL" -f supabase/migrations/ROLLBACK_semantic_insights.sql
