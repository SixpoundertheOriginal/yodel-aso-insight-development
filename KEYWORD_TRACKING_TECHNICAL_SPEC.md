# Keyword Tracking & Analysis System - Technical Specification

## 1. Executive Summary

This document outlines the technical implementation for a comprehensive keyword tracking and analysis system that competes with industry leaders like AppTweak and Sensor Tower. The system will provide ethical web scraping, automated rank tracking, historical analytics, and intelligent keyword discovery for both iOS (App Store) and Android (Google Play Store) applications across multiple regions.

---

## 2. System Overview

### 2.1 Core Capabilities

1. **Keyword Rank Tracking**
   - Track app rankings for specific keywords (top 50 positions)
   - Support both iOS App Store and Google Play Store
   - Multi-region support (different keywords per region)
   - Real-time on-demand tracking + automated 24-hour refresh cycles

2. **Keyword Discovery**
   - Automatic discovery of keywords the app currently ranks for
   - Manual keyword entry and batch upload
   - Competitor keyword analysis
   - AI-powered keyword suggestions

3. **Analytics & Metrics**
   - **Popularity**: Estimated monthly search volume
   - **Effectiveness**: Visibility score (rank × search volume) + conversion estimates
   - Historical trend tracking (daily snapshots)
   - Performance tier breakdowns (Top 10, Top 30, Top 50)

4. **Competitive Intelligence**
   - Identify competitor apps ranking for same keywords
   - Compare ranking positions over time
   - Discover keyword opportunities

---

## 3. Architecture Overview

### 3.1 Technology Stack

**Backend:**
- Node.js/TypeScript services
- Supabase Edge Functions for scraping tasks
- PostgreSQL database (Supabase)
- Redis/Supabase cache for rate limiting

**Frontend:**
- React/TypeScript
- Existing UI components (shadcn/ui)
- Chart.js or Recharts for visualizations

**Scraping Infrastructure:**
- Ethical scraping with rate limiting
- Rotating user agents
- Exponential backoff on failures
- Circuit breaker patterns (already implemented)

### 3.2 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  - Keywords Dashboard                                        │
│  - Keyword Detail Pages                                      │
│  - Discovery Wizard                                          │
│  - Competitor Analysis UI                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Service Layer                          │
│  - Keyword Management API                                    │
│  - Ranking API (on-demand refresh)                          │
│  - Discovery API                                             │
│  - Analytics API                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Core Services Layer                         │
│  - KeywordRankingService (existing, enhanced)               │
│  - KeywordDiscoveryService                                   │
│  - KeywordIntelligenceService                                │
│  - CompetitorAnalysisService                                 │
│  - MetricsCalculationService                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Scraping Layer                              │
│  - App Store SERP Scraper (enhanced)                        │
│  - Google Play SERP Scraper (new)                           │
│  - Search Volume Estimator                                   │
│  - App Metadata Scraper                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Background Jobs                             │
│  - Daily Keyword Refresh Job                                │
│  - Auto-Discovery Job                                        │
│  - Competitor Tracking Job                                   │
│  - Metrics Aggregation Job                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  - PostgreSQL (Supabase)                                     │
│  - Redis Cache (for rate limiting)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema

### 4.1 New Tables

#### `keywords`
Primary table for tracking keywords across apps and platforms.

```sql
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,

  -- Keyword details
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  region TEXT NOT NULL DEFAULT 'us', -- ISO 3166-1 alpha-2 code

  -- Tracking metadata
  is_tracked BOOLEAN DEFAULT true,
  discovery_method TEXT CHECK (discovery_method IN ('manual', 'auto_discovery', 'competitor_analysis', 'ai_suggestion')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_tracked_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(app_id, keyword, platform, region)
);

CREATE INDEX idx_keywords_app_platform ON keywords(app_id, platform, region);
CREATE INDEX idx_keywords_tracking ON keywords(is_tracked, last_tracked_at);
CREATE INDEX idx_keywords_org ON keywords(organization_id);
```

#### `keyword_rankings`
Stores historical ranking data with snapshots.

```sql
CREATE TABLE keyword_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

  -- Ranking data
  position INTEGER, -- NULL if not ranking in top 50
  is_ranking BOOLEAN DEFAULT false, -- true if position <= 50

  -- SERP context
  serp_snapshot JSONB, -- Stores top 50 apps with their positions

  -- Metrics
  estimated_search_volume INTEGER, -- Monthly searches estimate
  visibility_score NUMERIC(10,2), -- (51 - position) * search_volume / 50
  estimated_traffic INTEGER, -- Estimated installs from this keyword

  -- Change tracking
  position_change INTEGER, -- Change from previous snapshot
  trend TEXT CHECK (trend IN ('up', 'down', 'stable', 'new', 'lost')),

  -- Snapshot metadata
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(keyword_id, snapshot_date)
);

CREATE INDEX idx_rankings_keyword_date ON keyword_rankings(keyword_id, snapshot_date DESC);
CREATE INDEX idx_rankings_performance ON keyword_rankings(position, is_ranking);
CREATE INDEX idx_rankings_snapshot_date ON keyword_rankings(snapshot_date);
```

#### `keyword_search_volumes`
Stores estimated search volume data (can be updated periodically).

```sql
CREATE TABLE keyword_search_volumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  region TEXT NOT NULL,

  -- Volume estimates
  estimated_monthly_searches INTEGER,
  popularity_score INTEGER CHECK (popularity_score BETWEEN 0 AND 100),
  competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high', 'very_high')),

  -- Metadata
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  data_source TEXT, -- 'scraped', 'calculated', 'third_party'

  UNIQUE(keyword, platform, region)
);

CREATE INDEX idx_search_volumes_lookup ON keyword_search_volumes(keyword, platform, region);
```

#### `competitor_keywords`
Tracks which competitors rank for specific keywords.

```sql
CREATE TABLE competitor_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

  -- Competitor app details
  competitor_app_id TEXT NOT NULL, -- trackId for iOS, bundleId for Android
  competitor_app_name TEXT NOT NULL,
  competitor_position INTEGER NOT NULL,

  -- Snapshot metadata
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(keyword_id, competitor_app_id, snapshot_date)
);

CREATE INDEX idx_competitor_keywords_lookup ON competitor_keywords(keyword_id, snapshot_date DESC);
```

#### `keyword_refresh_queue`
Queue for managing automated keyword tracking jobs.

```sql
CREATE TABLE keyword_refresh_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

  -- Job metadata
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 50, -- Higher = higher priority
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Error tracking
  error_message TEXT,
  last_error_at TIMESTAMPTZ,

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_queue_status ON keyword_refresh_queue(status, scheduled_at);
CREATE INDEX idx_refresh_queue_priority ON keyword_refresh_queue(priority DESC, scheduled_at);
```

