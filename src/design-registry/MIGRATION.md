# Design Registry Migration Guide

> Step-by-step guide for migrating existing components to use the Design Registry.

## 📋 Table of Contents

- [Migration Phases](#migration-phases)
- [Phase 1: Foundation (CURRENT)](#phase-1-foundation-current)
- [Phase 2: Primitives (NEXT)](#phase-2-primitives-next)
- [Phase 3: Dashboard Migration](#phase-3-dashboard-migration)
- [Phase 4: App-Wide Rollout](#phase-4-app-wide-rollout)
- [Migration Patterns](#migration-patterns)
- [Rollback Procedure](#rollback-procedure)
- [FAQ](#faq)

---

## Migration Phases

### Timeline Overview

```
✅ Phase 1 (Week 1):    Foundation - Tokens only, zero breaking changes
⏳ Phase 2 (Week 2):    Primitives - Build reusable components
⏳ Phase 3 (Week 3-4):  Dashboard Migration - Refactor dashboard cards
⏳ Phase 4 (Week 5-8):  App-Wide Rollout - Reviews, Intelligence, Admin
⏳ Phase 5 (Week 9-10): Cleanup - Remove legacy code
```

---

## Phase 1: Foundation (CURRENT)

**Status:** ✅ **COMPLETE**

**What was done:**
- Created design registry directory structure
- Implemented all token files (formatters, colors, typography, spacing, icons, elevation, motion, layout, microcopy)
- Created TypeScript types
- Created utility functions
- Wrote comprehensive documentation

**What did NOT change:**
- ✅ **Zero modifications** to existing components
- ✅ **Zero breaking changes** to production code
- ✅ **Zero user-facing changes**

**Next Steps:**
- **Wait for approval** from design + engineering team
- **Review token values** with designers
- **Validate** all tokens in Storybook (Phase 1.5)
- **Proceed to Phase 2** only after approval

---

## Phase 2: Primitives (NEXT)

**Estimated Duration:** 1 week

**Goal:** Build reusable primitive components without breaking existing code.

### Components to Create

1. ✅ `DeltaChip.tsx` - Replaces inline delta logic (6 instances)
2. ✅ `MetricValue.tsx` - Replaces inline formatNumber (7 instances)
3. ✅ `SectionHeader.tsx` - Replaces section headers (8 instances)
4. ✅ `LoadingSkeleton.tsx` - Replaces loading states (8 instances)
5. ✅ `ZeroState.tsx` - Replaces empty states (12 instances)
6. ✅ `Badge.tsx` (Enhanced) - Extends shadcn badge with semantic colors

### Testing Strategy

**Before migrating any production code:**

1. Create primitive components in isolation
2. Build Storybook stories for each primitive
3. Visual regression testing (Chromatic)
4. Get designer approval on visual output
5. Write unit tests (100% coverage)

**Example: DeltaChip.tsx**

```typescript
import { semanticColors } from '@/design-registry';
import { formatters } from '@/design-registry';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function DeltaChip({ value, format = 'percentage', size = 'sm' }) {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.1;

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const colors = isNeutral
    ? semanticColors.delta.neutral
    : isPositive
      ? semanticColors.delta.positive
      : semanticColors.delta.negative;

  const formattedValue = format === 'percentage'
    ? formatters.percentage.delta(value)
    : formatters.number.compact(value);

  return (
    <div className={cn(colors.bg, colors.text, 'px-2 py-1 rounded-full')}>
      <Icon className="h-3 w-3" />
      <span>{formattedValue}</span>
    </div>
  );
}
```

**Storybook Story:**

```typescript
export default {
  title: 'Design Registry/Primitives/DeltaChip',
  component: DeltaChip,
};

export const Positive = () => <DeltaChip value={5.2} />;
export const Negative = () => <DeltaChip value={-3.1} />;
export const Neutral = () => <DeltaChip value={0.05} />;
```

**Risk Level:** 🟢 **LOW** (new components, not replacing anything yet)

---

## Phase 3: Dashboard Migration

**Estimated Duration:** 2 weeks

**Goal:** Migrate `ReportingDashboardV2` to use primitives + tokens.

### Feature Flag Strategy

**Step 1: Add Feature Flag**

```typescript
// src/config/features.ts
export const FEATURES = {
  DESIGN_REGISTRY_ENABLED: process.env.VITE_DESIGN_REGISTRY === 'true',
  DESIGN_REGISTRY_COMPONENTS: {
    deltaChip: false,  // Enable per component
    metricValue: false,
    kpiCard: false,
  }
};
```

**Step 2: Dual Render Pattern**

```typescript
import { FEATURES } from '@/config/features';
import { MetricValue, DeltaChip } from '@/design-registry';

export function AsoMetricCard({ impressions, delta }) {
  if (FEATURES.DESIGN_REGISTRY_COMPONENTS.metricValue) {
    // NEW SYSTEM
    return (
      <div>
        <MetricValue value={impressions} format="compact" />
        {delta && <DeltaChip value={delta} />}
      </div>
    );
  }

  // LEGACY SYSTEM (fallback)
  const formatNumber = (num) => { /* old logic */ };
  return <div>{formatNumber(impressions)}</div>;
}
```

**Step 3: Gradual Rollout**

```
Week 3:
├── Enable for internal team (VITE_DESIGN_REGISTRY=true)
├── Visual regression testing
├── Monitor Sentry for errors
└── If stable → enable for 10% of users

Week 4:
├── Expand to 25% of users
├── Continue monitoring
└── If stable → proceed to 100%
```

### Components to Migrate (Priority Order)

| Week | Component | Effort | Risk |
|------|-----------|--------|------|
| **Week 3** |
| Day 1-2 | `AsoMetricCard.tsx` | 4 hours | 🟡 Medium |
| Day 3 | `TotalMetricCard.tsx` | 4 hours | 🟡 Medium |
| Day 4 | `ExecutiveSummaryCard.tsx` | 2 hours | 🟢 Low |
| Day 5 | Section headers + indicators | 1 hour | 🟢 Low |
| **Week 4** |
| Day 1-2 | `StabilityScoreCard.tsx` | 6 hours | 🟡 Medium |
| Day 3 | `OpportunityMapCard.tsx` | 6 hours | 🟡 Medium |
| Day 4 | `OutcomeSimulationCard.tsx` | 6 hours | 🟡 Medium |
| Day 5 | E2E testing + QA | 4 hours | - |

### Migration Pattern: AsoMetricCard

**BEFORE:**

```typescript
// src/components/AsoMetricCard.tsx (lines 78-86)
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

// Hardcoded gradients (lines 49-52)
const GRADIENT_MAP = {
  search: 'from-blue-500 to-purple-600',
  browse: 'from-purple-500 to-pink-600'
};

// Hardcoded delta logic (lines 142-153)
{impressionsDelta !== 0 && (
  <div className={cn(
    "flex items-center gap-1 text-xs font-medium",
    impressionsDelta >= 0 ? "text-green-500" : "text-red-500"
  )}>
    {impressionsDelta >= 0 ? <ArrowUp /> : <ArrowDown />}
    {formatPercent(Math.abs(impressionsDelta))}
  </div>
)}
```

**AFTER:**

```typescript
import { formatters, semanticColors, typography } from '@/design-registry';
import { MetricValue } from '@/design-registry/components/primitives/MetricValue';
import { DeltaChip } from '@/design-registry/components/primitives/DeltaChip';

// Remove inline formatNumber - use registry

// Use semantic colors instead of hardcoded
const gradient = semanticColors.trafficSource[icon].primary;

// Replace delta logic with DeltaChip
<MetricValue value={impressions} format="compact" size="primary" />
{impressionsDelta !== 0 && <DeltaChip value={impressionsDelta} />}
```

**Risk Mitigation:**

1. ✅ Keep `AsoMetricCard.tsx` as `AsoMetricCard_Legacy.tsx` during transition
2. ✅ Feature flag allows instant rollback
3. ✅ Side-by-side Storybook comparison
4. ✅ Visual regression testing before rollout
5. ✅ Monitor Sentry for errors

---

## Phase 4: App-Wide Rollout

**Estimated Duration:** 4 weeks

**Goal:** Extend design registry to all pages.

### Rollout Schedule

**Week 5: Reviews Page**
- Migrate review cards
- Apply formatters to review metrics
- Visual regression testing

**Week 6: Intelligence Hub**
- Migrate intelligence components
- Apply semantic colors
- Visual regression testing

**Week 7: Admin Pages**
- Migrate admin metrics
- Apply consistent styling
- Visual regression testing

**Week 8: Cleanup**
- Remove all `*_Legacy.tsx` components
- Remove feature flags
- Update documentation

---

## Migration Patterns

### Pattern 1: Replace Inline Number Formatting

**Before:**
```typescript
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

<div>{formatNumber(value)}</div>
```

**After:**
```typescript
import { formatters } from '@/design-registry';

<div>{formatters.number.compact(value)}</div>
```

### Pattern 2: Replace Hardcoded Colors

**Before:**
```typescript
const colors = {
  search: {
    primary: 'from-blue-500 to-purple-600',
    text: 'text-purple-400',
  }
};
```

**After:**
```typescript
import { semanticColors } from '@/design-registry';

const colors = semanticColors.trafficSource.search;
```

### Pattern 3: Replace Typography Classes

**Before:**
```typescript
<h2 className="text-2xl font-bold tracking-tight text-zinc-100">
  Section Title
</h2>
```

**After:**
```typescript
import { typography } from '@/design-registry';

<h2 className={typography.section.primary}>
  Section Title
</h2>
```

### Pattern 4: Replace Section Headers

**Before:**
```typescript
<div className="flex items-center gap-3 mb-6">
  <TrendingUpIcon className="h-6 w-6 text-yodel-orange" />
  <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
    ASO Organic Visibility
  </h2>
</div>
```

**After:**
```typescript
import { SectionHeader } from '@/design-registry';
import { TrendingUp } from 'lucide-react';

<SectionHeader
  icon={TrendingUp}
  title="ASO Organic Visibility"
/>
```

### Pattern 5: Replace Data Indicators

**Before:**
```typescript
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
  <span>Live Data</span>
  <span>•</span>
  <span>{meta?.raw_rows || 0} records</span>
</div>
```

**After:**
```typescript
import { microcopy } from '@/design-registry';

<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
  <span>{microcopy.indicator.live(meta?.raw_rows || 0)}</span>
</div>
```

---

## Rollback Procedure

### Instant Rollback (via Feature Flag)

**Step 1: Disable Feature Flag**

```bash
# .env.local
VITE_DESIGN_REGISTRY=false
```

**Step 2: Rebuild & Deploy**

```bash
npm run build
npm run deploy
```

**Step 3: Verify**

- Check dashboard renders correctly
- No console errors
- All metrics display properly

### Full Rollback (via Git)

If feature flag fails:

```bash
# Revert to last stable commit
git revert <commit-hash>
git push origin main

# Rebuild & deploy
npm run build
npm run deploy
```

### Monitoring

**During rollout, monitor:**

1. ✅ Sentry error rate
2. ✅ User complaints/feedback
3. ✅ Visual regression alerts (Chromatic)
4. ✅ Performance metrics (Web Vitals)

**Alert triggers:**

- Error rate > 5% → Immediate rollback
- User complaints > 3 → Investigate & rollback if critical
- Performance degradation > 10% → Investigate & rollback if confirmed

---

## FAQ

### Q: When can I start using the design registry?

**A:** You can import tokens immediately (formatters, colors, typography, etc.). Component primitives will be available in Phase 2 (Week 2).

### Q: Do I need to migrate all components at once?

**A:** No. Migration is gradual and controlled by feature flags. Each component migrates independently.

### Q: What if I find a bug in the design registry?

**A:** Report immediately to the frontend team. Critical bugs trigger instant rollback. Non-critical bugs are fixed in next sprint.

### Q: Can I add new tokens?

**A:** Yes, but follow the process:
1. Add to appropriate token file
2. Export from `index.ts`
3. Write unit tests
4. Get designer approval
5. Submit PR

### Q: What about components not in the dashboard?

**A:** Phase 4 (Week 5-8) covers Reviews, Intelligence Hub, and Admin pages. Notify the team if you need migration sooner.

### Q: How do I test my migration?

**A:**
1. Enable feature flag locally
2. Compare side-by-side in Storybook
3. Visual regression testing (Chromatic)
4. Manual QA on localhost
5. Get designer sign-off

---

## Support

Questions? Contact:
- **Design:** [Design Team]
- **Engineering:** [Frontend Team Lead]
- **Documentation:** See [README.md](./README.md)

---

**Version:** 1.0.0
**Last Updated:** November 2024
**Status:** Phase 1 Complete - Ready for Phase 2
