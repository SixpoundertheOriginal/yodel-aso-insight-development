# 🔌 ASO Audit v2.0 — System Wiring Layer Map

**Purpose:** Shows HOW the new v2.0 engines communicate with each other
**Status:** Architecture Blueprint
**Created:** 2025-01-27

---

## 📊 HIGH-LEVEL DATA FLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT: App Metadata                          │
│  { title, subtitle, description, category, platform, appId, org }   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 1: Ruleset Loading                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ rulesetLoader.getActiveRuleSet()                               │ │
│  │  - Vertical detection (category + keyword matching)            │ │
│  │  - Load vertical-specific overrides                            │ │
│  │  - Load intent patterns                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  Output: activeRuleSet { verticalId, weights, patterns, config }    │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 2: Tokenization                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ tokenizeForASO(title)      → titleTokens: string[]            │ │
│  │ tokenizeForASO(subtitle)   → subtitleTokens: string[]         │ │
│  │ tokenizeForASO(description) → descriptionTokens: string[]     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  Output: { titleTokens, subtitleTokens, descriptionTokens }          │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌──────────────────┐      ┌──────────────────────────────────────────┐
│  STEP 3A:        │      │  STEP 3B: Description Intelligence       │
│  Intent          │      │  ┌────────────────────────────────────┐  │
│  Classification  │      │  │ extractCapabilities(description)   │  │
│  ┌────────────┐  │      │  │  - Pattern matching (features)     │  │
│  │ classifyIn-│  │      │  │  - Pattern matching (benefits)     │  │
│  │ tentForTo- │  │      │  │  - Pattern matching (trust)        │  │
│  │ kens()     │  │      │  └────────────────────────────────────┘  │
│  │  - Load    │  │      │  Output: capabilityMap                   │
│  │    patterns│  │      │  { features: [...], benefits: [...],    │
│  │  - Score   │  │      │    trust: [...] }                        │
│  │    tokens  │  │      └──────────────────────────────────────────┘
│  │  - 7 types │  │                      │
│  └────────────┘  │                      │
│  Output:         │                      │
│  intentCoverage  │                      │
│  { title: {...}, │                      │
│    subtitle:{..} │                      │
│  }               │                      │
└─────────┬────────┘                      │
          │                               │
          └───────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│              STEP 4: Keyword & Combo Analysis                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ analyzeKeywordCoverage() → keywordCoverage                     │ │
│  │  - Unique keyword count                                        │ │
│  │  - Incremental keywords per element                            │ │
│  │  - Noise detection                                             │ │
│  │                                                                 │ │
│  │ generateEnhancedCombos() → comboCoverage                       │ │
│  │  - 2-gram and 3-gram extraction                                │ │
│  │  - Brand classification (Step 5A)                              │ │
│  │  - Intent classification (Step 5B - from Step 3A)              │ │
│  │  - Discovery potential scoring                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  Output: { keywordCoverage, comboCoverage }                          │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│              STEP 5: Gap Analysis (NEW in v2.0)                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ analyzeCapabilityGaps(capabilityMap, tokens, combos)          │ │
│  │  - For each detected capability:                               │ │
│  │    • Check if present in title                                 │ │
│  │    • Check if present in subtitle                              │ │
│  │    • Calculate gap severity                                    │ │
│  │  - Identify top 3 missed opportunities                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  Output: gapAnalysis                                                 │
│  { feature_gaps: [...], benefit_gaps: [...], trust_gaps: [...],    │
│    summary: { critical_gaps, top_3_missed } }                       │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 6: KPI Computation                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ KpiEngine.evaluate()                                           │ │
│  │  Input:                                                         │ │
│  │   - titleTokens, subtitleTokens                                │ │
│  │   - intentCoverage (from Step 3A)                              │ │
│  │   - capabilityMap (from Step 3B)                               │ │
│  │   - gapAnalysis (from Step 5)                                  │ │
│  │   - keywordCoverage (from Step 4)                              │ │
│  │   - comboCoverage (from Step 4)                                │ │
│  │   - activeRuleSet (from Step 1)                                │ │
│  │                                                                 │ │
│  │ Process:                                                        │ │
│  │   1. computePrimitives() → 80+ primitive values                │ │
│  │   2. For each KPI in registry:                                 │ │
│  │      - Calculate value from primitives                         │ │
│  │      - Apply vertical weight overrides                         │ │
│  │      - Normalize to 0-100 scale                                │ │
│  │   3. Compute family scores                                     │ │
│  │   4. Compute overall score                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  Output: kpiResult                                                   │
│  { vector: { kpi_id: value }, familyScores: {...},                  │
│    overallScore: number, detailedResults: [...] }                   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│              STEP 7: Executive Recommendations (NEW in v2.0)         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ generateExecutiveRecommendations()                             │ │
│  │  Input:                                                         │ │
│  │   - kpiVector (from Step 6)                                    │ │
│  │   - gapAnalysis (from Step 5)                                  │ │
│  │   - comboCoverage (from Step 4)                                │ │
│  │   - intentCoverage (from Step 3A)                              │ │
│  │   - verticalContext (from Step 1)                              │ │
│  │                                                                 │ │
│  │ Process:                                                        │ │
│  │   1. identifyCriticalIssues(kpiVector)                         │ │
│  │      - Scan for KPIs below threshold                           │ │
│  │      - Categorize by severity                                  │ │
│  │      - Add metric context                                      │ │
│  │                                                                 │ │
│  │   2. extractOpportunities(gapAnalysis)                         │ │
│  │      - Prioritize capability gaps                              │ │
│  │      - Suggest examples                                        │ │
│  │      - Estimate potential impact                               │ │
│  │                                                                 │ │
│  │   3. determineStrategicDirection(issues, opportunities)        │ │
│  │      - Identify patterns (e.g., high brand dependency)         │ │
│  │      - Generate strategy statement                             │ │
│  │      - Create action items                                     │ │
│  │                                                                 │ │
│  │   4. generateTestVariants(direction) [OPTIONAL in v2.0]        │ │
│  │      - Create test hypotheses                                  │ │
│  │      - Suggest variant metadata                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  Output: executiveRecommendation                                     │
│  { whats_wrong: [...], opportunities: [...], direction: {...},      │
│    next_tests: [...] }                                               │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 8: Result Assembly                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Combine all outputs into UnifiedMetadataAuditResult            │ │
│  │  - overallScore (from kpiResult)                               │ │
│  │  - elements: { title, subtitle, description }                  │ │
│  │  - keywordCoverage (from Step 4)                               │ │
│  │  - comboCoverage (from Step 4)                                 │ │
│  │  - intentCoverage (from Step 3A)                               │ │
│  │  - capabilityMap (from Step 3B) [NEW]                          │ │
│  │  - gapAnalysis (from Step 5) [NEW]                             │ │
│  │  - kpis (from Step 6)                                          │ │
│  │  - executiveRecommendation (from Step 7) [NEW]                 │ │
│  │  - verticalContext (from Step 1)                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     OUTPUT: Audit Result                             │
│            Sent to Frontend for Display                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 DETAILED WIRING: NEW v2.0 COMPONENTS

