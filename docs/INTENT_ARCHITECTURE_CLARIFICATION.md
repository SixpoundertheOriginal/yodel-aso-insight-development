# Intent Architecture Clarification - BEFORE Phase 22 Seed

**Date**: 2025-01-24
**Status**: Architecture Review Required
**Purpose**: Confirm intent system design before seeding 300 patterns

---

## Current Architecture (What Exists Today)

### Two-Layer Intent System ✅

**Layer 1: Search Intent** (Token/Keyword Level)
- **Types**: `informational | commercial | transactional | navigational`
- **Purpose**: Classify individual keywords for search intent coverage
- **Used By**: Phase 17 Search Intent Coverage Engine
- **Powered By**: `aso_intent_patterns` table
- **Example**: "learn" → informational, "best" → commercial, "download" → transactional

**Layer 2: Combo/Metadata Semantic Intent** (Combination Level)
- **Types**: `learning | outcome | brand | noise`
- **Purpose**: Classify keyword combinations for discovery footprint and metadata scoring
- **Used By**: Phase 16 Discovery Footprint, Combo Workbench, Metadata Audit
- **Powered By**: Same `aso_intent_patterns` table + **mapping layer**
- **Example**: "learn spanish" → learning, "fluent spanish" → outcome

### The Mapping Layer

```typescript
// File: src/utils/intentTypeMapping.ts

// Search Intent → Combo Intent Mapping
informational → learning   // "learn", "guide", "how to"
commercial → outcome       // "best", "top", "compare"
transactional → outcome    // "download", "free", "buy"
navigational → brand       // "app", "official", brand names
```

---

## Database Tables (Current State)

### Table 1: `aso_intent_patterns` (THE BRAIN)

**Purpose**: Stores search intent patterns that power BOTH layers

```sql
CREATE TABLE aso_intent_patterns (
  pattern text NOT NULL,           -- "learn", "best", "download"
  intent_type text NOT NULL,       -- 'informational' | 'commercial' | 'transactional' | 'navigational'
  weight numeric(4,2),             -- 0.1-3.0
  priority integer,                -- 0-200
  scope text,                      -- 'base' | 'vertical' | 'market' | 'client' | 'app'
  vertical text,                   -- NULL for base, 'Education' for vertical-specific
  market text,                     -- NULL for base, 'us' for market-specific
  organization_id uuid,            -- NULL for base, org ID for client-specific
  is_regex boolean,
  case_sensitive boolean,
  word_boundary boolean,
  is_active boolean,
  ...
);
```

**Current Status**: **0 rows** (empty, using 14-pattern fallback)

**How It Powers Both Layers**:
1. **Layer 1 (Token)**: Direct use - "learn" matches → informational
2. **Layer 2 (Combo)**: Mapped use - "learn" matches → informational → **mapped to** learning

### Table 2: `aso_intent_pattern_overrides`

**Purpose**: Scope-specific overrides (vertical, market, client, app)

```sql
CREATE TABLE aso_intent_pattern_overrides (
  base_pattern_id uuid,           -- References aso_intent_patterns
  scope text,                     -- 'vertical' | 'market' | 'client' | 'app'
  vertical text,
  market text,
  organization_id uuid,
  weight_multiplier numeric(4,2), -- Multiply base weight
  is_active boolean,
  priority_override integer,
  ...
);
```

**Current Status**: **0 rows** (empty)

**Use Case**: Override "learn" weight to 1.5 for Education vertical

### Table 3: `search_intent_registry` (DIFFERENT PURPOSE)

**Purpose**: Cache of autocomplete API keyword classifications

```sql
CREATE TABLE search_intent_registry (
  keyword text NOT NULL,          -- "learn spanish"
  platform text,                  -- 'ios' | 'android'
  region text,                    -- 'us', 'gb', etc.
  intent_type text,               -- Same 4 types
  autocomplete_suggestions jsonb, -- Raw API data
  autocomplete_volume_estimate integer,
  ...
);
```

**Current Status**: **0 rows** (empty)

**Use Case**: Legacy autocomplete intelligence cache (Phase 17 deprecated this)

