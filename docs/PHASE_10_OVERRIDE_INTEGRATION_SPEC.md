# Phase 10 — Override Integration Specification

**Date**: 2025-11-23
**Status**: 📋 SPECIFICATION - Awaiting Approval
**Type**: Implementation-Guiding Technical Specification

---

## 1. Executive Summary

### Purpose

Phase 10 integrates the intelligence layer created in Phase 9 (vertical/market rule overrides) into the live scoring pipeline. This transforms the ASO Bible Engine from language-learning-centric to **vertical-aware**, enabling category-specific and locale-specific metadata optimization.

### Scope

**Engines Affected**:
1. ✅ Token Relevance Engine - Apply `tokenRelevanceOverrides`
2. ✅ Intent Classification Engine - Apply `intentOverrides`
3. ✅ Hook Detection Engine - Apply `hookOverrides`
4. ✅ KPI Scoring Engine - Apply `kpiOverrides`
5. ✅ Formula Engine - Apply `formulaOverrides`
6. ✅ Recommendation Engine - Apply `recommendationTemplates`
7. ✅ Tokenization Layer - Apply `stopwordOverrides`

### Guarantees

**✅ NO BREAKING CHANGES**:
- If `activeRuleSet` is undefined → identical to Phase 8 behavior
- If specific overrides are missing → fall back to global patterns
- All changes are **additive**, not substitutive
- Scoring remains deterministic and debuggable

**✅ NO UI CHANGES**:
- No React component modifications in Phase 10
- No UI-facing API changes
- All changes are engine-layer only

**✅ NO EXTERNAL CALLS**:
- No network requests, no LLM calls, no database writes
- Pure functions only
- Deterministic scoring

---

## 2. Design Decisions (Key Calls)

### Decision 1: Intent Type Mismatch Resolution ⭐

**Problem**:
- Combo classifier uses: `'learning' | 'outcome' | 'brand' | 'noise'`
- Phase 9 intentOverrides use: `'informational' | 'commercial' | 'transactional' | 'navigational'`

**Decision**: ✅ **Option 1 - Mapping Layer**

**Rationale**:
- Keep existing combo classifier for UI and local reasoning (used in KeywordComboWorkbench)
- Introduce bidirectional mapping between intent types
- Make search intent scoring use Phase 9 `intentOverrides` as source of truth

**Implementation**:
```typescript
// New file: src/utils/intentTypeMapping.ts
export type ComboIntentType = 'learning' | 'outcome' | 'brand' | 'noise';
export type SearchIntentType = 'informational' | 'commercial' | 'transactional' | 'navigational';

export function mapComboToSearchIntent(comboIntent: ComboIntentType): SearchIntentType {
  switch (comboIntent) {
    case 'learning': return 'informational'; // User wants to learn/discover
    case 'outcome': return 'commercial';     // User seeks specific outcome/benefit
    case 'brand': return 'navigational';     // User searching for brand
    case 'noise': return 'informational';    // Fallback
  }
}

export function mapSearchToComboIntent(searchIntent: SearchIntentType): ComboIntentType {
  switch (searchIntent) {
    case 'informational': return 'learning';
    case 'commercial': return 'outcome';
    case 'transactional': return 'outcome'; // Transactional maps to outcome
    case 'navigational': return 'brand';
  }
}
```

---

### Decision 2: Token Relevance Signature Change ⭐

**Problem**:
- Current signature: `getTokenRelevance(token: string): 0 | 1 | 2 | 3`
- Needs access to `activeRuleSet` for overrides
- Used in 10+ places

**Decision**: ✅ **Add optional parameter with backward compatibility**

**Implementation**:
```typescript
// Before (Phase 9)
export function getTokenRelevance(token: string): 0 | 1 | 2 | 3 {
  // Hardcoded patterns...
}

// After (Phase 10)
export function getTokenRelevance(
  token: string,
  activeRuleSet?: MergedRuleSet
): 0 | 1 | 2 | 3 {
  // 1. Check tokenRelevanceOverrides from activeRuleSet
  if (activeRuleSet?.tokenRelevanceOverrides) {
    const override = activeRuleSet.tokenRelevanceOverrides[token.toLowerCase()];
    if (override !== undefined) {
      return override; // Use override
    }
  }

  // 2. Fall back to global patterns (existing logic)
  const tokenLower = token.toLowerCase();
  // ... existing hardcoded patterns
}
```

**Override Order**: `client → vertical → market → base`
- Client overrides win (Phase 11+)
- Vertical overrides next (Phase 10)
- Market overrides next (Phase 10)
- Base (global) patterns last (fallback)

**Backward Compatibility**:
- If `activeRuleSet` not provided → uses global patterns only
- All existing call sites continue working

---

### Decision 3: KPI Weight Overrides ⭐

**Problem**:
- Need to allow vertical-specific weight adjustments
- Must maintain normalization (weights sum to 1.0)
- Must not break existing scoring

**Decision**: ✅ **Weight multipliers with post-normalization**

