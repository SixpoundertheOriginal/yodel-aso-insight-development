# Intent System Schema Map - Complete Data Flow

**Date**: 2025-01-24
**Purpose**: Visual schema map showing exact data flow from database → UI

---

## Three-Table Schema Relationships

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         INTENT SYSTEM DATA FLOW                             │
└────────────────────────────────────────────────────────────────────────────┘

DATABASE LAYER:
═══════════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────────────────┐
│ Table 1: aso_intent_patterns (THE BRAIN)                                 │
│ ────────────────────────────────────────────────────────────────────────│
│ id                  uuid PRIMARY KEY                                     │
│ pattern             text NOT NULL          "learn", "best", "download"   │
│ intent_type         text NOT NULL          informational | commercial    │
│                                            transactional | navigational   │
│ scope               text                   base | vertical | market |    │
│                                            client | app                   │
│ vertical            text                   Education, Games, Finance...  │
│ market              text                   us, gb, de, fr...             │
│ organization_id     uuid                   NULL for base patterns        │
│ app_id              text                   NULL for base patterns        │
│ weight              numeric(4,2)           0.1-3.0 (scoring multiplier)  │
│ priority            integer                0-200 (matching order)        │
│ is_regex            boolean                false (exact match default)   │
│ case_sensitive      boolean                false (lowercase normalized)  │
│ word_boundary       boolean                true (require boundaries)     │
│ is_active           boolean                true (soft delete flag)       │
│ match_type          text                   exact | contains | regex      │
│ example_usage       text                   "learn spanish"               │
│ created_at          timestamptz                                          │
│ updated_at          timestamptz                                          │
│ created_by          uuid                                                 │
│ updated_by          uuid                                                 │
│ ────────────────────────────────────────────────────────────────────────│
│ UNIQUE CONSTRAINT: (pattern, scope, vertical, market, org_id, app_id)   │
│ INDEX: (intent_type, is_active)                                         │
│ INDEX: (scope, vertical, market)                                        │
│ INDEX: (priority DESC)                                                  │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ FK: base_pattern_id
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Table 2: aso_intent_pattern_overrides (EXCEPTIONS)                       │
│ ────────────────────────────────────────────────────────────────────────│
│ id                  uuid PRIMARY KEY                                     │
│ base_pattern_id     uuid FK → aso_intent_patterns(id)                   │
│ scope               text                   vertical | market | client    │
│ vertical            text                   Education, Games...           │
│ market              text                   us, gb, de...                 │
│ organization_id     uuid                   Client UUID                   │
│ app_id              text                   Specific app                  │
│ weight_multiplier   numeric(4,2)           1.5 = +50%, 0.8 = -20%        │
│ priority_override   integer                Override base priority        │
│ is_active           boolean                true                          │
│ reason              text                   "Education emphasizes learn"  │
│ created_at          timestamptz                                          │
│ updated_at          timestamptz                                          │
│ ────────────────────────────────────────────────────────────────────────│
│ UNIQUE CONSTRAINT: (base_pattern_id, scope, vertical, market, org, app) │
│ INDEX: (base_pattern_id, is_active)                                     │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Table 3: search_intent_registry (AUTOCOMPLETE CACHE) [NOT USED]         │
│ ────────────────────────────────────────────────────────────────────────│
│ id                          uuid PRIMARY KEY                             │
│ keyword                     text NOT NULL      "learn spanish" (full)    │
│ platform                    text               ios | android             │
│ region                      text               us, gb, de...             │
│ intent_type                 text               Cached result             │
│ autocomplete_suggestions    jsonb              Raw API data              │
│ autocomplete_volume_est     integer            Volume estimate           │
│ last_checked                timestamptz                                  │
│ is_active                   boolean                                      │
│ ────────────────────────────────────────────────────────────────────────│
│ UNIQUE CONSTRAINT: (keyword, platform, region)                          │
│ NOTE: Deprecated in Phase 17, kept for historical data                  │
└──────────────────────────────────────────────────────────────────────────┘

