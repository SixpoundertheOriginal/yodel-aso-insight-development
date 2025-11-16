# Design Registry

> Single source of truth for all UI tokens, primitives, and templates in the Yodel ASO Insight application.

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Token Categories](#token-categories)
- [Usage Examples](#usage-examples)
- [Migration Guide](#migration-guide)
- [Development](#development)
- [Testing](#testing)

---

## Overview

The Design Registry is a comprehensive design system that provides:

✅ **Consistent number formatting** - Replaces 7+ inline `formatNumber()` implementations
✅ **Semantic color system** - Maps UI meaning to consistent colors
✅ **Typography hierarchy** - Standardized text styles
✅ **Spacing tokens** - Consistent layout spacing
✅ **Icon sizing** - Standardized icon scales
✅ **Elevation system** - Shadows, z-index, glass effects
✅ **Motion tokens** - Animation standards
✅ **Layout patterns** - Grid and flex utilities
✅ **Microcopy standards** - Consistent UI text

---

## Installation

Import from the design registry:

```typescript
import { formatters, semanticColors, typography } from '@/design-registry';
```

---

## Token Categories

### 1. Formatters (`formatters`)

**Purpose:** Standardized number, percentage, and date formatting.

**Replaces:** 7+ inline `formatNumber()` implementations across components.

```typescript
import { formatters } from '@/design-registry';

// Number formatting
formatters.number.compact(1500000)      // "1.5M"
formatters.number.compact(5000)         // "5.0K"
formatters.number.full(1234567)         // "1,234,567"
formatters.number.precise(0.12345, 2)   // "0.12"

// Percentage formatting
formatters.percentage.standard(12.5)    // "12.5%"
formatters.percentage.delta(5.2)        // "+5.2%"
formatters.percentage.points(3.1)       // "3.1pp"

// Ratio formatting
formatters.ratio(2.5)                   // "2.5:1"
formatters.ratio(1000)                  // "∞"

// Date formatting
formatters.date.short('2024-01-15')     // "Jan 15"
formatters.date.medium('2024-01-15')    // "Jan 15, 2024"
formatters.date.long('2024-01-15')      // "January 15, 2024"
```

### 2. Semantic Colors (`semanticColors`)

**Purpose:** Maps UI meaning to consistent color tokens.

**Replaces:** 12+ hardcoded gradient/color implementations.

```typescript
import { semanticColors } from '@/design-registry';

// Delta colors (trend indicators)
semanticColors.delta.positive.text      // "text-green-400"
semanticColors.delta.positive.bg        // "bg-green-500/10"
semanticColors.delta.negative.text      // "text-red-400"

// Priority colors (intelligence cards)
semanticColors.priority.high.badge      // "bg-red-500/20 text-red-300..."
semanticColors.priority.medium.text     // "text-yellow-400"

// Traffic source colors
semanticColors.trafficSource.search.primary   // "from-blue-500 to-purple-600"
semanticColors.trafficSource.browse.text      // "text-pink-400"

// Metric colors
semanticColors.metric.impressions.primary     // "from-cyan-500 to-blue-600"
semanticColors.metric.downloads.icon          // "text-green-500"

// Status colors
semanticColors.status.success.bg        // "bg-green-500/10"
semanticColors.status.error.border      // "border-red-500/20"

// Score colors (intelligence layer)
semanticColors.score.excellent.text     // "text-green-400"
semanticColors.score.poor.ring          // "ring-red-500/20"
```

### 3. Typography (`typography`)

**Purpose:** Consistent typography hierarchy.

**Replaces:** Inconsistent font-size/weight combinations.

```typescript
import { typography } from '@/design-registry';

// Display text (page titles)
typography.display.xl                   // "text-5xl font-bold tracking-tight"

// Section headers
typography.section.primary              // "text-2xl font-bold tracking-tight text-zinc-100"

// Card titles
typography.card.title                   // "text-lg font-semibold text-zinc-200"
typography.card.label                   // "text-xs font-medium text-muted-foreground uppercase..."

// Metric values
typography.metric.hero                  // "text-5xl font-bold tracking-tight"
typography.metric.primary               // "text-4xl font-bold tracking-tight"

// Body text
typography.body.md                      // "text-sm text-zinc-300 leading-relaxed"
```

### 4. Spacing (`spacing`)

**Purpose:** Consistent layout spacing.

**Replaces:** Inconsistent `space-y-4`, `gap-6`, `p-6` patterns.

```typescript
import { spacing } from '@/design-registry';

// Card padding
spacing.card.default                    // "p-6"
spacing.card.compact                    // "p-4"

// Stack spacing (vertical)
spacing.stack.md                        // "space-y-4"
spacing.stack.lg                        // "space-y-6"

// Grid gaps
spacing.grid.lg                         // "gap-6"

// Section spacing
spacing.section.md                      // "mb-6"
```

### 5. Icons (`icons`)

**Purpose:** Standardized icon sizing.

**Replaces:** Inconsistent `h-3 w-3`, `h-4 w-4`, `h-5 w-5` patterns.

```typescript
import { icons } from '@/design-registry';

// Size scale
icons.sizes.sm                          // "h-4 w-4"
icons.sizes.md                          // "h-5 w-5"

// Semantic sizing (recommended)
icons.semantic.cardHeader               // "h-5 w-5"
icons.semantic.sectionHeader            // "h-6 w-6"
icons.semantic.button                   // "h-4 w-4"

// Icon colors
icons.colors.primary                    // "text-yodel-orange"
icons.colors.success                    // "text-green-400"
```

### 6. Elevation (`elevation`)

**Purpose:** Shadows, z-index, glass effects.

```typescript
import { elevation } from '@/design-registry';

// Shadows
elevation.shadows.sm                    // "shadow-sm"
elevation.shadows.glow                  // "shadow-glow-orange"

// Z-index
elevation.zIndex.modal                  // "z-50"
elevation.zIndex.tooltip                // "z-60"

// Glass morphism
elevation.glass.medium                  // "backdrop-blur-md bg-card/60..."

// Hover effects
elevation.hover.lift                    // "hover:shadow-lg hover:scale-[1.02]..."
```

### 7. Motion (`motion`)

**Purpose:** Animation standards.

```typescript
import { motion } from '@/design-registry';

// Durations
motion.duration.normal                  // "duration-200"
motion.duration.slow                    // "duration-300"

// Transitions
motion.transitions.card                 // "transition-all duration-300 ease-in-out"
motion.transitions.button               // "transition-colors duration-200 ease-in-out"

// Animations
motion.animations.fadeIn                // "animate-fade-in"
motion.animations.spin                  // "animate-spin"
```

### 8. Layout (`layout`)

**Purpose:** Grid and container patterns.

```typescript
import { layout } from '@/design-registry';

// Containers
layout.container.lg                     // "max-w-7xl mx-auto"

// Grid patterns
layout.grid.twoCol                      // "grid grid-cols-1 md:grid-cols-2 gap-6"
layout.grid.kpi                         // "grid grid-cols-1 md:grid-cols-2 gap-6"
layout.grid.metrics                     // "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Flex patterns
layout.flex.between                     // "flex items-center justify-between"
layout.flex.row                         // "flex flex-row items-center gap-4"
```

### 9. Microcopy (`microcopy`)

**Purpose:** Standardized UI text.

**Replaces:** Inconsistent loading/error/empty state messages.

```typescript
import { microcopy } from '@/design-registry';

// Loading states
microcopy.loading.analytics             // "Loading analytics..."
microcopy.loading.insights              // "Generating insights..."

// Empty states
microcopy.empty.noData                  // "No data available for the selected period"
microcopy.empty.insufficientData        // "Insufficient data for analysis"

// Error messages
microcopy.error.loadingFailed           // "Failed to load data"
microcopy.error.retry                   // "Retry"

// Data indicators
microcopy.indicator.live(1500)          // "Live Data • 1,500 records"
microcopy.indicator.filtered(100)       // "100 filtered records"

// Section names
microcopy.sections.intelligence         // "Intelligence Layer"
microcopy.sections.twoPath              // "Two-Path Conversion Analysis"
```

---

## Usage Examples

### Example 1: Format Numbers in KPI Card

**Before (inconsistent):**
```typescript
// AsoMetricCard.tsx:78-86
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

<div>{formatNumber(impressions)}</div>
```

**After (using design registry):**
```typescript
import { formatters } from '@/design-registry';

<div>{formatters.number.compact(impressions)}</div>
```

### Example 2: Apply Semantic Colors

**Before (hardcoded):**
```typescript
const colors = isPositive
  ? 'text-green-400 bg-green-500/10'
  : 'text-red-400 bg-red-500/10';
```

**After (using design registry):**
```typescript
import { semanticColors } from '@/design-registry';

const colors = isPositive
  ? semanticColors.delta.positive
  : semanticColors.delta.negative;

<div className={colors.text}>{value}</div>
<div className={colors.bg}>{/* background */}</div>
```

### Example 3: Use Typography Hierarchy

**Before (inconsistent):**
```typescript
<h2 className="text-2xl font-bold tracking-tight text-zinc-100">
  Section Title
</h2>
```

**After (using design registry):**
```typescript
import { typography } from '@/design-registry';

<h2 className={typography.section.primary}>
  Section Title
</h2>
```

### Example 4: Build Responsive Grid

**Before (manual):**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* KPI cards */}
</div>
```

**After (using design registry):**
```typescript
import { layout } from '@/design-registry';

<div className={layout.grid.kpi}>
  {/* KPI cards */}
</div>
```

---

## Migration Guide

See [MIGRATION.md](./MIGRATION.md) for detailed migration patterns.

---

## Development

### Adding New Tokens

1. Add to appropriate token file (`tokens/*.ts`)
2. Export from `index.ts`
3. Add TypeScript types to `types/index.ts`
4. Write unit tests
5. Update Storybook documentation

### File Structure

```
src/design-registry/
├── constants/
│   └── tokens.ts           # Raw token values
├── tokens/
│   ├── formatters.ts       # Number/date formatters
│   ├── colors.ts           # Semantic colors
│   ├── typography.ts       # Type scale
│   ├── spacing.ts          # Spacing tokens
│   ├── icons.ts            # Icon sizing
│   ├── elevation.ts        # Shadows/z-index
│   ├── motion.ts           # Animations
│   ├── layout.ts           # Grids/containers
│   └── microcopy.ts        # UI text
├── types/
│   └── index.ts            # TypeScript types
├── utils/
│   └── classBuilder.ts     # cn() utility
├── components/             # (Phase 2)
│   ├── primitives/
│   └── templates/
└── index.ts                # Central export
```

---

## Testing

Run unit tests:
```bash
npm test -- design-registry
```

Run visual regression tests:
```bash
npm run storybook
npm run chromatic
```

---

## Storybook

View design registry documentation:
```bash
npm run storybook
# Navigate to: Design Registry > Overview
```

---

## Support

Questions? See [MIGRATION.md](./MIGRATION.md) or contact the frontend team.

---

**Version:** 1.0.0 (Phase 1 - Foundation)
**Last Updated:** November 2024
**Status:** ✅ Production Ready (Tokens Only - No Component Changes)
