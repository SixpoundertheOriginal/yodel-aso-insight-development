# ASO Audit System - API Reference

**Version**: 2.1.0
**Last Updated**: 2025-11-29

---

## Table of Contents

1. [Edge Functions](#edge-functions)
   - [metadata-audit-v2](#metadata-audit-v2)
   - [analyze-competitors](#analyze-competitors)
   - [appstore-metadata](#appstore-metadata)
   - [appstore-html-fetch](#appstore-html-fetch)
2. [Frontend Services](#frontend-services)
   - [competitive-analysis-v2.service](#competitive-analysis-v2service)
   - [competitor-metadata.service](#competitor-metadataservice)
   - [competitor-audit.service](#competitor-auditservice)
3. [Core Engine](#core-engine)
   - [MetadataAuditEngine](#metadataauditengine)
4. [Type Definitions](#type-definitions)

---

# Edge Functions

## metadata-audit-v2

**Endpoint**: `https://<project>.supabase.co/functions/v1/metadata-audit-v2`
**Method**: `POST`
**Authentication**: Required (Supabase Auth JWT)

### Description
Performs comprehensive metadata audit analysis for a single app, evaluating title and subtitle for algorithmic visibility optimization.

### Request Body

```typescript
interface MetadataAuditV2Request {
  appStoreId: string;        // iTunes App Store ID
  country?: string;          // ISO 3166-1 alpha-2 (default: 'us')
  forceRefresh?: boolean;    // Bypass cache (default: false)
  organizationId: string;    // Organization UUID for RLS
}
```

### Example Request

```bash
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/metadata-audit-v2 \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "appStoreId": "570060128",
    "country": "us",
    "forceRefresh": false,
    "organizationId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### Response

```typescript
interface MetadataAuditV2Response {
  success: boolean;
  data?: {
    metadata: ScrapedMetadata;
    audit: UnifiedMetadataAuditResult;
  };
  error?: {
    message: string;
    code: string;
  };
}
```

### Success Response Example

```json
{
  "success": true,
  "data": {
    "metadata": {
      "appId": "570060128",
      "title": "Duolingo: Language Learning",
      "subtitle": "Learn Spanish, French & More",
      "developer": "Duolingo, Inc.",
      "country": "us"
    },
    "audit": {
      "overallScore": 85,
      "comboCoverage": {
        "totalCombos": 18,
        "twoWordCombos": ["duolingo language", "language learning", ...],
        "threeWordCombos": ["duolingo language learning", ...],
        "fourPlusCombos": [],
        "score": 80
      },
      "keywordCoverage": {
        "totalUniqueKeywords": 22,
        "uniqueKeywords": ["duolingo", "language", "learning", ...],
        "score": 85
      },
      "keywordFrequency": [
        {
          "keyword": "language",
          "totalCombos": 12,
          "twoWordCombos": 4,
          "threeWordCombos": 5,
          "fourPlusCombos": 3,
          "sampleCombos": ["language learning", "learn language", ...]
        }
      ]
    }
  }
}
```

### Error Response Example

```json
{
  "success": false,
  "error": {
    "message": "App not found in App Store",
    "code": "APP_NOT_FOUND"
  }
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `MISSING_FIELDS` | Required fields missing in request | 400 |
| `APP_NOT_FOUND` | App Store ID not found | 404 |
| `FETCH_ERROR` | Failed to fetch metadata from iTunes API | 500 |
| `AUDIT_ERROR` | Audit analysis failed | 500 |

### Cache Behavior

- **Cache Check**: Queries `app_metadata_cache` table for existing metadata
- **Version Comparison**: Checks `version_hash` (hash of version + lastModifiedDate)
- **Cache Hit**: Returns cached data if version matches and `forceRefresh=false`
- **Cache Miss**: Fetches fresh from iTunes API, stores in cache, runs audit
- **TTL**: Perpetual cache (only invalidated by version change or forceRefresh)

---

## analyze-competitors

**Endpoint**: `https://<project>.supabase.co/functions/v1/analyze-competitors`
**Method**: `POST`
**Authentication**: Required (Supabase Auth JWT)

### Description
Analyzes up to 10 competitors against a target app, identifying keyword and combo opportunities through gap analysis. Includes rate limiting and retry logic for safe batch processing.

### Request Body

```typescript
interface AnalyzeCompetitorsRequest {
  targetAppId: string;              // Target app's iTunes App Store ID
  competitorAppStoreIds: string[];  // Array of competitor App Store IDs (max 10)
  organizationId: string;           // Organization UUID for RLS
  forceRefresh?: boolean;           // Bypass cache (default: false)
  country?: string;                 // ISO 3166-1 alpha-2 (default: 'us')
}
```

### Example Request

```bash
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/analyze-competitors \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "targetAppId": "570060128",
    "competitorAppStoreIds": [
      "1623306327",
      "393214966",
      "1175083956"
    ],
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "forceRefresh": false,
    "country": "us"
  }'
```

### Response

```typescript
interface AnalyzeCompetitorsResponse {
  success: boolean;
  data?: AnalyzeCompetitorsData;
  error?: {
    message: string;
    code: string;
  };
}

interface AnalyzeCompetitorsData {
  targetApp: {
    appStoreId: string;
    name: string;
    audit: UnifiedMetadataAuditResult;
  };
  competitors: CompetitorAuditResult[];
  gapAnalysis: GapAnalysisResult;
  analyzedAt: string; // ISO 8601 timestamp
}
```

### Success Response Example

```json
{
  "success": true,
  "data": {
    "targetApp": {
      "appStoreId": "570060128",
      "name": "Duolingo: Language Learning",
      "audit": {
        "overallScore": 85,
        "comboCoverage": { "totalCombos": 18, ... },
        "keywordCoverage": { "totalUniqueKeywords": 22, ... },
        "keywordFrequency": [...]
      }
    },
    "competitors": [
      {
        "appStoreId": "1623306327",
        "name": "Babbel: Language Learning",
        "audit": {
          "overallScore": 88,
          "comboCoverage": { "totalCombos": 20, ... },
          "keywordCoverage": { "totalUniqueKeywords": 25, ... }
        }
      }
    ],
    "gapAnalysis": {
      "missingKeywords": [
        {
          "keyword": "conversation",
          "usedByCompetitors": 3,
          "avgFrequency": 4.5,
          "topCompetitor": "Babbel",
          "opportunityScore": 75
        }
      ],
      "missingCombos": [
        {
          "combo": "language practice",
          "usedByCompetitors": 2,
          "topCompetitor": "Babbel",
          "opportunityScore": 60
        }
      ],
      "frequencyGaps": [
        {
          "keyword": "learn",
          "targetFrequency": 2,
          "competitorAvgFrequency": 5.5,
          "gap": 3.5,
          "recommendation": "Consider increasing usage from 2 to 5"
        }
      ],
      "summary": {
        "totalMissingKeywords": 15,
        "totalMissingCombos": 8,
        "totalFrequencyGaps": 5,
        "competitorAvgScore": 87,
        "targetScore": 85
      }
    },
    "analyzedAt": "2025-11-29T10:30:00.000Z"
  }
}
```

### Error Response Example

```json
{
  "success": false,
  "error": {
    "message": "Maximum 10 competitors allowed",
    "code": "TOO_MANY_COMPETITORS"
  }
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `MISSING_FIELDS` | Required fields missing | 400 |
| `TOO_MANY_COMPETITORS` | More than 10 competitors provided | 400 |
| `TARGET_APP_NOT_FOUND` | Target app not found | 404 |
| `COMPETITOR_FETCH_ERROR` | Failed to fetch competitor metadata | 500 |
| `GAP_ANALYSIS_ERROR` | Gap analysis computation failed | 500 |

### Rate Limiting

- **Batch Size**: 2 concurrent requests
- **Delay Between Batches**: 1000ms (1 second)
- **Total Time**: ~5 seconds for 10 competitors
- **Retry Logic**: Exponential backoff (1s, 2s, 3s) for network errors

### Cache Behavior

- **Cache Check**: Queries `competitor_comparison_cache` table
- **Cache Key**: Hash of `targetAppId + sorted(competitorAppStoreIds)`
- **TTL**: 24 hours
- **Cache Hit**: Returns cached analysis if not expired and `forceRefresh=false`
- **Cache Miss**: Runs fresh analysis, stores result with 24h expiry

### Gap Analysis Algorithms

#### Missing Keywords Opportunity Score
```typescript
score = (competitorUsage / totalCompetitors) * 50 +  // 50% weight: adoption rate
        (avgFrequency / 10) * 50                      // 50% weight: usage intensity
// Range: 0-100 (higher = better ROI)
```

#### Missing Combos Opportunity Score
```typescript
score = (competitorUsage / totalCompetitors) * 100
// Range: 0-100 (higher = more widely adopted)
```

#### Frequency Gap Calculation
```typescript
gap = competitorAvgFrequency - targetFrequency
// Only included in results if gap > 1
```

---

## appstore-metadata

**Endpoint**: `https://<project>.supabase.co/functions/v1/appstore-metadata`
**Method**: `POST`
**Authentication**: Required (Supabase Auth JWT)

### Description
Fetches raw App Store metadata from iTunes API with caching. Used internally by other edge functions.

### Request Body

```typescript
interface AppStoreMetadataRequest {
  appStoreId: string;
  country?: string;         // Default: 'us'
  forceRefresh?: boolean;   // Default: false
  organizationId: string;
}
```

### Example Request

```bash
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/appstore-metadata \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "appStoreId": "570060128",
    "country": "us",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### Response

```typescript
interface AppStoreMetadataResponse {
  success: boolean;
  data?: ScrapedMetadata;
  error?: {
    message: string;
    code: string;
  };
}
```

### Success Response Example

```json
{
  "success": true,
  "data": {
    "appId": "570060128",
    "title": "Duolingo: Language Learning",
    "subtitle": "Learn Spanish, French & More",
    "developer": "Duolingo, Inc.",
    "iconUrl": "https://is1-ssl.mzstatic.com/...",
    "rating": 4.7,
    "reviewCount": 1500000,
    "version": "7.20.0",
    "lastModifiedDate": "2025-11-15T00:00:00Z",
    "country": "us"
  }
}
```

---

## appstore-html-fetch

**Endpoint**: `https://<project>.supabase.co/functions/v1/appstore-html-fetch`
**Method**: `POST`
**Authentication**: Required (Supabase Auth JWT)

### Description
Fetches App Store product page HTML and extracts metadata using DOM parsing. Fallback method when iTunes API doesn't provide all needed data.

### Request Body

```typescript
interface AppStoreHtmlFetchRequest {
  appStoreId: string;
  country?: string;         // Default: 'us'
  organizationId: string;
}
```

### Example Request

```bash
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/appstore-html-fetch \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "appStoreId": "570060128",
    "country": "us",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### Response

```typescript
interface AppStoreHtmlFetchResponse {
  success: boolean;
  data?: {
    title: string;
    subtitle?: string;
    description?: string;
    developer: string;
    // ... other extracted fields
  };
  error?: {
    message: string;
    code: string;
  };
}
```

---

# Frontend Services

## competitive-analysis-v2.service

**File**: `src/services/competitive-analysis-v2.service.ts`

### analyzeCompetitors()

Calls the `analyze-competitors` edge function with progress tracking.

#### Function Signature

```typescript
async function analyzeCompetitors(
  options: AnalyzeCompetitorsOptions
): Promise<AnalyzeCompetitorsResult>
```

#### Parameters

```typescript
interface AnalyzeCompetitorsOptions {
  targetAppId: string;              // App Store ID
  competitors: SelectedCompetitor[]; // Selected competitors
  organizationId: string;
  forceRefresh?: boolean;           // Default: false
  onProgress?: (step: string, progress: number) => void; // Progress callback
}

interface SelectedCompetitor {
  appStoreId: string;
  name: string;
  iconUrl?: string;
  developer?: string;
}
```

#### Return Value

```typescript
interface AnalyzeCompetitorsResult {
  success: boolean;
  data?: AnalyzeCompetitorsData;
  error?: string;
}
```

#### Example Usage

```typescript
import { analyzeCompetitors } from '@/services/competitive-analysis-v2.service';

const result = await analyzeCompetitors({
  targetAppId: '570060128',
  competitors: [
    { appStoreId: '1623306327', name: 'Babbel' },
    { appStoreId: '393214966', name: 'Rosetta Stone' }
  ],
  organizationId: 'org-123',
  onProgress: (step, progress) => {
    console.log(`${step}: ${progress}%`);
  }
});

if (result.success) {
  console.log('Missing keywords:', result.data.gapAnalysis.missingKeywords);
}
```

#### Progress Stages

| Progress | Step | Description |
|----------|------|-------------|
| 5% | "Preparing analysis..." | Building request payload |
| 20% | "Fetching competitor metadata..." | Calling edge function |
| 80% | "Analyzing gaps and opportunities..." | Edge function processing |
| 100% | "Analysis complete!" | Results ready |

---

### storeCompetitors()

Stores competitors in `app_competitors` table for monitored apps.

#### Function Signature

```typescript
async function storeCompetitors(
  monitoredAppId: string,
  targetAppStoreId: string,
  competitors: SelectedCompetitor[],
  organizationId: string
): Promise<{ success: boolean; error?: string }>
```

#### Example Usage

```typescript
const result = await storeCompetitors(
  'monitored-app-uuid',
  '570060128',
  competitors,
  'org-123'
);
```

**Note**: Currently a placeholder. Implementation pending for Phase 2.

---

### loadCachedAnalysis()

Loads cached competitor analysis from database.

#### Function Signature

```typescript
async function loadCachedAnalysis(
  targetAppStoreId: string,
  competitorAppStoreIds: string[],
  organizationId: string
): Promise<AnalyzeCompetitorsData | null>
```

#### Example Usage

```typescript
const cached = await loadCachedAnalysis(
  '570060128',
  ['1623306327', '393214966'],
  'org-123'
);

if (cached) {
  // Use cached data
} else {
  // Run fresh analysis
}
```

**Note**: Currently a placeholder. Implementation pending for Phase 2.

---

## competitor-metadata.service

**File**: `src/services/competitor-metadata.service.ts`

### fetchCompetitorMetadata()

Fetches metadata for a single competitor with retry logic.

#### Function Signature

```typescript
async function fetchCompetitorMetadata(
  input: CompetitorMetadataInput,
  retryOptions?: RetryOptions
): Promise<CompetitorMetadataResult>
```

#### Parameters

```typescript
interface CompetitorMetadataInput {
  appStoreId: string;
  country?: string;     // Default: 'us'
}

interface RetryOptions {
  maxRetries?: number;  // Default: 3
  retryDelay?: number;  // Default: 1000ms
  retryableErrorCodes?: Array<'API_ERROR' | 'NETWORK_ERROR'>; // Default: ['NETWORK_ERROR']
}
```

#### Return Value

```typescript
type CompetitorMetadataResult =
  | { success: true; metadata: ScrapedMetadata }
  | { success: false; error: string; code: 'API_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' };
```

#### Example Usage

```typescript
import { fetchCompetitorMetadata } from '@/services/competitor-metadata.service';

const result = await fetchCompetitorMetadata(
  { appStoreId: '570060128', country: 'us' },
  { maxRetries: 3, retryDelay: 1000 }
);

if (result.success) {
  console.log('Title:', result.metadata.title);
} else {
  console.error('Error:', result.error, result.code);
}
```

#### Retry Behavior

- **Network Errors**: Retried with exponential backoff (1s, 2s, 3s)
- **API Errors (404, 400)**: Not retried (permanent failures)
- **Max Attempts**: 3 total attempts
- **Timeout**: 10 seconds per attempt

---

### fetchMultipleCompetitorMetadataWithRateLimit()

Fetches metadata for multiple competitors with rate limiting.

#### Function Signature

```typescript
async function fetchMultipleCompetitorMetadataWithRateLimit(
  inputs: CompetitorMetadataInput[],
  options?: RateLimitOptions
): Promise<CompetitorMetadataResult[]>
```

#### Parameters

```typescript
interface RateLimitOptions {
  batchSize?: number;           // Default: 2
  delayBetweenBatches?: number; // Default: 1000ms
  retryOptions?: RetryOptions;
  onProgress?: (current: number, total: number) => void;
}
```

#### Example Usage

```typescript
import { fetchMultipleCompetitorMetadataWithRateLimit } from '@/services/competitor-metadata.service';

const inputs = [
  { appStoreId: '570060128' },
  { appStoreId: '1623306327' },
  { appStoreId: '393214966' },
  { appStoreId: '1175083956' },
];

const results = await fetchMultipleCompetitorMetadataWithRateLimit(inputs, {
  batchSize: 2,
  delayBetweenBatches: 1000,
  onProgress: (current, total) => {
    console.log(`Fetched ${current}/${total} apps`);
  }
});

const successful = results.filter(r => r.success);
console.log(`Successfully fetched ${successful.length} apps`);
```

#### Rate Limiting Details

- **Batches**: Processes 2 apps concurrently
- **Delay**: 1 second between batches
- **Progress**: Callback after each batch completes
- **Total Time**: `~(inputs.length / 2) * 1` seconds

**Example Timeline for 10 apps**:
```
0s:   Start batch 1 [app1, app2]
1s:   Complete batch 1, start batch 2 [app3, app4]
2s:   Complete batch 2, start batch 3 [app5, app6]
3s:   Complete batch 3, start batch 4 [app7, app8]
4s:   Complete batch 4, start batch 5 [app9, app10]
5s:   Complete batch 5, done
```

---

### searchApps()

Searches iTunes API for apps by name.

#### Function Signature

```typescript
async function searchApps(
  query: string,
  country?: string,
  limit?: number
): Promise<CompetitorSearchResult[]>
```

#### Parameters

- `query`: Search term (app name)
- `country`: ISO 3166-1 alpha-2 code (default: 'US')
- `limit`: Max results to return (default: 10, max: 50)

#### Return Value

```typescript
interface CompetitorSearchResult {
  appStoreId: string;
  name: string;
  developer: string;
  iconUrl: string;
  rating?: number;
  reviewCount?: number;
}
```

#### Example Usage

```typescript
import { searchApps } from '@/services/competitor-metadata.service';

const results = await searchApps('Duolingo', 'US', 10);

results.forEach(app => {
  console.log(`${app.name} by ${app.developer}`);
});
```

#### iTunes API Endpoint

```
https://itunes.apple.com/search?term={query}&country={country}&entity=software&limit={limit}
```

---

## competitor-audit.service

**File**: `src/services/competitor-audit.service.ts`

### auditMultipleCompetitors()

Audits multiple competitors with batch processing and caching.

#### Function Signature

```typescript
async function auditMultipleCompetitors(
  inputs: CompetitorAuditInput[],
  options?: AuditOptions
): Promise<CompetitorAuditResult[]>
```

#### Parameters

```typescript
interface CompetitorAuditInput {
  appStoreId: string;
  country?: string;
  metadata?: ScrapedMetadata; // Optional: skip fetch if provided
}

interface AuditOptions {
  batchSize?: number;           // Default: 2
  delayBetweenBatches?: number; // Default: 1000ms
  forceRefresh?: boolean;       // Default: false
  onProgress?: (current: number, total: number) => void;
}
```

#### Return Value

```typescript
interface CompetitorAuditResult {
  appStoreId: string;
  name: string;
  metadata: ScrapedMetadata;
  audit: UnifiedMetadataAuditResult;
  cachedAt?: string; // ISO 8601 timestamp if from cache
}
```

#### Example Usage

```typescript
import { auditMultipleCompetitors } from '@/services/competitor-audit.service';

const inputs = [
  { appStoreId: '570060128', country: 'us' },
  { appStoreId: '1623306327', country: 'us' },
];

const results = await auditMultipleCompetitors(inputs, {
  batchSize: 2,
  forceRefresh: false,
  onProgress: (current, total) => {
    console.log(`Audited ${current}/${total} apps`);
  }
});

results.forEach(result => {
  console.log(`${result.name}: Score ${result.audit.overallScore}`);
});
```

#### Cache Behavior

- **Cache Check**: Queries `audit_snapshots` table for recent audits (24h)
- **Cache Hit**: Returns cached audit result if found and not forceRefresh
- **Cache Miss**: Fetches metadata, runs audit, stores in cache

---

# Core Engine

## MetadataAuditEngine

**File**: `supabase/functions/_shared/metadata-audit-engine.ts`

### MetadataAuditEngine.evaluate()

Main audit evaluation method. Analyzes metadata and returns comprehensive audit results.

#### Function Signature

```typescript
static evaluate(input: MetadataAuditInput): UnifiedMetadataAuditResult
```

#### Parameters

```typescript
interface MetadataAuditInput {
  title: string;
  subtitle?: string;
  description?: string;  // Future: not yet analyzed
  country?: string;
}
```

#### Return Value

```typescript
interface UnifiedMetadataAuditResult {
  overallScore: number;                      // 0-100
  comboCoverage: ComboCoverageResult;
  keywordCoverage: KeywordCoverageResult;
  keywordFrequency: KeywordFrequencyResult[];
  recommendations: string[];
  analyzedAt: string;                        // ISO 8601 timestamp
}
```

#### Example Usage

```typescript
import { MetadataAuditEngine } from './metadata-audit-engine.ts';

const result = MetadataAuditEngine.evaluate({
  title: 'Duolingo: Language Learning',
  subtitle: 'Learn Spanish, French & More',
  country: 'us'
});

console.log('Overall Score:', result.overallScore);
console.log('Total Combos:', result.comboCoverage.totalCombos);
console.log('Top Keyword:', result.keywordFrequency[0].keyword);
```

---

### MetadataAuditEngine.extractCombos()

Extracts N-gram combinations from text.

#### Function Signature

```typescript
private static extractCombos(text: string): ComboExtractionResult
```

#### Parameters

- `text`: Input text (title, subtitle, or description)

#### Return Value

```typescript
interface ComboExtractionResult {
  twoWord: string[];     // 2-word combos
  threeWord: string[];   // 3-word combos
  fourPlus: string[];    // 4+ word combos
  all: string[];         // All combos combined
}
```

#### Algorithm

```typescript
// Example: "Duolingo: Language Learning App"
// Tokens: ["duolingo", "language", "learning", "app"]

// 2-word combos:
for (let i = 0; i < tokens.length - 1; i++) {
  combo = tokens[i] + " " + tokens[i+1];
  // ["duolingo language", "language learning", "learning app"]
}

// 3-word combos:
for (let i = 0; i < tokens.length - 2; i++) {
  combo = tokens[i] + " " + tokens[i+1] + " " + tokens[i+2];
  // ["duolingo language learning", "language learning app"]
}

// 4+ word combos:
for (let i = 0; i < tokens.length - 3; i++) {
  combo = tokens[i] + " " + tokens[i+1] + " " + tokens[i+2] + " " + tokens[i+3];
  // ["duolingo language learning app"]
}
```

---

### MetadataAuditEngine.analyzeKeywordFrequency()

Analyzes keyword frequency across all combos.

#### Function Signature

```typescript
private static analyzeKeywordFrequency(
  allCombos: string[],
  topN?: number
): KeywordFrequencyResult[]
```

#### Parameters

- `allCombos`: Array of all keyword combinations
- `topN`: Number of top keywords to return (default: 20)

#### Return Value

```typescript
interface KeywordFrequencyResult {
  keyword: string;
  totalCombos: number;       // Total appearances across all combos
  twoWordCombos: number;     // Appearances in 2-word combos
  threeWordCombos: number;   // Appearances in 3-word combos
  fourPlusCombos: number;    // Appearances in 4+ word combos
  sampleCombos: string[];    // Up to 5 example combos
}
```

#### Example Usage

```typescript
const combos = [
  "language learning",
  "learning app",
  "language app",
  "best language learning",
  "language learning app"
];

const frequency = MetadataAuditEngine.analyzeKeywordFrequency(combos, 5);

// Result:
[
  {
    keyword: "language",
    totalCombos: 4,           // Appears in 4 combos
    twoWordCombos: 2,         // "language learning", "language app"
    threeWordCombos: 1,       // "best language learning"
    fourPlusCombos: 1,        // "language learning app"
    sampleCombos: ["language learning", "language app", ...]
  },
  {
    keyword: "learning",
    totalCombos: 3,
    twoWordCombos: 2,
    threeWordCombos: 1,
    fourPlusCombos: 0,
    sampleCombos: [...]
  }
]
```

---

### MetadataAuditEngine.filterNoiseWords()

Filters common noise words from keyword list.

#### Function Signature

```typescript
private static filterNoiseWords(keywords: string[]): string[]
```

#### Noise Word Categories

```typescript
const NOISE_WORDS = new Set([
  // Articles
  'the', 'a', 'an',

  // Conjunctions
  'and', 'or', 'but',

  // Prepositions
  'for', 'with', 'to', 'in', 'on', 'at', 'from',

  // Common verbs
  'is', 'are', 'get', 'make', 'do',

  // App-specific noise
  'app', 'apps', 'free', 'new', 'best', 'top',

  // Numbers
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',

  // Special characters (already removed by tokenization)
]);
```

#### Example Usage

```typescript
const keywords = ['the', 'best', 'language', 'learning', 'app', 'for', 'beginners'];
const filtered = MetadataAuditEngine.filterNoiseWords(keywords);
// Result: ['language', 'learning', 'beginners']
```

---

### Scoring Methods

#### scoreComboCoverage()

```typescript
private static scoreComboCoverage(totalCombos: number): number
```

**Scoring Rubric**:
- 20+ combos: 100 points
- 15-19 combos: 80 points
- 10-14 combos: 60 points
- 5-9 combos: 40 points
- 0-4 combos: 20 points

---

#### scoreKeywordCoverage()

```typescript
private static scoreKeywordCoverage(totalKeywords: number): number
```

**Scoring Rubric**:
- 25+ keywords: 100 points
- 20-24 keywords: 85 points
- 15-19 keywords: 70 points
- 10-14 keywords: 55 points
- 0-9 keywords: 30 points

---

#### scoreKeywordFrequency()

```typescript
private static scoreKeywordFrequency(
  keywordFrequency: KeywordFrequencyResult[]
): number
```

**Algorithm**:
```typescript
// Top keyword should appear in 5+ combos for max score
const topKeyword = keywordFrequency[0];
const score = Math.min(100, (topKeyword.totalCombos / 5) * 100);
```

---

#### calculateOverallScore()

```typescript
private static calculateOverallScore(
  comboScore: number,
  keywordScore: number,
  frequencyScore: number
): number
```

**Weighted Formula**:
```typescript
overallScore = Math.round(
  (comboScore * 0.40) +      // 40% weight
  (keywordScore * 0.30) +    // 30% weight
  (frequencyScore * 0.30)    // 30% weight
);
```

---

# Type Definitions

## Core Types

**File**: `src/types/aso.ts`

### ScrapedMetadata

```typescript
interface ScrapedMetadata {
  appId: string;              // iTunes App Store ID
  title: string;
  subtitle?: string;
  description?: string;       // Future: not yet used
  developer: string;
  iconUrl?: string;
  rating?: number;
  reviewCount?: number;
  version?: string;
  lastModifiedDate?: string;  // ISO 8601
  country: string;            // ISO 3166-1 alpha-2
}
```

---

### UnifiedMetadataAuditResult

```typescript
interface UnifiedMetadataAuditResult {
  overallScore: number;                      // 0-100
  comboCoverage: ComboCoverageResult;
  keywordCoverage: KeywordCoverageResult;
  keywordFrequency: KeywordFrequencyResult[]; // v2.1
  recommendations: string[];
  analyzedAt: string;                        // ISO 8601
}
```

---

### ComboCoverageResult

```typescript
interface ComboCoverageResult {
  totalCombos: number;
  twoWordCombos: string[];
  threeWordCombos: string[];
  fourPlusCombos: string[];
  allCombinedCombos: string[];  // All combos (deduplicated)
  score: number;                // 0-100
}
```

---

### KeywordCoverageResult

```typescript
interface KeywordCoverageResult {
  totalUniqueKeywords: number;
  uniqueKeywords: string[];     // Noise-filtered
  score: number;                // 0-100
}
```

---

### KeywordFrequencyResult

```typescript
interface KeywordFrequencyResult {
  keyword: string;
  totalCombos: number;          // Total appearances
  twoWordCombos: number;        // In 2-word combos
  threeWordCombos: number;      // In 3-word combos
  fourPlusCombos: number;       // In 4+ word combos
  sampleCombos: string[];       // Up to 5 examples
}
```

---

## Competitive Intelligence Types

**File**: `src/types/competitiveIntelligence.ts`

### AnalyzeCompetitorsRequest

```typescript
interface AnalyzeCompetitorsRequest {
  targetAppId: string;
  competitorAppStoreIds: string[];  // Max 10
  organizationId: string;
  forceRefresh?: boolean;
  country?: string;
}
```

---

### AnalyzeCompetitorsResponse

```typescript
interface AnalyzeCompetitorsResponse {
  success: boolean;
  data?: AnalyzeCompetitorsData;
  error?: {
    message: string;
    code: string;
  };
}
```

---

### AnalyzeCompetitorsData

```typescript
interface AnalyzeCompetitorsData {
  targetApp: {
    appStoreId: string;
    name: string;
    audit: UnifiedMetadataAuditResult;
  };
  competitors: CompetitorAuditResult[];
  gapAnalysis: GapAnalysisResult;
  analyzedAt: string;  // ISO 8601
}
```

---

### CompetitorAuditResult

```typescript
interface CompetitorAuditResult {
  appStoreId: string;
  name: string;
  metadata: ScrapedMetadata;
  audit: UnifiedMetadataAuditResult;
}
```

---

### GapAnalysisResult

```typescript
interface GapAnalysisResult {
  missingKeywords: MissingKeyword[];
  missingCombos: MissingCombo[];
  frequencyGaps: FrequencyGap[];
  summary: GapAnalysisSummary;
}
```

---

### MissingKeyword

```typescript
interface MissingKeyword {
  keyword: string;
  usedByCompetitors: number;      // Count of competitors using it
  avgFrequency: number;           // Avg times used per competitor
  topCompetitor: string;          // Competitor using it most
  opportunityScore: number;       // 0-100
}
```

**Opportunity Score Formula**:
```typescript
score = (usedByCompetitors / totalCompetitors) * 50 +  // 50% adoption rate
        (avgFrequency / 10) * 50                        // 50% usage intensity
```

---

### MissingCombo

```typescript
interface MissingCombo {
  combo: string;
  usedByCompetitors: number;      // Count of competitors using it
  topCompetitor: string;          // Competitor using it most
  opportunityScore: number;       // 0-100
}
```

**Opportunity Score Formula**:
```typescript
score = (usedByCompetitors / totalCompetitors) * 100
```

---

### FrequencyGap

```typescript
interface FrequencyGap {
  keyword: string;
  targetFrequency: number;        // Your usage count
  competitorAvgFrequency: number; // Competitor average
  gap: number;                    // Difference (positive = you use less)
  recommendation: string;         // AI-generated suggestion
}
```

**Gap Calculation**:
```typescript
gap = competitorAvgFrequency - targetFrequency
// Only included if gap > 1
```

**Example Recommendation**:
```
"Consider increasing usage from 2 to 5"
```

---

### GapAnalysisSummary

```typescript
interface GapAnalysisSummary {
  totalMissingKeywords: number;
  totalMissingCombos: number;
  totalFrequencyGaps: number;
  competitorAvgScore: number;     // Average overall score of competitors
  targetScore: number;            // Target app's overall score
}
```

---

### SelectedCompetitor

```typescript
interface SelectedCompetitor {
  appStoreId: string;
  name: string;
  iconUrl?: string;
  developer?: string;
}
```

---

### CompetitorSearchResult

```typescript
interface CompetitorSearchResult {
  appStoreId: string;
  name: string;
  developer: string;
  iconUrl: string;
  rating?: number;
  reviewCount?: number;
}
```

---

## Progress & State Types

### AnalysisProgress

```typescript
interface AnalysisProgress {
  status: 'idle' | 'fetching' | 'analyzing' | 'complete' | 'error';
  currentStep: string;        // Human-readable step description
  progress: number;           // 0-100
  error?: string;             // Error message if status='error'
}
```

---

### CompetitiveIntelligenceTab

```typescript
type CompetitiveIntelligenceTab = 'comparison' | 'gaps';
```

---

## Error Types

### EdgeFunctionError

```typescript
interface EdgeFunctionError {
  message: string;
  code:
    | 'MISSING_FIELDS'
    | 'APP_NOT_FOUND'
    | 'TOO_MANY_COMPETITORS'
    | 'FETCH_ERROR'
    | 'AUDIT_ERROR'
    | 'GAP_ANALYSIS_ERROR';
}
```

---

### ServiceError

```typescript
interface ServiceError {
  success: false;
  error: string;
  code: 'API_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR';
}
```

---

## Database Types

### app_metadata_cache

```typescript
interface AppMetadataCache {
  app_store_id: string;         // Primary key
  country: string;
  metadata: ScrapedMetadata;    // JSONB
  version_hash: string;         // Hash of version + lastModifiedDate
  last_fetched_at: string;      // ISO 8601 timestamp
  organization_id: string;      // UUID
}
```

---

### competitor_comparison_cache

```typescript
interface CompetitorComparisonCache {
  id: string;                           // UUID primary key
  target_app_store_id: string;
  competitor_app_store_ids: string[];   // Array of App Store IDs
  cache_key: string;                    // Unique hash
  analysis_result: AnalyzeCompetitorsData; // JSONB
  created_at: string;                   // ISO 8601
  expires_at: string;                   // ISO 8601 (created_at + 24h)
  organization_id: string;              // UUID
}
```

---

### audit_snapshots

```typescript
interface AuditSnapshot {
  id: string;                           // UUID primary key
  monitored_app_id: string;             // UUID foreign key
  audit_result: UnifiedMetadataAuditResult; // JSONB
  overall_score: number;
  metadata_snapshot: ScrapedMetadata;   // JSONB
  created_at: string;                   // ISO 8601
  organization_id: string;              // UUID
}
```

---

## Constants

### Rate Limiting

```typescript
const RATE_LIMIT_CONFIG = {
  BATCH_SIZE: 2,              // Concurrent requests
  DELAY_BETWEEN_BATCHES: 1000, // Milliseconds
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 2000, 3000], // Exponential backoff
};
```

---

### Cache TTLs

```typescript
const CACHE_TTL = {
  METADATA: Infinity,         // Perpetual (version-based invalidation)
  ANALYSIS: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  AUDIT_SNAPSHOT: 24 * 60 * 60 * 1000, // 24 hours
};
```

---

### Scoring Thresholds

```typescript
const SCORE_THRESHOLDS = {
  EXCEPTIONAL: 90,    // 90-100
  EXCELLENT: 80,      // 80-89
  GOOD: 70,           // 70-79
  FAIR: 60,           // 60-69
  POOR: 0,            // 0-59
};

const OPPORTUNITY_SCORE_THRESHOLDS = {
  HIGH: 80,           // High ROI (green)
  MEDIUM: 60,         // Medium ROI (blue)
  LOW: 40,            // Low ROI (purple)
  MINIMAL: 0,         // Minimal ROI (gray)
};
```

---

### Combo Limits

```typescript
const COMBO_LIMITS = {
  MAX_COMPETITORS: 10,
  TOP_KEYWORDS: 20,           // Top N keywords in frequency analysis
  TOP_MISSING_KEYWORDS: 15,   // Shown in UI
  TOP_MISSING_COMBOS: 15,
  TOP_FREQUENCY_GAPS: 15,
  QUICK_WINS: 3,              // Shown in summary card
};
```

---

## HTTP Status Codes

### Success

- `200 OK`: Request successful
- `201 Created`: Resource created successfully

### Client Errors

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Resource not found (app, competitor, etc.)
- `429 Too Many Requests`: Rate limit exceeded

### Server Errors

- `500 Internal Server Error`: Unexpected server error
- `502 Bad Gateway`: Upstream service (iTunes API) error
- `503 Service Unavailable`: Temporary service outage
- `504 Gateway Timeout`: Request timeout

---

## Version History

### v2.1.0 (2025-11-29)
- ✅ Added `keywordFrequency` to `UnifiedMetadataAuditResult`
- ✅ Added `analyze-competitors` edge function
- ✅ Added Competitive Intelligence types
- ✅ Added rate limiting and retry logic
- ✅ Added progress tracking interfaces

### v2.0.0 (2025-11-15)
- ✅ Migrated to edge function architecture
- ✅ Added `metadata-audit-v2` endpoint
- ✅ Introduced combo coverage analysis
- ✅ Introduced keyword coverage analysis

---

## Support & Resources

- **Documentation**: See `ASO_AUDIT_SYSTEM_DOCUMENTATION.md`
- **Feature Completion**: See `COMPETITIVE_INTELLIGENCE_COMPLETE.md`
- **Scope Definitions**: See `ASO_AUDIT_V2_SCOPE_SPLIT.md`
- **Edge Function Tests**: See `test-analyze-competitors.md`

---

**For questions or issues**: Create an issue in the project repository
