# PHASE 13 — ADMIN UI LAYER (IMPLEMENTATION PLAN)

**Status**: 🚧 **IN PROGRESS** - Foundation Complete, UI Components Pending
**Date**: January 2025
**Phase**: 13 of ASO Bible Implementation
**Dependencies**: Phase 12 (Ruleset Engine), Phase 11 (Storage Layer), Phase 10 (Overrides)

---

## 📋 Executive Summary

Phase 13 creates a comprehensive administrative interface for managing the ASO Bible ruleset system. This is a **zero scoring-change** phase that only adds UI, API routes, and CRUD operations on top of the existing ruleset engine.

### What Has Been Built (Foundation)

✅ **Admin API Service Layer**
- `src/services/admin/adminRulesetApi.ts` (350+ lines)
  - Ruleset list/get/preview/publish/rollback
  - Audit log access
  - Cache invalidation on changes

✅ **Admin Override API Service**
- `src/services/admin/adminOverrideApi.ts` (450+ lines)
  - CRUD for token relevance overrides
  - CRUD for hook pattern overrides
  - CRUD for stopword overrides
  - CRUD for KPI weight overrides
  - CRUD for formula overrides
  - CRUD for recommendation template overrides

### What Needs to Be Built (UI Components)

The following UI components need to be implemented. Due to the extensive nature of this work (15+ major components, 3000+ lines of React/TypeScript), this document serves as a comprehensive implementation guide.

---

## 🏗️ Architecture

### API Layer (✅ Complete)

```
src/services/admin/
├── adminRulesetApi.ts     (350+ lines) ✅
└── adminOverrideApi.ts    (450+ lines) ✅
```

**Key Classes**:
- `AdminRulesetApi` - Ruleset management (list, get, preview, publish, rollback, audit log)
- `AdminOverrideApi` - Override CRUD operations (token, hook, stopword, KPI, formula, recommendation)

### UI Layer (🚧 Pending)

```
src/pages/admin/
├── AsoBibleEditor/
│   ├── index.tsx                        // Main layout with sidebar
│   ├── RulesetList.tsx                  // List all rulesets
│   ├── VerticalRuleManager.tsx          // Manage vertical rulesets
│   ├── MarketRuleManager.tsx            // Manage market rulesets
│   ├── TokenRelevanceEditor.tsx         // Edit token overrides
│   ├── IntentPatternEditor.tsx          // Edit intent patterns
│   ├── HookCategoryEditor.tsx           // Edit hook categories
│   ├── StopwordEditor.tsx               // Edit stopwords
│   ├── KpiWeightEditor.tsx              // Edit KPI weights
│   ├── FormulaWeightEditor.tsx          // Edit formula weights
│   ├── RecommendationTemplateEditor.tsx // Edit recommendations
│   ├── VersionManager.tsx               // Version control UI
│   ├── RulePreviewSimulator.tsx         // Preview merged rulesets
│   └── AuditLog.tsx                     // View audit history
└── components/
    ├── TokenOverrideTable.tsx
    ├── HookCategoryTable.tsx
    ├── KpiWeightSlider.tsx
    ├── RecommendationTemplateForm.tsx
    └── RulesetVersionComparator.tsx
```

---

## 🎯 Implementation Guide

### Step 1: Create Admin Layout

**File**: `src/pages/admin/AsoBibleEditor/index.tsx`

**Purpose**: Main container with sidebar navigation

**Features**:
- Sidebar with nested navigation
- Route protection (internal users only)
- Breadcrumb navigation
- Active route highlighting

**Navigation Structure**:
```
ASO Bible Editor
   ▾ RuleSets
      - Vertical Profiles
      - Market Profiles
      - Client Overrides
   ▾ Patterns
      - Intent Patterns
      - Hook Patterns
      - Token Relevance
      - Stopwords
   ▾ Scoring
      - KPI Weights
      - Formula Weights
   ▾ Recommendations
      - Templates
   ▾ Versions
      - Version Manager
      - Change Log
   ▾ Tools
      - Rule Preview Simulator
```

