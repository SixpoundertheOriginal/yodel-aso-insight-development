# KPI Tooltip & Help Center Implementation Plan
## Extending User Guidance System Across All Charts

**Created**: November 25, 2025
**Status**: Planning Phase
**Priority**: High (User Experience Enhancement)

---

## 🎯 Objectives

1. **Add tooltips to ALL chart components** - Ensure every visualization has contextual help
2. **Create in-app Help Center modal** - Give users access to full documentation without leaving the app
3. **Maintain consistency** - Use existing `KpiTooltip` component and `kpiDefinitions.ts` system
4. **Preserve performance** - Lazy load heavy components, minimize bundle impact

---

## 📊 Phase 1: Chart Component Tooltip Extension

### Current Status:
✅ **Completed** (Phase 0):
- MetadataOpportunityDeltaChart (7 metrics with tooltips)
- MetadataDimensionRadar (5 metrics with tooltips)

### Remaining Chart Components:

#### 1. **DiscoveryFootprintMap** (Priority: HIGH)
**Location**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/DiscoveryFootprintMap.tsx`

**What it shows**: Combo distribution by search intent (Informational, Outcome, Generic, Brand, Low-Value)

**Tooltips needed**:
- [ ] **Informational Intent** - "Discovery searches (how to, learn, guide)"
- [ ] **Outcome Intent** - "Result-focused searches (get, achieve, master)"
- [ ] **Generic Intent** - "Broad category searches (language app, meditation)"
- [ ] **Brand Intent** - "Branded searches (Duolingo, Headspace)"
- [ ] **Low-Value Intent** - "Generic modifiers (best, top, free)"

**Implementation**:
```typescript
// Add to kpiDefinitions.ts
export const INTENT_TYPE_DEFINITIONS: Record<string, KpiDefinition> = {
  informational: { ... },
  outcome: { ... },
  generic: { ... },
  brand: { ... },
  low_value: { ... },
};

// Add to DiscoveryFootprintMap.tsx
<KpiTooltip metricId="informational_intent" iconSize="sm" />
```

**Estimated effort**: 2 hours

---

#### 2. **SlotUtilizationBars** (Priority: MEDIUM)
**Location**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/SlotUtilizationBars.tsx`

**What it shows**: Character limit usage for title/subtitle (iOS vs Android)

**Tooltips needed**:
- [ ] **Title Character Usage** - "iOS: 30 chars, Android: 50 chars. Target: 80-95% utilization"
- [ ] **Subtitle Character Usage** - "iOS: 30 chars, Android: 80 chars. Target: 80-95% utilization"

**Implementation**:
```typescript
// Already exists in kpi.registry.json:
// - title_char_usage
// - subtitle_char_usage

// Add to SlotUtilizationBars.tsx
<KpiTooltip metricId="title_char_usage" currentScore={titleUsage} />
<KpiTooltip metricId="subtitle_char_usage" currentScore={subtitleUsage} />
```

**Estimated effort**: 1 hour

---

#### 3. **TokenMixDonut** (Priority: MEDIUM)
**Location**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/TokenMixDonut.tsx`

**What it shows**: Token type distribution (High-Value, Medium-Value, Low-Value, Stopwords)

**Tooltips needed**:
- [ ] **High-Value Tokens** - "Category-specific keywords (relevance = 3)"
- [ ] **Medium-Value Tokens** - "Domain-relevant terms (relevance = 2)"
- [ ] **Low-Value Tokens** - "Generic modifiers (relevance = 0-1)"
- [ ] **Stopwords** - "Filler words with no SEO value"

**Implementation**:
```typescript
// Add to kpiDefinitions.ts
export const TOKEN_TYPE_DEFINITIONS: Record<string, KpiDefinition> = {
  high_value_token: { ... },
  medium_value_token: { ... },
  low_value_token: { ... },
  stopword: { ... },
};
```

**Estimated effort**: 2 hours

---

#### 4. **SeverityDonut** (Priority: LOW)
**Location**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/SeverityDonut.tsx`

**What it shows**: Recommendation severity distribution (Critical, High, Medium, Low)

