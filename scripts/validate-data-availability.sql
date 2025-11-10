-- ==============================================================================
-- DATA AVAILABILITY VALIDATION SCRIPT
-- ==============================================================================
-- Purpose: Validate data availability for analytical modules
-- Usage: Run via Supabase SQL Editor or psql
-- Author: Data Availability Audit 2025
-- ==============================================================================

\echo '🔍 DATA AVAILABILITY AUDIT - VALIDATION REPORT'
\echo '=============================================='
\echo ''

-- ==============================================================================
-- 1. REVIEW DATA AVAILABILITY
-- ==============================================================================

\echo '📊 1. REVIEW DATA AVAILABILITY'
\echo '------------------------------'

-- Count total cached reviews
SELECT
  '✓ Total Cached Reviews' AS metric,
  COUNT(*) AS value,
  'monitored_app_reviews' AS source
FROM monitored_app_reviews;

-- Reviews by recency
SELECT
  '✓ Reviews by Recency' AS metric,
  CASE
    WHEN fetched_at >= NOW() - INTERVAL '7 days' THEN 'Last 7 days'
    WHEN fetched_at >= NOW() - INTERVAL '30 days' THEN 'Last 30 days'
    WHEN fetched_at >= NOW() - INTERVAL '90 days' THEN 'Last 90 days'
    ELSE '90+ days old'
  END AS time_window,
  COUNT(*) AS review_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM monitored_app_reviews
GROUP BY time_window
ORDER BY
  CASE time_window
    WHEN 'Last 7 days' THEN 1
    WHEN 'Last 30 days' THEN 2
    WHEN 'Last 90 days' THEN 3
    ELSE 4
  END;

-- Reviews with AI analysis
SELECT
  '✓ AI Analysis Coverage' AS metric,
  COUNT(CASE WHEN enhanced_sentiment IS NOT NULL THEN 1 END) AS with_ai_analysis,
  COUNT(CASE WHEN enhanced_sentiment IS NULL THEN 1 END) AS without_ai_analysis,
  ROUND(
    COUNT(CASE WHEN enhanced_sentiment IS NOT NULL THEN 1 END) * 100.0 / COUNT(*),
    2
  ) AS ai_coverage_pct
FROM monitored_app_reviews;

-- Theme extraction coverage
SELECT
  '✓ Theme Extraction Coverage' AS metric,
  COUNT(CASE WHEN extracted_themes IS NOT NULL AND array_length(extracted_themes, 1) > 0 THEN 1 END) AS with_themes,
  COUNT(CASE WHEN extracted_themes IS NULL OR array_length(extracted_themes, 1) = 0 THEN 1 END) AS without_themes,
  ROUND(
    COUNT(CASE WHEN extracted_themes IS NOT NULL AND array_length(extracted_themes, 1) > 0 THEN 1 END) * 100.0 / COUNT(*),
    2
  ) AS theme_coverage_pct
FROM monitored_app_reviews;

-- Reviews by monitored app
SELECT
  '✓ Reviews per Monitored App' AS metric,
  ma.app_name,
  COUNT(mar.id) AS review_count,
  MAX(mar.fetched_at) AS last_fetched,
  EXTRACT(DAYS FROM (NOW() - MAX(mar.fetched_at))) AS days_since_last_fetch
FROM monitored_apps ma
LEFT JOIN monitored_app_reviews mar ON ma.id = mar.monitored_app_id
GROUP BY ma.id, ma.app_name
ORDER BY review_count DESC;

\echo ''

-- ==============================================================================
-- 2. COMPETITOR DATA AVAILABILITY
-- ==============================================================================

\echo '🏆 2. COMPETITOR DATA AVAILABILITY'
\echo '-----------------------------------'

-- Total competitors tracked
SELECT
  '✓ Total Competitors Tracked' AS metric,
  COUNT(*) AS value,
  COUNT(DISTINCT target_app_id) AS apps_with_competitors
FROM app_competitors
WHERE is_active = TRUE;

-- Competitors by monitored app
SELECT
  '✓ Competitors per App' AS metric,
  ma.app_name,
  COUNT(ac.id) AS competitor_count,
  MAX(ac.last_compared_at) AS last_compared,
  CASE
    WHEN MAX(ac.last_compared_at) >= NOW() - INTERVAL '7 days' THEN '✅ Fresh'
    WHEN MAX(ac.last_compared_at) >= NOW() - INTERVAL '30 days' THEN '⚠️ Stale'
    ELSE '❌ Outdated'
  END AS data_freshness
