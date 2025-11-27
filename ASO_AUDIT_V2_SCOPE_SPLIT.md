# 🎯 ASO Audit v2.0 — Foundation vs Enhancement Scope Split

**Status:** Ready for Review
**Created:** 2025-01-27
**Based on:** Integration alignment audit + data reality constraints

---

## 📊 SCOPE PHILOSOPHY

This split is designed to:
1. **Minimize architectural drift** by building foundation first
2. **Deliver value incrementally** with working v2.0 before adding stretch features
3. **Avoid partial data wiring** that creates inconsistent UX
4. **Respect data availability** by not coding against missing benchmark/taxonomy assets

---

## ✅ FOUNDATION SCOPE (v2.0 Launch)

**Goal:** Deliver a fully functioning v2.0 audit that provides true ASO intelligence, even without external benchmark data.

**Timeline:** 4 weeks (Phases 1-4)

### **Phase 1: Intent System V2 (Week 1)**

#### **Expand Intent Types** (4 → 7)
```typescript
export type IntentType =
  | 'informational'      // EXISTING
  | 'commercial'         // EXISTING
  | 'transactional'      // EXISTING → split into safe/risky
  | 'navigational'       // EXISTING → rename to 'brand'
  | 'category'           // NEW: "language learning app"
  | 'feature';           // NEW: "offline mode", "voice chat"
```

**Transactional Safety Logic:**
- Split existing 'transactional' into two detection modes:
  - **Safe triggers**: try, start, get, use, begin, access
  - **Risky triggers**: free, download, install, now
- Add `transactionalSafety` field to combo classification:
  ```typescript
  {
    combo: "try learning french",
    dominantIntent: "transactional",
    transactionalSafety: "safe",  // NEW
    riskFlags: []
  }
  ```

**New KPIs:**
- `safe_transactional_score` (percentage of safe transactional tokens)
- `risky_transactional_warning` (boolean flag if risky > 15%)
- `category_intent_coverage_score` (percentage of category tokens)
- `feature_intent_coverage_score` (percentage of feature tokens)

**Deliverable:**
- Updated intentEngine.ts with 7 intent types
- New pattern arrays for category/feature intents (10-15 patterns each, vertical-agnostic)
- 4 new KPIs in registry + computation
- Migration of existing 'navigational' → 'brand' (backward compatible)

**Data Requirements:**
- ✅ No external data needed (patterns can start generic)
- ✅ Can enhance with vertical patterns in v2.1

---

### **Phase 2: Description Intelligence Layer (Week 2)**

#### **App Capability Extraction**

**Features:**
- Pattern-based extraction of app capabilities from description
- 3 signal types: features, benefits, trust
- Vertical-agnostic starter patterns (20 per category)

**Implementation:**
```typescript
interface AppCapabilityMap {
  features: {
    detected: string[];        // e.g., ["offline mode", "real-time sync"]
    count: number;
    categories: string[];      // e.g., ["functionality", "performance"]
  };
  benefits: {
    detected: string[];        // e.g., ["save time", "learn faster"]
    count: number;
    categories: string[];      // e.g., ["efficiency", "educational"]
  };
  trust: {
    signals: string[];         // e.g., ["verified", "secure encryption"]
    count: number;
    categories: string[];      // e.g., ["security", "certification"]
  };
}
```

**Pattern Library Structure:**
```typescript
// src/engine/metadata/utils/descriptionIntelligence.ts

const FEATURE_PATTERNS = [
  // Functionality
  { pattern: /\b(offline|without internet)\b/i, category: 'functionality' },
  { pattern: /\b(real-time|live|instant)\b/i, category: 'performance' },
  { pattern: /\b(voice|speech|audio)\b/i, category: 'interface' },

  // Data & Sync
  { pattern: /\b(sync|cloud|backup)\b/i, category: 'data' },
  { pattern: /\b(export|import|share)\b/i, category: 'integration' },

  // Personalization
  { pattern: /\b(custom|personalized|tailored)\b/i, category: 'personalization' },

  // ... 15 more generic patterns
];

const BENEFIT_PATTERNS = [
  // Efficiency
  { pattern: /\b(save time|faster|quick)\b/i, category: 'efficiency' },
  { pattern: /\b(easy|simple|effortless)\b/i, category: 'usability' },

  // Achievement
  { pattern: /\b(improve|boost|enhance)\b/i, category: 'achievement' },
  { pattern: /\b(master|fluent|proficient)\b/i, category: 'skill_development' },

  // Value
  { pattern: /\b(free|affordable|budget)\b/i, category: 'cost' },

  // ... 15 more generic patterns
];

const TRUST_PATTERNS = [
  // Security
  { pattern: /\b(secure|encrypted|protected)\b/i, category: 'security' },
  { pattern: /\b(privacy|private|confidential)\b/i, category: 'privacy' },

  // Credentials
  { pattern: /\b(verified|certified|approved)\b/i, category: 'certification' },
  { pattern: /\b(award|winner|rated)\b/i, category: 'recognition' },

  // Social proof
  { pattern: /\b(\d+[MKmk]?\+ (users|downloads))\b/i, category: 'social_proof' },

  // ... 10 more generic patterns
];
```