APPLICATION LAYER:
═══════════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────────────────┐
│ Intent Engine: src/engine/asoBible/intentEngine.ts                       │
│ ────────────────────────────────────────────────────────────────────────│
│                                                                           │
│ function loadIntentPatterns(vertical?, market?, orgId?, appId?)          │
│   ↓                                                                       │
│   1. Build scope hierarchy: app > client > market > vertical > base      │
│   2. Query aso_intent_patterns WHERE scope IN (...)                      │
│   3. Apply overrides from aso_intent_pattern_overrides                   │
│   4. Sort by priority DESC (highest priority first)                      │
│   5. Cache for 5 minutes                                                 │
│   6. If empty, return FALLBACK_PATTERNS (14 patterns)                    │
│   ↓                                                                       │
│   Returns: IntentPatternConfig[]                                         │
│                                                                           │
│ ────────────────────────────────────────────────────────────────────────│
│                                                                           │
│ function classifyToken(token: string, patterns: IntentPatternConfig[])   │
│   ↓                                                                       │
│   1. Normalize token (lowercase, trim)                                   │
│   2. For each pattern (by priority order):                               │
│      - Check exact match OR regex match OR contains                      │
│      - Check word boundaries if required                                 │
│      - Return first match                                                │
│   3. Return 'unclassified' if no match                                   │
│   ↓                                                                       │
│   Returns: { intentType: SearchIntentType, weight: number }              │
│                                                                           │
│ ────────────────────────────────────────────────────────────────────────│
│                                                                           │
│ function classifyComboIntent(text: string, patterns: IntentPatternConfig[])│
│   ↓                                                                       │
│   1. Tokenize text                                                       │
│   2. Classify each token using classifyToken()                           │
│   3. Calculate distribution:                                             │
│      { informational: 40%, commercial: 30%, transactional: 20%, ... }    │
│   4. Calculate weighted score per intent                                 │
│   5. Determine dominant intent (highest weighted score)                  │
│   ↓                                                                       │
│   Returns: {                                                             │
│     dominantIntent: SearchIntentType,                                    │
│     distribution: { [key]: percentage },                                 │
│     weightedScore: number,                                               │
│     coverage: percentage                                                 │
│   }                                                                       │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Mapping Layer: src/utils/intentTypeMapping.ts                            │
│ ────────────────────────────────────────────────────────────────────────│
│                                                                           │
│ Layer 1 (Search Intent) → Layer 2 (Combo Intent)                         │
│                                                                           │
│ mapSearchToComboIntent(searchIntent: SearchIntentType): ComboIntentType  │
│   informational   → learning                                             │
│   commercial      → outcome                                              │
│   transactional   → outcome                                              │
│   navigational    → brand                                                │
│                                                                           │
│ mapComboToSearchIntent(comboIntent: ComboIntentType): SearchIntentType   │
│   learning  → informational                                              │
│   outcome   → commercial                                                 │
│   brand     → navigational                                               │
│   noise     → informational (default fallback)                           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Combo Classifier: src/utils/comboIntentClassifier.ts                     │
│ ────────────────────────────────────────────────────────────────────────│
│                                                                           │
│ function classifyIntent(combo: ClassifiedCombo): IntentClass             │
│   ↓                                                                       │
│   1. Check if noise (type='low_value' OR userMarkedAsNoise)              │
│      → Return 'noise'                                                    │
│   2. Check if brand (brandClassification='brand')                        │
│      → Return 'brand'                                                    │
│   3. Use Intent Engine if patterns loaded:                               │
│      a. Call classifyComboIntent(text, patterns)                         │
│      b. Get dominantIntent (Layer 1)                                     │
│      c. Map to Layer 2 using mapSearchToComboIntent()                    │
│      → Return mapped Layer 2 type                                        │
│   4. Fallback to legacy heuristics if no patterns                        │
│   ↓                                                                       │
│   Returns: 'learning' | 'outcome' | 'brand' | 'noise'                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