**NOT USED FOR PATTERN MATCHING** - This is just a cache, not the brain

### Table 4: `aso_intent_keyword_examples` (NEW - Phase 21)

**Purpose**: Vertical-specific UI examples for "No Intent Found" suggestions

```sql
CREATE TABLE aso_intent_keyword_examples (
  intent_type text,               -- Same 4 types
  vertical text,                  -- 'Education', 'Games', etc.
  example_phrase text,            -- "learn spanish", "best games"
  display_order integer,
  usage_context text,             -- 'no_intent_found', 'low_coverage'
  ...
);
```

**Current Status**: **71 rows** (seeded in Phase 21)

**Use Case**: Show vertical-specific examples in SearchIntentCoverageCard UI

**NOT USED FOR PATTERN MATCHING** - This is just UI suggestions

---

## Critical Questions

### Question 1: Is ONE Table Correct?

**Current Design**: ONE table (`aso_intent_patterns`) stores search intent patterns, then mapped to combo intent.

**Alternative Design**: TWO tables
- `search_intent_patterns` → informational/commercial/transactional/navigational
- `aso_semantic_patterns` → learning/outcome/brand/noise/feature/persona/experience/mode/category

**User Asked**: "We need TWO-LAYER INTENT SYSTEM" - Do you mean:
- **Option A**: ONE table with mapping (current architecture) ✅
- **Option B**: TWO tables, one per layer ❓

---

### Question 2: Is the Taxonomy Complete?

**Current Layer 2 Types** (from code):
```typescript
export type ComboIntentType = 'learning' | 'outcome' | 'brand' | 'noise';
```

**User Mentioned** "ASO-specific: learning, feature, persona, outcome, experience, category, mode, brand, noise"

**Discrepancy**: Code only has 4 types, but user mentioned 9 types!

**Missing from Code**:
- `feature` - Not in ComboIntentType
- `persona` - Not in ComboIntentType
- `experience` - Not in ComboIntentType
- `category` - Not in ComboIntentType
- `mode` - Not in ComboIntentType

**Question**: Should these 5 additional types be added to Layer 2?

---

### Question 3: Where Should 300 Patterns Go?

**My Original Assumption**:
```sql
-- Insert into aso_intent_patterns
INSERT INTO aso_intent_patterns (pattern, intent_type, ...) VALUES
('learn', 'informational', ...),
('best', 'commercial', ...),
...
```

**User's Clarification Request**:
> "300 search-intent patterns → search_intent_registry"

**Confusion**: `search_intent_registry` is an **autocomplete cache table**, not a pattern table!

**Correct Target**: Should be `aso_intent_patterns` (confirmed by code)

**Question**: Did you mean `aso_intent_patterns` instead of `search_intent_registry`?

---

### Question 4: Vertical-Specific Patterns Architecture

**Current Schema** (supports vertical patterns):
```sql
-- aso_intent_patterns supports vertical scope
scope = 'vertical'
vertical = 'Education' | 'Games' | 'Finance' | etc.
```

**Phase 23 Plan**: Add vertical-specific patterns
```sql
-- Base pattern
('learn', 'informational', scope='base', vertical=NULL)

-- Vertical override
('vocabulary', 'informational', scope='vertical', vertical='Education')
('multiplayer', 'commercial', scope='vertical', vertical='Games')
('portfolio', 'commercial', scope='vertical', vertical='Finance')
```

**Question**: Is this the correct approach for Phase 23?

---

### Question 5: Metadata Scoring Usage

**Current Usage** (from metadataAuditEngine.ts):
```typescript
// 1. Load patterns from aso_intent_patterns
const intentPatterns = await loadIntentPatterns(...);

// 2. Classify combos using patterns
titleCombosEnriched = titleCombosEnriched.map(combo => ({
  ...combo,
  intentClass: classifyIntent(combo), // Uses patterns, returns 'learning' | 'outcome' | 'brand' | 'noise'
}));

// 3. Compute search intent coverage (token-level)
const intentCoverage = computeSearchIntentCoverage(...); // Uses patterns, returns distribution by informational/commercial/etc.
```

