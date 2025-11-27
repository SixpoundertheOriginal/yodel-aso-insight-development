# 📦 ASO Audit v2.0 — Data Assets & Constraints

**Purpose:** Catalog what data we need vs what we have
**Status:** Blocking Analysis
**Created:** 2025-01-27

---

## 🎯 OVERVIEW

This document tracks the **data reality** of the v2.0 implementation:
- What data assets are required for each feature
- What we currently have
- What's missing and blocking development
- Workarounds for Foundation scope (v2.0)
- Requirements for Enhancement scope (v2.1+)

---

## ✅ WHAT WE HAVE (Current Assets)

### **1. Intent Patterns (Existing 4 Types)**

**Location:** `src/engine/asoBible/commonPatterns/intentPatterns.ts`

**Coverage:**
- 7 verticals × 4 intent types
- 43-47 patterns per vertical
- Informational, Commercial, Transactional, Navigational

**Quality:** ✅ **GOOD** - sufficient for existing intent engine

**Example (Language Learning):**
```typescript
{
  pattern: "learn",
  intentType: "informational",
  weight: 1.3,
  priority: 110,
  isRegex: false
}
```

---

### **2. Vertical Detection Logic**

**Location:** `src/engine/asoBible/verticalEngine.ts`

**Coverage:**
- 7 verticals (language learning, finance, productivity, dating, health/fitness, entertainment, gaming/rewards)
- Category mapping (App Store categories → vertical)
- Keyword fallback detection

**Quality:** ✅ **GOOD** - reliable vertical classification

---

### **3. RuleSet Override System**

**Location:** `src/engine/asoBible/rulesetLoader.ts`

**Coverage:**
- KPI weight overrides per vertical
- Token relevance scoring overrides
- Stopword overrides
- Formula component weight overrides

**Quality:** ✅ **EXCELLENT** - flexible override system ready for v2.0 extensions

---

### **4. KPI Registry (46 KPIs)**

**Location:** `src/engine/metadata/kpi/kpi.registry.json`

**Coverage:**
- 6 families (Clarity, Keyword Architecture, Hook Strength, Brand Balance, Psychology, Intent Quality)
- 46 KPIs with metadata (label, description, weight, direction)
- Computation functions in kpiEngine.ts

**Quality:** ✅ **EXCELLENT** - deterministic, registry-driven, extensible

---

### **5. Description Scoring Rules**

**Location:** `src/engine/metadata/metadataScoringRegistry.ts`

**Coverage:**
- Hook strength patterns (category/benefit/CTA keywords)
- Feature mention detection (bullet points, checkmarks)
- CTA verb patterns
- Readability scoring (Flesch-Kincaid)

**Quality:** ⚠️ **LIMITED** - exists but not integrated into ranking, conversion-only

**Gap:** Not used for ranking KPIs, no vertical-specific patterns

---

### **6. Tokenization Engine**

**Location:** `src/engine/metadata/tokenization.ts`

**Coverage:**
- Single-word tokenization
- Stopword filtering
- Separator normalization
- Deterministic output

**Quality:** ✅ **GOOD** - clean, reliable

**Gap:** No multi-word phrase support (relies on combo engine downstream)

---

### **7. Combo Generation Engine**

**Location:** `supabase/functions/_shared/metadata-audit-engine.ts` (Line 926+)

**Coverage:**
- 2-gram and 3-gram extraction
- Brand classification
- Intent classification integration
- Discovery potential scoring

**Quality:** ✅ **EXCELLENT** - handles multi-word phrases well

---

## ❌ WHAT WE'RE MISSING (Blocking Data Assets)

### **1. Vertical-Specific Pattern Libraries (50-80 patterns per vertical)**

**Required for:** v2.1 - Enhanced precision in feature/benefit/trust detection