**Implementation**:
```typescript
// KPI override structure (Phase 9)
kpiOverrides: {
  intent_alignment: {
    weight: 1.2  // 20% boost
  },
  brand_balance: {
    weight: 0.8  // 20% reduction
  }
}

// Application logic (Phase 10)
function applyKpiWeightOverride(
  baseWeight: number,
  kpiId: string,
  activeRuleSet?: MergedRuleSet
): number {
  const override = activeRuleSet?.kpiOverrides?.[kpiId];
  if (!override?.weight) {
    return baseWeight; // No override
  }

  // Apply multiplier
  return baseWeight * override.weight;
}

// Normalize after all overrides applied
function normalizeKpiWeights(weights: Record<string, number>): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum === 0) return weights;

  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    normalized[key] = value / sum;
  }
  return normalized;
}
```

**Rules**:
- Overrides are **multipliers**, not absolute values
- Always normalize after applying overrides
- Max multiplier: 2.0x (safety constraint)
- Min multiplier: 0.5x (safety constraint)

---

### Decision 4: Hook Detection - Category-Based Scoring ⭐

**Problem**:
- Current hook detection is binary (yes/no)
- Phase 9 has 6 hook categories with weights
- Need weighted scoring system

**Decision**: ✅ **Weighted multi-category hook scoring**

**Implementation**:
```typescript
// Phase 9 structure
hookOverrides: {
  learning_educational: {
    patterns: ['learn', 'master', 'practice', ...],
    weight: 1.3
  },
  outcome_benefit: {
    patterns: ['earn cash', 'get fit', ...],
    weight: 1.4
  },
  trust_safety: {
    patterns: ['secure', 'safe', 'trusted', ...],
    weight: 1.4
  },
  // ... etc
}

// New hook detection logic (Phase 10)
function calculateHookScore(
  text: string,
  activeRuleSet?: MergedRuleSet
): number {
  const hookOverrides = activeRuleSet?.hookOverrides;

  if (!hookOverrides) {
    // Fallback to Phase 9 logic (binary)
    return hasGlobalHookKeyword(text) ? 100 : 0;
  }

  let totalScore = 0;
  let matchedCategories = 0;

  for (const [category, config] of Object.entries(hookOverrides)) {
    const hasMatch = config.patterns.some(pattern =>
      text.toLowerCase().includes(pattern.toLowerCase())
    );

    if (hasMatch) {
      totalScore += 100 * config.weight;
      matchedCategories++;
    }
  }

  // Average weighted score across matched categories
  return matchedCategories > 0
    ? Math.min(100, totalScore / matchedCategories)
    : 0;
}
```

**Integration Point**:
- `metadataScoringRegistry.ts:493` - `description_hook_strength` rule
- Replace binary logic with weighted category scoring

---

### Decision 5: Stopword Merging Strategy ⭐

**Problem**:
- Base stopwords (150+ English terms)
- Market stopwords (locale-specific: German, French, etc.)
- Vertical stopwords (domain-specific noise)
- Need merge strategy

**Decision**: ✅ **Union merge (no deletions)**

**Implementation**:
```typescript
// Merge stopwords from all sources
function getMergedStopwords(activeRuleSet?: MergedRuleSet): Set<string> {
  // 1. Start with base ASO stopwords
  const merged = new Set(ASO_STOPWORDS);

  // 2. Add market stopwords (locale-specific)
  const marketStopwords = activeRuleSet?.stopwordOverrides || [];
  marketStopwords.forEach(word => merged.add(word.toLowerCase()));

  // 3. Add vertical stopwords (future)
  const verticalStopwords = activeRuleSet?.verticalStopwordOverrides || [];
  verticalStopwords.forEach(word => merged.add(word.toLowerCase()));

  return merged;
}
```

**Rules**:
- NO stopword deletions (only additions)
- All stopwords lowercased for consistency
- Market overrides added to base set
- Vertical overrides added to merged set (future)

---

### Decision 6: Recommendation Templates - Vertical-First Strategy ⭐

**Problem**:
- Current recommendations have language-learning examples hardcoded
- Phase 9 has vertical-specific templates
- Need fallback for missing templates

**Decision**: ✅ **Vertical-first with global fallback**

**Implementation**:
```typescript
function getRecommendationMessage(
  recommendationId: string,
  activeRuleSet?: MergedRuleSet,
  fallbackMessage: string
): string {
  // 1. Check vertical-specific templates first
  const verticalTemplates = activeRuleSet?.recommendationOverrides;
  if (verticalTemplates?.[recommendationId]) {
    return verticalTemplates[recommendationId].message;
  }

  // 2. Fall back to global template
  return fallbackMessage;
}
```

**Example**:
```typescript
// Current (Phase 9) - hardcoded
message: '[RANKING][critical] Subtitle adds no new high-value keywords. Consider adding unique intent phrases (e.g. \'speak fluently\', \'grammar lessons\').'

// Phase 10 - vertical-aware
const message = getRecommendationMessage(
  'subtitle_no_incremental_keywords',
  activeRuleSet,
  '[RANKING][critical] Subtitle adds no new high-value keywords. Consider adding unique intent phrases.'
);

// Rewards vertical template (Phase 9)
recommendationOverrides: {
  subtitle_no_incremental_keywords: {
    message: '[RANKING][critical] Subtitle adds no new earning-related keywords. Add terms like \'earn rewards\', \'cash out\', or \'get paid\'.'
  }
}
```

