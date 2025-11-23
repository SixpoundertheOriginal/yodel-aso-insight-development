# Rule Evaluator Enumeration

**Phase 15 - Step 1: Discovery**
**Date**: 2025-11-23

---

## Overview

This document enumerates all rule evaluators currently used in the Metadata Audit Engine.
These evaluators will be seeded into the database and made editable via the Admin UI.

**Source**: `src/engine/metadata/metadataScoringRegistry.ts`

---

## Complete Rule Evaluator List (12 Total)

### Title Rules (4)

#### 1. `title_character_usage`
- **Name**: Character Usage Efficiency
- **Scope**: title
- **Family**: ranking
- **Description**: Measures how well the title uses available character space
- **Default Weight**: 0.25 (25% of title score)
- **Thresholds**:
  - Low: 70% character usage
  - High: 100% character usage
- **Severity**: moderate
- **Linked KPIs**: title_character_count, slot_utilization
- **Linked Formulas**: weighted_sum (title scoring)

#### 2. `title_unique_keywords`
- **Name**: Unique Keyword Density
- **Scope**: title
- **Family**: ranking
- **Description**: Evaluates meaningful keyword coverage with semantic relevance weighting
- **Default Weight**: 0.30 (30% of title score)
- **Thresholds**:
  - Low: 2 unique keywords
  - High**: 5+ unique keywords
- **Severity**: strong
- **Linked KPIs**: title_unique_keyword_count, keyword_efficiency
- **Linked Formulas**: weighted_sum (title scoring)

#### 3. `title_combo_coverage`
- **Name**: Keyword Combination Coverage
- **Scope**: title
- **Family**: ranking
- **Description**: Evaluates multi-word keyword combinations (2-4 words)
- **Default Weight**: 0.30 (30% of title score)
- **Thresholds**:
  - Low: 2 combos
  - High: 5+ combos
- **Severity**: strong
- **Linked KPIs**: title_combo_coverage, discovery_footprint
- **Linked Formulas**: weighted_sum (title scoring)

#### 4. `title_filler_penalty`
- **Name**: Filler Token Penalty
- **Scope**: title
- **Family**: diagnostic
- **Description**: Penalizes excessive use of stopwords and generic terms using noise ratio
- **Default Weight**: 0.15 (15% of title score)
- **Thresholds**:
  - Low: 0.3 noise ratio (good)
  - High: 0.5 noise ratio (bad)
- **Severity**: moderate
- **Linked KPIs**: None (penalty metric)
- **Linked Formulas**: weighted_sum (title scoring)

---

### Subtitle Rules (4)

#### 5. `subtitle_character_usage`
- **Name**: Character Usage Efficiency
- **Scope**: subtitle
- **Family**: ranking
- **Description**: Measures how well the subtitle uses available character space
- **Default Weight**: 0.20 (20% of subtitle score)
- **Thresholds**:
  - Low: 70% character usage
  - High: 100% character usage
- **Severity**: moderate
- **Linked KPIs**: subtitle_character_count, slot_utilization
- **Linked Formulas**: weighted_sum (subtitle scoring)

#### 6. `subtitle_incremental_value`
- **Name**: Incremental Value
- **Scope**: subtitle
- **Family**: ranking
- **Description**: Measures how much NEW high-value information subtitle adds vs title
- **Default Weight**: 0.40 (40% of subtitle score - HIGHEST)
- **Thresholds**:
  - Low: 2 new high-value keywords
  - High: 3+ new high-value keywords
- **Severity**: critical
- **Linked KPIs**: subtitle_incremental_value, keyword_efficiency
- **Linked Formulas**: weighted_sum (subtitle scoring)

#### 7. `subtitle_combo_coverage`
- **Name**: New Combination Coverage
- **Scope**: subtitle
- **Family**: ranking
- **Description**: Evaluates NEW multi-word combinations vs title
- **Default Weight**: 0.25 (25% of subtitle score)
- **Thresholds**:
  - Low: 2 new combos
  - High: 5+ new combos
- **Severity**: strong
- **Linked KPIs**: subtitle_combo_coverage, discovery_footprint
- **Linked Formulas**: weighted_sum (subtitle scoring)

#### 8. `subtitle_complementarity`
- **Name**: Title Complementarity
- **Scope**: subtitle
- **Family**: ranking
- **Description**: Ensures subtitle complements (not duplicates) title based on relevant tokens
- **Default Weight**: 0.15 (15% of subtitle score)
- **Thresholds**:
  - Low: <40% overlap (good)
  - High: >40% overlap (bad)
- **Severity**: moderate
- **Linked KPIs**: None (complementarity metric)
- **Linked Formulas**: weighted_sum (subtitle scoring)

---

### Description Rules (4)

**Note**: Description rules score conversion (not ASO ranking). Element weight = 0.00 for ranking.

#### 9. `description_hook_strength`
- **Name**: Opening Hook Strength
- **Scope**: description
- **Family**: conversion
- **Description**: Evaluates the first paragraph's ability to capture attention using category-based weighted scoring
- **Default Weight**: 0.30 (30% of description score)
- **Thresholds**:
  - Low: 60 score (good)
  - High: 80+ score (excellent)