### **1. Description Intelligence → Gap Analysis**

**File:** `src/engine/metadata/utils/descriptionIntelligence.ts`

```typescript
// STEP 3B: Extract capabilities
export function extractCapabilities(description: string): AppCapabilityMap {
  const capabilities: AppCapabilityMap = {
    features: { detected: [], count: 0, categories: [] },
    benefits: { detected: [], count: 0, categories: [] },
    trust: { signals: [], count: 0, categories: [] }
  };

  // Match feature patterns
  for (const pattern of FEATURE_PATTERNS) {
    const matches = description.match(pattern.pattern);
    if (matches) {
      capabilities.features.detected.push(...matches);
      if (!capabilities.features.categories.includes(pattern.category)) {
        capabilities.features.categories.push(pattern.category);
      }
    }
  }

  // Repeat for benefits and trust...

  capabilities.features.count = capabilities.features.detected.length;
  capabilities.benefits.count = capabilities.benefits.detected.length;
  capabilities.trust.count = capabilities.trust.signals.length;

  return capabilities;
}
```

**Consumed by:** Gap Analysis Engine (Step 5)

---

**File:** `src/engine/metadata/utils/gapAnalysisEngine.ts`

```typescript
// STEP 5: Analyze gaps
export function analyzeCapabilityGaps(
  capabilityMap: AppCapabilityMap,
  titleTokens: string[],
  subtitleTokens: string[],
  titleCombos: string[],
  subtitleCombos: string[],
  verticalContext: VerticalContext
): GapAnalysisResult {

  const gapAnalysis: GapAnalysisResult = {
    feature_gaps: [],
    benefit_gaps: [],
    trust_gaps: [],
    summary: {
      total_feature_gaps: 0,
      total_benefit_gaps: 0,
      total_trust_gaps: 0,
      critical_gaps: 0,
      top_3_missed_opportunities: []
    }
  };

  // Check each detected feature
  for (const feature of capabilityMap.features.detected) {
    const present_in_title = isCapabilityPresent(feature, titleTokens, titleCombos);
    const present_in_subtitle = isCapabilityPresent(feature, subtitleTokens, subtitleCombos);

    if (!present_in_title && !present_in_subtitle) {
      // Gap detected
      const category = getCategoryForCapability(feature, capabilityMap.features.categories);
      const severity = calculateGapSeverity(feature, category, verticalContext);

      gapAnalysis.feature_gaps.push({
        capability: feature,
        category,
        present_in_title,
        present_in_subtitle,
        present_in_keywords: false,  // Not available yet
        gap_severity: severity
      });

      if (severity === 'critical') {
        gapAnalysis.summary.critical_gaps++;
      }
    }
  }

  // Repeat for benefits and trust...

  // Calculate summary stats
  gapAnalysis.summary.total_feature_gaps = gapAnalysis.feature_gaps.length;
  gapAnalysis.summary.total_benefit_gaps = gapAnalysis.benefit_gaps.length;
  gapAnalysis.summary.total_trust_gaps = gapAnalysis.trust_gaps.length;

  // Identify top 3 missed opportunities (sorted by severity + category importance)
  const allGaps = [
    ...gapAnalysis.feature_gaps.map(g => ({ ...g, type: 'feature' })),
    ...gapAnalysis.benefit_gaps.map(g => ({ ...g, type: 'benefit' })),
    ...gapAnalysis.trust_gaps.map(g => ({ ...g, type: 'trust' }))
  ];

  const sortedGaps = allGaps
    .sort((a, b) => {
      const severityScore = { critical: 3, high: 2, moderate: 1 };
      return severityScore[b.gap_severity] - severityScore[a.gap_severity];
    })
    .slice(0, 3);

  gapAnalysis.summary.top_3_missed_opportunities = sortedGaps.map(
    g => `${g.type}: "${g.capability}" (${g.category})`
  );

  return gapAnalysis;
}

// Helper functions
function isCapabilityPresent(
  capability: string,
  tokens: string[],
  combos: string[]
): boolean {
  // Normalize capability for comparison
  const normalized = capability.toLowerCase().trim();

  // Check single-token match
  if (tokens.some(t => normalized.includes(t) || t.includes(normalized))) {
    return true;
  }

  // Check combo match (more precise)
  if (combos.some(c => normalized.includes(c) || c.includes(normalized))) {
    return true;
  }

  return false;
}

function calculateGapSeverity(
  capability: string,
  category: string,
  verticalContext: VerticalContext
): 'critical' | 'high' | 'moderate' {
  // Critical: Vertical-specific important categories (hardcoded for v2.0, moved to ruleset in v2.1)
  const criticalCategories: Record<string, string[]> = {
    'finance': ['security', 'privacy', 'certification'],
    'education': ['educational', 'skill_development', 'certification'],
    'health': ['privacy', 'medical', 'certification'],
    'dating': ['privacy', 'safety', 'verification'],
    'productivity': ['functionality', 'data', 'integration'],
    'entertainment': ['performance', 'content', 'engagement'],
    'gaming': ['performance', 'engagement', 'social']
  };

  const verticalCritical = criticalCategories[verticalContext.vertical] || [];

  if (verticalCritical.includes(category)) {
    return 'critical';
  }

  // High: Generally important categories
  const highImportanceCategories = [
    'core', 'functionality', 'performance', 'security', 'usability'
  ];

  if (highImportanceCategories.includes(category)) {
    return 'high';
  }

  // Moderate: Everything else
  return 'moderate';
}
```