**Technology Stack**:
- React Router for routing
- shadcn/ui components (Sidebar, NavigationMenu, Breadcrumb)
- Tailwind CSS for styling
- Dark theme by default

---

### Step 2: Implement Ruleset List View

**File**: `src/pages/admin/AsoBibleEditor/RulesetList.tsx`

**Purpose**: Display all rulesets (vertical, market, client)

**Features**:
- Data table with sorting/filtering
- Columns: Label, Type, Version, Active Status, Last Updated
- Action buttons: View, Edit, Activate/Deactivate
- Search bar
- Filter by scope (vertical/market/client)

**API Integration**:
```typescript
import { AdminRulesetApi } from '@/services/admin/adminRulesetApi';

const { data, isLoading } = useQuery({
  queryKey: ['rulesets'],
  queryFn: () => AdminRulesetApi.getRulesetList(),
});
```

**shadcn/ui Components**:
- `Table` - Data table
- `Input` - Search bar
- `Select` - Filter dropdown
- `Badge` - Status badges
- `Button` - Action buttons

---

### Step 3: Implement Vertical Rule Manager

**File**: `src/pages/admin/AsoBibleEditor/VerticalRuleManager.tsx`

**Purpose**: Manage vertical-level rule sets

**Features**:
- Tabbed interface:
  - Token Overrides
  - Intent Patterns
  - Hook Patterns
  - KPI Weights
  - Stopwords
  - Recommendations
  - Version Metadata
- Inline editing
- Add/Remove overrides
- Preview changes before publishing
- Publish button with version notes

**API Integration**:
```typescript
import { AdminRulesetApi } from '@/services/admin/adminRulesetApi';
import { AdminOverrideApi } from '@/services/admin/adminOverrideApi';

// Load vertical ruleset
const { data: ruleset } = useQuery({
  queryKey: ['ruleset', verticalId],
  queryFn: () => AdminRulesetApi.getRuleset(verticalId),
});

// Add token override
const addTokenMutation = useMutation({
  mutationFn: (request: CreateTokenOverrideRequest) =>
    AdminOverrideApi.upsertTokenOverride(request),
  onSuccess: () => queryClient.invalidateQueries(['ruleset', verticalId]),
});
```

**shadcn/ui Components**:
- `Tabs` - Tab navigation
- `Card` - Section containers
- `Form` - Controlled forms
- `Button` - Save/Cancel buttons
- `Alert` - Success/Error messages

---

### Step 4: Implement Token Relevance Editor

**File**: `src/pages/admin/AsoBibleEditor/TokenRelevanceEditor.tsx`

**Purpose**: Edit token relevance overrides (0-3 scoring)

**Features**:
- Editable data table
- Columns: Token, Relevance (0-3), Source, Actions
- Add new token form
- Relevance selector (0-3 dropdown)
- Delete token button
- Search/filter tokens
- Bulk import from CSV

**UI Elements**:
```tsx
<TokenOverrideTable
  overrides={tokenOverrides}
  onUpdate={(token, relevance) => updateToken(token, relevance)}
  onDelete={(id) => deleteToken(id)}
/>

<AddTokenForm
  onSubmit={(token, relevance) => addToken(token, relevance)}
  scope="vertical"
  verticalId={verticalId}
/>
```

**Relevance Selector**:
- 0 - Not Relevant
- 1 - Low Relevance
- 2 - Medium Relevance
- 3 - High Relevance

---

### Step 5: Implement Hook Category Editor

**File**: `src/pages/admin/AsoBibleEditor/HookCategoryEditor.tsx`

**Purpose**: Manage hook categories (learning/outcome/ease/time/trust/safety)

**Features**:
- List of hook categories
- Keywords multi-select (add/remove keywords)
- Weight multiplier slider (0.5x - 2.0x)
- Visual preview of weight impact
- Save changes button

**UI Elements**:
```tsx
<HookCategoryCard
  category="learning_educational"
  keywords={['learn', 'study', 'practice']}
  weightMultiplier={1.5}
  onUpdateKeywords={(keywords) => updateKeywords(category, keywords)}
  onUpdateWeight={(weight) => updateWeight(category, weight)}
/>
```

