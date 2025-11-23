# Metadata KPI and Formula Registry

**The ASO Bible — Single Source of Truth for Metadata Scoring**

Version: Phase 1 (Title & Subtitle KPI Engine)
Last Updated: 2025-11-23

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [KPI Registry](#kpi-registry)
4. [Formula Registry](#formula-registry)
5. [How Components Use Registries](#how-components-use-registries)
6. [How to Add/Modify KPIs](#how-to-addmodify-kpis)
7. [How to Add/Modify Formulas](#how-to-addmodify-formulas)
8. [Future Frontend Management](#future-frontend-management)
9. [Validation & QA](#validation--qa)

---

## Overview

### The ASO Bible Engine Concept

The **ASO Bible** is Yodel's centralized, registry-driven metadata scoring system. All KPI definitions, formulas, weights, and thresholds are stored in JSON registries and TypeScript definition files — **never hard-coded in UI components**.

**Key Principles**:

1. **Single Source of Truth**: All scoring logic lives in registries
2. **Deterministic**: Same input = same output, always
3. **Versionable**: Registry changes are tracked via git
4. **Admin-Ready**: Enhanced with metadata for future management UI
5. **No Behavioral Coupling**: UI components consume registry data, never define logic

**Why?**

- **Consistency**: Marketing team, backend engine, and frontend UI all use identical formulas
- **Auditability**: Client can inspect exact scoring methodology
- **Flexibility**: Change weights/thresholds without touching UI code
- **Compliance**: Reproducible scores for reports and contracts

---

## Architecture

### Registry Structure

```
src/engine/metadata/
├── kpi/
│   ├── kpi.types.ts              # Type definitions with admin metadata
│   ├── kpi.registry.json         # 34 KPI definitions (Phase 1)
│   ├── kpi.families.json         # 6 KPI families with weights
│   └── kpiEngine.ts              # KPI computation engine
├── metadataFormulaRegistry.ts    # 8 metadata scoring formulas
├── metadataScoringRegistry.ts    # Legacy rule-based scoring (still active)
└── metadataAuditEngine.ts        # Main audit orchestrator

src/services/
└── metadataConfigService.ts      # Helper layer for registry access
```

### Data Flow

```
User Input (Title, Subtitle)
       ↓
MetadataAuditEngine.evaluate()
       ↓
┌──────────────────────────────────────────┐
│  KpiEngine.evaluate()                    │
│  - Reads kpi.registry.json               │
│  - Reads kpi.families.json               │
│  - Computes 34 KPIs across 6 families    │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│  Formula Registry (metadataFormulaRegistry.ts)
│  - Defines metadata_overall_score        │
│  - Defines title_element_score           │
│  - Defines subtitle_element_score        │
└──────────────────────────────────────────┘
       ↓
UI Components (MetadataKpiGrid, Charts)
  - Use metadataConfigService to fetch definitions
  - Render scores with labels, help text, colors
  - Never compute scores themselves
```

---

## KPI Registry

### Location

- **Definitions**: `src/engine/metadata/kpi/kpi.registry.json`
- **Families**: `src/engine/metadata/kpi/kpi.families.json`
- **Types**: `src/engine/metadata/kpi/kpi.types.ts`

### KPI Registry Structure

**File**: `kpi.registry.json`

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
        "min": 0,
        "max": 1,
        "step": 0.05,
        "group": "Title",
        "displayOrder": 1,
        "helpText": "Maximize title character utilization for ranking power",
        "notes": "Apple App Store: 30 chars max",
        "tags": ["title", "character-limits", "optimization"]
      }
    }
  ]
}
```

**34 KPIs** organized across **6 families**:

1. **Clarity & Structure** (20%) — Character usage, keyword counts, structural quality
2. **Keyword Architecture** (25%) — Unique keywords, combo coverage, incremental value
3. **Hook Strength** (15%) — CTA strength, feature mentions, engagement hooks
4. **Brand vs Generic** (20%) — Brand presence, generic discovery balance
5. **Psychology Alignment** (10%) — Emotional triggers, user motivation alignment
6. **Intent Alignment** (10%) — Search intent coverage (navigational, informational, commercial, transactional)

### Family Registry Structure

**File**: `kpi.families.json`

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
        "icon": "layout",
        "helpText": "Foundation metrics — character limits and structure",
        "notes": "Weight=20% reflects importance of metadata fundamentals"
      }
    }
  ]
}
```

**Weights**:

- Clarity & Structure: **20%**
- Keyword Architecture: **25%** (highest — drives discovery)
- Hook Strength: **15%**
- Brand vs Generic: **20%**
- Psychology Alignment: **10%**
- Intent Alignment: **10%**

**Total**: 100% (validated via `metadataConfigService.validateFamilyWeights()`)

### Admin Metadata Fields

All KPIs and families include optional `admin` metadata for future management UI:

**KpiAdminMeta**:

- `editable`: Can this KPI weight be adjusted?
- `inputType`: Control type (`slider`, `number`, `toggle`, `select`, `readonly`)
- `min`, `max`, `step`: Constraints for numeric inputs
- `group`: Display grouping (e.g., "Title", "Subtitle", "Coverage")
- `displayOrder`: Sort order within group
- `helpText`: User-facing tooltip (one-liner)
- `notes`: Internal notes for Yodel team
- `tags`: Filtering/search tags

**FamilyAdminMeta**:

- `editable`: Can family weight be adjusted?
- `displayOrder`: Sort order in UI
- `color`: Hex color for visualizations
- `icon`: Icon identifier (e.g., "layout", "target", "brain")
- `helpText`: User-facing tooltip
- `notes`: Internal notes

---

## Formula Registry

### Location

- **Definitions**: `src/engine/metadata/metadataFormulaRegistry.ts`

### Formula Registry Structure

**8 Core Formulas** defined in `METADATA_FORMULA_REGISTRY`:

#### 1. Overall Metadata Score

```typescript
{
  id: 'metadata_overall_score',
  label: 'Overall Metadata Score',
  description: 'Weighted combination of Title (65%) and Subtitle (35%)',
  type: 'weighted_sum',
  components: [
    { id: 'title_score', weight: 0.65 },
    { id: 'subtitle_score', weight: 0.35 },
  ],
  admin: {
    editable: false,
    inputType: 'readonly',
    group: 'Overall',
    helpText: 'Primary ASO ranking score',
  },
}
```

**Why 65/35?** Apple's App Store algorithm heavily prioritizes title for ranking. Subtitle is secondary but critical for adding new high-value keywords.

#### 2. Title Element Score

```typescript
{
  id: 'title_element_score',
  label: 'Title Element Score',
  type: 'weighted_sum',
  components: [
    { id: 'title_character_usage', weight: 0.25 },
    { id: 'title_unique_keywords', weight: 0.30 },
    { id: 'title_combo_coverage', weight: 0.30 },
    { id: 'title_filler_penalty', weight: 0.15 },
  ],
  admin: {
    editable: true,
    inputType: 'slider',
    group: 'Title',
  },
}
```

**Rules**:

- **Character Usage** (25%): Maximize 30-char limit
- **Unique Keywords** (30%): High-value keyword count
- **Combo Coverage** (30%): Multi-word phrase potential
- **Filler Penalty** (15%): Avoid low-value words (the, a, and, for)

#### 3. Subtitle Element Score

```typescript
{
  id: 'subtitle_element_score',
  label: 'Subtitle Element Score',
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
    group: 'Subtitle',
  },
}
```

**Rules**:

- **Character Usage** (20%): Use 30-char limit efficiently
- **Incremental Value** (40%): NEW keywords not in title (highest weight — critical for organic reach)
- **Combo Coverage** (25%): Additional combo potential
- **Complementarity** (15%): How well subtitle supports title

#### 4. Description Conversion Score

```typescript
{
  id: 'description_conversion_score',
  label: 'Description Conversion Score',
  type: 'weighted_sum',
  components: [
    { id: 'description_hook_strength', weight: 0.30 },
    { id: 'description_feature_mentions', weight: 0.25 },
    { id: 'description_cta_strength', weight: 0.20 },
    { id: 'description_readability', weight: 0.25 },
  ],
  admin: {
    editable: true,
    inputType: 'slider',
    group: 'Conversion',
  },
}
```

**⚠️ IMPORTANT**: Description does **NOT** affect App Store ranking. This score measures conversion quality only.

#### 5-8. Dimension Scores (Visualization)

Used for radar charts and dimension analysis:

- **metadata_dimension_relevance**: Average of title + subtitle scores
- **metadata_dimension_learning**: Threshold-based on generic combo count (target: 5+)
- **metadata_dimension_structure**: Uses title score as proxy
- **metadata_dimension_brand_balance**: Custom formula for generic/(branded+generic) ratio

### Formula Types

**weighted_sum**: Linear combination of components
**ratio**: Simple division (A / B)
**composite**: Multi-stage computation (use other formulas)
**threshold_based**: Score awarded based on condition (e.g., >= 5 combos = 100 points)
**custom**: Complex logic described in `computationNotes`

---

## How Components Use Registries

### UI Components Never Hard-Code Logic

❌ **WRONG** (hard-coded):

```typescript
// BAD: Hard-coded KPI label and weight
<div>
  <span>Title Character Usage</span>
  <span>{(titleChars / 30) * 100}%</span>
</div>
```

✅ **CORRECT** (registry-driven):

```typescript
import { getKpiDefinition } from '@/services/metadataConfigService';

const kpiDef = getKpiDefinition('title_char_usage');
<div>
  <span>{kpiDef.label}</span>
  <span>{kpiResult.kpis['title_char_usage'].normalized}%</span>
  <Tooltip>{kpiDef.description}</Tooltip>
</div>
```

### Example: MetadataKpiGrid Component

**File**: `src/components/AppAudit/MetadataKpi/MetadataKpiGrid.tsx`

```typescript
import { getAllFamilies, getKpisByFamily } from '@/services/metadataConfigService';

const families = getAllFamilies();

families.forEach(family => {
  const kpis = getKpisByFamily(family.id);
  const familyScore = kpiResult.families[family.id].score;

  // Render family card
  <Card>
    <CardTitle>{family.label}</CardTitle>
    <Badge>{familyScore}/100</Badge>

    {kpis.map(kpi => (
      <KpiRow
        label={kpi.label}
        value={kpiResult.kpis[kpi.id].normalized}
        helpText={kpi.admin?.helpText}
        color={family.admin?.color}
      />
    ))}
  </Card>
});
```

### Example: Chart Components

**File**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/MetadataDimensionRadar.tsx`

```typescript
import { getFormulaDefinition } from '@/services/metadataConfigService';

const relevanceFormula = getFormulaDefinition('metadata_dimension_relevance');
const learningFormula = getFormulaDefinition('metadata_dimension_learning');

// Use formula metadata for tooltips
<Tooltip>
  <p>{relevanceFormula.description}</p>
  <p>Weight: {relevanceFormula.components.map(c => `${c.id}: ${c.weight * 100}%`)}</p>
</Tooltip>
```

**UI-Specific Thresholds Allowed**:

UI components CAN use hard-coded thresholds for **visualization purposes only** (color coding, severity labels). These are NOT business logic.

✅ **ALLOWED**:

```typescript
// Color coding for UI clarity
const color = score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red';
```

This is acceptable because it's presentation logic, not scoring logic.

---

## How to Add/Modify KPIs

### Step 1: Update `kpi.registry.json`

Add new KPI definition or modify existing weights:

```json
{
  "id": "subtitle_semantic_density",
  "familyId": "keyword_architecture",
  "label": "Subtitle Semantic Density",
  "description": "Ratio of unique semantic intents to total keywords",
  "weight": 0.20,
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
    "group": "Subtitle",
    "displayOrder": 5,
    "helpText": "Higher density = less keyword repetition",
    "notes": "Introduced in Phase 2 for semantic analysis",
    "tags": ["subtitle", "semantic", "density"]
  }
}
```

### Step 2: Update `kpiEngine.ts` Computation Logic

**File**: `src/engine/metadata/kpi/kpiEngine.ts`

Add computation logic for new KPI:

```typescript
// In evaluateKpi() function
case 'subtitle_semantic_density': {
  const uniqueIntents = /* compute unique semantic intents */;
  const totalKeywords = tokens.subtitle.length;
  return totalKeywords > 0 ? uniqueIntents / totalKeywords : 0;
}
```

### Step 3: Validate Weight Sums

Ensure family KPI weights still sum to 1.0:

```typescript
import { validateKpiWeightsPerFamily } from '@/services/metadataConfigService';

const validation = validateKpiWeightsPerFamily();
console.log(validation);
// { keyword_architecture: { valid: true, sum: 1.0 } }
```

### Step 4: Update Tests

Add test case for new KPI in `kpiEngine.test.ts`.

### Step 5: Document in Admin Notes

Add internal notes to KPI's `admin.notes` field explaining:

- Why this KPI was added
- What it measures
- Expected value ranges
- Any edge cases

---

## How to Add/Modify Formulas

### Step 1: Update `metadataFormulaRegistry.ts`

Add new formula definition:

```typescript
{
  id: 'metadata_engagement_score',
  label: 'Engagement Prediction Score',
  description: 'Predicts user engagement based on hook diversity and CTA strength',
  type: 'weighted_sum',
  components: [
    { id: 'hook_diversity', weight: 0.60, source: 'hook_diversity_kpi' },
    { id: 'cta_strength', weight: 0.40, source: 'description_cta_strength' },
  ],
  admin: {
    editable: true,
    inputType: 'slider',
    min: 0,
    max: 1,
    step: 0.05,
    group: 'Engagement',
    displayOrder: 1,
    helpText: 'Diverse hooks + strong CTAs = higher engagement',
    notes: 'Phase 3 formula for conversion optimization',
  },
}
```

### Step 2: Implement Computation (if needed)

For `weighted_sum` formulas, no additional code needed — the formula registry is self-describing.

For `custom` formulas, implement logic in relevant engine file and reference in `computationNotes`:

```typescript
{
  id: 'brand_saturation_penalty',
  type: 'custom',
  computationNotes: 'Computed as: max(0, 100 - (brandComboCount / totalCombos * 200)). Penalizes excessive brand keyword usage.',
  admin: { editable: false },
}
```

### Step 3: Test Formula Output

Verify formula produces expected scores:

```typescript
import { getFormulaDefinition } from '@/services/metadataConfigService';

const formula = getFormulaDefinition('metadata_engagement_score');
// Use formula.components to compute score
```

### Step 4: Update Documentation

Document new formula in this file's Formula Registry section.

---

## Future Frontend Management

### Admin UI Roadmap (Phase 6+)

The enhanced registries are **admin-ready** for future management UI:

#### Planned Features:

1. **KPI Weight Editor**
   - Grouped sliders for each family
   - Real-time validation (weights sum to 1.0)
   - Preview mode (test new weights on sample data)
   - Export/import configurations as JSON

2. **Formula Builder**
   - Visual formula composer (drag-and-drop components)
   - Weight adjustment sliders
   - Live score preview
   - Formula templates library

3. **Threshold Manager**
   - Edit threshold values for threshold-based formulas
   - Color-coded severity levels
   - A/B test configurations

4. **Configuration Versioning**
   - Save named configurations (e.g., "Aggressive Discovery", "Brand Protection")
   - Compare configurations side-by-side
   - Roll back to previous versions
   - Export reports showing config impact

#### API Surface (Already Implemented)

**metadataConfigService.ts** provides clean accessor functions:

```typescript
// Fetch editable KPIs grouped by UI section
const kpisByGroup = getEditableKpisByGroup();
// { "Title": [...], "Subtitle": [...], "Coverage": [...] }

// Render admin controls
Object.entries(kpisByGroup).forEach(([group, kpis]) => {
  kpis.forEach(kpi => {
    if (kpi.admin?.inputType === 'slider') {
      <Slider
        label={kpi.label}
        value={kpi.weight}
        min={kpi.admin.min}
        max={kpi.admin.max}
        step={kpi.admin.step}
        helpText={kpi.admin.helpText}
        onChange={(val) => updateKpiWeight(kpi.id, val)}
      />
    }
  });
});
```

**Validation Helpers**:

```typescript
// Ensure config integrity before saving
const familyValidation = validateFamilyWeights();
const kpiValidation = validateKpiWeightsPerFamily();

if (!familyValidation.valid) {
  showError(familyValidation.error);
}
```

#### Future UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  ASO Bible Configuration Manager                            │
├─────────────────────────────────────────────────────────────┤
│  Family Weights                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Clarity & Structure        [████░░░░░░] 20%          │  │
│  │ Keyword Architecture       [█████░░░░░] 25%          │  │
│  │ Hook Strength              [███░░░░░░░] 15%          │  │
│  │ Brand vs Generic           [████░░░░░░] 20%          │  │
│  │ Psychology Alignment       [██░░░░░░░░] 10%          │  │
│  │ Intent Alignment           [██░░░░░░░░] 10%          │  │
│  │                                         ✅ Sum: 100% │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Title Element Score Formula                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Character Usage            [█████░░░░░] 25%          │  │
│  │ Unique Keywords            [██████░░░░] 30%          │  │
│  │ Combo Coverage             [██████░░░░] 30%          │  │
│  │ Filler Penalty             [███░░░░░░░] 15%          │  │
│  │                                         ✅ Sum: 100% │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [Preview on Sample Data]  [Save Configuration]  [Export]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation & QA

### Pre-Deployment Checklist

Before deploying registry changes:

1. **Weight Validation**

   ```bash
   npm run test:kpi-registry
   ```

   Ensures:
   - Family weights sum to 1.0
   - KPI weights within each family sum to 1.0
   - All KPIs reference valid families

2. **TypeScript Type Checking**

   ```bash
   npx tsc --noEmit
   ```

   Ensures:
   - All registry JSON matches type definitions
   - No type errors in metadataConfigService

3. **Engine Reproducibility Test**

   Run same input through engine before/after registry change:

   ```typescript
   const input = { title: 'Learn Spanish - Language Learning App', subtitle: 'Speak Fluently in 30 Days' };
   const before = KpiEngine.evaluate(input);
   // ... modify registry ...
   const after = KpiEngine.evaluate(input);

   // If weights unchanged, scores should match
   expect(before.overallScore).toBe(after.overallScore);
   ```

4. **UI Regression Test**

   - Load Metadata Audit V2 page
   - Verify all KPI cards render
   - Verify charts display correctly
   - Verify no console errors

5. **Documentation Sync**

   - Update this doc if formula weights change
   - Update admin.helpText if KPI meaning changes
   - Add migration notes if breaking changes

### Common Issues

**Issue**: Family weights don't sum to 1.0
**Fix**: Run `validateFamilyWeights()` and adjust weights in `kpi.families.json`

**Issue**: TypeScript error importing JSON
**Fix**: Ensure JSON matches interface in `kpi.types.ts`, check for typos in `id` fields

**Issue**: UI shows "undefined" for KPI label
**Fix**: Check KPI `id` in result matches `id` in registry, verify import paths

**Issue**: Scores changed after registry update
**Fix**: Expected if weights changed. Document in git commit message. Run reproducibility test to isolate change.

---

## Version History

**Phase 1 (2025-11-23)**:

- Created KPI Registry with 34 KPIs across 6 families
- Created Formula Registry with 8 core formulas
- Enhanced types with admin metadata
- Implemented metadataConfigService helper layer
- Documented ASO Bible architecture

**Future Phases**:

- Phase 2: Keyword Field KPIs (10+ additional KPIs for 100-char keyword field)
- Phase 3: Visual Assets KPIs (icon, screenshots, video)
- Phase 4: Localization KPIs (multi-locale metadata quality)
- Phase 5: Competitive KPIs (compare against competitor metadata)
- Phase 6: Admin UI (frontend management interface)

---

## Contact & Support

For questions about the ASO Bible registry system:

- **Engineering**: Check `src/services/metadataConfigService.ts` for API reference
- **Product**: Review formula weights in `metadataFormulaRegistry.ts`
- **Data Science**: Analyze KPI distributions in `kpi.registry.json`

**DO NOT**:

- Hard-code KPI labels or weights in UI components
- Modify registry JSON without running validation tests
- Change formula weights without documenting rationale

**ALWAYS**:

- Use `metadataConfigService` helpers for registry access
- Validate weight sums after modifications
- Update this documentation when adding new KPIs/formulas
- Test reproducibility before deploying changes

---

**End of ASO Bible Documentation**