**What's Missing:**
```typescript
// Example: Finance Vertical Feature Patterns (need 50-80 like these)
FEATURE_PATTERNS_FINANCE = [
  // Core functionality
  { pattern: /\b(budget|spending|expense tracking)\b/i, category: 'core', criticality: 'critical' },
  { pattern: /\b(investment|portfolio|stocks)\b/i, category: 'core', criticality: 'critical' },
  { pattern: /\b(bill pay|auto pay|recurring payments)\b/i, category: 'core', criticality: 'high' },

  // Security (critical for finance)
  { pattern: /\b(encryption|secure|protected)\b/i, category: 'trust', criticality: 'critical' },
  { pattern: /\b(biometric|fingerprint|face id)\b/i, category: 'security', criticality: 'critical' },
  { pattern: /\b(256-bit|bank-level|military-grade)\b/i, category: 'security', criticality: 'high' },

  // Compliance
  { pattern: /\b(FDIC|insured|certified)\b/i, category: 'trust', criticality: 'critical' },

  // ... need 43+ more patterns
];

// Example: Language Learning Vertical Feature Patterns
FEATURE_PATTERNS_LANGUAGE = [
  // Core functionality
  { pattern: /\b(offline|without internet)\b/i, category: 'functionality', criticality: 'high' },
  { pattern: /\b(voice recognition|speech|pronunciation)\b/i, category: 'core', criticality: 'critical' },
  { pattern: /\b(conversation practice|dialogue|role play)\b/i, category: 'core', criticality: 'high' },

  // Learning methods
  { pattern: /\b(spaced repetition|SRS|flashcards)\b/i, category: 'methodology', criticality: 'high' },
  { pattern: /\b(native speakers|real conversations)\b/i, category: 'quality', criticality: 'high' },

  // Progress tracking
  { pattern: /\b(progress tracking|learning path|level up)\b/i, category: 'engagement', criticality: 'moderate' },

  // ... need 43+ more patterns
];
```

**Impact if Missing:**
- v2.0 launches with 20 generic patterns per signal type
- Lower precision in capability extraction
- More false positives/negatives
- Generic recommendations instead of vertical-specific

**Workaround for v2.0:**
- Start with 20 broad, high-confidence patterns per signal type
- Focus on patterns that work across verticals
- Accept lower precision, iterate in v2.1

---

### **2. Trust Signal Taxonomy (Critical vs Nice-to-Have per Vertical)**

**Required for:** v2.1 - Gap severity calculation

**What's Missing:**
```typescript
// Need this structure for each vertical
TRUST_SIGNALS_BY_VERTICAL = {
  finance: {
    critical: [
      'bank-level encryption',
      'FDIC insured',
      '256-bit security',
      'SOC 2 certified',
      'biometric authentication'
    ],
    high: [
      'secure',
      'protected',
      'verified',
      'trusted by millions'
    ],
    moderate: [
      'award-winning',
      'top-rated',
      'popular'
    ]
  },

  health: {
    critical: [
      'HIPAA compliant',
      'medical-grade',
      'certified',
      'privacy protected',
      'doctor approved'
    ],
    high: [
      'secure',
      'confidential',
      'verified',
      'FDA cleared'
    ],
    moderate: [
      'trusted',
      'popular',
      'award-winning'
    ]
  },

  // ... need for all 7 verticals
};
```

**Impact if Missing:**
- All trust gaps treated with same severity
- Can't distinguish critical vs nice-to-have
- Generic recommendations ("add trust signals") instead of specific

**Workaround for v2.0:**
- Hardcode 10-15 obvious critical signals per vertical
- Use category-based heuristics (e.g., "security" = critical for finance)
- Accept lower precision, iterate in v2.1

---

### **3. Risky Transactional Keywords (Apple Penalty List)**

**Required for:** v2.0 Phase 1 (Intent V2)