FROM monitored_apps ma
LEFT JOIN app_competitors ac ON ma.id = ac.target_app_id
WHERE ac.is_active = TRUE OR ac.is_active IS NULL
GROUP BY ma.id, ma.app_name
ORDER BY competitor_count DESC;

-- Competitor analysis coverage
SELECT
  '✓ Competitor Analysis Coverage' AS metric,
  COUNT(CASE WHEN comparison_summary IS NOT NULL THEN 1 END) AS with_analysis,
  COUNT(CASE WHEN comparison_summary IS NULL THEN 1 END) AS without_analysis,
  ROUND(
    COUNT(CASE WHEN comparison_summary IS NOT NULL THEN 1 END) * 100.0 / COUNT(*),
    2
  ) AS analysis_coverage_pct
FROM app_competitors
WHERE is_active = TRUE;

\echo ''

-- ==============================================================================
-- 3. INTELLIGENCE SNAPSHOTS AVAILABILITY
-- ==============================================================================

\echo '📸 3. INTELLIGENCE SNAPSHOTS AVAILABILITY'
\echo '-----------------------------------------'

-- Total snapshots
SELECT
  '✓ Total Intelligence Snapshots' AS metric,
  COUNT(*) AS value,
  MIN(snapshot_date) AS earliest_snapshot,
  MAX(snapshot_date) AS latest_snapshot
FROM review_intelligence_snapshots;

-- Snapshots by monitored app
SELECT
  '✓ Snapshots per App' AS metric,
  ma.app_name,
  COUNT(ris.id) AS snapshot_count,
  MAX(ris.snapshot_date) AS latest_snapshot,
  EXTRACT(DAYS FROM (CURRENT_DATE - MAX(ris.snapshot_date))) AS days_since_last_snapshot
FROM monitored_apps ma
LEFT JOIN review_intelligence_snapshots ris ON ma.id = ris.monitored_app_id
GROUP BY ma.id, ma.app_name
ORDER BY snapshot_count DESC;

-- Snapshot freshness
SELECT
  '✓ Snapshot Freshness' AS metric,
  CASE
    WHEN snapshot_date = CURRENT_DATE THEN 'Today'
    WHEN snapshot_date >= CURRENT_DATE - INTERVAL '7 days' THEN 'Last 7 days'
    WHEN snapshot_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'Last 30 days'
    ELSE '30+ days old'
  END AS time_window,
  COUNT(*) AS snapshot_count
FROM review_intelligence_snapshots
GROUP BY time_window
ORDER BY
  CASE time_window
    WHEN 'Today' THEN 1
    WHEN 'Last 7 days' THEN 2
    WHEN 'Last 30 days' THEN 3
    ELSE 4
  END;

\echo ''

-- ==============================================================================
-- 4. API USAGE & PERFORMANCE
-- ==============================================================================

\echo '⚡ 4. API USAGE & PERFORMANCE'
\echo '----------------------------'

-- Fetch log summary (last 30 days)
SELECT
  '✓ Review Fetches (Last 30 Days)' AS metric,
  COUNT(*) AS total_fetches,
  COUNT(CASE WHEN cache_hit = TRUE THEN 1 END) AS cache_hits,
  COUNT(CASE WHEN cache_hit = FALSE THEN 1 END) AS cache_misses,
  ROUND(
    COUNT(CASE WHEN cache_hit = TRUE THEN 1 END) * 100.0 / COUNT(*),
    2
  ) AS cache_hit_rate_pct,
  ROUND(AVG(fetch_duration_ms), 0) AS avg_fetch_duration_ms,
  SUM(reviews_fetched) AS total_reviews_fetched
FROM review_fetch_log
WHERE fetched_at >= NOW() - INTERVAL '30 days';

-- Fetch errors (last 7 days)
SELECT
  '✓ Recent Fetch Errors' AS metric,
  COUNT(*) AS error_count,
  itunes_api_status,
  error_message
FROM review_fetch_log
WHERE fetched_at >= NOW() - INTERVAL '7 days'
  AND error_message IS NOT NULL
GROUP BY itunes_api_status, error_message
ORDER BY error_count DESC
LIMIT 5;

-- Fetches by organization (last 30 days)
SELECT
  '✓ API Usage by Organization' AS metric,
  o.name AS organization_name,
  COUNT(rfl.id) AS fetch_count,
  SUM(rfl.reviews_fetched) AS reviews_fetched,
  ROUND(AVG(rfl.fetch_duration_ms), 0) AS avg_duration_ms
FROM review_fetch_log rfl
JOIN organizations o ON rfl.organization_id = o.id
WHERE rfl.fetched_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.name
ORDER BY fetch_count DESC;

