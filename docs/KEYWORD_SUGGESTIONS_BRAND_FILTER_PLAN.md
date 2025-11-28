# Keyword Suggestions: Brand Filter & Backend Migration Plan

## Executive Summary

**Problem**: Keyword Suggestions currently shows BRANDED keywords (e.g., "Inspire app", "Inspire wellness") in categories like "Missing Opportunities" and "High Value 70+". These branded terms don't help with algorithmic visibility because brand awareness comes from marketing, not ASO optimization.

**Goal**: Filter out ALL branded keyword combinations, showing only GENERIC search terms that users actually search for without brand awareness.

**Current State**:
- ✅ Frontend-only logic (`comboGenerationEngine.ts`, `comboPriorityScorer.ts`)
- ✅ Scoring works (priority_score formula)
- ❌ No brand filtering
- ❌ All processing happens client-side (performance concern)

**Target State**:
- ✅ Backend edge function processes combos
- ✅ Brand filter removes branded combos
- ✅ Frontend fallback for offline/errors
- ✅ Scalable architecture

---

## Current Architecture Audit

### 1. **Combo Generation** (`src/engine/combos/comboGenerationEngine.ts`)

**Location**: Frontend
**Performance Budget**: ~MAX_COMBOS_PER_SOURCE = 500 combos per source

**How it works**:
```typescript
analyzeAllCombos(
  titleKeywords,      // e.g., ["inspire", "self", "care", "wellness"]
  subtitleKeywords,   // e.g., ["daily", "healthy", "habits", "routine"]
  title,              // "Inspire - Self Care & Wellness"
  subtitle,           // "Daily Healthy Habits & Routine"
  existingCombos      // Already classified combos from title
)
```

**Output**:
- `allPossibleCombos`: Every 2-4 word combination
- `missingCombos`: Combos NOT in current metadata
- `existingCombos`: Combos already present

**Strategic Value Calculation** (line 239):
```typescript
function calculateStrategicValue(combo: string, keywords: string[]): number {
  let score = 50; // Base score

  // Longer combos are more specific and valuable
  const length = keywords.length;
  if (length === 2) score += 10;
  if (length === 3) score += 20;
  if (length === 4) score += 15;

  // TODO: Integrate with ASO Bible to get real strategic scores

  return Math.min(100, Math.max(0, score));
}
```

**Issue**: Basic heuristic only (length-based). No brand filtering.

---

### 2. **Combo Priority Scoring** (`src/engine/combos/comboPriorityScorer.ts`)

**Location**: Frontend
**Performance Budget**: +50ms for all combos

**Formula** (V2.1 approved):
```typescript
priority_score = (
  semantic_relevance * 0.30 +
  length_score * 0.25 +
  brand_hybrid_bonus * 0.20 +
  novelty_score * 0.15 +
  (100 - noise_confidence) * 0.10
)
```

**Key Function**: `isBrandHybrid(combo)` (line 124)
```typescript
function isBrandHybrid(combo: ClassifiedCombo): boolean {
  // Check if brand classification exists (Phase 5 Brand Intelligence)
  if (combo.brandClassification) {
    return (
      combo.brandClassification === 'generic' && !!combo.matchedBrandAlias
    );
  }

  // Fallback: Check combo type
  return combo.type === 'branded';
}
```

**Issue**: Brand hybrid BONUS (gives +20 to score), but we want to EXCLUDE branded combos entirely from generic suggestions.

---

### 3. **Keyword Suggestions UI** (`src/components/AppAudit/KeywordComboWorkbench/EnhancedKeywordComboWorkbench.tsx`)

**Location**: Frontend
**Renders** (line 187):
```typescript
const keywordSuggestions = useMemo(() => {
  const all = comboAnalysis.allPossibleCombos;

  return {
    missing: all.filter(c => !c.exists),
    highValue: all.filter(c => (c.strategicValue || 0) >= 70),
    mediumValue: all.filter(c => {
      const val = c.strategicValue || 0;
      return val >= 50 && val < 70;
    }),
    lowValue: all.filter(c => (c.strategicValue || 0) < 50 && (c.strategicValue || 0) > 0),
    longTail: all.filter(c => c.length >= 3),
  };
}, [comboAnalysis]);
```

**Displays**:
- 🚨 **Missing Opportunities** (132) - Combos not in metadata
- ⭐ **High Value 70+** (56) - priority_score >= 70
- 📊 **Medium Value 50-69** (X)
- 📉 **Low Value <50** (X)
- 🎯 **Long-Tail 3+ words** (X)

**Issue**: No brand filtering in these categories.