**Consumed by:** KPI Engine (Step 6) + Executive Recommendation Engine (Step 7)

---

### **2. Gap Analysis → KPI Engine**

**File:** `src/engine/metadata/kpi/kpiEngine.ts`

```typescript
// STEP 6: Compute primitives (extended for v2.0)
private static computePrimitives(data: {
  title: string;
  subtitle: string;
  platform: 'ios' | 'android';
  tokensTitle: string[];
  tokensSubtitle: string[];
  titleAnalysis: any;
  subtitleAnalysis: any;
  comboCoverage?: any;
  brandSignals?: any;
  intentSignals?: any;
  intentCoverage?: any;
  activeRuleSet?: any;
  capabilityMap?: AppCapabilityMap;  // NEW in v2.0
  gapAnalysis?: GapAnalysisResult;   // NEW in v2.0
}) {

  // ... existing primitive computation ...

  // NEW v2.0 primitives
  if (data.gapAnalysis) {
    primitives.featureGapCount = data.gapAnalysis.feature_gaps.length;
    primitives.benefitGapCount = data.gapAnalysis.benefit_gaps.length;
    primitives.trustGapCount = data.gapAnalysis.trust_gaps.length;
    primitives.criticalGapCount = data.gapAnalysis.summary.critical_gaps;

    primitives.featureGapScore = Math.max(
      0,
      100 - (primitives.featureGapCount * 10)  // -10 points per gap
    );

    primitives.benefitGapScore = Math.max(
      0,
      100 - (primitives.benefitGapCount * 10)
    );

    primitives.trustGapScore = Math.max(
      0,
      100 - (primitives.trustGapCount * 15)  // -15 points per trust gap (higher weight)
    );

    primitives.capabilityAlignmentScore = (
      primitives.featureGapScore * 0.4 +
      primitives.benefitGapScore * 0.3 +
      primitives.trustGapScore * 0.3
    );
  }

  if (data.capabilityMap) {
    primitives.totalFeaturesDetected = data.capabilityMap.features.count;
    primitives.totalBenefitsDetected = data.capabilityMap.benefits.count;
    primitives.totalTrustSignalsDetected = data.capabilityMap.trust.count;
  }

  return primitives;
}

// NEW KPI computation functions (v2.0)
private static compute_feature_gap_score(data: ComputeData): number {
  return data.primitives.featureGapScore ?? 100;  // Default to 100 if no gaps
}

private static compute_benefit_gap_score(data: ComputeData): number {
  return data.primitives.benefitGapScore ?? 100;
}

private static compute_trust_gap_score(data: ComputeData): number {
  return data.primitives.trustGapScore ?? 100;
}

private static compute_capability_alignment_score(data: ComputeData): number {
  return data.primitives.capabilityAlignmentScore ?? 100;
}
```