---

## 3. Engine-Level Integration Plan

### 3.1 Intent Intelligence Engine

**Files Modified**:
- `src/services/intent-intelligence.service.ts`
- `src/utils/comboIntentClassifier.ts`
- NEW: `src/utils/intentTypeMapping.ts`

**Integration Points**:

#### A) Combo Intent Classifier

**Current Behavior**:
- Uses hardcoded patterns for `'learning'` and `'outcome'` intents
- Binary pattern matching

**Phase 10 Changes**:
```typescript
// src/utils/comboIntentClassifier.ts

import { mapComboToSearchIntent } from './intentTypeMapping';
import type { MergedRuleSet } from '@/engine/asoBible/ruleset.types';

export function classifyIntent(
  combo: ClassifiedCombo,
  activeRuleSet?: MergedRuleSet
): IntentClass {
  // Keep existing logic for UI compatibility
  const comboIntent = classifyIntentLegacy(combo);

  // Log search intent mapping (dev only)
  if (process.env.NODE_ENV === 'development') {
    const searchIntent = mapComboToSearchIntent(comboIntent);
    console.log(`[Intent Mapping] ${combo.text}: ${comboIntent} → ${searchIntent}`);
  }

  return comboIntent;
}

// Keep legacy classifier intact
function classifyIntentLegacy(combo: ClassifiedCombo): IntentClass {
  // ... existing logic unchanged
}
```

#### B) Search Intent Scoring (Future - Phase 11)

**Placeholder for Phase 11**:
```typescript
// Future: Use intentOverrides for search intent scoring
function scoreSearchIntent(
  keyword: string,
  activeRuleSet?: MergedRuleSet
): { intentType: SearchIntentType; confidence: number } {
  const intentOverrides = activeRuleSet?.intentOverrides;

  if (!intentOverrides) {
    return { intentType: 'informational', confidence: 0.5 };
  }

  // Match keyword against intent patterns
  for (const [intentType, config] of Object.entries(intentOverrides)) {
    const matches = config.patterns.some(pattern =>
      keyword.toLowerCase().includes(pattern.toLowerCase())
    );

    if (matches) {
      return {
        intentType: intentType as SearchIntentType,
        confidence: config.weight || 1.0
      };
    }
  }

  return { intentType: 'informational', confidence: 0.5 };
}
```

**Note**: Search intent scoring integration is **OUT OF SCOPE** for Phase 10. Will be implemented in Phase 11.

---

### 3.2 Hook Intelligence Engine

**Files Modified**:
- `src/engine/metadata/metadataScoringRegistry.ts` (line 493)

**Integration Point**: `description_hook_strength` rule evaluator

**Current Implementation**:
```typescript
// Line 493-530 (simplified)
evaluator: (text, ctx) => {
  const hookKeywords = ['discover', 'experience', 'transform', 'achieve', 'unlock', 'revolutionize', 'master'];
  const hasHookKeyword = hookKeywords.some(k => firstParagraph.toLowerCase().includes(k));

  let score = 0;
  if (hasHookKeyword) score += 40;
  // ... other checks

  return {
    ruleId: 'description_hook_strength',
    passed: score >= 70,
    score,
    message: '...'
  };
}
```

**Phase 10 Implementation**:
```typescript
evaluator: (text, ctx) => {
  const hookOverrides = ctx.activeRuleSet?.hookOverrides;

  if (!hookOverrides) {
    // Fallback to global logic
    return evaluateHookStrengthGlobal(text);
  }

  // Extract first paragraph
  const firstParagraph = text.split('\n')[0] || '';

  // Calculate weighted hook score across categories
  let totalScore = 0;
  let matchedCategories = 0;
  const matchedHooks: string[] = [];

  for (const [category, config] of Object.entries(hookOverrides)) {
    const matched = config.patterns.filter(pattern =>
      firstParagraph.toLowerCase().includes(pattern.toLowerCase())
    );

    if (matched.length > 0) {
      const categoryScore = 100 * config.weight;
      totalScore += categoryScore;
      matchedCategories++;
      matchedHooks.push(...matched);
    }
  }

  // Average weighted score
  const score = matchedCategories > 0
    ? Math.min(100, totalScore / matchedCategories)
    : 0;

  return {
    ruleId: 'description_hook_strength',
    passed: score >= 70,
    score,
    message: `Hook strength: ${Math.round(score)}/100 (${matchedCategories} categories matched)`,
    evidence: matchedHooks.slice(0, 5)
  };
}
```

---

### 3.3 Token Relevance Engine

**Files Modified**:
- `src/engine/metadata/metadataAuditEngine.ts:38-62` (signature change)
- All call sites (10+ locations)

**Signature Change**:
```typescript
// Before
export function getTokenRelevance(token: string): 0 | 1 | 2 | 3

// After
export function getTokenRelevance(
  token: string,
  activeRuleSet?: MergedRuleSet
): 0 | 1 | 2 | 3
```

