# Phase 3: Migration Patterns

This document captures the migration patterns used to refactor existing components to use the Design Registry.

## Overview

Phase 3 successfully migrated 3 core dashboard components to use Design Registry primitives, eliminating duplicated formatting logic and establishing consistent patterns across the application.

---

## Pattern 1: Replace Inline formatNumber() with MetricValue

### Before
```tsx
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
};

// Usage
<div className="text-5xl font-bold tracking-tight">
  {formatNumber(value)}
</div>
```

### After
```tsx
import { MetricValue } from '@/design-registry';

// Usage
<MetricValue value={value} format="compact" size="hero" />
```

### Benefits
- **Code Reduction**: Eliminates 7-9 lines of duplicated formatting logic
- **Consistency**: All numbers formatted identically across the app
- **Flexibility**: Easy to switch formats (compact, full, precise, percentage, ratio, currency)
- **Typography**: Automatic semantic typography sizing (hero, primary, secondary, small)
- **Performance**: Memoized formatting prevents unnecessary recalculations

### Replaced In
- ✅ `src/components/TotalMetricCard.tsx:55-63` → Line 105
- ✅ `src/components/AsoMetricCard.tsx:78-86` → Lines 137, 150, 219, 225

---

## Pattern 2: Replace Inline Delta Logic with DeltaChip