**Consumed by:** KPI result vector → Executive Recommendation Engine (Step 7)

---

### **3. Intent V2 → KPI Engine**

**File:** `src/engine/asoBible/intentEngine.ts`

```typescript
// STEP 3A: Classify intents (expanded for v2.0)
export type IntentType =
  | 'informational'
  | 'commercial'
  | 'transactional'
  | 'navigational'
  | 'category'      // NEW
  | 'feature';      // NEW

export interface ComboIntentClassification {
  combo: string;
  dominantIntent: IntentType | 'mixed' | 'unknown';
  intentScores: {
    informational: number;
    commercial: number;
    transactional: number;
    navigational: number;
    category: number;        // NEW
    feature: number;         // NEW
  };
  transactionalSafety?: 'safe' | 'risky' | null;  // NEW
  riskFlags?: string[];      // NEW
  matchedPatterns: string[];
}

// Transactional Safety Logic (NEW in v2.0)
const SAFE_TRANSACTIONAL_PATTERNS = [
  'try', 'start', 'get', 'use', 'begin', 'access', 'explore', 'discover'
];

const RISKY_TRANSACTIONAL_PATTERNS = [
  'free', 'download', 'install', 'now', 'today'
];

export function classifyIntentForCombo(
  combo: string,
  patterns: IntentPattern[]
): ComboIntentClassification {

  // ... existing scoring logic for 4 types ...

  // NEW: Category intent detection
  const categoryScore = patterns
    .filter(p => p.intentType === 'category')
    .reduce((sum, p) => {
      if (isMatch(combo, p)) return sum + p.weight;
      return sum;
    }, 0);

  // NEW: Feature intent detection
  const featureScore = patterns
    .filter(p => p.intentType === 'feature')
    .reduce((sum, p) => {
      if (isMatch(combo, p)) return sum + p.weight;
      return sum;
    }, 0);

  const intentScores = {
    informational,
    commercial,
    transactional,
    navigational,
    category: categoryScore,
    feature: featureScore
  };

  const dominantIntent = Object.keys(intentScores).reduce((a, b) =>
    intentScores[a] > intentScores[b] ? a : b
  ) as IntentType;

  // NEW: Transactional safety detection
  let transactionalSafety: 'safe' | 'risky' | null = null;
  const riskFlags: string[] = [];

  if (dominantIntent === 'transactional' || transactional > 0) {
    const hasSafe = SAFE_TRANSACTIONAL_PATTERNS.some(pattern =>
      combo.toLowerCase().includes(pattern)
    );

    const hasRisky = RISKY_TRANSACTIONAL_PATTERNS.some(pattern => {
      if (combo.toLowerCase().includes(pattern)) {
        riskFlags.push(pattern);
        return true;
      }
      return false;
    });

    if (hasRisky) {
      transactionalSafety = 'risky';
    } else if (hasSafe) {
      transactionalSafety = 'safe';
    }
  }

  return {
    combo,
    dominantIntent,
    intentScores,
    transactionalSafety,
    riskFlags,
    matchedPatterns
  };
}
```

**Consumed by:** Combo enrichment (Step 4) → KPI Engine (Step 6)

---

**File:** `src/engine/metadata/kpi/kpiEngine.ts`

```typescript
// NEW KPI computation (v2.0)
private static compute_safe_transactional_score(data: ComputeData): number {
  const totalTransactional = data.primitives.transactionalCount || 0;
  const safeTransactional = data.primitives.safeTransactionalCount || 0;

  if (totalTransactional === 0) return 100;  // No transactional = no risk

  const safePercentage = (safeTransactional / totalTransactional) * 100;
  return Math.round(safePercentage);
}

private static compute_risky_transactional_warning(data: ComputeData): number {
  const totalTransactional = data.primitives.transactionalCount || 0;
  const riskyTransactional = data.primitives.riskyTransactionalCount || 0;

  if (totalTransactional === 0) return 0;  // No risk

  const riskyPercentage = (riskyTransactional / totalTransactional) * 100;
  return riskyPercentage > 15 ? 1 : 0;  // Boolean: 1 = warning, 0 = safe
}

private static compute_category_intent_coverage_score(data: ComputeData): number {
  const totalTokens = data.primitives.totalTokens || 1;
  const categoryCount = data.primitives.categoryCount || 0;

  return Math.round((categoryCount / totalTokens) * 100);
}

private static compute_feature_intent_coverage_score(data: ComputeData): number {
  const totalTokens = data.primitives.totalTokens || 1;
  const featureCount = data.primitives.featureCount || 0;

  return Math.round((featureCount / totalTokens) * 100);
}
```