### 4.2 Enhanced Existing Tables

Modify `apps` table to include tracking preferences:

```sql
ALTER TABLE apps ADD COLUMN IF NOT EXISTS keyword_tracking_enabled BOOLEAN DEFAULT true;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS auto_discovery_enabled BOOLEAN DEFAULT true;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS last_auto_discovery_at TIMESTAMPTZ;
```

---

## 5. Core Services Implementation

### 5.1 Enhanced SERP Scraping Service

**File:** `supabase/functions/app-store-scraper/services/enhanced-serp.service.ts`

```typescript
interface SerpResult {
  keyword: string;
  platform: 'ios' | 'android';
  region: string;
  results: SerpResultItem[];
  scrapedAt: Date;
}

interface SerpResultItem {
  position: number;
  appId: string; // trackId or bundleId
  appName: string;
  developer: string;
  iconUrl: string;
  rating?: number;
  ratingCount?: number;
}

class EnhancedSerpScraperService {
  /**
   * Scrapes App Store SERP for a given keyword
   * Returns top 50 results with app details
   */
  async scrapeAppStoreSERP(
    keyword: string,
    region: string = 'us',
    depth: number = 50
  ): Promise<SerpResult> {
    // Implementation:
    // 1. Construct iTunes Search API URL with keyword
    // 2. Fetch results (limit=50)
    // 3. Parse and extract app metadata
    // 4. Apply rate limiting (max 20 requests/min per Apple guidelines)
    // 5. Handle errors with exponential backoff
    // 6. Return structured SerpResult
  }

  /**
   * Scrapes Google Play SERP for a given keyword
   * Returns top 50 results with app details
   */
  async scrapeGooglePlaySERP(
    keyword: string,
    region: string = 'us',
    depth: number = 50
  ): Promise<SerpResult> {
    // Implementation:
    // 1. Construct Google Play search URL
    // 2. Fetch HTML content with proper headers
    // 3. Parse HTML to extract app cards
    // 4. Extract: bundleId, name, developer, icon, rating
    // 5. Apply rate limiting (max 30 requests/min recommended)
    // 6. Handle pagination if needed for deeper results
    // 7. Return structured SerpResult
  }

  /**
   * Finds app position in SERP results
   */
  findAppPosition(
    targetAppId: string,
    serpResults: SerpResultItem[]
  ): number | null {
    const result = serpResults.find(r => r.appId === targetAppId);
    return result ? result.position : null;
  }

  /**
   * Estimates search volume based on SERP signals
   * Uses heuristics like number of competing apps, rating counts, etc.
   */
  async estimateSearchVolume(
    keyword: string,
    platform: 'ios' | 'android',
    serpResults: SerpResultItem[]
  ): Promise<number> {
    // Algorithm:
    // 1. Count total results (indicator of competition)
    // 2. Analyze top 10 apps' review counts (proxy for traffic)
    // 3. Calculate weighted average
    // 4. Apply platform-specific multipliers
    // 5. Return estimated monthly searches

    // Example heuristic:
    // If top 10 apps average 10K+ reviews → High volume (>100K searches/month)
    // If top 10 apps average 1K-10K reviews → Medium (10K-100K)
    // If top 10 apps average <1K reviews → Low (<10K)
  }
}
```

### 5.2 Keyword Intelligence Service

**File:** `src/services/keyword-intelligence.service.ts`

```typescript
interface KeywordMetrics {
  keyword: string;
  platform: 'ios' | 'android';
  region: string;

  // Core metrics
  currentPosition: number | null;
  isRanking: boolean;
  estimatedSearchVolume: number;
  popularityScore: number; // 0-100
  competitionLevel: 'low' | 'medium' | 'high' | 'very_high';

  // Effectiveness metrics
  visibilityScore: number; // (51 - position) * searchVolume / 50
  estimatedTraffic: number; // Based on position + search volume

  // Trend data
  trend: 'up' | 'down' | 'stable' | 'new' | 'lost';
  positionChange: number;
  historicalData: HistoricalSnapshot[];
}

interface HistoricalSnapshot {
  date: string;
  position: number | null;
  visibilityScore: number;
}

class KeywordIntelligenceService {
  /**
   * Fetches comprehensive metrics for a keyword
   */
  async getKeywordMetrics(keywordId: string): Promise<KeywordMetrics> {
    // 1. Fetch keyword details from DB
    // 2. Get latest ranking snapshot
    // 3. Get previous snapshot for trend calculation
    // 4. Calculate visibility and traffic scores
    // 5. Fetch historical data (last 30 days)
    // 6. Return complete metrics
  }

  /**
   * Calculates visibility score
   * Formula: (51 - position) * searchVolume / 50
   * Higher score = better visibility
   */
  calculateVisibilityScore(
    position: number | null,
    searchVolume: number
  ): number {
    if (!position || position > 50) return 0;
    return ((51 - position) * searchVolume) / 50;
  }

  /**
   * Estimates traffic from keyword ranking
   * Uses industry CTR benchmarks by position
   */
  estimateTrafficFromKeyword(
    position: number | null,
    searchVolume: number
  ): number {
    if (!position || position > 50) return 0;

    // Industry CTR benchmarks (approximate)
    const ctrByPosition: { [key: number]: number } = {
      1: 0.30,   // #1 gets ~30% CTR
      2: 0.20,   // #2 gets ~20% CTR
      3: 0.12,
      4: 0.08,
      5: 0.06,
      6: 0.05,
      7: 0.04,
      8: 0.03,
      9: 0.025,
      10: 0.02
      // Positions 11-50: diminishing returns
    };

    let ctr = ctrByPosition[position];
    if (!ctr) {
      // Estimate for positions 11-50
      ctr = Math.max(0.001, 0.02 / Math.pow(position - 9, 1.2));
    }

    // Estimated downloads = search volume * CTR * conversion rate
    // Assuming 30% conversion rate (view → install)
    return Math.round(searchVolume * ctr * 0.3);
  }

  /**
   * Calculates trend based on position changes
   */
  calculateTrend(
    currentPosition: number | null,
    previousPosition: number | null
  ): 'up' | 'down' | 'stable' | 'new' | 'lost' {
    if (!previousPosition && currentPosition) return 'new';
    if (previousPosition && !currentPosition) return 'lost';
    if (!previousPosition && !currentPosition) return 'stable';

    const change = previousPosition! - currentPosition!;
    if (change > 3) return 'up';
    if (change < -3) return 'down';
    return 'stable';
  }
}
```

