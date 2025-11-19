# AI AGENT EXECUTION PLAN: Unified App Store Intelligence Platform

**Date:** November 9, 2025
**Version:** 1.0 - READY FOR EXECUTION
**Target:** AI Agent Autonomous Implementation
**Goal:** Build unified App Store data engine with keyword intelligence, title analysis, and spy tools

---

## 🎯 MISSION OVERVIEW

### What We're Building

Transform the current `app-store-scraper` edge function into a **unified App Store intelligence platform** that powers multiple features through a centralized data engine and distributed processing architecture.

### Architecture Pattern

```
CENTRALIZED DATA COLLECTION (One Scraper)
    app-store-data-engine (Enhanced app-store-scraper)
           ↓
    Fetch ALL App Store data
           ↓
    Store in unified database (apps_metadata)
           ↓
    Power ALL tools through shared data

DISTRIBUTED PROCESSING (Separate Functions)
    keyword-intelligence → Heavy keyword analysis
    screenshot-analyzer → Heavy image processing
    title-analyzer → Text analysis
```

### Success Criteria

**CRITICAL:** Reviews page MUST continue working throughout all changes
**GOAL:** Add new features WITHOUT breaking existing functionality
**METHOD:** Phased rollout with validation gates after each phase

---

## 🏗️ CURRENT ARCHITECTURE CONTEXT

### What Already Exists and Works

**Frontend Hooks** (`src/hooks/`):

1. **`useMonitoredApps.ts`** - FULLY OPERATIONAL
   - Fetches monitored apps for an organization
   - Uses existing `monitored_apps` table
   - Provides hooks: `useMonitoredApps`, `useAddMonitoredApp`, `useUpdateMonitoredApp`, `useRemoveMonitoredApp`
   - Includes `AppCompetitor` interface for competitor tracking
   - **DO NOT MODIFY** - This is battle-tested and working

2. **`useCachedReviews.ts`** - FULLY OPERATIONAL
   - Caches reviews for monitored apps (24-hour TTL)
   - Uses existing `monitored_app_reviews` and `review_fetch_log` tables
   - Provides hooks: `useCachedReviews`, `useRefreshCachedReviews`, `useCacheStatus`
   - Fetches from iTunes RSS via `fetchAppReviews()` utility
   - **DO NOT MODIFY** - Critical path for reviews page

**Database Tables** (Existing):

```
monitored_apps          ✅ WORKING - Apps users are tracking
monitored_app_reviews   ✅ WORKING - Cached reviews (24h TTL)
review_fetch_log        ✅ WORKING - Audit log for review fetches
organizations           ✅ WORKING - Multi-tenant organizations
user_roles              ✅ WORKING - Organization memberships
```

**Edge Functions** (Existing):

```
app-store-scraper       ✅ WORKING - 423 successful deployments
  Operations:
    - health            ✅ Health check
    - search            ✅ App search (returns apps)
    - serp              ✅ SERP parsing (returns rankings)
    - serp-topn         ✅ Top N apps in SERP
    - reviews           ✅ Fetch app reviews (CRITICAL - DO NOT BREAK)
```

**Services Already Imported** (in app-store-scraper):

```typescript
✅ DiscoveryService
✅ MetadataExtractionService
✅ ScreenshotAnalysisService
✅ CppAnalysisService
✅ SecurityService
✅ CacheManagerService
✅ AnalyticsService
✅ ReviewsService
✅ AppStoreSerpService
❌ KeywordDiscoveryService  // Exists (600 lines) but NOT imported
```

**Services Needing Fixes** (9 files with `@ts-nocheck`):

```
❌ enhanced-keyword-analytics.service.ts
❌ keyword-tracking.service.ts
❌ keyword-serp-tracking.service.ts
❌ keyword-volume-estimation.service.ts
❌ keyword-gap-analysis.service.ts
❌ competitive-keyword-intelligence.service.ts
❌ keyword-suggestion-engine.service.ts
❌ keyword-portfolio-optimizer.service.ts
❌ keyword-performance-forecasting.service.ts
```

**Why These Services Are Broken:**
- Each has `// @ts-nocheck` comment disabling TypeScript
- Reason: "Tables referenced in this file don't exist in current database schema"
- Impact: 600+ lines of sophisticated keyword analysis code unusable

### What Needs to Be Built

**New Database Tables** (Phase 0):
```
apps_metadata           🆕 Unified app data cache (all App Store metadata)
keywords                🆕 Tracked keywords per app
keyword_rankings        🆕 Historical SERP positions
keyword_search_volumes  🆕 Search volume estimates
```

**New Edge Function Operations** (Phase 0-1):
```
discover_keywords       🆕 Discover relevant keywords for an app
track_keyword           🆕 Add keyword to tracking list
check_rankings          🆕 Check current SERP positions
```

**New Frontend Features** (Phase 1-3):
```
Keyword Intelligence Dashboard    🆕 Rank tracking, search volumes, suggestions
Title Analyzer                     🆕 A/B test titles, analyze competitors
Screenshot Analyzer                🆕 Visual analysis, best practices
Competitor Spy Tools               🆕 Monitor competitors, alerts
```

### Critical Integration Points

**Reviews Page** (`/growth-accelerators/reviews`):
- **Status:** FULLY OPERATIONAL
- **Dependencies:** `useMonitoredApps`, `useCachedReviews`, `app-store-scraper` edge function
- **Performance:** Must load in < 2 seconds
- **Critical Path:** If this breaks, STOP and rollback immediately

**Metadata Persistence Pattern:**
```typescript
// CORRECT (non-blocking):
Promise.allSettled(
  results.map(item => this.saveAppMetadata(item))
).catch(err => console.error('Non-critical error:', err));

return transformedResults;  // Return immediately, don't wait for save

// WRONG (blocking):
await Promise.all(results.map(item => this.saveAppMetadata(item)));  // ❌ Blocks critical path
return transformedResults;
```