**Consumed by:** KPI vector → Executive Recommendation Engine (Step 7)

---

### **4. All Data → Executive Recommendation Engine**

**File:** `src/engine/metadata/utils/executiveRecommendationEngine.ts`

```typescript
// STEP 7: Generate executive recommendations
export function generateExecutiveRecommendations(
  kpiVector: Record<string, number>,
  gapAnalysis: GapAnalysisResult,
  comboCoverage: any,
  intentCoverage: any,
  verticalContext: VerticalContext
): ExecutiveRecommendation {

  const recommendation: ExecutiveRecommendation = {
    whats_wrong: { issues: [] },
    opportunities: { opportunities: [] },
    direction: {
      strategy: '',
      rationale: '',
      action_items: []
    },
    next_tests: { tests: [] }  // Placeholder for v2.0
  };

  // 1. IDENTIFY CRITICAL ISSUES FROM KPIs
  const issues = identifyCriticalIssues(kpiVector, verticalContext);
  recommendation.whats_wrong.issues = issues;

  // 2. EXTRACT OPPORTUNITIES FROM GAP ANALYSIS
  const opportunities = extractOpportunities(gapAnalysis, verticalContext);
  recommendation.opportunities.opportunities = opportunities;

  // 3. DETERMINE STRATEGIC DIRECTION
  const direction = determineStrategicDirection(
    issues,
    opportunities,
    comboCoverage,
    intentCoverage,
    verticalContext
  );
  recommendation.direction = direction;

  // 4. GENERATE TEST VARIANTS (placeholder in v2.0)
  // recommendation.next_tests = generateTestVariants(direction);

  return recommendation;
}

// Sub-function: Identify critical issues
function identifyCriticalIssues(
  kpiVector: Record<string, number>,
  verticalContext: VerticalContext
): Array<{
  issue: string;
  severity: 'critical' | 'high' | 'moderate';
  impact: string;
  metric_context: string;
}> {

  const issues: any[] = [];

  // Check capability alignment
  if (kpiVector.capability_alignment_score < 50) {
    issues.push({
      issue: 'Significant gaps between description and metadata',
      severity: 'critical',
      impact: 'Missing discoverable keywords that represent actual app features',
      metric_context: `Capability alignment: ${Math.round(kpiVector.capability_alignment_score)}% (expected: >70%)`
    });
  }

  // Check transactional safety
  if (kpiVector.risky_transactional_warning === 1) {
    issues.push({
      issue: 'High-risk transactional keywords detected',
      severity: 'high',
      impact: 'May trigger Apple\'s ranking penalties for misleading metadata',
      metric_context: `Risky keywords: ${Math.round((1 - kpiVector.safe_transactional_score / 100) * 100)}% of transactional tokens`
    });
  }

  // Check intent diversity
  if (kpiVector.intent_diversity_score < 40) {
    issues.push({
      issue: 'Low intent diversity',
      severity: 'high',
      impact: 'Metadata targets too narrow of a search intent range',
      metric_context: `Diversity: ${Math.round(kpiVector.intent_diversity_score)}% (expected: >60%)`
    });
  }

  // Check brand dependency (using existing KPIs)
  const brandShare = (kpiVector.brand_balance_score || 0);  // Assuming lower = more brand-heavy
  if (brandShare < 30) {
    issues.push({
      issue: 'High brand dependency detected',
      severity: 'critical',
      impact: 'Limits discoverability by 60-70% (users must know your brand to find you)',
      metric_context: `Brand balance: ${Math.round(brandShare)}% (expected: >50% for discovery)`
    });
  }

  // Check category coverage
  if (kpiVector.category_intent_coverage_score < 5) {
    issues.push({
      issue: 'No category-defining keywords',
      severity: 'high',
      impact: 'Missing broad discovery opportunities',
      metric_context: `Category intent: ${Math.round(kpiVector.category_intent_coverage_score)}% (expected: 10-20%)`
    });
  }

  return issues.sort((a, b) => {
    const severityOrder = { critical: 3, high: 2, moderate: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

// Sub-function: Extract opportunities
function extractOpportunities(
  gapAnalysis: GapAnalysisResult,
  verticalContext: VerticalContext
): Array<{
  opportunity: string;
  potential: string;
  priority: number;
  examples: string[];
}> {

  const opportunities: any[] = [];

  // Feature gaps as opportunities
  const criticalFeatureGaps = gapAnalysis.feature_gaps
    .filter(g => g.gap_severity === 'critical')
    .slice(0, 3);

  for (const gap of criticalFeatureGaps) {
    opportunities.push({
      opportunity: `Add feature keyword: "${gap.capability}"`,
      potential: 'Could increase impressions 10-20% for feature-specific searches',
      priority: 9,
      examples: [
        `Title: "... ${gap.capability} ..."`,
        `Subtitle: "... with ${gap.capability}"`
      ]
    });
  }

  // Benefit gaps as opportunities
  const criticalBenefitGaps = gapAnalysis.benefit_gaps
    .filter(g => g.gap_severity === 'critical')
    .slice(0, 2);

  for (const gap of criticalBenefitGaps) {
    opportunities.push({
      opportunity: `Highlight benefit: "${gap.capability}"`,
      potential: 'Could improve conversion rate 5-10%',
      priority: 7,
      examples: [
        `Subtitle: "${gap.capability}"`,
        `Description first line: "${gap.capability}"`
      ]
    });
  }

  // Trust gaps as opportunities (especially critical for certain verticals)
  const criticalTrustGaps = gapAnalysis.trust_gaps
    .filter(g => g.gap_severity === 'critical')
    .slice(0, 2);

  if (criticalTrustGaps.length > 0 && ['finance', 'health', 'dating'].includes(verticalContext.vertical)) {
    for (const gap of criticalTrustGaps) {
      opportunities.push({
        opportunity: `Add trust signal: "${gap.signal}"`,
        potential: 'Critical for user confidence in ' + verticalContext.vertical + ' vertical',
        priority: 10,
        examples: [
          `Subtitle: "... ${gap.signal} ..."`,
          `Description: "✓ ${gap.signal}"`
        ]
      });
    }
  }

  // Sort by priority
  return opportunities.sort((a, b) => b.priority - a.priority);
}

// Sub-function: Determine strategic direction
function determineStrategicDirection(
  issues: any[],
  opportunities: any[],
  comboCoverage: any,
  intentCoverage: any,
  verticalContext: VerticalContext
): {
  strategy: string;
  rationale: string;
  action_items: string[];
} {

  // Pattern detection: High brand dependency
  const hasBrandDependencyIssue = issues.some(i =>
    i.issue.toLowerCase().includes('brand dependency')
  );

  const hasLowCategoryIntent = issues.some(i =>
    i.issue.toLowerCase().includes('category-defining')
  );

  const hasCapabilityGaps = issues.some(i =>
    i.issue.toLowerCase().includes('gaps between description and metadata')
  );

  // Strategy 1: Shift from branded to discovery
  if (hasBrandDependencyIssue || hasLowCategoryIntent) {
    return {
      strategy: 'Shift from branded to category + benefit keywords',
      rationale: 'Current metadata over-relies on brand recognition, limiting discoverability. Users who don\'t know your brand cannot find you.',
      action_items: [
        'Replace brand-heavy phrases with category-defining keywords',
        'Add "what does this app do" keywords (e.g., "language learning app")',
        'Include primary user benefits (e.g., "learn languages fast", "speak fluently")',
        'Test generic variants in subtitle before full rollout'
      ]
    };
  }

  // Strategy 2: Close capability gaps
  if (hasCapabilityGaps) {
    const topGaps = opportunities
      .filter(o => o.opportunity.includes('feature'))
      .slice(0, 3)
      .map(o => o.opportunity.replace('Add feature keyword: ', '').replace(/"/g, ''));

    return {
      strategy: 'Align metadata with actual app capabilities',
      rationale: 'Your description mentions features not present in metadata, missing keyword opportunities for feature-specific searches.',
      action_items: [
        `Add missing feature keywords: ${topGaps.join(', ')}`,
        'Prioritize features users search for most (use search volume data if available)',
        'Balance feature keywords with benefit keywords (50/50 split)',
        'Test feature-focused subtitle variant'
      ]
    };
  }

  // Strategy 3: Improve intent diversity (fallback)
  return {
    strategy: 'Diversify search intent coverage',
    rationale: 'Metadata targets too narrow of a search intent range, limiting discoverability across different user journeys.',
    action_items: [
      'Add informational keywords (e.g., "how to learn", "language lessons")',
      'Add commercial keywords (e.g., "best language app", "top rated")',
      'Balance transactional keywords (safe: "try", "start" vs risky: "free", "download")',
      'Add category keywords (e.g., "language learning app", "education tool")'
    ]
  };
}
```