**Implementation**:
```typescript
export function getTokenRelevance(
  token: string,
  activeRuleSet?: MergedRuleSet
): 0 | 1 | 2 | 3 {
  const tokenLower = token.toLowerCase();

  // 1. Check tokenRelevanceOverrides from activeRuleSet
  if (activeRuleSet?.tokenRelevanceOverrides) {
    const override = activeRuleSet.tokenRelevanceOverrides[tokenLower];
    if (override !== undefined) {
      // Dev logging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Token Override] "${token}" → ${override} (vertical: ${activeRuleSet.verticalId})`);
      }
      return override;
    }
  }

  // 2. Fall back to global patterns (existing logic)
  // Level 0: Low-value tokens
  const lowValuePatterns = /^(best|top|great|good|new|latest|free|premium|pro|plus|lite|\d+|one|two|three)$/i;
  if (lowValuePatterns.test(tokenLower)) {
    return 0;
  }

  // Level 3: Languages and core intent verbs
  const languages = /^(english|spanish|french|german|italian|chinese|japanese|korean|portuguese|russian|arabic|hindi|mandarin)$/i;
  const coreIntentVerbs = /^(learn|speak|study|master|practice|improve|understand|read|write|listen|teach)$/i;
  if (languages.test(tokenLower) || coreIntentVerbs.test(tokenLower)) {
    return 3;
  }

  // Level 2: Strong domain nouns
  const domainNouns = /^(lesson|lessons|course|courses|class|classes|grammar|vocabulary|pronunciation|conversation|fluency|language|languages|learning|app|application|tutorial|training|education|skill|skills|method|techniques|guide)$/i;
  if (domainNouns.test(tokenLower)) {
    return 2;
  }

  // Level 1: Everything else
  return 1;
}
```

**Call Site Updates**:

Need to pass `activeRuleSet` to ALL call sites:

1. `metadataAuditEngine.ts:320` - Filtering high-value keywords
2. `metadataAuditEngine.ts:321` - Same line
3. `metadataAuditEngine.ts:426` - Sorting by relevance
4. `metadataAuditEngine.ts:447` - Combo classification
5. `metadataScoringRegistry.ts:233` - Keyword density scoring
6. `metadataScoringRegistry.ts:238` - Same rule

**Example Call Site Update**:
```typescript
// Before
const titleHighValueKeywords = titleKeywords.filter(k => getTokenRelevance(k) >= 2);

// After
const titleHighValueKeywords = titleKeywords.filter(k =>
  getTokenRelevance(k, context.activeRuleSet) >= 2
);
```

---

### 3.4 KPI & Family Weight Engine

**Files Modified**:
- `src/engine/metadata/metadataScoringRegistry.ts` (rule weight application)
- `src/engine/metadata/metadataAuditEngine.ts` (element weight application)

**Integration Points**:

#### A) Element Weights (Overall Score)

**Location**: `metadataAuditEngine.ts:268-274`

**Current**:
```typescript
private static calculateOverallScore(
  elementResults: Record<MetadataElement, ElementScoringResult>
): number {
  const weightedSum = METADATA_SCORING_REGISTRY.reduce((total, config) => {
    const elementResult = elementResults[config.element];
    return total + (elementResult.score * config.weight);
  }, 0);
  return Math.round(weightedSum);
}
```

**Phase 10**:
```typescript
private static calculateOverallScore(
  elementResults: Record<MetadataElement, ElementScoringResult>,
  activeRuleSet?: MergedRuleSet
): number {
  const weights: Record<MetadataElement, number> = {};

  // Apply overrides to element weights
  METADATA_SCORING_REGISTRY.forEach(config => {
    const baseWeight = config.weight;
    const overrideKey = `${config.element}_weight`;
    const override = activeRuleSet?.kpiOverrides?.[overrideKey];

    weights[config.element] = override?.weight
      ? baseWeight * Math.min(2.0, Math.max(0.5, override.weight))
      : baseWeight;
  });

  // Normalize weights
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const normalizedWeights = Object.fromEntries(
    Object.entries(weights).map(([k, v]) => [k, v / totalWeight])
  ) as Record<MetadataElement, number>;

  // Calculate weighted sum
  const weightedSum = METADATA_SCORING_REGISTRY.reduce((total, config) => {
    const elementResult = elementResults[config.element];
    const weight = normalizedWeights[config.element];
    return total + (elementResult.score * weight);
  }, 0);

  return Math.round(weightedSum);
}
```

#### B) Rule Weights (Element Scoring)

**Location**: `metadataAuditEngine.ts:219-222`

**Current**:
```typescript
const score = ruleResults.reduce((total, result, index) => {
  const ruleWeight = config.rules[index].weight;
  return total + (result.score * ruleWeight);
}, 0);
```

**Phase 10**:
```typescript
// Apply KPI overrides to rule weights
const weights = config.rules.map((rule, index) => {
  const baseWeight = rule.weight;
  const override = context.activeRuleSet?.kpiOverrides?.[rule.id];
  return override?.weight
    ? baseWeight * Math.min(2.0, Math.max(0.5, override.weight))
    : baseWeight;
});

