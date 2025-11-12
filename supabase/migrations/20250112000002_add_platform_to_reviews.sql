-- ============================================================================
-- Migration: Add Platform Support to monitored_app_reviews
-- Date: 2025-01-12
-- Purpose: Store iOS and Android reviews in same table with platform differentiation
-- ============================================================================

-- Step 1: Add platform column
ALTER TABLE monitored_app_reviews
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'ios'
    CHECK (platform IN ('ios', 'android'));

COMMENT ON COLUMN monitored_app_reviews.platform IS
  'Review platform: ios (Apple App Store) or android (Google Play Store)';

-- Step 2: Add Google Play specific fields (nullable for iOS reviews)
ALTER TABLE monitored_app_reviews
  ADD COLUMN developer_reply TEXT,              -- Google Play: Developer response to review
  ADD COLUMN developer_reply_date TIMESTAMPTZ,  -- Google Play: When developer replied
  ADD COLUMN thumbs_up_count INTEGER DEFAULT 0, -- Google Play: Helpfulness count
  ADD COLUMN app_version_name TEXT,             -- Human-readable version (e.g., "1.2.3")
  ADD COLUMN reviewer_language TEXT;            -- Review language code (e.g., "en", "es")

COMMENT ON COLUMN monitored_app_reviews.developer_reply IS
  'Google Play only: Developer response text. NULL for iOS reviews.';

COMMENT ON COLUMN monitored_app_reviews.developer_reply_date IS
  'Google Play only: Timestamp when developer replied. NULL for iOS reviews or unreplied reviews.';

COMMENT ON COLUMN monitored_app_reviews.thumbs_up_count IS
  'Google Play only: Number of users who found this review helpful. Always 0 for iOS.';

COMMENT ON COLUMN monitored_app_reviews.app_version_name IS
  'Human-readable app version (e.g., "2.5.1"). Supplements version field.';

-- Step 3: Update indexes for platform-aware queries
CREATE INDEX idx_cached_reviews_platform
  ON monitored_app_reviews(monitored_app_id, platform);

CREATE INDEX idx_cached_reviews_developer_reply
  ON monitored_app_reviews(monitored_app_id, developer_reply_date)
  WHERE developer_reply IS NOT NULL;

CREATE INDEX idx_cached_reviews_high_thumbs_up
  ON monitored_app_reviews(monitored_app_id, thumbs_up_count DESC)
  WHERE platform = 'android' AND thumbs_up_count > 10;

-- Step 4: Update unique constraint to include platform
ALTER TABLE monitored_app_reviews
  DROP CONSTRAINT IF EXISTS monitored_app_reviews_monitored_app_id_review_id_key;

ALTER TABLE monitored_app_reviews
  ADD CONSTRAINT unique_review_per_platform
  UNIQUE(monitored_app_id, review_id, platform);

-- Step 5: Backfill existing reviews with platform='ios'
UPDATE monitored_app_reviews
  SET platform = 'ios'
  WHERE platform IS NULL;

-- ============================================================================
-- Validation Queries
-- ============================================================================
-- SELECT platform, COUNT(*) as review_count FROM monitored_app_reviews GROUP BY platform;
-- SELECT COUNT(*) as replies_count FROM monitored_app_reviews WHERE developer_reply IS NOT NULL;