**Consumed by:** Audit result assembly (Step 8) → Frontend display

---

## 🔄 INTEGRATION POINTS: FRONTEND ↔ BACKEND

### **Edge Function Entry Point**
**File:** `supabase/functions/_shared/metadata-audit-engine.ts`

```typescript
// Main evaluation function (existing, extended for v2.0)
public static async evaluate(
  metadata: {
    title: string;
    subtitle: string;
    description: string;
    applicationCategory: string;
    platform: 'ios' | 'android';
    appId: string;
    organizationId: string;
  },
  options?: {
    locale?: string;
    ignoreCache?: boolean;
    cachedRuleSet?: any;
  }
): Promise<UnifiedMetadataAuditResult> {

  // STEP 1: Load ruleset (existing)
  const activeRuleSet = await getActiveRuleSet(...);

  // STEP 2: Tokenization (existing)
  const titleTokens = tokenizeForASO(metadata.title);
  const subtitleTokens = tokenizeForASO(metadata.subtitle);
  const descriptionTokens = tokenizeForASO(metadata.description);

  // STEP 3A: Intent classification (existing, extended)
  const intentPatterns = await loadIntentPatterns(...);
  setIntentPatterns(intentPatterns);

  // STEP 3B: Description intelligence (NEW v2.0)
  const capabilityMap = extractCapabilities(metadata.description);

  // STEP 4: Keyword & combo analysis (existing)
  const keywordCoverage = analyzeKeywordCoverage(...);
  const comboCoverage = await generateEnhancedCombos(...);

  // STEP 5: Gap analysis (NEW v2.0)
  const gapAnalysis = analyzeCapabilityGaps(
    capabilityMap,
    titleTokens,
    subtitleTokens,
    comboCoverage.titleCombos.map(c => c.combo),
    comboCoverage.subtitleNewCombos.map(c => c.combo),
    activeRuleSet.verticalContext
  );

  // STEP 6: KPI computation (existing, extended)
  const kpiResult = KpiEngine.evaluate({
    title: metadata.title,
    subtitle: metadata.subtitle,
    platform: metadata.platform,
    tokensTitle: titleTokens,
    tokensSubtitle: subtitleTokens,
    titleAnalysis: { /* ... */ },
    subtitleAnalysis: { /* ... */ },
    comboCoverage,
    intentCoverage,
    capabilityMap,   // NEW
    gapAnalysis,     // NEW
    activeRuleSet
  });

  // STEP 7: Executive recommendations (NEW v2.0)
  const executiveRecommendation = generateExecutiveRecommendations(
    kpiResult.vector,
    gapAnalysis,
    comboCoverage,
    intentCoverage,
    activeRuleSet.verticalContext
  );

  // STEP 8: Assemble result (existing, extended)
  return {
    overallScore: kpiResult.overallScore,
    elements: { /* ... */ },
    topRecommendations: executiveRecommendation.whats_wrong.issues.map(i => i.issue),
    conversionRecommendations: executiveRecommendation.opportunities.opportunities.map(o => o.opportunity),
    keywordCoverage,
    comboCoverage,
    intentCoverage,
    capabilityMap,              // NEW
    gapAnalysis,                // NEW
    executiveRecommendation,    // NEW
    kpis: kpiResult.vector,
    verticalContext: activeRuleSet.verticalContext
  };
}
```

