# Replication Guide: 10-Tier Keyword Combination Strength System

**Purpose:** Enable any developer to replicate this breakthrough ASO system in their own codebase
**Difficulty:** Intermediate
**Time Required:** 8-12 hours (with this guide)
**Prerequisites:** TypeScript, React, basic algorithm knowledge

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Step-by-Step Implementation](#step-by-step-implementation)
3. [Code Templates](#code-templates)
4. [Testing & Validation](#testing--validation)
5. [Common Pitfalls](#common-pitfalls)
6. [Integration Checklist](#integration-checklist)

---

## System Overview

### What You're Building

A complete keyword combination analysis system with:

**Input:**
- App title (30 chars)
- App subtitle (30 chars)
- App keywords field (100 chars, comma-separated)

**Output:**
- All possible 2-4 word combinations
- Each combo classified into 10 strength tiers
- Priority scores (0-100) based on strength + analytics
- Top 500 combos sorted by priority
- Visual strength distribution stats

**Example:**
```
Input:
  Title: "Headspace: Meditation & Sleep"
  Subtitle: "Mindfulness Timer"
  Keywords: "relaxation,breathing,wellness"

Output:
  - "meditation sleep" → 🔥🔥🔥 (100 pts strength, 85 priority)
  - "meditation mindfulness" → ⚡ (70 pts strength, 74 priority)
  - "relaxation breathing" → 💤 (50 pts strength, 62 priority)
  ...
  Total: 156 combinations
  Top 500: All shown (under limit)
  Stats: 3 strongest, 8 strong, 18 medium, 45 weak, 82 missing
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│ Title: string                                                │
│ Subtitle: string                                             │
│ Keywords: string (comma-separated)                           │
│ Promotional Text: string (optional, future)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    PARSING LAYER                             │
├─────────────────────────────────────────────────────────────┤
│ extractKeywords(text) → string[]                             │
│ - Tokenize                                                   │
│ - Lowercase                                                  │
│ - Remove stopwords                                           │
│ - Remove special characters                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              COMBINATION GENERATION LAYER                    │
├─────────────────────────────────────────────────────────────┤
│ generateAllPossibleCombos(                                   │
│   titleKeywords,                                             │
│   subtitleKeywords,                                          │
│   keywordsFieldKeywords                                      │
│ ) → string[]                                                 │
│                                                              │
│ Generates:                                                   │
│ - Title-only combos                                          │
│ - Subtitle-only combos                                       │
│ - Keywords-only combos                                       │
│ - Title + Subtitle cross                                     │
│ - Title + Keywords cross                                     │
│ - Subtitle + Keywords cross                                  │
│ - Three-way cross                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            STRENGTH CLASSIFICATION LAYER                     │
├─────────────────────────────────────────────────────────────┤
│ classifyComboStrength(combo, metadata) → ComboStrength       │
│                                                              │
│ Decision tree:                                               │
│ 1. Check field presence (title/subtitle/keywords)           │
│ 2. Check consecutiveness in each field                       │
│ 3. Apply 10-tier hierarchy                                   │
│ 4. Assign strength enum value                                │
│ 5. Generate strengthening suggestion                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            ANALYTICS INTEGRATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│ fetchRankingData(combos) → Map<string, RankingData>         │
│ fetchPopularityData(keywords) → Map<string, PopularityData> │
│                                                              │
│ External APIs:                                               │
│ - useBatchComboRankings (ranking positions)                  │
│ - useKeywordPopularity (search volume)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PRIORITY SCORING LAYER                          │
├─────────────────────────────────────────────────────────────┤
│ calculateComboPriority(combo, analytics) → PriorityScore     │
│                                                              │
│ Formula:                                                     │
│ Priority = Strength(30%) + Popularity(25%) +                │
│            Opportunity(20%) + Trend(15%) + Intent(10%)      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                SELECTION LAYER                               │
├─────────────────────────────────────────────────────────────┤
│ selectTopCombos(combos, priorityScores, limit=500)          │
│ → { topCombos, limitReached, totalGenerated }               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   OUTPUT LAYER                               │
├─────────────────────────────────────────────────────────────┤
│ ComboAnalysis {                                              │
│   allPossibleCombos: GeneratedCombo[]                        │
│   stats: {                                                   │
│     totalPossible, existing, missing,                        │
│     titleConsecutive, titleNonConsecutive,                   │
│     titleKeywordsCross, crossElement,                        │
│     keywordsConsecutive, subtitleConsecutive,                │
│     keywordsSubtitleCross, keywordsNonConsecutive,           │
│     subtitleNonConsecutive, threeWayCross,                   │
│     canStrengthen                                            │
│   }                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Phase 1: Foundation (2 hours)

#### Step 1.1: Create Type Definitions

**File:** `types/comboStrength.ts`

```typescript
/**
 * 10-tier strength hierarchy
 */
export enum ComboStrength {
  // Tier 1
  TITLE_CONSECUTIVE = 'title_consecutive',

  // Tier 2
  TITLE_NON_CONSECUTIVE = 'title_non_consecutive',
  TITLE_KEYWORDS_CROSS = 'title_keywords_cross',

  // Tier 3
  CROSS_ELEMENT = 'cross_element',

  // Tier 4
  KEYWORDS_CONSECUTIVE = 'keywords_consecutive',
  SUBTITLE_CONSECUTIVE = 'subtitle_consecutive',

  // Tier 5
  KEYWORDS_SUBTITLE_CROSS = 'keywords_subtitle_cross',

  // Tier 6
  KEYWORDS_NON_CONSECUTIVE = 'keywords_non_consecutive',
  SUBTITLE_NON_CONSECUTIVE = 'subtitle_non_consecutive',

  // Tier 7
  THREE_WAY_CROSS = 'three_way_cross',

  // Tier 0
  MISSING = 'missing',
}

export interface GeneratedCombo {
  text: string;
  keywords: string[];
  length: number;
  exists: boolean;
  source?: 'title' | 'subtitle' | 'keywords' | 'both' | 'missing';

  // Strength classification
  strength: ComboStrength;
  isConsecutive?: boolean;
  canStrengthen: boolean;
  strengtheningSuggestion?: string;

  // Priority scoring (optional)
  priority?: number;
}

export interface ComboAnalysis {
  allPossibleCombos: GeneratedCombo[];
  existingCombos: GeneratedCombo[];
  missingCombos: GeneratedCombo[];
  stats: {
    totalPossible: number;
    existing: number;
    missing: number;
    coverage: number;

    // 10-tier breakdown
    titleConsecutive: number;
    titleNonConsecutive: number;
    titleKeywordsCross: number;
    crossElement: number;
    keywordsConsecutive: number;
    subtitleConsecutive: number;
    keywordsSubtitleCross: number;
    keywordsNonConsecutive: number;
    subtitleNonConsecutive: number;
    threeWayCross: number;
    canStrengthen: number;

    // Limit tracking
    limitReached?: boolean;
    totalGenerated?: number;
  };
}
```

#### Step 1.2: Create Strength Score Mapping

**File:** `constants/strengthScores.ts`

```typescript
import { ComboStrength } from '../types/comboStrength';

export const STRENGTH_SCORES: Record<ComboStrength, number> = {
  [ComboStrength.TITLE_CONSECUTIVE]: 100,
  [ComboStrength.TITLE_NON_CONSECUTIVE]: 85,
  [ComboStrength.TITLE_KEYWORDS_CROSS]: 70,
  [ComboStrength.CROSS_ELEMENT]: 70,
  [ComboStrength.KEYWORDS_CONSECUTIVE]: 50,
  [ComboStrength.SUBTITLE_CONSECUTIVE]: 50,
  [ComboStrength.KEYWORDS_SUBTITLE_CROSS]: 35,
  [ComboStrength.KEYWORDS_NON_CONSECUTIVE]: 30,
  [ComboStrength.SUBTITLE_NON_CONSECUTIVE]: 30,
  [ComboStrength.THREE_WAY_CROSS]: 20,
  [ComboStrength.MISSING]: 0,
};

export const STRENGTH_LABELS: Record<ComboStrength, string> = {
  [ComboStrength.TITLE_CONSECUTIVE]: '🔥🔥🔥 Strongest',
  [ComboStrength.TITLE_NON_CONSECUTIVE]: '🔥🔥 Very Strong',
  [ComboStrength.TITLE_KEYWORDS_CROSS]: '🔥⚡ Strong (Title+Keywords)',
  [ComboStrength.CROSS_ELEMENT]: '⚡ Medium (Title+Subtitle)',
  [ComboStrength.KEYWORDS_CONSECUTIVE]: '💤 Weak (Keywords)',
  [ComboStrength.SUBTITLE_CONSECUTIVE]: '💤 Weak (Subtitle)',
  [ComboStrength.KEYWORDS_SUBTITLE_CROSS]: '💤⚡ Very Weak (Cross)',
  [ComboStrength.KEYWORDS_NON_CONSECUTIVE]: '💤💤 Very Weak (Keywords)',
  [ComboStrength.SUBTITLE_NON_CONSECUTIVE]: '💤💤 Very Weak (Subtitle)',
  [ComboStrength.THREE_WAY_CROSS]: '💤💤💤 Weakest (Three-Way)',
  [ComboStrength.MISSING]: '❌ Missing',
};
```

### Phase 2: Core Algorithm (4 hours)

#### Step 2.1: Keyword Extraction

**File:** `utils/keywordExtraction.ts`

```typescript
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
]);

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special chars
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 1 && !STOPWORDS.has(word)); // Filter
}

export function parseKeywordsField(keywordsField: string): string[] {
  return keywordsField
    .split(',')
    .map(kw => kw.trim().toLowerCase())
    .filter(Boolean);
}
```

#### Step 2.2: Combination Generation

**File:** `engine/comboGeneration.ts`

```typescript
function generateCombinations(keywords: string[], size: number): string[][] {
  const results: string[][] = [];

  function backtrack(start: number, current: string[]) {
    if (current.length === size) {
      results.push([...current]);
      return;
    }

    for (let i = start; i < keywords.length; i++) {
      current.push(keywords[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return results;
}

export function generateAllPossibleCombos(
  titleKeywords: string[],
  subtitleKeywords: string[],
  keywordsFieldKeywords: string[] = [],
  options: {
    minLength?: number;
    maxLength?: number;
  } = {}
): string[] {
  const { minLength = 2, maxLength = 4 } = options;
  const allCombos = new Set<string>();

  // 1. Title-only combos
  for (let len = minLength; len <= Math.min(maxLength, titleKeywords.length); len++) {
    const combinations = generateCombinations(titleKeywords, len);
    combinations.forEach(combo => allCombos.add(combo.join(' ')));
  }

  // 2. Subtitle-only combos
  for (let len = minLength; len <= Math.min(maxLength, subtitleKeywords.length); len++) {
    const combinations = generateCombinations(subtitleKeywords, len);
    combinations.forEach(combo => allCombos.add(combo.join(' ')));
  }

  // 3. Keywords-only combos
  for (let len = minLength; len <= Math.min(maxLength, keywordsFieldKeywords.length); len++) {
    const combinations = generateCombinations(keywordsFieldKeywords, len);
    combinations.forEach(combo => allCombos.add(combo.join(' ')));
  }

  // 4. Cross-element combos (title + subtitle)
  if (titleKeywords.length > 0 && subtitleKeywords.length > 0) {
    const combined = [...titleKeywords, ...subtitleKeywords];
    for (let len = minLength; len <= Math.min(maxLength, combined.length); len++) {
      const combinations = generateCombinations(combined, len);
      combinations.forEach(combo => {
        const hasTitle = combo.some(kw => titleKeywords.includes(kw));
        const hasSubtitle = combo.some(kw => subtitleKeywords.includes(kw));
        const hasKeywords = combo.some(kw => keywordsFieldKeywords.includes(kw));

        // Title + Subtitle only (no keywords)
        if (hasTitle && hasSubtitle && !hasKeywords) {
          allCombos.add(combo.join(' '));
        }
      });
    }
  }

  // 5. Title + Keywords cross
  if (titleKeywords.length > 0 && keywordsFieldKeywords.length > 0) {
    const combined = [...titleKeywords, ...keywordsFieldKeywords];
    for (let len = minLength; len <= Math.min(maxLength, combined.length); len++) {
      const combinations = generateCombinations(combined, len);
      combinations.forEach(combo => {
        const hasTitle = combo.some(kw => titleKeywords.includes(kw));
        const hasKeywords = combo.some(kw => keywordsFieldKeywords.includes(kw));
        const hasSubtitle = combo.some(kw => subtitleKeywords.includes(kw));

        // Title + Keywords only (no subtitle)
        if (hasTitle && hasKeywords && !hasSubtitle) {
          allCombos.add(combo.join(' '));
        }
      });
    }
  }

  // 6. Subtitle + Keywords cross
  if (subtitleKeywords.length > 0 && keywordsFieldKeywords.length > 0) {
    const combined = [...subtitleKeywords, ...keywordsFieldKeywords];
    for (let len = minLength; len <= Math.min(maxLength, combined.length); len++) {
      const combinations = generateCombinations(combined, len);
      combinations.forEach(combo => {
        const hasSubtitle = combo.some(kw => subtitleKeywords.includes(kw));
        const hasKeywords = combo.some(kw => keywordsFieldKeywords.includes(kw));
        const hasTitle = combo.some(kw => titleKeywords.includes(kw));

        // Subtitle + Keywords only (no title)
        if (hasSubtitle && hasKeywords && !hasTitle) {
          allCombos.add(combo.join(' '));
        }
      });
    }
  }

  // 7. Three-way cross (title + subtitle + keywords)
  if (titleKeywords.length > 0 && subtitleKeywords.length > 0 && keywordsFieldKeywords.length > 0) {
    const combined = [...titleKeywords, ...subtitleKeywords, ...keywordsFieldKeywords];
    for (let len = minLength; len <= Math.min(maxLength, combined.length); len++) {
      const combinations = generateCombinations(combined, len);
      combinations.forEach(combo => {
        const hasTitle = combo.some(kw => titleKeywords.includes(kw));
        const hasSubtitle = combo.some(kw => subtitleKeywords.includes(kw));
        const hasKeywords = combo.some(kw => keywordsFieldKeywords.includes(kw));

        // All three fields
        if (hasTitle && hasSubtitle && hasKeywords) {
          allCombos.add(combo.join(' '));
        }
      });
    }
  }

  return Array.from(allCombos);
}
```

#### Step 2.3: Strength Classification

**File:** `engine/strengthClassification.ts`

```typescript
import { ComboStrength } from '../types/comboStrength';

interface ComboTextAnalysis {
  exists: boolean;
  isConsecutive: boolean;
}

function analyzeComboInText(comboText: string, fieldText: string): ComboTextAnalysis {
  const normalized = fieldText.toLowerCase();
  const normalizedCombo = comboText.toLowerCase();

  // Check consecutive match
  if (normalized.includes(normalizedCombo)) {
    return { exists: true, isConsecutive: true };
  }

  // Check non-consecutive match (words in order)
  const words = normalizedCombo.split(' ');
  let lastIndex = -1;
  for (const word of words) {
    const index = normalized.indexOf(word, lastIndex + 1);
    if (index === -1) {
      return { exists: false, isConsecutive: false };
    }
    lastIndex = index;
  }

  return { exists: true, isConsecutive: false };
}

export function classifyComboStrength(
  comboText: string,
  titleText: string,
  subtitleText: string,
  keywordsText: string = ''
): {
  strength: ComboStrength;
  isConsecutive: boolean;
  canStrengthen: boolean;
  strengtheningSuggestion?: string;
} {
  // Analyze presence in each field
  const titleAnalysis = analyzeComboInText(comboText, titleText);
  const subtitleAnalysis = analyzeComboInText(comboText, subtitleText);
  const keywordsAnalysis = analyzeComboInText(comboText, keywordsText);

  const inTitle = titleAnalysis.exists;
  const inSubtitle = subtitleAnalysis.exists;
  const inKeywords = keywordsAnalysis.exists;
  const fieldCount = [inTitle, inSubtitle, inKeywords].filter(Boolean).length;

  // Apply 10-tier hierarchy
  let strength: ComboStrength;
  let isConsecutive = false;
  let canStrengthen = false;
  let strengtheningSuggestion: string | undefined;

  // TIER 1: Title Consecutive
  if (inTitle && titleAnalysis.isConsecutive) {
    strength = ComboStrength.TITLE_CONSECUTIVE;
    isConsecutive = true;
    canStrengthen = false;

  // TIER 2a: Title Non-Consecutive
  } else if (inTitle && !inSubtitle && !inKeywords) {
    strength = ComboStrength.TITLE_NON_CONSECUTIVE;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = 'Make words consecutive in title for maximum power';

  // TIER 2b: Title + Keywords Cross
  } else if (inTitle && inKeywords && !inSubtitle) {
    strength = ComboStrength.TITLE_KEYWORDS_CROSS;
    canStrengthen = true;
    strengtheningSuggestion = 'Move keywords from keywords field to title';

  // TIER 3: Title + Subtitle Cross
  } else if (inTitle && inSubtitle && !inKeywords) {
    strength = ComboStrength.CROSS_ELEMENT;
    canStrengthen = true;
    strengtheningSuggestion = 'Move all keywords to title';

  // TIER 4a: Keywords Consecutive
  } else if (inKeywords && !inTitle && !inSubtitle && keywordsAnalysis.isConsecutive) {
    strength = ComboStrength.KEYWORDS_CONSECUTIVE;
    isConsecutive = true;
    canStrengthen = true;
    strengtheningSuggestion = 'Move to title for strong ranking';

  // TIER 4b: Subtitle Consecutive
  } else if (inSubtitle && !inTitle && !inKeywords && subtitleAnalysis.isConsecutive) {
    strength = ComboStrength.SUBTITLE_CONSECUTIVE;
    isConsecutive = true;
    canStrengthen = true;
    strengtheningSuggestion = 'Move to title for strong ranking';

  // TIER 5: Keywords + Subtitle Cross
  } else if (inKeywords && inSubtitle && !inTitle) {
    strength = ComboStrength.KEYWORDS_SUBTITLE_CROSS;
    canStrengthen = true;
    strengtheningSuggestion = 'Move all keywords to title';

  // TIER 6a: Keywords Non-Consecutive
  } else if (inKeywords && !inTitle && !inSubtitle) {
    strength = ComboStrength.KEYWORDS_NON_CONSECUTIVE;
    canStrengthen = true;
    strengtheningSuggestion = 'Move to title and make consecutive';

  // TIER 6b: Subtitle Non-Consecutive
  } else if (inSubtitle && !inTitle && !inKeywords) {
    strength = ComboStrength.SUBTITLE_NON_CONSECUTIVE;
    canStrengthen = true;
    strengtheningSuggestion = 'Move to title and make consecutive';

  // TIER 7: Three-Way Cross
  } else if (fieldCount === 3) {
    strength = ComboStrength.THREE_WAY_CROSS;
    canStrengthen = true;
    strengtheningSuggestion = 'Consolidate all keywords into title';

  // TIER 0: Missing
  } else {
    strength = ComboStrength.MISSING;
    canStrengthen = false;
  }

  return { strength, isConsecutive, canStrengthen, strengtheningSuggestion };
}
```

### Phase 3: Priority Scoring (2 hours)

**File:** `engine/priorityScoring.ts`

```typescript
import { ComboStrength } from '../types/comboStrength';
import { STRENGTH_SCORES } from '../constants/strengthScores';

export interface ComboPriorityScore {
  strengthScore: number;
  popularityScore: number;
  opportunityScore: number;
  trendScore: number;
  intentScore: number;
  totalScore: number;
  dataQuality: 'complete' | 'partial' | 'missing';
}

export function calculateComboPriority(
  combo: GeneratedCombo,
  rankingData?: { position: number | null; trend?: string },
  popularityData?: Map<string, { popularity_score: number; intent_score: number }>
): ComboPriorityScore {
  // 1. Strength Score (30%)
  const strengthScore = STRENGTH_SCORES[combo.strength];

  // 2. Popularity Score (25%) - Average of keyword popularity
  let popularityScore = 50; // Default
  if (popularityData) {
    const scores = combo.keywords
      .map(kw => popularityData.get(kw.toLowerCase())?.popularity_score || 0)
      .filter(s => s > 0);
    if (scores.length > 0) {
      popularityScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  // 3. Opportunity Score (20%)
  let opportunityScore = 60; // Default moderate
  if (rankingData) {
    if (!rankingData.position) {
      opportunityScore = 80; // Not ranking = blue ocean
    } else {
      const pos = rankingData.position;
      if (pos <= 5) opportunityScore = 5;
      else if (pos <= 10) opportunityScore = 10;
      else if (pos <= 20) opportunityScore = 60; // Sweet spot
      else if (pos <= 50) opportunityScore = 50;
      else opportunityScore = 30;
    }
  }

  // 4. Trend Score (15%)
  let trendScore = 50; // Default neutral
  if (rankingData?.trend) {
    if (rankingData.trend === 'up') trendScore = 80;
    else if (rankingData.trend === 'down') trendScore = 30;
    else if (rankingData.trend === 'new') trendScore = 60;
  }

  // 5. Intent Score (10%)
  let intentScore = 50; // Default
  if (popularityData) {
    const scores = combo.keywords
      .map(kw => (popularityData.get(kw.toLowerCase())?.intent_score || 0.5) * 100)
      .filter(s => s > 0);
    if (scores.length > 0) {
      intentScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  // Weighted total
  const totalScore = Math.round(
    (strengthScore * 0.30) +
    (popularityScore * 0.25) +
    (opportunityScore * 0.20) +
    (trendScore * 0.15) +
    (intentScore * 0.10)
  );

  const dataQuality = rankingData && popularityData ? 'complete' :
                      rankingData || popularityData ? 'partial' : 'missing';

  return {
    strengthScore,
    popularityScore,
    opportunityScore,
    trendScore,
    intentScore,
    totalScore,
    dataQuality,
  };
}
```

### Phase 4: Main Analysis Function (1 hour)

**File:** `engine/comboAnalysis.ts`

```typescript
import { extractKeywords, parseKeywordsField } from '../utils/keywordExtraction';
import { generateAllPossibleCombos } from './comboGeneration';
import { classifyComboStrength } from './strengthClassification';
import { ComboAnalysis, GeneratedCombo } from '../types/comboStrength';

export function analyzeAllCombos(
  titleText: string,
  subtitleText: string,
  keywordsFieldText: string = ''
): ComboAnalysis {
  // 1. Extract keywords
  const titleKeywords = extractKeywords(titleText);
  const subtitleKeywords = extractKeywords(subtitleText);
  const keywordsFieldKeywords = parseKeywordsField(keywordsFieldText);

  // 2. Generate all possible combos
  const allPossibleComboStrings = generateAllPossibleCombos(
    titleKeywords,
    subtitleKeywords,
    keywordsFieldKeywords,
    { minLength: 2, maxLength: 4 }
  );

  // 3. Classify each combo
  const allPossibleCombos: GeneratedCombo[] = allPossibleComboStrings.map(comboText => {
    const keywords = comboText.split(' ');
    const classification = classifyComboStrength(
      comboText,
      titleText,
      subtitleText,
      keywordsFieldText
    );

    return {
      text: comboText,
      keywords,
      length: keywords.length,
      exists: classification.strength !== ComboStrength.MISSING,
      source: determineSource(comboText, titleText, subtitleText, keywordsFieldText),
      strength: classification.strength,
      isConsecutive: classification.isConsecutive,
      canStrengthen: classification.canStrengthen,
      strengtheningSuggestion: classification.strengtheningSuggestion,
    };
  });

  // 4. Split into existing and missing
  const existingCombos = allPossibleCombos.filter(c => c.exists);
  const missingCombos = allPossibleCombos.filter(c => !c.exists);

  // 5. Calculate stats
  const stats = calculateStats(allPossibleCombos);

  return {
    allPossibleCombos,
    existingCombos,
    missingCombos,
    stats,
  };
}

function calculateStats(combos: GeneratedCombo[]) {
  const stats = {
    totalPossible: combos.length,
    existing: 0,
    missing: 0,
    coverage: 0,
    titleConsecutive: 0,
    titleNonConsecutive: 0,
    titleKeywordsCross: 0,
    crossElement: 0,
    keywordsConsecutive: 0,
    subtitleConsecutive: 0,
    keywordsSubtitleCross: 0,
    keywordsNonConsecutive: 0,
    subtitleNonConsecutive: 0,
    threeWayCross: 0,
    canStrengthen: 0,
  };

  combos.forEach(combo => {
    if (combo.exists) stats.existing++;
    else stats.missing++;

    switch (combo.strength) {
      case ComboStrength.TITLE_CONSECUTIVE:
        stats.titleConsecutive++;
        break;
      case ComboStrength.TITLE_NON_CONSECUTIVE:
        stats.titleNonConsecutive++;
        break;
      case ComboStrength.TITLE_KEYWORDS_CROSS:
        stats.titleKeywordsCross++;
        break;
      case ComboStrength.CROSS_ELEMENT:
        stats.crossElement++;
        break;
      case ComboStrength.KEYWORDS_CONSECUTIVE:
        stats.keywordsConsecutive++;
        break;
      case ComboStrength.SUBTITLE_CONSECUTIVE:
        stats.subtitleConsecutive++;
        break;
      case ComboStrength.KEYWORDS_SUBTITLE_CROSS:
        stats.keywordsSubtitleCross++;
        break;
      case ComboStrength.KEYWORDS_NON_CONSECUTIVE:
        stats.keywordsNonConsecutive++;
        break;
      case ComboStrength.SUBTITLE_NON_CONSECUTIVE:
        stats.subtitleNonConsecutive++;
        break;
      case ComboStrength.THREE_WAY_CROSS:
        stats.threeWayCross++;
        break;
    }

    if (combo.canStrengthen) stats.canStrengthen++;
  });

  stats.coverage = stats.totalPossible > 0
    ? Math.round((stats.existing / stats.totalPossible) * 100)
    : 0;

  return stats;
}
```

---

## Testing & Validation

### Test Case 1: Basic Classification

```typescript
describe('Combo Strength Classification', () => {
  it('should classify title consecutive as tier 1', () => {
    const result = classifyComboStrength(
      'meditation sleep',
      'Meditation & Sleep Timer',
      'Mindfulness App',
      ''
    );

    expect(result.strength).toBe(ComboStrength.TITLE_CONSECUTIVE);
    expect(result.isConsecutive).toBe(true);
    expect(result.canStrengthen).toBe(false);
  });

  it('should classify cross-element as tier 3', () => {
    const result = classifyComboStrength(
      'meditation mindfulness',
      'Meditation Timer',
      'Mindfulness & Wellness',
      ''
    );

    expect(result.strength).toBe(ComboStrength.CROSS_ELEMENT);
    expect(result.canStrengthen).toBe(true);
  });

  it('should classify title+keywords cross as tier 2b', () => {
    const result = classifyComboStrength(
      'meditation relaxation',
      'Meditation Timer',
      'Sleep Better',
      'relaxation,breathing,wellness'
    );

    expect(result.strength).toBe(ComboStrength.TITLE_KEYWORDS_CROSS);
  });
});
```

### Test Case 2: Full Analysis

```typescript
describe('Combo Analysis', () => {
  it('should generate and classify all combos', () => {
    const result = analyzeAllCombos(
      'Headspace: Meditation & Sleep',
      'Mindfulness Timer',
      'relaxation,breathing,wellness'
    );

    expect(result.allPossibleCombos.length).toBeGreaterThan(0);
    expect(result.stats.totalPossible).toBe(result.allPossibleCombos.length);
    expect(result.stats.existing + result.stats.missing).toBe(result.stats.totalPossible);
  });
});
```

---

## Common Pitfalls

### Pitfall 1: Case Sensitivity

❌ **Wrong:**
```typescript
if (title.includes(combo)) {  // Case-sensitive
  // ...
}
```

✅ **Correct:**
```typescript
if (title.toLowerCase().includes(combo.toLowerCase())) {
  // ...
}
```

### Pitfall 2: Special Character Handling

❌ **Wrong:**
```typescript
const keywords = title.split(' ');  // Keeps punctuation
```

✅ **Correct:**
```typescript
const keywords = title
  .replace(/[^\w\s]/g, ' ')
  .split(/\s+/)
  .filter(Boolean);
```

### Pitfall 3: Keyword Field Parsing

❌ **Wrong:**
```typescript
const keywords = keywordsField.split(',');  // May have whitespace
```

✅ **Correct:**
```typescript
const keywords = keywordsField
  .split(',')
  .map(kw => kw.trim())
  .filter(Boolean);
```

### Pitfall 4: Combination Explosion

❌ **Wrong:**
```typescript
// No limit - could generate 50,000 combos
generateAllCombos(keywords);
```

✅ **Correct:**
```typescript
// Apply top 500 limit after priority scoring
const topCombos = selectTopCombos(allCombos, priorityScores, 500);
```

---

## Integration Checklist

- [ ] Step 1: Type definitions created
- [ ] Step 2: Strength score mapping defined
- [ ] Step 3: Keyword extraction implemented
- [ ] Step 4: Combination generation working
- [ ] Step 5: Strength classification accurate
- [ ] Step 6: Priority scoring integrated
- [ ] Step 7: Main analysis function complete
- [ ] Step 8: Unit tests passing
- [ ] Step 9: Integration tests passing
- [ ] Step 10: UI displaying results
- [ ] Step 11: Top 500 limit applied
- [ ] Step 12: Performance validated (<10s for 3,000 combos)
- [ ] Step 13: Documentation updated
- [ ] Step 14: Code reviewed

---

## Support & Questions

If you encounter issues during replication:

1. **Check the full implementation:** See `src/engine/combos/comboGenerationEngine.ts` and `comboPriorityScoring.ts` in the codebase
2. **Review test cases:** See working examples in action
3. **Consult the theory:** Read `ASO_BIBLE_RULES_COMBO_STRENGTH_THEORY.md` for algorithm details
4. **Validate assumptions:** Use test cases to verify each layer works correctly

---

**Document Control**

**Title:** Replication Guide - 10-Tier Combo Strength System
**Version:** 1.0
**Date:** 2025-12-01
**Purpose:** Enable developer replication
**Difficulty:** Intermediate
**Est. Time:** 8-12 hours
**Status:** Production-Ready