### 5.3 Keyword Discovery Service

**File:** `src/services/keyword-discovery.service.ts`

```typescript
interface DiscoveryResult {
  keyword: string;
  position: number;
  estimatedSearchVolume: number;
  confidence: 'high' | 'medium' | 'low';
  suggestedForTracking: boolean;
}

class KeywordDiscoveryService {
  /**
   * Auto-discovers keywords an app ranks for
   * Strategy: Reverse-engineer from app metadata + SERP sampling
   */
  async discoverKeywordsForApp(
    appId: string,
    platform: 'ios' | 'android',
    region: string = 'us'
  ): Promise<DiscoveryResult[]> {
    const discoveredKeywords: DiscoveryResult[] = [];

    // 1. Extract potential keywords from app metadata
    const metadataKeywords = await this.extractKeywordsFromMetadata(
      appId,
      platform
    );

    // 2. Test each keyword to see if app ranks
    for (const keyword of metadataKeywords) {
      const position = await this.checkKeywordRanking(
        keyword,
        appId,
        platform,
        region
      );

      if (position && position <= 50) {
        discoveredKeywords.push({
          keyword,
          position,
          estimatedSearchVolume: await this.estimateVolume(keyword, platform),
          confidence: 'high',
          suggestedForTracking: position <= 30 // Only suggest if ranking well
        });
      }

      // Rate limiting: wait between checks
      await this.sleep(2000);
    }

    // 3. Sample popular industry keywords
    const industryKeywords = await this.getIndustryKeywords(appId, platform);
    for (const keyword of industryKeywords) {
      const position = await this.checkKeywordRanking(
        keyword,
        appId,
        platform,
        region
      );

      if (position && position <= 50) {
        discoveredKeywords.push({
          keyword,
          position,
          estimatedSearchVolume: await this.estimateVolume(keyword, platform),
          confidence: 'medium',
          suggestedForTracking: true
        });
      }

      await this.sleep(2000);
    }

    return discoveredKeywords.sort((a, b) => a.position - b.position);
  }

  /**
   * Extracts potential keywords from app metadata
   */
  private async extractKeywordsFromMetadata(
    appId: string,
    platform: 'ios' | 'android'
  ): Promise<string[]> {
    // 1. Fetch app metadata (name, subtitle, description)
    // 2. Use NLP to extract key phrases
    // 3. Generate variations (singular/plural, synonyms)
    // 4. Return prioritized list

    // Example extraction:
    // App: "Fitness Tracker - Health & Workout"
    // Keywords: ["fitness tracker", "health", "workout", "fitness", "tracker"]
  }

  /**
   * Checks if app ranks for a keyword
   */
  private async checkKeywordRanking(
    keyword: string,
    targetAppId: string,
    platform: 'ios' | 'android',
    region: string
  ): Promise<number | null> {
    const serpResults = await serpScraperService.scrapeSERP(
      keyword,
      platform,
      region,
      50
    );

    return serpResults.results.find(r => r.appId === targetAppId)?.position || null;
  }

  /**
   * Fetches industry-relevant keywords based on app category
   */
  private async getIndustryKeywords(
    appId: string,
    platform: 'ios' | 'android'
  ): Promise<string[]> {
    // 1. Determine app category (e.g., "Health & Fitness")
    // 2. Load pre-defined keyword list for that category
    // 3. Can be enhanced with ML-based suggestions

    // Example for Health & Fitness:
    // ["workout", "exercise", "fitness", "gym", "health tracker", etc.]
  }
}
```

### 5.4 Competitor Analysis Service

**File:** `src/services/competitor-analysis.service.ts`

```typescript
interface CompetitorKeywordData {
  keyword: string;
  yourPosition: number | null;
  competitors: CompetitorRanking[];
  opportunity: 'high' | 'medium' | 'low';
}

interface CompetitorRanking {
  appId: string;
  appName: string;
  position: number;
  positionGap: number; // Difference from your position
}

class CompetitorAnalysisService {
  /**
   * Analyzes competitors ranking for same keywords
   */
  async analyzeCompetitorKeywords(
    appId: string,
    platform: 'ios' | 'android',
    region: string
  ): Promise<CompetitorKeywordData[]> {
    // 1. Get all tracked keywords for the app
    // 2. For each keyword, analyze SERP
    // 3. Identify competitors consistently appearing
    // 4. Calculate opportunities (keywords where competitors rank higher)
    // 5. Return analysis
  }

  /**
   * Discovers what keywords a competitor ranks for
   */
  async discoverCompetitorKeywords(
    competitorAppId: string,
    platform: 'ios' | 'android',
    region: string
  ): Promise<DiscoveryResult[]> {
    // Similar to KeywordDiscoveryService.discoverKeywordsForApp
    // but for competitor apps
  }

  /**
   * Identifies keyword gaps (keywords competitors rank for, but you don't)
   */
  async findKeywordGaps(
    yourAppId: string,
    competitorAppIds: string[],
    platform: 'ios' | 'android',
    region: string
  ): Promise<string[]> {
    // 1. Discover keywords for all competitor apps
    // 2. Check if your app ranks for those keywords
    // 3. Return keywords where competitors rank but you don't (or rank poorly)
  }
}
```

---

## 6. Background Jobs & Automation

### 6.1 Daily Keyword Refresh Job

**File:** `supabase/functions/keyword-refresh-job/index.ts`