// Normalize weights
const totalWeight = weights.reduce((a, b) => a + b, 0);
const normalizedWeights = weights.map(w => w / totalWeight);

// Calculate weighted score
const score = ruleResults.reduce((total, result, index) => {
  const ruleWeight = normalizedWeights[index];
  return total + (result.score * ruleWeight);
}, 0);
```

---

### 3.5 Formula Engine

**Files Modified**:
- `src/engine/metadata/metadataFormulaRegistry.ts` (lookup + override application)

**Current Architecture**:
- Formulas stored in `METADATA_FORMULA_REGISTRY`
- Lookup via `getFormulaDefinition(id: string)`
- Formulas are declarative (components + weights)

**Phase 10 Integration**:

**NEW FUNCTION**: Apply formula overrides

```typescript
// New function in metadataFormulaRegistry.ts

/**
 * Apply formula overrides from activeRuleSet
 */
export function getFormulaWithOverrides(
  formulaId: string,
  activeRuleSet?: MergedRuleSet
): FormulaDefinition | undefined {
  const baseFormula = getFormulaDefinition(formulaId);
  if (!baseFormula) return undefined;

  const override = activeRuleSet?.formulaOverrides?.[formulaId];
  if (!override) return baseFormula;

  // Clone formula and apply overrides
  const formula: FormulaDefinition = { ...baseFormula };

  // Override multiplier (if present)
  if (override.multiplier !== undefined) {
    formula.computationNotes = `${formula.computationNotes || ''} [Multiplier: ${override.multiplier}x]`;
  }

  // Override component weights (if present)
  if (override.components && formula.components) {
    formula.components = formula.components.map(comp => {
      const compOverride = override.components?.find(o => o.id === comp.id);
      return compOverride ? { ...comp, weight: compOverride.weight } : comp;
    });
  }

  return formula;
}
```

**Example Usage**:
```typescript
// Rewards vertical (Phase 9)
formulaOverrides: {
  combo_quality: {
    multiplier: 1.1  // 10% boost for earning-related combos
  }
}

// Phase 10 application
const formula = getFormulaWithOverrides('combo_quality', activeRuleSet);
const baseScore = calculateComboScore(combo);
const finalScore = formula.multiplier ? baseScore * formula.multiplier : baseScore;
```

**Scope Limitation**:
- Phase 10 only adds the infrastructure
- Actual formula override application is **OUT OF SCOPE** (minimal usage in Phase 9)
- Full implementation in Phase 11

---

### 3.6 Recommendation Engine

**Files Modified**:
- `src/engine/metadata/utils/recommendationEngineV2.ts`

**Integration Strategy**: Template replacement with vertical-first fallback

**Current Hardcoded Examples** (language-learning specific):
```typescript
// Line 91
message: '[RANKING][critical] Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. \'learn spanish\', \'language lessons\') typically increases ranking breadth.'

// Line 112
message: '[RANKING][critical] Subtitle adds no new high-value keywords. This is a missed opportunity—consider adding unique intent phrases (e.g. \'speak fluently\', \'grammar lessons\').'
```

**Phase 10 Implementation**:

**NEW HELPER FUNCTION**:
```typescript
/**
 * Get recommendation message with vertical-specific template
 */
function getRecommendationMessage(
  recommendationId: string,
  defaultMessage: string,
  activeRuleSet?: MergedRuleSet
): string {
  // 1. Check vertical-specific template
  const verticalTemplate = activeRuleSet?.recommendationOverrides?.[recommendationId];
  if (verticalTemplate) {
    return verticalTemplate.message;
  }

  // 2. Fall back to default (remove examples if vertical unknown)
  if (!activeRuleSet || !activeRuleSet.verticalId || activeRuleSet.verticalId === 'base') {
    // Remove language-learning examples for unknown verticals
    return defaultMessage.replace(/\(e\.g\.[^)]+\)/g, '').trim();
  }

  // 3. Return default
  return defaultMessage;
}
```

**UPDATE RECOMMENDATION GENERATION**:
```typescript
// Before
recs.push({
  id: 'title_low_high_value_keywords',
  category: 'ranking_keyword',
  severity: 'critical',
  impactScore: SEVERITY_TO_IMPACT.critical,
  message: '[RANKING][critical] Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. \'learn spanish\', \'language lessons\') typically increases ranking breadth.',
  element: 'title'
});