**What's Missing:**
```typescript
// Need comprehensive list of keywords that trigger Apple penalties
RISKY_TRANSACTIONAL_KEYWORDS = [
  // Obvious ones (we can start with these)
  'free', 'download', 'install', 'now', 'today',

  // Need ASO team to provide 20-30 more:
  // - Misleading claims ('best', 'top', '#1'?)
  // - Urgency manipulation ('limited time', 'exclusive'?)
  // - Direct download prompts ('get it now', 'click here'?)
  // - Apple-specific violations (TBD)
];

// Also need the inverse: safe transactional keywords
SAFE_TRANSACTIONAL_KEYWORDS = [
  'try', 'start', 'get', 'use', 'begin', 'access', 'explore', 'discover',

  // Need more examples of what's allowed:
  // - Soft CTAs ('learn more', 'see how'?)
  // - Informational transactional ('sign up', 'create account'?)
];
```

**Impact if Missing:**
- Transactional safety detection incomplete
- May flag safe keywords as risky (false positives)
- May miss actual risky keywords (false negatives)

**Workaround for v2.0:**
- Start with 10-15 obvious risky keywords (free, download, install, now, today)
- Start with 10-15 obvious safe keywords (try, start, get, use, begin)
- Accept that detection won't catch all edge cases
- Iterate based on user feedback + Apple policy changes

**Status:** 🔴 **BLOCKING** - Need ASO team input on full list

---

### **4. ASO Index Benchmark Data**

**Required for:** v2.2 - Benchmark integration

**What's Missing:**
```typescript
// Need this data extracted from ASO Index PDF for each vertical
VERTICAL_BENCHMARKS = {
  language_learning: {
    intent_expectations: {
      informational: { min: 20, max: 40, median: 30, p75: 35, p90: 38 },
      commercial: { min: 10, max: 25, median: 15, p75: 20, p90: 23 },
      transactional: { min: 15, max: 35, median: 25, p75: 30, p90: 33 },
      brand: { min: 5, max: 30, median: 15, p75: 20, p90: 25 },
      category: { min: 5, max: 15, median: 10, p75: 12, p90: 14 },
      feature: { min: 10, max: 25, median: 15, p75: 20, p90: 23 }
    },

    brand_share: {
      title: { min: 0, max: 50, median: 20, p75: 30, p90: 40 },
      subtitle: { min: 0, max: 40, median: 15, p75: 25, p90: 35 }
    },

    combo_expectations: {
      branded_combos: { min: 1, max: 5, median: 2, p75: 3, p90: 4 },
      generic_combos: { min: 3, max: 10, median: 6, p75: 8, p90: 9 },
      category_combos: { min: 1, max: 4, median: 2, p75: 3, p90: 4 }
    },

    trust_signals: {
      critical: ['verified', 'certified', 'award-winning'],
      expected_count: { min: 1, max: 5, median: 2 }
    }
  },

  // ... need for all 7 verticals
};
```

**Data Source:** ASO Index PDF (needs manual extraction or parsing)

**Impact if Missing:**
- No benchmark comparison in v2.0/v2.1
- Can't compute intent deviation scoring
- Can't compute discoverability opportunity index
- Recommendations lack "vs category median" context

**Workaround for v2.0:**
- Skip benchmark integration entirely in Foundation scope
- Use generic thresholds (e.g., brand > 50% = high dependency)
- Frame recommendations as "best practices" not "vs benchmarks"

**Status:** 🔴 **BLOCKING v2.2** - Need ASO Index data extraction

---

### **5. CVR Impact Multipliers (Which Intents Drive Conversion per Vertical)**

**Required for:** v2.3 - Advanced intelligence