**Confirmed**: Metadata scoring uses Layer 2 (learning/outcome/brand/noise)

**Question**: Is this correct, or should it use Layer 1 (informational/commercial/etc.)?

---

### Question 6: Section 3 / Discovery Footprint

**Current Usage** (from DiscoveryFootprintMap.tsx):
```typescript
// Groups combos by intentClass (Layer 2)
{
  learning: 10,    // "learn", "study", "practice"
  outcome: 5,      // "fluent", "proficient", "master"
  brand: 2,        // Brand-related combos
  lowValue: 3      // Noise/low-value
}
```

**Confirmed**: Discovery Footprint uses Layer 2 (learning/outcome/brand/noise)

**Question**: Should it use Layer 1 types instead?

---

## Proposed Clarifications

### Clarification 1: Table Assignment

| Table | Purpose | Current Status | Phase 22 Action |
|-------|---------|----------------|-----------------|
| `aso_intent_patterns` | ✅ **Pattern Brain** | 0 rows | **Seed 300 patterns here** |
| `aso_intent_pattern_overrides` | ✅ Override exceptions | 0 rows | Phase 23 (vertical overrides) |
| `search_intent_registry` | ⚠️ Autocomplete cache (deprecated) | 0 rows | ❌ Do NOT seed patterns here |
| `aso_intent_keyword_examples` | ✅ UI examples | 71 rows | ✅ Already seeded (Phase 21) |

**Confirmation Needed**: Are these assignments correct?

---

### Clarification 2: Intent Type Taxonomy

**Proposed Two-Layer Taxonomy**:

**Layer 1 (Search Intent)** - `aso_intent_patterns.intent_type`:
- `informational` - Learning/discovery keywords
- `commercial` - Comparison/evaluation keywords
- `transactional` - Download/action keywords
- `navigational` - Brand/specific app keywords

**Layer 2 (Combo Semantic Intent)** - `ComboIntentType`:
- `learning` ← maps from informational
- `outcome` ← maps from commercial + transactional
- `brand` ← maps from navigational
- `noise` ← low-value combos

**Question**: Should Layer 2 be expanded to 9 types?
- learning
- feature (NEW)
- persona (NEW)
- outcome
- experience (NEW)
- category (NEW)
- mode (NEW)
- brand
- noise

**If YES**: This requires code changes to ComboIntentType + mapping logic

**If NO**: Continue with current 4 types

---

### Clarification 3: Pattern Insertion Rules

**Phase 22 (Base Patterns)** - Insert into `aso_intent_patterns`:
```sql
INSERT INTO aso_intent_patterns (
  pattern, intent_type, weight, priority,
  scope, vertical, market, organization_id,
  is_regex, case_sensitive, word_boundary, is_active
) VALUES
('learn', 'informational', 1.2, 100, 'base', NULL, NULL, NULL, false, false, true, true),
('best', 'commercial', 1.5, 120, 'base', NULL, NULL, NULL, false, false, true, true),
...
```

**Phase 23 (Vertical Patterns)** - Same table, different scope:
```sql
INSERT INTO aso_intent_patterns (
  pattern, intent_type, weight, priority,
  scope, vertical, market, organization_id,
  ...
) VALUES
('vocabulary', 'informational', 1.3, 105, 'vertical', 'Education', NULL, NULL, ...),
('multiplayer', 'commercial', 1.4, 110, 'vertical', 'Games', NULL, NULL, ...),
...
```

**Confirmation Needed**: Is this correct?

---

### Clarification 4: Missing Infrastructure

**Current Infrastructure** ✅:
- `aso_intent_patterns` table exists
- `loadIntentPatterns()` function exists
- `classifyIntent()` function exists
- Mapping layer (`intentTypeMapping.ts`) exists
- Fallback patterns exist (14 patterns)

**Potential Missing** ❓:
- Admin UI for managing patterns (Phase 25+)
- Expanded Layer 2 taxonomy (if 9 types needed)
- Pattern testing/validation tools
- Bulk import/export for patterns

**Question**: Is any infrastructure missing before seeding?

---

## Recommended Next Steps