**Integration into Audit Flow:**
1. Extract capabilities from description (new step before KPI computation)
2. Pass to KPI engine as new primitive: `capabilityMap`
3. Store in audit result for gap analysis in Phase 3

**Deliverable:**
- New module: `descriptionIntelligence.ts`
- Pattern libraries (20 features, 20 benefits, 10 trust signals)
- Integration into metadataAuditEngine.ts
- New field in UnifiedMetadataAuditResult: `capabilityMap`

**Data Requirements:**
- ✅ Generic patterns sufficient for v2.0 launch
- ✅ Vertical-specific patterns can be added in v2.1 (50-80 per vertical)

---

### **Phase 3: Gap Analysis Engine (Week 3)**

#### **Metadata vs Description Alignment**

**Core Logic:**
For each capability detected in description, check if metadata contains related signals:

```typescript
interface GapAnalysisResult {
  feature_gaps: Array<{
    capability: string;           // "offline mode"
    category: string;             // "functionality"
    present_in_title: boolean;
    present_in_subtitle: boolean;
    present_in_keywords: boolean; // (if available)
    gap_severity: 'critical' | 'high' | 'moderate';
  }>;

  benefit_gaps: Array<{
    benefit: string;              // "save time"
    category: string;             // "efficiency"
    present_in_title: boolean;
    present_in_subtitle: boolean;
    gap_severity: 'critical' | 'high' | 'moderate';
  }>;

  trust_gaps: Array<{
    signal: string;               // "secure encryption"
    category: string;             // "security"
    present_in_title: boolean;
    present_in_subtitle: boolean;
    gap_severity: 'critical' | 'high' | 'moderate';
  }>;

  summary: {
    total_feature_gaps: number;
    total_benefit_gaps: number;
    total_trust_gaps: number;
    critical_gaps: number;
    top_3_missed_opportunities: string[];
  };
}
```

**Gap Severity Logic:**
```typescript
function calculateGapSeverity(
  capability: string,
  category: string,
  verticalContext: VerticalContext
): 'critical' | 'high' | 'moderate' {
  // Critical: Mentioned in description but ZERO metadata presence
  // AND category is vertical-critical (e.g., "security" for Finance)

  // High: Mentioned in description but ZERO metadata presence
  // AND category is generally important (e.g., "performance")

  // Moderate: Mentioned in description, partially present in metadata
  // OR category is nice-to-have
}
```

**New KPIs:**
- `feature_gap_score` (0-100, higher = fewer gaps)
- `benefit_gap_score` (0-100, higher = fewer gaps)
- `trust_gap_score` (0-100, higher = fewer gaps)
- `capability_alignment_score` (weighted average of above 3)

**Deliverable:**
- New module: `gapAnalysisEngine.ts`
- 4 new KPIs in registry
- Gap analysis integrated into audit result
- New panel in UI: "Capability Gap Analysis"

**Data Requirements:**
- ✅ Uses capability map from Phase 2 + existing tokenization
- ✅ No external benchmark data needed

---

### **Phase 4: Executive Recommendation Framework (Week 4)**

#### **Structured Recommendation Output**

**Replace flat string arrays with structured format:**