---

## Problem Analysis

### What is a "Branded Keyword"?

**Definition**: Any keyword combination containing the app's brand name or variations.

**Examples** (for "Inspire" app):
```
✅ GENERIC (what we want):
- "self care wellness"
- "daily habits routine"
- "healthy mindfulness"

❌ BRANDED (filter out):
- "inspire app"              // Brand + generic modifier
- "inspire self care"        // Brand + category keyword
- "inspire wellness"         // Brand + feature
- "inspire meditation"       // Brand + vertical keyword
```

**Why filter branded keywords?**
1. **Brand searches come from marketing**, not ASO
2. **User must already know brand** to search "Inspire app"
3. **Wastes metadata space** - title/subtitle should target generic discovery
4. **Misleading metrics** - "Inspire app" may have high search volume, but only from existing users

**The Goal**: Show ONLY generic keyword opportunities that drive NEW user discovery.

---

## Solution Architecture

### Phase 1: Frontend Brand Filter (Quick Win)

**Timeline**: 1-2 days
**Location**: Frontend
**Goal**: Immediately filter branded combos from suggestions

#### Implementation

**1. Detect Brand Name** (use existing `brandDetector.ts`):
```typescript
// Get brand from user override or auto-detect
const appBrand = brandOverride || detectBrand(metadata.title);
// Example: "Inspire"
```

**2. Create Brand Filter Function** (`src/utils/brandFilter.ts`):
```typescript
/**
 * Check if combo contains branded keywords
 *
 * @param comboText - e.g., "inspire self care"
 * @param brandName - e.g., "Inspire"
 * @returns true if branded, false if generic
 */
export function isGenericCombo(
  comboText: string,
  brandName: string | null
): boolean {
  if (!brandName) return true; // No brand = all generic

  const normalized = comboText.toLowerCase();
  const brand = brandName.toLowerCase();

  // Simple check: does combo contain brand word?
  const words = normalized.split(/\s+/);
  return !words.includes(brand);
}

/**
 * Filter combos to only generic (non-branded)
 */
export function filterGenericCombos(
  combos: GeneratedCombo[],
  brandName: string | null
): GeneratedCombo[] {
  return combos.filter(combo => isGenericCombo(combo.text, brandName));
}
```

**3. Update `comboGenerationEngine.ts`**:
```typescript
export function analyzeAllCombos(
  titleKeywords: string[],
  subtitleKeywords: string[],
  title: string,
  subtitle: string,
  existingCombos: ClassifiedCombo[],
  brandName?: string | null  // NEW PARAM
): ComboAnalysis {
  // ... existing logic ...

  // Filter out branded combos BEFORE returning
  const genericCombos = filterGenericCombos(allPossibleCombos, brandName);
  const genericMissing = filterGenericCombos(missingCombos, brandName);

  return {
    allPossibleCombos: genericCombos,
    existingCombos,  // Keep existing (already in metadata)
    missingCombos: genericMissing,
    recommendedToAdd: genericCombos.filter(c => !c.exists && (c.strategicValue || 0) >= 70),
    stats: {
      totalPossible: genericCombos.length,
      existing: existingCombos.length,
      missing: genericMissing.length,
      highValue: genericCombos.filter(c => (c.strategicValue || 0) >= 70).length,
    },
  };
}
```

**4. Update `EnhancedKeywordComboWorkbench.tsx`**:
```typescript
// Get brand from context
const appBrand = useMemo(() => {
  return brandOverride || detectBrand(metadata.title);
}, [metadata.title, brandOverride]);

// Pass brand to analysis
const comboAnalysis = useMemo(() => {
  return analyzeAllCombos(
    keywordCoverage.titleKeywords,
    keywordCoverage.subtitleNewKeywords,
    metadata.title,
    metadata.subtitle,
    comboCoverage.titleCombosClassified,
    appBrand  // NEW
  );
}, [keywordCoverage, metadata, comboCoverage, appBrand]);
```

**Testing**:
```typescript
// Example: "Inspire - Self Care & Wellness"
const brand = "Inspire";

// Before filtering:
allPossibleCombos = [
  { text: "inspire app", exists: false, strategicValue: 75 },
  { text: "inspire self care", exists: false, strategicValue: 80 },
  { text: "self care wellness", exists: true, strategicValue: 85 },
  { text: "daily habits", exists: false, strategicValue: 70 },
]

// After filtering:
allPossibleCombos = [
  { text: "self care wellness", exists: true, strategicValue: 85 },
  { text: "daily habits", exists: false, strategicValue: 70 },
]

// Missing Opportunities now shows:
// - "daily habits" ✅ (generic)
// NOT "inspire app" ❌ (branded)
```

