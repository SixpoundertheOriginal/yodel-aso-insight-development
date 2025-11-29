# ASO Audit System - Knowledge Base & Development Workflow

## 🎯 System Goal & Vision

### Primary Objective
**Maximize App Store algorithmic visibility through strategic keyword and combo optimization.**

The ASO Audit System is designed to help app developers and marketers optimize their App Store metadata (title, subtitle, and eventually description) to improve discoverability and ranking in the App Store search algorithm.

### Core Philosophy
- **Algorithmic Visibility First**: Focus on what the App Store algorithm sees and ranks, not what humans read
- **Data-Driven Decisions**: Provide objective metrics and scores (0-100 scale) to guide optimization
- **Competitive Intelligence**: Identify gaps and opportunities by analyzing what successful competitors do
- **Strategic Keyword Combinations**: Prioritize keywords that appear in multiple high-value combos (not just frequency)
- **Noise Filtering**: Distinguish between strategic keywords (e.g., "language learning") and noise words (e.g., "the", "and")

---

## 📐 System Architecture

### 1. Metadata Audit Engine (Server-Side)
**Location**: `supabase/functions/_shared/metadata-audit-engine.ts`

**Purpose**: Core analysis engine that evaluates App Store metadata for algorithmic visibility.

#### Key Components:

##### A. Combo Coverage Analysis
- **N-gram Generation**: Extract 2-word, 3-word, and 4+ word combinations from title and subtitle
- **Deduplication**: Remove duplicate combos (case-insensitive)
- **Categorization**: Classify combos by length (2-word, 3-word, 4+)
- **Scoring**: Rate combo coverage against best practices

**Algorithm**:
```typescript
// Extract all possible N-grams from metadata
const title = "Duolingo: Language Learning App";
const subtitle = "Learn Spanish, French & More";

// 2-word combos: ["duolingo language", "language learning", "learning app", ...]
// 3-word combos: ["duolingo language learning", "language learning app", ...]
// 4+ combos: ["duolingo language learning app", ...]
```

##### B. Keyword Coverage Analysis
- **Unique Keyword Extraction**: Identify all unique keywords used across combos
- **Noise Filtering**: Remove common words ("the", "and", "for", "with", etc.)
- **Coverage Scoring**: Evaluate keyword diversity and strategic use

**Noise Filter Categories**:
- Articles: the, a, an
- Conjunctions: and, or, but
- Prepositions: for, with, to, in, on
- Common verbs: is, are, get, make
- App-specific noise: app, apps, free, new

##### C. Strategic Keyword Frequency Analysis
- **Keyword-to-Combo Mapping**: Track which keywords appear in multiple combos
- **Frequency Calculation**: Count total uses, 2-word uses, 3-word uses, 4+ uses
- **Sample Collection**: Store example combos for each keyword
- **Top-N Ranking**: Sort by total combo count (default: top 20)

**Why This Matters**:
```
Keyword: "language"
- Total Combos: 12
- 2-word combos: 4 ("language learning", "language app", ...)
- 3-word combos: 5 ("learn language fast", "language learning app", ...)
- 4+ combos: 3 ("best language learning app", ...)

Insight: "language" is strategic because it appears in many valuable combos,
not just because it's used frequently.
```

##### D. Overall Scoring Algorithm
- **Combo Score (40%)**: Quality and quantity of keyword combinations
- **Keyword Score (30%)**: Diversity and strategic use of unique keywords
- **Frequency Score (30%)**: How keywords are distributed across combos
- **Final Score**: Weighted average (0-100 scale)

**Scoring Rubric**:
- 90-100: Exceptional - Industry-leading optimization
- 80-89: Excellent - Highly competitive metadata
- 70-79: Good - Solid optimization, room for improvement
- 60-69: Fair - Moderate optimization, significant gaps
- Below 60: Poor - Major optimization needed

---

### 2. Competitive Intelligence System

#### Purpose
Identify keyword and combo opportunities by analyzing up to 10 competitors.

#### Components:

##### A. Edge Function: `analyze-competitors`
**Location**: `supabase/functions/analyze-competitors/index.ts`

