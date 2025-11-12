-- ============================================================================
-- Migration: Add Platform Support to review_intelligence_snapshots
-- Date: 2025-01-12
-- Purpose: Store separate intelligence snapshots for iOS and Android
-- ============================================================================

-- Step 1: Add platform column
ALTER TABLE review_intelligence_snapshots
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'ios'
    CHECK (platform IN ('ios', 'android'));

COMMENT ON COLUMN review_intelligence_snapshots.platform IS
  'Intelligence snapshot platform: ios or android. Separate snapshots per platform.';

-- Step 2: Drop old unique constraint
ALTER TABLE review_intelligence_snapshots
  DROP CONSTRAINT IF EXISTS review_intelligence_snapshots_monitored_app_id_snapshot_date_key;

-- Step 3: Add new unique constraint including platform
ALTER TABLE review_intelligence_snapshots
  ADD CONSTRAINT unique_snapshot_per_platform_date
  UNIQUE(monitored_app_id, platform, snapshot_date);

COMMENT ON CONSTRAINT unique_snapshot_per_platform_date ON review_intelligence_snapshots IS
  'One snapshot per app per platform per day. iOS and Android have separate daily snapshots.';

-- Step 4: Add platform-aware indexes
CREATE INDEX idx_snapshots_platform
  ON review_intelligence_snapshots(monitored_app_id, platform, snapshot_date DESC);

CREATE INDEX idx_snapshots_org_platform
  ON review_intelligence_snapshots(organization_id, platform, snapshot_date DESC);

-- Step 5: Backfill existing snapshots with platform='ios'
UPDATE review_intelligence_snapshots
  SET platform = 'ios'
  WHERE platform IS NULL;

-- ============================================================================
-- Intelligence JSONB Schema Documentation
-- ============================================================================
-- For Android snapshots, intelligence JSONB includes additional fields:
--
-- intelligence: {
--   themes: [...],           // Standard themes
--   featureMentions: [...],  // Standard feature mentions
--   issuePatterns: [...],    // Standard issue patterns
--
--   googlePlayMetrics: {     // ⭐ NEW: Android-only metrics
--     developerResponseRate: 0.45,        // % of reviews with developer reply
--     avgResponseTimeHours: 12.5,         // Average hours to respond
--     reviewsWithReplies: 120,            // Count of replied reviews
--     helpfulReviewsCount: 450,           // Reviews with thumbs_up > 5
--     topRepliedThemes: ["crashes", ...]  // Themes most replied to
--   }
-- }
