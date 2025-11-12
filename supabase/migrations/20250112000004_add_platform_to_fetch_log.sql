-- ============================================================================
-- Migration: Add Platform Support to review_fetch_log
-- Date: 2025-01-12
-- Purpose: Track fetches separately for iOS and Android
-- ============================================================================

-- Step 1: Add platform column
ALTER TABLE review_fetch_log
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'ios'
    CHECK (platform IN ('ios', 'android'));

COMMENT ON COLUMN review_fetch_log.platform IS
  'Which platform was fetched: ios (iTunes RSS) or android (Google Play)';

-- Step 2: Add platform-aware index
CREATE INDEX idx_fetch_log_platform
  ON review_fetch_log(monitored_app_id, platform, fetched_at DESC);

-- Step 3: Backfill existing logs with platform='ios'
UPDATE review_fetch_log
  SET platform = 'ios'
  WHERE platform IS NULL;

-- ============================================================================
-- Validation Queries
-- ============================================================================
-- SELECT platform, COUNT(*) as fetch_count FROM review_fetch_log GROUP BY platform;
-- SELECT platform, AVG(reviews_fetched) as avg_reviews FROM review_fetch_log GROUP BY platform;