**Features**:
- Rate-limited fetching (2 concurrent requests, 1s delay between batches)
- Retry logic with exponential backoff (1s, 2s, 3s)
- Full metadata audit for target app + all competitors
- Gap analysis with 4 metrics

**Rate Limiting Rationale**:
```
Without rate limiting:
- 10 concurrent requests to iTunes API
- Risk of 429 (Too Many Requests) errors
- Potential IP blocking

With rate limiting (2 concurrent, 1s delay):
- Batches: [1,2] delay [3,4] delay [5,6] delay [7,8] delay [9,10]
- Total time: ~5 seconds for 10 apps
- Safe for production, no blocking risk
```

##### B. Gap Analysis Engine

**Metric 1: Missing Keywords**
- **Definition**: Keywords competitors use but target app doesn't
- **Opportunity Score Formula**:
  ```typescript
  score = (competitorUsage / totalCompetitors) * 50 +  // 50%: adoption rate
          (avgFrequency / 10) * 50                      // 50%: usage intensity
  // Range: 0-100 (higher = better ROI)
  ```
- **Output**: Top 15 missing keywords with scores, competitor counts, sample apps

**Metric 2: Missing Combos**
- **Definition**: Keyword combinations competitors have but target app doesn't
- **Opportunity Score Formula**:
  ```typescript
  score = (competitorUsage / totalCompetitors) * 100
  // Range: 0-100 (higher = more widely adopted)
  ```
- **Output**: Top 15 missing combos with scores, competitor counts, sample apps

**Metric 3: Frequency Gaps**
- **Definition**: Keywords target uses less frequently than competitors
- **Gap Calculation**:
  ```typescript
  gap = competitorAvgFrequency - targetFrequency
  // Only show if gap > 1
  ```
- **Recommendation**: Auto-generated suggestions (e.g., "Consider increasing usage from 2 to 5")
- **Output**: Top 15 gaps with current vs competitor avg, recommendations

**Metric 4: Summary Statistics**
- Total missing keywords
- Total missing combos
- Total frequency gaps
- Average competitor metrics vs target app

##### C. Frontend Components

**File**: `src/components/AppAudit/CompetitiveIntelligence/CompetitiveIntelligenceTab.tsx`

**UI States**:
1. **Empty**: No metadata available
2. **CTA**: Beautiful gradient card explaining feature benefits
3. **Loading**: Progress bar with real-time status (5% → 20% → 80% → 100%)
4. **Error**: Error message with retry button
5. **Results**: Summary cards + tabs (Comparison vs Gaps)

**File**: `src/components/AppAudit/CompetitiveIntelligence/CompetitorSearchModal.tsx`

**Features**:
- Live iTunes API search (debounced 500ms)
- App cards with icon, name, developer, rating
- Add/remove competitors (max 10 validation)
- Selected competitors display as purple badges

**File**: `src/components/AppAudit/CompetitiveIntelligence/ComparisonTable.tsx`

**Features**:
- Sortable columns (name, keywordCount, comboCount, overallScore)
- Comparison indicators (TrendingUp/Down with % difference)
- Color-coded scores (green > 80, blue 60-79, gray < 60)
- Competitor average row for quick benchmarking
- Target app highlighted with purple background

**File**: `src/components/AppAudit/CompetitiveIntelligence/GapAnalysisPanels.tsx`

**Features**:
- Quick Wins card: Top 3 opportunities at a glance
- Missing Keywords table: Top 15, opportunity scores, copy-to-clipboard
- Missing Combos table: Top 15, opportunity scores, copy-to-clipboard
- Frequency Gaps table: Top 15, gap sizes, recommendations
- Color-coded opportunity badges (green ≥80, blue ≥60, purple ≥40, gray <40)

---

## 🔧 Technical Infrastructure

### 1. Caching Strategy

#### A. Perpetual Cache: `app_metadata_cache`
**Purpose**: Store raw App Store metadata indefinitely with version tracking