### **Frontend API Call**
**File:** `src/components/AppAudit/UnifiedMetadataAuditModule/hooks/useUnifiedAuditQuery.ts`

```typescript
// Existing hook, no changes needed (result type extends automatically)
export function useUnifiedAuditQuery(appId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['unified-metadata-audit', appId],
    queryFn: async () => {
      const response = await supabase.functions.invoke('unified-metadata-audit', {
        body: { appId }
      });

      if (response.error) throw response.error;

      // Type assertion includes new v2.0 fields
      return response.data as UnifiedMetadataAuditResult;
    },
    enabled,
    staleTime: 5 * 60 * 1000
  });
}
```

### **Frontend Display Components**
**File:** `src/components/AppAudit/UnifiedMetadataAuditModule/UnifiedMetadataAuditModule.tsx`

```typescript
// Main module (existing, extend with new panels)
export function UnifiedMetadataAuditModule({ appId }: { appId: string }) {
  const { data: auditResult, isLoading } = useUnifiedAuditQuery(appId, true);

  if (isLoading) return <LoadingSpinner />;
  if (!auditResult) return <ErrorState />;

  return (
    <div className="space-y-6">
      {/* Existing panels */}
      <OverallScoreCard score={auditResult.overallScore} />
      <ElementBreakdown elements={auditResult.elements} />
      <IntentCoveragePanel intentCoverage={auditResult.intentCoverage} />
      <ComboAnalysisPanel comboCoverage={auditResult.comboCoverage} />

      {/* NEW v2.0 panels */}
      {auditResult.gapAnalysis && (
        <CapabilityGapPanel gapAnalysis={auditResult.gapAnalysis} />
      )}

      {auditResult.executiveRecommendation && (
        <ExecutiveRecommendationPanel
          recommendation={auditResult.executiveRecommendation}
        />
      )}

      {/* Existing panels */}
      <RecommendationsPanel
        recommendations={auditResult.topRecommendations}
        type="ranking"
      />
    </div>
  );
}
```