### Before
```tsx
{delta !== 0 && (
  <div className={cn(
    "flex items-center gap-1 text-xs font-medium",
    delta >= 0 ? "text-green-500" : "text-red-500"
  )}>
    {delta >= 0 ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    )}
    {`${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`}
  </div>
)}
```

### After
```tsx
import { DeltaChip } from '@/design-registry';

{delta !== 0 && (
  <DeltaChip value={delta} format="percentage" size="xs" />
)}
```

### Benefits
- **Code Reduction**: Eliminates 15-20 lines of duplicated delta display logic
- **Semantic Colors**: Automatic positive/negative/neutral color coding
- **Icon Management**: Automatic icon selection (TrendingUp/TrendingDown/Minus)
- **Format Flexibility**: Supports percentage (`+5.2%`), points (`5.2pp`), and number formats
- **Size Variants**: xs, sm, md, lg, xl for different contexts

### Replaced In
- ✅ `src/components/AsoMetricCard.tsx:142-154` → Line 134 (impressionsDelta)
- ✅ `src/components/AsoMetricCard.tsx:167-179` → Line 147 (downloadsDelta)
- ✅ `src/components/AsoMetricCard.tsx:213-226` → Line 181 (cvrDelta, percentage points format)
- ✅ `src/components/ui/TrendBadge.tsx:11-66` → Lines 28-33 (entire component refactored)

---

## Pattern 3: Replace Inline Loading Skeletons with LoadingSkeleton

### Before
```tsx
if (isLoading) {
  return (
    <Card className="relative overflow-hidden">
      <div className="h-[280px] animate-pulse bg-muted" />
    </Card>
  );
}
```

### After
```tsx
import { LoadingSkeleton } from '@/design-registry';

if (isLoading) {
  return (
    <Card className="relative overflow-hidden">
      <LoadingSkeleton height="h-[280px]" />
    </Card>
  );
}
```

### Benefits
- **Consistency**: All loading states use identical animation and styling
- **Flexibility**: Customizable height, width, and count for multiple skeleton lines
- **Semantics**: Clear component name indicating purpose

### Replaced In
- ✅ `src/components/TotalMetricCard.tsx:65-70` → Lines 59-63
- ✅ `src/components/AsoMetricCard.tsx:92-97` → Lines 83-89

---

## Pattern 4: Legacy Wrapper Pattern (Backward Compatibility)

### Strategy
When a component is widely used across the codebase, create a legacy wrapper that uses the Design Registry primitive internally while maintaining the original API.

### Example: TrendBadge → DeltaChip

```tsx
/**
 * TrendBadge - Legacy wrapper for DeltaChip
 *
 * MIGRATION NOTE: This component now uses the Design Registry DeltaChip primitive.
 * All new code should use DeltaChip directly from @/design-registry.
 */

import { DeltaChip } from '@/design-registry';

export function TrendBadge({ value, label, size, showIcon }: TrendBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <DeltaChip value={value} format="percentage" size={size} showIcon={showIcon} />
      {label && <span className="text-zinc-500 text-xs">{label}</span>}
    </div>
  );
}
```

### Benefits
- **Zero Breaking Changes**: Existing consumers continue to work without modification
- **Gradual Migration**: New code can use DeltaChip directly
- **Documentation**: Migration note guides developers to use primitives
- **Deprecation Path**: Easy to identify and migrate legacy usage later

### Applied To
- ✅ `src/components/ui/TrendBadge.tsx:1-68` (complete refactor)

---

## Migration Checklist

When migrating a component to use the Design Registry, follow this checklist:

### 1. Analysis Phase
- [ ] Identify all inline formatting functions (formatNumber, formatPercent, etc.)
- [ ] Identify all inline delta/trend logic
- [ ] Identify all custom loading skeletons
- [ ] Identify all hardcoded colors and gradients
- [ ] Check if component is widely used (consider legacy wrapper pattern)

### 2. Import Phase
```tsx
import {
  MetricValue,
  DeltaChip,
  LoadingSkeleton,
  SectionHeader,
  ZeroState,
  Badge,
  IconWrapper,
  // ... other primitives
} from '@/design-registry';
```

### 3. Migration Phase
- [ ] Replace formatNumber() calls with `<MetricValue />`
- [ ] Replace inline delta logic with `<DeltaChip />`
- [ ] Replace loading skeletons with `<LoadingSkeleton />`
- [ ] Update component documentation with "MIGRATION NOTE"
- [ ] Remove unused imports (ArrowUp, ArrowDown if replaced by DeltaChip)
- [ ] Remove unused helper functions

### 4. Verification Phase
- [ ] Run `npm run build` - verify no errors
- [ ] Run `npm test` - verify no test failures
- [ ] Visual regression testing (if available)
- [ ] Test in browser for visual consistency

---

## Migration Statistics

### Components Migrated (Phase 3)
1. **TrendBadge** (`src/components/ui/TrendBadge.tsx`)
   - Before: 68 lines
   - After: 42 lines
   - Reduction: 38% (-26 lines)
   - Now uses: DeltaChip

2. **TotalMetricCard** (`src/components/TotalMetricCard.tsx`)
   - Before: 121 lines
   - After: 111 lines
   - Reduction: 8% (-10 lines)
   - Now uses: MetricValue, LoadingSkeleton, TrendBadge (DeltaChip wrapper)

3. **AsoMetricCard** (`src/components/AsoMetricCard.tsx`)
   - Before: 276 lines
   - After: 233 lines
   - Reduction: 16% (-43 lines)
   - Now uses: MetricValue, DeltaChip, LoadingSkeleton

### Total Impact
- **Lines Removed**: 79 lines of duplicated code
- **formatNumber() Eliminations**: 2 functions removed (9 lines each)
- **Delta Logic Eliminations**: 4 inline implementations removed (15-20 lines each)
- **Test Coverage**: 92 tests passing (42 formatters + 50 primitives)

---

## Next Migration Candidates

Based on the initial audit, these components should be migrated next:

### High Priority (Week 1)
1. **ExecutiveSummaryCard** - Uses inline formatNumber
2. **DerivedKpiGrid** - Multiple metric displays with deltas
3. **StabilityScoreCard** - Score badges and metric displays

### Medium Priority (Week 2)
4. **OpportunityMapCard** - Priority badges and metrics
5. **OutcomeSimulationCard** - Simulation results with deltas
6. **TwoPathFunnelCard** - Conversion metrics

### Low Priority (Week 3-4)
7. **TrafficIntentInsightCard** - Insight narratives
8. **SearchBrowseDiagnosticCard** - Diagnostic metrics
9. **InsightNarrativeCard** - AI-generated insights

---

## Anti-Patterns to Avoid

### ❌ Don't: Copy Design Registry Code
```tsx
// BAD: Duplicating MetricValue logic
const formatCompact = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  // ...
};
```

### ✅ Do: Import from Design Registry
```tsx
// GOOD: Use the primitive
import { MetricValue } from '@/design-registry';
<MetricValue value={value} format="compact" />
```

### ❌ Don't: Create Custom Delta Components
```tsx
// BAD: Custom trend indicator
const MyTrendBadge = ({ value }) => (
  <div className={value > 0 ? 'text-green' : 'text-red'}>
    {value}%
  </div>
);
```

### ✅ Do: Use DeltaChip Primitive
```tsx
// GOOD: Use the primitive
import { DeltaChip } from '@/design-registry';
<DeltaChip value={value} format="percentage" />
```

### ❌ Don't: Hardcode Semantic Colors
```tsx
// BAD: Hardcoded priority colors
<div className="text-red-400 bg-red-500/10">High Priority</div>
```

### ✅ Do: Use Badge with Semantic Variants
```tsx
// GOOD: Semantic badge
import { Badge } from '@/design-registry';
<Badge variant="priority" priority="high">High Priority</Badge>
```

---

## Success Metrics

### Code Quality
- ✅ 79 lines of duplicated code eliminated
- ✅ 2 formatNumber() functions removed
- ✅ 4 inline delta implementations removed
- ✅ 0 breaking changes to existing components

### Test Coverage
- ✅ 92/92 design registry tests passing
- ✅ 100% coverage on all primitives
- ✅ Build succeeds without errors

### Developer Experience
- ✅ Single import source: `@/design-registry`
- ✅ Clear migration patterns documented
- ✅ Legacy wrapper pattern for backward compatibility
- ✅ TypeScript type safety across all primitives

---

## Lessons Learned

1. **Start with Widely-Used Components**: TrendBadge was a perfect first candidate because it's used across multiple components. By wrapping it with DeltaChip, we got immediate benefits across the entire app.

2. **Preserve API Compatibility**: The legacy wrapper pattern allowed us to migrate internal implementation without breaking existing consumers.

3. **Test Early, Test Often**: Running tests after each component migration caught issues immediately.

4. **Document as You Go**: Adding "MIGRATION NOTE" comments helps future developers understand the evolution of the codebase.

5. **Measure Impact**: Tracking line reduction and code elimination provides concrete evidence of improvement.

---

## Phase 3 Complete ✅

**Status**: 3 of 3 initial components migrated successfully
- ✅ TrendBadge → DeltaChip wrapper
- ✅ TotalMetricCard → MetricValue + LoadingSkeleton
- ✅ AsoMetricCard → MetricValue + DeltaChip + LoadingSkeleton

**Next**: Continue Phase 3 with next batch of components (ExecutiveSummaryCard, DerivedKpiGrid, etc.)
