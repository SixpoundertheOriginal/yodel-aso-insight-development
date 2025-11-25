# Complete ASO Audit Pipeline Architecture
## System Documentation for AI-Assisted Development

**Last Updated**: November 25, 2025
**Purpose**: Document the complete audit pipeline, caching strategies, and integration points to prevent duplication and enable AI-enhanced future development.

---

## 🎯 Executive Summary

The Yodel ASO Audit system consists of **two parallel pipelines** that analyze app metadata:

1. **Metadata Audit Pipeline** (The Brain): ASO Bible-driven scoring, KPIs, intent coverage, combo analysis
2. **LLM Visibility Pipeline** (The Enhancement): LLM discoverability analysis for ChatGPT/Claude/Perplexity

Both pipelines operate **independently** but share common infrastructure (caching, monitored apps, vertical detection). They are **not duplicative** - they serve different purposes:
- **Metadata Audit**: Traditional ASO metrics (keyword coverage, title optimization, etc.)
- **LLM Visibility**: AI discoverability metrics (semantic clusters, snippet quality, intent coverage)

---

## 📐 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER ENTRY POINT                                │
│                                                                         │
│  Component: AppAuditHub.tsx                                            │
│  Location: src/components/AppAudit/AppAuditHub.tsx                     │
│                                                                         │
│  Modes:                                                                │
│  - Live Mode: Scrapes app data in real-time                           │
│  - Monitored Mode: Loads cached audit from aso_audit_snapshots        │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ├─── Two Parallel Pipelines ───┐
                                 │                                │
                                 ▼                                ▼
┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐
│     PIPELINE 1: METADATA AUDIT           │  │     PIPELINE 2: LLM VISIBILITY           │
│         (The ASO Bible Brain)            │  │     (The LLM Enhancement)                │
└──────────────────────────────────────────┘  └──────────────────────────────────────────┘
│                                               │
│ 1. Entry Point                                │ 1. Entry Point
│    Component: AuditV2View.tsx                 │    Component: LLMOptimizationTab.tsx
│    Uses: useEnhancedAppAudit hook            │    Calls: analyzeLLMVisibilityForApp()
│                                               │
│ 2. Data Acquisition                           │ 2. Description Analysis
│    Source A: Live scraping                    │    Input: metadata.description
│    - App Store API via edge function          │    Service: llm-visibility.service.ts
│    - Returns ScrapedMetadata                  │
│                                               │
│    Source B: Cached snapshot                  │ 3. Rule Loading (NEW!)
│    - Table: aso_audit_snapshots               │    Function: loadLLMVisibilityRulesAsync()
│    - Hook: useMonitoredAudit                  │    Sources:
│                                               │    - Base: llmVisibility.rules.json
│ 3. Bible Intelligence Loading                 │    - DB: llm_visibility_rule_overrides
│    Function: getActiveRuleSet()               │    Inheritance: Base → Vertical → Market → Client
│    Sources:                                    │
│    - Code: Vertical rulesets                  │ 4. Analysis Engine
│    - DB: aso_ruleset_* tables                 │    Engine: llmVisibilityEngine.ts
│    Inheritance: Base → Vertical → Market      │    Outputs:
│                                               │    - Factual grounding score
│ 4. Analysis Engine                            │    - Semantic cluster coverage
│    Engine: MetadataAuditEngine.evaluate()     │    - Structure readability
│    Location: src/engine/metadata/             │    - Intent coverage
│            metadataAuditEngine.ts             │    - Snippet quality
│    Outputs:                                    │    - Safety/credibility
│    - Overall score                            │
│    - Element scores (title, subtitle, desc)   │ 5. Caching Layer
│    - KPI scores                               │    Table: llm_visibility_analysis
│    - Intent coverage                          │    Key: description_hash + rules_version
│    - Combo analysis                           │    TTL: Indefinite (revalidate on description change)
│    - Recommendations                          │    Cache Hit: Returns existing analysis instantly
│                                               │    Cache Miss: Runs full analysis
│ 5. Caching Layer                              │
│    Table: aso_audit_snapshots                 │ 6. UI Rendering
│    Key: monitored_app_id + locale             │    Components:
│    TTL: Until next market scrape             │    - LLMVisibilityScoreCard
│    Invalidation: Manual refresh              │    - LLMFindingsPanel
│                                               │    - LLMSnippetLibrary
│ 6. UI Rendering                               │    - LLMClusterCoverageChart
│    Components:                                │    - LLMIntentCoverageMatrix
│    - UnifiedMetadataAuditModule              │
│    - SearchIntentCoverageCard                │
│    - DiscoveryFootprintMap                   │
│    - CompetitorComparisonTable               │
└──────────────────────────────────────────────┘  └──────────────────────────────────────────┘
```

---

## 🗄️ Database Schema: The Two Systems

### **Metadata Audit Caching**
```sql
-- Table: aso_audit_snapshots
-- Purpose: Cache full audit results for monitored apps
-- Created: Phase 18.5 (Multi-market support)