---

## 🧪 TESTING: WIRING VALIDATION

### **Unit Tests (Per Module)**

1. **Description Intelligence**
   - Input: Sample descriptions
   - Validate: Feature/benefit/trust extraction accuracy
   - Test: Empty description, no patterns matched, all patterns matched

2. **Gap Analysis**
   - Input: Capability map + tokens + combos
   - Validate: Gap detection logic, severity calculation
   - Test: Zero gaps, all gaps, partial gaps

3. **KPI Engine**
   - Input: Primitives with new v2.0 fields
   - Validate: New KPI calculations (feature_gap_score, safe_transactional_score, etc.)
   - Test: Edge cases (divide by zero, missing data)

4. **Executive Recommendation Engine**
   - Input: KPI vector + gap analysis
   - Validate: Issue identification, opportunity extraction, strategy selection
   - Test: Different issue patterns (brand dependency, capability gaps, low diversity)

### **Integration Tests (End-to-End)**

**Test Scenario 1: High Brand Dependency**
```typescript
test('detects high brand dependency and suggests generic keywords', async () => {
  const metadata = {
    title: 'Pimsleur: Learn Languages',
    subtitle: 'Pimsleur Language App',
    description: 'Learn Spanish, French, Italian with proven method. Features: offline lessons, voice recognition, progress tracking.',
    applicationCategory: 'Education',
    platform: 'ios',
    appId: 'test-app-1',
    organizationId: 'test-org'
  };

  const result = await MetadataAuditEngine.evaluate(metadata);

  expect(result.executiveRecommendation.whats_wrong.issues).toContainEqual(
    expect.objectContaining({
      issue: expect.stringContaining('brand dependency')
    })
  );

  expect(result.executiveRecommendation.direction.strategy).toContain(
    'category + benefit keywords'
  );

  expect(result.gapAnalysis.feature_gaps).toContainEqual(
    expect.objectContaining({
      capability: expect.stringContaining('offline'),
      present_in_title: false,
      present_in_subtitle: false
    })
  );
});
```

**Test Scenario 2: Risky Transactional Keywords**
```typescript
test('warns about risky transactional keywords', async () => {
  const metadata = {
    title: 'Free Language Learning App - Download Now',
    subtitle: 'Learn Languages Free - Install Today',
    description: '...',
    applicationCategory: 'Education',
    platform: 'ios',
    appId: 'test-app-2',
    organizationId: 'test-org'
  };

  const result = await MetadataAuditEngine.evaluate(metadata);

  expect(result.kpis.risky_transactional_warning).toBe(1);
  expect(result.kpis.safe_transactional_score).toBeLessThan(50);

  expect(result.executiveRecommendation.whats_wrong.issues).toContainEqual(
    expect.objectContaining({
      issue: expect.stringContaining('High-risk transactional keywords')
    })
  );
});
```

**Test Scenario 3: Capability Gaps**
```typescript
test('identifies feature gaps between description and metadata', async () => {
  const metadata = {
    title: 'Language App',
    subtitle: 'Learn Languages',
    description: 'Features: offline mode, voice recognition, real-time progress tracking, personalized lessons, gamification.',
    applicationCategory: 'Education',
    platform: 'ios',
    appId: 'test-app-3',
    organizationId: 'test-org'
  };

  const result = await MetadataAuditEngine.evaluate(metadata);

  expect(result.capabilityMap.features.detected.length).toBeGreaterThan(3);
  expect(result.gapAnalysis.feature_gaps.length).toBeGreaterThan(0);
  expect(result.kpis.capability_alignment_score).toBeLessThan(70);

  expect(result.executiveRecommendation.opportunities.opportunities).toContainEqual(
    expect.objectContaining({
      opportunity: expect.stringContaining('offline'),
      examples: expect.arrayContaining([expect.stringContaining('offline')])
    })
  );
});
```

---

## 🎯 SUMMARY: KEY WIRING PATTERNS

### **Data Flows**
1. **Tokenization → Everything** (all engines depend on tokens)
2. **Intent Classification → Combo Enrichment → KPIs** (intent flows through combos)
3. **Description Intelligence → Gap Analysis → KPIs → Recommendations** (new v2.0 flow)
4. **All Data → Executive Recommendations** (final synthesis layer)

### **Interface Extensions**
- KpiEngine.evaluate() accepts new optional fields (backward compatible)
- UnifiedMetadataAuditResult extends with new fields (backward compatible)
- No breaking changes to existing frontend components

### **Feature Flags Needed**
```typescript
// .env
ENABLE_INTENT_V2=true
ENABLE_DESCRIPTION_INTELLIGENCE=true
ENABLE_GAP_ANALYSIS=true
ENABLE_KPI_V2=true
ENABLE_EXECUTIVE_RECOMMENDATIONS=true
```

This wiring map ensures all new v2.0 components integrate cleanly with the existing audit system.