UI LAYER:
═══════════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────────────────┐
│ Component 1: SearchIntentCoverageCard.tsx (Layer 1 - Token Level)       │
│ ────────────────────────────────────────────────────────────────────────│
│                                                                           │
│ computeSearchIntentCoverage(tokens[], patterns)                          │
│   ↓                                                                       │
│   For each token:                                                        │
│     - Classify using intentEngine.classifyToken()                        │
│     - Get Layer 1 type (informational | commercial | etc.)               │
│   ↓                                                                       │
│   Display:                                                               │
│     📊 Informational: 65%    [████████░░] 13/20 tokens                   │
│     💰 Commercial: 40%       [██████░░░░] 8/20 tokens                    │
│     🛒 Transactional: 30%    [█████░░░░░] 6/20 tokens                    │
│     🎯 Navigational: 20%     [███░░░░░░░] 4/20 tokens                    │
│                                                                           │
│     Coverage: 15/20 tokens (75%)                                         │
│     Dominant Intent: Informational                                       │
│                                                                           │
│   Shows token-level breakdown with Layer 1 types                         │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Component 2: DiscoveryFootprintMap.tsx (Layer 2 - Combo Level)          │
│ ────────────────────────────────────────────────────────────────────────│
│                                                                           │
│ Display combo distribution by Layer 2 intent:                            │
│                                                                           │
│   📚 Learning Combos: 12                                                 │
│      "learn spanish", "study vocabulary", "grammar lessons"              │
│                                                                           │
│   🎯 Outcome Combos: 8                                                   │
│      "fluent spanish", "master grammar", "best language app"             │
│                                                                           │
│   🏷️  Brand Combos: 3                                                   │
│      "duolingo app", "official app"                                      │
│                                                                           │
│   ⚠️  Low-Value Combos: 5                                                │
│      "app", "spanish", "free"                                            │
│                                                                           │
│   Each combo.intentClass is set by comboIntentClassifier                 │
│   Uses Layer 2 types (learning, outcome, brand, noise)                   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Component 3: Metadata Scoring (metadataAuditEngine.ts)                   │
│ ────────────────────────────────────────────────────────────────────────│
│                                                                           │
│ 1. Load patterns: loadIntentPatterns(vertical, market, orgId)            │
│                                                                           │
│ 2. Classify combos:                                                      │
│    titleCombosEnriched = titleCombos.map(combo => ({                     │
│      ...combo,                                                           │
│      intentClass: classifyIntent(combo) // Layer 2: learning|outcome|... │
│    }));                                                                   │
│                                                                           │
│ 3. Compute coverage:                                                     │
│    const intentCoverage = computeSearchIntentCoverage(                   │
│      tokens,                                                             │
│      patterns                                                            │
│    );                                                                     │
│    // Returns Layer 1 distribution                                       │
│                                                                           │
│ 4. Calculate KPIs:                                                       │
│    - informational_coverage (Layer 1)                                    │
│    - commercial_coverage (Layer 1)                                       │
│    - transactional_coverage (Layer 1)                                    │
│    - dominant_intent_type (Layer 1)                                      │
│    - intent_score (0-100)                                                │
│                                                                           │
│ 5. Score combos based on intentClass (Layer 2):                          │
│    - learning combos: Base score                                         │
│    - outcome combos: +10 bonus (higher value)                            │
│    - brand combos: Context-dependent                                     │
│    - noise combos: -20 penalty                                           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Example: "Learn Spanish Free"