**Schema**:
```sql
app_metadata_cache (
  app_store_id TEXT PRIMARY KEY,
  country TEXT,
  metadata JSONB,
  version_hash TEXT,  -- Hash of (version, lastModifiedDate)
  last_fetched_at TIMESTAMP,
  organization_id UUID
)
```

**Logic**:
```typescript
// Check cache
const cached = await getCachedMetadata(appStoreId, country);
if (cached && !forceRefresh) {
  // Fetch fresh metadata to check version
  const fresh = await fetchFromAppStore(appStoreId, country);

  if (cached.version_hash === fresh.version_hash) {
    return cached.metadata; // Use cache
  }
}

// Cache miss or version changed - fetch fresh
```

#### B. Hybrid Cache: `competitor_comparison_cache`
**Purpose**: Cache competitor analysis results for 24 hours

**Schema**:
```sql
competitor_comparison_cache (
  id UUID PRIMARY KEY,
  target_app_store_id TEXT,
  competitor_app_store_ids TEXT[],
  cache_key TEXT UNIQUE,  -- Hash of target + sorted competitors
  analysis_result JSONB,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,   -- 24h TTL
  organization_id UUID
)
```

**Logic**:
```typescript
// Generate cache key
const cacheKey = generateCacheKey(targetAppId, competitorIds.sort());

// Check if valid (not expired)
const cached = await query(`
  SELECT * FROM competitor_comparison_cache
  WHERE cache_key = $1
  AND expires_at > NOW()
  AND organization_id = $2
`, [cacheKey, organizationId]);

if (cached && !forceRefresh) {
  return cached.analysis_result; // Use cache
}

// Cache miss or expired - run fresh analysis
```

**Why 24h TTL?**
- Metadata changes are infrequent (weeks/months between updates)
- 24h balances freshness with performance
- Manual refresh button allows on-demand updates

#### C. Audit Snapshots: `audit_snapshots`
**Purpose**: Historical tracking of audit results for monitored apps

**Schema**:
```sql
audit_snapshots (
  id UUID PRIMARY KEY,
  monitored_app_id UUID REFERENCES monitored_apps(id),
  audit_result JSONB,
  overall_score INTEGER,
  metadata_snapshot JSONB,
  created_at TIMESTAMP,
  organization_id UUID
)
```

**Usage**:
- Stored after every audit run
- Enables trend tracking (score changes over time)
- Supports before/after comparisons when metadata is updated

---

### 2. Rate Limiting & Retry Logic

#### A. Batch Processing with Delays
**File**: `src/services/competitor-metadata.service.ts`

**Implementation**:
```typescript
export async function fetchMultipleCompetitorMetadataWithRateLimit(
  inputs: CompetitorMetadataInput[],
  options?: RateLimitOptions
) {
  const { batchSize = 2, delayBetweenBatches = 1000 } = options;

  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);

    // Process batch concurrently
    const batchResults = await Promise.all(
      batch.map((input) => fetchCompetitorMetadata(input))
    );

    results.push(...batchResults);

    // Delay before next batch (except for last batch)
    if (i + batchSize < inputs.length) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}
```

**Configuration**:
- **Batch Size**: 2 concurrent requests (safe for iTunes API)
- **Delay**: 1000ms (1 second) between batches
- **Total Time**: ~5 seconds for 10 apps

#### B. Exponential Backoff Retry
**File**: `src/services/competitor-metadata.service.ts`

**Implementation**:
```typescript
async function fetchWithRetry(
  appStoreId: string,
  country: string,
  options: RetryOptions
): Promise<CompetitorMetadataResult> {
  const { maxRetries = 3, retryDelay = 1000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await fetchFromAppStore(appStoreId, country);

    if (!('error' in result)) {
      return result; // Success
    }

    // Only retry network errors (not API errors like 404)
    if (!retryableErrorCodes.includes(result.code)) {
      return result; // Don't retry
    }

    // Exponential backoff: 1s, 2s, 3s
    if (attempt < maxRetries) {
      const delay = retryDelay * attempt;
      await sleep(delay);
    }
  }
}
```

**Retry Strategy**:
- **Network Errors**: Retry (transient failures)
- **API Errors (404, 400)**: Don't retry (permanent failures)
- **Delays**: 1s, 2s, 3s (exponential backoff)
- **Max Retries**: 3 attempts