**Benefits**:
- ✅ Immediate improvement
- ✅ No backend changes
- ✅ Works offline
- ✅ Simple to implement

**Limitations**:
- ❌ Client-side performance (all combos generated)
- ❌ Limited brand detection (simple word matching)
- ❌ No competitor brand filtering

---

### Phase 2: Backend Pipeline with Fallback (Scalable)

**Timeline**: 1-2 weeks
**Location**: Supabase Edge Function
**Goal**: Move heavy processing to backend, keep frontend fallback

#### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND REQUEST                      │
│  User runs audit → metadata-audit-v2 edge function      │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│              BACKEND: metadata-audit-v2                  │
│  Location: supabase/functions/metadata-audit-v2/index.ts│
│                                                          │
│  1. Extract keywords from title + subtitle              │
│  2. Generate ALL possible combos (2-4 words)            │
│  3. Detect brand name from title                        │
│  4. Filter branded combos → keep ONLY generic           │
│  5. Score combos (priority_score formula)               │
│  6. Classify: missing, high value, medium, low          │
│  7. Return to frontend                                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│         FRONTEND: Display Keyword Suggestions            │
│  Location: EnhancedKeywordComboWorkbench.tsx            │
│                                                          │
│  - Receives pre-filtered generic combos                 │
│  - Displays: Missing Opportunities, High Value, etc.    │
│  - Fallback: If backend fails, use local generation     │
└─────────────────────────────────────────────────────────┘
```

#### Implementation

**1. Create Backend Module** (`supabase/functions/_shared/comboSuggestionEngine.ts`):

```typescript
/**
 * Backend Combo Suggestion Engine
 *
 * Generates generic (non-branded) keyword suggestions
 * for ASO optimization opportunities.
 */

import { detectBrand } from './brandDetector.ts';

interface ComboSuggestion {
  text: string;
  keywords: string[];
  length: number;
  exists: boolean;
  strategicValue: number;
  category: 'missing' | 'highValue' | 'mediumValue' | 'lowValue' | 'longTail';
}

/**
 * Generate generic keyword suggestions (branded combos filtered out)
 */
export async function generateComboSuggestions(params: {
  titleKeywords: string[];
  subtitleKeywords: string[];
  title: string;
  subtitle: string;
  existingCombos: string[];
  brandOverride?: string | null;
}): Promise<{
  suggestions: ComboSuggestion[];
  brandName: string | null;
  stats: {
    totalGenerated: number;
    brandedFiltered: number;
    genericKept: number;
    missing: number;
    highValue: number;
  };
}> {
  // 1. Detect brand
  const brandName = params.brandOverride || detectBrand(params.title);

  // 2. Generate all combos
  const allCombos = generateAllCombinations(
    params.titleKeywords,
    params.subtitleKeywords
  );

  // 3. Filter branded combos
  const genericCombos = allCombos.filter(combo =>
    isGenericCombo(combo.text, brandName)
  );

  // 4. Score and categorize
  const suggestions = genericCombos.map(combo => ({
    ...combo,
    strategicValue: calculateStrategicValue(combo.text, combo.keywords),
    exists: params.existingCombos.includes(combo.text),
  })).map(combo => ({
    ...combo,
    category: categorizeSuggestion(combo),
  }));

  // 5. Stats
  return {
    suggestions,
    brandName,
    stats: {
      totalGenerated: allCombos.length,
      brandedFiltered: allCombos.length - genericCombos.length,
      genericKept: genericCombos.length,
      missing: suggestions.filter(s => !s.exists).length,
      highValue: suggestions.filter(s => s.strategicValue >= 70).length,
    },
  };
}

function isGenericCombo(comboText: string, brandName: string | null): boolean {
  if (!brandName) return true;

  const normalized = comboText.toLowerCase();
  const brand = brandName.toLowerCase();
  const words = normalized.split(/\s+/);

  return !words.includes(brand);
}

function categorizeSuggestion(combo: any): string {
  if (!combo.exists) return 'missing';
  if (combo.strategicValue >= 70) return 'highValue';
  if (combo.strategicValue >= 50) return 'mediumValue';
  if (combo.length >= 3) return 'longTail';
  return 'lowValue';
}
```

**2. Update `metadata-audit-v2/index.ts`**:

```typescript
import { generateComboSuggestions } from '../_shared/comboSuggestionEngine.ts';

// ... existing audit logic ...