```typescript
/**
 * Runs every 24 hours to refresh all tracked keywords
 * Triggered by Supabase cron or external scheduler
 */
async function dailyKeywordRefreshJob() {
  console.log('Starting daily keyword refresh job...');

  // 1. Fetch all keywords where is_tracked = true
  const { data: keywords } = await supabase
    .from('keywords')
    .select('*')
    .eq('is_tracked', true)
    .order('last_tracked_at', { ascending: true, nullsFirst: true });

  if (!keywords || keywords.length === 0) {
    console.log('No keywords to track');
    return;
  }

  console.log(`Found ${keywords.length} keywords to refresh`);

  // 2. Add to refresh queue with staggered scheduling
  const queueItems = keywords.map((kw, index) => ({
    keyword_id: kw.id,
    status: 'pending',
    priority: 50,
    scheduled_at: new Date(Date.now() + (index * 3000)) // Stagger by 3 seconds
  }));

  await supabase.from('keyword_refresh_queue').insert(queueItems);

  // 3. Process queue
  await processRefreshQueue();

  console.log('Daily keyword refresh job completed');
}

async function processRefreshQueue() {
  while (true) {
    // Fetch next batch of pending jobs
    const { data: jobs } = await supabase
      .from('keyword_refresh_queue')
      .select('*, keyword:keywords(*)')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .limit(10);

    if (!jobs || jobs.length === 0) {
      break; // Queue empty
    }

    // Process each job
    for (const job of jobs) {
      await processRefreshJob(job);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    }
  }
}

async function processRefreshJob(job: any) {
  try {
    // Mark as processing
    await supabase
      .from('keyword_refresh_queue')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id);

    const keyword = job.keyword;

    // Scrape SERP
    const serpResults = await serpScraperService.scrapeSERP(
      keyword.keyword,
      keyword.platform,
      keyword.region
    );

    // Find app position
    const position = serpScraperService.findAppPosition(
      keyword.app_id,
      serpResults.results
    );

    // Get previous ranking for trend calculation
    const { data: prevRanking } = await supabase
      .from('keyword_rankings')
      .select('position')
      .eq('keyword_id', keyword.id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    // Calculate metrics
    const searchVolume = await serpScraperService.estimateSearchVolume(
      keyword.keyword,
      keyword.platform,
      serpResults.results
    );

    const visibilityScore = keywordIntelligenceService.calculateVisibilityScore(
      position,
      searchVolume
    );

    const estimatedTraffic = keywordIntelligenceService.estimateTrafficFromKeyword(
      position,
      searchVolume
    );

    const trend = keywordIntelligenceService.calculateTrend(
      position,
      prevRanking?.position
    );

    // Save ranking snapshot
    await supabase.from('keyword_rankings').insert({
      keyword_id: keyword.id,
      position,
      is_ranking: position !== null && position <= 50,
      serp_snapshot: serpResults.results,
      estimated_search_volume: searchVolume,
      visibility_score: visibilityScore,
      estimated_traffic: estimatedTraffic,
      position_change: prevRanking?.position ? prevRanking.position - (position || 999) : 0,
      trend,
      snapshot_date: new Date().toISOString().split('T')[0]
    });

    // Update keyword last_tracked_at
    await supabase
      .from('keywords')
      .update({ last_tracked_at: new Date().toISOString() })
      .eq('id', keyword.id);

    // Save competitor data
    await saveCompetitorData(keyword.id, serpResults.results);

    // Mark job as completed
    await supabase
      .from('keyword_refresh_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);

  } catch (error) {
    // Handle failure
    await supabase
      .from('keyword_refresh_queue')
      .update({
        status: job.retry_count < job.max_retries ? 'pending' : 'failed',
        retry_count: job.retry_count + 1,
        error_message: error.message,
        last_error_at: new Date().toISOString(),
        scheduled_at: new Date(Date.now() + (60000 * Math.pow(2, job.retry_count))) // Exponential backoff
      })
      .eq('id', job.id);
  }
}

async function saveCompetitorData(keywordId: string, serpResults: SerpResultItem[]) {
  const competitors = serpResults.slice(0, 20).map(result => ({
    keyword_id: keywordId,
    competitor_app_id: result.appId,
    competitor_app_name: result.appName,
    competitor_position: result.position,
    snapshot_date: new Date().toISOString().split('T')[0]
  }));

  await supabase.from('competitor_keywords').insert(competitors);
}
```

### 6.2 Auto-Discovery Job

**File:** `supabase/functions/auto-discovery-job/index.ts`

```typescript
/**
 * Runs weekly to auto-discover new keywords for apps
 * Only runs for apps with auto_discovery_enabled = true
 */
async function autoDiscoveryJob() {
  console.log('Starting auto-discovery job...');

  // Fetch apps with auto-discovery enabled
  const { data: apps } = await supabase
    .from('apps')
    .select('*')
    .eq('auto_discovery_enabled', true)
    .eq('keyword_tracking_enabled', true);

  for (const app of apps || []) {
    console.log(`Discovering keywords for ${app.name}...`);

    const discovered = await keywordDiscoveryService.discoverKeywordsForApp(
      app.track_id || app.bundle_id,
      app.platform,
      app.region || 'us'
    );

    // Filter: only add high-confidence keywords
    const toAdd = discovered.filter(d =>
      d.confidence === 'high' && d.suggestedForTracking
    );

    // Insert new keywords (ignore duplicates)
    for (const kw of toAdd) {
      await supabase.from('keywords').insert({
        organization_id: app.organization_id,
        app_id: app.id,
        keyword: kw.keyword,
        platform: app.platform,
        region: app.region || 'us',
        discovery_method: 'auto_discovery',
        is_tracked: true
      }).onConflict('app_id, keyword, platform, region').ignore();
    }

    // Update last discovery timestamp
    await supabase
      .from('apps')
      .update({ last_auto_discovery_at: new Date().toISOString() })
      .eq('id', app.id);

    // Rate limiting between apps
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
  }

  console.log('Auto-discovery job completed');
}
```

---

## 7. Frontend Implementation

### 7.1 Keywords Dashboard

**File:** `src/pages/growth-accelerators/keywords.tsx` (Enhanced)

**Key Features:**
1. **Overview Cards:**
   - Total keywords tracked
   - Keywords in Top 10 (count + percentage)
   - Keywords in Top 30 (count + percentage)
   - Keywords in Top 50 (count + percentage)
   - Average ranking position
   - Total estimated traffic from keywords

2. **Keywords Table:**
   - Columns: Keyword, Platform, Region, Position, Change, Trend, Search Volume, Visibility Score, Est. Traffic
   - Sortable by all columns
   - Filter by: Platform, Region, Ranking tier (Top 10/30/50), Trend
   - Search functionality
   - Bulk actions: Track/Untrack, Export, Delete

3. **Actions:**
   - "Add Keyword" button → Manual entry modal
   - "Discover Keywords" button → Auto-discovery wizard
   - "Analyze Competitor" button → Competitor analysis modal
   - "Refresh All" button → Triggers on-demand refresh for visible keywords
   - Export to CSV

4. **Visualizations:**
   - Line chart: Average position over time (last 30 days)
   - Bar chart: Keywords by ranking tier (Top 10, 11-30, 31-50, 50+)
   - Pie chart: Keywords by trend (Up, Down, Stable)

**Implementation Structure:**