// After
recs.push({
  id: 'title_low_high_value_keywords',
  category: 'ranking_keyword',
  severity: 'critical',
  impactScore: SEVERITY_TO_IMPACT.critical,
  message: getRecommendationMessage(
    'title_low_high_value_keywords',
    '[RANKING][critical] Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. \'learn spanish\', \'language lessons\') typically increases ranking breadth.',
    activeRuleSet
  ),
  element: 'title'
});
```

**Pass activeRuleSet to Recommendation Engine**:
```typescript
// metadataAuditEngine.ts:307
private static generateRecommendationsV2(
  elementResults: Record<MetadataElement, ElementScoringResult>,
  keywordCoverage: UnifiedMetadataAuditResult['keywordCoverage'],
  comboCoverage: UnifiedMetadataAuditResult['comboCoverage'],
  conversionInsights: UnifiedMetadataAuditResult['conversionInsights'],
  activeRuleSet?: MergedRuleSet // NEW parameter
): {
  rankingRecommendations: string[];
  conversionRecommendations: string[];
}
```

**Update generateEnhancedRecommendations signature**:
```typescript
// recommendationEngineV2.ts
export function generateEnhancedRecommendations(
  signals: RecommendationSignals,
  activeRuleSet?: MergedRuleSet // NEW parameter
): {
  rankingRecommendations: string[];
  conversionRecommendations: string[];
}
```

---

### 3.7 Tokenization & Stopwords

**Files Modified**:
- `src/engine/metadata/tokenization.ts`
- `src/engine/metadata/metadataAuditEngine.ts:109-111` (stopword loading)

**Current Stopword Loading**:
```typescript
// metadataAuditEngine.ts:109-111
const stopwordsData = getStopwords();
const stopwords = new Set(stopwordsData.stopwords || []);
```

**Phase 10 Implementation**:

**NEW HELPER FUNCTION** (in `tokenization.ts`):
```typescript
/**
 * Get merged stopwords with market + vertical overrides
 */
export function getMergedStopwords(activeRuleSet?: MergedRuleSet): Set<string> {
  // 1. Start with base ASO stopwords
  const merged = new Set(ASO_STOPWORDS);

  // 2. Add market stopwords (from activeRuleSet.stopwordOverrides)
  const marketStopwords = activeRuleSet?.stopwordOverrides || [];
  marketStopwords.forEach(word => merged.add(word.toLowerCase()));

  // 3. Log additions (dev only)
  if (process.env.NODE_ENV === 'development' && marketStopwords.length > 0) {
    console.log(`[Stopwords] Added ${marketStopwords.length} market stopwords (${activeRuleSet?.marketId})`);
  }

  return merged;
}
```

**UPDATE METADATA AUDIT ENGINE**:
```typescript
// metadataAuditEngine.ts:109-111
// Before
const stopwordsData = getStopwords();
const stopwords = new Set(stopwordsData.stopwords || []);

// After
const stopwords = getMergedStopwords(activeRuleSet);
```

**No Changes to Tokenization Logic**:
- `tokenizeForASO()` function remains unchanged
- Only stopword set is enriched with market/vertical overrides

---

## 4. Data Flow & Context Passing

### MergedRuleSet Structure

**From Phase 8** (`src/engine/asoBible/ruleset.types.ts`):
```typescript
export interface MergedRuleSet extends AsoBibleRuleSet {
  inheritanceChain: {
    base?: AsoBibleRuleSet;
    vertical?: AsoBibleRuleSet;
    market?: AsoBibleRuleSet;
    client?: AsoBibleRuleSet;
  };
  leakWarnings?: LeakWarning[];
  verticalId?: string;
  marketId?: string;
  appId?: string;
  mergedAt: string;

  // Override fields (from AsoBibleRuleSet)
  kpiOverrides?: Partial<Record<KpiId, Partial<KpiDefinition>>>;
  formulaOverrides?: Partial<Record<string, Partial<FormulaDefinition>>>;
  intentOverrides?: Record<string, IntentPatternOverride>;
  hookOverrides?: Record<string, HookPatternOverride>;
  recommendationOverrides?: Record<string, RecommendationRuleDefinition>;
  tokenRelevanceOverrides?: Record<string, 0 | 1 | 2 | 3>;
  stopwordOverrides?: string[];
  characterLimits?: { title?: number; subtitle?: number };
}
```

### Context Passing Pipeline

**Flow**:
```
1. rulesetLoader.getActiveRuleSet(metadata, locale)
   ↓
2. metadataAuditEngine.evaluate(metadata, { locale })
   ↓ (activeRuleSet loaded at line 88)
   ↓
3. EvaluationContext (line 119-137)
   ↓
4. Passed to all rule evaluators via context parameter
   ↓
5. Passed to:
   - getTokenRelevance(token, activeRuleSet)
   - generateRecommendationsV2(signals, activeRuleSet)
   - getMergedStopwords(activeRuleSet)
   - calculateOverallScore(results, activeRuleSet)
```

### Type Updates Required

**EvaluationContext** (`metadataScoringRegistry.ts:49-67`):
```typescript
// Before
export interface EvaluationContext {
  metadata: ScrapedMetadata;
  competitorData?: any[];
  category?: string;
  titleTokens: string[];
  subtitleTokens: string[];
  descriptionTokens: string[];
  stopwords: Set<string>;
  semanticRules: { ... };
  activeRuleSet?: any; // Phase 8 placeholder
}

// After (Phase 10)
import type { MergedRuleSet } from '@/engine/asoBible/ruleset.types';