```typescript
interface ExecutiveRecommendation {
  whats_wrong: {
    issues: Array<{
      issue: string;              // "High brand dependency detected"
      severity: 'critical' | 'high' | 'moderate';
      impact: string;             // "Limits discoverability by 60-70%"
      metric_context: string;     // "Brand tokens: 67% (expected: 15-25%)"
    }>;
  };

  opportunities: {
    opportunities: Array<{
      opportunity: string;        // "Add category-defining phrases"
      potential: string;          // "Could increase impressions 2-3x"
      priority: number;           // 1-10
      examples: string[];         // ["language learning app", "learn languages"]
    }>;
  };

  direction: {
    strategy: string;             // "Shift from branded to category + benefit keywords"
    rationale: string;            // "Current metadata over-relies on brand..."
    action_items: string[];       // ["Replace 'Pimsleur' with 'language app'", ...]
  };

  next_tests?: {
    tests: Array<{
      test_name: string;          // "Generic Intent Test"
      hypothesis: string;         // "Adding generic category keywords..."
      test_variant: string;       // "Subtitle: 'Language Learning App | Speak Fluently'"
      expected_improvement: string; // "+40-60% impressions"
      priority: number;           // 1-5
    }>;
  };
}
```

**Generation Logic:**
```typescript
// src/engine/metadata/utils/executiveRecommendationEngine.ts

export function generateExecutiveRecommendations(
  auditResult: UnifiedMetadataAuditResult,
  kpiVector: Record<string, number>,
  gapAnalysis: GapAnalysisResult,
  verticalContext: VerticalContext
): ExecutiveRecommendation {

  // 1. Identify critical issues from KPIs
  const issues = identifyCriticalIssues(kpiVector, verticalContext);

  // 2. Extract opportunities from gap analysis
  const opportunities = extractOpportunities(gapAnalysis, verticalContext);

  // 3. Determine strategic direction based on patterns
  const direction = determineStrategicDirection(
    issues,
    opportunities,
    auditResult.comboCoverage,
    verticalContext
  );

  // 4. Generate test variants (optional for v2.0)
  const nextTests = generateTestVariants(direction, auditResult);

  return { whats_wrong: issues, opportunities, direction, next_tests: nextTests };
}
```

**Deliverable:**
- New module: `executiveRecommendationEngine.ts`
- Updated recommendationEngineV2 to call executive engine
- Updated UI to display structured recommendations
- New panel: "Executive Summary" (collapsible sections for each recommendation type)

**Data Requirements:**
- ✅ Uses KPI vector + gap analysis from Phases 1-3
- ✅ Generic vertical awareness sufficient (no benchmark data needed)

---

### **Phase 5: KPI Registry V2.0 (Integrated across Phases 1-4)**

**New KPIs Added:**

| Phase | KPI ID | Family | Description |
|-------|--------|--------|-------------|
| 1 | `safe_transactional_score` | Intent Quality | % of transactional tokens that are "safe" |
| 1 | `risky_transactional_warning` | Intent Quality | Boolean flag if risky > 15% |
| 1 | `category_intent_coverage_score` | Intent Quality | % of tokens classified as category intent |
| 1 | `feature_intent_coverage_score` | Intent Quality | % of tokens classified as feature intent |
| 3 | `feature_gap_score` | Capability Alignment | 0-100 score based on feature gaps |
| 3 | `benefit_gap_score` | Capability Alignment | 0-100 score based on benefit gaps |
| 3 | `trust_gap_score` | Capability Alignment | 0-100 score based on trust gaps |
| 3 | `capability_alignment_score` | Capability Alignment | Weighted average of above 3 |

**Total KPIs:** 46 (current) + 8 (new) = **54 KPIs**

**New KPI Family:**
```json
{
  "id": "capability_alignment",
  "label": "Capability Alignment",
  "description": "Measures how well metadata reflects app capabilities mentioned in description",
  "weight": 1.5
}
```

---

### **Phase 6: Backend Integration (Edge Function Update)**

**Update:** `supabase/functions/_shared/metadata-audit-engine.ts`

**Changes:**
1. Import new modules (descriptionIntelligence, gapAnalysisEngine, executiveRecommendationEngine)
2. Add capability extraction step before KPI computation
3. Add gap analysis step after KPI computation
4. Update recommendation generation to use executive engine
5. Update response schema to include new fields

**Deliverable:**
- Edge function supports full v2.0 audit
- Backward compatible (new fields optional)
- Feature flags for gradual rollout

---

## 🚀 FOUNDATION SCOPE SUMMARY

**What v2.0 Launch Includes:**
- ✅ 7 intent types (informational, commercial, transactional, brand, category, feature)
- ✅ Transactional safety detection (safe vs risky)
- ✅ Description intelligence (feature/benefit/trust extraction)
- ✅ Gap analysis (metadata vs description alignment)
- ✅ 8 new KPIs (54 total)
- ✅ Executive recommendation structure (4 sections: wrong/opportunities/direction/tests)
- ✅ Full backend/frontend integration