```typescript
export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<KeywordMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: 'all',
    region: 'all',
    tier: 'all',
    trend: 'all'
  });

  // Fetch keywords on mount
  useEffect(() => {
    fetchKeywords();
  }, [filters]);

  // Aggregate stats
  const stats = useMemo(() => {
    return {
      total: keywords.length,
      top10: keywords.filter(k => k.currentPosition && k.currentPosition <= 10).length,
      top30: keywords.filter(k => k.currentPosition && k.currentPosition <= 30).length,
      top50: keywords.filter(k => k.currentPosition && k.currentPosition <= 50).length,
      avgPosition: _.meanBy(keywords.filter(k => k.currentPosition), 'currentPosition'),
      totalTraffic: _.sumBy(keywords, 'estimatedTraffic')
    };
  }, [keywords]);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Total Keywords"
          value={stats.total}
          icon={<KeyIcon />}
        />
        <StatsCard
          title="Top 10"
          value={stats.top10}
          subtitle={`${((stats.top10 / stats.total) * 100).toFixed(1)}%`}
          trend="positive"
        />
        <StatsCard
          title="Top 30"
          value={stats.top30}
          subtitle={`${((stats.top30 / stats.total) * 100).toFixed(1)}%`}
        />
        <StatsCard
          title="Top 50"
          value={stats.top50}
          subtitle={`${((stats.top50 / stats.total) * 100).toFixed(1)}%`}
        />
        <StatsCard
          title="Avg Position"
          value={stats.avgPosition.toFixed(1)}
        />
        <StatsCard
          title="Est. Traffic"
          value={formatNumber(stats.totalTraffic)}
          subtitle="installs/month"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Position Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <PositionTrendChart keywords={keywords} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keywords by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <TierBreakdownChart stats={stats} />
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => setShowAddKeywordModal(true)}>
            <PlusIcon className="mr-2" />
            Add Keyword
          </Button>
          <Button variant="outline" onClick={() => setShowDiscoveryWizard(true)}>
            <SearchIcon className="mr-2" />
            Discover Keywords
          </Button>
          <Button variant="outline" onClick={() => setShowCompetitorModal(true)}>
            <UsersIcon className="mr-2" />
            Analyze Competitor
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshAll}>
            <RefreshIcon className="mr-2" />
            Refresh All
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <DownloadIcon className="mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <KeywordFilters filters={filters} onChange={setFilters} />

      {/* Keywords Table */}
      <KeywordsDataTable
        keywords={keywords}
        loading={loading}
        onRefresh={handleRefreshKeyword}
        onDelete={handleDeleteKeyword}
        onToggleTracking={handleToggleTracking}
      />

      {/* Modals */}
      <AddKeywordModal
        open={showAddKeywordModal}
        onClose={() => setShowAddKeywordModal(false)}
        onAdd={handleAddKeyword}
      />

      <DiscoveryWizard
        open={showDiscoveryWizard}
        onClose={() => setShowDiscoveryWizard(false)}
        onComplete={handleDiscoveryComplete}
      />

      <CompetitorAnalysisModal
        open={showCompetitorModal}
        onClose={() => setShowCompetitorModal(false)}
      />
    </div>
  );
}
```

### 7.2 Keyword Detail Page

**File:** `src/pages/growth-accelerators/keyword-detail.tsx`

Shows detailed analytics for a single keyword:

1. **Header:**
   - Keyword name
   - Current position (large, prominent)
   - Position change badge
   - Last updated timestamp
   - "Refresh" button

2. **Metrics Cards:**
   - Search Volume
   - Visibility Score
   - Estimated Traffic
   - Competition Level

3. **Historical Chart:**
   - Line chart showing position over time (last 90 days)
   - Toggle between: Position, Visibility Score, Traffic

4. **SERP Preview:**
   - Table showing current top 50 results
   - Highlight your app
   - Show competitor apps

5. **Competitor Analysis:**
   - List of competitors ranking for this keyword
   - Their positions
   - Position gaps
   - "Track Competitor" button

### 7.3 Discovery Wizard Component

**File:** `src/components/keywords/DiscoveryWizard.tsx`

Multi-step wizard for keyword discovery:

1. **Step 1: Select App**
   - Dropdown to select app
   - Show app icon, name, platform

2. **Step 2: Discovery Method**
   - Radio buttons:
     - "Auto-discover from app metadata"
     - "Discover from competitor"
     - "AI-powered suggestions"

3. **Step 3: Configuration**
   - Region selector
   - Max keywords to discover (slider)
   - Minimum position threshold (only suggest if ranking in top X)

4. **Step 4: Running Discovery**
   - Progress indicator
   - Shows discovered keywords in real-time

5. **Step 5: Review & Select**
   - Table of discovered keywords
   - Columns: Keyword, Position, Est. Volume, Suggested
   - Checkboxes to select which to track
   - "Track Selected" button

---

## 8. API Endpoints

### 8.1 Keywords API

**Base Path:** `/api/keywords`

```typescript
// GET /api/keywords
// Fetch all keywords for an app
interface GetKeywordsRequest {
  appId: string;
  platform?: 'ios' | 'android';
  region?: string;
  isTracked?: boolean;
}

interface GetKeywordsResponse {
  keywords: KeywordMetrics[];
  stats: {
    total: number;
    top10: number;
    top30: number;
    top50: number;
    avgPosition: number;
  };
}

// POST /api/keywords
// Add new keyword(s) to track
interface AddKeywordsRequest {
  appId: string;
  keywords: {
    keyword: string;
    platform: 'ios' | 'android';
    region: string;
  }[];
  discoveryMethod?: 'manual' | 'auto_discovery' | 'competitor_analysis';
}

// DELETE /api/keywords/:id
// Remove keyword from tracking

// PUT /api/keywords/:id/toggle-tracking
// Enable/disable tracking for a keyword
```

### 8.2 Rankings API

**Base Path:** `/api/rankings`

```typescript
// GET /api/rankings/:keywordId
// Fetch ranking history for a keyword
interface GetRankingsRequest {
  keywordId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

interface GetRankingsResponse {
  rankings: {
    date: string;
    position: number | null;
    visibilityScore: number;
    estimatedTraffic: number;
    trend: string;
  }[];
}

// POST /api/rankings/refresh
// Trigger on-demand refresh for keyword(s)
interface RefreshRankingsRequest {
  keywordIds: string[];
}
```

### 8.3 Discovery API

**Base Path:** `/api/discovery`

```typescript
// POST /api/discovery/auto
// Auto-discover keywords for an app
interface AutoDiscoverRequest {
  appId: string;
  platform: 'ios' | 'android';
  region: string;
  maxKeywords?: number;
  minPosition?: number;
}

interface AutoDiscoverResponse {
  discovered: DiscoveryResult[];
  totalChecked: number;
  timeElapsed: number;
}

// POST /api/discovery/competitor
// Discover keywords from a competitor
interface CompetitorDiscoveryRequest {
  competitorAppId: string; // trackId or bundleId
  platform: 'ios' | 'android';
  region: string;
}

// POST /api/discovery/suggestions
// Get AI-powered keyword suggestions
interface KeywordSuggestionsRequest {
  appId: string;
  platform: 'ios' | 'android';
  region: string;
  count: number;
}
```