---

### 3. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                         │
│  (App Audit Hub → Competitive Intelligence Tab)             │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 COMPETITOR SEARCH MODAL                      │
│  - iTunes API Search (debounced 500ms)                      │
│  - Select up to 10 competitors                              │
│  - Click "Start Analysis"                                   │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           COMPETITIVE ANALYSIS V2 SERVICE                    │
│  File: competitive-analysis-v2.service.ts                   │
│  - Build request payload                                    │
│  - Call analyze-competitors edge function                   │
│  - Track progress (5% → 20% → 80% → 100%)                  │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: analyze-competitors              │
│  File: supabase/functions/analyze-competitors/index.ts      │
│  Step 1: Check cache (24h TTL)                             │
│  Step 2: Fetch target + competitors (rate-limited)          │
│  Step 3: Run MetadataAuditEngine.evaluate() for all         │
│  Step 4: Compute gap analysis (4 metrics)                   │
│  Step 5: Store in cache                                     │
│  Step 6: Return results                                     │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 METADATA AUDIT ENGINE                        │
│  File: supabase/functions/_shared/metadata-audit-engine.ts  │
│  - Extract combos (2-word, 3-word, 4+)                     │
│  - Extract keywords (with noise filtering)                  │
│  - Analyze keyword frequency (keyword-to-combo mapping)     │
│  - Calculate scores (combo, keyword, frequency, overall)    │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   GAP ANALYSIS ENGINE                        │
│  File: supabase/functions/analyze-competitors/index.ts      │
│  - Missing Keywords (with opportunity scores)               │
│  - Missing Combos (with opportunity scores)                 │
│  - Frequency Gaps (with recommendations)                    │
│  - Summary Statistics                                        │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  RESULTS VISUALIZATION                       │
│  Components:                                                 │
│  - ComparisonTable: Side-by-side metrics                    │
│  - GapAnalysisPanels: 4 detailed gap views                  │
│  Features:                                                   │
│  - Sortable columns                                          │
│  - Color-coded scores                                        │
│  - Copy-to-clipboard                                         │
│  - Quick wins summary                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Development Workflow

### 1. Adding New Metadata Fields

**Example**: Adding Description Analysis

#### Step 1: Update MetadataAuditEngine
**File**: `supabase/functions/_shared/metadata-audit-engine.ts`

```typescript
export interface MetadataAuditInput {
  title: string;
  subtitle?: string;
  description?: string; // ✅ NEW
  country?: string;
}

// In evaluate() method:
const descriptionCombos = input.description
  ? this.extractCombos(input.description)
  : { twoWord: [], threeWord: [], fourPlus: [], all: [] };

// Merge with title + subtitle combos
const allCombos = [
  ...titleCombos.all,
  ...subtitleCombos.all,
  ...descriptionCombos.all, // ✅ NEW
];
```

#### Step 2: Update Scoring Logic
```typescript
// Add description weight to scoring
const descriptionScore = this.scoreDescriptionCoverage(descriptionCombos);

// Update overall score calculation
const overallScore = Math.round(
  (comboScore * 0.30) +      // Reduced from 40%
  (keywordScore * 0.25) +    // Reduced from 30%
  (frequencyScore * 0.25) +  // Reduced from 30%
  (descriptionScore * 0.20)  // ✅ NEW
);
```

#### Step 3: Update Gap Analysis
**File**: `supabase/functions/analyze-competitors/index.ts`

```typescript
// Description combos are already included in allCombos
// Gap analysis will automatically include description-based keywords/combos
```

#### Step 4: Update Frontend Types
**File**: `src/types/aso.ts`

```typescript
export interface ScrapedMetadata {
  title: string;
  subtitle?: string;
  description?: string; // ✅ NEW
  // ...
}
```