**Why Non-Blocking Matters:**
- Reviews page depends on fast search/SERP operations
- Metadata persistence is NICE-TO-HAVE (caching), not CRITICAL
- If database save fails, app should still work (degrade gracefully)
- Edge functions have 120-second timeout (can't afford to wait)

---

## 📋 EXECUTION PHASES

| Phase | Days | Cost | Deliverables | Risk | Validation Gate |
|-------|------|------|--------------|------|-----------------|
| **Phase 0** | 6 | $4,800 | Unified data layer, wired services | LOW | Reviews must work |
| **Phase 1** | 8 | $6,400 | Keyword intelligence features | LOW | Reviews must work |
| **Phase 2** | 6 | $4,800 | Title + screenshot analysis | LOW | Reviews must work |
| **Phase 3** | 3 | $2,400 | Spy tools + alerts | LOW | Reviews must work |
| **TOTAL** | 23 | $18,400 | Complete intelligence platform | LOW | All features working |

---

## ⚠️ CRITICAL CONSTRAINTS

### MUST NOT BREAK

1. **Reviews Page** (`/growth-accelerators/reviews`)
   - Must load in < 2 seconds
   - Must fetch reviews successfully
   - Must display sentiment analysis
   - Must allow adding to monitored apps

2. **Existing Edge Function Operations**
   - `{ op: 'reviews' }` - UNCHANGED
   - `{ op: 'search' }` - Enhanced (adds persistence)
   - `{ op: 'serp' }` - Enhanced (adds persistence)

3. **Database Tables**
   - `monitored_apps` - UNCHANGED
   - `monitored_app_reviews` - UNCHANGED
   - `review_fetch_log` - UNCHANGED

### SAFE TO ADD

1. **New Database Tables**
   - `apps_metadata` (NEW - unified app data)
   - `keywords` (NEW - tracked keywords)
   - `keyword_rankings` (NEW - SERP history)
   - `screenshot_analysis` (NEW - analysis results)
   - `title_analysis` (NEW - title insights)

2. **New Edge Function Operations**
   - `{ op: 'discover_keywords' }` (NEW)
   - `{ op: 'analyze_title' }` (NEW)
   - `{ op: 'analyze_screenshots' }` (NEW)

3. **New Edge Functions**
   - `keyword-intelligence` (NEW)
   - `screenshot-analyzer` (NEW)
   - `title-analyzer` (NEW)

---

## 📝 PHASE 0: FOUNDATION & INTEGRATION (6 Days)

### 🎯 Phase 0 Goal

Create unified data storage layer and wire up existing keyword discovery service.

### ✅ Phase 0 Success Criteria

- [ ] `apps_metadata` table created with indexes and RLS
- [ ] `keywords` and `keyword_rankings` tables created
- [ ] MetadataExtractionService saves data to `apps_metadata`
- [ ] KeywordDiscoveryService callable via edge function
- [ ] All 9 services compile without `@ts-nocheck`
- [ ] **CRITICAL: Reviews page works unchanged**

### 📅 DAY 1: Database Schema Creation

#### Task 1.1: Create apps_metadata Table (4 hours)

**File to create:** `supabase/migrations/20251109120000_create_apps_metadata.sql`

**Execute this SQL:**

```sql
-- ============================================================================
-- MIGRATION: Unified App Metadata Storage
-- Purpose: Central cache for all App Store app data
-- Created: 2025-11-09
-- ============================================================================

-- Table: apps_metadata
CREATE TABLE IF NOT EXISTS public.apps_metadata (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- App Store Identity (UNIQUE - no duplicates)
  app_store_id TEXT UNIQUE NOT NULL,
  bundle_id TEXT,

  -- Basic Info
  app_name TEXT NOT NULL,
  developer_name TEXT NOT NULL,
  developer_id TEXT,
  app_icon_url TEXT,

  -- App Store Metadata
  category TEXT,
  subcategory TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  release_date TIMESTAMPTZ,
  current_version TEXT,
  minimum_os_version TEXT,

  -- Ratings & Reviews
  average_rating DECIMAL(3,2),
  rating_count INTEGER,
  review_count INTEGER,

  -- Content
  description TEXT,
  short_description TEXT,
  release_notes TEXT,

  -- Media (JSON arrays)
  screenshot_urls JSONB DEFAULT '[]'::jsonb,
  video_preview_urls JSONB DEFAULT '[]'::jsonb,

  -- Technical Details
  file_size_bytes BIGINT,
  supported_devices TEXT[] DEFAULT ARRAY[]::TEXT[],
  languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  content_rating TEXT,

  -- Data Source & Tracking
  data_source TEXT NOT NULL CHECK (data_source IN (
    'itunes_api',
    'app_store_connect',
    'manual'
  )) DEFAULT 'itunes_api',

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scrape_count INTEGER NOT NULL DEFAULT 1,
  is_available BOOLEAN NOT NULL DEFAULT true,

  -- Raw Data (for debugging/reprocessing)
  raw_metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Primary lookup by App Store ID
CREATE INDEX IF NOT EXISTS idx_apps_metadata_app_store_id
  ON public.apps_metadata(app_store_id);

-- Lookup by bundle ID
CREATE INDEX IF NOT EXISTS idx_apps_metadata_bundle_id
  ON public.apps_metadata(bundle_id) WHERE bundle_id IS NOT NULL;

-- Search by developer
CREATE INDEX IF NOT EXISTS idx_apps_metadata_developer
  ON public.apps_metadata(developer_name);

-- Filter by category
CREATE INDEX IF NOT EXISTS idx_apps_metadata_category
  ON public.apps_metadata(category) WHERE category IS NOT NULL;

-- Sort by last scraped (find stale data)
CREATE INDEX IF NOT EXISTS idx_apps_metadata_last_scraped
  ON public.apps_metadata(last_scraped_at DESC);

-- Sort by rating (find top apps)
CREATE INDEX IF NOT EXISTS idx_apps_metadata_rating
  ON public.apps_metadata(average_rating DESC NULLS LAST)
  WHERE average_rating IS NOT NULL;

-- Full-text search on app name and developer
CREATE INDEX IF NOT EXISTS idx_apps_metadata_search
  ON public.apps_metadata
  USING GIN(to_tsvector('english',
    app_name || ' ' || COALESCE(developer_name, '')
  ));

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.apps_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all app metadata (public data)
CREATE POLICY "apps_metadata_read_authenticated"
ON public.apps_metadata
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only service role can write (edge functions only)
CREATE POLICY "apps_metadata_write_service_role"
ON public.apps_metadata
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_apps_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Increment scrape count if data is being refreshed
  IF TG_OP = 'UPDATE' THEN
    NEW.scrape_count = COALESCE(OLD.scrape_count, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER apps_metadata_updated_at
  BEFORE UPDATE ON public.apps_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_apps_metadata_updated_at();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.apps_metadata IS
  'Unified cache for all App Store app metadata. Central data layer that powers reviews, keywords, title analysis, and spy tools. Data is scraped from iTunes API and persisted here to avoid re-scraping.';

COMMENT ON COLUMN public.apps_metadata.app_store_id IS
  'iTunes App Store ID (trackId from iTunes API). Primary identifier for apps. Example: 389801252 for Instagram';

COMMENT ON COLUMN public.apps_metadata.data_source IS
  'Source of the metadata: itunes_api (public iTunes Search/Lookup API), app_store_connect (official Apple API for own apps), manual (user input)';

COMMENT ON COLUMN public.apps_metadata.last_scraped_at IS
  'Last time this app metadata was fetched from the source. Used to determine if cached data is stale (> 24 hours).';

COMMENT ON COLUMN public.apps_metadata.raw_metadata IS
  'Complete raw response from iTunes API stored as JSONB. Enables reprocessing if we add new fields without re-scraping.';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- DROP TRIGGER apps_metadata_updated_at ON public.apps_metadata;
-- DROP FUNCTION public.update_apps_metadata_updated_at();
-- DROP TABLE public.apps_metadata CASCADE;
```

**Validation:**

```bash
# Connect to Supabase and run migration
supabase db push

# Verify table created
psql $DATABASE_URL -c "\d apps_metadata"

# Expected output: Table structure with 30+ columns
```

#### Task 1.2: Create Keyword Tracking Tables (4 hours)

**File to create:** `supabase/migrations/20251109130000_create_keyword_tracking.sql`

**Execute this SQL:**

```sql
-- ============================================================================
-- MIGRATION: Keyword Tracking System
-- Purpose: Track keyword rankings over time (SERP positions)
-- Created: 2025-11-09
-- ============================================================================

-- Table: keywords (what keywords are being tracked)
CREATE TABLE IF NOT EXISTS public.keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- App being tracked
  app_store_id TEXT NOT NULL,  -- Soft FK to apps_metadata

  -- Keyword details
  keyword TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country ~ '^[a-z]{2}$'),  -- ISO 3166-1 alpha-2

  -- Tracking settings
  tracked_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tracking_frequency TEXT DEFAULT 'daily' CHECK (tracking_frequency IN ('hourly', 'daily', 'weekly')),
  is_active BOOLEAN DEFAULT true,

  -- User metadata
  notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicates (same keyword for same app in same country)
  UNIQUE(organization_id, app_store_id, keyword, country)
);

-- Table: keyword_rankings (historical SERP positions)
CREATE TABLE IF NOT EXISTS public.keyword_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,

  -- Ranking data
  rank INTEGER CHECK (rank > 0),  -- NULL if not in top 200
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- SERP snapshot (for analysis)
  serp_snapshot JSONB,  -- Top 10 apps in SERP

  -- Change tracking
  rank_change INTEGER,  -- Positive = improved, Negative = declined
  previous_rank INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: keyword_search_volumes (estimated search volumes)
CREATE TABLE IF NOT EXISTS public.keyword_search_volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  keyword TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country ~ '^[a-z]{2}$'),

  -- Estimate data
  estimated_volume INTEGER,  -- Monthly searches
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  estimation_method TEXT,  -- 'serp_based', 'third_party', 'ml_model'

  -- Timestamps
  estimated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One estimate per keyword per country per day
  UNIQUE(keyword, country, (estimated_at::DATE))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Keywords lookup by organization
CREATE INDEX IF NOT EXISTS idx_keywords_organization
  ON public.keywords(organization_id);

-- Keywords lookup by app
CREATE INDEX IF NOT EXISTS idx_keywords_app
  ON public.keywords(app_store_id);

-- Filter active keywords
CREATE INDEX IF NOT EXISTS idx_keywords_active
  ON public.keywords(is_active) WHERE is_active = true;

-- Rankings lookup by keyword
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_keyword
  ON public.keyword_rankings(keyword_id);

-- Rankings sorted by check time (for historical charts)
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_checked
  ON public.keyword_rankings(checked_at DESC);

-- Search volumes lookup
CREATE INDEX IF NOT EXISTS idx_keyword_volumes_lookup
  ON public.keyword_search_volumes(keyword, country);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_search_volumes ENABLE ROW LEVEL SECURITY;

-- Policy: Users see their org's keywords
CREATE POLICY "keywords_read_own_org"
ON public.keywords
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

-- Policy: Service role has full access
CREATE POLICY "keywords_service_role_all"
ON public.keywords
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Rankings inherit from keywords (via keyword_id FK)
CREATE POLICY "keyword_rankings_read"
ON public.keyword_rankings
FOR SELECT
TO authenticated
USING (
  keyword_id IN (
    SELECT id FROM public.keywords
    WHERE organization_id IN (
      SELECT ur.organization_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  )
);

-- Policy: Service role for rankings
CREATE POLICY "keyword_rankings_service_role"
ON public.keyword_rankings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Search volumes readable by all authenticated
CREATE POLICY "keyword_volumes_read_all"
ON public.keyword_search_volumes
FOR SELECT
TO authenticated
USING (true);

-- Policy: Service role for volumes
CREATE POLICY "keyword_volumes_service_role"
ON public.keyword_search_volumes
FOR ALL
TO service_role
USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for keywords
CREATE OR REPLACE FUNCTION public.update_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER keywords_updated_at
  BEFORE UPDATE ON public.keywords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_keywords_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.keywords IS
  'Keywords being tracked for specific apps. Users add keywords they want to monitor SERP rankings for.';

COMMENT ON TABLE public.keyword_rankings IS
  'Historical SERP ranking positions. One record per keyword check (daily/hourly). Enables rank trend charts.';

COMMENT ON TABLE public.keyword_search_volumes IS
  'Estimated monthly search volumes for keywords. Updated periodically via SERP-based heuristics or third-party APIs.';

-- ============================================================================
-- ROLLBACK
-- ============================================================================

-- DROP TRIGGER keywords_updated_at ON public.keywords;
-- DROP FUNCTION public.update_keywords_updated_at();
-- DROP TABLE public.keyword_search_volumes CASCADE;
-- DROP TABLE public.keyword_rankings CASCADE;
-- DROP TABLE public.keywords CASCADE;
```

**Validation:**

```bash
# Run migration
supabase db push

# Verify tables created
psql $DATABASE_URL -c "\d keywords"
psql $DATABASE_URL -c "\d keyword_rankings"
psql $DATABASE_URL -c "\d keyword_search_volumes"

# Test RLS policies
psql $DATABASE_URL -c "SELECT * FROM keywords LIMIT 1;"
# Should return empty or error (no data yet, RLS enabled)
```

**END OF DAY 1**

---

### 📅 DAY 2: Enhance Metadata Extraction Service

#### Task 2.1: Add Database Persistence Method (4 hours)

**File to modify:** `supabase/functions/app-store-scraper/services/metadata-extraction.service.ts`

**ADD this method to the MetadataExtractionService class:**

```typescript
/**
 * Save app metadata to apps_metadata table
 * This method is NON-BLOCKING - errors are logged but not thrown
 * If save fails, the calling operation continues working
 */
async saveAppMetadata(appData: any): Promise<void> {
  try {
    // Transform iTunes API response to our schema
    const metadata = {
      app_store_id: String(appData.trackId || appData.id),
      bundle_id: appData.bundleId || null,
      app_name: appData.trackName || appData.name || 'Unknown App',
      developer_name: appData.artistName || appData.developer || 'Unknown Developer',
      developer_id: appData.artistId ? String(appData.artistId) : null,
      app_icon_url: appData.artworkUrl512 || appData.artworkUrl100 || appData.icon || null,

      category: appData.primaryGenreName || appData.category || null,
      subcategory: appData.genres?.[1] || null,
      price: appData.price !== undefined ? Number(appData.price) : 0,
      currency: appData.currency || 'USD',
      release_date: appData.releaseDate || null,
      current_version: appData.version || null,
      minimum_os_version: appData.minimumOsVersion || null,

      average_rating: appData.averageUserRating || null,
      rating_count: appData.userRatingCount || null,
      review_count: appData.userRatingCount || null,  // iTunes API doesn't separate

      description: appData.description || null,
      short_description: appData.description ? appData.description.substring(0, 200) : null,
      release_notes: appData.releaseNotes || null,

      screenshot_urls: appData.screenshotUrls || appData.screenshots || [],
      video_preview_urls: appData.previewUrls || [],

      file_size_bytes: appData.fileSizeBytes || null,
      supported_devices: appData.supportedDevices || [],
      languages: appData.languageCodesISO2A || [],
      content_rating: appData.contentAdvisoryRating || null,

      data_source: 'itunes_api',
      raw_metadata: appData,  // Store full response for debugging
    };

    // Upsert to database (insert or update if exists)
    const { error } = await this.supabase
      .from('apps_metadata')
      .upsert(metadata, {
        onConflict: 'app_store_id',
        ignoreDuplicates: false  // Always update to refresh data
      });

    if (error) {
      console.error('[MetadataExtraction] Failed to save app metadata:', error);
      // DON'T throw - this is non-critical
      // If database save fails, the calling operation should still succeed
    } else {
      console.log(`[MetadataExtraction] ✅ Saved metadata for ${metadata.app_name} (${metadata.app_store_id})`);
    }
  } catch (error) {
    console.error('[MetadataExtraction] Error in saveAppMetadata:', error);
    // DON'T throw - non-blocking operation
  }
}
```

#### Task 2.2: Update transformSearchResults Method (2 hours)

**In the same file, MODIFY the `transformSearchResults` method:**

Find this method and add metadata saving:

```typescript
transformSearchResults(results: any[]): any[] {
  // Existing transformation logic stays the same
  const transformed = results.map(item => ({
    name: item.trackName || '',
    appId: String(item.trackId || ''),
    developer: item.artistName || '',
    rating: item.averageUserRating || 0,
    reviews: item.userRatingCount || 0,
    icon: item.artworkUrl512 || item.artworkUrl100 || '',
    applicationCategory: item.primaryGenreName || 'App',
    // ... rest of transformation
  }));

  // ✅ NEW: Save metadata to database (non-blocking, async)
  // Use Promise.allSettled so individual failures don't stop the batch
  Promise.allSettled(
    results.map(item => this.saveAppMetadata(item))
  ).catch(err => {
    console.error('[MetadataExtraction] Batch save failed (non-critical):', err);
  });

  // Return transformed results immediately (don't wait for save)
  return transformed;
}
```

#### Task 2.3: Update Edge Function SERP Operation (2 hours)

**File to modify:** `supabase/functions/app-store-scraper/index.ts`

**Find the SERP operation (around line 210-246) and add metadata saving:**

```typescript
// App Store SERP operation (search results parsing) - PUBLIC ACCESS
if (operation === 'serp') {
  const term = (requestData.term || requestData.searchTerm || '').toString().trim();
  const cc = (requestData.cc || requestData.country || 'us').toString().toLowerCase();
  const targetAppId = requestData.appId ? String(requestData.appId) : undefined;
  const limit = Math.min(parseInt(requestData.limit) || 50, 100);
  const maxPagesRaw = parseInt(requestData.maxPages);
  const maxPages = isNaN(maxPagesRaw) ? 5 : Math.max(1, Math.min(10, maxPagesRaw));

  if (!term) {
    return responseBuilder.error('Missing required field: term', 400);
  }
  if (!/^[a-z]{2}$/.test(cc)) {
    return responseBuilder.error('Invalid country code', 400);
  }

  try {
    const serp = await serpService.fetchSerp({ cc, term, limit, maxPages });
    let rank: number | null = null;
    if (targetAppId) {
      const hit = serp.items.find(it => it.appId === targetAppId);
      rank = hit ? hit.rank : null;
    }

    // ✅ NEW: Save SERP apps to metadata table
    // Convert SERP items to iTunes format (approximate)
    const appsToSave = serp.items.slice(0, 10).map(item => ({
      trackId: item.appId,
      trackName: item.appName || item.name,
      artistName: item.developer || 'Unknown',
      artworkUrl100: item.icon || item.appIcon,
      primaryGenreName: item.category || 'App',
      // Note: SERP data is limited, full metadata will be fetched later if needed
    }));

    // Save asynchronously (non-blocking)
    Promise.allSettled(
      appsToSave.map(app => metadataService.saveAppMetadata(app))
    ).catch(err => {
      console.error('[SERP] Metadata save failed (non-critical):', err);
    });

    return responseBuilder.success({
      term,
      country: cc,
      total: serp.items.length,
      rank,
      items: serp.items,
      maxPages
    });
  } catch (error: any) {
    console.error(`❌ [${requestId}] SERP fetch failed:`, error);
    return responseBuilder.error('SERP fetch failed', 502);
  }
}
```

**Validation for Day 2:**

```bash
# Test app search
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper \
  -H "Content-Type: application/json" \
  -d '{"op":"search","searchTerm":"Instagram","country":"us"}'

# Wait 2 seconds for async save
sleep 2

# Check database
psql $DATABASE_URL -c "SELECT app_store_id, app_name, developer_name FROM apps_metadata WHERE app_name LIKE '%Instagram%';"

# Expected: Instagram metadata row
```

**CRITICAL: Test reviews page still works:**

```bash
# Navigate to http://localhost:5173/growth-accelerators/reviews
# Search for "Instagram"
# Click "Load Reviews"
# Verify reviews load correctly

# ✅ MUST PASS before proceeding to Day 3
```

**END OF DAY 2**

---

### 📅 DAY 3: Wire Up KeywordDiscoveryService

#### Task 3.1: Import KeywordDiscoveryService (1 hour)

**File to modify:** `supabase/functions/app-store-scraper/index.ts`

**ADD this import at the top (around line 4-12):**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { DiscoveryService } from './services/discovery.service.ts';
import { MetadataExtractionService } from './services/metadata-extraction.service.ts';
import { ScreenshotAnalysisService } from './services/screenshot-analysis.service.ts';
import { CppAnalysisService } from './services/cpp-analysis.service.ts';
import { SecurityService } from './services/security.service.ts';
import { CacheManagerService } from './services/cache-manager.service.ts';
import { AnalyticsService } from './services/analytics.service.ts';
import { ReviewsService } from './services/reviews.service.ts';
import { AppStoreSerpService } from './services/serp.service.ts';
import { KeywordDiscoveryService } from './services/keyword-discovery.service.ts';  // ✅ NEW
import { ErrorHandler } from './utils/error-handler.ts';
import { ResponseBuilder } from './utils/response-builder.ts';
```

**INITIALIZE the service (around line 62-72):**

```typescript
const discoveryService = new DiscoveryService();
const metadataService = new MetadataExtractionService(supabase);
const screenshotService = new ScreenshotAnalysisService();
const cppService = new CppAnalysisService();
const securityService = new SecurityService(supabase);
const cacheService = new CacheManagerService(supabase);
const analyticsService = new AnalyticsService(supabase);
const reviewsService = new ReviewsService(supabase);
const serpService = new AppStoreSerpService();
const keywordDiscoveryService = new KeywordDiscoveryService(supabase);  // ✅ NEW
const errorHandler = new ErrorHandler();
const responseBuilder = new ResponseBuilder(corsHeaders);
```

#### Task 3.2: Add discover_keywords Operation (3 hours)

**ADD this operation handler AFTER serp-topn (around line 336):**

```typescript
// ============================================================================
// KEYWORD DISCOVERY OPERATION
// Purpose: Discover relevant keywords for an app
// Method: Analyze app metadata, competitors, and SERP suggestions
// Auth: Public (no organization required for basic discovery)
// ============================================================================
if (operation === 'discover_keywords') {
  const appId = requestData.appId ? String(requestData.appId) : '';
  const seedKeywords = Array.isArray(requestData.seedKeywords)
    ? requestData.seedKeywords.map((k: any) => String(k)).filter(Boolean)
    : [];
  const competitorAppIds = Array.isArray(requestData.competitorAppIds)
    ? requestData.competitorAppIds.map((id: any) => String(id)).filter(Boolean)
    : [];
  const country = requestData.country || 'us';
  const maxKeywords = Math.min(parseInt(requestData.maxKeywords) || 50, 200);

  console.log(`🔍 [${requestId}] KEYWORD DISCOVERY: appId=${appId}, seeds=${seedKeywords.length}, competitors=${competitorAppIds.length}, country=${country}`);

  // Validation
  if (!appId) {
    return responseBuilder.error('Missing required field: appId', 400);
  }

  try {
    // Check if app metadata exists in database
    const { data: appMetadata } = await supabase
      .from('apps_metadata')
      .select('*')
      .eq('app_store_id', appId)
      .single();

    // If not in database, fetch from iTunes API first
    if (!appMetadata) {
      console.log(`[${requestId}] App ${appId} not in database, fetching from iTunes...`);

      const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;
      const itunesResponse = await fetch(itunesUrl);
      const itunesData = await itunesResponse.json();

      if (itunesData.resultCount === 0) {
        return responseBuilder.error(`App ${appId} not found in App Store`, 404);
      }

      // Save to database for future use
      await metadataService.saveAppMetadata(itunesData.results[0]);
    }

    // Discover keywords using the service
    const result = await keywordDiscoveryService.discoverKeywords({
      targetApp: appId,
      seedKeywords,
      competitorApps: competitorAppIds,
      country,
      maxKeywords
    });

    if (!result.success) {
      console.error(`[${requestId}] Keyword discovery failed:`, result.error);
      return responseBuilder.error(result.error || 'Keyword discovery failed', 500);
    }

    console.log(`✅ [${requestId}] KEYWORD DISCOVERY SUCCESS: ${result.data.keywords.length} keywords found`);

    // Return discovered keywords
    return responseBuilder.success({
      appId,
      country,
      keywords: result.data.keywords,
      sources: result.data.sources || {},
      metadata: result.data.metadata || {},
      message: `Discovered ${result.data.keywords.length} relevant keywords`
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] KEYWORD DISCOVERY ERROR:`, error);
    return responseBuilder.error(
      `Keyword discovery failed: ${error.message}`,
      500,
      undefined,
      requestId
    );
  }
}
```

**Validation for Day 3:**

```bash
# Test keyword discovery
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper \
  -H "Content-Type: application/json" \
  -d '{
    "op": "discover_keywords",
    "appId": "389801252",
    "seedKeywords": ["photo", "social"],
    "country": "us"
  }'

# Expected response:
# {
#   "appId": "389801252",
#   "keywords": [...],
#   "sources": {...}
# }
```

**CRITICAL: Test reviews page:**

```bash
# Navigate to /growth-accelerators/reviews
# Search "Instagram"
# Load reviews
# ✅ MUST WORK
```

**END OF DAY 3**

---

### 📅 DAY 4-5: Fix Broken Services (16 hours)

#### Task 4.1: Identify Services with @ts-nocheck (2 hours)

**Run this command:**

```bash
grep -r "@ts-nocheck" src/services/*keyword*.ts supabase/functions/app-store-scraper/services/keyword*.ts
```

**Expected output (9 files):**
1. `src/services/enhanced-keyword-analytics.service.ts`
2. `src/services/keyword-tracking.service.ts`
3. `src/services/keyword-serp-tracking.service.ts`
4. `src/services/keyword-volume-estimation.service.ts`
5. `src/services/keyword-gap-analysis.service.ts`
6. `src/services/competitive-keyword-intelligence.service.ts`
7. `src/services/keyword-suggestion-engine.service.ts`
8. `src/services/keyword-portfolio-optimizer.service.ts`
9. `src/services/keyword-performance-forecasting.service.ts`

#### Task 4.2: Fix Each Service (12 hours, ~1.5 hours per service)

**Process for EACH service:**

1. **Remove `// @ts-nocheck` line**
2. **Run TypeScript compiler:**
   ```bash
   npx tsc --noEmit
   ```
3. **Fix errors:**
   - Missing table references → Use existing tables or create new ones
   - Type errors → Add proper types
   - Import errors → Fix import paths
4. **Verify compiles:**
   ```bash
   npx tsc --noEmit
   # Should show no errors for this file
   ```

**Example Fix (enhanced-keyword-analytics.service.ts):**

**BEFORE:**
```typescript
// @ts-nocheck - Tables referenced in this file don't exist in current database schema

export class EnhancedKeywordAnalyticsService {
  async getPerformanceMetrics(keywordId: string) {
    const { data } = await supabase
      .from('keyword_performance_metrics')  // ❌ Table doesn't exist
      .select('*')
      .eq('keyword_id', keywordId);

    return data;
  }
}
```

**AFTER:**
```typescript
// ✅ @ts-nocheck removed

export class EnhancedKeywordAnalyticsService {
  constructor(private supabase: SupabaseClient) {}

  async getPerformanceMetrics(keywordId: string) {
    // Use existing keyword_rankings table instead
    const { data, error } = await this.supabase
      .from('keyword_rankings')  // ✅ Use existing table
      .select('*')
      .eq('keyword_id', keywordId)
      .order('checked_at', { ascending: false })
      .limit(30);  // Last 30 checks

    if (error) {
      console.error('[EnhancedKeywordAnalytics] Error:', error);
      return null;
    }

    // Compute metrics from rankings data
    const metrics = this.computeMetrics(data);

    return metrics;
  }

  private computeMetrics(rankings: any[]) {
    if (!rankings || rankings.length === 0) {
      return {
        avg_rank: null,
        best_rank: null,
        worst_rank: null,
        volatility: 0
      };
    }

    const ranks = rankings.map(r => r.rank).filter(r => r !== null);

    return {
      avg_rank: ranks.reduce((sum, r) => sum + r, 0) / ranks.length,
      best_rank: Math.min(...ranks),
      worst_rank: Math.max(...ranks),
      volatility: this.calculateVolatility(ranks)
    };
  }

  private calculateVolatility(ranks: number[]): number {
    if (ranks.length < 2) return 0;

    const mean = ranks.reduce((sum, r) => sum + r, 0) / ranks.length;
    const squaredDiffs = ranks.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / ranks.length;
    return Math.sqrt(variance);
  }
}
```

**Validation for Day 4-5:**

```bash
# After fixing ALL 9 services, run full TypeScript check
npx tsc --noEmit

# Expected output: No errors
```

**CRITICAL: Test reviews page still works**

**END OF DAY 5**

---

### 📅 DAY 6: Testing & Validation (8 hours)

#### Task 6.1: Create Automated Test Suite (4 hours)

**File to create:** `tests/phase-0-validation.test.ts`

```typescript
import { describe, test, expect, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

describe('Phase 0: Foundation & Integration', () => {

  describe('Database Schema', () => {
    test('apps_metadata table exists', async () => {
      const { error } = await supabase
        .from('apps_metadata')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    test('keywords table exists', async () => {
      const { error } = await supabase
        .from('keywords')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    test('keyword_rankings table exists', async () => {
      const { error } = await supabase
        .from('keyword_rankings')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe('Metadata Persistence', () => {
    test('App search saves metadata to database', async () => {
      // Search for Instagram
      const { data: searchResult } = await supabase.functions.invoke('app-store-scraper', {
        body: { op: 'search', searchTerm: 'Instagram', country: 'us' }
      });

      expect(searchResult).toBeDefined();
      expect(searchResult.results).toBeDefined();

      // Wait for async save
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if metadata was saved
      const { data: metadata, error } = await supabase
        .from('apps_metadata')
        .select('*')
        .ilike('app_name', '%Instagram%')
        .limit(1)
        .single();

      expect(error).toBeNull();
      expect(metadata).toBeDefined();
      expect(metadata.app_store_id).toBeTruthy();
      expect(metadata.app_name).toContain('Instagram');
    });
  });

  describe('Keyword Discovery', () => {
    test('discover_keywords operation works', async () => {
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: {
          op: 'discover_keywords',
          appId: '389801252',  // Instagram
          seedKeywords: ['photo', 'social'],
          country: 'us'
        }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.keywords).toBeDefined();
      expect(Array.isArray(data.keywords)).toBe(true);
      expect(data.keywords.length).toBeGreaterThan(0);
    });
  });

  describe('Critical Path: Reviews', () => {
    test('Reviews operation still works', async () => {
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: {
          op: 'reviews',
          appId: '389801252',
          cc: 'us',
          page: 1
        }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.reviews || data.data.data).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('App search responds within 2 seconds', async () => {
      const startTime = Date.now();

      await supabase.functions.invoke('app-store-scraper', {
        body: { op: 'search', searchTerm: 'Instagram', country: 'us' }
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });
  });
});
```

**Run tests:**

```bash
npm test -- tests/phase-0-validation.test.ts
```

#### Task 6.2: Manual Testing Checklist (4 hours)

**Execute these tests manually:**

```
PHASE 0 MANUAL TESTING CHECKLIST

DATABASE:
[ ] Navigate to Supabase Dashboard → Table Editor
[ ] Verify apps_metadata table exists with 30+ columns
[ ] Verify keywords table exists
[ ] Verify keyword_rankings table exists
[ ] Check indexes exist (run: \d+ apps_metadata in SQL editor)
[ ] Check RLS policies enabled (run: \d apps_metadata should show RLS)

REVIEWS PAGE (CRITICAL - MUST PASS):
[ ] Navigate to http://localhost:5173/growth-accelerators/reviews
[ ] Page loads without errors (check console)
[ ] Search for "Instagram" → App appears in results
[ ] Click "Load Reviews" → Reviews load successfully
[ ] Reviews display with sentiment analysis (positive/neutral/negative)
[ ] Can filter reviews by rating
[ ] Can filter reviews by sentiment
[ ] Can add Instagram to monitored apps
[ ] Monitored apps grid displays correctly
[ ] Page load time < 2 seconds

METADATA PERSISTENCE:
[ ] Search for an app via reviews page
[ ] Wait 3 seconds
[ ] Check database: SELECT * FROM apps_metadata WHERE app_name = 'Instagram';
[ ] Verify row exists with app_store_id, app_name, developer_name populated
[ ] Verify icon URL is saved
[ ] Verify rating and review count are saved

KEYWORD DISCOVERY:
[ ] Open browser console
[ ] Run:
    await supabase.functions.invoke('app-store-scraper', {
      body: {
        op: 'discover_keywords',
        appId: '389801252',
        seedKeywords: ['photo'],
        country: 'us'
      }
    })
[ ] Verify response contains keywords array
[ ] Verify keywords length > 0

TYPESCRIPT COMPILATION:
[ ] Run: npx tsc --noEmit
[ ] Verify no errors
[ ] All 9 keyword services should compile without @ts-nocheck

EDGE FUNCTION LOGS:
[ ] Navigate to Supabase Dashboard → Edge Functions → app-store-scraper → Logs
[ ] Check for errors in last hour
[ ] Look for successful metadata saves: "✅ Saved metadata for..."

PERFORMANCE:
[ ] Reviews page load time: ______ seconds (must be < 2s)
[ ] App search response time: ______ seconds (must be < 1s)
[ ] Keyword discovery time: ______ seconds (must be < 30s)
```

**If ALL tests pass:** ✅ **PHASE 0 COMPLETE - PROCEED TO PHASE 1**

**If ANY test fails:** ❌ **STOP - Investigate and fix before proceeding**

---

### 🎉 PHASE 0 COMPLETION CHECKLIST

**Before marking Phase 0 complete, verify:**

- [x] All database tables created successfully
- [x] All indexes and RLS policies in place
- [x] MetadataExtractionService saves data to apps_metadata
- [x] KeywordDiscoveryService wired up and callable
- [x] All 9 services compile without @ts-nocheck
- [x] Automated test suite passes (all tests green)
- [x] Manual testing checklist completed (all items checked)
- [x] **CRITICAL: Reviews page works unchanged**
- [x] No console errors on any page
- [x] Performance metrics within acceptable ranges

**Phase 0 Success Metrics:**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Reviews page load time | < 2s | ___s | [ ] |
| App search response | < 1s | ___s | [ ] |
| Keyword discovery | < 30s | ___s | [ ] |
| Automated tests passing | 100% | ___% | [ ] |
| TypeScript errors | 0 | ___ | [ ] |
| Console errors | 0 | ___ | [ ] |

**Phase 0 Deliverables:**

- ✅ Database migrations (2 files)
- ✅ Enhanced MetadataExtractionService
- ✅ Wired KeywordDiscoveryService
- ✅ Fixed 9 services
- ✅ Automated test suite
- ✅ Manual testing checklist

**Ready for Phase 1:** Yes [ ] No [ ]

**If No, what needs to be fixed:** ____________________

---

## 📝 PHASE 1: KEYWORD INTELLIGENCE (8 Days)

### 🎯 Phase 1 Goal

Build complete keyword intelligence system with ranking tracking, search volume estimation, and competitor analysis.

### ✅ Phase 1 Success Criteria

- [ ] Keyword tracking UI implemented
- [ ] Users can add/remove keywords to track
- [ ] Ranking history charts display correctly
- [ ] Search volume estimates calculated
- [ ] Competitor keyword analysis working
- [ ] Automated daily rank checks scheduled
- [ ] **CRITICAL: Reviews page still works**

### 📅 DAY 7: Frontend Keyword Tracking UI

#### Task 7.1: Create useKeywords Hook (4 hours)

**File to create:** `src/hooks/useKeywords.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Keyword {
  id: string;
  organization_id: string;
  app_store_id: string;
  keyword: string;
  country: string;
  tracked_since: string;
  tracking_frequency: 'hourly' | 'daily' | 'weekly';
  is_active: boolean;
  notes: string | null;
  tags: string[] | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface KeywordRanking {
  id: string;
  keyword_id: string;
  rank: number | null;
  checked_at: string;
  rank_change: number | null;
  previous_rank: number | null;
  serp_snapshot: any;
}

/**
 * Fetch tracked keywords for an organization
 */
export const useKeywords = (organizationId?: string) => {
  return useQuery({
    queryKey: ['keywords', organizationId],
    queryFn: async (): Promise<Keyword[]> => {
      if (!organizationId) throw new Error('Organization ID required');

      const { data, error } = await supabase
        .from('keywords')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Add keyword to tracking
 */
export const useAddKeyword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      appStoreId: string;
      keyword: string;
      country: string;
      priority?: number;
      notes?: string;
      tags?: string[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      // First, discover if this keyword is already in our system
      const { data: existing } = await supabase
        .from('keywords')
        .select('*')
        .eq('organization_id', params.organizationId)
        .eq('app_store_id', params.appStoreId)
        .eq('keyword', params.keyword.toLowerCase())
        .eq('country', params.country)
        .single();

      if (existing) {
        throw new Error(`Keyword "${params.keyword}" is already tracked for this app`);
      }

      // Insert new keyword
      const { data, error } = await supabase
        .from('keywords')
        .insert({
          organization_id: params.organizationId,
          app_store_id: params.appStoreId,
          keyword: params.keyword.toLowerCase(),
          country: params.country,
          priority: params.priority || 1,
          notes: params.notes || null,
          tags: params.tags || null,
          tracking_frequency: 'daily',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger immediate rank check via edge function
      await supabase.functions.invoke('app-store-scraper', {
        body: {
          op: 'check_rankings',
          keywordId: data.id,
          appStoreId: params.appStoreId,
          keyword: params.keyword,
          country: params.country,
        },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Now tracking "${variables.keyword}"`);
      queryClient.invalidateQueries({ queryKey: ['keywords', variables.organizationId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add keyword');
    },
  });
};

/**
 * Remove keyword from tracking
 */
export const useRemoveKeyword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { keywordId: string; organizationId: string }) => {
      const { error } = await supabase
        .from('keywords')
        .update({ is_active: false })
        .eq('id', params.keywordId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Keyword removed from tracking');
      queryClient.invalidateQueries({ queryKey: ['keywords', variables.organizationId] });
    },
    onError: () => {
      toast.error('Failed to remove keyword');
    },
  });
};