```
INPUT: User audits app with title "Learn Spanish Free - Language Lessons"
═══════════════════════════════════════════════════════════════════════════

STEP 1: Load Patterns
─────────────────────
loadIntentPatterns(vertical='Education', market='us', orgId=null, appId=null)
  ↓
Query: SELECT * FROM aso_intent_patterns WHERE
  (scope='base' AND vertical IS NULL)
  OR (scope='vertical' AND vertical='Education')
  ORDER BY priority DESC

Result: 320 patterns (300 base + 20 Education-specific)
  - "learn" → informational, weight: 1.2, priority: 100
  - "free" → transactional, weight: 1.8, priority: 140
  - "language" → informational, weight: 1.1, priority: 95 (Education)
  - "lessons" → informational, weight: 1.1, priority: 85
  - "spanish" → unclassified (needs vertical expansion)

STEP 2: Token Classification (Layer 1)
─────────────────────────────────────
Tokens: ["learn", "spanish", "free", "language", "lessons"]

For each token, call classifyToken():
  - "learn" → Match "learn" pattern → informational (weight: 1.2)
  - "spanish" → No match → unclassified
  - "free" → Match "free" pattern → transactional (weight: 1.8)
  - "language" → Match "language" pattern → informational (weight: 1.1)
  - "lessons" → Match "lessons" pattern → informational (weight: 1.1)

Distribution:
  - Informational: 3 tokens (60%), weighted score: 3.4
  - Transactional: 1 token (20%), weighted score: 1.8
  - Unclassified: 1 token (20%)

Dominant Intent: Transactional (highest weighted score: 1.8)
Coverage: 4/5 tokens (80%)

STEP 3: Combo Classification (Layer 2)
──────────────────────────────────────
Combo: "learn spanish"
  ↓
classifyComboIntent("learn spanish", patterns)
  - Tokens: ["learn", "spanish"]
  - "learn" → informational
  - "spanish" → unclassified
  - Dominant: informational
  ↓
mapSearchToComboIntent('informational')
  → Returns: 'learning'
  ↓
combo.intentClass = 'learning'

Combo: "spanish free"
  ↓
classifyComboIntent("spanish free", patterns)
  - Tokens: ["spanish", "free"]
  - "spanish" → unclassified
  - "free" → transactional
  - Dominant: transactional
  ↓
mapSearchToComboIntent('transactional')
  → Returns: 'outcome'
  ↓
combo.intentClass = 'outcome'

STEP 4: UI Display
─────────────────

SearchIntentCoverageCard (Layer 1):
┌─────────────────────────────────────────────────┐
│ 📊 Informational: 60%    [████████░░] 3/5       │
│ 🛒 Transactional: 20%    [███░░░░░░░] 1/5       │
│ ❓ Unclassified: 20%     [███░░░░░░░] 1/5       │
│                                                  │
│ Coverage: 80% | Dominant: Transactional          │
└─────────────────────────────────────────────────┘

DiscoveryFootprintMap (Layer 2):
┌─────────────────────────────────────────────────┐
│ 📚 Learning Combos: 4                           │
│    "learn spanish", "learn language", ...       │
│                                                  │
│ 🎯 Outcome Combos: 2                            │
│    "spanish free", "free lessons"               │
└─────────────────────────────────────────────────┘

Metadata Scoring:
┌─────────────────────────────────────────────────┐
│ Intent Score: 78/100                            │
│ ├─ Informational Coverage: 60%                  │
│ ├─ Transactional Coverage: 20%                  │
│ └─ Unclassified: 20% (-10 penalty)              │
│                                                  │
│ Combo Distribution:                             │
│ ├─ Learning: 4 combos (strong discovery value)  │
│ └─ Outcome: 2 combos (conversion signal)        │
└─────────────────────────────────────────────────┘
```

---

## Scope Hierarchy Example