### Step 1: Confirm Architecture
**You must answer**:
1. ✅ ONE table with mapping (current) OR ❌ TWO tables (one per layer)?
2. ✅ 4 combo types (current) OR ❌ 9 combo types (expanded)?
3. ✅ Seed into `aso_intent_patterns` OR ❌ Different table?

### Step 2: Confirm Taxonomy
**If expanding to 9 types**, provide definitions:
- `feature` - Definition?
- `persona` - Definition?
- `experience` - Definition?
- `category` - Definition?
- `mode` - Definition?

### Step 3: Generate Seeds
Once confirmed, I will:
1. Generate 300 patterns for `aso_intent_patterns` (Phase 22)
2. Include metadata for future vertical expansion (Phase 23)
3. Create admin UI mockups for pattern management
4. Document insertion rules for overrides

---

## Schema Validation Map

```
┌─────────────────────────────────────────────────────────────┐
│              INTENT ARCHITECTURE MAP                         │
└─────────────────────────────────────────────────────────────┘

DATABASE TABLES:
┌──────────────────────────┐
│ aso_intent_patterns      │  ← 300 BASE PATTERNS (Phase 22)
│ - intent_type (Layer 1)  │     informational, commercial, etc.
│ - scope = 'base'         │
│ - vertical = NULL        │
└──────────────────────────┘
          ↓
┌──────────────────────────┐
│ Intent Engine            │  ← src/engine/asoBible/intentEngine.ts
│ - loadIntentPatterns()   │
│ - classifyComboIntent()  │
│ - classifyToken()        │
└──────────────────────────┘
          ↓
┌──────────────────────────┐
│ Mapping Layer            │  ← src/utils/intentTypeMapping.ts
│ - mapSearchToComboIntent │     informational → learning
│ - mapComboToSearchIntent │     commercial → outcome
└──────────────────────────┘
          ↓
┌──────────────────────────┐
│ Combo Intent Classifier  │  ← src/utils/comboIntentClassifier.ts
│ - classifyIntent()       │     Returns: learning | outcome | brand | noise
└──────────────────────────┘
          ↓
┌──────────────────────────┐
│ UI COMPONENTS            │
│ - DiscoveryFootprintMap  │  ← Uses Layer 2 (learning/outcome)
│ - SearchIntentCoverage   │  ← Uses Layer 1 (informational/commercial)
│ - Metadata Scoring       │  ← Uses Layer 2 (learning/outcome)
└──────────────────────────┘

VERTICAL PATTERNS (Phase 23):
┌──────────────────────────┐
│ aso_intent_patterns      │  ← VERTICAL PATTERNS
│ - scope = 'vertical'     │
│ - vertical = 'Education' │  "vocabulary", "grammar", "fluency"
│ - vertical = 'Games'     │  "multiplayer", "pvp", "fps"
│ - vertical = 'Finance'   │  "portfolio", "stocks", "invest"
└──────────────────────────┘
          ↓
┌──────────────────────────┐
│ aso_intent_pattern_overrides │  ← WEIGHT OVERRIDES
│ - weight_multiplier      │     Boost "learn" 1.5x for Education
│ - priority_override      │     Higher priority for vertical terms
└──────────────────────────┘
```

---

## Final Questions for User

Before I generate the 300-pattern seed SQL:

1. **Table Confirmation**: Seed patterns into `aso_intent_patterns`? (YES/NO)
2. **Taxonomy Confirmation**: Keep 4 Layer 2 types or expand to 9? (4 or 9)
3. **Architecture Confirmation**: ONE table with mapping layer? (YES/NO)
4. **Missing Types**: If 9 types, define: feature, persona, experience, category, mode
5. **Vertical Strategy**: Phase 23 uses `scope='vertical'` in same table? (YES/NO)

**I will NOT generate SQL until these are confirmed.** ⏸️

---

**Architecture Analysis By**: Claude Code
**Analysis Date**: 2025-01-24
**Code Files Analyzed**: 10+
**Documentation Reviewed**: 5 phase docs
**Status**: ⏸️ WAITING FOR CLARIFICATION