/**
 * Fetch ranking history for a keyword
 */
export const useKeywordRankings = (keywordId?: string) => {
  return useQuery({
    queryKey: ['keyword-rankings', keywordId],
    queryFn: async (): Promise<KeywordRanking[]> => {
      if (!keywordId) throw new Error('Keyword ID required');

      const { data, error } = await supabase
        .from('keyword_rankings')
        .select('*')
        .eq('keyword_id', keywordId)
        .order('checked_at', { ascending: false })
        .limit(90); // Last 90 checks (3 months of daily)

      if (error) throw error;
      return data || [];
    },
    enabled: !!keywordId,
    staleTime: 5 * 60 * 1000,
  });
};
```

#### Task 7.2: Add check_rankings Edge Function Operation (4 hours)

**File to modify:** `supabase/functions/app-store-scraper/index.ts`

**Add this operation handler after discover_keywords:**

```typescript
// ============================================================================
// CHECK RANKINGS OPERATION
// Purpose: Check current SERP position for a tracked keyword
// Method: Fetch SERP and find app's position
// Auth: Service role (for automated jobs) or authenticated user
// ============================================================================
if (operation === 'check_rankings') {
  const keywordId = requestData.keywordId ? String(requestData.keywordId) : '';
  const appStoreId = requestData.appStoreId ? String(requestData.appStoreId) : '';
  const keyword = (requestData.keyword || '').toString().trim();
  const country = requestData.country || 'us';

  console.log(`📊 [${requestId}] CHECK RANKINGS: keyword="${keyword}", app=${appStoreId}, country=${country}`);

  if (!keyword || !appStoreId) {
    return responseBuilder.error('Missing required fields: keyword, appStoreId', 400);
  }

  try {
    // Fetch SERP for this keyword
    const serp = await serpService.fetchSerp({
      cc: country,
      term: keyword,
      limit: 200, // Check top 200
      maxPages: 4,
    });

    // Find app's position in SERP
    const appPosition = serp.items.findIndex(item => item.appId === appStoreId);
    const rank = appPosition >= 0 ? appPosition + 1 : null;

    console.log(`📊 [${requestId}] RANK: ${rank || 'Not in top 200'}`);

    // If we have a keyword ID, save ranking to database
    if (keywordId) {
      // Get previous rank
      const { data: previousRanking } = await supabase
        .from('keyword_rankings')
        .select('rank')
        .eq('keyword_id', keywordId)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      const previousRank = previousRanking?.rank || null;
      const rankChange = rank && previousRank ? previousRank - rank : null;

      // Save new ranking
      await supabase.from('keyword_rankings').insert({
        keyword_id: keywordId,
        rank,
        checked_at: new Date().toISOString(),
        rank_change: rankChange,
        previous_rank: previousRank,
        serp_snapshot: {
          top10: serp.items.slice(0, 10).map(item => ({
            rank: item.rank,
            appId: item.appId,
            name: item.name || item.appName,
            developer: item.developer,
          })),
        },
      });

      console.log(`✅ [${requestId}] Ranking saved: ${rank} (change: ${rankChange || 'N/A'})`);
    }

    return responseBuilder.success({
      keyword,
      appStoreId,
      country,
      rank,
      inTopResults: rank !== null,
      totalResults: serp.items.length,
      serp: serp.items.slice(0, 10), // Return top 10 for context
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] RANK CHECK ERROR:`, error);
    return responseBuilder.error(`Rank check failed: ${error.message}`, 500);
  }
}
```

**Validation:**

```bash
# Test rank checking
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper \
  -H "Content-Type: application/json" \
  -d '{
    "op": "check_rankings",
    "appStoreId": "389801252",
    "keyword": "photo app",
    "country": "us"
  }'

# Expected: { rank: <number>, inTopResults: true/false }
```

**END OF DAY 7**

---

### 📅 DAY 8: Keyword Intelligence Dashboard UI

#### Task 8.1: Create Keywords Page Component (8 hours)

**File to create:** `src/pages/growth-accelerators/keywords.tsx`

```typescript
import { useState } from 'react';
import { useCurrentOrganization } from '@/hooks/useOrganizations';
import { useMonitoredApps } from '@/hooks/useMonitoredApps';
import { useKeywords, useAddKeyword, useRemoveKeyword, useKeywordRankings } from '@/hooks/useKeywords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Plus, Search } from 'lucide-react';

export default function KeywordsPage() {
  const { organization } = useCurrentOrganization();
  const { data: monitoredApps, isLoading: appsLoading } = useMonitoredApps(organization?.id);
  const { data: keywords, isLoading: keywordsLoading } = useKeywords(organization?.id);

  const [selectedApp, setSelectedApp] = useState<string>('');
  const [selectedKeyword, setSelectedKeyword] = useState<string>('');
  const [newKeyword, setNewKeyword] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const addKeywordMutation = useAddKeyword();
  const removeKeywordMutation = useRemoveKeyword();

  const handleAddKeyword = async () => {
    if (!selectedApp || !newKeyword || !organization) return;

    await addKeywordMutation.mutateAsync({
      organizationId: organization.id,
      appStoreId: selectedApp,
      keyword: newKeyword,
      country: 'us',
      priority: 3,
    });

    setNewKeyword('');
    setAddDialogOpen(false);
  };

  const filteredKeywords = selectedApp
    ? keywords?.filter(k => k.app_store_id === selectedApp)
    : keywords;

  if (appsLoading || keywordsLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Keyword Intelligence</h1>
          <p className="text-muted-foreground">Track rankings and discover opportunities</p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Keyword
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Track New Keyword</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select App</Label>
                <Select value={selectedApp} onValueChange={setSelectedApp}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an app..." />
                  </SelectTrigger>
                  <SelectContent>
                    {monitoredApps?.map(app => (
                      <SelectItem key={app.id} value={app.app_store_id}>
                        {app.app_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Keyword</Label>
                <Input
                  placeholder="e.g., photo editor"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                />
              </div>

              <Button
                onClick={handleAddKeyword}
                disabled={!selectedApp || !newKeyword || addKeywordMutation.isPending}
                className="w-full"
              >
                Start Tracking
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* App Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <Label className="whitespace-nowrap">Filter by App:</Label>
            <Select value={selectedApp} onValueChange={setSelectedApp}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="All apps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All apps</SelectItem>
                {monitoredApps?.map(app => (
                  <SelectItem key={app.id} value={app.app_store_id}>
                    {app.app_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Keywords Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredKeywords?.map(keyword => (
          <KeywordCard
            key={keyword.id}
            keyword={keyword}
            onRemove={() =>
              removeKeywordMutation.mutate({
                keywordId: keyword.id,
                organizationId: organization!.id,
              })
            }
            onClick={() => setSelectedKeyword(keyword.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredKeywords?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No keywords tracked yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking keywords to see your App Store rankings
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Keyword
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Keyword Detail Panel (when keyword selected) */}
      {selectedKeyword && (
        <KeywordDetailPanel
          keywordId={selectedKeyword}
          onClose={() => setSelectedKeyword('')}
        />
      )}
    </div>
  );
}

// Keyword Card Component
function KeywordCard({
  keyword,
  onRemove,
  onClick,
}: {
  keyword: any;
  onRemove: () => void;
  onClick: () => void;
}) {
  const { data: rankings } = useKeywordRankings(keyword.id);
  const latestRank = rankings?.[0]?.rank;
  const rankChange = rankings?.[0]?.rank_change;

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{keyword.keyword}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Priority: {keyword.priority}/5
            </p>
          </div>
          <Badge variant={latestRank ? 'default' : 'secondary'}>
            {latestRank ? `#${latestRank}` : 'Not ranked'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rankChange !== null && rankChange !== 0 && (
            <div className="flex items-center gap-2">
              {rankChange > 0 ? (
                <><TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-500">+{rankChange} positions</span></>
              ) : (
                <><TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-500">{rankChange} positions</span></>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClick}>
              View Details
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Keyword Detail Panel Component
function KeywordDetailPanel({
  keywordId,
  onClose,
}: {
  keywordId: string;
  onClose: () => void;
}) {
  const { data: rankings } = useKeywordRankings(keywordId);

  const chartData = rankings
    ?.slice()
    .reverse()
    .map(r => ({
      date: new Date(r.checked_at).toLocaleDateString(),
      rank: r.rank || null,
    }));

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Ranking History</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis reversed domain={[1, 200]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="rank"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Validation:**

```bash
# Test the UI manually:
# 1. Navigate to /growth-accelerators/keywords
# 2. Click "Add Keyword"
# 3. Select an app, enter "photo editor"
# 4. Click "Start Tracking"
# 5. Verify keyword appears in grid
# 6. Click keyword card to see ranking chart

# ✅ MUST PASS: Reviews page still works
```

**END OF DAY 8**

---

### 📅 DAY 9-10: Search Volume Estimation & Competitor Analysis (16 hours)

#### Task 9.1: Implement SERP-Based Volume Estimation (8 hours)

**File to modify:** `supabase/functions/app-store-scraper/services/keyword-volume-estimation.service.ts`

Remove `@ts-nocheck` and implement SERP-based heuristic:

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

export class KeywordVolumeEstimationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Estimate search volume based on SERP characteristics
   * Method: Heuristic scoring based on:
   * - Number of results
   * - App quality in results (ratings, review counts)
   * - Keyword length (shorter = higher volume typically)
   * - Keyword type (branded vs generic)
   */
  async estimateVolume(keyword: string, country: string): Promise<{
    estimatedVolume: number;
    confidenceLevel: 'low' | 'medium' | 'high';
    method: string;
  }> {
    // Fetch SERP to analyze
    const serpResponse = await this.supabase.functions.invoke('app-store-scraper', {
      body: { op: 'serp', term: keyword, cc: country, limit: 50 },
    });

    if (!serpResponse.data || !serpResponse.data.items) {
      return {
        estimatedVolume: 0,
        confidenceLevel: 'low',
        method: 'serp_based_heuristic',
      };
    }

    const items = serpResponse.data.items;

    // Calculate heuristic score
    let score = 0;

    // Factor 1: Number of results (more = higher volume)
    const resultCount = items.length;
    score += Math.min(resultCount / 10, 50); // Max 50 points

    // Factor 2: Average app quality (high-quality apps = competitive keyword = higher volume)
    const avgReviews = items.reduce((sum: number, item: any) => sum + (item.reviews || 0), 0) / items.length;
    score += Math.min(avgReviews / 1000, 30); // Max 30 points

    // Factor 3: Keyword length (shorter = typically higher volume)
    const wordCount = keyword.split(' ').length;
    score += wordCount === 1 ? 20 : wordCount === 2 ? 15 : 10;

    // Convert score to estimated monthly searches
    const estimatedVolume = Math.round(score * 1000);

    // Determine confidence
    const confidenceLevel = resultCount > 40 ? 'high' : resultCount > 20 ? 'medium' : 'low';

    // Save to database
    await this.supabase.from('keyword_search_volumes').insert({
      keyword: keyword.toLowerCase(),
      country,
      estimated_volume: estimatedVolume,
      confidence_level: confidenceLevel,
      estimation_method: 'serp_based_heuristic',
      estimated_at: new Date().toISOString(),
    });

    return { estimatedVolume, confidenceLevel, method: 'serp_based_heuristic' };
  }
}
```

#### Task 9.2: Competitor Keyword Analysis (8 hours)

**File to modify:** `supabase/functions/app-store-scraper/services/competitive-keyword-intelligence.service.ts`

Remove `@ts-nocheck` and implement competitor keyword discovery:

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

export class CompetitiveKeywordIntelligenceService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Find keywords that competitors rank for but target app doesn't
   */
  async findGapKeywords(targetAppId: string, competitorAppIds: string[], country: string): Promise<{
    gapKeywords: Array<{
      keyword: string;
      competitorRank: number;
      competitor: string;
      estimatedVolume: number;
      opportunity: 'high' | 'medium' | 'low';
    }>;
  }> {
    const gaps: any[] = [];

    // Get all tracked keywords
    const { data: trackedKeywords } = await this.supabase
      .from('keywords')
      .select('keyword')
      .eq('app_store_id', targetAppId)
      .eq('country', country);

    const trackedSet = new Set((trackedKeywords || []).map(k => k.keyword));

    // For each competitor, find what they rank for
    for (const competitorId of competitorAppIds) {
      // Get competitor app metadata
      const { data: competitorApp } = await this.supabase
        .from('apps_metadata')
        .select('app_name, developer_name, description')
        .eq('app_store_id', competitorId)
        .single();

      if (!competitorApp) continue;

      // Extract keywords from competitor's metadata
      const competitorKeywords = this.extractKeywordsFromMetadata(competitorApp);

      // For each keyword, check if target app ranks
      for (const keyword of competitorKeywords) {
        if (trackedSet.has(keyword)) continue; // Already tracking

        // Check competitor's rank
        const { data: serpResponse } = await this.supabase.functions.invoke('app-store-scraper', {
          body: { op: 'serp', term: keyword, cc: country, limit: 100 },
        });

        if (!serpResponse?.items) continue;

        const competitorRank = serpResponse.items.findIndex((item: any) => item.appId === competitorId) + 1;
        const targetRank = serpResponse.items.findIndex((item: any) => item.appId === targetAppId) + 1;

        // Gap found: competitor ranks, target doesn't
        if (competitorRank > 0 && competitorRank <= 20 && targetRank === 0) {
          gaps.push({
            keyword,
            competitorRank,
            competitor: competitorApp.app_name,
            estimatedVolume: 5000, // Placeholder - would use volume estimation
            opportunity: competitorRank <= 5 ? 'high' : competitorRank <= 15 ? 'medium' : 'low',
          });
        }
      }
    }

    return { gapKeywords: gaps };
  }

  private extractKeywordsFromMetadata(app: any): string[] {
    const text = `${app.app_name} ${app.description || ''}`.toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];

    // Extract bigrams (2-word phrases)
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }

    return [...new Set(bigrams)].slice(0, 50); // Top 50 unique bigrams
  }
}
```

**END OF DAY 10**

---

### 📅 DAY 11-14: Automated Rank Checking & Alerts (32 hours)

#### Task 11.1: Create Supabase Edge Function for Scheduled Rank Checks (16 hours)

**File to create:** `supabase/functions/keyword-rank-checker/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[KeywordRankChecker] Starting scheduled rank check...');

    // Get all active keywords that need checking (daily frequency)
    const { data: keywords, error } = await supabaseClient
      .from('keywords')
      .select('*, organizations(id, name)')
      .eq('is_active', true)
      .eq('tracking_frequency', 'daily');

    if (error) throw error;

    console.log(`[KeywordRankChecker] Found ${keywords.length} keywords to check`);

    let checked = 0;
    let failed = 0;

    // Check each keyword
    for (const keyword of keywords) {
      try {
        // Invoke app-store-scraper to check rank
        const { data, error: checkError } = await supabaseClient.functions.invoke('app-store-scraper', {
          body: {
            op: 'check_rankings',
            keywordId: keyword.id,
            appStoreId: keyword.app_store_id,
            keyword: keyword.keyword,
            country: keyword.country,
          },
        });

        if (checkError) {
          console.error(`[KeywordRankChecker] Error checking keyword ${keyword.id}:`, checkError);
          failed++;
        } else {
          console.log(`[KeywordRankChecker] ✅ Checked "${keyword.keyword}" for app ${keyword.app_store_id}: Rank ${data.rank || 'not ranked'}`);
          checked++;
        }

        // Rate limit: 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`[KeywordRankChecker] Failed to check keyword ${keyword.id}:`, error);
        failed++;
      }
    }

    console.log(`[KeywordRankChecker] Complete: ${checked} checked, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        checked,
        failed,
        total: keywords.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[KeywordRankChecker] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Deploy edge function:**

```bash
supabase functions deploy keyword-rank-checker
```

**Set up cron job** (using Supabase Dashboard → Database → Cron):

```sql
-- Schedule keyword rank checks daily at 3 AM UTC
SELECT cron.schedule(
  'daily-keyword-rank-check',
  '0 3 * * *',  -- Every day at 3 AM
  $$
  SELECT net.http_post(
    url := 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/keyword-rank-checker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) AS request_id;
  $$
);
```

#### Task 11.2: Ranking Change Alerts (16 hours)

**File to create:** `supabase/functions/keyword-rank-checker/alerts.ts`

```typescript
export async function checkForAlerts(supabase: SupabaseClient, keywordId: string, newRank: number | null, previousRank: number | null) {
  if (previousRank === null || newRank === null) return;

  const change = previousRank - newRank;

  // Alert conditions
  const bigDrop = change < -10; // Dropped 10+ positions
  const bigGain = change > 10; // Gained 10+ positions
  const enteredTop10 = newRank <= 10 && previousRank > 10;
  const leftTop10 = newRank > 10 && previousRank <= 10;

  if (!bigDrop && !bigGain && !enteredTop10 && !leftTop10) return;

  // Get keyword details
  const { data: keyword } = await supabase
    .from('keywords')
    .select('*, organizations(id, name)')
    .eq('id', keywordId)
    .single();

  if (!keyword) return;

  // Create alert
  const alertMessage = bigDrop
    ? `⚠️ Keyword "${keyword.keyword}" dropped ${Math.abs(change)} positions (${previousRank} → ${newRank})`
    : bigGain
    ? `🎉 Keyword "${keyword.keyword}" gained ${change} positions (${previousRank} → ${newRank})`
    : enteredTop10
    ? `🚀 Keyword "${keyword.keyword}" entered top 10! Now ranking #${newRank}`
    : `📉 Keyword "${keyword.keyword}" left top 10 (now #${newRank})`;

  // Save alert to notifications table (would need to create this)
  console.log(`[Alert] ${alertMessage}`);

  // TODO: Send email/Slack notification
}
```

**Validation for Day 11-14:**

```bash
# Test scheduled rank checker manually
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/keyword-rank-checker \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Expected: { checked: N, failed: 0, total: N }

# Check database for new rankings
psql $DATABASE_URL -c "SELECT * FROM keyword_rankings ORDER BY created_at DESC LIMIT 10;"

# ✅ MUST PASS: Reviews page still works
```

**END OF DAY 14**

---

### 🎉 PHASE 1 COMPLETION CHECKLIST

- [ ] Keyword tracking UI functional
- [ ] Users can add/remove keywords
- [ ] Ranking history charts display
- [ ] Automated daily rank checks running
- [ ] Alerts triggering for significant changes
- [ ] Search volume estimates calculated
- [ ] Competitor gap analysis working
- [ ] **CRITICAL: Reviews page works unchanged**
- [ ] Performance metrics acceptable

**Ready for Phase 2:** Yes [ ] No [ ]

---

## 📝 PHASE 2: TITLE & SCREENSHOT ANALYSIS (6 Days)

### 🎯 Phase 2 Goal

Build title analyzer and screenshot analyzer to help optimize app store listings.

### ✅ Phase 2 Success Criteria

- [ ] Title analyzer UI implemented
- [ ] Users can A/B test different titles
- [ ] Screenshot analyzer extracts text and UI elements
- [ ] Best practices recommendations provided
- [ ] Competitor comparison available
- [ ] **CRITICAL: Reviews page still works**

### 📅 DAY 15-16: Title Analyzer (16 hours)

**Features to Implement:**
- Title analysis service (character count, keyword density, competitors)
- Title A/B testing UI
- Title suggestions based on top apps
- Keyword stuffing detector
- Localization support

**Key Files:**
- `src/hooks/useTitleAnalysis.ts` (NEW)
- `src/pages/growth-accelerators/title-analyzer.tsx` (NEW)
- `supabase/functions/app-store-scraper` - Add `analyze_title` operation

**Validation:** Title analyzer page loads, analyzes titles, provides suggestions

### 📅 DAY 17-20: Screenshot Analyzer (32 hours)

**Features to Implement:**
- Screenshot upload and analysis
- OCR text extraction (using Tesseract.js)
- UI element detection (colors, buttons, text size)
- Best practices validation (text readability, visual hierarchy)
- Competitor screenshot comparison

**Key Files:**
- `src/hooks/useScreenshotAnalysis.ts` (NEW)
- `src/pages/growth-accelerators/screenshot-analyzer.tsx` (NEW)
- `supabase/functions/screenshot-analyzer` (NEW edge function)
- `supabase/migrations/create_screenshot_analysis_table.sql` (NEW)

**Validation:** Screenshots upload, analysis completes, recommendations displayed

**END OF PHASE 2**

---

## 📝 PHASE 3: COMPETITOR SPY TOOLS & ALERTS (3 Days)

### 🎯 Phase 3 Goal

Build competitor monitoring and alerting system.

### ✅ Phase 3 Success Criteria

- [ ] Competitor tracking UI implemented
- [ ] Users can add competitors to monitored apps
- [ ] Competitor changes detected (title, screenshots, price, ratings)
- [ ] Alerts sent for significant changes
- [ ] Side-by-side comparison view
- [ ] **CRITICAL: Reviews page still works**

### 📅 DAY 21-23: Competitor Monitoring (24 hours)

**Features to Implement:**
- Add competitors to monitored apps (useMonitoredApps already has AppCompetitor interface!)
- Daily scrape of competitor metadata
- Change detection and alerting
- Comparison dashboard
- Export competitor data

**Key Files:**
- `src/hooks/useCompetitors.ts` (NEW - uses existing AppCompetitor from useMonitoredApps)
- `src/pages/growth-accelerators/competitors.tsx` (NEW)
- `supabase/functions/competitor-monitor` (NEW edge function for daily checks)
- `supabase/migrations/create_competitor_changes_log.sql` (NEW)

**Key Integration Point:**
The `useMonitoredApps.ts` already has `AppCompetitor` interface defined (lines 32-62), so we just need to implement hooks to use it!

```typescript
// From useMonitoredApps.ts (already exists):
export interface AppCompetitor {
  id: string;
  organization_id: string;
  target_app_id: string;
  competitor_app_store_id: string;
  competitor_app_name: string;
  competitor_app_icon: string | null;
  competitor_bundle_id: string | null;
  competitor_developer: string | null;
  competitor_category: string | null;
  competitor_rating: number | null;
  competitor_review_count: number | null;
  country: string;
  comparison_context: string | null;
  priority: number;
  is_active: boolean;
  last_compared_at: string | null;
  comparison_summary: any | null;
  created_at: string;
  created_by: string | null;
}
```

**Validation:** Competitors added, changes detected, alerts triggered

**END OF PHASE 3**

---

## 🎉 FULL PROJECT COMPLETION CHECKLIST

### All Phases Complete

- [ ] **Phase 0:** Unified data layer created
- [ ] **Phase 1:** Keyword intelligence working
- [ ] **Phase 2:** Title & screenshot analysis working
- [ ] **Phase 3:** Competitor monitoring working
- [ ] **Reviews page:** STILL WORKS (critical)
- [ ] All automated tests passing
- [ ] All manual tests passing
- [ ] Performance metrics acceptable
- [ ] No console errors
- [ ] Documentation updated
- [ ] User training completed

### Success Metrics (Final)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Reviews page uptime | 99.9% | ___% | [ ] |
| Keyword tracking accuracy | > 90% | ___% | [ ] |
| User adoption rate | > 50% | ___% | [ ] |
| Performance (all pages) | < 2s | ___s | [ ] |
| Data quality | > 95% | ___% | [ ] |
| Zero breaking changes | 100% | ___% | [ ] |

---

## 📝 ROLLBACK PROCEDURES

### Emergency Rollback (If ANY Critical Issue Occurs)

**Trigger Conditions:**
- Reviews page broken
- Data loss detected
- Performance degradation > 50%
- Multiple user reports of errors
- Edge function errors > 10%

**Immediate Actions:**

```bash
# 1. Stop all cron jobs
psql $DATABASE_URL <<EOF
SELECT cron.unschedule('daily-keyword-rank-check');
EOF

# 2. Revert to last known good commit
git log --oneline | head -20
git revert <commit-hash-before-changes>

# 3. Redeploy edge functions
supabase functions deploy app-store-scraper
supabase functions deploy keyword-rank-checker

# 4. Test reviews page
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper \
  -H "Content-Type: application/json" \
  -d '{"op":"reviews","appId":"389801252","cc":"us","page":1}'

# Expected: { success: true, data: [...reviews] }
```

### If Phase 0 Needs to be Rolled Back

**Step 1: Revert Database Migrations**

```bash
# Connect to database
psql $DATABASE_URL

# Drop new tables (in reverse order of dependencies)
DROP TABLE IF EXISTS public.keyword_search_volumes CASCADE;
DROP TABLE IF EXISTS public.keyword_rankings CASCADE;
DROP TABLE IF EXISTS public.keywords CASCADE;
DROP TABLE IF EXISTS public.apps_metadata CASCADE;

# Drop triggers and functions
DROP TRIGGER IF EXISTS apps_metadata_updated_at ON public.apps_metadata;
DROP TRIGGER IF EXISTS keywords_updated_at ON public.keywords;
DROP FUNCTION IF EXISTS public.update_apps_metadata_updated_at();
DROP FUNCTION IF EXISTS public.update_keywords_updated_at();
```

**Step 2: Revert Code Changes**

```bash
# Revert to last commit before Phase 0
git log --oneline | head -10  # Find commit hash before Phase 0
git revert <commit-hash>  # Revert changes

# Or restore specific files
git checkout <commit-hash> supabase/functions/app-store-scraper/services/metadata-extraction.service.ts
git checkout <commit-hash> supabase/functions/app-store-scraper/index.ts
```

**Step 3: Redeploy Edge Function**

```bash
supabase functions deploy app-store-scraper
```

**Step 4: Verify Rollback Success**

```bash
# Test reviews page
# Navigate to /growth-accelerators/reviews
# Should work exactly as before Phase 0
```

### If Phase 1 Needs to be Rolled Back

**Step 1: Remove Keyword Tracking UI**

```bash
# Remove frontend files
rm src/hooks/useKeywords.ts
rm src/pages/growth-accelerators/keywords.tsx

# Revert app-store-scraper changes
git checkout <phase-0-commit> supabase/functions/app-store-scraper/index.ts
```

**Step 2: Stop Automated Jobs**

```bash
psql $DATABASE_URL <<EOF
SELECT cron.unschedule('daily-keyword-rank-check');
EOF

# Remove edge function
supabase functions delete keyword-rank-checker
```

**Step 3: Verify**

```bash
# Reviews page should still work
# Keyword tables remain (data preserved) but unused
```

### If Phase 2 Needs to be Rolled Back

```bash
# Remove title analyzer UI
rm src/hooks/useTitleAnalysis.ts
rm src/pages/growth-accelerators/title-analyzer.tsx

# Remove screenshot analyzer
rm src/hooks/useScreenshotAnalysis.ts
rm src/pages/growth-accelerators/screenshot-analyzer.tsx
supabase functions delete screenshot-analyzer

# Drop screenshot_analysis table
psql $DATABASE_URL -c "DROP TABLE IF EXISTS public.screenshot_analysis CASCADE;"
```

### If Phase 3 Needs to be Rolled Back

```bash
# Remove competitor monitoring UI
rm src/hooks/useCompetitors.ts
rm src/pages/growth-accelerators/competitors.tsx

# Stop competitor monitoring job
supabase functions delete competitor-monitor

# Drop competitor changes log
psql $DATABASE_URL -c "DROP TABLE IF EXISTS public.competitor_changes_log CASCADE;"
```

### Complete System Rollback (Nuclear Option)

**Only use if all else fails:**

```bash
# 1. Identify pre-implementation commit
ROLLBACK_COMMIT=$(git log --oneline --before="2025-11-09" | head -1 | awk '{print $1}')

# 2. Create rollback branch
git checkout -b rollback-emergency
git reset --hard $ROLLBACK_COMMIT

# 3. Force push (DANGEROUS - coordinate with team)
git push -f origin rollback-emergency

# 4. Drop all new tables
psql $DATABASE_URL <<EOF
DROP TABLE IF EXISTS public.competitor_changes_log CASCADE;
DROP TABLE IF EXISTS public.screenshot_analysis CASCADE;
DROP TABLE IF EXISTS public.keyword_search_volumes CASCADE;
DROP TABLE IF EXISTS public.keyword_rankings CASCADE;
DROP TABLE IF EXISTS public.keywords CASCADE;
DROP TABLE IF EXISTS public.apps_metadata CASCADE;
EOF

# 5. Redeploy all edge functions
supabase functions deploy app-store-scraper

# 6. Verify reviews page works
curl -X POST .../app-store-scraper \
  -d '{"op":"reviews","appId":"389801252","cc":"us"}'
```

---

## 📝 VALIDATION GATES

### After Each Phase

**MANDATORY CHECKS:**

1. **Run automated test suite**
   ```bash
   npm test
   ```
   - All tests MUST pass
   - If any test fails, STOP and fix

2. **Test reviews page manually**
   - Navigate to `/growth-accelerators/reviews`
   - Search for app
   - Load reviews
   - Verify sentiment analysis works
   - Check page load time < 2 seconds

3. **Check console for errors**
   - Open browser DevTools
   - Check Console tab
   - Should see 0 errors

4. **Performance validation**
   - Reviews page: < 2 seconds
   - App search: < 1 second
   - New features: Within spec

5. **Go/No-Go Decision**
   - ALL checks pass → Proceed to next phase
   - ANY check fails → Stop, investigate, fix, re-test

---

## 📊 SUCCESS METRICS

### Technical Metrics

**Performance:**
- Reviews page load: < 2 seconds ✅
- App search: < 1 second ✅
- Keyword discovery: < 30 seconds ✅
- Screenshot analysis: < 5 minutes (async OK) ✅

**Reliability:**
- Reviews page uptime: 99.9% ✅
- Data scraping success rate: > 95% ✅
- Database query performance: < 100ms ✅

**Data Quality:**
- Apps metadata accuracy: > 95% ✅
- Keyword rankings accuracy: > 90% ✅
- Cache hit rate: > 80% ✅

### Business Metrics

**User Adoption:**
- Keyword tracking: 5+ keywords per active org
- Title analysis: 2+ uses per week per org
- Competitor monitoring: 3+ competitors per org

---

## 🚀 IMPLEMENTATION SUMMARY

### What This Plan Delivers

**Phase 0 (6 days / $4,800):**
- Unified app metadata database (apps_metadata table)
- Keyword tracking infrastructure (keywords, keyword_rankings tables)
- KeywordDiscoveryService wired up and functional
- All 9 broken services fixed and compiling
- Non-blocking metadata persistence in search/SERP operations

**Phase 1 (8 days / $6,400):**
- Complete keyword intelligence dashboard
- Ranking tracking with historical charts
- Automated daily rank checks via cron job
- Search volume estimation (SERP-based heuristic)
- Competitor keyword gap analysis
- Ranking change alerts

**Phase 2 (6 days / $4,800):**
- Title analyzer with A/B testing
- Screenshot analyzer with OCR
- Best practices recommendations
- Competitor comparison

**Phase 3 (3 days / $2,400):**
- Competitor monitoring system
- Change detection and alerts
- Side-by-side comparison dashboard

**Total: 23 days / $18,400**

### Critical Safety Features

1. **Non-Blocking Architecture**
   - All new features are ADDITIVE only
   - Metadata persistence doesn't block critical operations
   - If database save fails, app continues working

2. **Validation Gates**
   - Test reviews page after EVERY change
   - Stop immediately if anything breaks
   - Complete rollback procedures at every level

3. **Phased Rollout**
   - Each phase is independent
   - Can roll back individual phases without affecting others
   - Data preserved even if UI is rolled back

### AI Agent Execution Notes

**How to Use This Plan:**

1. **Read the entire plan first** - Understand all phases before starting
2. **Execute Phase 0 completely** - Don't skip to Phase 1
3. **Test after each day** - Validation is mandatory, not optional
4. **Reviews page is sacred** - If it breaks, STOP immediately
5. **Non-blocking is critical** - Don't wait for database saves in critical paths
6. **Commit frequently** - Small commits enable granular rollback

**Success Indicators:**

- ✅ All tests passing (automated + manual)
- ✅ Reviews page loading in < 2 seconds
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ Edge function logs show successful operations
- ✅ Database queries completing in < 100ms

**Failure Indicators:**

- ❌ Reviews page broken or slow (> 2s)
- ❌ Console errors appearing
- ❌ TypeScript compilation errors
- ❌ Edge function errors > 5%
- ❌ Database query timeouts

**If ANY failure indicator appears: STOP, investigate, fix, or rollback.**

---

**END OF AI AGENT EXECUTION PLAN**

**Version:** 1.0
**Created:** November 9, 2025
**Status:** READY FOR AUTONOMOUS EXECUTION
**Next Action:** Begin Phase 0, Day 1, Task 1.1 (create apps_metadata migration)

---

_This plan was created by analyzing the current architecture (useMonitoredApps.ts, useCachedReviews.ts, app-store-scraper edge function) and incorporates all best practices for non-blocking operations, phased rollout, and comprehensive testing. The reviews page MUST continue working throughout all changes._

---

### Duplicate content removed below (old rollback section from original Phase 0 plan)

**Step 1: Revert Database Migrations**

```bash
# Connect to database
psql $DATABASE_URL

# Drop new tables (in reverse order of dependencies)
DROP TABLE IF EXISTS public.keyword_search_volumes CASCADE;
DROP TABLE IF EXISTS public.keyword_rankings CASCADE;
DROP TABLE IF EXISTS public.keywords CASCADE;
DROP TABLE IF EXISTS public.apps_metadata CASCADE;

# Drop triggers and functions
DROP TRIGGER IF EXISTS apps_metadata_updated_at ON public.apps_metadata;
DROP TRIGGER IF EXISTS keywords_updated_at ON public.keywords;
DROP FUNCTION IF EXISTS public.update_apps_metadata_updated_at();
DROP FUNCTION IF EXISTS public.update_keywords_updated_at();
```

**Step 2: Revert Code Changes**

```bash
# Revert to last commit before Phase 0
git log --oneline | head -10  # Find commit hash before Phase 0
git revert <commit-hash>  # Revert changes

# Or restore specific files
git checkout <commit-hash> supabase/functions/app-store-scraper/services/metadata-extraction.service.ts
git checkout <commit-hash> supabase/functions/app-store-scraper/index.ts
```

**Step 3: Redeploy Edge Function**

```bash
supabase functions deploy app-store-scraper
```

**Step 4: Verify Rollback Success**

```bash
# Test reviews page
# Navigate to /growth-accelerators/reviews
# Should work exactly as before Phase 0
```

---

## 🎯 VALIDATION GATES

### After Each Phase

**MANDATORY CHECKS:**

1. **Run automated test suite**
   ```bash
   npm test
   ```
   - All tests MUST pass
   - If any test fails, STOP and fix

2. **Test reviews page manually**
   - Navigate to `/growth-accelerators/reviews`
   - Search for app
   - Load reviews
   - Verify sentiment analysis works
   - Check page load time < 2 seconds

3. **Check console for errors**
   - Open browser DevTools
   - Check Console tab
   - Should see 0 errors

4. **Performance validation**
   - Reviews page: < 2 seconds
   - App search: < 1 second
   - New features: Within spec

5. **Go/No-Go Decision**
   - ALL checks pass → Proceed to next phase
   - ANY check fails → Stop, investigate, fix, re-test

---

## 📊 SUCCESS METRICS

### Technical Metrics

**Performance:**
- Reviews page load: < 2 seconds ✅
- App search: < 1 second ✅
- Keyword discovery: < 30 seconds ✅
- Screenshot analysis: < 5 minutes (async OK) ✅

**Reliability:**
- Reviews page uptime: 99.9% ✅
- Data scraping success rate: > 95% ✅
- Database query performance: < 100ms ✅

**Data Quality:**
- Apps metadata accuracy: > 95% ✅
- Keyword rankings accuracy: > 90% ✅
- Cache hit rate: > 80% ✅

### Business Metrics

**User Adoption:**
- Keyword tracking: 5+ keywords per active org
- Title analysis: 2+ uses per week per org
- Competitor monitoring: 3+ competitors per org

---

## 🚀 NEXT STEPS

After Phase 0 completion:

1. **Review Phase 0 results with stakeholders**
2. **Get approval for Phase 1**
3. **Begin Phase 1 implementation** (detailed plan to be added)

---

**END OF AI AGENT EXECUTION PLAN - PHASE 0**

This document will be extended with Phases 1-3 upon successful completion of Phase 0.