#### Step 5: Test End-to-End
```bash
# 1. Deploy updated edge function
supabase functions deploy analyze-competitors

# 2. Test with app that has description
curl -X POST https://<project>.supabase.co/functions/v1/analyze-competitors \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "targetAppId": "570060128",
    "competitorAppStoreIds": ["1623306327"],
    "organizationId": "test-org-123"
  }'

# 3. Verify frontend UI updates
npm run dev
# Navigate to App Audit → Competitive Intelligence
```

---

### 2. Adding New Gap Metrics

**Example**: Adding "Keyword Position Gap" (where competitors place keywords)

#### Step 1: Define New Metric Interface
**File**: `src/types/competitiveIntelligence.ts`

```typescript
export interface KeywordPositionGap {
  keyword: string;
  targetPosition: 'title' | 'subtitle' | 'description' | 'not-used';
  competitorPositions: {
    appName: string;
    position: 'title' | 'subtitle' | 'description';
    frequency: number;
  }[];
  recommendation: string; // "Consider moving 'language' to title"
}

export interface GapAnalysisResult {
  missingKeywords: MissingKeyword[];
  missingCombos: MissingCombo[];
  frequencyGaps: FrequencyGap[];
  positionGaps: KeywordPositionGap[]; // ✅ NEW
  summary: GapAnalysisSummary;
}
```

#### Step 2: Implement Analysis Logic
**File**: `supabase/functions/analyze-competitors/index.ts`

```typescript
function analyzePositionGaps(
  targetAudit: MetadataAuditResult,
  competitorAudits: CompetitorAuditResult[]
): KeywordPositionGap[] {
  const gaps: KeywordPositionGap[] = [];

  // For each keyword in target metadata
  const targetKeywords = new Set([
    ...extractKeywords(targetMetadata.title),
    ...extractKeywords(targetMetadata.subtitle || ''),
  ]);

  for (const keyword of targetKeywords) {
    const targetPos = getKeywordPosition(keyword, targetMetadata);
    const competitorPositions = competitorAudits.map(comp => ({
      appName: comp.name,
      position: getKeywordPosition(keyword, comp.metadata),
      frequency: countKeywordUses(keyword, comp.metadata),
    }));

    // If most competitors use in title but target uses in subtitle
    const mostUseInTitle = competitorPositions.filter(
      cp => cp.position === 'title'
    ).length > competitorAudits.length / 2;

    if (mostUseInTitle && targetPos !== 'title') {
      gaps.push({
        keyword,
        targetPosition: targetPos,
        competitorPositions,
        recommendation: `Consider moving "${keyword}" to title for better visibility`,
      });
    }
  }

  return gaps.slice(0, 15); // Top 15
}

// In main analyzeGaps function:
const positionGaps = analyzePositionGaps(targetAudit, competitorAudits);

return {
  missingKeywords,
  missingCombos,
  frequencyGaps,
  positionGaps, // ✅ NEW
  summary: {
    // ... existing
    totalPositionGaps: positionGaps.length, // ✅ NEW
  },
};
```

#### Step 3: Add UI Panel
**File**: `src/components/AppAudit/CompetitiveIntelligence/GapAnalysisPanels.tsx`

```typescript
{/* Position Gaps Table - NEW */}
<Card className="bg-zinc-900/50 border-zinc-800">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="text-sm font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <Target className="h-4 w-4 text-yellow-400" />
          Position Gaps
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500 mt-1">
          Keywords that could be moved to higher-visibility positions
        </CardDescription>
      </div>
      <Badge variant="outline" className="text-xs border-yellow-400/30 text-yellow-400 bg-yellow-900/10">
        {gapAnalysis.positionGaps.length} Opportunities
      </Badge>
    </div>
  </CardHeader>
  <CardContent className="pt-0">
    {gapAnalysis.positionGaps.length > 0 ? (
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Keyword</TableHead>
              <TableHead className="text-center">Your Position</TableHead>
              <TableHead className="text-center">Competitor Position</TableHead>
              <TableHead className="text-left">Recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gapAnalysis.positionGaps.slice(0, 15).map((gap, index) => (
              <TableRow key={index} className="border-zinc-800 hover:bg-zinc-800/30">
                <TableCell className="text-xs text-zinc-500 font-mono">{index + 1}</TableCell>
                <TableCell className="font-medium text-zinc-200">{gap.keyword}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs">
                    {gap.targetPosition}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
                    {gap.competitorPositions[0].position}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-zinc-400">
                  {gap.recommendation}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    ) : (
      <div className="p-8 text-center">
        <p className="text-zinc-500">No position gaps found - optimal keyword placement!</p>
      </div>
    )}
  </CardContent>
</Card>
```