**What's Missing:**
```typescript
// Need historical A/B test data showing CVR impact by intent type
CVR_MULTIPLIERS_BY_VERTICAL = {
  language_learning: {
    informational: 0.8,      // Slightly below neutral (education/browsing mode)
    commercial: 1.2,          // Above neutral (comparison/decision mode)
    transactional: 1.5,       // Strong conversion intent
    brand: 0.9,              // Slightly below (loyalty but not urgency)
    category: 1.0,           // Neutral baseline
    feature: 1.1             // Slight lift (feature-seeking users)
  },

  finance: {
    informational: 0.7,      // Much lower (research mode, not ready)
    commercial: 1.3,          // Higher (ready to compare)
    transactional: 1.6,       // Very high (urgency)
    brand: 1.1,              // Trust-driven
    category: 1.0,
    feature: 1.2             // Feature-driven finance apps
  },

  // ... need for all 7 verticals
};
```

**Data Source:** Historical A/B test results, Apple Search Ads data, ASO team knowledge

**Impact if Missing:**
- Can't prioritize intent types by conversion value
- Recommendations focus on impressions, not conversion-weighted impressions
- Can't compute "expected revenue impact" estimates

**Workaround for v2.0/v2.1/v2.2:**
- Skip CVR multipliers entirely until v2.3
- Prioritize intents by generic assumptions (transactional > commercial > informational)
- Frame recommendations as "discoverability" not "revenue impact"

**Status:** 🔴 **BLOCKING v2.3** - Need historical A/B test analysis

---

### **6. Competitive Intent Keyword List**

**Required for:** v2.3 - Competitive intent detection

**What's Missing:**
```typescript
// Need comprehensive list of competitive keywords per vertical
COMPETITIVE_INTENT_PATTERNS = {
  generic: [
    /\bvs\b/i,
    /\balternative to\b/i,
    /\bbetter than\b/i,
    /\bcompare\b/i,
    /\binstead of\b/i
  ],

  language_learning: [
    // Competitor names (TBD based on market research)
    'duolingo alternative',
    'better than rosetta stone',
    'vs babbel',

    // Generic competitive positioning
    'best language learning app',
    'top language app',
    'leading language platform'
  ],

  // ... need for all 7 verticals
};
```

**Impact if Missing:**
- No competitive intent detection
- Can't warn about risky competitor comparisons
- Can't suggest safe competitive positioning

**Workaround for v2.0/v2.1/v2.2:**
- Skip competitive intent entirely until v2.3
- Focus on 6 core intent types (not 7)

**Status:** 🔴 **BLOCKING v2.3** - Need competitive analysis per vertical

---

### **7. Multi-word Phrase Dictionaries**

**Required for:** v2.3 - Enhanced pattern matching

**What's Missing:**
```typescript
// Need dictionary of known multi-word phrases per vertical
MULTI_WORD_PHRASES = {
  language_learning: [
    'language learning',
    'learn spanish',
    'speak fluently',
    'voice recognition',
    'offline lessons',
    'conversation practice',
    // ... need 100+ phrases
  ],

  finance: [
    'expense tracking',
    'budget planning',
    'investment portfolio',
    'bill pay',
    'bank account',
    'credit score',
    // ... need 100+ phrases
  ],

  // ... need for all 7 verticals
};
```

**Impact if Missing:**
- Tokenization still splits phrases into single words
- Pattern matching less precise
- Combo engine can compensate partially (2-grams, 3-grams)

**Workaround for v2.0/v2.1/v2.2:**
- Rely on existing combo engine (generateEnhancedCombos)
- Accept that "voice recognition" gets tokenized as ["voice", "recognition"]
- Feature/benefit patterns can still match via regex (e.g., `/voice recognition/`)

**Status:** 🟡 **NICE TO HAVE** - Not blocking, but improves precision

---

## 📋 DATA ASSET PRIORITY MATRIX