**Weight Multiplier**:
- Slider with min 0.5, max 2.0, step 0.1
- Real-time preview of effective weight
- Reset to default (1.0) button

---

### Step 6: Implement KPI Weight Editor

**File**: `src/pages/admin/AsoBibleEditor/KpiWeightEditor.tsx`

**Purpose**: Edit KPI weight multipliers

**Features**:
- List of KPIs with weight sliders
- Real-time normalization preview
- Shows effective weight after multipliers
- Comparison: Base weight → Modified weight → Normalized weight
- Save changes button
- Reset to defaults button

**UI Elements**:
```tsx
<KpiWeightSlider
  kpiId="metadata_quality"
  baseWeight={0.3}
  multiplier={1.5}
  effectiveWeight={0.45}
  normalizedWeight={0.35}
  onUpdateMultiplier={(multiplier) => updateKpiWeight(kpiId, multiplier)}
/>
```

**Normalization Display**:
- Show sum of all weights
- Show normalized distribution
- Highlight weights that changed

---

### Step 7: Implement Recommendation Template Editor

**File**: `src/pages/admin/AsoBibleEditor/RecommendationTemplateEditor.tsx`

**Purpose**: Edit recommendation message templates

**Features**:
- List of recommendation templates
- Grouped by category (token, intent, hook, KPI, etc.)
- Inline text editor
- Severity selector (low, medium, high, critical)
- Preview rendered recommendation
- Variable interpolation support

**UI Elements**:
```tsx
<RecommendationTemplateForm
  recommendationId="token_low_relevance"
  message="Token '{token}' has low relevance. Consider replacing with higher-value keywords."
  severity="medium"
  onUpdate={(message, severity) => updateRecommendation(recommendationId, message, severity)}
/>
```

**Variable Interpolation**:
- Support `{token}`, `{category}`, `{score}`, etc.
- Live preview with sample data
- Syntax validation

---

### Step 8: Implement Version Manager

**File**: `src/pages/admin/AsoBibleEditor/VersionManager.tsx`

**Purpose**: Version control for rulesets

**Features**:
- Table of versions with metadata
- Columns: Version, Date, Author, Notes, Active Status
- View version details (diff from previous)
- Rollback to previous version
- Publish new version
- Compare versions side-by-side

**UI Elements**:
```tsx
<VersionTable
  versions={versions}
  onViewDetails={(versionId) => showVersionDetails(versionId)}
  onRollback={(versionId) => rollbackToVersion(versionId)}
  onCompare={(v1, v2) => compareVersions(v1, v2)}
/>

<VersionComparator
  version1={v1}
  version2={v2}
  diff={computedDiff}
/>
```

**Rollback Workflow**:
1. Select target version
2. Confirm rollback (show diff)
3. Execute rollback (deactivate current, activate target)
4. Invalidate cache
5. Log to audit

---

### Step 9: Implement Rule Preview Simulator

**File**: `src/pages/admin/AsoBibleEditor/RulePreviewSimulator.tsx`

**Purpose**: Preview merged ruleset before publishing

**Features**:
- Input form: Vertical, Market, Organization (optional)
- Optional: App metadata sample (for realistic preview)
- Optional: Draft override changes (not yet saved)
- Output: Merged ruleset preview
  - Token overrides count
  - Hook overrides count
  - Stopwords count
  - KPI overrides count
  - Formula overrides count
  - Recommendation overrides count
- Diff view: Current vs Modified
- Export preview as JSON

**UI Elements**:
```tsx
<PreviewForm
  onPreview={(request: RulesetPreviewRequest) => previewRuleset(request)}
/>

<PreviewOutput
  merged={mergedRuleset}
  diff={diffFromCurrent}
/>

<DiffViewer
  current={currentRuleset}
  modified={modifiedRuleset}
/>
```

**Diff View**:
- Side-by-side comparison
- Highlight added/removed/modified
- Expandable sections
- Export as JSON/CSV

---

### Step 10: Implement Audit Log Viewer

**File**: `src/pages/admin/AsoBibleEditor/AuditLog.tsx`

**Purpose**: View all ruleset changes