\echo ''

-- ==============================================================================
-- 5. DATA QUALITY CHECKS
-- ==============================================================================

\echo '✅ 5. DATA QUALITY CHECKS'
\echo '------------------------'

-- Reviews missing AI analysis (should be processed)
SELECT
  '⚠️ Reviews Missing AI Analysis' AS issue,
  COUNT(*) AS count,
  'Should be < 5% of total' AS expected
FROM monitored_app_reviews
WHERE enhanced_sentiment IS NULL
  AND fetched_at >= NOW() - INTERVAL '30 days';

-- Reviews missing themes
SELECT
  '⚠️ Reviews Missing Theme Extraction' AS issue,
  COUNT(*) AS count,
  'Should be < 10% of total' AS expected
FROM monitored_app_reviews
WHERE (extracted_themes IS NULL OR array_length(extracted_themes, 1) = 0)
  AND fetched_at >= NOW() - INTERVAL '30 days';

-- Apps without recent reviews
SELECT
  '⚠️ Apps Without Recent Reviews' AS issue,
  COUNT(*) AS count,
  'Should be 0' AS expected
FROM monitored_apps ma
WHERE NOT EXISTS (
  SELECT 1
  FROM monitored_app_reviews mar
  WHERE mar.monitored_app_id = ma.id
    AND mar.fetched_at >= NOW() - INTERVAL '7 days'
);

-- Competitors without analysis
SELECT
  '⚠️ Active Competitors Without Analysis' AS issue,
  COUNT(*) AS count,
  'Should be < 20%' AS expected
FROM app_competitors
WHERE is_active = TRUE
  AND comparison_summary IS NULL;

-- Stale intelligence snapshots
SELECT
  '⚠️ Apps with Stale Intelligence Snapshots' AS issue,
  COUNT(DISTINCT ma.id) AS count,
  'Should be 0' AS expected
FROM monitored_apps ma
LEFT JOIN review_intelligence_snapshots ris
  ON ma.id = ris.monitored_app_id
  AND ris.snapshot_date >= CURRENT_DATE - INTERVAL '2 days'
WHERE ris.id IS NULL;

\echo ''

-- ==============================================================================
-- 6. RECOMMENDATIONS
-- ==============================================================================

\echo '💡 6. RECOMMENDATIONS'
\echo '--------------------'

-- Recommendation 1: Apps needing fresh data
SELECT
  '💡 Recommendation: Fetch Fresh Reviews' AS action,
  ma.app_name,
  COALESCE(MAX(mar.fetched_at), 'Never') AS last_fetched,
  'Priority: HIGH' AS priority
FROM monitored_apps ma
LEFT JOIN monitored_app_reviews mar ON ma.id = mar.monitored_app_id
GROUP BY ma.id, ma.app_name
HAVING MAX(mar.fetched_at) < NOW() - INTERVAL '7 days' OR MAX(mar.fetched_at) IS NULL
ORDER BY MAX(mar.fetched_at) ASC NULLS FIRST
LIMIT 5;

-- Recommendation 2: Reviews needing AI processing
SELECT
  '💡 Recommendation: Process Reviews with AI' AS action,
  COUNT(*) AS pending_reviews,
  'Run batch AI processing job' AS suggested_action
FROM monitored_app_reviews
WHERE enhanced_sentiment IS NULL
  AND fetched_at >= NOW() - INTERVAL '30 days'
HAVING COUNT(*) > 0;

-- Recommendation 3: Apps needing competitor analysis
SELECT
  '💡 Recommendation: Update Competitor Analysis' AS action,
  ma.app_name,
  COUNT(ac.id) AS competitor_count,
  MAX(ac.last_compared_at) AS last_compared,
  'Priority: MEDIUM' AS priority
FROM monitored_apps ma
JOIN app_competitors ac ON ma.id = ac.target_app_id
WHERE ac.is_active = TRUE
  AND (ac.last_compared_at < NOW() - INTERVAL '14 days' OR ac.last_compared_at IS NULL)
GROUP BY ma.id, ma.app_name
ORDER BY MAX(ac.last_compared_at) ASC NULLS FIRST
LIMIT 5;

\echo ''
\echo '=============================================='
\echo '✅ DATA AVAILABILITY VALIDATION COMPLETE'
\echo '=============================================='
\echo ''
\echo 'Next Steps:'
\echo '1. Review warnings and fix data quality issues'
\echo '2. Run recommendations to refresh stale data'
\echo '3. Proceed with Theme Impact Scoring implementation'
\echo ''