```
User: Duolingo (Education app, US market)
Organization: Duolingo Inc (UUID: org-123)
App: com.duolingo (UUID: app-456)

Query Pattern Loading:
═══════════════════════════════════════════════════════════════════════════

SELECT * FROM aso_intent_patterns WHERE
  (scope='app' AND app_id='app-456')  -- Most specific
  OR (scope='client' AND organization_id='org-123')
  OR (scope='market' AND market='us')
  OR (scope='vertical' AND vertical='Education')
  OR (scope='base')  -- Least specific
ORDER BY
  CASE scope
    WHEN 'app' THEN 5
    WHEN 'client' THEN 4
    WHEN 'market' THEN 3
    WHEN 'vertical' THEN 2
    WHEN 'base' THEN 1
  END DESC,
  priority DESC;

Result (example):
┌──────────┬─────────────┬──────────┬──────────┬──────────┬──────────┐
│ pattern  │ intent_type │ scope    │ vertical │ weight   │ priority │
├──────────┼─────────────┼──────────┼──────────┼──────────┼──────────┤
│ owl      │ navigational│ app      │ NULL     │ 1.5      │ 60       │ ← App-specific
│ premium  │ commercial  │ client   │ NULL     │ 1.8      │ 130      │ ← Client-specific
│ english  │ informational│ market  │ NULL     │ 1.0      │ 100      │ ← US market
│ vocabulary│ informational│ vertical│ Education│ 1.3      │ 105      │ ← Vertical
│ learn    │ informational│ base    │ NULL     │ 1.2      │ 100      │ ← Base
└──────────┴─────────────┴──────────┴──────────┴──────────┴──────────┘

If "learn" appears at multiple scopes, app-specific wins.
```

---

## Override Example

```
Base Pattern:
┌──────────────────────────────────────────────────┐
│ pattern: "learn"                                 │
│ intent_type: informational                       │
│ weight: 1.2                                      │
│ priority: 100                                    │
│ scope: base                                      │
└──────────────────────────────────────────────────┘

Override:
┌──────────────────────────────────────────────────┐
│ base_pattern_id: <uuid-for-learn>               │
│ scope: vertical                                  │
│ vertical: Education                              │
│ weight_multiplier: 1.5  (boost by 50%)           │
│ reason: "Education apps emphasize learning"      │
└──────────────────────────────────────────────────┘

Effective Weight for Education Apps:
  Base weight: 1.2
  Multiplier: 1.5
  Effective weight: 1.2 × 1.5 = 1.8

Result:
  - Education apps: "learn" has weight 1.8
  - Other verticals: "learn" has weight 1.2
```

---

## KPI Calculation Flow

```
Metadata Audit Engine:
═══════════════════════════════════════════════════════════════════════════

1. Load patterns (base + vertical + market)
   ↓
2. Extract tokens from title/subtitle/description
   ↓
3. Classify each token (Layer 1)
   ↓
4. Calculate Layer 1 KPIs:
   ┌─────────────────────────────────────────────────┐
   │ informational_coverage = count(informational) / total │
   │ commercial_coverage = count(commercial) / total       │
   │ transactional_coverage = count(transactional) / total │
   │ navigational_coverage = count(navigational) / total   │
   │ dominant_intent = max(coverage by type)               │
   │ intent_diversity = unique intent types / 4            │
   │ intent_score = weighted average (0-100)               │
   └─────────────────────────────────────────────────┘
   ↓
5. Generate combos from tokens
   ↓
6. Classify combos (Layer 2)
   ↓
7. Calculate Layer 2 metrics:
   ┌─────────────────────────────────────────────────┐
   │ learning_combo_count = count(intentClass='learning') │
   │ outcome_combo_count = count(intentClass='outcome')   │
   │ brand_combo_count = count(intentClass='brand')       │
   │ noise_combo_count = count(intentClass='noise')       │
   │ high_value_ratio = (learning + outcome) / total      │
   └─────────────────────────────────────────────────┘
   ↓
8. Store in aso_audit_snapshots.audit_data:
   {
     "metadataAnalysis": {
       "intentCoverage": {
         "informational": 65,
         "commercial": 40,
         "transactional": 30,
         "navigational": 20
       },
       "dominantIntent": "informational",
       "intentScore": 78
     },
     "comboDistribution": {
       "learning": 12,
       "outcome": 8,
       "brand": 3,
       "noise": 5
     }
   }
```