export interface EvaluationContext {
  metadata: ScrapedMetadata;
  competitorData?: any[];
  category?: string;
  titleTokens: string[];
  subtitleTokens: string[];
  descriptionTokens: string[];
  stopwords: Set<string>;
  semanticRules: { ... };
  activeRuleSet?: MergedRuleSet; // Properly typed
}
```

---

## 5. Safety & Leak Prevention

### Confidence Threshold

**Rule**: Only apply vertical overrides if detection confidence ≥ 0.6

**Implementation**:
```typescript
// In any override application function
function shouldApplyVerticalOverrides(activeRuleSet?: MergedRuleSet): boolean {
  if (!activeRuleSet || !activeRuleSet.verticalId) return false;

  // Check if vertical detection confidence is sufficient
  // (confidence stored in rulesetLoader context - not in MergedRuleSet)
  // For Phase 10, assume all detections are valid
  // Future: Add confidence field to MergedRuleSet

  return activeRuleSet.verticalId !== 'base';
}
```

**Future Enhancement** (Phase 11):
```typescript
export interface MergedRuleSet extends AsoBibleRuleSet {
  // ... existing fields
  verticalConfidence?: number; // NEW: detection confidence (0-1)
  marketConfidence?: number;
}

function shouldApplyVerticalOverrides(activeRuleSet?: MergedRuleSet): boolean {
  if (!activeRuleSet || !activeRuleSet.verticalId) return false;
  if (activeRuleSet.verticalId === 'base') return false;

  const confidence = activeRuleSet.verticalConfidence || 1.0;
  return confidence >= 0.6; // Only apply if 60%+ confidence
}
```

### Fallback Behavior

**Guarantee**: If override application fails, fall back to global behavior

**Pattern**:
```typescript
function applyOverrideOrFallback<T>(
  baseValue: T,
  overrideValue: T | undefined,
  validator: (value: T) => boolean
): T {
  if (overrideValue === undefined) return baseValue;
  if (!validator(overrideValue)) {
    console.warn('[Override] Validation failed, using base value');
    return baseValue;
  }
  return overrideValue;
}
```

### Logging Strategy

**Dev-Only Logging**:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[Override Applied]', {
    type: 'token_relevance',
    token: 'earn',
    baseRelevance: 0,
    overrideRelevance: 3,
    vertical: 'rewards'
  });
}
```

**Log Levels**:
- `[Override Applied]` - Successful override application
- `[Override Fallback]` - Fallback to global behavior
- `[Override Error]` - Override validation failed
- `[Leak Warning]` - Cross-vertical contamination detected

### Leak Detection

**Phase 8 leak detection remains active**:
- Warnings logged for cross-vertical pattern contamination
- Does NOT block scoring
- Logged in development mode only

---

## 6. Backwards Compatibility Strategy

### Guarantee 1: Undefined activeRuleSet

**Test Case**:
```typescript
// Should behave identical to Phase 9
const result1 = metadataAuditEngine.evaluate(metadata); // No locale
const result2 = metadataAuditEngine.evaluate(metadata, {}); // Empty options
const result3 = metadataAuditEngine.evaluate(metadata, { locale: undefined });

// All should use global patterns only
```

**Implementation**:
- All override application functions check `if (!activeRuleSet) return baseValue;`
- No override applied if activeRuleSet is undefined

### Guarantee 2: Missing Specific Overrides

**Test Case**:
```typescript
// Vertical detected but no tokenOverrides
const activeRuleSet: MergedRuleSet = {
  verticalId: 'entertainment',
  marketId: 'us',
  // tokenRelevanceOverrides: undefined
};

const relevance = getTokenRelevance('watch', activeRuleSet);
// Should use global pattern (relevance = 1)
```

**Implementation**:
- Each override check: `if (!activeRuleSet?.tokenRelevanceOverrides) return baseValue;`
- Partial overrides supported (e.g., only hookOverrides, no intentOverrides)

### Guarantee 3: Empty Overrides

**Test Case**:
```typescript
// Vertical has empty overrides
const activeRuleSet: MergedRuleSet = {
  verticalId: 'base',
  marketId: 'us',
  tokenRelevanceOverrides: {},
  hookOverrides: {},
  intentOverrides: {},
};

// Should use global patterns for all
```

**Implementation**:
- Empty override objects treated same as undefined
- Base vertical ('base') never has overrides

---

## 7. Implementation Checklist

### Phase 10.1 - Core Infrastructure

- [ ] **Create intentTypeMapping.ts**
  - [ ] Export `ComboIntentType` and `SearchIntentType` types
  - [ ] Implement `mapComboToSearchIntent()` bidirectional mapping
  - [ ] Add unit tests for mapping logic

- [ ] **Update getTokenRelevance signature**
  - [ ] Add `activeRuleSet?: MergedRuleSet` parameter
  - [ ] Implement override lookup logic
  - [ ] Add dev-mode logging
  - [ ] Update all 10+ call sites to pass `context.activeRuleSet`

- [ ] **Update EvaluationContext type**
  - [ ] Change `activeRuleSet?: any` to `activeRuleSet?: MergedRuleSet`
  - [ ] Add import for `MergedRuleSet` type

### Phase 10.2 - Hook Detection

- [ ] **Implement category-based hook scoring**
  - [ ] Create `calculateHookScore()` helper function
  - [ ] Update `description_hook_strength` rule evaluator (line 493)
  - [ ] Add weighted multi-category logic
  - [ ] Test with rewards vertical (outcome_benefit = 1.4)