| Asset | Required For | Priority | Have? | Workaround? | Blocking? |
|-------|-------------|----------|-------|-------------|-----------|
| **Intent patterns (4 types)** | Current system | ✅ Complete | ✅ Yes | N/A | No |
| **Vertical detection** | Current system | ✅ Complete | ✅ Yes | N/A | No |
| **RuleSet overrides** | Current system | ✅ Complete | ✅ Yes | N/A | No |
| **KPI registry (46 KPIs)** | Current system | ✅ Complete | ✅ Yes | N/A | No |
| **Risky transactional keywords** | v2.0 Phase 1 | 🔴 Critical | ❌ Partial (10) | ✅ Start with 10-15 obvious | 🟡 Soft block |
| **Generic feature/benefit patterns** | v2.0 Phase 2 | 🟢 Medium | ✅ Can create 20 | ✅ Generic = OK for v2.0 | No |
| **Vertical pattern libraries (50-80)** | v2.1 | 🔴 Critical | ❌ No | ✅ Defer to v2.1 | Yes (for v2.1) |
| **Trust signal taxonomy** | v2.1 | 🟠 High | ❌ Partial | ✅ Hardcode 10-15 per vertical | 🟡 Soft block |
| **ASO Index benchmarks** | v2.2 | 🔴 Critical | ❌ No | ✅ Defer to v2.2 | Yes (for v2.2) |
| **CVR multipliers** | v2.3 | 🟠 High | ❌ No | ✅ Defer to v2.3 | Yes (for v2.3) |
| **Competitive keywords** | v2.3 | 🟢 Medium | ❌ No | ✅ Defer to v2.3 | Yes (for v2.3) |
| **Multi-word phrases** | v2.3 | 🟢 Low | ❌ No | ✅ Combo engine compensates | No |

---

## 🚀 FOUNDATION SCOPE (v2.0) - DATA REQUIREMENTS

### **What We Can Build Without External Data**

1. **Intent V2 (7 types)**
   - ✅ Can expand to 7 types with 10-15 generic patterns each
   - ✅ Can implement safe vs risky logic with 10-15 obvious keywords
   - ⚠️ Will have lower precision than v2.1 (with full pattern libraries)

2. **Description Intelligence**
   - ✅ Can create 20 generic feature patterns (work across verticals)
   - ✅ Can create 20 generic benefit patterns
   - ✅ Can create 10 generic trust patterns
   - ⚠️ Will have higher false positive/negative rate than v2.1

3. **Gap Analysis**
   - ✅ Can implement with generic capability map from Phase 2
   - ✅ Can use category-based heuristics for gap severity
   - ⚠️ Will improve significantly in v2.1 with vertical taxonomies

4. **Executive Recommendations**
   - ✅ Can generate based on KPI thresholds + gap analysis
   - ✅ Can provide strategic direction without benchmarks
   - ⚠️ Will say "best practice" instead of "vs category median"

5. **8 New KPIs**
   - ✅ All KPIs computable from available primitives
   - ✅ No external data dependencies

---

## 🛑 ENHANCEMENT SCOPE (v2.1+) - BLOCKING DATA

### **What We CANNOT Build Without External Data**

1. **v2.1: Vertical Pattern Libraries**
   - 🔴 **BLOCKED BY:** Need 50-80 patterns per vertical per signal type
   - 🔴 **BLOCKED BY:** Trust signal criticality taxonomy
   - **Source:** ASO team + vertical experts

2. **v2.2: Benchmark Integration**
   - 🔴 **BLOCKED BY:** ASO Index data extraction (intent distributions, brand share, combo expectations)
   - **Source:** ASO Index PDF analysis

3. **v2.3: Advanced Intelligence**
   - 🔴 **BLOCKED BY:** CVR multipliers (need A/B test data)
   - 🔴 **BLOCKED BY:** Competitive keyword lists (need market research)
   - **Source:** Historical data analysis + ASO team

---

## 📊 RECOMMENDED APPROACH

### **Phase 0: Data Gathering Sprint (Before v2.0 Development)**

**Week 0: Collect Minimum Viable Data Assets**

1. **Risky Transactional Keywords**
   - ASO team provides 20-30 known risky keywords
   - Include Apple-specific policy violations
   - Include misleading claim patterns