// Generate combo suggestions
const comboSuggestions = await generateComboSuggestions({
  titleKeywords: rankingTokens.titleTokens,
  subtitleKeywords: rankingTokens.subtitleNewTokens,
  title: metadata.title,
  subtitle: metadata.subtitle,
  existingCombos: titleCombos.map(c => c.text),
  brandOverride: null, // Or from user settings
});

// Return in audit result
return {
  ...existingAuditResult,
  comboSuggestions,  // NEW
};
```

**3. Update Frontend with Fallback** (`EnhancedKeywordComboWorkbench.tsx`):

```typescript
const comboAnalysis = useMemo(() => {
  // Try to use backend suggestions first
  if (auditResult.comboSuggestions) {
    return {
      allPossibleCombos: auditResult.comboSuggestions.suggestions,
      missingCombos: auditResult.comboSuggestions.suggestions.filter(s => !s.exists),
      // ... map backend data to frontend format
    };
  }

  // Fallback: Frontend generation
  console.warn('Backend suggestions unavailable, using client-side generation');
  return analyzeAllCombos(
    keywordCoverage.titleKeywords,
    keywordCoverage.subtitleNewKeywords,
    metadata.title,
    metadata.subtitle,
    comboCoverage.titleCombosClassified,
    appBrand
  );
}, [auditResult, keywordCoverage, metadata, comboCoverage, appBrand]);
```

**Benefits**:
- ✅ Backend processing (scalable)
- ✅ Frontend fallback (resilient)
- ✅ Better brand detection (can use more advanced logic)
- ✅ Consistent results across sessions

**Limitations**:
- ❌ Requires backend deployment
- ❌ More complex architecture
- ❌ Still basic brand filtering (word matching)

---

### Phase 3: Advanced Brand Intelligence (Future)

**Timeline**: 2-4 weeks
**Goal**: Sophisticated brand detection with competitor filtering

#### Features

**1. Brand Alias Detection**:
```typescript
const brandAliases = [
  "inspire",
  "inspire app",
  "inspireapp",
  "the inspire app",
];

function isGenericCombo(comboText: string, brandAliases: string[]): boolean {
  const normalized = comboText.toLowerCase();
  return !brandAliases.some(alias => normalized.includes(alias));
}
```

**2. Competitor Brand Filtering**:
```typescript
const competitorBrands = [
  "calm",
  "headspace",
  "betterhelp",
  // ... from category analysis
];