**What v2.0 Launch Does NOT Include:**
- ❌ ASO Index benchmark data integration
- ❌ Vertical-specific pattern libraries (50-80 patterns per vertical)
- ❌ Intent benchmark deviation scoring
- ❌ Discoverability Opportunity Index
- ❌ CVR impact multipliers
- ❌ Competitive intent detection
- ❌ Multi-word phrase tokenization
- ❌ "Next Tests" generator (placeholder only)
- ❌ New UI panels (Benchmark Comparison, Deviation Heatmap)

**Value Delivered:**
Even without benchmark data, v2.0 will provide:
1. **True gap detection** (what's missing from metadata that's in description)
2. **Intent diversification insights** (too much brand, not enough category/feature)
3. **Safety warnings** (risky transactional keywords detected)
4. **Actionable direction** (strategic guidance based on gaps + intent distribution)

---

## 🎨 ENHANCEMENT SCOPE (v2.1 - v2.3)

**Goal:** Add precision, benchmark comparison, and advanced intelligence features on top of working v2.0 foundation.

**Timeline:** 4-6 weeks (post-v2.0 launch)

### **v2.1: Vertical Pattern Libraries (Week 5-6)**

#### **What:**
- Expand generic patterns to 50-80 per vertical for each signal type
- Add vertical-specific trust signal criticality rules
- Add vertical-specific gap severity overrides

#### **Example:**
```typescript
// Finance Vertical
FEATURE_PATTERNS_FINANCE = [
  // Core functionality
  { pattern: /\b(budget|spending|expense tracking)\b/i, category: 'core', criticality: 'critical' },
  { pattern: /\b(investment|portfolio|stocks)\b/i, category: 'core', criticality: 'critical' },

  // Security (critical for finance)
  { pattern: /\b(encryption|secure|protected)\b/i, category: 'trust', criticality: 'critical' },
  { pattern: /\b(biometric|fingerprint|face id)\b/i, category: 'security', criticality: 'high' },

  // ... 46 more patterns
];

TRUST_SIGNALS_FINANCE_CRITICAL = [
  "bank-level encryption",
  "FDIC insured",
  "256-bit security",
  "SOC 2 certified"
];
```

#### **Data Required:**
- 🔴 **Blocked by:** Vertical taxonomy from ASO team (50-80 patterns × 7 verticals × 3 signal types = ~1,200 patterns)

---

### **v2.2: Benchmark Integration (Week 7-8)**

#### **What:**
- Integrate ASO Index benchmark data
- Add intent distribution expectations per vertical
- Add benchmark deviation scoring
- Add Discoverability Opportunity Index

#### **New KPIs:**
- `brand_dependency_risk` (brand % vs vertical median)
- `intent_vs_benchmark_gap_score` (intent distribution deviation from vertical norm)
- `discoverability_opportunity_index` (composite: brand dependency + category coverage + feature coverage)
- `category_alignment_score` (category intent vs vertical expectation)

#### **Data Structure:**
```typescript
interface VerticalBenchmark {
  verticalId: string;

  intent_expectations: {
    informational: { min: number; max: number; median: number; };
    commercial: { min: number; max: number; median: number; };
    transactional: { min: number; max: number; median: number; };
    brand: { min: number; max: number; median: number; };
    category: { min: number; max: number; median: number; };
    feature: { min: number; max: number; median: number; };
  };

  brand_share: {
    title: { min: number; max: number; median: number; };
    subtitle: { min: number; max: number; median: number; };
  };

  combo_expectations: {
    branded_combos: { min: number; max: number; median: number; };
    generic_combos: { min: number; max: number; median: number; };
    category_combos: { min: number; max: number; median: number; };
  };

  trust_signals: {
    critical: string[];  // Must-have for this vertical
    high: string[];      // Highly recommended
    moderate: string[];  // Nice to have
  };
}
```

#### **Data Required:**
- 🔴 **Blocked by:** ASO Index PDF data extraction
- 🔴 **Blocked by:** Trust signal taxonomy per vertical

---

### **v2.3: Advanced Intelligence (Week 9-10)**