CREATE TABLE aso_audit_snapshots (
  id UUID PRIMARY KEY,
  monitored_app_id UUID REFERENCES monitored_apps(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  app_id TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  locale TEXT NOT NULL DEFAULT 'us',  -- Multi-market support

  -- Metadata snapshot
  title TEXT,
  subtitle TEXT,
  description TEXT,

  -- Full audit result (UnifiedMetadataAuditResult)
  audit_result JSONB NOT NULL,  -- Contains: overallScore, elements, kpiScores, intentCoverage, etc.

  -- Cache metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  source TEXT CHECK (source IN ('live', 'cache', 'manual'))
);

-- Indexes for fast lookups
CREATE INDEX idx_aso_audit_monitored_app ON aso_audit_snapshots(monitored_app_id, locale);
CREATE INDEX idx_aso_audit_created_at ON aso_audit_snapshots(created_at DESC);
```

**Cache Invalidation**:
- Manual refresh in AppAuditHub
- Market switcher triggers new scrape
- No automatic expiration (TTL = ∞)

---

### **LLM Visibility Caching**
```sql
-- Table: llm_visibility_analysis
-- Purpose: Cache LLM visibility analysis per description + rules version
-- Created: Phase LLM Optimization (November 2025)

CREATE TABLE llm_visibility_analysis (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),

  -- App identification (dual mode)
  monitored_app_id UUID REFERENCES monitored_apps(id),  -- For monitored apps
  app_store_id VARCHAR(50),  -- For ad-hoc App Store lookups

  -- Scores (0-100)
  overall_score NUMERIC(5,2),
  factual_grounding_score NUMERIC(5,2),
  semantic_clusters_score NUMERIC(5,2),
  structure_readability_score NUMERIC(5,2),
  intent_coverage_score NUMERIC(5,2),
  snippet_quality_score NUMERIC(5,2),
  safety_credibility_score NUMERIC(5,2),

  -- Analysis results (JSONB)
  findings_json JSONB,  -- LLMFinding[]
  snippets_json JSONB,  -- LLMSnippet[]
  cluster_coverage_json JSONB,  -- ClusterCoverage
  intent_coverage_json JSONB,  -- IntentCoverage
  structure_metrics_json JSONB,  -- StructureMetrics

  -- Cache key
  description_hash VARCHAR(64) NOT NULL,  -- SHA256(description + rules_version)
  rules_version VARCHAR(20) NOT NULL,

  -- Performance tracking
  analysis_duration_ms INT,
  cache_hit BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint for cache lookup
CREATE UNIQUE INDEX idx_llm_cache_key
  ON llm_visibility_analysis(app_store_id, monitored_app_id, description_hash, rules_version);
```

**Cache Invalidation**:
- Description change (different hash)
- Rules version change (admin edits override)
- No time-based expiration (TTL = ∞)

---

### **LLM Rules Storage (NEW!)**
```sql
-- Table: llm_visibility_rule_overrides
-- Purpose: Store vertical/market/client-specific LLM rules
-- Editable via: /admin/aso-bible/llm-rules

CREATE TABLE llm_visibility_rule_overrides (
  id UUID PRIMARY KEY,
  scope VARCHAR(20) CHECK (scope IN ('vertical', 'market', 'client')),

  -- Scope identifiers
  vertical VARCHAR(50),  -- e.g., 'language_learning'
  market VARCHAR(10),    -- e.g., 'us'
  organization_id UUID REFERENCES organizations(id),

  -- Rule overrides (partial LLMVisibilityRules)
  rules_override JSONB NOT NULL,

  -- Version control
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint ensures one active override per scope
CREATE UNIQUE INDEX idx_llm_rules_unique_active
  ON llm_visibility_rule_overrides(scope, vertical, market, organization_id, version);
```

---

## 🔄 Data Flow: Step-by-Step

### **Scenario 1: User Analyzes a Monitored App**

#### **Metadata Audit Flow**:
```
1. User clicks on monitored app "Duolingo" in ASO AI Hub
2. AppAuditHub loads in "monitored" mode
3. Hook: useMonitoredAudit(monitoredAppId, organizationId, locale)
4. Query: SELECT audit_result FROM aso_audit_snapshots WHERE monitored_app_id=? AND locale=?
5. IF snapshot exists:
     ✅ Render cached audit (instant)
   ELSE:
     ⏳ Trigger live scrape → metadata-audit-v2 edge function → save snapshot
6. Display: UnifiedMetadataAuditModule with scores
```

#### **LLM Visibility Flow** (runs in parallel):
```
1. User switches to "LLM Optimization" tab
2. Component: LLMOptimizationTab loads
3. Hook: getLatestLLMVisibilityAnalysis(monitoredAppId)
4. Query: SELECT * FROM llm_visibility_analysis WHERE monitored_app_id=? ORDER BY created_at DESC LIMIT 1
5. IF analysis exists AND description_hash matches:
     ✅ Display cached analysis (instant)
   ELSE:
     Show "Analyze Description" button
6. User clicks "Analyze Description":
     a. Load rules: loadLLMVisibilityRulesAsync(vertical, market, orgId)
        - Query: SELECT rules_override FROM llm_visibility_rule_overrides WHERE scope='vertical' AND vertical=? AND is_active=true
        - Merge: Base rules → Vertical override → Market override → Client override
     b. Calculate hash: SHA256(description + rules.version)
     c. Check cache: SELECT * FROM llm_visibility_analysis WHERE description_hash=? AND rules_version=?
     d. IF cache hit: return existing
        ELSE: Run analyzeLLMVisibility() → save to DB
7. Display: LLMVisibilityScoreCard + panels
```

---

### **Scenario 2: Admin Edits LLM Rules**

```
1. Admin navigates to /admin/aso-bible/llm-rules
2. Clicks "Edit" on "language_learning" vertical override
3. Modifies JSON:
   {
     "weights": { "factual_grounding": 0.35 },  // Changed from 0.30
     "clusters": { ... }
   }
4. Clicks "Save Override"
5. System:
   a. Deactivates current version: UPDATE llm_visibility_rule_overrides SET is_active=false WHERE id=?
   b. Creates new version: INSERT INTO llm_visibility_rule_overrides (version=2, is_active=true, ...)
6. Cache Invalidation:
   - All existing llm_visibility_analysis rows are now STALE (different rules_version)
   - Next analysis will be cache MISS → re-run with new rules
7. Impact:
   - New analyses use updated weights
   - Old analyses remain for historical comparison
```

---

## 🧠 The "Brain" Concept

### **What is "The Brain"?**

The **ASO Bible Engine** is referred to as "the brain" because it provides:

1. **Intelligence Layer**:
   - Vertical detection (identifies app type from metadata)
   - Market adaptation (locale-specific rules)
   - Semantic understanding (intent classification, combo relevance)

2. **Rule-Based Learning**:
   - Base rules (universal ASO principles)
   - Vertical rulesets (language learning vs fitness vs rewards)
   - Market rulesets (US vs Germany vs Japan)
   - Client overrides (custom rules per organization)

3. **Multi-Dimensional Scoring**:
   - KPI scores (weighted per vertical)
   - Intent coverage (user search intent patterns)
   - Discovery footprint (search visibility)
   - Combo quality (keyword combination strength)

### **LLM Visibility as "Brain Enhancement"**

LLM Visibility **enhances the brain** by adding:

1. **AI Discoverability Layer**:
   - How well LLMs can understand/quote the app
   - Semantic cluster coverage (beyond keyword matching)
   - Snippet quotability (what ChatGPT will cite)

2. **Complementary Metrics**:
   - Metadata Audit: "Will users find this in App Store search?"
   - LLM Visibility: "Will ChatGPT recommend this when asked?"

3. **Shared Intelligence**:
   - Both use vertical detection
   - Both apply intent classification
   - Both support multi-market analysis

---

## 🔗 Integration Points

### **Shared Components**

| Component | Used By Both? | Purpose |
|-----------|---------------|---------|
| `getActiveRuleSet()` | Metadata Audit ✅ | Load ASO Bible rules |
| `loadLLMVisibilityRulesAsync()` | LLM Visibility ✅ | Load LLM rules |
| Vertical Detection | Both ✅ | Identify app type from metadata |
| Market Detection | Both ✅ | Identify market from locale |
| Intent Patterns | Both ✅ | Classify user search intent |
| Monitored Apps | Both ✅ | Track apps for periodic analysis |
| Organization Isolation | Both ✅ | Multi-tenant RLS |

### **Independent Components**

| Component | Pipeline | Purpose |
|-----------|----------|---------|
| `MetadataAuditEngine` | Metadata Audit | Score title/subtitle/description via KPIs |
| `llmVisibilityEngine` | LLM Visibility | Analyze LLM discoverability |
| `aso_audit_snapshots` | Metadata Audit | Cache full audit results |
| `llm_visibility_analysis` | LLM Visibility | Cache LLM analysis |
| KPI Registry | Metadata Audit | Define scoring formulas |
| LLM Rules Registry | LLM Visibility | Define cluster patterns |

---

## 🚫 Anti-Duplication Guidelines

### **When Adding New Features**

#### ✅ **DO**:
1. **Check existing engines first**:
   - Need keyword analysis? → Use MetadataAuditEngine combo analysis
   - Need semantic analysis? → Use LLM Visibility clusters
   - Need intent detection? → Use shared intent engine

2. **Extend, don't duplicate**:
   - Add new KPIs to KPI Registry (not new engine)
   - Add new clusters to LLM Rules (not new analyzer)
   - Add new intents to Intent Patterns (not new classifier)

3. **Share infrastructure**:
   - Use existing caching tables
   - Use existing rule loading functions
   - Use existing vertical detection

#### ❌ **DON'T**:
1. Create parallel scoring systems
2. Duplicate cache tables
3. Re-implement vertical detection
4. Build separate rule storage
5. Bypass the ASO Bible inheritance chain

---

## 📊 Caching Strategy Summary

### **Cache Hit Scenarios**

| Pipeline | Cache Hit When... | Performance |
|----------|-------------------|-------------|
| Metadata Audit | `monitored_app_id` + `locale` match in `aso_audit_snapshots` | ~50ms (DB query) |
| LLM Visibility | `description_hash` + `rules_version` match in `llm_visibility_analysis` | ~50ms (DB query) |

### **Cache Miss Scenarios**

| Pipeline | Cache Miss When... | Performance |
|----------|-------------------|-------------|
| Metadata Audit | No snapshot OR user clicks refresh | ~3-5s (scrape + analyze) |
| LLM Visibility | Description changed OR rules updated OR first analysis | ~1-2s (analyze only) |

### **Cache Invalidation**

| Event | Metadata Audit | LLM Visibility |
|-------|---------------|----------------|
| Description changes | ❌ No auto-invalidation (manual refresh) | ✅ Auto-invalidation (hash mismatch) |
| Rules change | ❌ No invalidation (rules apply to new audits) | ✅ Auto-invalidation (version mismatch) |
| Market switch | ✅ Load different snapshot (per locale) | ❌ Market-agnostic (no invalidation) |
| User clicks refresh | ✅ Force new scrape | ✅ Force re-analysis (forceRefresh=true) |

---

## 🎯 Future Enhancement Opportunities

### **Connecting the Pipelines** (NOT Merging!)

Potential enhancements that **use both brains together**:

1. **Unified Recommendations**:
   - Metadata Audit finds weak keyword coverage
   - LLM Visibility suggests semantic alternatives
   - Combined recommendation: "Add 'phonics' (high LLM quotability + ASO relevance)"

2. **Cross-Validation**:
   - Metadata Audit detects strong intent coverage
   - LLM Visibility confirms semantic cluster alignment
   - Confidence boost: "Intent 'task' detected by both systems"

3. **Holistic Score**:
   - 60% Metadata Audit (App Store discoverability)
   - 40% LLM Visibility (AI discoverability)
   - = Combined "Total Discoverability Score"

4. **Smart Caching**:
   - If metadata audit runs, pre-fetch LLM analysis (shared description)
   - If LLM rules change, flag related audit snapshots as needing review

---

## 📝 Code Locations Reference

### **Metadata Audit Pipeline**
```
Entry Point:
  src/components/AppAudit/AppAuditHub.tsx (lines 1-800)
  src/components/AppAudit/AuditV2View.tsx

Engine:
  src/engine/metadata/metadataAuditEngine.ts (lines 1-1500)

Caching:
  src/hooks/useMonitoredAudit.ts
  src/hooks/usePersistAuditSnapshot.ts
  Table: aso_audit_snapshots

Rules:
  src/engine/asoBible/rulesetLoader.ts
  src/engine/asoBible/verticalProfiles/*
  Tables: aso_ruleset_vertical, aso_ruleset_market, aso_ruleset_client
```

### **LLM Visibility Pipeline**
```
Entry Point:
  src/components/AppAudit/LLMOptimization/LLMOptimizationTab.tsx (lines 1-400)

Engine:
  src/engine/llmVisibility/llmVisibilityEngine.ts (lines 1-800)

Service:
  src/services/llm-visibility.service.ts (lines 1-406)

Caching:
  Service: getCachedAnalysis(), storeAnalysis()
  Table: llm_visibility_analysis

Rules:
  Base: src/engine/llmVisibility/registry/llmVisibility.rules.json
  Loader: src/engine/llmVisibility/llmVisibilityRuleLoader.ts
  Admin UI: src/pages/admin/aso-bible/LLMRulesPage.tsx
  Table: llm_visibility_rule_overrides
```

---

## 🔍 Debugging & Monitoring

### **Console Logs to Watch**

#### **Metadata Audit**:
```javascript
[Metadata Audit Engine] Active RuleSet: { verticalId, marketId, leakWarnings }
[RuleSet Loader] Cache HIT for key=...
[RuleSet Loader] DB-driven ruleset loaded and cached
```

#### **LLM Visibility**:
```javascript
[LLM Visibility] Cache HIT for app: ...
[LLM Visibility] Cache MISS for app: ...
[LLM Rules] Loaded rules with DB overrides: { hasVerticalOverrides: true }
[LLM Visibility] Analyzing description...
```

### **Performance Metrics**

Track in both tables:
- `analysis_duration_ms` (LLM Visibility)
- `audit_result.metadata.analysis_duration_ms` (Metadata Audit, if tracked)

---

## ✅ Summary: The Two Brains

| Aspect | Metadata Audit Brain | LLM Visibility Brain |
|--------|---------------------|---------------------|
| **Purpose** | App Store discoverability | AI LLM discoverability |
| **Input** | Full metadata (title, subtitle, description, keywords) | Description only |
| **Outputs** | Overall score, KPI scores, intent coverage, combos | LLM score, clusters, snippets, findings |
| **Rules Source** | ASO Bible rulesets (code + DB) | LLM rules (JSON + DB overrides) |
| **Cache Table** | `aso_audit_snapshots` | `llm_visibility_analysis` |
| **Cache Key** | `monitored_app_id` + `locale` | `description_hash` + `rules_version` |
| **Invalidation** | Manual refresh | Auto (hash/version change) |
| **UI Location** | "Audit V2" tab | "LLM Optimization" tab |
| **Vertical Support** | ✅ Yes (code-based + DB) | ✅ Yes (DB overrides) |
| **Market Support** | ✅ Yes (multi-locale) | ✅ Yes (market overrides) |
| **Editable Rules** | ✅ Via Admin (token, hook, KPI, formula, intent, stopwords) | ✅ Via Admin (`/admin/aso-bible/llm-rules`) |

**They are NOT duplicative** - they complement each other to provide holistic app discoverability optimization.

---

**Document Version**: 1.0
**AI Development Ready**: ✅ Yes - All integration points, caching strategies, and anti-duplication patterns documented