function isGenericCombo(comboText: string, brandAliases: string[], competitors: string[]): boolean {
  const normalized = comboText.toLowerCase();

  // Filter own brand
  const hasOwnBrand = brandAliases.some(alias => normalized.includes(alias));

  // Filter competitor brands
  const hasCompetitorBrand = competitors.some(comp => normalized.includes(comp));

  return !hasOwnBrand && !hasCompetitorBrand;
}
```

**3. ASO Bible Integration**:
- Real search volume data
- Category-specific keywords
- Vertical keyword matching
- Search intent classification

**4. Machine Learning Scoring**:
- Predict combo search volume
- Estimate conversion potential
- Identify "blue ocean" opportunities

---

## Implementation Roadmap

### Sprint 1: Frontend Brand Filter (Phase 1)
**Duration**: 1-2 days
**Priority**: HIGH

**Tasks**:
1. ✅ Create `src/utils/brandFilter.ts` with `isGenericCombo()` and `filterGenericCombos()`
2. ✅ Update `comboGenerationEngine.ts` to accept `brandName` param and filter branded combos
3. ✅ Update `EnhancedKeywordComboWorkbench.tsx` to detect brand and pass to analysis
4. ✅ Test with real app data (verify branded combos filtered)
5. ✅ Document in user-facing docs

**Success Criteria**:
- "Missing Opportunities" shows ONLY generic combos
- "High Value 70+" shows ONLY generic combos
- Branded combos like "inspire app" do NOT appear

---

### Sprint 2: Backend Pipeline (Phase 2)
**Duration**: 1-2 weeks
**Priority**: MEDIUM

**Tasks**:
1. ✅ Create `supabase/functions/_shared/comboSuggestionEngine.ts`
2. ✅ Implement `generateComboSuggestions()` with brand filtering
3. ✅ Update `metadata-audit-v2/index.ts` to generate and return suggestions
4. ✅ Update frontend to consume backend suggestions with fallback
5. ✅ Deploy and test edge function
6. ✅ Monitor performance (latency, error rate)

**Success Criteria**:
- Backend returns pre-filtered suggestions
- Frontend fallback works if backend fails
- Latency < 500ms for combo generation

---

### Sprint 3: Advanced Intelligence (Phase 3)
**Duration**: 2-4 weeks
**Priority**: LOW

**Tasks**:
1. ☐ Implement brand alias detection
2. ☐ Build competitor brand database
3. ☐ Integrate ASO Bible vertical keywords
4. ☐ Add ML-based scoring (optional)
5. ☐ A/B test suggestions quality

**Success Criteria**:
- Detects brand variations (e.g., "InspireApp", "The Inspire App")
- Filters competitor brands
- Provides search volume estimates

---

## Testing Strategy

### Unit Tests

**Frontend (`brandFilter.test.ts`)**:
```typescript
describe('isGenericCombo', () => {
  it('filters brand name from combo', () => {
    expect(isGenericCombo('inspire app', 'Inspire')).toBe(false);
    expect(isGenericCombo('self care', 'Inspire')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isGenericCombo('INSPIRE APP', 'inspire')).toBe(false);
  });

  it('handles no brand', () => {
    expect(isGenericCombo('self care', null)).toBe(true);
  });
});
```

**Backend (`comboSuggestionEngine.test.ts`)**:
```typescript
describe('generateComboSuggestions', () => {
  it('filters branded combos', async () => {
    const result = await generateComboSuggestions({
      titleKeywords: ['inspire', 'self', 'care'],
      subtitleKeywords: ['daily', 'habits'],
      title: 'Inspire - Self Care',
      subtitle: 'Daily Habits',
      existingCombos: [],
    });

    // Should NOT include "inspire app", "inspire self", etc.
    expect(result.suggestions.every(s => !s.text.includes('inspire'))).toBe(true);
  });
});
```

### Integration Tests

**End-to-End Flow**:
1. Run audit for "Inspire - Self Care & Wellness"
2. Backend generates suggestions
3. Verify "Missing Opportunities" contains ONLY generic combos
4. Verify "High Value 70+" contains ONLY generic combos
5. Verify no combo contains "inspire"

---

## Monitoring & Metrics

### Key Metrics

**Before Implementation**:
- Missing Opportunities: 132 (many branded)
- High Value 70+: 56 (many branded)

**After Phase 1**:
- Missing Opportunities: ~80 (all generic) ✅
- High Value 70+: ~30 (all generic) ✅
- Branded combos filtered: ~50 ✅

**Performance**:
- Combo generation latency: <100ms (frontend)
- Combo generation latency: <500ms (backend)

**User Satisfaction**:
- % users adding suggested combos: Track increase
- Feedback on suggestion quality: Survey

---

## Open Questions

1. **Should we show filtered branded combos separately?**
   - Option A: Hide completely (recommended)
   - Option B: Show in collapsed "Branded Combos" section for reference

2. **Should we filter competitor brands?**
   - Example: "calm meditation" if user searches competitors
   - Pros: More focused on truly generic terms
   - Cons: May miss comparative search opportunities

3. **Should we allow user to toggle brand filtering?**
   - Advanced users may want to see all combos
   - Add "Show Branded Combos" checkbox?

4. **What about partial brand matches?**
   - Example: "inspired" vs "inspire"
   - Use fuzzy matching or strict word boundary?

---

## Success Criteria

### Phase 1 (Frontend)
- ✅ No branded combos in "Missing Opportunities"
- ✅ No branded combos in "High Value 70+"
- ✅ User can see only generic keyword suggestions
- ✅ No performance regression (<100ms)

### Phase 2 (Backend)
- ✅ Backend generates suggestions in <500ms
- ✅ Frontend fallback works if backend unavailable
- ✅ 99% uptime for suggestion endpoint

### Phase 3 (Advanced)
- ✅ Detects brand aliases
- ✅ Filters competitor brands
- ✅ Provides search volume estimates
- ✅ Improves conversion rate for suggested combos

---

## Appendix: Code Locations

### Frontend
- **Combo Generation**: `src/engine/combos/comboGenerationEngine.ts`
- **Priority Scoring**: `src/engine/combos/comboPriorityScorer.ts`
- **UI Component**: `src/components/AppAudit/KeywordComboWorkbench/EnhancedKeywordComboWorkbench.tsx`
- **Brand Detection**: `src/utils/brandDetector.ts`

### Backend
- **Main Audit Function**: `supabase/functions/metadata-audit-v2/index.ts`
- **Shared Utils**: `supabase/functions/_shared/`

### New Files (To Create)
- `src/utils/brandFilter.ts` (Phase 1)
- `supabase/functions/_shared/comboSuggestionEngine.ts` (Phase 2)