### 8.4 Competitor API

**Base Path:** `/api/competitors`

```typescript
// GET /api/competitors/keywords/:keywordId
// Get competitors ranking for a specific keyword
interface GetCompetitorsResponse {
  competitors: CompetitorRanking[];
  yourApp: {
    position: number | null;
    isRanking: boolean;
  };
}

// POST /api/competitors/analyze
// Analyze competitors for multiple keywords
interface AnalyzeCompetitorsRequest {
  appId: string;
  platform: 'ios' | 'android';
  region: string;
}

interface AnalyzeCompetitorsResponse {
  topCompetitors: {
    appId: string;
    appName: string;
    overlapCount: number; // Number of shared keywords
    avgPositionGap: number;
  }[];
  keywordGaps: string[]; // Keywords competitors rank for but you don't
}
```

---

## 9. Rate Limiting & Ethical Scraping

### 9.1 Rate Limits

To ensure ethical scraping and avoid being blocked:

**iOS App Store (iTunes Search API):**
- Max 20 requests per minute per IP
- Respect HTTP 429 responses (back off exponentially)
- Use proper User-Agent headers
- Implement request queuing

**Google Play Store:**
- Max 30 requests per minute per IP (conservative estimate)
- Randomize delays between requests (2-5 seconds)
- Rotate User-Agent headers
- Parse robots.txt and respect directives

### 9.2 Implementation

```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelay: number;

  constructor(requestsPerMinute: number) {
    this.minDelay = 60000 / requestsPerMinute;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          // Enforce minimum delay
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          if (timeSinceLastRequest < this.minDelay) {
            await this.sleep(this.minDelay - timeSinceLastRequest);
          }

          const result = await fn();
          this.lastRequestTime = Date.now();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) await task();
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const appStoreRateLimiter = new RateLimiter(20); // 20 req/min
const playStoreRateLimiter = new RateLimiter(30); // 30 req/min
```

### 9.3 User-Agent Rotation

```typescript
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
```

---

## 10. Error Handling & Monitoring

### 10.1 Error Types

1. **Scraping Errors:**
   - HTTP 429 (Rate Limited) → Exponential backoff
   - HTTP 403 (Forbidden) → User-Agent rotation, longer delays
   - HTTP 404 (Not Found) → Invalid app ID, log error
   - Timeout → Retry with longer timeout
   - Parse Error → Log HTML response for debugging

2. **Database Errors:**
   - Unique constraint violations → Ignore (keyword already exists)
   - Foreign key violations → Log and alert (data integrity issue)
   - Connection errors → Retry with exponential backoff

3. **Job Processing Errors:**
   - Job timeout → Move to failed queue
   - Max retries exceeded → Alert admin
   - Crash/exception → Log stack trace, mark job as failed

### 10.2 Monitoring & Alerts

**Key Metrics to Monitor:**

1. **Job Success Rate:**
   - Target: >95% success rate for keyword refresh jobs
   - Alert if drops below 90%

2. **Scraping Performance:**
   - Average response time per platform
   - Rate limit hit rate (should be <1%)
   - Parse error rate (should be <0.1%)

3. **Data Freshness:**
   - Alert if any tracked keyword hasn't been refreshed in >48 hours
   - Monitor refresh queue depth (alert if >1000 pending)

4. **User Actions:**
   - Track keyword additions/removals
   - Monitor discovery job completion times
   - Track on-demand refresh requests

**Implementation:**

```typescript
// Use Supabase Edge Functions logging
console.log(JSON.stringify({
  type: 'metric',
  metric: 'keyword_refresh_success',
  keywordId: keyword.id,
  duration: endTime - startTime,
  timestamp: new Date().toISOString()
}));

// For critical errors
console.error(JSON.stringify({
  type: 'error',
  error: 'rate_limit_exceeded',
  platform: 'ios',
  retryAfter: response.headers.get('retry-after'),
  timestamp: new Date().toISOString()
}));
```

---

## 11. Performance Optimization

### 11.1 Caching Strategy

1. **SERP Results:**
   - Cache for 6 hours (same keyword + platform + region)
   - Invalidate on manual refresh

2. **Search Volume Estimates:**
   - Cache for 7 days
   - Update weekly during off-peak hours

3. **App Metadata:**
   - Cache for 24 hours
   - Invalidate when app version changes

```typescript
interface CacheEntry {
  key: string;
  value: any;
  expiresAt: number;
}

class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const { data } = await supabase
      .from('cache')
      .select('value, expires_at')
      .eq('key', key)
      .gt('expires_at', new Date().toISOString())
      .single();

    return data ? data.value : null;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + (ttlSeconds * 1000));

    await supabase.from('cache').upsert({
      key,
      value,
      expires_at: expiresAt.toISOString()
    });
  }
}
```

### 11.2 Database Optimization

1. **Indexes:**
   - Already defined in schema (see Section 4)
   - Monitor slow queries with pg_stat_statements

2. **Partitioning:**
   - Consider partitioning `keyword_rankings` by snapshot_date if data grows large (>10M rows)

3. **Aggregation Tables:**
   - Create materialized view for dashboard stats
   - Refresh daily via cron job

```sql
CREATE MATERIALIZED VIEW keyword_stats_daily AS
SELECT
  k.app_id,
  k.platform,
  k.region,
  COUNT(*) as total_keywords,
  COUNT(*) FILTER (WHERE kr.position <= 10) as top_10_count,
  COUNT(*) FILTER (WHERE kr.position <= 30) as top_30_count,
  COUNT(*) FILTER (WHERE kr.position <= 50) as top_50_count,
  AVG(kr.position) as avg_position,
  SUM(kr.estimated_traffic) as total_estimated_traffic,
  MAX(kr.snapshot_date) as last_snapshot_date
FROM keywords k
LEFT JOIN LATERAL (
  SELECT * FROM keyword_rankings
  WHERE keyword_id = k.id
  ORDER BY snapshot_date DESC
  LIMIT 1
) kr ON true
WHERE k.is_tracked = true
GROUP BY k.app_id, k.platform, k.region;

CREATE UNIQUE INDEX idx_keyword_stats_app_platform ON keyword_stats_daily(app_id, platform, region);

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY keyword_stats_daily;
```

### 11.3 Frontend Optimization

1. **Pagination:**
   - Load 50 keywords per page
   - Use virtual scrolling for large tables

2. **Lazy Loading:**
   - Load charts only when visible (Intersection Observer)
   - Defer loading of historical data until detail page is opened