---

### 3. Extending to New Platforms (Google Play Store)

#### Step 1: Abstract Platform-Specific Logic
**Create**: `supabase/functions/_shared/platform-adapters/`

```typescript
// itunes-adapter.ts
export class iTunesAdapter implements PlatformAdapter {
  async fetchMetadata(appId: string, country: string): Promise<AppMetadata> {
    // Existing iTunes API logic
  }

  getMetadataFields(): string[] {
    return ['title', 'subtitle']; // iOS-specific
  }
}

// google-play-adapter.ts
export class GooglePlayAdapter implements PlatformAdapter {
  async fetchMetadata(appId: string, country: string): Promise<AppMetadata> {
    // Google Play API logic (requires API key)
    const response = await fetch(
      `https://androidapps.googleapis.com/v1/applications/${appId}?hl=${country}`
    );
    // Parse response
  }

  getMetadataFields(): string[] {
    return ['title', 'shortDescription', 'fullDescription']; // Android-specific
  }
}
```

#### Step 2: Update MetadataAuditEngine
```typescript
export interface MetadataAuditInput {
  title: string;
  subtitle?: string;        // iOS
  shortDescription?: string; // Android
  fullDescription?: string;  // Android
  platform: 'ios' | 'android';
  country?: string;
}

// In evaluate():
const primaryText = input.platform === 'ios'
  ? input.subtitle
  : input.shortDescription;

const descriptionText = input.platform === 'ios'
  ? input.description
  : input.fullDescription;
```

#### Step 3: Update Frontend
**File**: `src/components/AppAudit/CompetitorSearchModal.tsx`

```typescript
// Add platform selector
<Select value={platform} onValueChange={setPlatform}>
  <SelectItem value="ios">App Store (iOS)</SelectItem>
  <SelectItem value="android">Google Play (Android)</SelectItem>
</Select>

// Update search logic
const performSearch = async (query: string) => {
  if (platform === 'ios') {
    return await searchApps(query, country, 10);
  } else {
    return await searchGooglePlayApps(query, country, 10);
  }
};
```

---

### 4. Testing Workflow

#### Unit Tests (Backend)
**Create**: `supabase/functions/_shared/__tests__/metadata-audit-engine.test.ts`

```typescript
import { describe, it, expect } from 'jsr:@std/testing/bdd';
import { MetadataAuditEngine } from '../metadata-audit-engine.ts';

describe('MetadataAuditEngine', () => {
  it('should extract 2-word combos correctly', () => {
    const result = MetadataAuditEngine.evaluate({
      title: 'Language Learning App',
      platform: 'ios',
    });

    expect(result.comboCoverage.twoWordCombos).toContain('language learning');
    expect(result.comboCoverage.twoWordCombos).toContain('learning app');
  });

  it('should filter noise words from keywords', () => {
    const result = MetadataAuditEngine.evaluate({
      title: 'The Best App for Learning',
      platform: 'ios',
    });

    const keywords = result.keywordCoverage.uniqueKeywords;
    expect(keywords).not.toContain('the');
    expect(keywords).not.toContain('for');
    expect(keywords).toContain('best');
    expect(keywords).toContain('learning');
  });

  it('should calculate opportunity scores correctly', () => {
    // Test with known inputs
    const score = calculateOpportunityScore(
      5,  // usedByCompetitors
      10, // totalCompetitors
      8   // avgFrequency
    );

    // Expected: (5/10)*50 + (8/10)*50 = 25 + 40 = 65
    expect(score).toBe(65);
  });
});
```

#### Integration Tests (Edge Function)
**Create**: `supabase/functions/analyze-competitors/__tests__/integration.test.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