#### **What:**
- CVR impact multipliers (which intents drive conversion per vertical)
- Competitive intent detection ("vs", "alternative to", "better than")
- Multi-word phrase tokenization (for improved pattern matching)
- Full "Next Tests" generator (create 3-5 test variants per recommendation)
- New UI panels:
  - Benchmark Comparison Panel
  - Intent Deviation Heatmap
  - Test Variant Generator

#### **Data Required:**
- 🔴 **Blocked by:** CVR multipliers from historical A/B test data
- 🔴 **Blocked by:** Competitive keyword list per vertical
- 🔴 **Blocked by:** Benchmark refresh cadence definition

---

## 🎯 SCOPE SPLIT RATIONALE

### **Why Foundation First?**

1. **Delivers Value Immediately**
   - Gap analysis works without benchmarks
   - Intent expansion improves accuracy today
   - Executive recommendations provide strategic clarity

2. **Avoids Partial Data Wiring**
   - All foundation features complete end-to-end
   - No "coming soon" placeholders in UI
   - No KPIs that return null/undefined

3. **Prevents Architecture Drift**
   - Establish data flow patterns before adding complexity
   - Test new primitives → KPI → recommendation flow with simpler logic
   - Validate UI components with real data

4. **Respects Data Constraints**
   - Don't code against missing benchmark data
   - Don't hardcode placeholder values that will confuse users
   - Don't promise insights we can't deliver yet

### **Why Defer Enhancements?**

1. **Data Availability**
   - ASO Index extraction not complete
   - Vertical taxonomies not provided
   - CVR multipliers require historical analysis

2. **Complexity Management**
   - Foundation = 8 new KPIs
   - Enhancements = 6+ additional KPIs
   - Better to stabilize foundation first

3. **User Feedback Loop**
   - Launch v2.0, gather feedback on gap analysis
   - Use real usage to inform benchmark thresholds
   - Iterate on executive recommendation format before adding test generator

---

## 📅 RECOMMENDED TIMELINE

```
Week 1: Phase 1 - Intent V2
Week 2: Phase 2 - Description Intelligence
Week 3: Phase 3 - Gap Analysis Engine
Week 4: Phase 4 - Executive Recommendations + Edge Function Integration
        → v2.0 LAUNCH 🚀

[User feedback period: 1-2 weeks]

Week 5-6: v2.1 - Vertical Pattern Libraries (if taxonomy received)
Week 7-8: v2.2 - Benchmark Integration (if ASO Index data extracted)
Week 9-10: v2.3 - Advanced Intelligence (if CVR multipliers available)
         → v2.3 FULL FEATURE RELEASE 🎉
```

---

## ✅ DECISION CHECKPOINT

**Before proceeding with Foundation implementation, confirm:**

1. ✅ Foundation scope (Phases 1-4) is approved for immediate development
2. ⚠️ Enhancement scope (v2.1-v2.3) is deferred until data assets available
3. ⚠️ Generic pattern libraries (20 per signal type) are acceptable for v2.0 launch
4. ⚠️ Executive recommendations can launch without "Next Tests" generator (placeholder only)
5. ⚠️ Benchmark comparison deferred to v2.2 (no UI panels for benchmark in v2.0)

**Missing data assets acknowledged:**
- 🔴 Vertical taxonomy (50-80 patterns per vertical) → Required for v2.1
- 🔴 ASO Index benchmark data → Required for v2.2
- 🔴 Trust signal criticality rules → Required for v2.1
- 🔴 CVR multipliers → Required for v2.3
- 🔴 Risky transactional keywords list → Can start with 10-15 obvious ones for v2.0

---

## 🚨 RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Generic patterns too broad | Lower precision in feature/benefit detection | Start conservative, iterate based on false positive rate |
| Gap analysis noise | Too many "gaps" flagged as critical | Use category relevance + vertical context to filter |
| Executive recommendations too generic | Users expect ASO Index-level insights | Frame as "strategic direction" not "benchmark comparison" |
| v2.0 launch without benchmarks | Users may expect competitive positioning | Clear messaging: "v2.0 = gap detection, v2.2 = benchmarks" |
| Pattern library data not provided | Can't deliver v2.1/v2.2 | Foundation still valuable; defer enhancements indefinitely if needed |

---

## 📝 NEXT STEPS

1. **Get approval** on Foundation vs Enhancement split
2. **Create feature branch**: `feature/aso-audit-v2-foundation`
3. **Set up feature flags** in environment config
4. **Create minimal test suite** (5 apps per vertical)
5. **Begin Phase 1 implementation** (Intent V2)