3. **Debouncing:**
   - Debounce search/filter inputs (300ms)
   - Batch bulk operations

---

## 12. Security Considerations

### 12.1 Row-Level Security (RLS)

All keyword-related tables must enforce RLS to ensure users only access their organization's data:

```sql
-- Enable RLS
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_search_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_keywords ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access keywords for their organization
CREATE POLICY "Users can view own organization keywords"
  ON keywords FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert keywords for own organization"
  ON keywords FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Similar policies for other tables
```

### 12.2 API Authentication

- All API endpoints require valid Supabase JWT token
- Validate organization membership before keyword operations
- Rate limit API requests per user (e.g., 100 req/min)

### 12.3 Scraping Safeguards

- Never expose raw scraped HTML to users (XSS risk)
- Sanitize all app names/descriptions from SERP
- Log all scraping activities for audit trail

---

## 13. Implementation Phases

### Phase 1: Database & Core Backend (Week 1-2)

**Tasks:**
1. Create database schema (tables, indexes, RLS policies)
2. Write database migration scripts
3. Implement `EnhancedSerpScraperService` for iOS and Android
4. Implement `KeywordIntelligenceService` with metrics calculations
5. Set up rate limiting infrastructure
6. Create API endpoints for keywords CRUD
7. Unit tests for core services

**Deliverables:**
- Functional SERP scraping for both platforms
- Keywords can be added/tracked via API
- Ranking snapshots saved to database
- Basic metrics calculated

### Phase 2: Background Jobs & Automation (Week 3)

**Tasks:**
1. Implement `dailyKeywordRefreshJob` with queue processing
2. Set up Supabase cron triggers (or external scheduler)
3. Implement `KeywordDiscoveryService` for auto-discovery
4. Create `autoDiscoveryJob`
5. Error handling and retry logic
6. Monitoring/logging setup
7. Integration tests for jobs

**Deliverables:**
- Keywords auto-refresh every 24 hours
- Auto-discovery runs weekly
- Failed jobs retry with backoff
- Logs available for debugging

### Phase 3: Frontend - Keywords Dashboard (Week 4-5)

**Tasks:**
1. Enhance `keywords.tsx` page with new UI
2. Implement overview stats cards
3. Add charts (position trend, tier breakdown)
4. Create `KeywordsDataTable` component with sorting/filtering
5. Implement "Refresh All" and "Export CSV" actions
6. Build `AddKeywordModal` component
7. Build `DiscoveryWizard` component
8. Connect frontend to backend APIs
9. Loading states, error handling

**Deliverables:**
- Fully functional keywords dashboard
- Users can add, track, and view keywords
- Visual insights via charts
- Discovery wizard for finding new keywords

### Phase 4: Keyword Detail Page & Competitor Analysis (Week 6)

**Tasks:**
1. Create `keyword-detail.tsx` page
2. Implement historical chart with 90-day data
3. Build SERP preview component
4. Implement `CompetitorAnalysisService`
5. Create competitor analysis UI
6. Build `CompetitorAnalysisModal`
7. Integrate competitor keyword discovery

**Deliverables:**
- Detailed keyword analytics page
- Historical trend visualization
- Competitor tracking and analysis
- Keyword gap identification

### Phase 5: Google Play Support & Multi-Region (Week 7)

**Tasks:**
1. Implement Google Play SERP scraper
2. Test scraping across regions (US, UK, CA, AU, DE, etc.)
3. Add region selector UI
4. Handle platform-specific differences
5. Update all services to support both platforms
6. Test end-to-end for Android apps

**Deliverables:**
- Full Android/Google Play support
- Multi-region tracking working
- Platform toggle in UI

### Phase 6: Performance & Polish (Week 8)

**Tasks:**
1. Implement caching layer
2. Create materialized views for dashboard stats
3. Optimize database queries
4. Add pagination to large tables
5. Implement virtual scrolling
6. Load testing and performance tuning
7. UI polish and bug fixes
8. Documentation

**Deliverables:**
- Dashboard loads in <2 seconds
- Can handle 10K+ tracked keywords
- Smooth UX with no lag
- Comprehensive documentation

---

## 14. Testing Strategy

### 14.1 Unit Tests

**Coverage Target: >80%**

Test files:
- `enhanced-serp.service.test.ts`
- `keyword-intelligence.service.test.ts`
- `keyword-discovery.service.test.ts`
- `competitor-analysis.service.test.ts`

Example test:

```typescript
describe('KeywordIntelligenceService', () => {
  describe('calculateVisibilityScore', () => {
    it('should return 0 for position > 50', () => {
      const score = service.calculateVisibilityScore(51, 10000);
      expect(score).toBe(0);
    });

    it('should calculate correct score for position 1', () => {
      const score = service.calculateVisibilityScore(1, 10000);
      expect(score).toBe(10000); // (51-1)*10000/50 = 10000
    });

    it('should calculate correct score for position 25', () => {
      const score = service.calculateVisibilityScore(25, 5000);
      expect(score).toBe(2600); // (51-25)*5000/50 = 2600
    });
  });
});
```

### 14.2 Integration Tests

Test end-to-end flows:

1. **Keyword Addition Flow:**
   - Add keyword via API
   - Trigger refresh
   - Verify ranking snapshot created
   - Check metrics calculated correctly

2. **Discovery Flow:**
   - Run discovery for test app
   - Verify keywords discovered
   - Check confidence scores
   - Ensure no duplicates

3. **Background Job Flow:**
   - Add keywords to queue
   - Run refresh job
   - Verify all processed
   - Check retry logic on failures

### 14.3 Manual Testing Checklist

