# ASO Bible Scalable Architecture

**Version**: 1.0
**Date**: 2025-11-23
**Status**: Foundation Documentation — Phase 6

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Overview](#2-current-architecture-overview)
3. [Vertical Awareness Gap Analysis](#3-vertical-awareness-gap-analysis)
4. [Scalability Requirements for Multi-Vertical ASO Bible](#4-scalability-requirements-for-multi-vertical-aso-bible)
5. [Proposed Scalable Architectural Model](#5-proposed-scalable-architectural-model)
6. [Registry References & Mapping Tables](#6-registry-references--mapping-tables)
7. [Risk Areas & "Leak Points"](#7-risk-areas--leak-points)
8. [Versioning & Migration Strategy](#8-versioning--migration-strategy)
9. [Appendix](#9-appendix)

---

## 1. Executive Summary

### 1.1 Purpose

The **ASO Bible Engine** is Yodel's modular, registry-driven scoring and recommendation system for app metadata optimization. It provides deterministic, reproducible quality assessments across:

- **34 KPIs** organized into **6 families**
- **8 metadata scoring formulas**
- **Intent classification** (navigational, informational, commercial, transactional)
- **Hook diversity analysis** (6 psychological categories)
- **Combo coverage** (keyword phrase potential)
- **Strategic recommendations** (severity-based, impact-scored)

### 1.2 Current System Status

**Strength**: The system is registry-driven, modular, and deterministic.

**Critical Limitation**: The system is **vertical-agnostic but category-biased**.

All pattern matching, intent classification, hook categorization, and recommendation generation currently assume **language-learning app characteristics**:

- "Learn", "study", "master", "fluent", "lessons" are hard-coded as high-value
- Intent patterns assume educational vocabulary
- Hook classifications favor learning/outcome psychology
- Recommendations suggest adding "learn spanish" or "language lessons"
- Token relevance scoring prioritizes languages and educational verbs
- Generic/brand balance expectations match language app norms

**Problem**: When auditing non-educational apps (e.g., Mistplay - reward/gaming, Robinhood - finance, Tinder - dating), the system:

- Misclassifies intent (no "earn rewards" or "cashback" patterns)
- Suggests irrelevant keywords ("add learning intent")
- Scores tokens incorrectly (penalizes category-appropriate language)
- Generates wrong hook diversity expectations
- Applies inappropriate KPI weights

### 1.3 Goal of This Document

This document provides a **blueprint for scalable multi-vertical architecture** by:

1. **Mapping the current system** in granular detail
2. **Identifying all vertical-bias leak points** (pattern matchers, thresholds, recommendations)
3. **Defining modular boundaries** (KPI, formula, intent, pattern, recommendation registries)
4. **Proposing vertical-aware override layers** (category-specific rule sets)
5. **Preparing for admin-editable rule management** (future UI)
6. **Ensuring all biases are explicit and overridable**

**This is a documentation-only phase**. No logic changes, no scoring modifications, no pattern overrides. Pure architectural mapping and scalability planning.

---

## 2. Current Architecture Overview

### 2.1 Surface Layers (UI)

The user-facing layer consists of:

#### **Metadata Audit V2 Module**
**File**: `src/components/AppAudit/UnifiedMetadataAuditModule/UnifiedMetadataAuditModule.tsx`

**Renders**:
- Overall metadata score card (0-100)
- 3 chapter-based sections:
  - **CHAPTER 1 — METADATA HEALTH**: Opportunity delta, dimension radar, discovery footprint
  - **CHAPTER 2 — COVERAGE MECHANICS**: Keyword coverage, slot utilization, token mix, combo workbench, intent analysis
  - **CHAPTER 3 — RANKING DRIVERS & GAPS**: Severity donut, recommendations panel
- Element detail cards (Title, Subtitle, Description)
- KPI grid (34 KPIs across 6 families)

**Data Sources**:
- Consumes `UnifiedMetadataAuditResult` from `MetadataAuditEngine.evaluate()`
- Consumes `KpiEngineResult` from `KpiEngine.evaluate()`
- Consumes `IntentIntelligenceHook` data (autocomplete suggestions)

**Key Components**:

##### **MetadataScoreCard**
- Displays overall score (weighted: Title 65%, Subtitle 35%)
- Score thresholds: 75+ (Excellent), 50-75 (Good), 25-50 (Needs Work), <25 (Critical)
- UI-only thresholds (not business logic)

##### **ElementDetailCard**
- Title, Subtitle, Description scoring breakdown
- Rule-by-rule evaluation display
- Character usage, keyword counts, combo coverage
- Severity-coded recommendations

##### **KeywordCoverageCard**
- Title unique keywords, Subtitle incremental keywords
- Total unique keyword count
- Overlap detection, duplication warnings

##### **KeywordComboWorkbench**
**File**: `src/components/AppAudit/KeywordComboWorkbench/KeywordComboWorkbench.tsx`

Interactive table for combo management:
- Filter by: Brand/Generic/Low-Value, Intent (Learning/Outcome/Brand/Noise)
- Sort by: Relevance, Alphabetical, Length, Source
- Export to CSV/JSON
- User annotation (mark as noise)

**Vertical Bias**: Intent filters assume "Learning/Outcome" language-learning categories.

##### **Charts**
**Directory**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/`

10 visualization components:
1. **MetadataOpportunityDeltaChart** — Gap to 100 for each dimension
2. **MetadataDimensionRadar** — 4-axis radar (Relevance, Learning, Structure, Brand Balance)
3. **SlotUtilizationBars** — Title/Subtitle/KW field token distribution
4. **TokenMixDonut** — Brand/Category/Learning/Outcome/Filler/Duplicate breakdown
5. **SeverityDonut** — Recommendation counts by severity
6. **EfficiencySparkline** — Meaningful keywords / total possible
7. **ComboHeatmap** — Top combos across Title/Subtitle/Both
8. **DiscoveryFootprintMap** — Learning/Outcome/Generic/Brand/LowValue combo distribution
9. **SemanticDensityGauge** — Repetition ratio (unique intents / total combos)
10. **HookDiversityWheel** — 6 psychological hooks (Learning, Outcome, Status, Ease, Time, Trust)

**Vertical Bias**: Charts assume "Learning" dimension, "Learning/Outcome" token types, "Learning" hooks.

---

### 2.2 Middle Layers (Config / Registries)

The configuration layer consists of **6 primary registries**:

#### **2.2.1 KPI Registry**

**File**: `src/engine/metadata/kpi/kpi.registry.json`
**Type Definitions**: `src/engine/metadata/kpi/kpi.types.ts`

**Purpose**: Defines 34 individual KPI metrics for metadata quality assessment.

**Structure**:
```json
{
  "kpis": [
    {
      "id": "title_char_usage",
      "familyId": "clarity_structure",
      "label": "Title Character Usage",
      "description": "Percentage of 30-char title limit used",
      "weight": 0.25,
      "metricType": "ratio",
      "minValue": 0,
      "maxValue": 1,
      "direction": "higher_is_better",
      "admin": {
        "editable": true,
        "inputType": "slider",
        "group": "Title",
        "displayOrder": 1,
        "helpText": "Maximize title character utilization",
        "tags": ["title", "character-limits"]
      }
    }
  ]
}
```

**Total**: 34 KPIs
**Families**: 6
**Editable**: 0 (admin metadata present but `editable: false` in registry)

**Vertical Bias**: ❌ MINIMAL
KPIs are mostly structural (character usage, keyword counts, duplication). However, some KPIs may have vertical-specific thresholds in the future (e.g., ideal keyword density varies by category).

---

#### **2.2.2 KPI Family Registry**

**File**: `src/engine/metadata/kpi/kpi.families.json`
**Type Definitions**: `src/engine/metadata/kpi/kpi.types.ts`

**Purpose**: Groups KPIs into logical families with aggregation weights.

**Structure**:
```json
{
  "families": [
    {
      "id": "clarity_structure",
      "label": "Clarity & Structure",
      "description": "Structural quality and character utilization",
      "weight": 0.20,
      "admin": {
        "editable": true,
        "displayOrder": 1,
        "color": "#22d3ee",
        "icon": "layout"
      }
    }
  ]
}
```

**6 Families** (weights sum to 1.0):
1. **Clarity & Structure** — 20%
2. **Keyword Architecture** — 25% (highest — drives discovery)
3. **Hook Strength** — 15%
4. **Brand vs Generic** — 20%
5. **Psychology Alignment** — 10%
6. **Intent Alignment** — 10%

**Vertical Bias**: ⚠️ MODERATE
Family weights reflect language-learning priorities:
- "Keyword Architecture" weighted highest assumes keyword discovery matters most (true for learning apps, less so for branded utilities)
- "Hook Strength" at 15% assumes educational persuasion psychology
- "Intent Alignment" at 10% assumes search intent is homogeneous

**Future Requirement**: Category-specific family weight overrides.

---

#### **2.2.3 Formula Registry**

**File**: `src/engine/metadata/metadataFormulaRegistry.ts`

**Purpose**: Defines metadata scoring formulas (how element scores are computed from rules).

**8 Core Formulas**:

1. **metadata_overall_score** (Title 65%, Subtitle 35%)
2. **title_element_score** (Char Usage 25%, Unique KW 30%, Combo 30%, Filler Penalty 15%)
3. **subtitle_element_score** (Char Usage 20%, Incremental Value 40%, Combo 25%, Complementarity 15%)
4. **description_conversion_score** (Hook 30%, Features 25%, CTA 20%, Readability 25%)
5. **metadata_dimension_relevance** (Avg of title + subtitle)
6. **metadata_dimension_learning** (Threshold-based: 5+ generic combos = 100)
7. **metadata_dimension_structure** (Uses title score)
8. **metadata_dimension_brand_balance** (Generic / Total ratio)

**Vertical Bias**: ⚠️ MODERATE
- Formula #6 "learning" dimension is named/conceptualized for educational apps
- Subtitle "incremental value" weighted 40% assumes new keywords are critical (true for discovery-driven apps, less so for brand-retention apps)

**Future Requirement**: Category-specific formula weight overrides, alternate dimension definitions.

---

#### **2.2.4 Intent Registry (Implicit)**

**File**: `src/utils/comboIntentClassifier.ts`
**File**: `src/services/intent-intelligence.service.ts`

**Purpose**: Classifies keywords/combos into search intent categories.

**Current Intent Taxonomy**:

**Combo-Level Intent** (`comboIntentClassifier.ts`):
- **learning**: Contains "learn", "study", "practice", "master", "improve", etc.
- **outcome**: Contains "fluency", "fluent", "proficient", "advanced", etc.
- **brand**: Contains brand name
- **noise**: Low-value or user-marked

**Search Intent** (`intent-intelligence.service.ts`):
- **navigational**: User seeks specific app/brand
- **informational**: User researching topic
- **commercial**: User comparing options
- **transactional**: User ready to download/purchase

**Vertical Bias**: ❌ **CRITICAL**
Intent patterns are **100% language-learning specific**:

```typescript
// Hard-coded patterns from comboIntentClassifier.ts
const learningPatterns = /\b(learn|study|practice|master|improve|teach|train|memorize|review|understand)\b/i;
const outcomePatterns = /\b(fluency|fluent|proficiency|proficient|advanced|beginner|intermediate|native|conversational|expert|mastery)\b/i;
```

**Missing Intent Categories for Other Verticals**:
- **Reward Apps**: "earn", "cashback", "points", "redeem", "gift cards", "rewards"
- **Finance Apps**: "invest", "trading", "stocks", "portfolio", "crypto", "savings"
- **Dating Apps**: "match", "date", "meet", "singles", "relationship", "chat"
- **Fitness Apps**: "workout", "calories", "weight", "exercise", "training", "nutrition"
- **Productivity Apps**: "organize", "tasks", "notes", "calendar", "reminders", "goals"

**Future Requirement**: Vertical-specific intent pattern registries with fallback to generic taxonomy.

---

#### **2.2.5 Psychology/Hook Pattern Registry (Implicit)**

**File**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/HookDiversityWheel.tsx`

**Purpose**: Classifies combos into psychological hook categories for diversity analysis.

**Current Hook Taxonomy** (6 categories):

```typescript
const classifyHook = (combo: ClassifiedCombo): string | null => {
  const text = combo.text.toLowerCase();

  // Learning / Educational
  if (text.match(/learn|study|master|practice|improve|develop|skill|course|lesson|training|tutorial/)) {
    return 'learning';
  }

  // Outcome / Benefit
  if (text.match(/speak|fluent|proficient|achieve|results|success|become|transform|unlock/)) {
    return 'outcome';
  }

  // Status / Authority
  if (text.match(/best|top|#1|leading|premium|professional|expert|advanced|pro|elite/)) {
    return 'status';
  }

  // Ease of use
  if (text.match(/easy|simple|quick|effortless|intuitive|user.?friendly|convenient|hassle.?free/)) {
    return 'ease';
  }

  // Time to result
  if (text.match(/fast|rapid|instant|minutes|days|hours|speed|accelerate|boost/)) {
    return 'time';
  }

  // Trust / Safety
  if (text.match(/trusted|proven|safe|reliable|secure|certified|guaranteed|verified|official/)) {
    return 'trust';
  }

  return null;
};
```

**Vertical Bias**: ❌ **CRITICAL**
Hook patterns assume educational psychology:

- **"Learning"** hook uses "study", "master", "lesson", "tutorial" (language-learning vocabulary)
- **"Outcome"** hook uses "speak", "fluent", "proficient" (language-learning outcomes)

**Missing Hook Categories for Other Verticals**:
- **Reward Apps**: "Earning" hook (cashback, points, rewards, redeem)
- **Finance Apps**: "Growth" hook (returns, profit, wealth, gains)
- **Dating Apps**: "Connection" hook (match, meet, relationship, chemistry)
- **Gaming Apps**: "Competition" hook (rank, leaderboard, compete, win)
- **Health Apps**: "Transformation" hook (lose weight, gain muscle, healthy)

**Future Requirement**: Vertical-specific hook pattern registries, extensible taxonomy.

---

#### **2.2.6 Recommendation Registry (Implicit)**

**File**: `src/engine/metadata/utils/recommendationEngineV2.ts`

**Purpose**: Generates strategic, severity-coded recommendations based on audit signals.

**Current Recommendation Categories**:
- **ranking_keyword**: Keyword coverage gaps
- **ranking_structure**: Structural issues (char limits, duplication)
- **conversion**: Description quality (hooks, CTAs, readability)
- **brand_alignment**: Brand/generic balance

**Severity Levels**:
- **critical**: Major ranking impact (score 90)
- **strong**: Significant opportunity (score 70)
- **moderate**: Incremental improvement (score 40)
- **optional**: Nice-to-have (score 20)

**Vertical Bias**: ❌ **CRITICAL**
Recommendation messages contain **hard-coded language-learning examples**:

```typescript
// Line 91 in recommendationEngineV2.ts
message: '[RANKING][critical] Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. \'learn spanish\', \'language lessons\') typically increases ranking breadth.'
```

**Examples of Vertical-Specific Recommendations**:

**Language Learning**:
- "Add intent terms like 'learn spanish' or 'language lessons'"
- "Include outcome keywords like 'fluent' or 'conversational'"

**Reward Apps** (MISSING):
- "Add earning hooks like 'earn rewards' or 'cashback'"
- "Include redemption keywords like 'gift cards' or 'points'"

**Finance Apps** (MISSING):
- "Add investment terms like 'stocks' or 'portfolio'"
- "Include security keywords like 'secure trading' or 'safe investing'"

**Future Requirement**: Vertical-specific recommendation templates with category-appropriate examples.

---

#### **2.2.7 Chart Config Registry (Implicit)**

**Files**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/*.tsx`

**Purpose**: Chart visualization logic (data transformation, labeling, coloring).

**Vertical Bias**: ⚠️ MODERATE
Chart labels and categories assume language-learning context:

**TokenMixDonut.tsx**:
```typescript
const TOKEN_TYPES = {
  brand: { color: '#a855f7', label: 'Brand' },
  category: { color: '#10b981', label: 'Category' },
  learning: { color: '#22d3ee', label: 'Learning' },  // ← Language-learning specific
  outcome: { color: '#3b82f6', label: 'Outcome' },    // ← Language-learning specific
  filler: { color: '#f59e0b', label: 'Filler' },
  duplicate: { color: '#ef4444', label: 'Duplicate' },
};
```

**MetadataDimensionRadar.tsx**:
- Axis: "Learning" (should be "Discovery" or category-agnostic term)

**DiscoveryFootprintMap.tsx**:
- Categories: "learning", "outcome" (language-learning specific)

**Future Requirement**: Dynamic chart labels based on vertical, or generic terminology.

---

### 2.3 Engine Layer

The core computation layer:

#### **2.3.1 MetadataAuditEngine**

**File**: `src/engine/metadata/metadataAuditEngine.ts`

**Purpose**: Orchestrates metadata evaluation using registry-driven rules.

**Key Functions**:

##### **evaluate(metadata, options)**
Main entry point:
1. Tokenizes title, subtitle, description
2. Builds evaluation context
3. Evaluates each element using registry rules
4. Calculates overall score (Title 65%, Subtitle 35%)
5. Analyzes keyword coverage
6. Analyzes combo coverage
7. Generates recommendations

**Returns**: `UnifiedMetadataAuditResult`

##### **getTokenRelevance(token): 0 | 1 | 2 | 3**

**Vertical Bias**: ❌ **CRITICAL**
This function is the **primary source of language-learning bias**:

```typescript
export function getTokenRelevance(token: string): 0 | 1 | 2 | 3 {
  const tokenLower = token.toLowerCase();

  // Level 0: Low-value tokens
  const lowValuePatterns = /^(best|top|great|good|new|latest|free|premium|pro|plus|lite|\d+|one|two|three)$/i;
  if (lowValuePatterns.test(tokenLower)) {
    return 0;
  }

  // Level 3: Languages and core intent verbs
  const languages = /^(english|spanish|french|german|italian|chinese|japanese|korean|portuguese|russian|arabic|hindi|mandarin)$/i;
  const coreIntentVerbs = /^(learn|speak|study|master|practice|improve|understand|read|write|listen|teach)$/i;
  if (languages.test(tokenLower) || coreIntentVerbs.test(tokenLower)) {
    return 3;  // ← Highest relevance score
  }

  // Level 2: Strong domain nouns
  const domainNouns = /^(lesson|lessons|course|courses|class|classes|grammar|vocabulary|pronunciation|conversation|fluency|language|languages|learning|app|application|tutorial|training|education|skill|skills|method|techniques|guide)$/i;
  if (domainNouns.test(tokenLower)) {
    return 2;
  }

  // Level 1: Everything else (neutral but valid)
  return 1;
}
```

**Impact**:
- "learn", "spanish", "french" scored as **3** (highest relevance)
- "lesson", "course", "fluency" scored as **2** (high relevance)
- "earn", "rewards", "cashback" scored as **1** (neutral) — WRONG for reward apps
- "invest", "stocks", "trading" scored as **1** (neutral) — WRONG for finance apps

**Future Requirement**: Vertical-specific token relevance registries.

---

##### **evaluateElement(element, text, context)**
Applies registry rules to element:
1. Fetches rule config from `METADATA_SCORING_REGISTRY`
2. Evaluates each rule function
3. Computes weighted score
4. Returns rule-by-rule breakdown

##### **analyzeKeywordCoverage(titleTokens, subtitleTokens, descriptionTokens, stopwords)**
Computes:
- Title unique keywords
- Subtitle incremental keywords (new vs title)
- Total unique keywords
- Overlap ratio
- High-value keyword count (uses `getTokenRelevance()` → VERTICAL BIAS)

##### **analyzeComboCoverage(titleTokens, subtitleTokens, stopwords, metadata)**
Generates keyword combinations:
1. Calls `generateEnhancedCombos()` (bigrams, trigrams)
2. Filters low-value combos
3. Classifies as branded/generic (Phase 5: uses Brand Intelligence)
4. Computes relevance scores (uses `getTokenRelevance()` → VERTICAL BIAS)

**Returns**: `ComboCoverage` with classified combos.

##### **generateRecommendationsV2(...)**
Calls `recommendationEngineV2.ts` to generate severity-coded recommendations.

**Vertical Bias**: Inherits all biases from recommendation engine (hard-coded examples).

---

#### **2.3.2 KpiEngine**

**File**: `src/engine/metadata/kpi/kpiEngine.ts`

**Purpose**: Computes 34 KPIs across 6 families using registry definitions.

**Key Functions**:

##### **evaluate(input): KpiEngineResult**
1. Tokenizes title/subtitle if not provided
2. Computes primitive metrics (character usage, keyword counts, brand signals, intent signals)
3. Evaluates each KPI using registry definition
4. Normalizes KPI values to 0-100 scale
5. Aggregates family scores (weighted average of KPIs)
6. Computes overall score (weighted average of families)

**Returns**: `KpiEngineResult` with vector, KPI map, family map, overall score.

**Vertical Bias**: ⚠️ MINIMAL
KPI Engine is mostly structural. However, some KPIs may have vertical-specific interpretations:

- **"title_unique_keywords"**: What counts as "unique"? In branded apps, brand name may be intentionally repeated.
- **"brand_presence_title"**: Expected brand presence varies by vertical (utilities: high, discovery apps: low).
- **"generic_combo_count"**: "Generic" definition uses `getTokenRelevance()` → VERTICAL BIAS.

**Future Requirement**: Vertical-specific KPI thresholds, normalization bounds.

---

#### **2.3.3 Tokenization & Text Analysis**

**File**: `src/engine/metadata/tokenization.ts`

**Purpose**: ASO-aware tokenization, stopword filtering, text analysis.

**Key Functions**:

##### **tokenizeForASO(text): string[]**
Splits text into tokens:
- Preserves hyphens (e.g., "self-paced" → "self-paced")
- Splits camelCase (e.g., "LearnSpanish" → "Learn", "Spanish")
- Removes punctuation
- Lowercases

**Vertical Bias**: ❌ NONE (tokenization is generic)

##### **filterStopwords(tokens, stopwords): string[]**
Removes common stopwords ("the", "a", "and", etc.)

**Stopwords File**: `src/modules/metadata-scoring/data/stopwords.json`

**Vertical Bias**: ⚠️ MINIMAL
Stopwords are mostly universal. However, some category-specific stopwords may exist:
- Language apps: "the", "a", "and" are always filler
- Finance apps: "for", "your", "with" may be necessary connectors ("for your portfolio")

**Future Requirement**: Vertical-specific stopword overrides.

---

#### **2.3.4 Combo Engine V2**

**File**: `src/modules/metadata-scoring/utils/comboEngineV2.ts`

**Purpose**: Generates keyword combinations (bigrams, trigrams) and classifies them.

**Key Functions**:

##### **generateEnhancedCombos(titleTokens, subtitleTokens, stopwords)**
Generates all N-grams (1-3 tokens):
- Bigrams: "learn spanish", "language app"
- Trigrams: "learn spanish fast", "language learning app"
- Filters combos with only stopwords
- Computes relevance scores (uses `getTokenRelevance()` → VERTICAL BIAS)

##### **filterLowValueCombos(combos)**
Removes combos with:
- Numeric-only ("30 days", "2024")
- Time-bound phrases ("this month", "right now")
- Generic adjectives ("best app", "top rated")

**Vertical Bias**: ⚠️ MODERATE
Low-value patterns assume:
- Numeric phrases are always low-value (WRONG for finance apps: "24/7 trading")
- Time phrases are always low-value (WRONG for urgency-driven apps: "limited time offer")

**Future Requirement**: Vertical-specific low-value pattern overrides.

---

### 2.4 Data Flow

**End-to-End Pipeline**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. DATA INGESTION                                                       │
│    Store Scraper API → ScrapedMetadata DTO                             │
│    {title, subtitle, description, locale, category}                     │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. TOKENIZATION & CONTEXT BUILDING                                      │
│    MetadataAuditEngine.evaluate()                                       │
│    - tokenizeForASO(title) → titleTokens                               │
│    - tokenizeForASO(subtitle) → subtitleTokens                         │
│    - Load stopwords, semantic rules                                     │
│    - Build EvaluationContext                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. ELEMENT SCORING (Registry-Driven)                                    │
│    For each element (title, subtitle, description):                     │
│    - Fetch rules from METADATA_SCORING_REGISTRY                        │
│    - Evaluate each rule function                                        │
│    - Compute weighted score                                             │
│    → ElementScoringResult {score, rules, issues}                       │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. TOKEN RELEVANCE SCORING (VERTICAL BIAS)                             │
│    getTokenRelevance(token) → 0 | 1 | 2 | 3                           │
│    - Languages/learning verbs → 3                                      │
│    - Domain nouns → 2                                                   │
│    - Neutral → 1                                                        │
│    - Low-value → 0                                                      │
│    ⚠️  BIAS: Hard-coded language-learning patterns                     │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. KEYWORD COVERAGE ANALYSIS                                            │
│    analyzeKeywordCoverage()                                             │
│    - Title unique keywords                                              │
│    - Subtitle incremental keywords                                      │
│    - High-value keyword count (uses getTokenRelevance)                 │
│    → KeywordCoverage                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. COMBO COVERAGE ANALYSIS                                              │
│    analyzeComboCoverage()                                               │
│    - generateEnhancedCombos() → bigrams, trigrams                      │
│    - filterLowValueCombos()                                             │
│    - Classify: branded/generic (Brand Intelligence)                    │
│    - Compute relevance scores (uses getTokenRelevance)                 │
│    → ComboCoverage {titleCombos, subtitleCombos, classified}           │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. INTENT CLASSIFICATION (VERTICAL BIAS)                               │
│    comboIntentClassifier.classifyIntent()                               │
│    - learning: /learn|study|master|practice/                           │
│    - outcome: /fluent|proficient|conversational/                       │
│    - brand: brand name match                                            │
│    - noise: low-value                                                   │
│    ⚠️  BIAS: Only language-learning intent patterns                    │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 8. HOOK CLASSIFICATION (VERTICAL BIAS)                                 │
│    HookDiversityWheel.classifyHook()                                    │
│    - learning: /learn|study|lesson|tutorial/                           │
│    - outcome: /speak|fluent|proficient/                                │
│    - status: /best|top|premium/                                         │
│    - ease: /easy|simple|quick/                                          │
│    - time: /fast|instant|rapid/                                         │
│    - trust: /trusted|proven|safe/                                       │
│    ⚠️  BIAS: Learning/outcome hooks use language-learning vocabulary   │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 9. KPI ENGINE EVALUATION                                                │
│    KpiEngine.evaluate()                                                 │
│    - Compute 34 KPIs across 6 families                                 │
│    - Normalize to 0-100 scale                                           │
│    - Aggregate family scores (weighted avg)                             │
│    - Compute overall score                                              │
│    → KpiEngineResult {vector, kpis, families, overallScore}            │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 10. FORMULA ENGINE (Registry-Driven)                                    │
│     metadataFormulaRegistry formulas:                                   │
│     - metadata_overall_score (Title 65%, Subtitle 35%)                 │
│     - title_element_score (4 rules weighted)                           │
│     - subtitle_element_score (4 rules weighted)                        │
│     - dimension scores (relevance, learning, structure, brand)         │
│     → Element scores, dimension scores                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 11. RECOMMENDATION GENERATION (VERTICAL BIAS)                           │
│     recommendationEngineV2.generateEnhancedRecommendations()            │
│     - Analyze scoring signals                                           │
│     - Generate severity-coded recommendations                           │
│     - Add hard-coded examples: "e.g. 'learn spanish', 'language...'"  │
│     ⚠️  BIAS: Hard-coded language-learning recommendation examples     │
│     → recommendations {ranking, conversion}                             │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 12. UNIFIED AUDIT RESULT                                                │
│     UnifiedMetadataAuditResult:                                         │
│     - overallScore                                                      │
│     - elements {title, subtitle, description}                          │
│     - keywordCoverage                                                   │
│     - comboCoverage                                                     │
│     - topRecommendations                                                │
│     - conversionRecommendations                                         │
│     - conversionInsights                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 13. UI RENDERING (Surface Layer)                                        │
│     UnifiedMetadataAuditModule:                                         │
│     - Score cards                                                       │
│     - Charts (10 visualizations)                                        │
│     - KPI grid (34 KPIs)                                               │
│     - Workbench (combo management)                                      │
│     - Recommendations panel                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Bias Concentration Points**:
- **Step 4**: Token relevance (language-learning keywords scored highest)
- **Step 7**: Intent classification (only learning/outcome patterns)
- **Step 8**: Hook classification (learning/outcome hooks use educational vocabulary)
- **Step 11**: Recommendations (hard-coded "learn spanish" examples)

---

## 3. Vertical Awareness Gap Analysis

### 3.1 Current System Assumptions

The ASO Bible Engine currently assumes apps are **language-learning or educational products**. This manifests in:

#### **Assumption 1: "Learning" is Universal Intent**

**Evidence**:
- `comboIntentClassifier.ts` line 37: `const learningPatterns = /\b(learn|study|practice|master|improve|teach|train|memorize|review|understand)\b/i;`
- `metadataFormulaRegistry.ts` line 240: "Learning/Discovery Dimension" formula
- `MetadataDimensionRadar.tsx`: "Learning" axis on radar chart
- `TokenMixDonut.tsx`: "Learning" token category

**Reality**: Non-educational apps have different primary intents:
- **Reward Apps**: "Earning", "Redeeming", "Saving"
- **Finance Apps**: "Investing", "Trading", "Growing Wealth"
- **Dating Apps**: "Matching", "Meeting", "Connecting"
- **Gaming Apps**: "Playing", "Competing", "Winning"

---

#### **Assumption 2: Generic/Brand Balance Behaves Uniformly**

**Evidence**:
- `metadataFormulaRegistry.ts` line 276: "Target: 60%+ generic for discovery"
- KPI Family: "Brand vs Generic Balance" weighted 20%

**Reality**: Brand/generic balance varies drastically by vertical:
- **Language Learning** (Pimsleur, Duolingo): 60% generic optimal (users search "learn spanish")
- **Branded Utilities** (Gmail, Slack): 80% brand optimal (users search brand name)
- **Reward Apps** (Mistplay, Fetch): 50/50 (users search both "earn rewards" and "Mistplay")
- **Finance Apps** (Robinhood, Coinbase): 70% brand (users search brand + "investing")

---

#### **Assumption 3: Discovery Keywords = Learning Keywords**

**Evidence**:
- `metadataAuditEngine.ts` line 46: `const coreIntentVerbs = /^(learn|speak|study|master|practice|improve|understand|read|write|listen|teach)$/i;`
- These verbs scored as **3** (highest relevance)

**Reality**: Discovery keywords vary by category:
- **Language Learning**: "learn", "study", "master", "fluent"
- **Reward Apps**: "earn", "cashback", "rewards", "points", "gift cards"
- **Finance Apps**: "invest", "trade", "stocks", "crypto", "portfolio"
- **Fitness Apps**: "workout", "calories", "weight loss", "exercise", "nutrition"
- **Productivity Apps**: "organize", "tasks", "notes", "productivity", "calendar"

---

#### **Assumption 4: Numeric/Time Penalties are Universal**

**Evidence**:
- `comboEngineV2.ts`: Filters "30 days", "2024", "this month" as low-value

**Reality**: Numeric/time phrases have category-specific value:
- **Language Learning**: "30 days" → Low-value (arbitrary timeline)
- **Finance Apps**: "24/7 trading" → High-value (service differentiator)
- **Fitness Apps**: "7 minute workout" → High-value (specific program)
- **Subscription Apps**: "30 day trial" → High-value (offer specificity)

---

#### **Assumption 5: Intent Types are Homogeneous**

**Evidence**:
- `intent-intelligence.service.ts`: 4 intent types (navigational, informational, commercial, transactional)

**Reality**: Intent types need vertical extensions:
- **Generic Taxonomy**: Navigational, Informational, Commercial, Transactional (applies to all)
- **Reward Apps**: + "Earning", "Redemption"
- **Finance Apps**: + "Investment Research", "Trading"
- **Dating Apps**: + "Profile Browsing", "Matchmaking"
- **Gaming Apps**: + "Gameplay", "Competition"

---

#### **Assumption 6: Psychological Hook Categories are Educational**

**Evidence**:
- `HookDiversityWheel.tsx` line 54: "Learning" hook uses "learn|study|master|practice|improve|develop|skill|course|lesson|training|tutorial"
- Line 59: "Outcome" hook uses "speak|fluent|proficient|achieve|results|success|become|transform|unlock"

**Reality**: Hook vocabulary varies by vertical:
- **Language Learning**: Learning (study, lesson), Outcome (fluent, proficient)
- **Reward Apps**: Earning (cashback, points), Redemption (gift cards, redeem)
- **Finance Apps**: Growth (returns, profit), Security (safe, insured)
- **Dating Apps**: Connection (match, meet), Relationship (love, romance)
- **Gaming Apps**: Competition (rank, leaderboard), Achievement (unlock, level up)

---

#### **Assumption 7: KPI Family Weights Match Language-Learning Expectations**

**Evidence**:
- `kpi.families.json`: Keyword Architecture 25% (highest), Hook Strength 15%, Intent Alignment 10%

**Reality**: Family importance varies by vertical:
- **Language Learning**: Keyword Architecture 25% ✓ (discovery-driven)
- **Branded Apps**: Brand Recognition 30%, Keyword Architecture 15% (brand-driven)
- **Reward Apps**: Hook Strength 25%, Keyword Architecture 20% (persuasion-driven)
- **Finance Apps**: Trust/Security 25%, Keyword Architecture 15% (credibility-driven)

---

#### **Assumption 8: Recommendations Assume Missing "Learning" Keywords**

**Evidence**:
- `recommendationEngineV2.ts` line 91: `message: '[RANKING][critical] Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. \'learn spanish\', \'language lessons\') typically increases ranking breadth.'`

**Reality**: Recommendation examples must match app category:
- **Language Learning**: "learn spanish", "language lessons" ✓
- **Reward Apps**: "earn rewards", "cashback app", "gift cards"
- **Finance Apps**: "invest stocks", "trading app", "crypto portfolio"
- **Dating Apps**: "meet singles", "dating app", "find matches"

---

### 3.2 Real-World Issue Example

**Case Study**: Mistplay (Reward-to-Play Gaming App) Audited as Language-Learning App

**App Details**:
- **Name**: Mistplay: Play to earn rewards
- **Subtitle**: Earn gift cards for free
- **Category**: Games / Reward Programs
- **Primary Intent**: Users want to earn rewards by playing mobile games

**Current ASO Bible Audit Results** (Incorrect):

1. **Token Relevance Scoring**:
   - "earn" → Scored as **1** (neutral) — WRONG (should be 3 for reward apps)
   - "rewards" → Scored as **1** (neutral) — WRONG (should be 3 for reward apps)
   - "gift" → Scored as **1** (neutral) — WRONG (should be 2 for reward apps)
   - "cards" → Scored as **1** (neutral) — WRONG (should be 2 for reward apps)
   - "play" → Scored as **1** (neutral) — WRONG (should be 3 for gaming/reward apps)
   - "free" → Scored as **0** (low-value) — WRONG (core value prop for reward apps)

   **Impact**: Title score artificially low because core category keywords marked as low-value.

2. **Intent Classification**:
   - "earn rewards" → Classified as **"noise"** (default fallback) — WRONG (should be "earning" intent)
   - "gift cards" → Classified as **"noise"** — WRONG (should be "redemption" intent)
   - "play games" → Classified as **"noise"** — WRONG (should be "gaming" intent)

   **Impact**: Combos marked as low-value, excluded from coverage analysis.

3. **Hook Diversity**:
   - No "Earning" hook category (missing)
   - No "Reward" hook category (missing)
   - "free" matched to "status" hook (incorrect psychology)

   **Impact**: Hook diversity score artificially low (2/6 vs actual 4/6 if correct hooks existed).

4. **Recommendations**:
   - "[RANKING][critical] Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. 'learn spanish', 'language lessons') typically increases ranking breadth."

   **Impact**: Nonsensical recommendation. Suggests adding language-learning keywords to a reward/gaming app.

5. **KPI Scores**:
   - "Keyword Architecture" family scored low due to "neutral" token relevance
   - "Intent Alignment" family scored low due to missing reward/gaming intent patterns

   **Impact**: Overall score 52/100 (should be ~75/100 with correct vertical rules).

**Correct Audit (with Reward App Vertical Rules)**:

1. **Token Relevance** (Reward App Overrides):
   - "earn" → **3** (core intent verb)
   - "rewards" → **3** (core category noun)
   - "gift" → **2** (redemption keyword)
   - "cards" → **2** (redemption keyword)
   - "play" → **3** (engagement verb)
   - "free" → **2** (value proposition, not filler)

2. **Intent Classification** (Reward App Patterns):
   - "earn rewards" → **"earning"** intent
   - "gift cards" → **"redemption"** intent
   - "play games" → **"gaming"** intent

3. **Hook Diversity** (Reward App Hooks):
   - "Earning" hook: earn, cashback, points, rewards
   - "Redemption" hook: gift cards, redeem, cash out
   - "Ease" hook: free, easy
   - "Status" hook: top, best

   **Hook Score**: 4/6 (good diversity)

4. **Recommendations** (Reward App Templates):
   - "[RANKING][moderate] Title has strong earning hooks, but could add redemption specificity (e.g. 'Amazon gift cards', 'PayPal cashback') to capture higher-intent searches."

5. **KPI Scores** (with correct relevance):
   - "Keyword Architecture" → 82/100 (strong coverage of category keywords)
   - "Intent Alignment" → 78/100 (good earning + redemption intent balance)
   - **Overall**: 76/100 (Good, realistic for well-optimized reward app)

---

### 3.3 Where Biases Live (Detailed Mapping)

#### **Registry Definitions**

| Registry | File | Bias Location | Severity |
|----------|------|---------------|----------|
| **Formula Registry** | `metadataFormulaRegistry.ts` | Line 240: "Learning/Discovery Dimension" name | Low (labeling) |
| **KPI Families** | `kpi.families.json` | Weights optimized for discovery-driven apps | Medium |

---

#### **Thresholds**

| Threshold | File | Bias | Severity |
|-----------|------|------|----------|
| **Generic/Brand Target** | `metadataFormulaRegistry.ts:276` | "60%+ generic for discovery" | Medium |
| **Learning Dimension** | `metadataFormulaRegistry.ts:242` | "5+ generic combos = Excellent" | Medium |
| **High-Value Keyword Count** | `recommendationEngineV2.ts:85` | "≤1 = critical" (assumes discovery-driven) | Medium |

---

#### **Pattern Matchers**

| Pattern | File | Bias | Severity |
|---------|------|------|----------|
| **Token Relevance** | `metadataAuditEngine.ts:36-60` | Languages/learning verbs = 3, domain nouns = 2 | **CRITICAL** |
| **Intent Classification** | `comboIntentClassifier.ts:37-44` | Only learning/outcome patterns | **CRITICAL** |
| **Hook Classification** | `HookDiversityWheel.tsx:50-84` | Learning/outcome hooks use educational vocab | **CRITICAL** |
| **Low-Value Combos** | `comboEngineV2.ts` | Numeric/time phrases always low-value | Medium |

---

#### **Intent Logic**

| Intent System | File | Bias | Severity |
|---------------|------|------|----------|
| **Combo Intent** | `comboIntentClassifier.ts` | learning/outcome/brand/noise only | **CRITICAL** |
| **Search Intent** | `intent-intelligence.service.ts` | navigational/informational/commercial/transactional (missing vertical extensions) | Medium |

---

#### **KPI Weights**

| KPI/Family | Bias | Severity |
|------------|------|----------|
| **Keyword Architecture 25%** | Assumes discovery-driven apps | Medium |
| **Hook Strength 15%** | Assumes educational persuasion | Low |
| **Intent Alignment 10%** | Low priority (assumes intent is secondary to keywords) | Low |

---

#### **Recommendation Logic**

| Recommendation | File | Bias | Severity |
|----------------|------|------|----------|
| **Hard-coded Examples** | `recommendationEngineV2.ts:91, 100, 120, ...` | "learn spanish", "language lessons" | **CRITICAL** |
| **Missing Keyword Templates** | `recommendationEngineV2.ts` | No category-specific templates | **CRITICAL** |

---

## 4. Scalability Requirements for Multi-Vertical ASO Bible

### 4.1 Vertical-Specific Rule Sets (Future Capability)

The system must support **loading category-specific rule overrides** based on app category.

#### **4.1.1 Override Hierarchy**

```
Global Base Rules (applies to all apps)
       ↓
Vertical Rules (applies to category: Games, Education, Finance, etc.)
       ↓
Market Rules (applies to locale: US, UK, JP, etc.)
       ↓
Client Overrides (applies to specific app_id, optional)
```

**Loading Logic**:
1. Load global base rules
2. If app category detected → Load vertical rules → Merge/override global rules
3. If locale detected → Load market rules → Merge/override vertical rules
4. If client overrides exist → Load client rules → Merge/override market rules

**Fallback**: If no vertical/market/client rules found → Use global base rules.

---

#### **4.1.2 Vertical Override Scope**

Each vertical rule set can override:

##### **KPI Weights**
- Override family weights (e.g., Branded Apps: Brand Recognition 30%, Keyword Architecture 15%)
- Override individual KPI weights within families

##### **KPI Thresholds**
- Override minValue, maxValue for normalization
- Override targetValue for target_range direction

##### **Intent Patterns**
- Add new intent categories (e.g., "earning", "redemption" for reward apps)
- Override intent regex patterns

##### **Hook Patterns**
- Add new hook categories (e.g., "earning", "growth", "connection")
- Override hook regex patterns

##### **Token Relevance Scoring**
- Override relevance score for specific tokens
- Add category-specific high-value keywords (score 3)
- Add category-specific domain nouns (score 2)

##### **Recommendations**
- Override recommendation templates
- Use category-appropriate examples

##### **High-Value Definitions**
- Define what counts as "high-value keyword" per category

##### **Stopword / Filler Definitions**
- Override stopwords (some categories may need connectors like "for", "with")
- Override filler patterns (e.g., "free" is filler in education, value prop in reward apps)

##### **Semantic Scoring**
- Override semantic rule patterns (benefit keywords, CTA verbs, etc.)

##### **Opportunity Deltas**
- Override target scores per dimension (e.g., branded apps target 80% brand vs 40% generic)

---

### 4.2 Multi-Market Variations (Future)

Market-specific overrides for **locale-based patterns**:

#### **Per-Market Overrides**

##### **Intent Patterns (Locale-Specific)**
- **US**: "learn spanish", "invest stocks"
- **UK**: "learn Spanish", "trade shares" (different vocabulary)
- **Japan**: "英語を学ぶ" (katakana/hiragana/kanji patterns)

##### **Noise/Filler Tolerance**
- **US**: Strict filler removal
- **UK**: Allow British connectors ("whilst", "amongst")
- **Germany**: Allow compound words (don't split "Sprachlernapp")

##### **Character Limits**
- **iOS Global**: Title 30, Subtitle 30
- **Android Global**: Title 50, Subtitle 80
- Limits consistent across markets, but weighting may vary

##### **Stopwords**
- **US/UK**: "the", "a", "and", "or", "for"
- **Germany**: "der", "die", "das", "und", "oder"
- **Japan**: "の", "を", "に", "は", "が"

---

### 4.3 Competitor & Category Benchmarks (Future)

#### **Category-Specific Benchmarking**

**Requirement**: Compare app against **category norms**, not global norms.

**Current**: All apps compared to same thresholds (75+ = Excellent, 50-75 = Good)

**Future**:
- Load category benchmarks from `benchmark-registry.service.ts`
- Compute percentile rank within category
- Display category-specific targets

**Example**:

**Language Learning Category Benchmarks**:
- Average Overall Score: 68/100
- Top Quartile: 82/100
- Median: 65/100

**Reward Apps Category Benchmarks**:
- Average Overall Score: 58/100
- Top Quartile: 72/100
- Median: 55/100

**Display**:
- "Your score: 76/100 — Top 15% in Reward Apps category"
- "Target to reach top 10%: 78/100"

---

#### **Competitor-Specific Formula Sets**

**Requirement**: When comparing against specific competitors, use **competitor's vertical rules**, not global rules.

**Scenario**:
- User auditing Mistplay (Reward App)
- Comparing against Duolingo (Language Learning)
- Use **Reward App rules** for Mistplay, **Language Learning rules** for Duolingo
- Show side-by-side with appropriate category contexts

---

### 4.4 Admin UI (Future)

**Requirement**: Editable registry management via frontend admin interface.

#### **Admin UI Features**

##### **1. KPI Weight Editor**
- Grouped sliders for each family
- Real-time validation (weights sum to 1.0)
- Preview mode (test weights on sample data before saving)
- Export/import configurations as JSON
- Save named configs ("Aggressive Discovery", "Brand Protection")

##### **2. Formula Builder**
- Visual formula composer (drag-and-drop components)
- Weight adjustment sliders
- Live score preview
- Formula templates library (weighted_sum, threshold_based, custom)

##### **3. Pattern Editor** (SAFE MODE)
- Edit intent patterns with regex validation
- Test patterns against sample combos
- Safe mode: Prevent overwriting core patterns without admin approval
- Pattern versioning (track changes)

##### **4. Vertical Rule Manager**
- Create new vertical rule sets
- Clone existing verticals as templates
- Override specific rules per vertical
- Preview vertical rules on sample apps

##### **5. Recommendation Template Editor**
- Edit recommendation messages
- Use template variables: `{{category_example_1}}`, `{{category_example_2}}`
- Preview recommendations with category-specific examples

##### **6. Rule-Set Publishing/Releasing**
- Draft mode (edit without affecting production)
- Preview mode (test on staging apps)
- Publish mode (release to production)
- Version control (rollback to previous rule sets)

---

## 5. Proposed Scalable Architectural Model

**IMPORTANT**: This is **documentation only**. No implementation yet. This section describes the **future architecture** for multi-vertical scalability.

---

### 5.1 Core Layer (Shared Across All Verticals)

The core layer provides **category-agnostic foundational services**:

#### **Core Services**

##### **Tokenization**
- `tokenizeForASO(text): string[]`
- Platform-agnostic, locale-agnostic
- Handles hyphens, camelCase, punctuation
- Used by all verticals

##### **Combo Extraction**
- `generateEnhancedCombos(tokens): Combo[]`
- N-gram generation (bigrams, trigrams)
- Source tracking (title/subtitle/both)
- Used by all verticals

##### **Base Intent Taxonomy**
- **Universal Intent Types** (applies to all verticals):
  - Navigational: User seeks specific app/brand
  - Informational: User researching topic
  - Commercial: User comparing options
  - Transactional: User ready to download

- **Vertical-Specific Intent Types** (loaded per vertical):
  - Language Learning: "learning", "outcome"
  - Reward Apps: "earning", "redemption"
  - Finance Apps: "investment_research", "trading"
  - (etc.)

##### **KPI Registry Structure**
- JSON schema for KPI definitions
- Normalization logic (0-100 scale)
- Direction handling (higher_is_better, lower_is_better, target_range)
- Used by all verticals

##### **Formula Engine**
- Formula evaluation (weighted_sum, ratio, composite, threshold_based, custom)
- Component aggregation
- Score clamping
- Used by all verticals

##### **Chart Type Library**
- Chart data transformation utilities
- Color palette definitions
- Tooltip formatters
- Used by all verticals (labels may be vertical-specific)

---

### 5.2 Vertical Rule Layer (NEW CONCEPTUAL LAYER)

**Purpose**: Provide category-specific overrides for pattern matching, scoring, and recommendations.

#### **Directory Structure** (Proposed)

```
src/engine/metadata/verticals/
├── base/                          # Global base rules (fallback)
│   ├── tokenRelevance.ts
│   ├── intentPatterns.ts
│   ├── hookPatterns.ts
│   ├── kpiOverrides.json
│   ├── formulaOverrides.json
│   └── recommendationTemplates.ts
│
├── language_learning/             # Language-learning vertical
│   ├── tokenRelevance.ts          # "learn", "spanish" = 3
│   ├── intentPatterns.ts          # learning/outcome patterns
│   ├── hookPatterns.ts            # learning/outcome hooks
│   ├── kpiOverrides.json          # Keyword Arch 25%
│   ├── formulaOverrides.json      # Learning dimension
│   └── recommendationTemplates.ts # "e.g. 'learn spanish'"
│
├── rewards/                       # Reward apps vertical
│   ├── tokenRelevance.ts          # "earn", "rewards" = 3
│   ├── intentPatterns.ts          # earning/redemption patterns
│   ├── hookPatterns.ts            # earning/redemption hooks
│   ├── kpiOverrides.json          # Hook Strength 25%
│   ├── formulaOverrides.json      # Earning dimension
│   └── recommendationTemplates.ts # "e.g. 'earn rewards'"
│
├── finance/                       # Finance apps vertical
│   ├── tokenRelevance.ts          # "invest", "stocks" = 3
│   ├── intentPatterns.ts          # investment/trading patterns
│   ├── hookPatterns.ts            # growth/security hooks
│   ├── kpiOverrides.json          # Trust 25%, Keyword 15%
│   ├── formulaOverrides.json      # Growth dimension
│   └── recommendationTemplates.ts # "e.g. 'invest stocks'"
│
├── dating/                        # Dating apps vertical
│   ├── tokenRelevance.ts          # "match", "date" = 3
│   ├── intentPatterns.ts          # connection/relationship patterns
│   ├── hookPatterns.ts            # connection/romance hooks
│   ├── kpiOverrides.json          # Hook Strength 30%
│   ├── formulaOverrides.json      # Connection dimension
│   └── recommendationTemplates.ts # "e.g. 'meet singles'"
│
└── index.ts                       # Vertical loader
```

---

#### **Vertical Loader Logic** (Conceptual)

```typescript
// src/engine/metadata/verticals/index.ts (FUTURE)

import type { AppCategory } from '@/types/aso';

export interface VerticalRules {
  tokenRelevance: (token: string) => 0 | 1 | 2 | 3;
  intentPatterns: Record<string, RegExp>;
  hookPatterns: Record<string, RegExp>;
  kpiOverrides?: Partial<KpiRegistry>;
  formulaOverrides?: Partial<FormulaRegistry>;
  recommendationTemplates: Record<string, string>;
}

/**
 * Loads vertical-specific rules based on app category
 * Falls back to base rules if vertical not found
 */
export function loadVerticalRules(category: AppCategory): VerticalRules {
  const verticalMap: Record<string, () => VerticalRules> = {
    'Education': () => import('./language_learning').then(m => m.rules),
    'Games': () => import('./rewards').then(m => m.rules),  // If subcategory = reward
    'Finance': () => import('./finance').then(m => m.rules),
    'Lifestyle': (subcategory) => {
      if (subcategory === 'Dating') return import('./dating').then(m => m.rules);
      return import('./base').then(m => m.rules);  // Fallback
    },
    // ... more categories
  };

  const loader = verticalMap[category];
  if (loader) {
    return loader();
  }

  // Fallback to base rules
  return import('./base').then(m => m.rules);
}
```

---

#### **Vertical-Specific Token Relevance** (Example)

**Base Rules** (`verticals/base/tokenRelevance.ts`):
```typescript
export function getTokenRelevance(token: string): 0 | 1 | 2 | 3 {
  const tokenLower = token.toLowerCase();

  // Level 0: Universal low-value
  if (/^(best|top|great|good|new|latest|\d+)$/i.test(tokenLower)) {
    return 0;
  }

  // Level 1: Neutral (default)
  return 1;
}
```

**Language Learning Override** (`verticals/language_learning/tokenRelevance.ts`):
```typescript
import { getTokenRelevance as baseGetTokenRelevance } from '../base/tokenRelevance';

export function getTokenRelevance(token: string): 0 | 1 | 2 | 3 {
  const tokenLower = token.toLowerCase();

  // Level 3: Languages and learning verbs
  if (/^(english|spanish|french|german|learn|speak|study|master)$/i.test(tokenLower)) {
    return 3;
  }

  // Level 2: Domain nouns
  if (/^(lesson|course|grammar|vocabulary|fluency)$/i.test(tokenLower)) {
    return 2;
  }

  // Fallback to base rules
  return baseGetTokenRelevance(token);
}
```

**Reward App Override** (`verticals/rewards/tokenRelevance.ts`):
```typescript
import { getTokenRelevance as baseGetTokenRelevance } from '../base/tokenRelevance';

export function getTokenRelevance(token: string): 0 | 1 | 2 | 3 {
  const tokenLower = token.toLowerCase();

  // Level 3: Earning verbs and core reward nouns
  if (/^(earn|rewards|cashback|points|redeem|play|win)$/i.test(tokenLower)) {
    return 3;
  }

  // Level 2: Redemption nouns
  if (/^(gift|cards|paypal|amazon|prizes|savings)$/i.test(tokenLower)) {
    return 2;
  }

  // Override: "free" is value prop, not filler
  if (tokenLower === 'free') {
    return 2;  // Base rules mark as 0, we override to 2
  }

  // Fallback to base rules
  return baseGetTokenRelevance(token);
}
```

---

#### **Vertical-Specific Intent Patterns** (Example)

**Base Intent** (`verticals/base/intentPatterns.ts`):
```typescript
export const intentPatterns = {
  navigational: /\b(app|official|download)\b/i,
  informational: /\b(how|what|why|guide|tips)\b/i,
  commercial: /\b(best|top|compare|vs|review)\b/i,
  transactional: /\b(free|trial|install|get|start)\b/i,
};
```

**Language Learning Intent** (`verticals/language_learning/intentPatterns.ts`):
```typescript
import { intentPatterns as baseIntentPatterns } from '../base/intentPatterns';

export const intentPatterns = {
  ...baseIntentPatterns,  // Inherit base patterns
  learning: /\b(learn|study|practice|master|improve|teach|train)\b/i,
  outcome: /\b(fluency|fluent|proficient|conversational|advanced)\b/i,
};
```

**Reward App Intent** (`verticals/rewards/intentPatterns.ts`):
```typescript
import { intentPatterns as baseIntentPatterns } from '../base/intentPatterns';

export const intentPatterns = {
  ...baseIntentPatterns,
  earning: /\b(earn|cashback|points|rewards|pay|money|cash)\b/i,
  redemption: /\b(redeem|gift cards|paypal|prizes|withdraw|cash out)\b/i,
  gaming: /\b(play|games|gaming|mobile games|android games)\b/i,
};
```

---

#### **Vertical-Specific Hook Patterns** (Example)

**Reward App Hooks** (`verticals/rewards/hookPatterns.ts`):
```typescript
export const hookPatterns = {
  earning: /\b(earn|cashback|points|rewards|money|cash|pay)\b/i,
  redemption: /\b(gift cards|redeem|prizes|paypal|amazon|free|savings)\b/i,
  status: /\b(best|top|#1|leading|premium|verified)\b/i,
  ease: /\b(easy|simple|quick|effortless|instant|automatic)\b/i,
  time: /\b(fast|instant|immediate|24\/7|daily|weekly)\b/i,
  trust: /\b(trusted|safe|secure|verified|official|legit)\b/i,
};
```

---

#### **How Override Loading Works** (Conceptual)

**MetadataAuditEngine** (Modified):
```typescript
// src/engine/metadata/metadataAuditEngine.ts (FUTURE)

import { loadVerticalRules } from './verticals';

export class MetadataAuditEngine {
  static evaluate(metadata: ScrapedMetadata): UnifiedMetadataAuditResult {
    // Load vertical rules based on app category
    const verticalRules = loadVerticalRules(metadata.applicationCategory);

    // Use vertical-specific token relevance
    const titleTokens = tokenizeForASO(metadata.title);
    const titleHighValueCount = titleTokens.filter(t =>
      verticalRules.tokenRelevance(t) >= 2  // Use vertical function
    ).length;

    // Use vertical-specific intent classification
    const combos = generateEnhancedCombos(titleTokens, subtitleTokens);
    const classifiedCombos = combos.map(combo => ({
      ...combo,
      intent: classifyIntentWithRules(combo.text, verticalRules.intentPatterns),
      hook: classifyHookWithRules(combo.text, verticalRules.hookPatterns),
    }));

    // Generate recommendations with vertical templates
    const recommendations = generateRecommendationsV2(
      signals,
      verticalRules.recommendationTemplates
    );

    // ...
  }
}
```

**Validation**: On vertical load, validate that all override weights sum correctly, all patterns compile, all templates have required variables.

---

### 5.3 Market Rule Layer (Future)

**Purpose**: Locale-specific overrides for language, stopwords, character limits.

#### **Directory Structure** (Proposed)

```
src/engine/metadata/markets/
├── base/                    # Global market defaults
│   ├── stopwords.json
│   ├── characterLimits.json
│   └── fillerPatterns.json
│
├── us/                      # US market
│   ├── stopwords.json       # "the", "a", "and"
│   └── fillerPatterns.json  # US-specific filler
│
├── uk/                      # UK market
│   ├── stopwords.json       # "whilst", "amongst"
│   └── fillerPatterns.json
│
├── de/                      # Germany market
│   ├── stopwords.json       # "der", "die", "das"
│   └── fillerPatterns.json  # Don't split compounds
│
├── jp/                      # Japan market
│   ├── stopwords.json       # "の", "を", "に"
│   └── fillerPatterns.json  # Katakana filler
│
└── index.ts                 # Market loader
```

**Market Loader** (Conceptual):
```typescript
export function loadMarketRules(locale: string): MarketRules {
  const market = locale.split('-')[1]?.toLowerCase() || 'us';  // e.g., "en-US" → "us"

  const marketMap: Record<string, () => MarketRules> = {
    'us': () => import('./us').then(m => m.rules),
    'uk': () => import('./uk').then(m => m.rules),
    'de': () => import('./de').then(m => m.rules),
    'jp': () => import('./jp').then(m => m.rules),
    // ...
  };

  return marketMap[market]?.() || import('./base').then(m => m.rules);
}
```

---

### 5.4 Client-Specific Overrides (Future)

**Purpose**: Allow specific apps to override rules (e.g., enterprise clients with custom ASO strategies).

#### **Database Table** (Proposed)

```sql
CREATE TABLE client_rule_overrides (
  id UUID PRIMARY KEY,
  app_id UUID REFERENCES apps(id),
  override_type VARCHAR,  -- 'kpi_weight', 'formula_weight', 'intent_pattern', etc.
  override_key VARCHAR,   -- KPI ID, formula ID, pattern name
  override_value JSONB,   -- New value
  created_at TIMESTAMPTZ,
  created_by UUID
);
```

**Example Override**:
```json
{
  "app_id": "123e4567-e89b-12d3-a456-426614174000",
  "override_type": "kpi_weight",
  "override_key": "keyword_architecture",
  "override_value": { "weight": 0.30 }  // Override family weight to 30%
}
```

**Loading Logic**:
```typescript
export async function loadClientOverrides(appId: string): Promise<ClientOverrides> {
  const overrides = await supabase
    .from('client_rule_overrides')
    .select('*')
    .eq('app_id', appId);

  return parseOverrides(overrides);
}
```

**Merge Order**:
1. Global base rules
2. Vertical rules (category-based)
3. Market rules (locale-based)
4. **Client overrides** (app-specific) ← Final layer

---

## 6. Registry References & Mapping Tables

### 6.1 KPI → Family → Formula → Chart Mapping

**34 KPIs** → **6 Families** → **8 Formulas** → **10 Charts**

#### **Family 1: Clarity & Structure (20%)**

| KPI ID | Label | Weight | Used In Formula | Displayed In Chart |
|--------|-------|--------|-----------------|-------------------|
| title_char_usage | Title Character Usage | 0.25 | title_element_score | SlotUtilizationBars |
| subtitle_char_usage | Subtitle Character Usage | 0.20 | subtitle_element_score | SlotUtilizationBars |
| title_keyword_count | Title Keyword Count | 0.20 | - | KeywordCoverageCard |
| subtitle_keyword_count | Subtitle Keyword Count | 0.15 | - | KeywordCoverageCard |
| title_duplication_penalty | Title Duplication Penalty | 0.10 | title_element_score | TokenMixDonut |
| subtitle_duplication_penalty | Subtitle Duplication Penalty | 0.10 | subtitle_element_score | TokenMixDonut |

---

#### **Family 2: Keyword Architecture (25%)**

| KPI ID | Label | Weight | Used In Formula | Displayed In Chart |
|--------|-------|--------|-----------------|-------------------|
| title_unique_keywords | Title Unique Keywords | 0.30 | title_element_score | KeywordCoverageCard |
| subtitle_incremental_value | Subtitle Incremental Value | 0.40 | subtitle_element_score | KeywordCoverageCard |
| title_combo_coverage | Title Combo Coverage | 0.30 | title_element_score | ComboHeatmap |
| subtitle_combo_coverage | Subtitle Combo Coverage | 0.25 | subtitle_element_score | ComboHeatmap |
| title_high_value_keywords | Title High-Value Keywords | 0.25 | - | EfficiencySparkline |
| subtitle_high_value_keywords | Subtitle High-Value Keywords | 0.20 | - | EfficiencySparkline |
| total_unique_keywords | Total Unique Keywords | 0.15 | - | MetadataOpportunityDeltaChart |
| keyword_overlap_ratio | Keyword Overlap Ratio | 0.10 | - | KeywordCoverageCard |
| generic_combo_count | Generic Combo Count | 0.15 | metadata_dimension_learning | DiscoveryFootprintMap |
| branded_combo_count | Branded Combo Count | 0.10 | metadata_dimension_brand_balance | DiscoveryFootprintMap |

---

#### **Family 3: Hook Strength (15%)**

| KPI ID | Label | Weight | Used In Formula | Displayed In Chart |
|--------|-------|--------|-----------------|-------------------|
| description_hook_strength | Description Hook Strength | 0.30 | description_conversion_score | - |
| description_feature_mentions | Description Feature Mentions | 0.25 | description_conversion_score | - |
| description_cta_strength | Description CTA Strength | 0.20 | description_conversion_score | - |
| hook_diversity_score | Hook Diversity Score | 0.25 | - | HookDiversityWheel |

---

#### **Family 4: Brand vs Generic Balance (20%)**

| KPI ID | Label | Weight | Used In Formula | Displayed In Chart |
|--------|-------|--------|-----------------|-------------------|
| brand_presence_title | Brand Presence in Title | 0.30 | - | TokenMixDonut |
| brand_presence_subtitle | Brand Presence in Subtitle | 0.25 | - | TokenMixDonut |
| generic_discovery_ratio | Generic Discovery Ratio | 0.25 | metadata_dimension_brand_balance | MetadataDimensionRadar |
| brand_generic_balance | Brand/Generic Balance | 0.20 | metadata_dimension_brand_balance | MetadataDimensionRadar |

---

#### **Family 5: Psychology Alignment (10%)**

| KPI ID | Label | Weight | Used In Formula | Displayed In Chart |
|--------|-------|--------|-----------------|-------------------|
| emotional_trigger_count | Emotional Trigger Count | 0.30 | - | HookDiversityWheel |
| urgency_indicator_count | Urgency Indicator Count | 0.25 | - | - |
| social_proof_count | Social Proof Count | 0.25 | - | - |
| benefit_keyword_count | Benefit Keyword Count | 0.20 | - | - |

---

#### **Family 6: Intent Alignment (10%)**

| KPI ID | Label | Weight | Used In Formula | Displayed In Chart |
|--------|-------|--------|-----------------|-------------------|
| navigational_intent_count | Navigational Intent Count | 0.25 | - | DiscoveryFootprintMap |
| informational_intent_count | Informational Intent Count | 0.25 | - | DiscoveryFootprintMap |
| commercial_intent_count | Commercial Intent Count | 0.25 | - | DiscoveryFootprintMap |
| transactional_intent_count | Transactional Intent Count | 0.25 | - | DiscoveryFootprintMap |

---

### 6.2 Formula → Component Mapping

| Formula ID | Type | Components | Weights | Output Used In |
|------------|------|------------|---------|----------------|
| metadata_overall_score | weighted_sum | title_score, subtitle_score | 65%, 35% | MetadataScoreCard |
| title_element_score | weighted_sum | title_char_usage, title_unique_keywords, title_combo_coverage, title_filler_penalty | 25%, 30%, 30%, 15% | ElementDetailCard |
| subtitle_element_score | weighted_sum | subtitle_char_usage, subtitle_incremental_value, subtitle_combo_coverage, subtitle_complementarity | 20%, 40%, 25%, 15% | ElementDetailCard |
| description_conversion_score | weighted_sum | description_hook_strength, description_feature_mentions, description_cta_strength, description_readability | 30%, 25%, 20%, 25% | ElementDetailCard |
| metadata_dimension_relevance | composite | title_score, subtitle_score | 50%, 50% | MetadataDimensionRadar |
| metadata_dimension_learning | threshold_based | generic_combo_count | ≥5 = 100, ≥3 = 75, ≥1 = 50, <1 = 20 | MetadataDimensionRadar |
| metadata_dimension_structure | composite | title_score | 100% | MetadataDimensionRadar |
| metadata_dimension_brand_balance | custom | genericCount / (brandedCount + genericCount) * 100 + 30 | - | MetadataDimensionRadar |

---

### 6.3 Chart → Data Source Mapping

| Chart | File | Primary Data Source | Secondary Data | Vertical Bias |
|-------|------|---------------------|----------------|---------------|
| MetadataOpportunityDeltaChart | charts/MetadataOpportunityDeltaChart.tsx | metadataDimensionScores (4 dimensions) | - | "Learning" dimension label |
| MetadataDimensionRadar | charts/MetadataDimensionRadar.tsx | metadataDimensionScores | - | "Learning" axis label |
| SlotUtilizationBars | charts/SlotUtilizationBars.tsx | keywordCoverage (title/subtitle keyword counts) | - | Minimal |
| TokenMixDonut | charts/TokenMixDonut.tsx | keywordCoverage (title/subtitle keywords) | Estimated brand/category/learning/outcome/filler/duplicate | "Learning"/"Outcome" categories |
| SeverityDonut | charts/SeverityDonut.tsx | topRecommendations (severity parsing) | - | Minimal |
| EfficiencySparkline | charts/EfficiencySparkline.tsx | keywordCoverage (meaningful keywords / total possible) | - | Minimal |
| ComboHeatmap | charts/ComboHeatmap.tsx | comboCoverage (titleCombos, subtitleCombos) | Relevance scores | Minimal |
| DiscoveryFootprintMap | charts/DiscoveryFootprintMap.tsx | comboCoverage (classified combos) | Intent classification | "learning"/"outcome" categories |
| SemanticDensityGauge | charts/SemanticDensityGauge.tsx | comboCoverage (unique intents / total combos) | - | Minimal |
| HookDiversityWheel | charts/HookDiversityWheel.tsx | comboCoverage (classified combos) | Hook patterns | "learning"/"outcome" hooks |

---

### 6.4 Recommendation → Severity → Chart Mapping

| Recommendation Category | Severity Levels | Example Message | Displayed In |
|------------------------|-----------------|-----------------|--------------|
| ranking_keyword | critical, strong, moderate | "Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. 'learn spanish', 'language lessons') typically increases ranking breadth." | RecommendationsPanel, SeverityDonut |
| ranking_structure | critical, strong, moderate | "Title uses only 18/30 characters — expanding to full limit adds 1–2 more ranking keywords." | RecommendationsPanel, SeverityDonut |
| conversion | strong, moderate, optional | "Description lacks strong CTA — adding action verbs (e.g. 'Start learning today', 'Download now') improves conversion." | RecommendationsPanel (conversion section) |
| brand_alignment | moderate, optional | "Metadata is 85% branded — adding 1–2 generic discovery keywords (e.g. 'language app', 'learn languages') increases organic reach." | RecommendationsPanel |

---

## 7. Risk Areas & "Leak Points"

**"Leak Points"** are locations where vertical biases can **unintentionally propagate** through the system, causing category-mismatch errors.

### 7.1 Intent Classifier Patterns (CRITICAL LEAK)

**File**: `src/utils/comboIntentClassifier.ts`

**Leak**: Hard-coded regex patterns for "learning" and "outcome" intents.

**Impact**: Non-educational apps have combos misclassified as "noise".

**Risk Level**: ❌ **CRITICAL**

**Example**:
- Mistplay combo "earn rewards" → Classified as **"noise"** (should be "earning")
- Robinhood combo "invest stocks" → Classified as **"noise"** (should be "investment")

**Mitigation**:
- Move intent patterns to registry
- Load vertical-specific intent patterns
- Add fallback to base patterns

---

### 7.2 Hook Pattern Matchers (CRITICAL LEAK)

**File**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/HookDiversityWheel.tsx`

**Leak**: Hard-coded regex patterns for 6 hook categories, with "learning"/"outcome" using educational vocabulary.

**Impact**: Non-educational apps have low hook diversity scores.

**Risk Level**: ❌ **CRITICAL**

**Example**:
- Mistplay hooks: "earn", "cashback", "rewards" → No match to "learning"/"outcome" patterns → Hook diversity 2/6 (should be 4/6)

**Mitigation**:
- Move hook patterns to registry
- Load vertical-specific hook patterns
- Add new hook categories per vertical

---

### 7.3 Relevance Scoring (CRITICAL LEAK)

**File**: `src/engine/metadata/metadataAuditEngine.ts`, function `getTokenRelevance()`

**Leak**: Hard-coded language-learning keywords scored as 3 (highest relevance).

**Impact**: Category-appropriate keywords scored as neutral (1), lowering title/subtitle scores.

**Risk Level**: ❌ **CRITICAL**

**Example**:
- Pimsleur: "learn", "spanish" → Scored as **3** ✓
- Mistplay: "earn", "rewards" → Scored as **1** (should be 3)
- Robinhood: "invest", "stocks" → Scored as **1** (should be 3)

**Mitigation**:
- Move token relevance logic to registry
- Load vertical-specific relevance patterns
- Add fallback to base relevance

---

### 7.4 Generic/Filler Classification (MODERATE LEAK)

**File**: `src/modules/metadata-scoring/utils/comboEngineV2.ts`, function `filterLowValueCombos()`

**Leak**: Numeric phrases ("30 days"), time phrases ("right now") always marked as low-value.

**Impact**: Category-appropriate phrases (e.g., "24/7 trading", "7 minute workout") incorrectly filtered.

**Risk Level**: ⚠️ **MODERATE**

**Example**:
- Pimsleur: "30 days" → Low-value ✓ (arbitrary timeline)
- Robinhood: "24/7 trading" → Low-value ❌ (service differentiator)

**Mitigation**:
- Move low-value patterns to registry
- Load vertical-specific filler overrides
- Allow whitelisting specific numeric phrases

---

### 7.5 Numeric Penalties (MODERATE LEAK)

**File**: `src/engine/metadata/metadataAuditEngine.ts`, low-value pattern: `/\d+/`

**Leak**: All numeric tokens scored as 0 (low-value).

**Impact**: Branded apps with numbers in name (7-Eleven), programs with numeric identifiers (P90X), or version numbers (Photoshop 2024) penalized.

**Risk Level**: ⚠️ **MODERATE**

**Example**:
- 7-Eleven app: "7" → Scored as **0** (should be brand component)
- P90X: "90" → Scored as **0** (should be program identifier)

**Mitigation**:
- Add brand-aware numeric handling
- Whitelist brand-specific numbers
- Allow vertical overrides for numeric tolerance

---

### 7.6 Discovery Keyword Assumptions (MODERATE LEAK)

**File**: `src/engine/metadata/utils/recommendationEngineV2.ts`

**Leak**: Recommendations assume "adding discovery keywords" always means adding "learning" keywords.

**Impact**: Irrelevant recommendations for non-discovery apps.

**Risk Level**: ⚠️ **MODERATE**

**Example**:
- Mistplay recommendation: "Add intent terms like 'learn spanish'" (WRONG — should suggest "earn rewards")
- Slack recommendation: "Add discovery keywords" (WRONG — Slack is branded, users search "Slack")

**Mitigation**:
- Use vertical-specific recommendation templates
- Replace hard-coded examples with template variables
- Disable discovery recommendations for branded utility apps

---

### 7.7 Recommendations Messages (CRITICAL LEAK)

**File**: `src/engine/metadata/utils/recommendationEngineV2.ts`

**Leak**: Hard-coded examples in recommendation strings.

**Impact**: Users see nonsensical, category-mismatched recommendations.

**Risk Level**: ❌ **CRITICAL**

**Example**:
- Line 91: `"(e.g. 'learn spanish', 'language lessons')"`
- Appears in recommendations for ALL apps, regardless of category

**Mitigation**:
- Replace hard-coded examples with template variables: `"(e.g. '{{category_example_1}}', '{{category_example_2}}')"`
- Load category-specific examples from vertical rules
- Language Learning: "learn spanish", "language lessons"
- Reward Apps: "earn rewards", "cashback app"
- Finance Apps: "invest stocks", "trading app"

---

### 7.8 Psychology Mapping (MODERATE LEAK)

**File**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/HookDiversityWheel.tsx`

**Leak**: Hook categories assume educational psychology (learning/outcome).

**Impact**: Non-educational apps show low hook diversity even with strong psychological variety.

**Risk Level**: ⚠️ **MODERATE**

**Example**:
- Mistplay has strong "earning" and "redemption" hooks, but no "learning"/"outcome" → Low diversity score

**Mitigation**:
- Expand hook taxonomy to include vertical-specific categories
- Load vertical hook patterns
- Allow custom hook categories per vertical

---

### 7.9 Chart Labels (LOW LEAK)

**Files**: Various chart components

**Leak**: Chart labels assume "Learning" dimension, "Learning/Outcome" token types.

**Impact**: Confusing UI labels for non-educational apps.

**Risk Level**: ⚠️ **LOW** (UI-only, doesn't affect scoring)

**Example**:
- MetadataDimensionRadar shows "Learning" axis for finance app (should show "Discovery" or "Investment Research")
- TokenMixDonut shows "Learning" category for reward app (should show "Earning")

**Mitigation**:
- Use generic labels: "Discovery" instead of "Learning"
- OR: Load vertical-specific chart labels
- OR: Use category-agnostic terminology

---

## 8. Versioning & Migration Strategy

### 8.1 Rule Versioning (High-Level)

**Requirement**: Track changes to KPI weights, formulas, intent patterns, hook patterns, and recommendation templates over time.

#### **Version Stamp in Registry**

Add `version` field to all registries:

```json
{
  "version": "v2.1.0",
  "lastModified": "2025-11-23T10:30:00Z",
  "modifiedBy": "john.doe@yodel.com",
  "kpis": [...]
}
```

#### **Git-Based Change Tracking**

- All registry changes committed to git
- Commit messages describe changes: "Increase Keyword Architecture weight to 30% for discovery-driven apps"
- Git tags for major versions: `aso-bible-v2.0.0`

#### **JSON Snapshots**

- On each registry publish, save snapshot to `data/registry-snapshots/`
- Filename format: `kpi-registry-v2.1.0-20251123.json`
- Allows rollback to previous versions

#### **Audit Log**

Database table for tracking rule changes:

```sql
CREATE TABLE aso_rule_audit_log (
  id UUID PRIMARY KEY,
  registry_type VARCHAR,  -- 'kpi', 'formula', 'intent', 'hook', 'recommendation'
  version VARCHAR,
  change_description TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ,
  snapshot_url TEXT
);
```

---

### 8.2 Draft vs Live Rule Sets

**Requirement**: Allow editing rules without affecting production until explicitly published.

#### **Rule Set Status**

```sql
CREATE TABLE aso_rule_sets (
  id UUID PRIMARY KEY,
  name VARCHAR,           -- "Language Learning Rules v2.1"
  vertical VARCHAR,       -- "language_learning"
  status VARCHAR,         -- 'draft', 'preview', 'live', 'archived'
  created_by UUID,
  created_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);
```

**Workflow**:
1. **Draft Mode**: Admin edits rules in draft mode (not visible to users)
2. **Preview Mode**: Test rules on staging apps, generate sample audits
3. **Publish Mode**: Mark rule set as "live", replaces previous live version
4. **Archive**: Old versions archived for historical reference

---

### 8.3 Export/Import Rule Sets for Auditing

**Requirement**: Allow exporting rule sets as JSON for client review, import for testing.

#### **Export Format**

```json
{
  "ruleSetId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Language Learning Rules v2.1",
  "vertical": "language_learning",
  "version": "v2.1.0",
  "exportedAt": "2025-11-23T10:30:00Z",
  "exportedBy": "john.doe@yodel.com",
  "kpiRegistry": { ... },
  "familyRegistry": { ... },
  "formulaRegistry": { ... },
  "intentPatterns": { ... },
  "hookPatterns": { ... },
  "recommendationTemplates": { ... }
}
```

**Export API**:
```typescript
async function exportRuleSet(ruleSetId: string): Promise<Blob> {
  const ruleSet = await loadRuleSet(ruleSetId);
  const json = JSON.stringify(ruleSet, null, 2);
  return new Blob([json], { type: 'application/json' });
}
```

**Import API**:
```typescript
async function importRuleSet(file: File): Promise<RuleSet> {
  const json = await file.text();
  const ruleSet = JSON.parse(json);

  // Validate schema
  validateRuleSetSchema(ruleSet);

  // Save as draft
  return saveRuleSetAsDraft(ruleSet);
}
```

**Use Cases**:
- **Client Review**: Export rule set, send to client for approval
- **Testing**: Import rule set into staging environment, test on sample apps
- **Rollback**: Import previous version to restore old rules

---

### 8.4 A/B Testing Rule Sets

**Requirement**: Compare two rule sets side-by-side to evaluate impact.

#### **A/B Test Setup**

```sql
CREATE TABLE aso_ab_tests (
  id UUID PRIMARY KEY,
  name VARCHAR,
  rule_set_a UUID REFERENCES aso_rule_sets(id),
  rule_set_b UUID REFERENCES aso_rule_sets(id),
  app_sample_ids UUID[],
  created_by UUID,
  created_at TIMESTAMPTZ
);
```

**Workflow**:
1. Create A/B test with two rule sets
2. Select sample apps (e.g., 50 language-learning apps)
3. Run both rule sets on same apps
4. Compare:
   - Overall score distribution
   - KPI score differences
   - Recommendation differences
   - Family score changes
5. Analyze which rule set produces more accurate/actionable results

**Example**:
- **Rule Set A**: Current language-learning rules (Keyword Architecture 25%)
- **Rule Set B**: Experimental rules (Keyword Architecture 30%, Hook Strength 20%)
- **Sample**: 50 language-learning apps
- **Result**: Rule Set B increases average overall score by 3 points, recommendations become more specific

---

## 9. Appendix

### 9.1 Unified Glossary

| Term | Definition |
|------|------------|
| **ASO** | App Store Optimization — practice of improving app visibility in app store search |
| **ASO Bible** | Yodel's centralized, registry-driven metadata scoring system |
| **Combo** | Keyword combination (bigram or trigram), e.g., "learn spanish", "language learning app" |
| **Element** | Metadata field: Title, Subtitle, Description |
| **Family** | Group of related KPIs (e.g., "Keyword Architecture") |
| **Formula** | Weighted scoring function (e.g., "title_element_score") |
| **Hook** | Psychological trigger in metadata (e.g., "learning", "outcome", "ease") |
| **Intent** | Search intent category (e.g., "navigational", "informational", "learning") |
| **KPI** | Key Performance Indicator — individual metadata quality metric |
| **Leak Point** | Location where vertical bias can propagate unintentionally |
| **Registry** | JSON/TypeScript configuration file defining rules, patterns, or formulas |
| **Relevance Score** | Token value (0-3): 3 = highest, 0 = low-value |
| **Severity** | Recommendation importance (critical, strong, moderate, optional) |
| **Vertical** | App category/industry (e.g., "language_learning", "rewards", "finance") |
| **Vertical Bias** | Hard-coded assumptions favoring specific app categories |

---

### 9.2 Registry Type Definitions

#### **KpiDefinition**

```typescript
interface KpiDefinition {
  id: KpiId;                           // Unique ID
  familyId: KpiFamilyId;               // Parent family
  label: string;                       // Human-readable label
  description: string;                 // What this KPI measures
  weight: number;                      // Weight within family (0-1)
  metricType: 'score' | 'count' | 'ratio' | 'flag';
  minValue: number;                    // For normalization
  maxValue: number;                    // For normalization
  direction: 'higher_is_better' | 'lower_is_better' | 'target_range';
  targetValue?: number;                // For target_range
  targetTolerance?: number;            // For target_range
  admin?: KpiAdminMeta;                // Admin UI metadata
}
```

#### **KpiFamilyDefinition**

```typescript
interface KpiFamilyDefinition {
  id: KpiFamilyId;
  label: string;
  description: string;
  weight: number;                      // Weight for overall score (0-1)
  admin?: FamilyAdminMeta;             // Admin UI metadata
}
```

#### **FormulaDefinition**

```typescript
interface FormulaDefinition {
  id: string;
  label: string;
  description: string;
  type: 'weighted_sum' | 'ratio' | 'composite' | 'threshold_based' | 'custom';
  components?: FormulaComponent[];     // For weighted_sum, composite
  thresholds?: FormulaThreshold[];     // For threshold_based
  computationNotes?: string;           // For custom
  admin?: FormulaAdminMeta;            // Admin UI metadata
}
```

---

### 9.3 Example KPI Entry

**From**: `src/engine/metadata/kpi/kpi.registry.json`

```json
{
  "id": "title_char_usage",
  "familyId": "clarity_structure",
  "label": "Title Character Usage",
  "description": "Percentage of 30-char title limit used (iOS)",
  "weight": 0.25,
  "metricType": "ratio",
  "minValue": 0,
  "maxValue": 1,
  "direction": "higher_is_better",
  "admin": {
    "editable": true,
    "inputType": "slider",
    "min": 0,
    "max": 1,
    "step": 0.05,
    "group": "Title",
    "displayOrder": 1,
    "helpText": "Maximize title character utilization for ranking power",
    "notes": "Apple App Store: 30 chars max. Google Play: 50 chars max.",
    "tags": ["title", "character-limits", "optimization"]
  }
}
```

---

### 9.4 Example Formula Entry

**From**: `src/engine/metadata/metadataFormulaRegistry.ts`

```typescript
{
  id: 'subtitle_element_score',
  label: 'Subtitle Element Score',
  description: 'Weighted sum of subtitle rules: Character Usage (20%), Incremental Value (40%), Combo Coverage (25%), Complementarity (15%)',
  type: 'weighted_sum',
  components: [
    { id: 'subtitle_character_usage', weight: 0.20 },
    { id: 'subtitle_incremental_value', weight: 0.40 },
    { id: 'subtitle_combo_coverage', weight: 0.25 },
    { id: 'subtitle_complementarity', weight: 0.15 },
  ],
  admin: {
    editable: true,
    inputType: 'slider',
    min: 0,
    max: 1,
    step: 0.05,
    group: 'Subtitle',
    displayOrder: 1,
    helpText: 'Subtitle is critical for adding NEW high-value keywords not in title',
    notes: 'Incremental Value weighted highest (40%) as it drives organic reach',
  },
}
```

---

### 9.5 Sample Override Examples

#### **Reward App Token Relevance Override**

```typescript
// verticals/rewards/tokenRelevance.ts (FUTURE)

export function getTokenRelevance(token: string): 0 | 1 | 2 | 3 {
  const tokenLower = token.toLowerCase();

  // Level 3: Earning verbs and core reward nouns
  const earningVerbs = /^(earn|redeem|play|win|collect|save)$/i;
  const rewardNouns = /^(rewards|cashback|points|money|cash|prizes)$/i;
  if (earningVerbs.test(tokenLower) || rewardNouns.test(tokenLower)) {
    return 3;
  }

  // Level 2: Redemption keywords
  const redemptionKeywords = /^(gift|cards|paypal|amazon|giftcards|vouchers|coupons)$/i;
  if (redemptionKeywords.test(tokenLower)) {
    return 2;
  }

  // Override: "free" is value proposition, not filler
  if (tokenLower === 'free') {
    return 2;
  }

  // Fallback to base rules
  return baseGetTokenRelevance(token);
}
```

---

#### **Finance App Intent Patterns Override**

```typescript
// verticals/finance/intentPatterns.ts (FUTURE)

export const intentPatterns = {
  // Inherit base intent patterns
  navigational: /\b(app|official|robinhood|coinbase|download)\b/i,
  informational: /\b(how|what|why|guide|tips|learn|research)\b/i,
  commercial: /\b(best|top|compare|vs|review)\b/i,
  transactional: /\b(free|trial|open account|sign up|join|start)\b/i,

  // Finance-specific intent patterns
  investment_research: /\b(stocks|shares|etf|portfolio|asset|allocation|diversify|research)\b/i,
  trading: /\b(trade|trading|buy|sell|order|market|limit|stop loss)\b/i,
  crypto: /\b(crypto|cryptocurrency|bitcoin|ethereum|btc|eth|blockchain|wallet)\b/i,
  security: /\b(safe|secure|insured|fdic|protected|encrypted|verified)\b/i,
};
```

---

#### **Dating App Recommendation Template Override**

```typescript
// verticals/dating/recommendationTemplates.ts (FUTURE)

export const recommendationTemplates = {
  ranking_keyword_critical: '[RANKING][critical] Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. \'{{category_example_1}}\', \'{{category_example_2}}\') typically increases ranking breadth.',

  // Category-specific examples
  category_examples: {
    category_example_1: 'meet singles',
    category_example_2: 'dating app',
    category_example_3: 'find matches',
    category_example_4: 'local dating',
  },
};
```

**Rendered Output** (for dating app):
- "Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. 'meet singles', 'dating app') typically increases ranking breadth."

---

## End of Document

**Total Sections**: 9
**Total Pages**: ~50 (estimated)
**Total Words**: ~18,000

**Status**: ✅ COMPLETE — Foundation documentation for multi-vertical ASO Bible architecture

**Next Steps**:
1. Review this document with product/engineering team
2. Identify priority verticals for Phase 7 implementation (e.g., Rewards, Finance, Dating)
3. Design vertical rule schema and validation logic
4. Prototype vertical loader with 2-3 test verticals
5. Build admin UI for rule editing
6. Implement A/B testing framework
7. Migrate existing apps to appropriate vertical rule sets

---

**Document Prepared By**: ASO Bible Engineering Team
**Last Updated**: 2025-11-23
**Document Version**: 1.0