### Phase 10.3 - KPI & Formula Overrides

- [ ] **Apply KPI weight overrides**
  - [ ] Create `applyKpiWeightOverride()` helper
  - [ ] Update `calculateOverallScore()` to apply element weight overrides
  - [ ] Update `evaluateElement()` to apply rule weight overrides
  - [ ] Add normalization logic after override application

- [ ] **Add formula override infrastructure**
  - [ ] Create `getFormulaWithOverrides()` function
  - [ ] Add multiplier support
  - [ ] Add component weight override support
  - [ ] Document but DO NOT integrate (Phase 11)

### Phase 10.4 - Recommendations

- [ ] **Implement vertical-first recommendation templates**
  - [ ] Create `getRecommendationMessage()` helper
  - [ ] Add `activeRuleSet` parameter to `generateEnhancedRecommendations()`
  - [ ] Update all recommendation message generators
  - [ ] Remove language-learning examples for unknown verticals

- [ ] **Update recommendation engine entry point**
  - [ ] Add `activeRuleSet` to `generateRecommendationsV2()` signature
  - [ ] Pass through to `generateEnhancedRecommendations()`

### Phase 10.5 - Stopwords

- [ ] **Implement stopword merging**
  - [ ] Create `getMergedStopwords()` helper in `tokenization.ts`
  - [ ] Merge base + market stopwords
  - [ ] Add dev-mode logging for additions
  - [ ] Update `metadataAuditEngine.ts:109-111` to use merged stopwords

### Phase 10.6 - Testing & Validation

- [ ] **Run TypeScript validation**
  - [ ] `npx tsc --noEmit` must pass
  - [ ] No type errors
  - [ ] No breaking changes to existing APIs

- [ ] **Smoke tests**
  - [ ] Test with no activeRuleSet (backward compat)
  - [ ] Test with empty overrides
  - [ ] Test with rewards vertical
  - [ ] Test with language_learning vertical
  - [ ] Test with finance vertical

- [ ] **Regression tests**
  - [ ] Load ASO Audit V2 page
  - [ ] Verify scores change when vertical detected
  - [ ] Verify global fallback when vertical unknown
  - [ ] Check console logs in dev mode

### Phase 10.7 - Documentation

- [ ] **Update inline comments**
  - [ ] Document all override application points
  - [ ] Add examples for each override type
  - [ ] Note backward compatibility guarantees

- [ ] **Create Phase 10 completion doc**
  - [ ] List all modified files
  - [ ] Document API changes
  - [ ] Provide before/after examples
  - [ ] Note any known limitations

---

## 8. Open Questions for Approval

### Question 1: Intent Mapping Strategy

**Decision Made**: Use mapping layer between combo and search intents

**Confirm**: Is this acceptable, or should we refactor combo classifier entirely?

### Question 2: Token Relevance Call Sites

**Decision Made**: Update all 10+ call sites to pass `activeRuleSet`

**Confirm**: This is a breaking change in function signature. Acceptable?

### Question 3: Hook Scoring Algorithm

**Decision Made**: Weighted average across matched categories

**Alternative**: Sum all category scores (could exceed 100)

**Confirm**: Weighted average acceptable?

### Question 4: KPI Weight Multiplier Bounds

**Decision Made**: Min 0.5x, Max 2.0x

**Alternatives**:
- Min 0.0x, Max 3.0x (more aggressive)
- Min 0.8x, Max 1.2x (more conservative)

**Confirm**: 0.5x-2.0x bounds acceptable?

### Question 5: Recommendation Template Fallback

**Decision Made**: Remove examples for unknown verticals

**Alternative**: Keep examples but mark as "generic"

**Confirm**: Example removal acceptable?

### Question 6: Formula Override Scope

**Decision Made**: Infrastructure only in Phase 10, full integration in Phase 11

**Confirm**: Deferring formula integration acceptable?

---

## 9. Summary Statistics

**Files to Modify**: 8 core files
- `src/engine/metadata/metadataAuditEngine.ts`
- `src/engine/metadata/metadataScoringRegistry.ts`
- `src/engine/metadata/metadataFormulaRegistry.ts`
- `src/engine/metadata/tokenization.ts`
- `src/engine/metadata/utils/recommendationEngineV2.ts`
- `src/utils/comboIntentClassifier.ts`
- `src/services/metadataConfigService.ts` (minimal)

**Files to Create**: 1 new file
- `src/utils/intentTypeMapping.ts`

**Estimated LOC Changes**: ~500 lines
- Token relevance: ~30 lines
- Hook detection: ~80 lines
- KPI overrides: ~120 lines
- Recommendations: ~150 lines
- Stopwords: ~30 lines
- Intent mapping: ~40 lines
- Tests & docs: ~50 lines

**Backward Compatibility**: ✅ 100%
- All changes are additive
- Undefined activeRuleSet = Phase 9 behavior
- No breaking API changes (except optional params)

**Risk Level**: LOW
- Pure function changes only
- No UI modifications
- No external dependencies
- Deterministic scoring preserved

---

**END OF SPECIFICATION**

**Status**: 📋 Ready for review and approval

**Next Step**: Await user approval before beginning implementation