---

## Admin UI Future Schema (Phase 25+)

```
Pattern Management UI:
═══════════════════════════════════════════════════════════════════════════

┌────────────────────────────────────────────────────────────────────────┐
│ ASO Bible Intent Patterns                                    [+ Add]   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Filters: [All Intents ▼] [All Scopes ▼] [Active Only ✓]              │
│ Search: [_____________________________] 🔍                             │
│                                                                         │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ Pattern    Intent          Scope    Weight  Priority  Actions    │  │
│ ├──────────────────────────────────────────────────────────────────┤  │
│ │ learn      Informational   Base     1.2     100       [Edit] [X] │  │
│ │ best       Commercial      Base     1.5     120       [Edit] [X] │  │
│ │ download   Transactional   Base     2.0     150       [Edit] [X] │  │
│ │ vocabulary Informational   Edu      1.3     105       [Edit] [X] │  │
│ │ ...                                                               │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ [Bulk Import CSV] [Export CSV] [Test Patterns]                        │
└────────────────────────────────────────────────────────────────────────┘

Edit Pattern Modal:
┌────────────────────────────────────────────────────────────────────────┐
│ Edit Pattern: "learn"                                         [Save]   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Pattern:        [learn________________]                                │
│ Intent Type:    [Informational ▼]                                      │
│ Scope:          [Base ▼]                                               │
│ Vertical:       [─────────────────────] (for vertical scope)           │
│ Market:         [─────────────────────] (for market scope)             │
│ Weight:         [1.2___] (0.1-3.0)                                     │
│ Priority:       [100___] (0-200)                                       │
│ Match Type:     [Exact ▼] (exact | contains | regex)                  │
│ Word Boundary:  [✓] Require word boundaries                            │
│ Case Sensitive: [ ] Case-sensitive matching                            │
│ Example Usage:  [learn spanish_______]                                 │
│                                                                         │
│ [Test Pattern] [Cancel] [Save]                                        │
└────────────────────────────────────────────────────────────────────────┘

Test Pattern Tool:
┌────────────────────────────────────────────────────────────────────────┐
│ Test Patterns                                                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Input Text:                                                            │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ Learn Spanish Free - Language Lessons for Beginners              ││
│ └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ Vertical: [Education ▼]  Market: [us ▼]                               │
│                                                                         │
│ [Run Test]                                                             │
│                                                                         │
│ Results:                                                               │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ Token      Pattern    Intent           Weight  Priority           ││
│ │ ────────   ─────────  ───────────────  ──────  ────────           ││
│ │ learn      learn      informational    1.2     100                ││
│ │ spanish    (none)     unclassified     -       -                  ││
│ │ free       free       transactional    1.8     140                ││
│ │ language   language   informational    1.1     95                 ││
│ │ lessons    lessons    informational    1.1     85                 ││
│ │ beginners  beginner   informational    1.0     90                 ││
│ │                                                                    ││
│ │ Coverage: 5/6 tokens (83%)                                         ││
│ │ Dominant Intent: Informational                                     ││
│ └────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

---

## Summary: Table Usage Rules

| Table | Purpose | Phase 22 | Phase 23 | Phase 24+ |
|-------|---------|----------|----------|-----------|
| **aso_intent_patterns** | Pattern brain | 300 base patterns | +200 vertical patterns | +market, client, app |
| **aso_intent_pattern_overrides** | Weight/priority tweaks | Not used | 20-30 overrides | Client customization |
| **search_intent_registry** | Autocomplete cache | ❌ NOT USED | ❌ NOT USED | ❌ DEPRECATED |

---

**Schema Map Status**: COMPLETE ✅
**Data Flow**: Validated from DB → Engine → UI
**Ready for Phase 22**: YES ✅