2. **Generic Capability Patterns**
   - Engineer creates 20 feature patterns (cross-vertical)
   - Engineer creates 20 benefit patterns
   - Engineer creates 10 trust patterns
   - ASO team reviews for accuracy

3. **Vertical Trust Signal Mapping**
   - ASO team provides 10-15 critical trust signals per vertical
   - Hardcode into gap severity logic

**Deliverable:** Enough data to launch v2.0 Foundation with acceptable precision

---

### **Phase 1-4: Build v2.0 Foundation (4 weeks)**

**Build with available data:**
- Generic patterns (20 per type)
- Hardcoded trust signals (10-15 per vertical)
- Obvious risky keywords (10-15)
- No benchmarks

**Accept:**
- Lower precision than v2.1+ will have
- Generic recommendations without benchmark context
- False positives/negatives in capability detection

**Frame as:**
- "v2.0 Foundation Release"
- "Provides strategic direction and gap detection"
- "Benchmark comparison coming in v2.2"

---

### **Phase 5-6: Data Asset Expansion (Post-v2.0 Launch)**

**During v2.0 user testing period, ASO team prepares:**

1. **For v2.1 (Weeks 5-6):**
   - Vertical pattern libraries (50-80 per vertical)
   - Complete trust signal taxonomy
   - Vertical-specific gap severity rules

2. **For v2.2 (Weeks 7-8):**
   - ASO Index data extraction (automate or manual)
   - Benchmark expectations per vertical
   - Intent distribution norms

3. **For v2.3 (Weeks 9-10):**
   - CVR multipliers from A/B test analysis
   - Competitive keyword lists per vertical
   - Multi-word phrase dictionaries

---

## ✅ ACTION ITEMS

### **Before Starting v2.0 Development:**

1. 🔴 **ASO Team: Provide risky transactional keyword list** (20-30 keywords)
2. 🔴 **ASO Team: Provide critical trust signals per vertical** (10-15 each)
3. 🟡 **Engineer: Create generic capability patterns** (20 feature, 20 benefit, 10 trust)
4. 🟡 **ASO Team: Review generic patterns for accuracy**

### **During v2.0 Development (Phases 1-4):**

5. 🟢 **Engineer: Implement with generic patterns + hardcoded mappings**
6. 🟢 **Engineer: Add feature flags for progressive enhancement**
7. 🟢 **Engineer: Design extensible data structures for v2.1+ data**

### **Post v2.0 Launch (Before v2.1):**

8. 🔴 **ASO Team: Create vertical pattern libraries** (50-80 per vertical × 3 signal types = ~1,200 patterns)
9. 🔴 **ASO Team: Extract ASO Index benchmark data** (manual or automated)
10. 🟡 **Data Team: Analyze historical A/B tests for CVR multipliers**

---

## 🎯 DECISION FRAMEWORK

**Question: "Can we build feature X without data asset Y?"**

| Feature | Missing Data | Can Build? | Quality Trade-off |
|---------|-------------|------------|-------------------|
| Intent V2 (7 types) | Full risky keyword list | ✅ Yes | Lower precision on edge cases |
| Description Intelligence | Vertical pattern libraries | ✅ Yes | More false positives |
| Gap Analysis | Trust taxonomy | ✅ Yes | Generic severity scoring |
| Executive Recommendations | Benchmark data | ✅ Yes | "Best practice" not "vs median" |
| Benchmark Comparison | ASO Index data | ❌ No | Cannot provide without data |
| CVR-Weighted Recommendations | CVR multipliers | ❌ No | Cannot provide without data |
| Competitive Intent Detection | Competitive keywords | ❌ No | Cannot provide without data |

**Conclusion:**
- ✅ v2.0 Foundation can launch with generic/minimal data
- ❌ v2.1+ enhancements require complete data assets

This constraint-aware approach ensures v2.0 delivers value while acknowledging data limitations.