- [ ] Add keyword manually (iOS + Android)
- [ ] Trigger on-demand refresh
- [ ] View keyword detail page
- [ ] Run auto-discovery wizard
- [ ] Analyze competitor keywords
- [ ] Export keywords to CSV
- [ ] Filter/sort keywords table
- [ ] View charts and metrics
- [ ] Test multi-region support
- [ ] Verify RLS policies (try accessing other org's data)
- [ ] Test rate limiting (trigger many requests)
- [ ] Test error scenarios (invalid app ID, network failures)

---

## 15. Documentation Requirements

### 15.1 Developer Documentation

1. **Architecture Overview:**
   - System diagram
   - Service responsibilities
   - Data flow

2. **API Documentation:**
   - OpenAPI/Swagger spec
   - Example requests/responses
   - Error codes

3. **Database Schema:**
   - ERD diagram
   - Table descriptions
   - Relationship explanations

4. **Deployment Guide:**
   - Environment variables
   - Supabase setup
   - Cron job configuration

### 15.2 User Documentation

1. **Feature Guide:**
   - How to add keywords
   - Understanding metrics (popularity, effectiveness)
   - Using discovery wizard
   - Analyzing competitors

2. **FAQ:**
   - How often are keywords refreshed?
   - What does "visibility score" mean?
   - Why isn't my app showing up for a keyword?
   - How accurate are search volume estimates?

3. **Troubleshooting:**
   - Keyword not tracking
   - Refresh taking too long
   - Missing data

---

## 16. Future Enhancements

Ideas for future iterations:

1. **Advanced Analytics:**
   - Seasonal trend detection
   - Keyword opportunity scoring
   - ROI calculator (cost of ASO vs. traffic gained)
   - Predictive ranking forecasts (ML-based)

2. **Competitive Features:**
   - Automatic competitor detection
   - Competitive gap analysis dashboard
   - Market share estimation by keyword

3. **Keyword Optimization:**
   - A/B testing for keyword changes
   - Keyword grouping/tagging
   - Automated alerts (e.g., "keyword dropped >10 positions")
   - Recommended actions ("add this keyword to app subtitle")

4. **Integrations:**
   - Export to Google Sheets
   - Slack/Email alerts
   - Integration with App Store Connect for metadata updates
   - Integration with attribution platforms (Adjust, AppsFlyer)

5. **Advanced Discovery:**
   - Use Google Search Console data (for websites with ASO)
   - Scrape competitor metadata keywords
   - NLP-based keyword generation

6. **Localization:**
   - Support more regions (100+ countries)
   - Translate keywords automatically
   - Regional keyword recommendations

7. **Scaling:**
   - Support for tracking >100 positions (top 200, top 500)
   - Hourly refresh option for high-priority keywords
   - Real-time ranking changes (websocket-based alerts)

---

## 17. Success Metrics

Define KPIs to measure success of the feature:

1. **Adoption:**
   - % of organizations using keyword tracking
   - Average keywords tracked per app
   - Discovery wizard usage rate

2. **Engagement:**
   - Daily active users on keywords page
   - Average session duration on dashboard
   - Refresh requests per user per day

3. **Data Quality:**
   - % of keywords successfully refreshed daily
   - Average data freshness (time since last update)
   - Scraping error rate

4. **User Satisfaction:**
   - Feature satisfaction score (survey)
   - Support tickets related to keywords (should decrease)
   - User-reported bugs

5. **Business Impact:**
   - Increased user retention (vs. pre-feature)
   - Upsell opportunity (premium tier for advanced features)
   - Competitive positioning (vs. AppTweak, Sensor Tower)

---

## 18. Appendix

### A. Search Volume Estimation Algorithm

Since we don't have access to real search volume data, we use a heuristic-based estimation:

```typescript
function estimateSearchVolume(
  keyword: string,
  platform: 'ios' | 'android',
  serpResults: SerpResultItem[]
): number {
  // Factors:
  // 1. Number of results (more results = more competitive = higher volume)
  // 2. Average rating count of top 10 apps (proxy for category popularity)
  // 3. Keyword characteristics (word count, common terms)

  const resultCount = serpResults.length;
  const top10AvgRatings = _.meanBy(serpResults.slice(0, 10), 'ratingCount') || 0;
  const wordCount = keyword.split(' ').length;

  // Base score from result count
  let volumeScore = Math.min(resultCount * 100, 10000);

  // Adjust based on top app popularity
  if (top10AvgRatings > 50000) volumeScore *= 5;
  else if (top10AvgRatings > 10000) volumeScore *= 3;
  else if (top10AvgRatings > 1000) volumeScore *= 1.5;

  // Longer keywords typically have lower volume
  if (wordCount > 3) volumeScore *= 0.5;
  if (wordCount > 5) volumeScore *= 0.3;

  // Platform adjustment (iOS generally higher volume)
  if (platform === 'android') volumeScore *= 0.8;

  return Math.round(volumeScore);
}
```

**Validation:** Periodically compare estimates with third-party tools (AppTweak, Sensor Tower) for calibration.

### B. Popularity Score Calculation

```typescript
function calculatePopularityScore(estimatedSearchVolume: number): number {
  // Normalize search volume to 0-100 scale
  // Using logarithmic scale for better distribution

  if (estimatedSearchVolume === 0) return 0;

  const logVolume = Math.log10(estimatedSearchVolume);
  const score = Math.min(100, (logVolume / 6) * 100); // 6 = log10(1M)

  return Math.round(score);
}

// Examples:
// 100 searches/month → ~33 score
// 1,000 searches/month → ~50 score
// 10,000 searches/month → ~67 score
// 100,000 searches/month → ~83 score
// 1,000,000 searches/month → ~100 score
```

### C. Competition Level Calculation

```typescript
function calculateCompetitionLevel(
  serpResults: SerpResultItem[]
): 'low' | 'medium' | 'high' | 'very_high' {
  // Analyze top 10 apps' strength
  const top10 = serpResults.slice(0, 10);

  // Metrics:
  // - Average rating count (higher = more established apps)
  // - Average rating score (higher = better quality apps)
  // - Presence of "big players" (apps with >100K ratings)

  const avgRatingCount = _.meanBy(top10, 'ratingCount') || 0;
  const avgRating = _.meanBy(top10, 'rating') || 0;
  const bigPlayers = top10.filter(app => (app.ratingCount || 0) > 100000).length;

  if (bigPlayers >= 5 || avgRatingCount > 50000) return 'very_high';
  if (bigPlayers >= 2 || avgRatingCount > 10000) return 'high';
  if (avgRatingCount > 1000) return 'medium';
  return 'low';
}
```

---

## 19. Conclusion

This technical specification provides a comprehensive blueprint for building a production-ready keyword tracking and analysis system that rivals industry leaders like AppTweak and Sensor Tower. The implementation is broken into 8-week phases, with clear deliverables at each stage.

**Key Takeaways:**

1. **Ethical Scraping:** Rate-limited, respectful of platform guidelines
2. **Scalable Architecture:** Can handle 10K+ keywords with background jobs
3. **Comprehensive Metrics:** Popularity, effectiveness, visibility, traffic estimates
4. **Intelligent Discovery:** Auto-discovery + competitor analysis + AI suggestions
5. **Multi-Platform:** iOS + Android with multi-region support
6. **User-Friendly UI:** Dashboard, detail pages, wizards, visualizations

**Next Steps:**

1. Review and approve this specification
2. Set up development environment
3. Create feature branch
4. Begin Phase 1 implementation
5. Regular check-ins and demos at end of each phase

For questions or clarifications, please contact the development team.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Author:** Claude AI
**Approved By:** [Pending]