- **Severity**: strong
- **Linked KPIs**: hook_strength (conversion KPI)
- **Linked Formulas**: category-weighted hook scoring

#### 10. `description_feature_mentions`
- **Name**: Feature Mentions
- **Scope**: description
- **Family**: conversion
- **Description**: Counts explicit feature/benefit mentions
- **Default Weight**: 0.25 (25% of description score)
- **Thresholds**:
  - Low: 3 feature mentions
  - High: 6+ feature mentions
- **Severity**: moderate
- **Linked KPIs**: None
- **Linked Formulas**: linear scoring (count * 15)

#### 11. `description_cta_strength`
- **Name**: Call-to-Action Strength
- **Scope**: description
- **Family**: conversion
- **Description**: Evaluates presence of conversion-focused CTAs
- **Default Weight**: 0.20 (20% of description score)
- **Thresholds**:
  - Low: 2 CTAs
  - High: 4+ CTAs
- **Severity**: moderate
- **Linked KPIs**: cta_strength (conversion KPI)
- **Linked Formulas**: linear scoring (count * 25)

#### 12. `description_readability`
- **Name**: Readability Score
- **Scope**: description
- **Family**: conversion
- **Description**: Flesch-Kincaid Reading Ease (0-100, higher is better)
- **Default Weight**: 0.25 (25% of description score)
- **Thresholds**:
  - Low: 40 (moderate readability)
  - High: 60+ (easy readability)
- **Severity**: optional
- **Linked KPIs**: None
- **Linked Formulas**: Flesch-Kincaid formula

---

## Rule Family Distribution

| Family | Count | Rules |
|--------|-------|-------|
| **ranking** | 7 | title_character_usage, title_unique_keywords, title_combo_coverage, subtitle_character_usage, subtitle_incremental_value, subtitle_combo_coverage, subtitle_complementarity |
| **conversion** | 4 | description_hook_strength, description_feature_mentions, description_cta_strength, description_readability |
| **diagnostic** | 1 | title_filler_penalty |

---

## Scope Distribution

| Scope | Count | Rules |
|-------|-------|-------|
| **title** | 4 | title_character_usage, title_unique_keywords, title_combo_coverage, title_filler_penalty |
| **subtitle** | 4 | subtitle_character_usage, subtitle_incremental_value, subtitle_combo_coverage, subtitle_complementarity |
| **description** | 4 | description_hook_strength, description_feature_mentions, description_cta_strength, description_readability |

---

## Severity Distribution

| Severity | Count | Rules |
|----------|-------|-------|
| **critical** | 1 | subtitle_incremental_value |
| **strong** | 3 | title_unique_keywords, title_combo_coverage, subtitle_combo_coverage, description_hook_strength |
| **moderate** | 6 | title_character_usage, title_filler_penalty, subtitle_character_usage, subtitle_complementarity, description_feature_mentions, description_cta_strength |
| **optional** | 1 | description_readability |

---

## Weight Summary

### Title Rules (Total: 1.00)
- title_unique_keywords: **0.30** (highest)
- title_combo_coverage: **0.30** (highest)
- title_character_usage: 0.25
- title_filler_penalty: 0.15

### Subtitle Rules (Total: 1.00)
- subtitle_incremental_value: **0.40** (HIGHEST - most important)
- subtitle_combo_coverage: 0.25
- subtitle_character_usage: 0.20
- subtitle_complementarity: 0.15

### Description Rules (Total: 1.00)
- description_hook_strength: **0.30** (highest)
- description_feature_mentions: 0.25
- description_readability: 0.25
- description_cta_strength: 0.20

---

## Element Weights (Overall ASO Score)

| Element | Weight | Purpose |
|---------|--------|---------|
| **Title** | 0.65 (65%) | Primary ASO ranking factor |
| **Subtitle** | 0.35 (35%) | Secondary ASO ranking factor |
| **Description** | 0.00 (0%) | Conversion only, not ranking |

---

## Notes for Seeding

1. **All weights must sum to 1.0** within each element
2. **Initial multipliers should be 1.0** (neutral) to maintain backward compatibility
3. **Thresholds** are extracted from evaluator logic (see "passed" conditions in code)
4. **Severity levels** inferred from weight importance:
   - critical: ≥ 0.40 weight
   - strong: 0.25-0.35 weight
   - moderate: 0.15-0.24 weight
   - optional: < 0.15 weight

5. **Linked KPIs** based on:
   - Direct semantic connection (e.g., `title_character_usage` → `title_character_count` KPI)
   - Metadata family mapping from KPI registry

6. **Formula references** based on scoring method used in evaluator

---

## Next Steps

1. Create DB schema with these 12 rules as seed data
2. Map rule IDs to KPI IDs (from KPI registry)
3. Create override table with same scope pattern (vertical/market/client)
4. Build admin UI following KPI/Formula registry patterns

---

**End of Enumeration**
