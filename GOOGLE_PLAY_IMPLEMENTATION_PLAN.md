# Google Play Store Reviews Implementation Plan

> **Status**: Ready for Implementation
> **Date**: 2025-01-12
> **Target**: Add Google Play Store review scraping, analysis, and display alongside existing Apple App Store functionality

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Decisions](#architecture-decisions)
3. [Phase 1: Database Schema Updates](#phase-1-database-schema-updates)
4. [Phase 2: Google Play Scraper Edge Function](#phase-2-google-play-scraper-edge-function)
5. [Phase 3: Frontend Services & Utilities](#phase-3-frontend-services--utilities)
6. [Phase 4: UI Components & Pages](#phase-4-ui-components--pages)
7. [Phase 5: AI Intelligence Engine Updates](#phase-5-ai-intelligence-engine-updates)
8. [Phase 6: Testing Strategy](#phase-6-testing-strategy)
9. [Phase 7: Deployment & Rollout](#phase-7-deployment--rollout)
10. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

### Objectives
- Add Google Play Store review scraping alongside existing Apple App Store functionality
- Support monitoring **hundreds of apps** with **1,000 reviews max per app**
- Unified view with platform switcher (iOS/Android toggle in UI)
- Highlight Google Play unique features: **developer replies**, **response metrics**, **thumbs up counts**

### Technical Approach
- **Data Acquisition**: Self-hosted using `google-play-scraper` npm package (Option A)
- **Architecture**: New Supabase edge function `google-play-scraper` (mirrors `app-store-scraper`)
- **Database**: Extend existing tables with `platform` column ('ios' | 'android')
- **UI Strategy**: Unified view with iOS/Android platform switcher (Option A)
- **Scalability**: 1,000 review limit per app, optimized indexes, aggressive caching

### Effort Estimate
- **Database Migrations**: 4-6 hours
- **Edge Function Development**: 12-16 hours
- **Frontend Updates**: 16-20 hours
- **Testing & QA**: 8-12 hours
- **Total**: **50-70 hours**

### Cost Analysis
- **Self-hosted approach**: $0-5/month (Supabase edge functions included in plan)
- **Storage**: ~$0.02/GB/month (negligible for text data)
- **No third-party API costs**

---

## Architecture Decisions

### Decision 1: Self-Hosted Scraping (google-play-scraper npm)

**Rationale**:
- 700k+ weekly downloads, actively maintained
- Zero cost (vs $50-500/month for third-party APIs)
- Consistent with existing Apple architecture
- Full control over scraping logic
- Easy to update if Google Play structure changes

**Implementation**: Deploy as Supabase edge function `google-play-scraper`

### Decision 2: Unified Database Schema

**Rationale**:
- Add `platform` column to existing tables instead of creating duplicate tables
- Easier cross-platform comparisons
- Single codebase for reviews intelligence
- Less maintenance overhead

**Trade-off**: Some Google Play-specific fields will be nullable for iOS reviews

### Decision 3: Unified UI with Platform Toggle

**Rationale**:
- Better UX - users can quickly switch between iOS and Android
- Less code duplication
- Easier to maintain
- Supports side-by-side comparison in future (Phase 2)

**Implementation**: Platform toggle component at top of reviews page

---

## Phase 1: Database Schema Updates

### Migration 1: Add Platform Support to monitored_apps

**File**: `supabase/migrations/20250112000001_add_platform_to_monitored_apps.sql`

```sql
-- ============================================================================
-- Migration: Add Platform Support (iOS + Android) to monitored_apps
-- Date: 2025-01-12
-- Purpose: Enable monitoring both Apple App Store and Google Play Store apps
-- ============================================================================

-- Step 1: Add platform column (default 'ios' for backward compatibility)
ALTER TABLE monitored_apps
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'ios'
  CHECK (platform IN ('ios', 'android'));

-- Step 2: Rename app_store_id to app_id (more generic)
ALTER TABLE monitored_apps
  RENAME COLUMN app_store_id TO app_id;

COMMENT ON COLUMN monitored_apps.app_id IS
  'Platform-agnostic app identifier: iTunes App ID for iOS, Package ID for Android (e.g., com.whatsapp)';

-- Step 3: Add Google Play specific fields
ALTER TABLE monitored_apps
  ADD COLUMN play_store_package_id TEXT,  -- e.g., "com.whatsapp"
  ADD COLUMN play_store_url TEXT;         -- Full Google Play URL

COMMENT ON COLUMN monitored_apps.play_store_package_id IS
  'Android package ID (e.g., com.instagram.android). Only populated for Android apps.';

COMMENT ON COLUMN monitored_apps.play_store_url IS
  'Full Google Play Store URL. Only populated for Android apps.';

-- Step 4: Drop old unique constraint
ALTER TABLE monitored_apps
  DROP CONSTRAINT IF EXISTS monitored_apps_organization_id_app_store_id_primary_country_key;

-- Step 5: Add new unique constraint including platform
ALTER TABLE monitored_apps
  ADD CONSTRAINT unique_monitored_app_per_platform
  UNIQUE(organization_id, app_id, platform, primary_country);

COMMENT ON CONSTRAINT unique_monitored_app_per_platform ON monitored_apps IS
  'Ensures same app cannot be monitored twice for same platform + country (but allows iOS + Android of same app)';

-- Step 6: Add indexes for platform-specific queries
CREATE INDEX idx_monitored_apps_platform
  ON monitored_apps(organization_id, platform);

CREATE INDEX idx_monitored_apps_platform_country
  ON monitored_apps(organization_id, platform, primary_country);

-- Step 7: Backfill existing apps with platform='ios'
-- (Already handled by DEFAULT 'ios' above, but explicit for clarity)
UPDATE monitored_apps
  SET platform = 'ios'
  WHERE platform IS NULL;

-- ============================================================================
-- Validation Queries (Run after migration to verify)
-- ============================================================================
-- SELECT platform, COUNT(*) FROM monitored_apps GROUP BY platform;
-- Should show all existing apps as 'ios'
```

---

### Migration 2: Add Platform to monitored_app_reviews

**File**: `supabase/migrations/20250112000002_add_platform_to_reviews.sql`

```sql
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
```

---

### Migration 3: Add Platform to review_intelligence_snapshots

**File**: `supabase/migrations/20250112000003_add_platform_to_snapshots.sql`

```sql
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
```

---

### Migration 4: Add Review Fetch Log Platform Support

**File**: `supabase/migrations/20250112000004_add_platform_to_fetch_log.sql`

```sql
-- ============================================================================
-- Migration: Add Platform Support to review_fetch_log
-- Date: 2025-01-12
-- Purpose: Track fetches separately for iOS and Android
-- ============================================================================

-- Add platform column
ALTER TABLE review_fetch_log
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'ios'
    CHECK (platform IN ('ios', 'android'));

-- Add platform-aware index
CREATE INDEX idx_fetch_log_platform
  ON review_fetch_log(monitored_app_id, platform, fetched_at DESC);

-- Update comments
COMMENT ON COLUMN review_fetch_log.platform IS
  'Which platform was fetched: ios (iTunes RSS) or android (Google Play)';

-- Backfill existing logs
UPDATE review_fetch_log
  SET platform = 'ios'
  WHERE platform IS NULL;
```

---

## Phase 2: Google Play Scraper Edge Function

### Directory Structure

Create new edge function directory:

```
supabase/functions/google-play-scraper/
├── index.ts                          # Main handler
├── services/
│   ├── reviews.service.ts            # Google Play reviews fetching
│   └── apps.service.ts               # Google Play app search
├── utils/
│   ├── error-handler.ts              # Error handling utilities
│   └── response-builder.ts           # Response formatting
└── types/
    └── index.ts                      # TypeScript interfaces
```

---

### File 1: types/index.ts

**File**: `supabase/functions/google-play-scraper/types/index.ts`

```typescript
export interface GooglePlayReview {
  review_id: string;
  app_id: string;            // Package ID (e.g., "com.whatsapp")
  platform: 'android';
  country: string;
  title: string;
  text: string;
  rating: number;            // 1-5
  version: string;           // App version
  author: string;
  review_date: string;       // ISO timestamp

  // Google Play specific
  developer_reply?: string;
  developer_reply_date?: string;
  thumbs_up_count: number;
  reviewer_language?: string;
}

export interface ReviewsServiceOptions {
  packageId: string;
  country: string;
  lang: string;
  page: number;
  pageSize: number;
  sort: 'newest' | 'rating' | 'helpfulness';
  paginationToken?: string;
}

export interface ReviewsResponse {
  success: boolean;
  data?: GooglePlayReview[];
  error?: string;
  totalReviews?: number;
  currentPage: number;
  hasMore: boolean;
  nextPaginationToken?: string;
}

export interface GooglePlayApp {
  app_name: string;
  app_id: string;            // Package ID
  platform: 'android';
  bundle_id: string;         // Same as app_id for Android
  developer_name: string;
  app_icon_url: string;
  app_rating: number;
  category: string;
  installs: string;          // e.g., "10,000,000+"
  price: string;             // "Free" or "$4.99"
}
```

---

### File 2: services/reviews.service.ts

**File**: `supabase/functions/google-play-scraper/services/reviews.service.ts`

```typescript
import gplay from 'npm:google-play-scraper@9.1.1';
import type { GooglePlayReview, ReviewsServiceOptions, ReviewsResponse } from '../types/index.ts';

export class GooglePlayReviewsService {
  /**
   * Fetch reviews from Google Play Store
   */
  async fetchReviews(options: ReviewsServiceOptions): Promise<ReviewsResponse> {
    const { packageId, country, lang, pageSize, sort, paginationToken } = options;

    try {
      console.log(`[GOOGLE-PLAY] Fetching reviews for ${packageId}, country=${country}, pageSize=${pageSize}`);

      // Map sort option to google-play-scraper format
      const sortOption = this.mapSortOption(sort);

      // Fetch reviews with pagination
      const result = await gplay.reviews({
        appId: packageId,
        lang: lang,
        country: country,
        sort: sortOption,
        num: Math.min(pageSize, 200), // Google Play max is 200 per page
        paginate: true,
        nextPaginationToken: paginationToken || undefined
      });

      console.log(`[GOOGLE-PLAY] Fetched ${result.data?.length || 0} reviews`);

      // Transform to our format
      const reviews = this.transformReviews(result.data || [], packageId, country);

      return {
        success: true,
        data: reviews,
        currentPage: 1, // Google Play uses token-based pagination, not page numbers
        hasMore: !!result.nextPaginationToken,
        nextPaginationToken: result.nextPaginationToken,
        totalReviews: reviews.length
      };

    } catch (error: any) {
      console.error(`[GOOGLE-PLAY] Failed to fetch reviews:`, error);

      return {
        success: false,
        error: error.message || 'Failed to fetch Google Play reviews',
        currentPage: 1,
        hasMore: false
      };
    }
  }

  /**
   * Fetch reviews with 1000 limit (max allowed)
   */
  async fetchReviewsWithLimit(
    packageId: string,
    country: string,
    lang: string,
    maxReviews: number = 1000
  ): Promise<ReviewsResponse> {
    const allReviews: GooglePlayReview[] = [];
    let paginationToken: string | undefined;
    let hasMore = true;

    try {
      while (allReviews.length < maxReviews && hasMore) {
        const remaining = maxReviews - allReviews.length;
        const batchSize = Math.min(remaining, 200); // Max 200 per request

        const result = await this.fetchReviews({
          packageId,
          country,
          lang,
          page: 1,
          pageSize: batchSize,
          sort: 'newest',
          paginationToken
        });

        if (!result.success || !result.data || result.data.length === 0) {
          break;
        }

        allReviews.push(...result.data);
        paginationToken = result.nextPaginationToken;
        hasMore = result.hasMore;

        // Add small delay to avoid rate limiting
        if (hasMore && allReviews.length < maxReviews) {
          await this.delay(500);
        }
      }

      console.log(`[GOOGLE-PLAY] Fetched total of ${allReviews.length} reviews (limit: ${maxReviews})`);

      return {
        success: true,
        data: allReviews,
        currentPage: 1,
        hasMore: hasMore && allReviews.length === maxReviews,
        totalReviews: allReviews.length
      };

    } catch (error: any) {
      console.error(`[GOOGLE-PLAY] Batch fetch failed:`, error);

      return {
        success: false,
        error: error.message || 'Failed to fetch reviews',
        currentPage: 1,
        hasMore: false
      };
    }
  }

  /**
   * Transform google-play-scraper reviews to our format
   */
  private transformReviews(
    rawReviews: any[],
    packageId: string,
    country: string
  ): GooglePlayReview[] {
    return rawReviews.map((review: any) => ({
      review_id: review.id || `${packageId}-${review.date?.getTime()}`,
      app_id: packageId,
      platform: 'android' as const,
      country: country,
      title: review.title || '',
      text: review.text || '',
      rating: review.score || 0,
      version: review.version || '',
      author: review.userName || 'Anonymous',
      review_date: review.date?.toISOString() || new Date().toISOString(),

      // Google Play specific
      developer_reply: review.replyText || undefined,
      developer_reply_date: review.replyDate?.toISOString() || undefined,
      thumbs_up_count: review.thumbsUp || 0,
      reviewer_language: review.reviewCreatedVersion || undefined
    }));
  }

  /**
   * Map our sort option to google-play-scraper format
   */
  private mapSortOption(sort: 'newest' | 'rating' | 'helpfulness'): number {
    switch (sort) {
      case 'newest':
        return gplay.sort.NEWEST;
      case 'rating':
        return gplay.sort.RATING;
      case 'helpfulness':
        return gplay.sort.HELPFULNESS;
      default:
        return gplay.sort.NEWEST;
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

### File 3: services/apps.service.ts

**File**: `supabase/functions/google-play-scraper/services/apps.service.ts`

```typescript
import gplay from 'npm:google-play-scraper@9.1.1';
import type { GooglePlayApp } from '../types/index.ts';

export class GooglePlayAppsService {
  /**
   * Search Google Play Store for apps
   */
  async search(query: string, country: string = 'us', limit: number = 10): Promise<GooglePlayApp[]> {
    try {
      console.log(`[GOOGLE-PLAY] Searching for: "${query}", country=${country}, limit=${limit}`);

      const results = await gplay.search({
        term: query,
        country: country,
        num: Math.min(limit, 50) // Reasonable limit
      });

      console.log(`[GOOGLE-PLAY] Found ${results.length} apps`);

      return this.transformApps(results);

    } catch (error: any) {
      console.error(`[GOOGLE-PLAY] Search failed:`, error);
      throw new Error(`Google Play search failed: ${error.message}`);
    }
  }

  /**
   * Get app details by package ID
   */
  async getAppDetails(packageId: string, country: string = 'us'): Promise<GooglePlayApp> {
    try {
      console.log(`[GOOGLE-PLAY] Fetching app details: ${packageId}`);

      const app = await gplay.app({
        appId: packageId,
        country: country
      });

      return this.transformApp(app);

    } catch (error: any) {
      console.error(`[GOOGLE-PLAY] Failed to get app details:`, error);
      throw new Error(`Failed to get app details: ${error.message}`);
    }
  }

  /**
   * Transform google-play-scraper app results to our format
   */
  private transformApps(rawApps: any[]): GooglePlayApp[] {
    return rawApps.map(app => this.transformApp(app));
  }

  /**
   * Transform single app to our format
   */
  private transformApp(app: any): GooglePlayApp {
    return {
      app_name: app.title || '',
      app_id: app.appId || '',
      platform: 'android',
      bundle_id: app.appId || '',
      developer_name: app.developer || '',
      app_icon_url: app.icon || '',
      app_rating: app.score || 0,
      category: app.genre || '',
      installs: app.installs || '0+',
      price: app.free ? 'Free' : (app.price || 'Unknown')
    };
  }
}
```

---

### File 4: index.ts (Main Handler)

**File**: `supabase/functions/google-play-scraper/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GooglePlayReviewsService } from './services/reviews.service.ts';
import { GooglePlayAppsService } from './services/apps.service.ts';

// CORS headers
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowedOrigins = (Deno.env.get('CORS_ALLOW_ORIGIN') || '*').split(',').map(o => o.trim());

  let allowOrigin = '*';
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  } else if (!allowedOrigins.includes('*')) {
    allowOrigin = allowedOrigins[0];
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`🤖 [${requestId}] Google Play Scraper Request Received`);

  try {
    // Parse request
    const requestData = req.method === 'POST'
      ? await req.json()
      : Object.fromEntries(new URL(req.url).searchParams.entries());

    const operation = requestData.op || 'reviews';

    // Initialize services
    const reviewsService = new GooglePlayReviewsService();
    const appsService = new GooglePlayAppsService();

    // Route operations
    switch (operation) {
      case 'reviews': {
        // Fetch reviews
        const packageId = requestData.packageId || requestData.appId;
        const country = requestData.country || requestData.cc || 'us';
        const lang = requestData.lang || 'en';
        const pageSize = Math.min(parseInt(requestData.pageSize) || 100, 200);
        const sort = requestData.sort || 'newest';
        const maxReviews = requestData.maxReviews ? Math.min(parseInt(requestData.maxReviews), 1000) : undefined;

        if (!packageId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required field: packageId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let result;
        if (maxReviews) {
          result = await reviewsService.fetchReviewsWithLimit(packageId, country, lang, maxReviews);
        } else {
          result = await reviewsService.fetchReviews({
            packageId,
            country,
            lang,
            page: 1,
            pageSize,
            sort,
            paginationToken: requestData.paginationToken
          });
        }

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'search': {
        // Search for apps
        const query = requestData.query || requestData.searchTerm;
        const country = requestData.country || 'us';
        const limit = Math.min(parseInt(requestData.limit) || 10, 50);

        if (!query) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required field: query' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const results = await appsService.search(query, country, limit);

        return new Response(
          JSON.stringify({ success: true, results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'app': {
        // Get app details
        const packageId = requestData.packageId || requestData.appId;
        const country = requestData.country || 'us';

        if (!packageId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required field: packageId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const app = await appsService.getAppDetails(packageId, country);

        return new Response(
          JSON.stringify({ success: true, app }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'health': {
        // Health check
        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            service: 'google-play-scraper'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default: {
        return new Response(
          JSON.stringify({ success: false, error: `Unknown operation: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### Deployment Command

```bash
# Deploy Google Play scraper edge function
supabase functions deploy google-play-scraper --no-verify-jwt

# Test the function
curl -X POST https://your-project.supabase.co/functions/v1/google-play-scraper \
  -H "Content-Type: application/json" \
  -d '{"op":"health"}'
```

---

## Phase 3: Frontend Services & Utilities

### File 1: Create Google Play Reviews Utility

**File**: `src/utils/googlePlayReviews.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';

export interface GooglePlayReview {
  review_id: string;
  app_id: string;
  platform: 'android';
  country: string;
  title: string;
  text: string;
  rating: number;
  version: string;
  author: string;
  review_date: string;

  // Google Play specific
  developer_reply?: string;
  developer_reply_date?: string;
  thumbs_up_count: number;
  reviewer_language?: string;
}

export interface GooglePlayReviewsResponse {
  success: boolean;
  data?: GooglePlayReview[];
  error?: string;
  currentPage: number;
  hasMore: boolean;
  nextPaginationToken?: string;
  totalReviews?: number;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

/**
 * Fetch Google Play reviews via edge function
 */
export async function fetchGooglePlayReviews(params: {
  packageId: string;
  country?: string;
  lang?: string;
  pageSize?: number;
  maxReviews?: number;
  paginationToken?: string;
}): Promise<GooglePlayReviewsResponse> {
  const {
    packageId,
    country = 'us',
    lang = 'en',
    pageSize = 100,
    maxReviews,
    paginationToken
  } = params;

  console.log('[GOOGLE-PLAY-REVIEWS] Fetching reviews:', { packageId, country, pageSize, maxReviews });

  try {
    const { data, error } = await supabase.functions.invoke('google-play-scraper', {
      body: {
        op: 'reviews',
        packageId,
        country,
        lang,
        pageSize,
        maxReviews,
        paginationToken
      }
    });

    if (error) {
      console.error('[GOOGLE-PLAY-REVIEWS] Edge function error:', error);
      throw new Error(error.message || 'Failed to fetch Google Play reviews');
    }

    console.log('[GOOGLE-PLAY-REVIEWS] Success:', data);
    return data as GooglePlayReviewsResponse;

  } catch (error: any) {
    console.error('[GOOGLE-PLAY-REVIEWS] Error:', error);

    return {
      success: false,
      error: error.message || 'Failed to fetch reviews',
      currentPage: 1,
      hasMore: false
    };
  }
}

/**
 * Search Google Play Store for apps
 */
export async function searchGooglePlay(query: string, country: string = 'us', limit: number = 10) {
  try {
    const { data, error } = await supabase.functions.invoke('google-play-scraper', {
      body: {
        op: 'search',
        query,
        country,
        limit
      }
    });

    if (error) throw error;
    return data;

  } catch (error: any) {
    console.error('[GOOGLE-PLAY-SEARCH] Error:', error);
    throw error;
  }
}
```

---

### File 2: Create Universal Reviews Service

**File**: `src/services/universal-reviews.service.ts`

```typescript
import { fetchAppReviews } from '@/utils/itunesReviews';
import { fetchGooglePlayReviews, type GooglePlayReview } from '@/utils/googlePlayReviews';

export type Platform = 'ios' | 'android';

export interface UniversalReview {
  review_id: string;
  app_id: string;
  platform: Platform;
  country: string;
  title: string;
  text: string;
  rating: number;
  version: string;
  author: string;
  review_date: string;

  // Google Play specific (optional)
  developer_reply?: string;
  developer_reply_date?: string;
  thumbs_up_count?: number;
  reviewer_language?: string;
}

export interface UniversalReviewsResponse {
  success: boolean;
  data?: UniversalReview[];
  error?: string;
  currentPage: number;
  hasMore: boolean;
  totalReviews?: number;
  platform: Platform;
}

/**
 * Universal reviews service - handles both iOS and Android
 */
export class UniversalReviewsService {
  /**
   * Fetch reviews for any platform
   */
  static async fetchReviews(params: {
    platform: Platform;
    appId: string;
    country: string;
    page?: number;
    pageSize?: number;
    maxReviews?: number;
  }): Promise<UniversalReviewsResponse> {
    const { platform, appId, country, page = 1, pageSize = 100, maxReviews } = params;

    if (platform === 'ios') {
      return this.fetchAppleReviews(appId, country, page, pageSize);
    } else {
      return this.fetchAndroidReviews(appId, country, pageSize, maxReviews);
    }
  }

  /**
   * Fetch Apple App Store reviews
   */
  private static async fetchAppleReviews(
    appId: string,
    country: string,
    page: number,
    pageSize: number
  ): Promise<UniversalReviewsResponse> {
    try {
      const result = await fetchAppReviews({
        appId,
        cc: country,
        page,
        pageSize
      });

      // Transform to universal format
      const reviews: UniversalReview[] = (result.data || []).map(review => ({
        ...review,
        platform: 'ios' as const,
        review_date: review.updated_at || new Date().toISOString()
      }));

      return {
        success: result.success,
        data: reviews,
        error: result.error,
        currentPage: result.currentPage || page,
        hasMore: result.hasMore || false,
        totalReviews: result.totalReviews,
        platform: 'ios'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        currentPage: page,
        hasMore: false,
        platform: 'ios'
      };
    }
  }

  /**
   * Fetch Google Play Store reviews
   */
  private static async fetchAndroidReviews(
    packageId: string,
    country: string,
    pageSize: number,
    maxReviews?: number
  ): Promise<UniversalReviewsResponse> {
    try {
      const result = await fetchGooglePlayReviews({
        packageId,
        country,
        pageSize,
        maxReviews
      });

      return {
        ...result,
        platform: 'android'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        currentPage: 1,
        hasMore: false,
        platform: 'android'
      };
    }
  }
}
```

---

## Phase 4: UI Components & Pages

### Component 1: Platform Toggle

**File**: `src/components/reviews/PlatformToggle.tsx`

```typescript
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Apple, Smartphone } from 'lucide-react';

interface PlatformToggleProps {
  selected: 'ios' | 'android';
  onChange: (platform: 'ios' | 'android') => void;
  disabled?: boolean;
}

export const PlatformToggle: React.FC<PlatformToggleProps> = ({
  selected,
  onChange,
  disabled = false
}) => {
  return (
    <ToggleGroup type="single" value={selected} onValueChange={(val) => val && onChange(val as 'ios' | 'android')}>
      <ToggleGroupItem value="ios" disabled={disabled} className="gap-2">
        <Apple className="h-4 w-4" />
        iOS
      </ToggleGroupItem>
      <ToggleGroupItem value="android" disabled={disabled} className="gap-2">
        <Smartphone className="h-4 w-4" />
        Android
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
```

---

### Component 2: Google Play Metrics Panel

**File**: `src/components/reviews/GooglePlayMetricsPanel.tsx`

```typescript
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, Clock, ThumbsUp } from 'lucide-react';

interface GooglePlayMetricsProps {
  responseRate: number;           // 0-1
  avgResponseTimeHours: number;
  reviewsWithReplies: number;
  helpfulReviewsCount: number;
}

export const GooglePlayMetricsPanel: React.FC<GooglePlayMetricsProps> = ({
  responseRate,
  avgResponseTimeHours,
  reviewsWithReplies,
  helpfulReviewsCount
}) => {
  const responseRatePercent = (responseRate * 100).toFixed(1);
  const avgResponseTimeDays = (avgResponseTimeHours / 24).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Google Play Developer Engagement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Response Rate</div>
            <div className="text-2xl font-bold">{responseRatePercent}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {reviewsWithReplies} reviews replied
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Avg Response Time</div>
            <div className="text-2xl font-bold">{avgResponseTimeDays}d</div>
            <div className="text-xs text-muted-foreground mt-1">
              {avgResponseTimeHours.toFixed(1)} hours
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Helpful Reviews</div>
            <div className="text-2xl font-bold">{helpfulReviewsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              <ThumbsUp className="h-3 w-3 inline mr-1" />
              5+ thumbs up
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Engagement Score</div>
            <div className="text-2xl font-bold">
              {this.calculateEngagementScore(responseRate, avgResponseTimeHours)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Based on reply rate & speed
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  function calculateEngagementScore(rate: number, hours: number): string {
    // High rate (>50%) + fast response (<24h) = A+
    // High rate + slow response = B
    // Low rate (<20%) = C or below
    if (rate > 0.5 && hours < 24) return 'A+';
    if (rate > 0.5 && hours < 72) return 'A';
    if (rate > 0.3) return 'B';
    if (rate > 0.1) return 'C';
    return 'D';
  }
};
```

---

### Component 3: Developer Reply Card

**File**: `src/components/reviews/DeveloperReplyCard.tsx`

```typescript
import React from 'react';
import { Card } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DeveloperReplyCardProps {
  reply: string;
  replyDate: string;
}

export const DeveloperReplyCard: React.FC<DeveloperReplyCardProps> = ({
  reply,
  replyDate
}) => {
  return (
    <Card className="mt-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Developer Response
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400 ml-auto">
            {formatDistanceToNow(new Date(replyDate), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
          {reply}
        </p>
      </div>
    </Card>
  );
};
```

---

### Update: AppReviewDetailsPage

**File**: `src/pages/growth-accelerators/AppReviewDetailsPage.tsx` (Partial Update)

```typescript
// Add imports
import { PlatformToggle } from '@/components/reviews/PlatformToggle';
import { GooglePlayMetricsPanel } from '@/components/reviews/GooglePlayMetricsPanel';
import { DeveloperReplyCard } from '@/components/reviews/DeveloperReplyCard';
import { UniversalReviewsService } from '@/services/universal-reviews.service';

// Add state
const [platform, setPlatform] = useState<'ios' | 'android'>('ios');

// Update fetch logic
const { data: reviews, isLoading } = useQuery({
  queryKey: ['reviews', monitoredApp?.id, platform, filters],
  queryFn: async () => {
    if (!monitoredApp) return [];

    const result = await UniversalReviewsService.fetchReviews({
      platform: platform,
      appId: monitoredApp.app_id,
      country: monitoredApp.primary_country,
      maxReviews: 1000
    });

    return result.data || [];
  },
  enabled: !!monitoredApp
});

// Add platform toggle in UI
<div className="flex items-center justify-between mb-6">
  <h1>{monitoredApp?.app_name} Reviews</h1>
  <PlatformToggle
    selected={platform}
    onChange={setPlatform}
  />
</div>

// Show Google Play metrics (Android only)
{platform === 'android' && intelligence?.googlePlayMetrics && (
  <GooglePlayMetricsPanel
    responseRate={intelligence.googlePlayMetrics.developerResponseRate}
    avgResponseTimeHours={intelligence.googlePlayMetrics.avgResponseTimeHours}
    reviewsWithReplies={intelligence.googlePlayMetrics.reviewsWithReplies}
    helpfulReviewsCount={intelligence.googlePlayMetrics.helpfulReviewsCount}
  />
)}

// Show developer replies in review cards (Android only)
{review.developer_reply && (
  <DeveloperReplyCard
    reply={review.developer_reply}
    replyDate={review.developer_reply_date!}
  />
)}
```

---

## Phase 5: AI Intelligence Engine Updates

### Update Review Intelligence Engine

**File**: `src/engines/review-intelligence.engine.ts` (Add to existing)

```typescript
// Add Google Play metrics analysis
export interface GooglePlayMetrics {
  developerResponseRate: number;      // 0-1
  avgResponseTimeHours: number;
  reviewsWithReplies: number;
  helpfulReviewsCount: number;
  topRepliedThemes: string[];
}

/**
 * Analyze Google Play specific metrics
 */
export function analyzeGooglePlayMetrics(reviews: EnhancedReviewItem[]): GooglePlayMetrics {
  const androidReviews = reviews.filter(r => r.platform === 'android');
  const reviewsWithReplies = androidReviews.filter(r => r.developer_reply);

  // Calculate average response time
  let totalResponseTimeHours = 0;
  let responseTimeCount = 0;

  for (const review of reviewsWithReplies) {
    if (review.developer_reply_date && review.review_date) {
      const reviewTime = new Date(review.review_date).getTime();
      const replyTime = new Date(review.developer_reply_date).getTime();
      const diffHours = (replyTime - reviewTime) / (1000 * 60 * 60);

      if (diffHours > 0 && diffHours < 30 * 24) { // Ignore anomalies (>30 days)
        totalResponseTimeHours += diffHours;
        responseTimeCount++;
      }
    }
  }

  const avgResponseTimeHours = responseTimeCount > 0
    ? totalResponseTimeHours / responseTimeCount
    : 0;

  // Find most replied themes
  const themeReplyCounts = new Map<string, number>();
  for (const review of reviewsWithReplies) {
    if (review.extractedThemes) {
      for (const theme of review.extractedThemes) {
        themeReplyCounts.set(theme, (themeReplyCounts.get(theme) || 0) + 1);
      }
    }
  }

  const topRepliedThemes = Array.from(themeReplyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme);

  return {
    developerResponseRate: androidReviews.length > 0
      ? reviewsWithReplies.length / androidReviews.length
      : 0,
    avgResponseTimeHours,
    reviewsWithReplies: reviewsWithReplies.length,
    helpfulReviewsCount: androidReviews.filter(r => (r.thumbs_up_count || 0) > 5).length,
    topRepliedThemes
  };
}

// Update extractReviewIntelligence to include Google Play metrics
export function extractReviewIntelligence(
  reviews: EnhancedReviewItem[],
  platform?: 'ios' | 'android'
): ReviewIntelligence {
  const baseIntelligence = {
    themes: extractThemes(reviews),
    featureMentions: extractFeatureMentions(reviews),
    issuePatterns: extractIssuePatterns(reviews)
  };

  // Add Google Play metrics for Android
  if (platform === 'android' || reviews.some(r => r.platform === 'android')) {
    return {
      ...baseIntelligence,
      googlePlayMetrics: analyzeGooglePlayMetrics(reviews)
    };
  }

  return baseIntelligence;
}
```

---

## Phase 6: Testing Strategy

### Unit Tests

```typescript
// tests/services/google-play-reviews.test.ts
describe('GooglePlayReviewsService', () => {
  it('should fetch reviews successfully', async () => {
    const result = await fetchGooglePlayReviews({
      packageId: 'com.whatsapp',
      country: 'us'
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBeGreaterThan(0);
  });

  it('should respect 1000 review limit', async () => {
    const result = await fetchGooglePlayReviews({
      packageId: 'com.instagram.android',
      country: 'us',
      maxReviews: 1000
    });

    expect(result.data!.length).toBeLessThanOrEqual(1000);
  });

  it('should include developer replies when available', async () => {
    const result = await fetchGooglePlayReviews({
      packageId: 'com.google.android.apps.docs',
      country: 'us'
    });

    const reviewsWithReplies = result.data!.filter(r => r.developer_reply);
    expect(reviewsWithReplies.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// tests/integration/reviews-flow.test.ts
describe('Reviews Flow Integration', () => {
  it('should add Android app to monitoring', async () => {
    // Search for app
    const searchResults = await searchGooglePlay('WhatsApp', 'us');
    expect(searchResults.results.length).toBeGreaterThan(0);

    // Add to monitoring
    const app = searchResults.results[0];
    const monitored = await addMonitoredApp({
      ...app,
      platform: 'android',
      organization_id: testOrgId
    });

    expect(monitored.platform).toBe('android');
  });

  it('should fetch and analyze Android reviews end-to-end', async () => {
    // Fetch reviews
    const reviews = await UniversalReviewsService.fetchReviews({
      platform: 'android',
      appId: 'com.whatsapp',
      country: 'us',
      maxReviews: 100
    });

    // Analyze reviews
    const enhanced = reviews.data!.map(r => ({
      ...r,
      enhancedSentiment: analyzeEnhancedSentiment(r.text, r.rating)
    }));

    const intelligence = extractReviewIntelligence(enhanced, 'android');

    expect(intelligence.googlePlayMetrics).toBeDefined();
    expect(intelligence.googlePlayMetrics!.developerResponseRate).toBeGreaterThan(0);
  });
});
```

---

## Phase 7: Deployment & Rollout

### Deployment Checklist

1. **Database Migrations**
   ```bash
   # Run migrations in order
   psql -h your-db.supabase.co -U postgres -f supabase/migrations/20250112000001_add_platform_to_monitored_apps.sql
   psql -h your-db.supabase.co -U postgres -f supabase/migrations/20250112000002_add_platform_to_reviews.sql
   psql -h your-db.supabase.co -U postgres -f supabase/migrations/20250112000003_add_platform_to_snapshots.sql
   psql -h your-db.supabase.co -U postgres -f supabase/migrations/20250112000004_add_platform_to_fetch_log.sql
   ```

2. **Deploy Edge Function**
   ```bash
   supabase functions deploy google-play-scraper --no-verify-jwt
   ```

3. **Test Edge Function**
   ```bash
   # Health check
   curl https://your-project.supabase.co/functions/v1/google-play-scraper \
     -d '{"op":"health"}'

   # Test reviews fetch
   curl https://your-project.supabase.co/functions/v1/google-play-scraper \
     -d '{"op":"reviews","packageId":"com.whatsapp","country":"us","pageSize":10}'
   ```

4. **Deploy Frontend**
   ```bash
   npm run build
   # Deploy to your hosting platform
   ```

5. **Verify in Production**
   - Search for Android app
   - Add Android app to monitoring
   - Fetch reviews
   - View Google Play metrics
   - Check developer replies display

---

## Implementation Checklist

### Database (4-6 hours)

- [ ] Create migration files (4 migrations)
- [ ] Test migrations in local Supabase
- [ ] Run migrations in staging database
- [ ] Verify indexes created correctly
- [ ] Test RLS policies for new columns
- [ ] Run validation queries
- [ ] Deploy to production database

### Backend (12-16 hours)

- [ ] Create `google-play-scraper` edge function directory structure
- [ ] Implement `types/index.ts`
- [ ] Implement `services/reviews.service.ts`
- [ ] Implement `services/apps.service.ts`
- [ ] Implement `index.ts` main handler
- [ ] Add error handling and logging
- [ ] Test locally with `supabase functions serve`
- [ ] Deploy to staging environment
- [ ] Load test with 100+ review fetches
- [ ] Deploy to production
- [ ] Set up monitoring and alerts

### Frontend Services (8-12 hours)

- [ ] Create `src/utils/googlePlayReviews.ts`
- [ ] Create `src/services/universal-reviews.service.ts`
- [ ] Update `src/types/review-intelligence.types.ts`
- [ ] Add Google Play search to ASO search service
- [ ] Test service integration

### UI Components (8-10 hours)

- [ ] Create `PlatformToggle.tsx` component
- [ ] Create `GooglePlayMetricsPanel.tsx` component
- [ ] Create `DeveloperReplyCard.tsx` component
- [ ] Update `AppReviewDetailsPage.tsx` for platform support
- [ ] Update `MonitoredAppsGrid.tsx` to show platform badges
- [ ] Update app search modal for platform selection
- [ ] Style and polish all components

### AI Engine (4-6 hours)

- [ ] Add `GooglePlayMetrics` interface
- [ ] Implement `analyzeGooglePlayMetrics()` function
- [ ] Update `extractReviewIntelligence()` for platform support
- [ ] Add developer reply analysis logic
- [ ] Test with real Google Play data

### Testing (8-12 hours)

- [ ] Write unit tests for Google Play service
- [ ] Write integration tests for reviews flow
- [ ] Manual QA: Search Android apps
- [ ] Manual QA: Add Android app to monitoring
- [ ] Manual QA: Fetch and display reviews
- [ ] Manual QA: Verify Google Play metrics
- [ ] Manual QA: Test developer replies display
- [ ] Performance testing (1000 reviews)
- [ ] Cross-browser testing

### Documentation (2-4 hours)

- [ ] Update API documentation
- [ ] Create user guide for Android reviews
- [ ] Document Google Play metrics calculations
- [ ] Add troubleshooting guide

### Deployment (4-6 hours)

- [ ] Deploy to staging environment
- [ ] Run smoke tests in staging
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Verify edge function performance
- [ ] Create rollback plan if needed

---

## Success Metrics

### Technical Metrics
- Google Play scraper success rate: **>95%**
- Average fetch time for 100 reviews: **<5 seconds**
- Edge function cold start: **<2 seconds**
- Database query performance: **<500ms** for review lists

### Business Metrics
- Number of Android apps monitored: Track weekly growth
- User adoption rate: **>50%** of orgs use Android reviews within 1 month
- Developer reply insights used: Track engagement with Google Play metrics panel

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google Play structure changes | Medium | High | Monitor errors, update scraper quickly, maintain fallbacks |
| Rate limiting by Google | Low | Medium | Implement exponential backoff, respect rate limits (10 concurrent max) |
| Large review volumes slow UI | Medium | Medium | Pagination, lazy loading, background fetch jobs |
| Edge function timeouts (>10s) | Low | Medium | Batch fetching, optimize scraper, increase timeout limits |
| Database storage growth | Low | Low | Archive old reviews (>90 days), implement data retention policy |

---

## Next Steps

1. **Review this plan** with your team
2. **Ask any questions** about architecture or implementation
3. **Prioritize phases** based on business needs
4. **Start with Phase 1** (Database migrations)
5. **Proceed sequentially** through phases

---

**Ready to implement?** Let me know if you have any questions or need clarification on any section!
