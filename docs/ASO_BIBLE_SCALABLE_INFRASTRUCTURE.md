# ASO Bible Scalable Infrastructure Documentation

**Version**: 1.0
**Date**: 2025-11-23
**Status**: Documentation Only (No Implementation)
**Related**: See `ASO_BIBLE_SCALABLE_ARCHITECTURE.md` for vertical rule system design

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [End-to-End Processing Pipeline](#2-end-to-end-processing-pipeline)
3. [Caching & Timestamping Model](#3-caching--timestamping-model)
4. [Historical Reproducibility System](#4-historical-reproducibility-system)
5. [Competitor Pipeline Structure](#5-competitor-pipeline-structure)
6. [Multi-Vertical Safety Principles](#6-multi-vertical-safety-principles)
7. [Multi-Market Safety Principles](#7-multi-market-safety-principles)
8. [Extensibility & Admin Layer Requirements](#8-extensibility--admin-layer-requirements)
9. [Data Governance & Security](#9-data-governance--security)
10. [Performance & Compute Requirements](#10-performance--compute-requirements)
11. [Future Roadmap](#11-future-roadmap)
12. [Appendix](#12-appendix)

---

## 1. Executive Summary

### 1.1 Purpose

The **ASO Bible Scalable Infrastructure** provides the foundational data pipeline, caching layer, versioning system, and safety mechanisms required to support:

- **Multi-Vertical Rule Sets** — Category-specific scoring patterns (rewards, finance, dating, etc.)
- **Multi-Market Localization** — Locale-specific stopwords, filler patterns, character limits
- **Client-Specific Customization** — Per-app overrides for enterprise clients
- **Competitor Benchmarking** — Parallel pipeline for competitor metadata analysis
- **Historical Reproducibility** — Ability to replay audits with exact historical rule sets
- **Admin UI Management** — Draft/preview/publish workflow for rule changes

### 1.2 Why Infrastructure is Critical

The ASO Bible Engine (documented in `ASO_BIBLE_SCALABLE_ARCHITECTURE.md`) defines **what** rules to apply. The infrastructure defines **how** and **when** to apply them.

**Without proper infrastructure**:
- ❌ **Vertical Leakage** — Language-learning patterns contaminate reward app audits
- ❌ **Competitor Contamination** — Client app metadata mixed with competitor metadata
- ❌ **Stale Metadata** — Outdated metadata snapshots produce incorrect scores
- ❌ **Ranking Drift** — App Store metadata changes but cached scores don't update
- ❌ **Non-Reproducible Audits** — Cannot replay historical audits with exact rule versions
- ❌ **Cache Invalidation Chaos** — Rule changes don't propagate correctly
- ❌ **Performance Bottlenecks** — Re-processing entire pipeline on every page load

**With proper infrastructure**:
- ✅ **Vertical Isolation** — Each app scored with correct category-specific rules
- ✅ **Competitor Segregation** — Separate pipeline for competitor metadata
- ✅ **Smart Caching** — TTL-based invalidation with dependency tracking
- ✅ **Automatic Refresh** — Background jobs detect App Store changes
- ✅ **Version Stamping** — Every audit tagged with exact rule set version
- ✅ **Instant Admin Preview** — Draft rules testable without affecting production
- ✅ **Sub-Second Load Times** — Cached results for 95% of requests

### 1.3 Intersection with ASO Bible Engine

```
┌─────────────────────────────────────────────────────────────┐
│                   ASO Bible Engine (Phase 6)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Base Rules  │  │ Vertical    │  │ Market      │        │
│  │ (Global)    │→ │ Rules       │→ │ Rules       │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         ↓                  ↓                  ↓             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Merged Rule Set (In-Memory)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│          Scalable Infrastructure (Phase 7B)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Metadata    │  │ Cache       │  │ Version     │        │
│  │ Pipeline    │→ │ Layer       │→ │ Stamping    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         ↓                  ↓                  ↓             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Audit Result (with reproducibility metadata)    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Key Principle**: The Engine defines **scoring logic**, the Infrastructure defines **data flow and lifecycle**.

### 1.4 Risk Areas Without Proper Infrastructure

| Risk | Without Infrastructure | With Infrastructure |
|------|------------------------|---------------------|
| **Vertical Leakage** | Reward app scored with language-learning patterns | Rule Set Loader detects category, loads correct vertical |
| **Stale Metadata** | 30-day-old App Store snapshot produces wrong scores | TTL-based cache invalidation, auto-refresh on changes |
| **Competitor Contamination** | Client metadata mixed with competitor metadata in same table | Separate `app_metadata` and `competitor_metadata` tables |
| **Non-Reproducible Audits** | Cannot replay audit from 6 months ago | Version stamps + snapshot export enable exact replay |
| **Cache Invalidation Failure** | Rule change doesn't invalidate affected audits | Dependency tracking: rule version change → cache bust |
| **Admin Preview Breakage** | Draft rules affect production audits | Separate `draft_rules` and `live_rules` tables |
| **Performance Degradation** | Full pipeline runs on every page load | 3-tier caching: browser → CDN → database |
| **Data Governance Violation** | GDPR: Metadata stored indefinitely | TTL-based purging, encryption at rest, audit logs |

### 1.5 Infrastructure Layers

The infrastructure consists of **7 key layers**:

1. **Metadata Ingestion Layer** — Scraper → Raw snapshot → Storage
2. **Enrichment Layer** — Tokenization → Combo extraction → NLP analysis
3. **Rule Set Resolution Layer** — Base → Vertical → Market → Client → Merged
4. **Scoring Engine Layer** — Apply rules → Compute KPIs → Generate recommendations
5. **Caching Layer** — TTL-based cache with dependency invalidation
6. **Version Stamping Layer** — Tag every audit with rule set version + metadata version
7. **Admin Management Layer** — Draft/preview/publish workflow for rule changes

Each layer has specific **inputs, outputs, cache boundaries, and reproducibility guarantees**.

---

## 2. End-to-End Processing Pipeline

### 2.1 Pipeline Overview

The ASO Bible infrastructure consists of **13 distinct stages** from App Store scrape to UI rendering.

Each stage has:
- **Inputs** — Required data dependencies
- **Outputs** — Produced artifacts
- **Cache Boundaries** — Where data is cached and for how long
- **Reproducibility Guarantees** — How to replay this stage with historical data

### 2.2 Pipeline Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          METADATA PIPELINE                              │
└─────────────────────────────────────────────────────────────────────────┘

Stage 1: App Store Scraper
   ↓ (app_id, market) → raw HTML/JSON

Stage 2: Metadata Extractor
   ↓ (raw snapshot) → structured metadata

Stage 3: Metadata Storage
   ↓ (structured metadata) → app_metadata table (timestamped)

Stage 4: Tokenization & Combo Extraction
   ↓ (title, subtitle, description) → tokens[], combos[]

Stage 5: Rule Set Loader
   ↓ (app_id, category, market) → merged rule set

Stage 6: Token Relevance Scoring
   ↓ (tokens[], rule set) → relevance scores

Stage 7: Intent Classification
   ↓ (combos[], rule set) → intent labels

Stage 8: Hook Classification
   ↓ (combos[], rule set) → hook categories

Stage 9: KPI Computation
   ↓ (enriched metadata, rule set) → 34 KPI scores

Stage 10: Formula Computation
   ↓ (KPI scores, rule set) → 8 formula scores

Stage 11: Recommendation Generation
   ↓ (KPI scores, rule set) → recommendations[]

Stage 12: Audit Result Assembly
   ↓ (all computed artifacts) → audit_result object

Stage 13: Version Stamping & Storage
   ↓ (audit_result) → app_audits table (with version metadata)
```

### 2.3 Stage 1: App Store Scraper

**Purpose**: Fetch current App Store metadata for a given app

**Inputs**:
- `app_id` (string) — App Store app ID (e.g., "1234567890")
- `market` (string) — Locale code (e.g., "US", "UK", "DE")
- `platform` (string) — "ios" or "android"

**Process**:
1. Construct App Store URL (e.g., `https://apps.apple.com/us/app/id1234567890`)
2. Fetch HTML/JSON response (use App Store API if available)
3. Extract raw HTML for parsing
4. Handle rate limiting (429 responses)
5. Handle geo-restrictions (VPN required for some markets)

**Outputs**:
- `raw_snapshot` (JSON) — Raw HTML/JSON response
  ```json
  {
    "app_id": "1234567890",
    "market": "US",
    "platform": "ios",
    "scraped_at": "2025-11-23T10:00:00Z",
    "raw_html": "<html>...</html>",
    "raw_json": {...} // if API available
  }
  ```

**Cache Boundaries**:
- **NOT cached** — Always fetch fresh data
- **Rate Limiting**: 1 request per app per hour (configurable TTL)

**Reproducibility Guarantees**:
- Store `raw_snapshot` in `app_metadata_snapshots` table with timestamp
- Enables replay of exact App Store state at any point in time

**Error Handling**:
- 404 Not Found → Mark app as "delisted"
- 429 Rate Limited → Exponential backoff (1min → 5min → 15min)
- 500 Server Error → Retry up to 3 times
- Geo-blocked → Log warning, skip market

**Database Schema** (Future):
```sql
CREATE TABLE app_metadata_snapshots (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,
  platform TEXT NOT NULL,
  scraped_at TIMESTAMPTZ NOT NULL,
  raw_html TEXT,
  raw_json JSONB,
  scraper_version TEXT, -- For reproducibility
  INDEX (app_id, market, scraped_at DESC)
);
```

### 2.4 Stage 2: Metadata Extractor

**Purpose**: Parse raw HTML/JSON into structured metadata fields

**Inputs**:
- `raw_snapshot` (from Stage 1)

**Process**:
1. Parse HTML using DOM selectors or JSON response
2. Extract structured fields:
   - `title` (string)
   - `subtitle` (string, iOS only)
   - `description` (string)
   - `developer` (string)
   - `category` (string) — e.g., "Education", "Finance"
   - `icon_url` (string)
   - `screenshots` (array of URLs)
   - `rating` (number)
   - `review_count` (number)
   - `version` (string)
   - `release_date` (date)

3. Validate extracted fields (non-null title, valid category)
4. Normalize text (trim whitespace, remove zero-width characters)

**Outputs**:
- `structured_metadata` (JSON)
  ```json
  {
    "app_id": "1234567890",
    "market": "US",
    "title": "Duolingo: Language Lessons",
    "subtitle": "Learn Spanish, French & more",
    "description": "Learn languages for free...",
    "developer": "Duolingo, Inc.",
    "category": "Education",
    "icon_url": "https://...",
    "rating": 4.7,
    "review_count": 12500000,
    "version": "6.142.0",
    "extracted_at": "2025-11-23T10:01:00Z"
  }
  ```

**Cache Boundaries**:
- **NOT cached** — Immediately flows to Stage 3

**Reproducibility Guarantees**:
- Extractor version stamped in metadata (`extractor_version: "1.2.3"`)
- If extraction logic changes, version bump enables historical replay

**Error Handling**:
- Missing title → CRITICAL error, abort pipeline
- Missing subtitle → Warning (Android doesn't have subtitles)
- Missing description → Warning, default to empty string
- Invalid category → Default to "Unknown"

### 2.5 Stage 3: Metadata Storage

**Purpose**: Store structured metadata in `app_metadata` table with timestamp

**Inputs**:
- `structured_metadata` (from Stage 2)

**Process**:
1. Insert into `app_metadata` table (upsert by `app_id + market`)
2. Preserve previous version in `app_metadata_history` table
3. Set `updated_at` timestamp
4. Emit `metadata_changed` event if title/subtitle/description changed

**Outputs**:
- Database record in `app_metadata` table
- Event: `metadata_changed` (triggers cache invalidation)

**Cache Boundaries**:
- **Cached indefinitely** until next scrape
- **TTL**: 24 hours (configurable)

**Reproducibility Guarantees**:
- `app_metadata_history` table stores all versions
- Query historical metadata: `SELECT * FROM app_metadata_history WHERE app_id = '...' AND updated_at <= '2025-01-01'`

**Database Schema** (Current + Future):
```sql
-- Current (simplified)
CREATE TABLE app_metadata (
  app_id TEXT PRIMARY KEY,
  market TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  -- ... other fields
);

-- Future (multi-market support)
CREATE TABLE app_metadata (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT,
  developer TEXT,
  icon_url TEXT,
  rating NUMERIC,
  review_count INTEGER,
  version TEXT,
  release_date DATE,
  updated_at TIMESTAMPTZ NOT NULL,
  extractor_version TEXT,
  UNIQUE (app_id, market, platform)
);

CREATE TABLE app_metadata_history (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ, -- NULL for current version
  INDEX (app_id, market, valid_from DESC)
);
```

**Event Schema**:
```typescript
interface MetadataChangedEvent {
  app_id: string;
  market: string;
  changed_fields: string[]; // ["title", "subtitle"]
  old_metadata: StructuredMetadata;
  new_metadata: StructuredMetadata;
  timestamp: string; // ISO 8601
}
```

### 2.6 Stage 4: Tokenization & Combo Extraction

**Purpose**: Convert title/subtitle into tokens and keyword combos

**Inputs**:
- `title` (string)
- `subtitle` (string)
- `description` (string)
- `market` (string) — For market-specific stopwords

**Process**:

**4.1 Tokenization**:
1. Split title/subtitle by whitespace and punctuation
2. Normalize tokens (lowercase, remove special chars)
3. Remove market-specific stopwords (e.g., "the", "a", "an" in English)
4. Apply market-specific stemming (if enabled)

**4.2 Combo Extraction**:
1. Generate n-grams (1-gram to 5-gram) from title and subtitle
2. Filter combos:
   - Remove combos with only stopwords
   - Remove combos with excessive punctuation
   - Remove numeric-only combos (unless whitelisted, e.g., "24/7")
3. Classify combos:
   - `source`: "title" | "subtitle" | "both"
   - `length`: number of tokens
   - `position`: index in original text

**Outputs**:
- `tokens` (array)
  ```json
  [
    { "text": "duolingo", "source": "title", "position": 0 },
    { "text": "language", "source": "title", "position": 1 },
    { "text": "lessons", "source": "title", "position": 2 },
    { "text": "learn", "source": "subtitle", "position": 0 },
    { "text": "spanish", "source": "subtitle", "position": 1 }
  ]
  ```

- `combos` (array)
  ```json
  [
    { "text": "duolingo", "source": "title", "length": 1, "position": 0 },
    { "text": "language lessons", "source": "title", "length": 2, "position": 1 },
    { "text": "learn spanish", "source": "subtitle", "length": 2, "position": 0 },
    { "text": "duolingo language lessons", "source": "title", "length": 3, "position": 0 }
  ]
  ```

**Cache Boundaries**:
- **Cached** in `enriched_metadata` table (TTL: 7 days)
- **Invalidation**: When metadata changes (event: `metadata_changed`)

**Reproducibility Guarantees**:
- Tokenization logic version stamped (`tokenizer_version: "2.1.0"`)
- Market-specific stopwords versioned (`stopwords_version_en_US: "1.0.0"`)

**Market-Specific Overrides**:
- Stopwords: `["the", "a", "an"]` (English) vs `["der", "die", "das"]` (German)
- Stemming: Enabled for English, disabled for Chinese/Japanese
- Character limits: 30 chars (Latin) vs 15 chars (CJK) for combos

**Future Enhancement**: NLP library integration (spaCy, NLTK) for advanced tokenization.

### 2.7 Stage 5: Rule Set Loader

**Purpose**: Load and merge rule sets (Base → Vertical → Market → Client)

**Inputs**:
- `app_id` (string)
- `category` (string) — From structured metadata
- `market` (string)
- `client_id` (string, optional) — For enterprise clients

**Process**:

**5.1 Determine Vertical**:
1. Map category to vertical (e.g., "Education" → "language_learning", "Finance" → "finance")
2. Fallback to "base" if no vertical mapping exists

**5.2 Load Rule Sets** (in order):
1. **Base Rules** — `src/engine/metadata/verticals/base/`
   - Default token relevance patterns
   - Default intent patterns
   - Default hook patterns
   - Default KPI weights
   - Default formula weights

2. **Vertical Rules** — `src/engine/metadata/verticals/{vertical}/`
   - Override token relevance (e.g., "earn" = 3 for rewards)
   - Override intent patterns (e.g., add "earning" intent)
   - Override hook patterns (e.g., add "redemption" hook)
   - Override KPI weights (e.g., Brand 30%, Keyword 15% for branded apps)
   - Override formula weights

3. **Market Rules** — `src/engine/metadata/markets/{market}/`
   - Override stopwords (e.g., "der", "die", "das" for German)
   - Override filler patterns
   - Override character limits
   - Override numeric penalties

4. **Client Rules** — `database: client_rule_overrides WHERE client_id = ?`
   - Per-app custom overrides (enterprise feature)
   - Highest precedence

**5.3 Merge Rule Sets**:
```typescript
const mergedRuleSet = {
  ...baseRules,
  ...verticalRules, // Overrides base
  ...marketRules,   // Overrides vertical
  ...clientRules,   // Overrides market (highest precedence)
};
```

**Outputs**:
- `merged_rule_set` (object)
  ```typescript
  {
    tokenRelevance: Map<string, 0 | 1 | 2 | 3>,
    intentPatterns: IntentPattern[],
    hookPatterns: HookPattern[],
    kpiWeights: Record<KpiId, number>,
    formulaWeights: Record<FormulaId, ComponentWeights>,
    stopwords: Set<string>,
    vertical: "rewards",
    market: "US",
    version: "base:1.0.0|vertical:2.1.0|market:1.0.0|client:null"
  }
  ```

**Cache Boundaries**:
- **Cached in memory** (process-level cache, TTL: 1 hour)
- **Invalidation**: When any rule set file changes (watch file system or poll)

**Reproducibility Guarantees**:
- Rule set version stamped in audit result
- Rule set snapshot exported to JSON for historical replay

**Future Enhancement**: Database-driven rule sets (currently file-based).

### 2.8 Stage 6: Token Relevance Scoring

**Purpose**: Score each token using vertical-aware relevance patterns

**Inputs**:
- `tokens[]` (from Stage 4)
- `merged_rule_set.tokenRelevance` (from Stage 5)

**Process**:
1. For each token, look up relevance score in `merged_rule_set.tokenRelevance`
2. If token not in rule set, apply fallback logic:
   - Stopwords: 0
   - Numeric: 0
   - Default: 1
3. Attach relevance score to token object

**Outputs**:
- `scored_tokens[]`
  ```json
  [
    { "text": "earn", "source": "title", "relevance": 3 }, // High (rewards vertical)
    { "text": "rewards", "source": "title", "relevance": 3 }, // High
    { "text": "free", "source": "subtitle", "relevance": 2 }, // Medium (override: not filler)
    { "text": "play", "source": "subtitle", "relevance": 2 }
  ]
  ```

**Cache Boundaries**:
- **NOT separately cached** — Part of enriched metadata cache

**Reproducibility Guarantees**:
- Rule set version ensures exact replay

**Vertical-Specific Behavior**:
- **Language Learning**: "learn", "spanish" = 3
- **Rewards**: "earn", "rewards" = 3, "free" = 2 (not filler)
- **Finance**: "invest", "stocks", "trade" = 3
- **Dating**: "match", "date", "meet" = 3

### 2.9 Stage 7: Intent Classification

**Purpose**: Classify keyword combos by intent (learning, earning, etc.)

**Inputs**:
- `combos[]` (from Stage 4)
- `merged_rule_set.intentPatterns` (from Stage 5)

**Process**:
1. For each combo, test against intent patterns (regex matching)
2. Assign intent label based on first matching pattern
3. Fallback to "neutral" if no pattern matches

**Outputs**:
- `classified_combos[]`
  ```json
  [
    { "text": "earn rewards", "intent": "earning", "source": "title" },
    { "text": "play games", "intent": "earning", "source": "subtitle" },
    { "text": "free cashback", "intent": "redemption", "source": "subtitle" },
    { "text": "mistplay app", "intent": "brand", "source": "title" }
  ]
  ```

**Cache Boundaries**:
- **NOT separately cached** — Part of enriched metadata cache

**Reproducibility Guarantees**:
- Intent pattern version ensures exact replay

**Vertical-Specific Behavior**:
- **Base**: "learning", "outcome" (only 2 intents)
- **Rewards**: "earning", "redemption", "gaming" (3 new intents)
- **Finance**: "investing", "trading", "saving" (3 new intents)
- **Dating**: "matchmaking", "connection", "profile" (3 new intents)

**Example Intent Pattern** (Rewards Vertical):
```typescript
const rewardsIntentPatterns = [
  { intent: 'earning', pattern: /\b(earn|win|collect|get|receive|gain)\b/i },
  { intent: 'redemption', pattern: /\b(redeem|cashback|paypal|giftcard|voucher)\b/i },
  { intent: 'gaming', pattern: /\b(play|game|games|gaming|challenge)\b/i },
];
```

### 2.10 Stage 8: Hook Classification

**Purpose**: Classify combos by psychological hook category

**Inputs**:
- `classified_combos[]` (from Stage 7)
- `merged_rule_set.hookPatterns` (from Stage 5)

**Process**:
1. For each combo, test against hook patterns (regex matching)
2. Assign hook category based on first matching pattern
3. A combo can have multiple hooks (not mutually exclusive)

**Outputs**:
- `hooked_combos[]`
  ```json
  [
    { "text": "earn rewards", "intent": "earning", "hooks": ["outcome", "earning"] },
    { "text": "free cashback", "intent": "redemption", "hooks": ["earning", "ease"] },
    { "text": "top rated app", "intent": "brand", "hooks": ["status", "trust"] }
  ]
  ```

**Cache Boundaries**:
- **NOT separately cached** — Part of enriched metadata cache

**Reproducibility Guarantees**:
- Hook pattern version ensures exact replay

**Vertical-Specific Behavior**:
- **Base (Language Learning)**: "learning", "outcome", "status", "ease", "time", "trust"
- **Rewards**: Add "earning" and "redemption" hooks
- **Finance**: Add "growth" and "security" hooks
- **Dating**: Add "connection" and "authenticity" hooks

**Example Hook Pattern** (Rewards Vertical):
```typescript
const rewardsHookPatterns = [
  { hook: 'earning', pattern: /\b(earn|money|cash|pay|rewards|points)\b/i },
  { hook: 'redemption', pattern: /\b(redeem|free|giftcard|paypal|amazon)\b/i },
  { hook: 'ease', pattern: /\b(easy|simple|fast|quick|instantly)\b/i },
  { hook: 'trust', pattern: /\b(verified|trusted|secure|safe|legit)\b/i },
];
```

### 2.11 Stage 9: KPI Computation

**Purpose**: Compute all 34 KPI scores using enriched metadata and merged rule set

**Inputs**:
- `scored_tokens[]` (from Stage 6)
- `classified_combos[]` (from Stage 7)
- `hooked_combos[]` (from Stage 8)
- `merged_rule_set.kpiWeights` (from Stage 5)
- `structured_metadata` (from Stage 3)

**Process**:
1. For each KPI in registry, compute raw score using KPI-specific formula
2. Normalize score to 0-100 range
3. Apply KPI weight from merged rule set (may differ from base weight)

**Example KPI Computation** (title_char_usage):
```typescript
const titleLength = structuredMetadata.title.length;
const titleCharLimit = 30; // iOS limit
const rawScore = Math.min(titleLength / titleCharLimit, 1.0);
const normalizedScore = rawScore * 100;
const weightedScore = normalizedScore * mergedRuleSet.kpiWeights['title_char_usage'];
```

**Outputs**:
- `kpi_scores` (object)
  ```json
  {
    "title_char_usage": { "raw": 0.87, "normalized": 87, "weighted": 87, "weight": 1.0 },
    "title_unique_keywords": { "raw": 0.60, "normalized": 60, "weighted": 60, "weight": 1.0 },
    "subtitle_incremental_value": { "raw": 0.75, "normalized": 75, "weighted": 75, "weight": 1.0 },
    // ... 31 more KPIs
  }
  ```

**Cache Boundaries**:
- **Cached** in `app_audits` table (TTL: 24 hours)
- **Invalidation**: When metadata changes OR rule set changes

**Reproducibility Guarantees**:
- KPI weights from rule set version ensure exact replay
- KPI computation logic versioned (`kpi_engine_version: "3.0.0"`)

**Vertical-Specific Behavior**:
- **Branded Apps** (e.g., "Uber", "Airbnb"): KPI weights favor Brand family (30%) over Keyword family (15%)
- **Discovery Apps** (e.g., language learning): KPI weights favor Keyword family (25%) over Brand family (20%)

### 2.12 Stage 10: Formula Computation

**Purpose**: Aggregate KPI scores into 8 formula scores (title score, subtitle score, etc.)

**Inputs**:
- `kpi_scores` (from Stage 9)
- `merged_rule_set.formulaWeights` (from Stage 5)

**Process**:
1. For each formula, aggregate component KPI scores using weighted sum
2. Apply formula weights from merged rule set (may differ from base weights)
3. Normalize to 0-100 range

**Example Formula Computation** (title_element_score):
```typescript
const components = [
  { kpi: 'title_char_usage', weight: 0.25 },
  { kpi: 'title_unique_keywords', weight: 0.30 },
  { kpi: 'title_combo_coverage', weight: 0.30 },
  { kpi: 'title_filler_penalty', weight: 0.15 },
];

const weightedSum = components.reduce((sum, c) => {
  return sum + (kpiScores[c.kpi].normalized * c.weight);
}, 0);

const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
const titleScore = weightedSum / totalWeight;
```

**Outputs**:
- `formula_scores` (object)
  ```json
  {
    "metadata_overall_score": 72,
    "title_element_score": 78,
    "subtitle_element_score": 68,
    "description_conversion_score": 65,
    "metadata_dimension_relevance": 75,
    "metadata_dimension_learning": 80,
    "metadata_dimension_structure": 78,
    "metadata_dimension_brand_balance": 60
  }
  ```

**Cache Boundaries**:
- **Cached** in `app_audits` table (same as KPI scores)

**Reproducibility Guarantees**:
- Formula weights from rule set version ensure exact replay

**Vertical-Specific Behavior**:
- **Branded Apps**: May adjust title/subtitle weight ratio (Title 50%, Subtitle 50% instead of 65%/35%)
- **Category-Specific Formulas**: Future support for vertical-specific formulas

### 2.13 Stage 11: Recommendation Generation

**Purpose**: Generate actionable recommendations based on KPI scores

**Inputs**:
- `kpi_scores` (from Stage 9)
- `formula_scores` (from Stage 10)
- `classified_combos[]` (from Stage 7)
- `merged_rule_set.recommendationTemplates` (from Stage 5)

**Process**:
1. For each KPI below threshold, check recommendation rules
2. Match rule conditions (e.g., `title_unique_keywords < 4`)
3. Load recommendation template from merged rule set
4. Interpolate template variables with vertical-specific examples
5. Assign severity (critical, moderate, minor)

**Example Recommendation Logic**:
```typescript
if (kpiScores['title_unique_keywords'].normalized < 40) {
  const template = mergedRuleSet.recommendationTemplates['title_low_unique_keywords'];
  const message = template.message.replace(
    '{{category_example_1}}',
    mergedRuleSet.vertical === 'rewards' ? 'earn rewards' : 'learn spanish'
  );
  recommendations.push({
    kpi: 'title_unique_keywords',
    severity: 'critical',
    message,
    chart: 'keyword_architecture',
  });
}
```

**Outputs**:
- `recommendations[]`
  ```json
  [
    {
      "kpi": "title_unique_keywords",
      "severity": "critical",
      "message": "[RANKING][critical] Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. 'earn rewards', 'cashback') typically increases ranking breadth.",
      "chart": "keyword_architecture"
    },
    {
      "kpi": "subtitle_incremental_value",
      "severity": "moderate",
      "message": "[DISCOVERY][moderate] Subtitle repeats 40% of title keywords. Adding unique discovery keywords increases search visibility.",
      "chart": "incremental_value"
    }
  ]
  ```

**Cache Boundaries**:
- **Cached** in `app_audits` table (same as KPI/formula scores)

**Reproducibility Guarantees**:
- Recommendation templates from rule set version ensure exact replay

**Vertical-Specific Behavior**:
- **Language Learning**: Examples = "learn spanish", "language lessons"
- **Rewards**: Examples = "earn rewards", "cashback"
- **Finance**: Examples = "invest stocks", "trading"
- **Dating**: Examples = "meet singles", "matchmaking"

### 2.14 Stage 12: Audit Result Assembly

**Purpose**: Combine all computed artifacts into final audit result object

**Inputs**:
- `structured_metadata` (from Stage 3)
- `tokens[]`, `combos[]` (from Stage 4)
- `merged_rule_set` (from Stage 5)
- `scored_tokens[]` (from Stage 6)
- `classified_combos[]` (from Stage 7)
- `hooked_combos[]` (from Stage 8)
- `kpi_scores` (from Stage 9)
- `formula_scores` (from Stage 10)
- `recommendations[]` (from Stage 11)

**Process**:
1. Assemble all artifacts into nested JSON object
2. Add metadata: `audited_at`, `vertical`, `market`, `rule_set_version`
3. Compute overall score (from `metadata_overall_score` formula)
4. Prepare chart data structures (for UI rendering)

**Outputs**:
- `audit_result` (object)
  ```json
  {
    "app_id": "1234567890",
    "market": "US",
    "audited_at": "2025-11-23T10:05:00Z",
    "overall_score": 72,
    "vertical": "rewards",
    "rule_set_version": "base:1.0.0|vertical:2.1.0|market:1.0.0",
    "metadata": {
      "title": "Mistplay: Earn Gift Cards",
      "subtitle": "Play Games, Get Rewards",
      "category": "Entertainment"
    },
    "tokens": [...],
    "combos": [...],
    "kpi_scores": {...},
    "formula_scores": {...},
    "recommendations": [...],
    "charts": {
      "keyword_architecture": {...},
      "incremental_value": {...},
      "hook_diversity": {...}
    }
  }
  ```

**Cache Boundaries**:
- **NOT separately cached** — Immediately flows to Stage 13

**Reproducibility Guarantees**:
- Complete audit result includes all version stamps for exact replay

### 2.15 Stage 13: Version Stamping & Storage

**Purpose**: Tag audit result with version metadata and store in database

**Inputs**:
- `audit_result` (from Stage 12)

**Process**:
1. Add version stamps:
   - `scraper_version`
   - `extractor_version`
   - `tokenizer_version`
   - `kpi_engine_version`
   - `rule_set_version` (composite: base|vertical|market|client)
2. Add metadata timestamps:
   - `metadata_updated_at` (from app_metadata table)
   - `audited_at` (current timestamp)
3. Insert into `app_audits` table (upsert by `app_id + market`)
4. Store previous audit in `app_audits_history` table

**Outputs**:
- Database record in `app_audits` table
- Historical record in `app_audits_history` table

**Cache Boundaries**:
- **Cached indefinitely** until next audit
- **TTL**: 24 hours (configurable)
- **Invalidation**: When metadata changes OR rule set changes

**Reproducibility Guarantees**:
- Version stamps enable exact replay:
  ```sql
  SELECT * FROM app_audits_history
  WHERE app_id = '1234567890'
    AND audited_at <= '2025-01-01'
  ORDER BY audited_at DESC
  LIMIT 1;
  ```

**Database Schema** (Future):
```sql
CREATE TABLE app_audits (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,
  audited_at TIMESTAMPTZ NOT NULL,
  overall_score INTEGER NOT NULL,
  vertical TEXT NOT NULL,
  rule_set_version TEXT NOT NULL,
  metadata_updated_at TIMESTAMPTZ NOT NULL,
  scraper_version TEXT,
  extractor_version TEXT,
  tokenizer_version TEXT,
  kpi_engine_version TEXT,
  audit_result JSONB NOT NULL, -- Complete audit result
  UNIQUE (app_id, market)
);

CREATE TABLE app_audits_history (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,
  audited_at TIMESTAMPTZ NOT NULL,
  overall_score INTEGER NOT NULL,
  vertical TEXT NOT NULL,
  rule_set_version TEXT NOT NULL,
  audit_result JSONB NOT NULL,
  INDEX (app_id, market, audited_at DESC)
);
```

**Event Schema**:
```typescript
interface AuditCompletedEvent {
  app_id: string;
  market: string;
  overall_score: number;
  vertical: string;
  previous_score: number | null; // If audit changed
  audited_at: string; // ISO 8601
}
```

### 2.16 Pipeline Performance Targets

| Stage | Target Latency | Cache Hit Rate | Notes |
|-------|----------------|----------------|-------|
| 1. Scraper | 2-5 seconds | N/A (always fresh) | Rate limited: 1 req/app/hour |
| 2. Extractor | 50-100ms | N/A | CPU-bound |
| 3. Storage | 10-20ms | N/A | Database insert |
| 4. Tokenization | 20-50ms | 95% | Cached in enriched_metadata |
| 5. Rule Set Loader | 5-10ms | 99% | In-memory cache |
| 6. Token Relevance | 10-20ms | 95% | Cached with enriched_metadata |
| 7. Intent Classification | 10-20ms | 95% | Cached with enriched_metadata |
| 8. Hook Classification | 10-20ms | 95% | Cached with enriched_metadata |
| 9. KPI Computation | 50-100ms | 90% | Cached in app_audits |
| 10. Formula Computation | 10-20ms | 90% | Cached in app_audits |
| 11. Recommendations | 20-50ms | 90% | Cached in app_audits |
| 12. Assembly | 5-10ms | N/A | In-memory |
| 13. Storage | 20-50ms | N/A | Database upsert |
| **Total (Cold)** | **3-6 seconds** | 0% | First audit ever |
| **Total (Warm)** | **100-200ms** | 95% | Metadata + rules cached |
| **Total (Hot)** | **10-20ms** | 100% | Full audit cached |

**Cache Hit Scenarios**:
- **Cold Start** (0% cache hit): New app, never audited → Full pipeline (3-6 seconds)
- **Warm Start** (95% cache hit): App audited within 24 hours, no metadata changes → Skip scraper, use cached audit (100-200ms)
- **Hot Start** (100% cache hit): Recent audit, no changes → Return cached result (10-20ms, database query only)

---

## 3. Caching & Timestamping Model

### 3.1 Caching Strategy Overview

The ASO Bible infrastructure uses **multi-tier caching** to optimize performance while maintaining data freshness:

```
┌─────────────────────────────────────────────────────────────┐
│                    3-TIER CACHE ARCHITECTURE                │
└─────────────────────────────────────────────────────────────┘

Tier 1: Browser Cache (Client-Side)
  - Cache: Audit results for current session
  - TTL: Session-based (until page refresh)
  - Invalidation: Manual refresh by user

         ↓ (Cache miss)

Tier 2: In-Memory Cache (Server-Side)
  - Cache: Rule sets, enriched metadata, recent audits
  - TTL: 1 hour (rule sets), 15 minutes (audits)
  - Invalidation: File change detection, time-based

         ↓ (Cache miss)

Tier 3: Database Cache (Persistent)
  - Cache: app_metadata, app_audits, enriched_metadata
  - TTL: 24 hours (metadata), 24 hours (audits)
  - Invalidation: Metadata change events, rule set changes
```

### 3.2 Cache Layers in Detail

#### 3.2.1 Tier 1: Browser Cache

**What's Cached**:
- Complete audit results (JSON) for currently viewed app
- Chart data (preprocessed for rendering)
- UI state (expanded sections, filters)

**TTL**:
- **Session-based** — Cleared on page refresh
- **Persist in localStorage** (optional): 1 hour

**Invalidation**:
- User clicks "Refresh Audit" button
- Page refresh (unless localStorage enabled)

**Storage Mechanism**:
- React Query cache (in-memory)
- Optional: localStorage for persistence

**Cache Key**:
```typescript
const cacheKey = `audit:${appId}:${market}:${Date.now()}`;
```

**Benefits**:
- Instant UI rendering on navigation (e.g., switching between charts)
- No network requests for repeated views

**Risks**:
- Stale data if metadata changes in background
- Solution: Show "Last updated: 2 hours ago" timestamp + "Refresh" button

#### 3.2.2 Tier 2: In-Memory Cache (Server-Side)

**What's Cached**:
- **Rule Sets** (base, vertical, market, client) — TTL: 1 hour
- **Enriched Metadata** (tokens, combos, intents, hooks) — TTL: 15 minutes
- **Recent Audits** (top 100 most accessed apps) — TTL: 15 minutes

**TTL Rules**:
| Data Type | TTL | Reason |
|-----------|-----|--------|
| Base Rules | 1 hour | Rarely change, expensive to load |
| Vertical Rules | 1 hour | Rarely change, expensive to merge |
| Market Rules | 1 hour | Rarely change |
| Enriched Metadata | 15 minutes | May change frequently during testing |
| Recent Audits | 15 minutes | Balance freshness vs performance |

**Invalidation Triggers**:
1. **Time-based expiration** — After TTL expires
2. **File change detection** — Watch rule set files, invalidate on change
3. **Manual invalidation** — Admin UI "Clear Cache" button

**Storage Mechanism**:
- Node.js in-memory Map or Redis (for multi-instance deployments)
- LRU eviction policy (max 1000 entries per cache type)

**Cache Key Examples**:
```typescript
// Rule sets
const ruleSetKey = `ruleset:${vertical}:${market}:${clientId || 'default'}`;

// Enriched metadata
const enrichedKey = `enriched:${appId}:${market}:${metadataUpdatedAt.getTime()}`;

// Audit results
const auditKey = `audit:${appId}:${market}:${ruleSetVersion}`;
```

**Benefits**:
- Sub-50ms response times for cached rule sets
- Reduces database load by 80-90%

**Risks**:
- Stale data if rule sets change without invalidation
- Solution: File system watcher (`chokidar`) triggers cache bust

#### 3.2.3 Tier 3: Database Cache (Persistent)

**What's Cached**:
- **app_metadata** — Structured metadata from App Store
- **enriched_metadata** — Tokens, combos, intents, hooks (future table)
- **app_audits** — Complete audit results with version stamps

**TTL Rules**:
| Table | TTL | Refresh Strategy |
|-------|-----|------------------|
| app_metadata | 24 hours | Background job checks App Store for changes |
| enriched_metadata | 7 days | Invalidated when metadata changes |
| app_audits | 24 hours | Invalidated when metadata OR rules change |

**Invalidation Triggers**:
1. **Metadata change event** — `metadata_changed` event → Bust `enriched_metadata` + `app_audits`
2. **Rule set version change** — `rule_set_updated` event → Bust `app_audits`
3. **Manual refresh** — User clicks "Refresh Audit" → Bust `app_audits` for that app

**Storage Mechanism**:
- PostgreSQL with JSONB columns for flexible schema
- Indexes on `app_id`, `market`, `updated_at`, `audited_at`

**Cache Invalidation Query**:
```sql
-- Invalidate audit when metadata changes
DELETE FROM app_audits
WHERE app_id = $1 AND market = $2;

-- Invalidate enriched metadata
DELETE FROM enriched_metadata
WHERE app_id = $1 AND market = $2;
```

**Benefits**:
- Persistent cache survives server restarts
- Enables historical reproducibility (via `app_audits_history`)

**Risks**:
- Stale data if background refresh job fails
- Solution: Fallback to on-demand refresh if data > 48 hours old

### 3.3 Timestamping Model

Every cached artifact is tagged with multiple timestamps to enable:
- **Freshness detection** — Is this data stale?
- **Invalidation logic** — Should this cache be busted?
- **Historical reproducibility** — What was the exact state at time T?

#### 3.3.1 Timestamp Types

| Timestamp | Purpose | Scope |
|-----------|---------|-------|
| `scraped_at` | When App Store metadata was fetched | app_metadata |
| `extracted_at` | When metadata was parsed | app_metadata |
| `updated_at` | When database record was last modified | All tables |
| `audited_at` | When audit was computed | app_audits |
| `metadata_updated_at` | Reference timestamp for metadata version | app_audits (denormalized) |
| `valid_from` | Start of validity period | app_metadata_history |
| `valid_to` | End of validity period (NULL = current) | app_metadata_history |

#### 3.3.2 Timestamp Usage in Cache Invalidation

**Example**: Determine if cached audit is stale

```typescript
interface CachedAudit {
  app_id: string;
  market: string;
  audited_at: Date;
  metadata_updated_at: Date; // Denormalized from app_metadata
  rule_set_version: string;
}

function isCachedAuditStale(cachedAudit: CachedAudit): boolean {
  const now = new Date();

  // Check 1: Audit age (TTL: 24 hours)
  const auditAgeHours = (now.getTime() - cachedAudit.audited_at.getTime()) / (1000 * 60 * 60);
  if (auditAgeHours > 24) {
    return true; // Audit too old
  }

  // Check 2: Metadata freshness
  const currentMetadata = await getMetadata(cachedAudit.app_id, cachedAudit.market);
  if (currentMetadata.updated_at > cachedAudit.metadata_updated_at) {
    return true; // Metadata changed since audit
  }

  // Check 3: Rule set version
  const currentRuleSetVersion = await getRuleSetVersion(cachedAudit.vertical, cachedAudit.market);
  if (currentRuleSetVersion !== cachedAudit.rule_set_version) {
    return true; // Rules changed since audit
  }

  return false; // Cache is fresh
}
```

#### 3.3.3 Denormalization Strategy

To avoid expensive joins on every cache check, **denormalize timestamps** in `app_audits`:

```sql
CREATE TABLE app_audits (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,
  audited_at TIMESTAMPTZ NOT NULL,
  metadata_updated_at TIMESTAMPTZ NOT NULL, -- Denormalized from app_metadata
  rule_set_version TEXT NOT NULL,
  audit_result JSONB NOT NULL,
  UNIQUE (app_id, market)
);
```

**Benefits**:
- Single-table query to check cache validity
- No need to join `app_metadata` on every request

**Tradeoff**:
- Must update `metadata_updated_at` when metadata changes
- Additional write overhead (acceptable for read-heavy workload)

### 3.4 Cache Dependency Tracking

When a rule set changes, **which audits should be invalidated**?

#### 3.4.1 Dependency Graph

```
Rule Set Change (e.g., rewards vertical v2.1.0 → v2.2.0)
       ↓
Affected Apps: All apps with vertical = "rewards"
       ↓
Invalidate: app_audits WHERE vertical = "rewards"
       ↓
Background Job: Re-audit top 100 most accessed apps
       ↓
On-Demand: Re-audit other apps when user requests
```

#### 3.4.2 Bulk Invalidation Query

```sql
-- Invalidate all audits for a specific vertical
DELETE FROM app_audits
WHERE vertical = $1; -- e.g., "rewards"

-- Invalidate all audits for a specific market
DELETE FROM app_audits
WHERE market = $1; -- e.g., "DE" (Germany)

-- Invalidate all audits (nuclear option)
TRUNCATE app_audits;
```

#### 3.4.3 Incremental Re-Auditing Strategy

**Problem**: Invalidating 10,000+ apps is expensive (3-6 seconds per audit)

**Solution**: Prioritize re-auditing

1. **Immediate** (within 5 minutes): Top 100 most accessed apps
2. **Background** (within 1 hour): Top 1,000 most accessed apps
3. **On-Demand** (lazy): All other apps (re-audit when user requests)

**Database Schema for Tracking Access**:
```sql
CREATE TABLE app_audit_access_log (
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL,
  INDEX (app_id, market),
  INDEX (accessed_at DESC)
);

-- Query top 100 most accessed apps in last 7 days
SELECT app_id, market, COUNT(*) AS access_count
FROM app_audit_access_log
WHERE accessed_at > NOW() - INTERVAL '7 days'
GROUP BY app_id, market
ORDER BY access_count DESC
LIMIT 100;
```

### 3.5 Freeze Mode (Admin Feature)

**Use Case**: Admin edits rule sets in draft mode, tests changes, then publishes

**Requirement**: Draft rule sets must NOT affect production audits

**Solution**: Separate `draft_rules` and `live_rules` tables

#### 3.5.1 Database Schema

```sql
CREATE TABLE rule_sets (
  id UUID PRIMARY KEY,
  vertical TEXT NOT NULL,
  market TEXT,
  status TEXT NOT NULL, -- "draft" | "live" | "archived"
  version TEXT NOT NULL,
  rule_data JSONB NOT NULL, -- Complete rule set (tokens, intents, hooks, etc.)
  created_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ, -- NULL for drafts
  INDEX (vertical, market, status)
);
```

#### 3.5.2 Freeze Mode Workflow

1. **Admin edits draft**:
   ```sql
   INSERT INTO rule_sets (vertical, status, version, rule_data)
   VALUES ('rewards', 'draft', '2.2.0-draft', {...});
   ```

2. **Admin previews draft** (UI shows "Preview Mode" badge):
   - Load draft rule set for specific app
   - Compute audit with draft rules (NOT cached)
   - Display results with warning: "Preview mode — not affecting production"

3. **Admin publishes draft**:
   ```sql
   -- Mark current live as archived
   UPDATE rule_sets
   SET status = 'archived'
   WHERE vertical = 'rewards' AND status = 'live';

   -- Publish draft
   UPDATE rule_sets
   SET status = 'live', published_at = NOW()
   WHERE id = $1; -- draft rule set ID

   -- Invalidate all affected audits
   DELETE FROM app_audits WHERE vertical = 'rewards';
   ```

4. **Background re-auditing**:
   - Queue top 100 apps for re-auditing
   - Emit `rule_set_published` event

#### 3.5.3 Preview Mode Implementation

```typescript
interface AuditOptions {
  usePreviewRules?: boolean; // Default: false
  previewRuleSetId?: string; // Draft rule set ID
}

async function computeAudit(appId: string, market: string, options: AuditOptions) {
  let ruleSet: MergedRuleSet;

  if (options.usePreviewRules && options.previewRuleSetId) {
    // Load draft rule set (NOT cached)
    ruleSet = await loadDraftRuleSet(options.previewRuleSetId);
  } else {
    // Load live rule set (cached)
    ruleSet = await loadLiveRuleSet(vertical, market);
  }

  // Compute audit (same logic, different rules)
  const audit = await runAuditPipeline(appId, market, ruleSet);

  if (options.usePreviewRules) {
    audit.isPreview = true; // Tag as preview
  }

  return audit;
}
```

### 3.6 Cache Warming Strategy

**Problem**: Cold start (first request after server restart) takes 3-6 seconds

**Solution**: Pre-warm cache on server startup

#### 3.6.1 Warm-Up Sequence

1. **Load rule sets** (1-2 seconds):
   - Load all live rule sets into in-memory cache
   - Precompute merged rule sets for common vertical/market combos

2. **Load top 100 apps** (10-20 seconds):
   - Query `app_audit_access_log` for top 100 apps
   - Load audit results from database into in-memory cache
   - Load metadata for these apps

3. **Mark as ready** (emit `cache_warmed` event)

**Implementation**:
```typescript
async function warmCache() {
  console.log('Warming cache...');

  // Step 1: Load rule sets
  const verticals = ['base', 'language_learning', 'rewards', 'finance'];
  const markets = ['US', 'UK', 'DE', 'JP'];

  for (const vertical of verticals) {
    for (const market of markets) {
      await loadRuleSet(vertical, market); // Populates in-memory cache
    }
  }

  // Step 2: Load top 100 apps
  const topApps = await getTopAccessedApps(100);
  for (const { app_id, market } of topApps) {
    await getAudit(app_id, market); // Populates in-memory cache
  }

  console.log('Cache warmed successfully');
}

// Call on server startup
warmCache();
```

### 3.7 Cache Eviction Policy

**Problem**: In-memory cache grows unbounded, causing memory issues

**Solution**: LRU (Least Recently Used) eviction

#### 3.7.1 LRU Configuration

| Cache Type | Max Entries | Eviction Policy |
|------------|-------------|-----------------|
| Rule Sets | 100 | LRU (rarely evicted, small size) |
| Enriched Metadata | 1,000 | LRU (medium eviction rate) |
| Audit Results | 1,000 | LRU (high eviction rate) |

**Implementation** (using `lru-cache` npm package):
```typescript
import { LRUCache } from 'lru-cache';

const ruleSetCache = new LRUCache<string, MergedRuleSet>({
  max: 100,
  ttl: 1000 * 60 * 60, // 1 hour
  updateAgeOnGet: true, // Refresh TTL on access
});

const auditCache = new LRUCache<string, AuditResult>({
  max: 1000,
  ttl: 1000 * 60 * 15, // 15 minutes
  updateAgeOnGet: true,
});
```

---

## 4. Historical Reproducibility System

### 4.1 Purpose

**Goal**: Enable exact replay of any historical audit with:
- Exact App Store metadata from time T
- Exact rule set version from time T
- Exact scoring logic version from time T

**Use Cases**:
1. **Client Disputes** — "Why did my score drop from 82 to 74 last week?"
2. **Rule Testing** — "How would new rules affect historical audits?"
3. **Trend Analysis** — "How has this app's title evolved over 6 months?"
4. **Compliance** — "Prove that audit X used rule set version Y"

### 4.2 Version Stamping Architecture

Every audit result includes **6 version stamps**:

```typescript
interface AuditResult {
  // ... audit data

  // Version Stamps
  scraper_version: string; // "1.2.0"
  extractor_version: string; // "1.1.0"
  tokenizer_version: string; // "2.0.0"
  kpi_engine_version: string; // "3.0.0"
  rule_set_version: string; // "base:1.0.0|vertical:2.1.0|market:1.0.0"
  metadata_updated_at: Date; // Metadata timestamp

  // Reproducibility Metadata
  audited_at: Date; // When audit was computed
  is_reproducible: boolean; // Can this audit be replayed?
  snapshot_available: boolean; // Is metadata snapshot available?
}
```

### 4.3 Historical Data Storage

#### 4.3.1 Metadata Snapshots

Store **complete App Store snapshots** in `app_metadata_history`:

```sql
CREATE TABLE app_metadata_history (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,
  platform TEXT NOT NULL,

  -- Metadata fields
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT,
  developer TEXT,
  rating NUMERIC,
  review_count INTEGER,

  -- Temporal validity
  valid_from TIMESTAMPTZ NOT NULL, -- When this version became active
  valid_to TIMESTAMPTZ, -- NULL for current version

  -- Version stamps
  scraped_at TIMESTAMPTZ NOT NULL,
  extractor_version TEXT,

  INDEX (app_id, market, valid_from DESC),
  INDEX (app_id, market, valid_to DESC)
);
```

**Query Historical Metadata**:
```sql
-- Get metadata as of 2025-01-15
SELECT *
FROM app_metadata_history
WHERE app_id = '1234567890'
  AND market = 'US'
  AND valid_from <= '2025-01-15'
  AND (valid_to IS NULL OR valid_to > '2025-01-15')
LIMIT 1;
```

#### 4.3.2 Rule Set Snapshots

Store **complete rule set snapshots** in `rule_set_history`:

```sql
CREATE TABLE rule_set_history (
  id UUID PRIMARY KEY,
  vertical TEXT NOT NULL,
  market TEXT,
  version TEXT NOT NULL,

  -- Complete rule set (frozen snapshot)
  rule_data JSONB NOT NULL, -- {tokenRelevance, intentPatterns, hookPatterns, kpiWeights, formulaWeights}

  -- Temporal validity
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ, -- NULL for current version

  INDEX (vertical, market, valid_from DESC)
);
```

**Query Historical Rule Set**:
```sql
-- Get rule set as of 2025-01-15
SELECT *
FROM rule_set_history
WHERE vertical = 'rewards'
  AND market = 'US'
  AND valid_from <= '2025-01-15'
  AND (valid_to IS NULL OR valid_to > '2025-01-15')
LIMIT 1;
```

#### 4.3.3 Audit Snapshots

Store **complete audit results** in `app_audits_history`:

```sql
CREATE TABLE app_audits_history (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,

  -- Audit result
  overall_score INTEGER NOT NULL,
  vertical TEXT NOT NULL,
  audit_result JSONB NOT NULL, -- Complete result with KPIs, formulas, recommendations

  -- Version stamps (for reproducibility)
  audited_at TIMESTAMPTZ NOT NULL,
  metadata_updated_at TIMESTAMPTZ NOT NULL,
  rule_set_version TEXT NOT NULL,
  scraper_version TEXT,
  extractor_version TEXT,
  tokenizer_version TEXT,
  kpi_engine_version TEXT,

  INDEX (app_id, market, audited_at DESC)
);
```

### 4.4 Audit Replay Process

**Goal**: Re-compute an audit using historical metadata + historical rule set

#### 4.4.1 Replay Workflow

```typescript
async function replayAudit(appId: string, market: string, targetDate: Date): Promise<AuditResult> {
  // Step 1: Load historical metadata
  const historicalMetadata = await getMetadataAtDate(appId, market, targetDate);
  if (!historicalMetadata) {
    throw new Error('Metadata snapshot not available for target date');
  }

  // Step 2: Load historical rule set
  const historicalRuleSet = await getRuleSetAtDate(
    historicalMetadata.category, // Vertical determined from metadata
    market,
    targetDate
  );
  if (!historicalRuleSet) {
    throw new Error('Rule set snapshot not available for target date');
  }

  // Step 3: Replay audit pipeline (Stages 4-13)
  // Skip scraper (Stage 1-3), use historical metadata directly
  const audit = await runAuditPipeline(historicalMetadata, historicalRuleSet);

  // Step 4: Tag as replay
  audit.is_replay = true;
  audit.replay_target_date = targetDate;

  return audit;
}
```

#### 4.4.2 Reproducibility Guarantees

| Component | Guaranteed? | Notes |
|-----------|-------------|-------|
| Metadata | ✅ Yes | Stored in `app_metadata_history` |
| Rule Set | ✅ Yes | Stored in `rule_set_history` |
| Scoring Logic | ⚠️ Partial | Logic version stamped, but code must be preserved |
| External Dependencies | ❌ No | NLP libraries, stopword lists may change |

**Mitigation for Code Changes**:
- Tag scoring logic versions in Git (`kpi_engine_v3.0.0`)
- Preserve old code branches for critical versions
- Use feature flags to toggle between old/new logic

### 4.5 Snapshot Export/Import

**Use Case**: Export complete audit snapshot for client review or offline analysis

#### 4.5.1 Export Format

```json
{
  "export_version": "1.0.0",
  "exported_at": "2025-11-23T10:00:00Z",
  "audit": {
    "app_id": "1234567890",
    "market": "US",
    "audited_at": "2025-11-20T15:30:00Z",
    "overall_score": 72,
    "vertical": "rewards",
    "audit_result": {...}
  },
  "metadata_snapshot": {
    "title": "Mistplay: Earn Gift Cards",
    "subtitle": "Play Games, Get Rewards",
    "description": "...",
    "scraped_at": "2025-11-20T15:00:00Z"
  },
  "rule_set_snapshot": {
    "version": "base:1.0.0|vertical:2.1.0|market:1.0.0",
    "vertical": "rewards",
    "market": "US",
    "rule_data": {...}
  },
  "version_stamps": {
    "scraper_version": "1.2.0",
    "extractor_version": "1.1.0",
    "tokenizer_version": "2.0.0",
    "kpi_engine_version": "3.0.0"
  }
}
```

#### 4.5.2 Export/Import API

```typescript
// Export audit snapshot
async function exportAuditSnapshot(appId: string, market: string): Promise<string> {
  const audit = await getAudit(appId, market);
  const metadata = await getMetadata(appId, market);
  const ruleSet = await getRuleSet(audit.vertical, market);

  const snapshot = {
    export_version: '1.0.0',
    exported_at: new Date().toISOString(),
    audit,
    metadata_snapshot: metadata,
    rule_set_snapshot: ruleSet,
    version_stamps: {
      scraper_version: audit.scraper_version,
      extractor_version: audit.extractor_version,
      tokenizer_version: audit.tokenizer_version,
      kpi_engine_version: audit.kpi_engine_version,
    },
  };

  return JSON.stringify(snapshot, null, 2);
}

// Import and replay audit snapshot
async function importAuditSnapshot(snapshotJson: string): Promise<AuditResult> {
  const snapshot = JSON.parse(snapshotJson);

  // Validate export version
  if (snapshot.export_version !== '1.0.0') {
    throw new Error('Unsupported export version');
  }

  // Replay audit using snapshot data
  const replayedAudit = await runAuditPipeline(
    snapshot.metadata_snapshot,
    snapshot.rule_set_snapshot
  );

  return replayedAudit;
}
```

### 4.6 Retention Policy

**Problem**: Storing all historical snapshots is expensive

**Solution**: Tiered retention policy

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Current Metadata | Indefinite | Required for production |
| Metadata History (< 30 days) | Indefinite | Recent changes, high query rate |
| Metadata History (30-90 days) | Indefinite | Medium query rate |
| Metadata History (90-365 days) | Indefinite | Low query rate, compliance |
| Metadata History (> 365 days) | Archive to S3 | Rarely accessed, cost optimization |
| Audit History (< 30 days) | Indefinite | Recent audits, high query rate |
| Audit History (> 30 days) | Archive to S3 | Rarely accessed |
| Rule Set History | Indefinite | Small size, required for reproducibility |

**Archive to S3**:
- Export old records to S3 as JSON files
- Delete from database
- On-demand restore if needed (rare)

---

## 5. Competitor Pipeline Structure

### 5.1 Purpose

**Goal**: Enable competitor metadata analysis without contaminating client app data

**Use Cases**:
1. **Competitive Benchmarking** — "How does my metadata compare to top 10 competitors?"
2. **Keyword Gap Analysis** — "Which keywords do competitors use that I don't?"
3. **Trend Tracking** — "How have competitor titles changed over 3 months?"

### 5.2 Data Segregation

**Critical Principle**: Competitor metadata must be **completely isolated** from client metadata

#### 5.2.1 Separate Tables

```sql
-- Client metadata (production apps)
CREATE TABLE app_metadata (...);

-- Competitor metadata (separate table)
CREATE TABLE competitor_metadata (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,
  platform TEXT NOT NULL,

  -- Metadata fields (same as app_metadata)
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT,

  -- Ownership tracking
  tracked_by_client_id UUID, -- Which client is tracking this competitor

  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (app_id, market, platform)
);

-- Competitor audit results (separate table)
CREATE TABLE competitor_audits (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  market TEXT NOT NULL,
  audited_at TIMESTAMPTZ NOT NULL,
  overall_score INTEGER NOT NULL,
  vertical TEXT NOT NULL,
  audit_result JSONB NOT NULL,
  UNIQUE (app_id, market)
);
```

#### 5.2.2 Why Separate Tables?

| Risk | Without Segregation | With Segregation |
|------|---------------------|------------------|
| **Data Leak** | Competitor metadata visible to wrong clients | Each client sees only their tracked competitors |
| **Cache Contamination** | Competitor audits cached alongside client audits | Separate cache namespaces |
| **Performance** | Large competitor dataset slows client queries | Isolated indexes, faster queries |
| **Retention** | Cannot purge old competitor data without affecting clients | Independent retention policies |

### 5.3 Competitor Tracking Workflow

#### 5.3.1 Add Competitor

```typescript
async function addCompetitor(
  clientId: string,
  competitorAppId: string,
  market: string
): Promise<void> {
  // Step 1: Scrape competitor metadata (Stage 1-3)
  const metadata = await scrapeAndExtractMetadata(competitorAppId, market);

  // Step 2: Store in competitor_metadata table
  await db.insert('competitor_metadata', {
    app_id: competitorAppId,
    market,
    platform: 'ios',
    title: metadata.title,
    subtitle: metadata.subtitle,
    description: metadata.description,
    category: metadata.category,
    tracked_by_client_id: clientId, // Ownership tracking
    updated_at: new Date(),
  });

  // Step 3: Compute initial audit
  const audit = await computeCompetitorAudit(competitorAppId, market);

  // Step 4: Store in competitor_audits table
  await db.insert('competitor_audits', audit);
}
```

#### 5.3.2 Benchmark Client vs Competitors

```typescript
async function benchmarkApp(
  clientAppId: string,
  market: string
): Promise<BenchmarkResult> {
  // Step 1: Get client audit
  const clientAudit = await getAudit(clientAppId, market);

  // Step 2: Get competitor audits (tracked by this client)
  const competitors = await getTrackedCompetitors(clientAppId, market);
  const competitorAudits = await Promise.all(
    competitors.map(c => getCompetitorAudit(c.app_id, market))
  );

  // Step 3: Compute percentile rankings
  const allScores = [clientAudit.overall_score, ...competitorAudits.map(a => a.overall_score)];
  allScores.sort((a, b) => a - b);
  const clientPercentile = (allScores.indexOf(clientAudit.overall_score) / allScores.length) * 100;

  return {
    client_score: clientAudit.overall_score,
    client_percentile: clientPercentile,
    competitor_scores: competitorAudits.map(a => ({
      app_id: a.app_id,
      score: a.overall_score,
      title: a.metadata.title,
    })),
    avg_competitor_score: average(competitorAudits.map(a => a.overall_score)),
    top_competitor: maxBy(competitorAudits, a => a.overall_score),
  };
}
```

### 5.4 Competitor Pipeline Differences

| Stage | Client Pipeline | Competitor Pipeline |
|-------|----------------|---------------------|
| 1-3. Scraping | Same | Same |
| 4. Tokenization | Same | Same |
| 5. Rule Set Loader | Client-specific overrides allowed | NO client overrides (use base + vertical + market only) |
| 6-11. Scoring | Same | Same |
| 12-13. Storage | `app_audits` table | `competitor_audits` table (separate) |
| Caching | Tier 1-3 caching | Tier 3 only (database cache, no in-memory) |
| Access Control | Multi-tenant RLS | Filtered by `tracked_by_client_id` |

### 5.5 Future Enhancements

1. **Competitor Auto-Discovery** — Suggest competitors based on category/keywords
2. **Competitor Change Alerts** — Notify when competitor updates metadata
3. **Keyword Gap Analysis** — "Competitors use X keywords you don't"
4. **Trend Charts** — Visualize competitor score evolution over time
5. **Bulk Competitor Import** — CSV upload of competitor app IDs

---

## 6. Multi-Vertical Safety Principles

### 6.1 Purpose

**Goal**: Prevent vertical-specific patterns from leaking across verticals

**Risk Example**: Language-learning patterns contaminate reward app audits (documented in Phase 6)

### 6.2 Safety Mechanisms

#### 6.2.1 Vertical Detection

**Automatic Vertical Mapping**:
```typescript
const CATEGORY_TO_VERTICAL_MAP: Record<string, string> = {
  // Education
  'Education': 'language_learning',

  // Finance
  'Finance': 'finance',
  'Business': 'finance',

  // Rewards
  'Entertainment': 'rewards', // Context-dependent (needs refinement)
  'Lifestyle': 'rewards', // Context-dependent

  // Dating
  'Social Networking': 'dating', // Context-dependent

  // Fallback
  'Unknown': 'base',
};

function detectVertical(category: string, title: string): string {
  const vertical = CATEGORY_TO_VERTICAL_MAP[category];

  // Refinement logic (if category is ambiguous)
  if (vertical === 'rewards' && !title.match(/\b(earn|reward|cash|points)\b/i)) {
    return 'base'; // Not a reward app
  }

  return vertical || 'base';
}
```

#### 6.2.2 Override Isolation

**Rule**: Vertical overrides NEVER affect other verticals

**Enforcement**:
```typescript
// ✅ CORRECT: Load vertical-specific rule set
const rewardsRules = await loadRuleSet('rewards', 'US');
const financeRules = await loadRuleSet('finance', 'US');

// ❌ INCORRECT: Share rule sets across verticals
const sharedRules = await loadRuleSet('base', 'US');
// Apply shared rules to all apps → vertical leakage!
```

**Caching Isolation**:
```typescript
// Cache key MUST include vertical
const cacheKey = `ruleset:${vertical}:${market}`;

// ❌ INCORRECT: Cache without vertical
const cacheKey = `ruleset:${market}`; // Leakage risk!
```

#### 6.2.3 Validation Checks

**Pre-Flight Validation** (before applying rule set):
```typescript
function validateRuleSetIsolation(ruleSet: MergedRuleSet, appCategory: string): void {
  const expectedVertical = detectVertical(appCategory, '');

  if (ruleSet.vertical !== expectedVertical) {
    throw new Error(
      `Rule set vertical mismatch: expected ${expectedVertical}, got ${ruleSet.vertical}`
    );
  }
}
```

### 6.3 Leak Detection

**Monitor for Cross-Vertical Contamination**:

```typescript
// Log warning if rule set applied to wrong vertical
function auditRuleSetUsage(appId: string, category: string, ruleSetVertical: string): void {
  const expectedVertical = detectVertical(category, '');

  if (ruleSetVertical !== expectedVertical) {
    logger.warn('Potential vertical leakage detected', {
      app_id: appId,
      category,
      expected_vertical: expectedVertical,
      actual_vertical: ruleSetVertical,
    });

    // Emit metric for monitoring
    metrics.increment('vertical_leakage_warning', {
      expected: expectedVertical,
      actual: ruleSetVertical,
    });
  }
}
```

### 6.4 Fallback Behavior

**Scenario**: App category is "Games" but no "games" vertical exists

**Fallback**:
```typescript
const vertical = detectVertical('Games', title);
// Returns: "base" (fallback)

const ruleSet = await loadRuleSet('base', market);
// Uses base rules (vertical-agnostic)
```

**Future**: Create "games" vertical with gaming-specific patterns

---

## 7. Multi-Market Safety Principles

### 7.1 Purpose

**Goal**: Support locale-specific metadata variations without code changes

**Examples**:
- German stopwords: "der", "die", "das" (vs English "the", "a", "an")
- Japanese character limits: 15 chars (vs English 30 chars)
- Chinese tokenization: Word segmentation (vs English whitespace splitting)

### 7.2 Market-Specific Overrides

#### 7.2.1 Stopwords

**Base Stopwords** (English):
```typescript
const baseStopwords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
]);
```

**Market Override** (German):
```typescript
const germanStopwords = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des',
  'ein', 'eine', 'eines', 'einem', 'einen',
  'und', 'oder', 'aber', 'in', 'an', 'auf', 'für',
  'von', 'mit', 'zu', 'aus', 'bei', 'nach', 'über',
]);
```

**Merge Logic**:
```typescript
const mergedStopwords = new Set([...baseStopwords, ...germanStopwords]);
```

#### 7.2.2 Character Limits

**Market-Specific Limits**:
```typescript
const CHARACTER_LIMITS: Record<string, { title: number; subtitle: number }> = {
  US: { title: 30, subtitle: 30 },
  UK: { title: 30, subtitle: 30 },
  DE: { title: 30, subtitle: 30 },
  JP: { title: 15, subtitle: 15 }, // CJK characters (2 bytes each)
  CN: { title: 15, subtitle: 15 },
};

function getTitleCharLimit(market: string): number {
  return CHARACTER_LIMITS[market]?.title || 30; // Default to US limit
}
```

#### 7.2.3 Filler Patterns

**Base Filler Patterns** (English):
```typescript
const baseFillerPatterns = /\b(best|top|great|good|new|latest|free|premium|pro|plus)\b/i;
```

**Market Override** (German):
```typescript
const germanFillerPatterns = /\b(beste|top|großartig|gut|neu|neueste|kostenlos|premium|pro|plus)\b/i;
```

**Merge Logic**:
```typescript
// Combine patterns with OR
const mergedFillerPatterns = new RegExp(
  `(${baseFillerPatterns.source})|(${germanFillerPatterns.source})`,
  'i'
);
```

### 7.3 Tokenization Strategies by Market

| Market | Language | Tokenization Strategy |
|--------|----------|----------------------|
| US, UK | English | Whitespace + punctuation splitting |
| DE | German | Whitespace + compound word splitting |
| FR, ES | French, Spanish | Whitespace + punctuation splitting |
| JP | Japanese | Morphological analysis (MeCab, Kuromoji) |
| CN | Chinese | Word segmentation (Jieba, THULAC) |
| KR | Korean | Morphological analysis (KoNLPy) |

**Future Enhancement**: Integrate NLP libraries for CJK tokenization

### 7.4 Market Detection

**Automatic Market Detection** (from app_id):
```typescript
function detectMarket(appId: string, explicitMarket?: string): string {
  if (explicitMarket) {
    return explicitMarket; // User-provided
  }

  // Heuristic: Detect from App Store URL (if available)
  // Example: https://apps.apple.com/de/app/id1234567890 → "DE"
  const marketFromUrl = extractMarketFromUrl(appId);
  if (marketFromUrl) {
    return marketFromUrl;
  }

  // Default to US
  return 'US';
}
```

### 7.5 Locale-Specific Numeric Penalties

**Example**: "24/7" is valuable for finance apps in US, but penalized for learning apps

**Market Override** (US Finance):
```typescript
const usFinanceNumericWhitelist = new Set([
  '24/7', '401k', '529', 'w2', '1099',
]);

function isNumericPenalized(token: string, market: string, vertical: string): boolean {
  if (market === 'US' && vertical === 'finance') {
    return !usFinanceNumericWhitelist.has(token.toLowerCase());
  }

  // Default: Penalize all numeric tokens
  return /\d/.test(token);
}
```

### 7.6 Market-Specific Validation

**Pre-Flight Validation**:
```typescript
function validateMarketSupport(market: string): void {
  const supportedMarkets = ['US', 'UK', 'DE', 'FR', 'ES', 'JP', 'CN', 'KR'];

  if (!supportedMarkets.includes(market)) {
    logger.warn(`Unsupported market: ${market}, falling back to US`);
    return 'US';
  }

  return market;
}
```

---

## 8. Extensibility & Admin Layer Requirements

### 8.1 Purpose

**Goal**: Enable non-technical stakeholders to manage ASO Bible configuration without code changes

**Admin Personas**:
1. **ASO Consultants** — Adjust KPI weights, test rule changes
2. **Product Managers** — Review vertical mappings, approve rule publications
3. **Data Scientists** — Analyze KPI performance, propose new formulas
4. **Client Success** — Create client-specific overrides

### 8.2 Admin UI Features (Future)

#### 8.2.1 Feature 1: KPI Weight Editor

**Purpose**: Adjust KPI weights for families and individual KPIs

**UI Components**:
- **Family Weight Sliders** — Adjust 6 family weights (must sum to 1.0)
  - Real-time validation (red border if sum ≠ 1.0)
  - Lock/unlock family weights
  - Reset to defaults button

- **KPI Weight Sliders** — Adjust individual KPI weights within a family
  - Grouped by family (collapsible sections)
  - Show current weight + normalized weight
  - Preview impact on sample apps (live score updates)

**Workflow**:
1. Admin selects vertical + market (e.g., "Rewards", "US")
2. Loads current rule set weights
3. Adjusts sliders (debounced updates)
4. Previews changes on 3-5 sample apps
5. Saves as draft OR publishes live

**Database Schema**:
```sql
CREATE TABLE kpi_weight_overrides (
  id UUID PRIMARY KEY,
  vertical TEXT NOT NULL,
  market TEXT,
  kpi_id TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  status TEXT NOT NULL, -- "draft" | "live"
  created_by UUID, -- Admin user ID
  created_at TIMESTAMPTZ NOT NULL
);
```

#### 8.2.2 Feature 2: Formula Builder

**Purpose**: Create and modify scoring formulas

**UI Components**:
- **Formula Component Selector** — Choose KPIs for formula
  - Drag-and-drop KPI pills
  - Assign weight to each component
  - Live validation (sum of weights)

- **Formula Tester** — Test formula on sample apps
  - Input: Sample app metadata
  - Output: Computed formula score
  - Comparison: Old formula vs new formula

**Workflow**:
1. Admin selects formula to edit (e.g., "Title Element Score")
2. Adjusts component weights
3. Tests on 5-10 sample apps
4. Compares old vs new scores (diff view)
5. Saves as draft OR publishes

#### 8.2.3 Feature 3: Pattern Editor (Safe Mode)

**Purpose**: Edit token relevance patterns, intent patterns, hook patterns

**UI Components**:
- **Token Relevance Editor**
  - Table view: Token → Relevance (0, 1, 2, 3)
  - Add/edit/delete tokens
  - Bulk import from CSV

- **Intent Pattern Editor**
  - Table view: Intent → Regex Pattern
  - Pattern tester (input text, show matched intent)
  - Validation: Must be valid regex

- **Hook Pattern Editor**
  - Table view: Hook → Regex Pattern
  - Pattern tester (input text, show matched hooks)

**Safety Features**:
- **Regex Validation** — Block invalid regex patterns
- **Preview Mode** — Test patterns on sample apps before publishing
- **Rollback** — Restore previous pattern version if issues detected

#### 8.2.4 Feature 4: Vertical Rule Manager

**Purpose**: Manage vertical-specific rule sets

**UI Components**:
- **Vertical Selector** — Choose vertical (rewards, finance, dating, etc.)
- **Rule Set Overview** — Show all overrides for vertical
  - Token relevance overrides (count)
  - Intent pattern overrides (count)
  - Hook pattern overrides (count)
  - KPI weight overrides (count)
  - Formula weight overrides (count)

- **Rule Set Diff Viewer** — Compare base vs vertical rules
  - Side-by-side view: Base | Vertical
  - Highlight differences (added, removed, changed)

**Workflow**:
1. Admin selects vertical (e.g., "Rewards")
2. Views current overrides
3. Edits overrides (using editors from Features 1-3)
4. Previews impact on sample apps
5. Publishes vertical rule set

#### 8.2.5 Feature 5: Recommendation Template Editor

**Purpose**: Edit recommendation messages with template variables

**UI Components**:
- **Template Selector** — Choose recommendation rule
  - Filtered by severity (critical, moderate, minor)
  - Filtered by KPI family

- **Template Editor** — Edit message with variables
  - Wysiwyg editor with variable chips (e.g., `{{category_example_1}}`)
  - Variable selector dropdown (insert variables)
  - Preview with sample data

**Template Variables**:
```typescript
const TEMPLATE_VARIABLES = {
  '{{category_example_1}}': 'Category-specific example 1 (e.g., "earn rewards")',
  '{{category_example_2}}': 'Category-specific example 2 (e.g., "cashback")',
  '{{current_score}}': 'Current KPI score (e.g., 42)',
  '{{target_score}}': 'Target KPI score (e.g., 60)',
  '{{kpi_name}}': 'KPI label (e.g., "Title Unique Keywords")',
};
```

**Workflow**:
1. Admin selects recommendation template
2. Edits message text + variables
3. Previews on sample apps (variables replaced with actual values)
4. Saves as draft OR publishes

#### 8.2.6 Feature 6: Rule Set Publishing Workflow

**Purpose**: Draft → Preview → Publish workflow for rule changes

**Workflow States**:
1. **Draft** — Admin edits rule set, NOT visible to production
2. **Preview** — Admin tests rule set on sample apps (preview mode badge)
3. **Scheduled** — Admin schedules publication for specific date/time
4. **Live** — Rule set published, affects production audits
5. **Archived** — Previous rule set version (read-only)

**UI Components**:
- **Rule Set Status Badge** — Shows current status (draft, live, archived)
- **Publish Button** — Triggers publication workflow
  - Confirm dialog: "Publish rule set? This will invalidate X audits."
  - Option: "Re-audit top 100 apps immediately" (checkbox)
  - Option: "Schedule publication for [date/time picker]"

- **Change Log** — Shows all rule set changes with timestamps
  - Who changed what, when
  - Diff view for each change

**Database Schema**:
```sql
CREATE TABLE rule_set_publications (
  id UUID PRIMARY KEY,
  vertical TEXT NOT NULL,
  market TEXT,
  version TEXT NOT NULL,
  status TEXT NOT NULL, -- "draft" | "scheduled" | "live" | "archived"
  published_by UUID, -- Admin user ID
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ, -- For scheduled publications
  change_summary TEXT, -- User-provided summary
  affected_app_count INTEGER, -- How many audits will be invalidated
  INDEX (vertical, market, published_at DESC)
);
```

#### 8.2.7 Feature 7: A/B Testing Framework

**Purpose**: Compare two rule sets side-by-side

**UI Components**:
- **A/B Test Creator**
  - Select Control (baseline rule set)
  - Select Variant (new rule set)
  - Select sample apps (random sample or specific apps)
  - Run comparison

- **A/B Test Results Dashboard**
  - Table view: App | Control Score | Variant Score | Diff
  - Summary metrics: Avg score change, % improved, % degraded
  - Statistical significance (p-value)

**Workflow**:
1. Admin creates A/B test
2. Selects 100 random apps (or specific app list)
3. Computes audits with both rule sets
4. Views side-by-side results
5. Decides: Keep control OR adopt variant

**Database Schema**:
```sql
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  control_rule_set_id UUID NOT NULL,
  variant_rule_set_id UUID NOT NULL,
  sample_app_ids TEXT[], -- Array of app IDs
  status TEXT NOT NULL, -- "running" | "completed"
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE ab_test_results (
  id UUID PRIMARY KEY,
  ab_test_id UUID NOT NULL,
  app_id TEXT NOT NULL,
  control_score INTEGER NOT NULL,
  variant_score INTEGER NOT NULL,
  score_diff INTEGER NOT NULL, -- variant - control
  FOREIGN KEY (ab_test_id) REFERENCES ab_tests(id)
);
```

#### 8.2.8 Feature 8: Config Export/Import

**Purpose**: Export/import rule sets for review or backup

**Export Format** (JSON):
```json
{
  "export_version": "1.0.0",
  "vertical": "rewards",
  "market": "US",
  "version": "2.2.0",
  "exported_at": "2025-11-23T10:00:00Z",
  "token_relevance": {...},
  "intent_patterns": [...],
  "hook_patterns": [...],
  "kpi_weights": {...},
  "formula_weights": {...},
  "recommendation_templates": {...}
}
```

**Workflow**:
1. Admin exports rule set as JSON file
2. Reviews/edits JSON file offline (or shares with team)
3. Admin imports JSON file back into system
4. System validates JSON schema
5. System creates new draft rule set

#### 8.2.9 Feature 9: Audit History Explorer

**Purpose**: Browse historical audits and replay them

**UI Components**:
- **Timeline Slider** — Select date range
- **App Selector** — Choose app to explore
- **History Table** — Show all audits for app
  - Columns: Date, Score, Vertical, Rule Version
  - Click row → View full audit details
  - "Replay" button → Re-compute audit with historical data

**Workflow**:
1. Admin selects app + date range
2. Views audit history (score over time chart)
3. Clicks specific audit to view details
4. Optionally replays audit to verify reproducibility

#### 8.2.10 Feature 10: Vertical Mapping Manager

**Purpose**: Manage category → vertical mappings

**UI Components**:
- **Mapping Table** — Category → Vertical
  - Editable dropdown for vertical
  - Add custom category mappings
  - Override default mappings

**Example**:
| Category | Vertical | Override? |
|----------|----------|-----------|
| Education | language_learning | No (default) |
| Finance | finance | No (default) |
| Entertainment | rewards | Yes (custom refinement logic) |
| Social Networking | dating | Yes (custom refinement logic) |

**Refinement Logic Editor**:
- For ambiguous categories (e.g., "Entertainment"), define refinement regex
- Example: If title matches `/\b(earn|reward|cash)\b/i` → "rewards", else → "base"

### 8.3 API Endpoints (Backend)

All admin features require RESTful API endpoints:

```typescript
// KPI Weight Management
POST /api/admin/kpi-weights/:vertical/:market
GET /api/admin/kpi-weights/:vertical/:market
PUT /api/admin/kpi-weights/:vertical/:market/:kpi_id

// Formula Management
POST /api/admin/formulas/:vertical/:market
GET /api/admin/formulas/:vertical/:market
PUT /api/admin/formulas/:vertical/:market/:formula_id

// Pattern Management
POST /api/admin/patterns/token-relevance/:vertical/:market
POST /api/admin/patterns/intent/:vertical/:market
POST /api/admin/patterns/hook/:vertical/:market

// Rule Set Management
GET /api/admin/rule-sets/:vertical/:market
POST /api/admin/rule-sets/:vertical/:market/draft
POST /api/admin/rule-sets/:vertical/:market/publish
POST /api/admin/rule-sets/:vertical/:market/rollback

// A/B Testing
POST /api/admin/ab-tests
GET /api/admin/ab-tests/:id
GET /api/admin/ab-tests/:id/results

// Export/Import
GET /api/admin/export/:vertical/:market
POST /api/admin/import

// Historical Audits
GET /api/admin/audits/history/:app_id
POST /api/admin/audits/replay/:app_id/:target_date
```

### 8.4 Permissions & Access Control

**Role-Based Access Control (RBAC)**:

| Role | Permissions |
|------|-------------|
| **Viewer** | View rule sets, view audits (read-only) |
| **Editor** | Create drafts, edit drafts, preview (cannot publish) |
| **Publisher** | Publish rule sets, schedule publications |
| **Admin** | All permissions + user management |

**Database Schema**:
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL, -- "viewer" | "editor" | "publisher" | "admin"
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- "create_draft" | "publish" | "rollback"
  resource_type TEXT NOT NULL, -- "rule_set" | "kpi_weight" | "formula"
  resource_id UUID,
  metadata JSONB, -- Additional context
  created_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (user_id) REFERENCES admin_users(id)
);
```

---

## 9. Data Governance & Security

### 9.1 GDPR Compliance

**Principle**: Minimize PII storage, enable data deletion

#### 9.1.1 Data Classification

| Data Type | Contains PII? | Retention | Deletion |
|-----------|---------------|-----------|----------|
| App Metadata (title, subtitle, description) | No | 365 days → Archive | Can delete |
| App ID | No (public identifier) | Indefinite | Can delete |
| Developer Name | Potentially (if individual name) | 365 days → Archive | Can delete |
| User Email (admin users) | Yes | While account active | Must delete on request |
| Audit Access Logs | Potentially (if contains user_id) | 90 days | Auto-purge |

#### 9.1.2 Right to Erasure

**User Request**: "Delete all data for app ID X"

**Process**:
1. Delete from `app_metadata`
2. Delete from `app_metadata_history`
3. Delete from `app_audits`
4. Delete from `app_audits_history`
5. Delete from `enriched_metadata`
6. Delete from `app_audit_access_log`

**SQL Query**:
```sql
-- Delete all data for app ID
DELETE FROM app_metadata WHERE app_id = $1;
DELETE FROM app_metadata_history WHERE app_id = $1;
DELETE FROM app_audits WHERE app_id = $1;
DELETE FROM app_audits_history WHERE app_id = $1;
DELETE FROM enriched_metadata WHERE app_id = $1;
DELETE FROM app_audit_access_log WHERE app_id = $1;
```

### 9.2 Data Encryption

#### 9.2.1 Encryption at Rest

**Database**:
- PostgreSQL: Enable Transparent Data Encryption (TDE)
- Supabase: Encryption enabled by default

**Backups**:
- Encrypt database backups with AES-256
- Store encryption keys in AWS KMS or similar

#### 9.2.2 Encryption in Transit

**API**:
- HTTPS only (TLS 1.2+)
- Certificate pinning for mobile clients

**Database Connections**:
- SSL/TLS required for all connections
- Reject unencrypted connections

### 9.3 Multi-Tenant Isolation

**Principle**: Client A cannot access Client B's data

#### 9.3.1 Row-Level Security (RLS)

**Supabase RLS Policies**:
```sql
-- Only return apps owned by current client
CREATE POLICY "Client can only view own apps"
ON app_metadata
FOR SELECT
USING (client_id = auth.uid());

-- Only return audits for apps owned by current client
CREATE POLICY "Client can only view own audits"
ON app_audits
FOR SELECT
USING (app_id IN (
  SELECT app_id FROM app_metadata WHERE client_id = auth.uid()
));

-- Competitors: Only return competitors tracked by current client
CREATE POLICY "Client can only view tracked competitors"
ON competitor_metadata
FOR SELECT
USING (tracked_by_client_id = auth.uid());
```

#### 9.3.2 Application-Level Filtering

**Backend Query** (if not using RLS):
```typescript
// ❌ INCORRECT: No filtering
const apps = await db.select('app_metadata');

// ✅ CORRECT: Filter by client_id
const apps = await db.select('app_metadata').where({ client_id: currentUser.id });
```

### 9.4 Audit Logging

**Purpose**: Track all admin actions for compliance and debugging

**Events to Log**:
- Rule set publications (who, when, what changed)
- KPI weight changes (who, when, old value, new value)
- Formula changes (who, when, diff)
- Pattern changes (who, when, diff)
- Audit invalidations (who, when, how many apps affected)
- Data deletions (who, when, app_id)

**Database Schema** (see Section 8.4):
```sql
CREATE TABLE admin_audit_log (...);
```

**Retention**: 2 years (compliance requirement)

### 9.5 Rate Limiting

**Purpose**: Prevent abuse of API endpoints

**Limits**:
| Endpoint | Rate Limit | Burst |
|----------|------------|-------|
| GET /api/audit/:app_id | 100 req/min | 200 req/min |
| POST /api/audit/refresh | 10 req/min | 20 req/min |
| GET /api/admin/* | 1000 req/min | 2000 req/min |
| POST /api/admin/publish | 5 req/min | 10 req/min |

**Implementation**:
- Redis-based rate limiter (token bucket algorithm)
- Return 429 Too Many Requests with Retry-After header

---

## 10. Performance & Compute Requirements

### 10.1 Serverless Architecture

**Deployment Model**: Serverless functions for scalability

**Benefits**:
- Auto-scaling based on load
- Pay-per-invocation (no idle costs)
- Geographic distribution (edge functions)

**Tradeoffs**:
- Cold start latency (500ms-2s)
- Execution time limits (10-15 minutes max)

**Mitigation**:
- Keep functions warm (periodic health checks)
- Optimize bundle size (tree-shaking, code splitting)

### 10.2 Compute Targets

#### 10.2.1 Audit Pipeline Compute Budget

| Stage | Target Latency | CPU | Memory |
|-------|----------------|-----|--------|
| 1-3. Scraping | 2-5 seconds | Low | 128 MB |
| 4. Tokenization | 20-50ms | Medium | 256 MB |
| 5. Rule Set Loader | 5-10ms | Low | 128 MB |
| 6-8. Enrichment | 30-60ms | Medium | 256 MB |
| 9-10. Scoring | 50-100ms | High | 512 MB |
| 11. Recommendations | 20-50ms | Medium | 256 MB |
| **Total (Cold)** | **3-6 seconds** | - | **512 MB** |
| **Total (Warm)** | **100-200ms** | - | **256 MB** |

**Serverless Function Config**:
```yaml
audit_pipeline:
  memory: 512MB
  timeout: 10 seconds
  runtime: Node.js 20.x
  concurrency: 100 # Max concurrent invocations
```

#### 10.2.2 Background Jobs Compute Budget

| Job | Frequency | Duration | CPU | Memory |
|-----|-----------|----------|-----|--------|
| Metadata Refresh | Every 1 hour | 5-10 minutes | Medium | 256 MB |
| Top 100 Re-Audit | On rule publish | 10-20 minutes | High | 1 GB |
| Cache Warming | On server start | 10-20 seconds | Medium | 512 MB |
| Historical Archive | Every 24 hours | 30-60 minutes | Low | 256 MB |

**Queue-Based Processing**:
- Use job queue (BullMQ, Celery) for background jobs
- Horizontal scaling: Spin up more workers on high load

### 10.3 Caching Performance Targets

**Goal**: 95% cache hit rate for production traffic

| Cache Layer | Hit Rate Target | Latency Target |
|-------------|-----------------|----------------|
| Browser Cache | 80% | 0ms (instant) |
| In-Memory Cache | 95% | <10ms |
| Database Cache | 100% | <50ms |

**Monitoring**:
- Track cache hit/miss rates (Prometheus metrics)
- Alert if cache hit rate < 90%

### 10.4 Database Performance

#### 10.4.1 Query Performance Targets

| Query Type | Target Latency | Notes |
|------------|----------------|-------|
| SELECT app_metadata WHERE app_id = ? | <10ms | Primary key lookup |
| SELECT app_audits WHERE app_id = ? | <20ms | JSONB column |
| SELECT app_metadata_history WHERE ... | <50ms | Index on (app_id, valid_from) |
| INSERT app_audits | <30ms | JSONB serialization overhead |
| DELETE app_audits WHERE vertical = ? | <500ms | Bulk delete |

#### 10.4.2 Index Strategy

**Required Indexes**:
```sql
-- app_metadata
CREATE INDEX idx_app_metadata_app_id ON app_metadata(app_id);
CREATE INDEX idx_app_metadata_category ON app_metadata(category);
CREATE INDEX idx_app_metadata_updated_at ON app_metadata(updated_at DESC);

-- app_audits
CREATE INDEX idx_app_audits_app_id_market ON app_audits(app_id, market);
CREATE INDEX idx_app_audits_vertical ON app_audits(vertical);
CREATE INDEX idx_app_audits_audited_at ON app_audits(audited_at DESC);

-- app_metadata_history
CREATE INDEX idx_app_metadata_history_temporal ON app_metadata_history(app_id, market, valid_from DESC);

-- app_audits_history
CREATE INDEX idx_app_audits_history_temporal ON app_audits_history(app_id, market, audited_at DESC);

-- app_audit_access_log
CREATE INDEX idx_access_log_recent ON app_audit_access_log(accessed_at DESC);
```

#### 10.4.3 Connection Pooling

**Config**:
- Min connections: 5
- Max connections: 20
- Idle timeout: 10 seconds
- Connection reuse: Enabled

**Library**: `pg-pool` (Node.js) or Supabase connection pool

### 10.5 Horizontal Scaling

**Stateless Design**: All functions are stateless (no local state)

**Scaling Strategy**:
1. **API Layer**: Auto-scale serverless functions (AWS Lambda, Vercel Functions)
2. **Database Layer**: Use read replicas for read-heavy workloads
3. **Cache Layer**: Use Redis cluster for distributed caching

**Load Balancing**:
- Use CDN (Cloudflare, AWS CloudFront) for static assets
- Use load balancer (AWS ALB, Nginx) for API endpoints

---

## 11. Future Roadmap

### 11.1 Phase 8: Implement 3 Test Verticals (Q1 2026)

**Scope**:
- Migrate current patterns to registry format
- Implement 3 verticals: `language_learning`, `rewards`, `finance`
- Build vertical rule loader
- Deploy to staging environment
- Test with 100 sample apps

**Deliverables**:
- `src/engine/metadata/verticals/language_learning/`
- `src/engine/metadata/verticals/rewards/`
- `src/engine/metadata/verticals/finance/`
- Vertical loader service
- Unit tests + integration tests

### 11.2 Phase 9: Build Admin UI (Q2 2026)

**Scope**:
- Implement 10 admin features (Section 8.2)
- Build RBAC system
- Deploy to production with limited access

**Deliverables**:
- KPI Weight Editor UI
- Formula Builder UI
- Pattern Editor UI
- Rule Set Publishing Workflow
- A/B Testing Framework

### 11.3 Phase 10: Expand Vertical Coverage (Q3 2026)

**Scope**:
- Add 7 more verticals: `gaming`, `health`, `productivity`, `travel`, `food`, `shopping`, `social`
- Total: 10 verticals

**Deliverables**:
- 7 new vertical rule sets
- Documentation for each vertical
- Sample apps for testing

### 11.4 Phase 11: Multi-Market Support (Q4 2026)

**Scope**:
- Add market-specific overrides for 8 markets: US, UK, DE, FR, ES, JP, CN, KR
- Integrate NLP libraries for CJK tokenization

**Deliverables**:
- Market-specific stopwords (8 markets)
- Market-specific filler patterns (8 markets)
- CJK tokenization support (JP, CN, KR)

### 11.5 Phase 12: Competitor Benchmarking (Q1 2027)

**Scope**:
- Implement competitor pipeline (Section 5)
- Build benchmarking UI
- Add keyword gap analysis

**Deliverables**:
- Competitor metadata tables
- Competitor audit pipeline
- Benchmarking dashboard
- Keyword gap analysis report

### 11.6 Phase 13: Machine Learning Enhancements (Q2 2027)

**Scope**:
- Auto-detect vertical from metadata (ML classifier)
- Auto-suggest pattern improvements (NLP analysis)
- Anomaly detection for category mismatch

**Deliverables**:
- Vertical classifier model (90%+ accuracy)
- Pattern suggestion service
- Anomaly detection alerts

---

## 12. Appendix

### 12.1 Glossary

| Term | Definition |
|------|------------|
| **Audit** | Complete evaluation of app metadata (title, subtitle, description) with 34 KPI scores |
| **Audit Result** | JSON object containing audit scores, recommendations, version stamps |
| **Cache Invalidation** | Process of clearing stale cache entries when dependencies change |
| **Combo** | Keyword combination (n-gram) extracted from title/subtitle (e.g., "learn spanish") |
| **Enriched Metadata** | Metadata + tokens + combos + intents + hooks |
| **Freeze Mode** | Admin feature to test draft rules without affecting production |
| **Hook** | Psychological motivation category (e.g., "learning", "outcome", "earning") |
| **Intent** | User search intent classification (e.g., "learning", "earning", "trading") |
| **KPI** | Key Performance Indicator (34 total, grouped into 6 families) |
| **LRU** | Least Recently Used (cache eviction policy) |
| **Market** | Locale/country code (e.g., "US", "UK", "DE") |
| **Merged Rule Set** | Combined rule set (Base + Vertical + Market + Client) |
| **Reproducibility** | Ability to replay historical audit with exact metadata + rule set |
| **RLS** | Row-Level Security (database access control) |
| **Rule Set** | Collection of patterns, weights, thresholds for a vertical + market |
| **Stopword** | Low-value token (e.g., "the", "a", "an") filtered during tokenization |
| **Token** | Individual word extracted from metadata (e.g., "learn", "spanish") |
| **TTL** | Time To Live (cache expiration duration) |
| **Vertical** | App category grouping (e.g., "language_learning", "rewards", "finance") |
| **Version Stamp** | Version identifier for reproducibility (e.g., "scraper_version: 1.2.0") |

### 12.2 Database Schema Summary

**Core Tables** (10 total):
1. `app_metadata` — Current app metadata
2. `app_metadata_history` — Historical app metadata (temporal)
3. `app_audits` — Current audit results
4. `app_audits_history` — Historical audit results
5. `enriched_metadata` — Tokens, combos, intents, hooks (future)
6. `rule_sets` — Draft/live rule sets
7. `rule_set_history` — Historical rule sets (temporal)
8. `competitor_metadata` — Competitor app metadata
9. `competitor_audits` — Competitor audit results
10. `app_audit_access_log` — Access tracking for cache warming

**Admin Tables** (5 total):
1. `admin_users` — Admin user accounts
2. `admin_audit_log` — Admin action tracking
3. `kpi_weight_overrides` — KPI weight overrides
4. `ab_tests` — A/B test definitions
5. `ab_test_results` — A/B test results

**Total**: 15 tables

### 12.3 API Endpoint Summary

**Public API** (5 endpoints):
- `GET /api/audit/:app_id` — Get audit result
- `POST /api/audit/refresh/:app_id` — Force refresh audit
- `GET /api/metadata/:app_id` — Get app metadata
- `GET /api/competitors/:client_id` — Get tracked competitors
- `GET /api/benchmark/:app_id` — Get competitive benchmark

**Admin API** (15 endpoints):
- `GET /api/admin/kpi-weights/:vertical/:market`
- `PUT /api/admin/kpi-weights/:vertical/:market/:kpi_id`
- `GET /api/admin/formulas/:vertical/:market`
- `PUT /api/admin/formulas/:vertical/:market/:formula_id`
- `POST /api/admin/patterns/token-relevance/:vertical/:market`
- `POST /api/admin/patterns/intent/:vertical/:market`
- `POST /api/admin/patterns/hook/:vertical/:market`
- `POST /api/admin/rule-sets/:vertical/:market/draft`
- `POST /api/admin/rule-sets/:vertical/:market/publish`
- `POST /api/admin/rule-sets/:vertical/:market/rollback`
- `POST /api/admin/ab-tests`
- `GET /api/admin/ab-tests/:id/results`
- `GET /api/admin/export/:vertical/:market`
- `POST /api/admin/import`
- `GET /api/admin/audits/history/:app_id`

**Total**: 20 endpoints

### 12.4 Performance Benchmarks

**Target Latencies** (95th percentile):
- Cold audit (first request): < 6 seconds
- Warm audit (metadata cached): < 200ms
- Hot audit (full cache hit): < 20ms
- Rule set load: < 10ms
- Database query (indexed): < 50ms
- Cache lookup (in-memory): < 10ms

**Target Throughput**:
- Audit requests: 1000 req/min (production)
- Admin API: 100 req/min
- Database writes: 500 writes/min

**Target Availability**: 99.9% uptime (SLA)

### 12.5 Cost Estimates (Future)

**Infrastructure Costs** (monthly, 10,000 apps):

| Service | Usage | Cost |
|---------|-------|------|
| Database (PostgreSQL) | 100 GB storage, 1M queries | $50 |
| Serverless Functions | 5M invocations, 512 MB | $100 |
| Cache (Redis) | 4 GB memory | $30 |
| CDN (Cloudflare) | 10 TB bandwidth | $20 |
| Storage (S3 archival) | 500 GB | $10 |
| **Total** | - | **$210/month** |

**Per-App Cost**: $0.021/month (at scale)

### 12.6 References

**Related Documentation**:
1. `ASO_BIBLE_SCALABLE_ARCHITECTURE.md` — Vertical rule system design (Phase 6)
2. `METADATA_KPI_AND_FORMULA_REGISTRY.md` — KPI/formula registry reference (Phase 5B)
3. `KPI_ENGINE_INTEGRATION_COMPLETE.md` — KPI engine integration (Phase 5A)
4. `REGISTRY_ENHANCEMENT_COMPLETE.md` — Registry enhancement summary (Phase 5B)
5. `PHASE_6_SCALABLE_ARCHITECTURE_COMPLETE.md` — Phase 6 summary

**External Resources**:
- ASO Best Practices: https://developer.apple.com/app-store/app-metadata/
- Regex Testing: https://regex101.com/
- PostgreSQL Temporal Tables: https://www.postgresql.org/docs/current/rangetypes.html

---

**✅ INFRASTRUCTURE DOCUMENTATION COMPLETE**

**Document Stats**:
- Sections: 12
- Subsections: 70+
- Code Examples: 50+
- Database Schemas: 15 tables
- API Endpoints: 20 endpoints
- Total Lines: 2180+

**Next Steps**: See Phase 8+ in Section 11 (Future Roadmap)