**Features**:
- Table of audit log entries
- Columns: Timestamp, Actor, Table, Operation, Diff
- Filter by: Date range, Actor, Table, Operation
- Expandable rows (show full diff)
- Export as CSV

**UI Elements**:
```tsx
<AuditLogTable
  entries={auditLog}
  onFilter={(filters) => setFilters(filters)}
  onExport={() => exportAuditLog()}
/>

<AuditLogEntry
  entry={entry}
  expanded={isExpanded}
  onToggle={() => setExpanded(!isExpanded)}
/>
```

**Audit Entry Details**:
- Show old value
- Show new value
- Show diff (JSON patch format)
- Link to actor (if available)

---

## 🔒 Security & Permissions

### Authentication

All admin routes must check for internal Yodel staff:

```typescript
import { useAuth } from '@/hooks/useAuth';

function AsoBibleEditor() {
  const { user, isInternalUser } = useAuth();

  if (!isInternalUser) {
    return <Redirect to="/dashboard" />;
  }

  // Render admin UI
}
```

### RLS Policies

Phase 11 RLS policies already handle:
- Internal Yodel users: Full read/write access
- Organization users: Read-only for vertical/market, read/write for client overrides
- Public: No access

### Frontend Guards

Add route guards in React Router:

```typescript
<Route
  path="/admin/aso-bible-editor"
  element={
    <RequireInternalUser>
      <AsoBibleEditor />
    </RequireInternalUser>
  }
/>
```

---

## 🧪 Testing Requirements

### Test File

`test-admin-ruleset-ui.ts`

### Test Scenarios

1. **Load Vertical Rules** → Match DB
2. **Edit Token Override** → DB stores → Engine loads it
3. **Version Publish** → Stamps version
4. **Version Rollback** → Restores previous state
5. **Preview Simulation** → Returns valid merged ruleset
6. **KPI Editor** → Normalizes correctly
7. **Recommendation Template** → Selection works
8. **UI Renders** → Authorized user sees UI, non-admin does not

---

## 📊 Component Complexity Estimates

| Component | Lines of Code | Complexity | Priority |
|-----------|--------------|------------|----------|
| Admin Layout | 200 | Medium | High |
| Ruleset List | 150 | Low | High |
| Vertical Rule Manager | 400 | High | High |
| Market Rule Manager | 350 | High | Medium |
| Token Relevance Editor | 250 | Medium | High |
| Intent Pattern Editor | 200 | Medium | Low |
| Hook Category Editor | 300 | Medium | High |
| Stopword Editor | 150 | Low | Medium |
| KPI Weight Editor | 350 | High | High |
| Formula Weight Editor | 300 | Medium | Low |
| Recommendation Template Editor | 250 | Medium | Medium |
| Version Manager | 400 | High | Medium |
| Rule Preview Simulator | 350 | High | High |
| Audit Log Viewer | 200 | Low | Low |
| Shared Components | 500 | Medium | High |

**Total Estimated LOC**: ~4,350 lines

**Total Estimated Development Time**: 20-30 hours

---

## 🚀 Implementation Phases

### Phase 13.1: Core Infrastructure (✅ Complete)

- [x] Create admin API services
- [x] Create override API services
- [x] Define TypeScript types
- [x] Set up cache invalidation

### Phase 13.2: Basic UI (🚧 Next)

- [ ] Create admin layout with sidebar
- [ ] Implement ruleset list view
- [ ] Add route protection
- [ ] Create shared components

### Phase 13.3: Ruleset Managers (🔜 Future)

- [ ] Implement Vertical Rule Manager
- [ ] Implement Market Rule Manager
- [ ] Implement Client Rule Manager

### Phase 13.4: Override Editors (🔜 Future)

- [ ] Implement Token Relevance Editor
- [ ] Implement Hook Category Editor
- [ ] Implement KPI Weight Editor
- [ ] Implement Stopword Editor
- [ ] Implement Recommendation Template Editor

### Phase 13.5: Advanced Features (🔜 Future)

- [ ] Implement Version Manager
- [ ] Implement Rule Preview Simulator
- [ ] Implement Audit Log Viewer
- [ ] Add CSV import/export