Deno.test('analyze-competitors: should analyze Duolingo vs Babbel', async () => {
  const request = new Request('http://localhost:8000', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetAppId: '570060128',  // Duolingo
      competitorAppStoreIds: ['1623306327'], // Babbel
      organizationId: 'test-org',
    }),
  });

  const response = await handler(request);
  const data = await response.json();

  expect(data.success).toBe(true);
  expect(data.data.competitors.length).toBe(1);
  expect(data.data.gapAnalysis.missingKeywords.length).toBeGreaterThan(0);
});
```

#### E2E Tests (Frontend)
**Create**: `cypress/e2e/competitive-intelligence.cy.ts`

```typescript
describe('Competitive Intelligence Flow', () => {
  it('should complete full analysis flow', () => {
    // 1. Navigate to app audit
    cy.visit('/app-audit/duolingo');

    // 2. Click Competitive Intelligence tab
    cy.contains('Competitive Intelligence').click();

    // 3. Click Select Competitors
    cy.contains('Select Competitors').click();

    // 4. Search for Babbel
    cy.get('input[placeholder="Search apps..."]').type('Babbel');
    cy.wait(600); // Debounce

    // 5. Add competitor
    cy.contains('Babbel').parents('.app-card').find('button').contains('Add').click();

    // 6. Start analysis
    cy.contains('Start Analysis').click();

    // 7. Wait for results
    cy.contains('Analysis complete!', { timeout: 15000 });

    // 8. Verify results display
    cy.contains('Missing Keywords').should('be.visible');
    cy.contains('Missing Combos').should('be.visible');

    // 9. Switch to Comparison tab
    cy.contains('Comparison').click();
    cy.contains('Side-by-Side Comparison').should('be.visible');
  });
});
```

---

## 📊 Key Metrics & Success Criteria

### Audit Quality Metrics
- **Overall Score**: 0-100 (target: 80+)
- **Combo Count**: 2-word, 3-word, 4+ (target: 15+ total)
- **Keyword Count**: Unique strategic keywords (target: 20+)
- **Keyword Frequency**: Top keywords in multiple combos (target: top 5 keywords in 5+ combos each)

### Competitive Intelligence Metrics
- **Missing Keywords**: Opportunities to add (target: identify top 10)
- **Missing Combos**: Opportunities to add (target: identify top 10)
- **Frequency Gaps**: Keywords to use more (target: identify top 5)
- **Opportunity Scores**: 80+ = high ROI, 60-79 = medium ROI, <60 = low ROI

### Performance Metrics
- **Analysis Time**: Target <10 seconds for 10 competitors
- **Cache Hit Rate**: Target >70% for repeat analyses
- **API Success Rate**: Target >95% (with retry logic)
- **Rate Limit Compliance**: 0 throttling errors

---

## 🔄 Future Enhancement Roadmap

### Phase 1: Foundation ✅ COMPLETE
- [x] Metadata Audit Engine (title + subtitle)
- [x] Combo coverage analysis (2-word, 3-word, 4+)
- [x] Keyword coverage analysis (with noise filtering)
- [x] Strategic keyword frequency analysis
- [x] Overall scoring algorithm
- [x] Competitive intelligence (up to 10 competitors)
- [x] Gap analysis (4 metrics: missing keywords, combos, frequency, summary)
- [x] Rate limiting + retry logic
- [x] Frontend UI (search, comparison, gaps, quick wins)

### Phase 2: Caching & Storage (Next)
- [ ] Implement `competitor_comparison_cache` 24h TTL
- [ ] Implement `app_competitors` table storage for monitored apps
- [ ] Auto-refresh when monitored app metadata changes
- [ ] Manual refresh button with loading state
- [ ] Cache invalidation on forceRefresh

### Phase 3: Advanced Analysis
- [ ] Description analysis (iOS + Android)
- [ ] Keyword position gap analysis (title vs subtitle placement)
- [ ] Trend tracking (score changes over time)
- [ ] Historical comparison charts
- [ ] Competitor alerts (when competitor metadata changes)
- [ ] Auto-suggest competitors based on keyword overlap

### Phase 4: Export & Reporting
- [ ] Export gap analysis to CSV
- [ ] Export comparison table to Excel
- [ ] PDF report generation with charts
- [ ] Email digest (weekly competitor changes)
- [ ] Slack/Discord webhooks for alerts

### Phase 5: Multi-Platform
- [ ] Google Play Store adapter
- [ ] Platform-specific scoring adjustments
- [ ] Cross-platform comparison (iOS vs Android strategies)
- [ ] Unified dashboard for multi-platform apps

### Phase 6: AI-Powered Insights
- [ ] GPT-4 powered keyword suggestions
- [ ] Automated metadata generation
- [ ] Sentiment analysis of competitor reviews
- [ ] Predictive trend analysis (emerging keywords)
- [ ] Personalized optimization recommendations

---

## 📝 Best Practices

### When Adding New Features
1. **Server-Side First**: Implement analysis logic in `MetadataAuditEngine` (edge function)
2. **Type Safety**: Update TypeScript types in `src/types/` before implementation
3. **Cache Strategy**: Decide if new data should be cached (perpetual vs TTL)
4. **Rate Limiting**: Always batch external API calls with delays
5. **Error Handling**: Use try-catch with specific error codes, implement retries for transient failures
6. **Testing**: Write unit tests for algorithms, integration tests for edge functions, E2E for UI flows
7. **Documentation**: Update this file with new metrics, algorithms, and workflows

### Code Organization
- **Edge Functions**: `supabase/functions/` (server-side logic)
- **Shared Utils**: `supabase/functions/_shared/` (reusable across functions)
- **Frontend Services**: `src/services/` (API calls, business logic)
- **Frontend Components**: `src/components/AppAudit/` (UI components)
- **Types**: `src/types/` (TypeScript interfaces)
- **Config**: `src/config/` (feature flags, constants)

### Performance Optimization
- **Lazy Load**: Only fetch data when tab is active
- **Debouncing**: Use 500ms debounce for search inputs
- **Batch Processing**: Group API calls with rate limiting (2 concurrent, 1s delay)
- **Caching**: Check cache before fetching (perpetual for metadata, 24h for analysis)
- **Progressive Enhancement**: Show loading states, progress bars, optimistic UI updates

---

## 🎓 Learning Resources

### App Store Optimization
- [Apple Search Ads Keywords](https://searchads.apple.com/help/keywords/)
- [App Store Search Algorithm](https://developer.apple.com/app-store/search/)
- [ASO Best Practices](https://developer.apple.com/app-store/product-page/)

### Technical Implementation
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Deno Runtime](https://deno.land/manual)
- [React Query (TanStack)](https://tanstack.com/query/latest)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### Algorithm Design
- [N-gram Generation](https://en.wikipedia.org/wiki/N-gram)
- [TF-IDF for Keyword Weighting](https://en.wikipedia.org/wiki/Tf%E2%80%93idf)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Opportunity Scoring Models](https://en.wikipedia.org/wiki/Scoring_algorithm)

---

## 🔗 Related Files

### Core Engine
- `supabase/functions/_shared/metadata-audit-engine.ts` - Main audit logic
- `supabase/functions/metadata-audit-v2/index.ts` - Edge function wrapper

### Competitive Intelligence
- `supabase/functions/analyze-competitors/index.ts` - Competitor analysis edge function
- `src/services/competitive-analysis-v2.service.ts` - Frontend service layer
- `src/components/AppAudit/CompetitiveIntelligence/` - UI components

### Infrastructure
- `src/services/competitor-metadata.service.ts` - Rate-limited fetching
- `src/services/competitor-audit.service.ts` - Batch audit processing
- `src/config/auditFeatureFlags.ts` - Feature toggles

### Documentation
- `COMPETITIVE_INTELLIGENCE_COMPLETE.md` - Feature completion doc
- `ASO_AUDIT_V2_SCOPE_SPLIT.md` - v2.0 vs v2.1 scope definitions
- `test-analyze-competitors.md` - Edge function testing guide

---

**Last Updated**: 2025-11-29
**Version**: 2.1.0
**Status**: Production-Ready