**Tooltips needed**:
- [ ] **Critical Issues** - "Must fix - major impact on discoverability"
- [ ] **High Priority** - "Should fix - significant improvement opportunity"
- [ ] **Medium Priority** - "Nice to have - moderate impact"
- [ ] **Low Priority** - "Optional - minor refinement"

**Implementation**:
```typescript
// Add to kpiDefinitions.ts
export const SEVERITY_DEFINITIONS: Record<string, KpiDefinition> = {
  critical: { ... },
  high: { ... },
  medium: { ... },
  low: { ... },
};
```

**Estimated effort**: 1.5 hours

---

#### 5. **SemanticDensityGauge** (Priority: MEDIUM)
**Location**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/SemanticDensityGauge.tsx`

**What it shows**: Ratio of high-relevance tokens to total tokens

**Tooltips needed**:
- [ ] **Semantic Density** - "Percentage of high-value keywords vs. filler. Target: 60%+"

**Implementation**:
```typescript
// Add to kpiDefinitions.ts
semantic_density: {
  id: 'semantic_density',
  title: 'Semantic Density',
  shortDesc: 'Ratio of high-value keywords to total tokens',
  ...
}
```

**Estimated effort**: 1 hour

---

#### 6. **HookDiversityWheel** (Priority: LOW)
**Location**: `src/components/AppAudit/UnifiedMetadataAuditModule/charts/HookDiversityWheel.tsx`

**What it shows**: Distribution of hook types (Feature, Benefit, Outcome, Problem, Social Proof)

**Tooltips needed**:
- [ ] **Feature Hooks** - "What your app does (e.g., 'Learn 40+ languages')"
- [ ] **Benefit Hooks** - "What users gain (e.g., 'Get fluent fast')"
- [ ] **Outcome Hooks** - "End results (e.g., 'Speak confidently')"
- [ ] **Problem Hooks** - "Pain points solved (e.g., 'No boring lessons')"
- [ ] **Social Proof Hooks** - "Trust signals (e.g., '100M+ users')"

**Implementation**:
```typescript
// Add to kpiDefinitions.ts
export const HOOK_TYPE_DEFINITIONS: Record<string, KpiDefinition> = {
  feature_hook: { ... },
  benefit_hook: { ... },
  outcome_hook: { ... },
  problem_hook: { ... },
  social_proof_hook: { ... },
};
```

**Estimated effort**: 2 hours

---

### Phase 1 Summary:
| Component | Priority | Effort | Status |
|-----------|----------|--------|--------|
| MetadataOpportunityDeltaChart | HIGH | - | ✅ Done |
| MetadataDimensionRadar | HIGH | - | ✅ Done |
| DiscoveryFootprintMap | HIGH | 2h | ⏳ Planned |
| SlotUtilizationBars | MEDIUM | 1h | ⏳ Planned |
| TokenMixDonut | MEDIUM | 2h | ⏳ Planned |
| SemanticDensityGauge | MEDIUM | 1h | ⏳ Planned |
| SeverityDonut | LOW | 1.5h | ⏳ Planned |
| HookDiversityWheel | LOW | 2h | ⏳ Planned |

**Total estimated effort**: 9.5 hours

---

## 🏛️ Phase 2: In-App Help Center Modal

### Design Goals:
1. **Quick access** - Keyboard shortcut (`?` key) + help icon in header
2. **Searchable** - Users can search for specific metrics
3. **Categorized** - Organized by metric families (Coverage, Intent, Structure, Quality)
4. **Deep linking** - Direct links to specific metric explanations
5. **Lightweight** - Lazy loaded, doesn't impact initial bundle

### UI/UX Design:

```
┌─────────────────────────────────────────────────────────────┐
│  📚 ASO Audit Help Center                            [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 [Search metrics, keywords, or topics...]               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Sidebar ──┐  ┌─ Content ──────────────────────────┐  │
│  │            │  │                                      │  │
│  │ 📊 Overview │  │  # Intent Coverage                 │  │
│  │            │  │                                      │  │
│  │ Coverage   │  │  ## What it measures                │  │
│  │  • Intent  │  │  How well your metadata covers...   │  │
│  │  • Keyword │  │                                      │  │
│  │  • Combo   │  │  ## Score interpretation            │  │
│  │  • Discovery│ │  - 80-100: Excellent...            │  │
│  │            │  │  - 50-79: Good...                   │  │
│  │ Intent     │  │  - 0-49: Needs work...              │  │
│  │  • Types   │  │                                      │  │
│  │  • Patterns│  │  ## What a -55 gap means            │  │
│  │            │  │  Your current score is 45/100...    │  │
│  │ Structure  │  │                                      │  │
│  │  • Limits  │  │  ## How to improve                  │  │
│  │  • Format  │  │  1. Add informational keywords...   │  │
│  │            │  │  2. Include commercial...           │  │
│  │ Quality    │  │                                      │  │
│  │  • Relevance│ │                                      │  │
│  │  • Brand   │  │  [View Examples] [Download Guide]  │  │
│  │            │  │                                      │  │
│  └────────────┘  └──────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure:

```typescript
// src/components/AppAudit/HelpCenter/HelpCenterModal.tsx
export const HelpCenterModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('overview');

  // Keyboard shortcut: ? key
  useHotkey('?', () => setIsOpen(true));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-5xl h-[80vh]">
        <HelpCenterHeader onClose={() => setIsOpen(false)} />
        <HelpCenterSearch value={searchQuery} onChange={setSearchQuery} />
        <div className="flex gap-6 overflow-hidden flex-1">
          <HelpCenterSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <HelpCenterContent
            section={activeSection}
            searchQuery={searchQuery}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### Content Organization:

```typescript
// src/constants/helpCenterContent.ts
export const HELP_CENTER_SECTIONS = {
  overview: {
    title: 'Getting Started',
    icon: BookOpen,
    content: /* Markdown content */,
  },
  coverage: {
    title: 'Coverage Metrics',
    icon: Target,
    subsections: {
      intent_coverage: { ... },
      keyword_coverage: { ... },
      combo_quality: { ... },
      discovery_coverage: { ... },
    },
  },
  intent: {
    title: 'Search Intent',
    icon: Brain,
    subsections: {
      informational: { ... },
      commercial: { ... },
      transactional: { ... },
    },
  },
  structure: {
    title: 'Structure & Format',
    icon: Layout,
    subsections: {
      character_limits: { ... },
      readability: { ... },
      formatting: { ... },
    },
  },
  quality: {
    title: 'Quality Metrics',
    icon: Award,
    subsections: {
      relevance: { ... },
      brand_balance: { ... },
      token_density: { ... },
    },
  },
  faq: {
    title: 'FAQ',
    icon: HelpCircle,
    content: /* Common questions */,
  },
};
```

### Search Functionality:

```typescript
// src/hooks/useHelpCenterSearch.ts
export function useHelpCenterSearch(query: string) {
  const results = useMemo(() => {
    if (!query) return [];

    // Search across:
    // 1. Metric titles
    // 2. Metric descriptions
    // 3. Keywords in content
    // 4. Example text

    return fuzzySearch(HELP_CENTER_SECTIONS, query);
  }, [query]);

  return results;
}
```

### Integration Points:

1. **Global Header** - Add help icon next to user menu
   ```typescript
   // src/layouts/MainLayout.tsx
   <Button variant="ghost" onClick={() => openHelpCenter()}>
     <HelpCircle className="h-5 w-5" />
   </Button>
   ```

2. **Chart Headers** - Add "Learn More" link
   ```typescript
   // Any chart component
   <CardHeader>
     <div className="flex items-center justify-between">
       <CardTitle>Intent Coverage</CardTitle>
       <Button
         variant="link"
         onClick={() => openHelpCenter('intent_coverage')}
       >
         Learn More
       </Button>
     </div>
   </CardHeader>
   ```

3. **Keyboard Shortcut** - Press `?` anywhere
   ```typescript
   // Global hotkey registration
   useHotkey('?', () => setHelpCenterOpen(true));
   ```

4. **Empty States** - Link to help for guidance
   ```typescript
   // When no data available
   <EmptyState
     title="No data available"
     action={
       <Button onClick={() => openHelpCenter('getting_started')}>
         Learn how to get started
       </Button>
     }
   />
   ```

### File Structure:

```
src/components/AppAudit/HelpCenter/
├── index.ts
├── HelpCenterModal.tsx          (Main modal container)
├── HelpCenterHeader.tsx          (Title, search, close)
├── HelpCenterSidebar.tsx         (Navigation tree)
├── HelpCenterContent.tsx         (Markdown renderer)
├── HelpCenterSearch.tsx          (Search input + results)
└── components/
    ├── MetricCard.tsx            (Individual metric explanation)
    ├── ExampleCard.tsx           (Good vs bad examples)
    └── CodeBlock.tsx             (Syntax highlighting for examples)

src/constants/
└── helpCenterContent.ts          (All content in TypeScript/Markdown)

src/hooks/
├── useHelpCenter.ts              (Global state + deep linking)
└── useHelpCenterSearch.ts        (Search logic)
```

### Markdown Content Loading:

**Option A**: Inline TypeScript (Faster, larger bundle)
```typescript
// src/constants/helpCenterContent.ts
export const INTENT_COVERAGE_CONTENT = `
# Intent Coverage

## What it measures
How well your metadata covers different types of user search queries...

## Score interpretation
- **80-100**: Excellent coverage across all intent types
...
`;
```

**Option B**: Lazy-loaded Markdown files (Smaller bundle, async load)
```typescript
// src/components/AppAudit/HelpCenter/content/
import { lazy } from 'react';

export const contentLoaders = {
  intent_coverage: () => import('./content/intent-coverage.md'),
  keyword_coverage: () => import('./content/keyword-coverage.md'),
  // ...
};
```

**Recommended**: Option A for now (simpler, already have content in METADATA_KPI_GUIDE.md)

---

## 📋 Implementation Phases

### Phase 1A: High-Priority Chart Tooltips (Week 1)
**Goal**: Add tooltips to most-used charts

**Tasks**:
1. [ ] Add DiscoveryFootprintMap tooltips (2h)
2. [ ] Add SlotUtilizationBars tooltips (1h)
3. [ ] Add SemanticDensityGauge tooltip (1h)
4. [ ] Test all tooltips for consistency (1h)

**Total**: 5 hours

---

### Phase 1B: Medium/Low Priority Chart Tooltips (Week 2)
**Goal**: Complete tooltip coverage

**Tasks**:
1. [ ] Add TokenMixDonut tooltips (2h)
2. [ ] Add SeverityDonut tooltips (1.5h)
3. [ ] Add HookDiversityWheel tooltips (2h)
4. [ ] QA pass - verify all charts have tooltips (1h)

**Total**: 6.5 hours

---

### Phase 2A: Help Center Foundation (Week 2-3)
**Goal**: Build core modal infrastructure

**Tasks**:
1. [ ] Create HelpCenterModal component (3h)
2. [ ] Create HelpCenterSidebar with navigation (2h)
3. [ ] Create HelpCenterContent with markdown rendering (2h)
4. [ ] Add keyboard shortcut (`?`) support (1h)
5. [ ] Add global state management (useHelpCenter hook) (1h)

**Total**: 9 hours

---

### Phase 2B: Help Center Content & Search (Week 3)
**Goal**: Populate content and add search

**Tasks**:
1. [ ] Convert METADATA_KPI_GUIDE.md to helpCenterContent.ts (3h)
2. [ ] Add search functionality (fuzzy matching) (3h)
3. [ ] Create metric example cards (good vs bad) (2h)
4. [ ] Add FAQ section (1h)

**Total**: 9 hours

---

### Phase 2C: Help Center Integration (Week 4)
**Goal**: Integrate help center throughout app

**Tasks**:
1. [ ] Add help icon to main header (0.5h)
2. [ ] Add "Learn More" links to all chart headers (2h)
3. [ ] Add deep linking support (open specific sections) (2h)
4. [ ] Add contextual help in empty states (1h)
5. [ ] Add guided tour for first-time users (optional) (4h)

**Total**: 9.5 hours (5.5h without guided tour)

---

## 🎨 Design Specifications

### Colors & Typography:
```typescript
// Help Center theme (matches audit UI)
const helpCenterTheme = {
  background: 'bg-zinc-950',
  sidebar: 'bg-zinc-900/50',
  border: 'border-zinc-800',
  text: {
    primary: 'text-zinc-100',
    secondary: 'text-zinc-400',
    muted: 'text-zinc-600',
  },
  accent: {
    primary: 'text-blue-400',
    secondary: 'text-purple-400',
    success: 'text-green-400',
    warning: 'text-orange-400',
    error: 'text-red-400',
  },
};
```

### Spacing:
- Modal: 80vh height, max-w-5xl
- Sidebar: 240px width
- Content: Remaining space (flex-1)
- Search bar: Sticky at top

### Animations:
- Modal entrance: Fade + slide up (300ms)
- Search results: Stagger (50ms delay per item)
- Section transitions: Cross-fade (200ms)

---

## 📊 Success Metrics

### Phase 1 (Chart Tooltips):
- [ ] 100% of charts have tooltip support
- [ ] Average tooltip view time > 5 seconds (users are reading)
- [ ] Bounce rate decrease on audit page (users understand metrics)

### Phase 2 (Help Center):
- [ ] Help center opened by 40%+ of users in first session
- [ ] Average time in help center: 2-3 minutes
- [ ] Search usage: 60%+ of help center sessions include search
- [ ] Support ticket decrease: 20% reduction in "what does X mean?" questions

---

## 🚀 Quick Start Checklist

To implement Phase 1A this week:

1. [ ] Copy `KpiTooltip.tsx` pattern to new charts
2. [ ] Add intent/token/severity definitions to `kpiDefinitions.ts`
3. [ ] Update each chart component to include tooltips
4. [ ] Test hover behavior and tooltip positioning
5. [ ] Verify mobile responsiveness (tooltips → modals on mobile)

To start Phase 2A next week:

1. [ ] Create `src/components/AppAudit/HelpCenter/` directory
2. [ ] Install markdown renderer: `react-markdown` + `remark-gfm`
3. [ ] Convert user guide markdown to TypeScript constants
4. [ ] Build modal shell with sidebar navigation
5. [ ] Add keyboard shortcut hook

---

## 🔧 Technical Considerations

### Performance:
- Lazy load Help Center modal (reduces initial bundle by ~50KB)
- Memoize search results to avoid re-computation
- Use virtual scrolling for long content sections

### Accessibility:
- Keyboard navigation through help center sections
- Screen reader announcements for search results
- Focus trap when modal is open
- ESC key to close

### Mobile:
- Tooltips become bottom sheets on mobile
- Help center becomes full-screen on mobile
- Swipe gestures for section navigation

### SEO:
- Help center content could be extracted to public docs page
- Deep links should work as shareable URLs
- Export PDF option for offline reference

---

## 📝 Dependencies

### New packages needed:
```json
{
  "react-markdown": "^9.0.0",       // Markdown rendering
  "remark-gfm": "^4.0.0",           // GitHub-flavored markdown
  "fuse.js": "^7.0.0",              // Fuzzy search
  "react-hotkeys-hook": "^4.4.0"    // Keyboard shortcuts
}
```

### Existing dependencies (already installed):
- `@radix-ui/react-dialog` - Modal
- `lucide-react` - Icons
- `tailwindcss` - Styling

---

## 🎯 Next Steps

**Immediate (This Week)**:
1. Review this plan with team
2. Get design approval for Help Center UI
3. Start Phase 1A (high-priority chart tooltips)

**Short-term (Next 2 Weeks)**:
1. Complete Phase 1B (remaining chart tooltips)
2. Start Phase 2A (Help Center foundation)

**Medium-term (Next Month)**:
1. Complete Phase 2B & 2C (content + integration)
2. Gather user feedback
3. Iterate on search and navigation

---

**Questions? Concerns?** Add comments to this plan or discuss in next standup!