### Phase 13.6: Testing & Documentation (🔜 Future)

- [ ] Write test suite
- [ ] Create user documentation
- [ ] Create developer documentation
- [ ] Record demo video

---

## 📚 Technology Stack

### Frontend

- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Query** - Data fetching/caching
- **React Router** - Routing
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Components Used

- `Table` - Data tables
- `Card` - Section containers
- `Tabs` - Tab navigation
- `Form` - Forms
- `Input` - Text inputs
- `Select` - Dropdowns
- `Slider` - Range inputs
- `Button` - Buttons
- `Alert` - Messages
- `Badge` - Status badges
- `Dialog` - Modals
- `Popover` - Tooltips
- `Command` - Command palette

---

## 🔍 Next Steps

### Immediate (Required for Phase 13 Completion)

1. **Create Admin Layout** (`src/pages/admin/AsoBibleEditor/index.tsx`)
   - Sidebar navigation
   - Route protection
   - Breadcrumbs

2. **Implement High-Priority Components**
   - Ruleset List
   - Vertical Rule Manager
   - Token Relevance Editor
   - Hook Category Editor
   - KPI Weight Editor

3. **Implement Rule Preview Simulator**
   - Critical for testing changes before publishing

4. **Write Test Suite**
   - Ensure all CRUD operations work
   - Verify cache invalidation
   - Test preview simulation

5. **Create Documentation**
   - User guide for admin UI
   - Developer guide for extending UI

### Future Enhancements

6. **Bulk Import/Export**
   - CSV import for token overrides
   - JSON export for ruleset backups

7. **A/B Testing Support**
   - Multi-version support
   - Traffic routing
   - Conversion tracking

8. **Workflow Automation**
   - Scheduled publishes
   - Auto-rollback on errors
   - Slack/email notifications

9. **Advanced Analytics**
   - Override usage metrics
   - Performance impact analysis
   - Recommendation effectiveness tracking

---

## 📝 API Summary

### Admin Ruleset API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getRulesetList(scope?)` | - | Get list of all rulesets |
| `getRuleset(vertical?, market?, org?)` | - | Get specific ruleset with overrides |
| `previewRuleset(request)` | - | Preview merged ruleset before publishing |
| `publishRuleset(request)` | - | Publish ruleset changes |
| `rollbackRuleset(request)` | - | Rollback to previous version |
| `getAuditLog(limit?)` | - | Get audit log entries |

### Admin Override API

| Method | Description |
|--------|-------------|
| `upsertTokenOverride(request)` | Create/update token override |
| `deleteTokenOverride(id)` | Delete token override |
| `upsertHookOverride(request)` | Create/update hook override |
| `deleteHookOverride(id)` | Delete hook override |
| `upsertStopwordOverride(request)` | Create/update stopword override |
| `deleteStopwordOverride(id)` | Delete stopword override |
| `upsertKpiOverride(request)` | Create/update KPI override |
| `deleteKpiOverride(id)` | Delete KPI override |
| `upsertFormulaOverride(request)` | Create/update formula override |
| `deleteFormulaOverride(id)` | Delete formula override |
| `upsertRecommendationOverride(request)` | Create/update recommendation override |
| `deleteRecommendationOverride(id)` | Delete recommendation override |

---

## ✅ Phase 13.1 Checklist (Complete)

- [x] Create `adminRulesetApi.ts` (350+ lines)
  - [x] getRulesetList()
  - [x] getRuleset()
  - [x] previewRuleset()
  - [x] publishRuleset()
  - [x] rollbackRuleset()
  - [x] getAuditLog()

- [x] Create `adminOverrideApi.ts` (450+ lines)
  - [x] Token override CRUD
  - [x] Hook override CRUD
  - [x] Stopword override CRUD
  - [x] KPI override CRUD
  - [x] Formula override CRUD
  - [x] Recommendation override CRUD

- [x] TypeScript types for all requests/responses
- [x] Cache invalidation on all mutations
- [x] Error handling and logging

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Author**: Claude Code (Anthropic)
**Status**: Phase 13.1 Complete, Phase 13.2+ Pending
