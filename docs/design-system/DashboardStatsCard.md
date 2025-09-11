# Dashboard Stats Card - Design System Pattern

**Status:** Production Ready  
**Version:** 1.0  
**Component:** `DashboardStatsCard`  
**Last Updated:** January 2025

---

## Overview

The `DashboardStatsCard` is the **canonical component** for displaying key performance indicators (KPIs) and statistical summaries across all Yodel analytics and reporting interfaces. This component ensures visual consistency, accessibility, and maintainability across the platform.

### Core Principles

1. **Single Source of Truth**: All primary dashboard stats use `DashboardStatsCard`
2. **Responsive Design**: Standard grid pattern that works across all devices
3. **Design System Compliance**: Uses consistent tokens for spacing, typography, and colors
4. **Accessibility First**: WCAG compliant with proper ARIA labels and semantic structure

---

## Component Specification

### Required Props

| Prop | Type | Description | Example |
|------|------|-------------|---------|
| `label` | `string` | Metric name/description | "Impressions", "Downloads", "CVR" |
| `value` | `number` | Raw numeric value | `1234567`, `23.45` |

### Optional Props

| Prop | Type | Default | Description | Example |
|------|------|---------|-------------|---------|
| `variant` | `'number' \| 'percentage'` | `'number'` | Formatting mode | `'percentage'` for CVR metrics |
| `decimals` | `number` | `1` | Decimal places (percentage variant) | `2` for precise percentages |
| `delta` | `number` | `undefined` | Change percentage | `3.2` for +3.2% increase |
| `className` | `string` | `undefined` | Additional CSS classes | Custom styling overrides |

---

## Design Tokens

### Visual Design

| Property | Token/Class | Value | Usage |
|----------|-------------|--------|-------|
| **Background** | `bg-background/60` | 60% opacity background | Card surface |
| **Border** | `border-border rounded-lg` | System border with 8px radius | Card boundary |
| **Shadow** | `shadow-sm` | Subtle elevation | Visual depth |
| **Padding** | `p-5` | 20px all sides | Internal spacing |
| **Min Size** | `min-w-[170px] min-h-[100px]` | 170×100px minimum | Prevents layout collapse |

### Typography

| Element | Classes | Font Properties | Usage |
|---------|---------|-----------------|-------|
| **Label** | `text-xs text-muted-foreground` | 12px, muted color | Metric identifier |
| **Value** | `font-mono tabular-nums text-2xl md:text-3xl font-bold text-white` | Mono, 24-30px, bold, white | Primary data |
| **Delta** | `text-sm` + conditional colors | 14px with green/red | Change indicator |

### Color Palette

| State | Class | Hex | Usage |
|-------|-------|-----|-------|
| **Positive Delta** | `text-emerald-500` | #10b981 | Upward trends |
| **Negative Delta** | `text-red-500` | #ef4444 | Downward trends |
| **Primary Text** | `text-white` | #ffffff | Main values |
| **Muted Text** | `text-muted-foreground` | System muted | Labels |

---

## Standard Grid Pattern

### Responsive Layout

The canonical grid pattern for all dashboard stats:

```jsx
<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
  {/* Stats cards */}
</div>
```

### Breakpoint Behavior

| Breakpoint | Columns | Screen Size | Use Case |
|------------|---------|-------------|----------|
| **Mobile** | 2 | < 640px | Essential metrics only |
| **Tablet** | 3 | 640px - 1279px | Balanced view |
| **Desktop** | 6 | ≥ 1280px | Full dashboard experience |

### Grid Examples

#### 2-Column Mobile Layout
```jsx
// Mobile: Shows 2 most important KPIs per row
<div className="grid grid-cols-2 gap-4">
  <DashboardStatsCard label="Impressions" value={1234567} delta={3.2} />
  <DashboardStatsCard label="Downloads" value={45678} delta={-1.4} />
</div>
```

#### 3-Column Tablet Layout
```jsx
// Tablet: Balanced information density
<div className="grid grid-cols-3 gap-4">
  <DashboardStatsCard label="Impressions" value={1234567} delta={3.2} />
  <DashboardStatsCard label="Downloads" value={45678} delta={-1.4} />
  <DashboardStatsCard label="Page Views" value={89012} delta={2.1} />
</div>
```

#### 6-Column Desktop Layout
```jsx
// Desktop: Full dashboard overview
<div className="grid grid-cols-6 gap-4">
  <DashboardStatsCard label="Impressions" value={1234567} delta={3.2} />
  <DashboardStatsCard label="Downloads" value={45678} delta={-1.4} />
  <DashboardStatsCard label="Page Views" value={89012} delta={2.1} />
  <DashboardStatsCard label="Page CVR" value={2.34} variant="percentage" delta={0.6} />
  <DashboardStatsCard label="Impression CVR" value={3.71} variant="percentage" delta={-0.2} />
  <DashboardStatsCard label="True Search" value={987654} delta={4.8} />
</div>
```

---

## Usage Examples

### Basic Number Metric
```jsx
<DashboardStatsCard 
  label="Total Downloads" 
  value={45678} 
  delta={-1.4} 
/>
```
**Output:** "45,678" with red -1.4% arrow

### Percentage Metric
```jsx
<DashboardStatsCard 
  label="Conversion Rate" 
  value={2.34} 
  variant="percentage" 
  decimals={2}
  delta={0.6} 
/>
```
**Output:** "2.34%" with green +0.6% arrow

### No Delta
```jsx
<DashboardStatsCard 
  label="Current Users" 
  value={1205} 
/>
```
**Output:** "1,205" with no trend indicator

---

## Accessibility Features

### ARIA Support
- `role="status"` on delta indicators
- `aria-label` describes trend direction and magnitude
- `aria-hidden="true"` on decorative icons

### Screen Reader Example
```html
<!-- Screen reader announces: "Downloads 45,678 Down 1.4 percent" -->
<div data-testid="dashboard-stat-card">
  <div>Downloads</div>
  <div>45,678</div>
  <div role="status" aria-label="Down 1.4 percent">
    <ArrowDown aria-hidden="true" />
    <span>-1.4%</span>
  </div>
</div>
```

### Keyboard Navigation
- Cards are focusable when interactive
- Clear focus indicators
- Proper tab order

---

## Specialized Variants

### Traffic Source Cards (with subLabels)
For analytics requiring action recommendations:

```jsx
// Uses specialized TrafficSourceKpiCards component
<TrafficSourceKpiCards 
  sources={trafficSources}
  selectedKPI="downloads"
  summary={summaryData}
/>
```

**Features:**
- SubLabels: "Scale", "Optimize", "Investigate", "Expand", "Monitor"
- Different grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Harmonized styling with DashboardStatsCard

---

## Implementation Standards

### Required Usage
✅ **Use DashboardStatsCard for:**
- All primary dashboard KPIs
- Executive summary statistics  
- Analytics overview metrics
- Admin panel statistics
- Any numeric data display requiring consistency

❌ **Don't use for:**
- Complex multi-line displays
- Interactive controls within cards
- Non-numeric content
- One-off custom layouts

### Code Standards
```jsx
// ✅ Good: Follows standard pattern
<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
  <DashboardStatsCard label="Downloads" value={downloads} delta={downloadsDelta} />
  <DashboardStatsCard label="CVR" value={cvr} variant="percentage" delta={cvrDelta} />
</div>

// ❌ Bad: Custom layout breaks consistency  
<div className="flex flex-wrap justify-between">
  <div className="custom-stat-card">...</div>
</div>
```

### Performance Considerations
- Uses `useMemo` for formatting expensive calculations
- Responsive classes minimize layout shifts
- Minimal re-renders with proper prop types

---

## Migration Guide

### From Legacy Stat Cards
1. **Identify** all custom stat card components
2. **Replace** with `DashboardStatsCard`
3. **Update** grid containers to standard pattern
4. **Test** responsive behavior
5. **Verify** accessibility compliance

### Before/After Example
```jsx
// Before: Legacy custom card
<div className="bg-white p-4 rounded shadow">
  <h3>{label}</h3>
  <p className="text-2xl">{value.toLocaleString()}</p>
</div>

// After: Standard DashboardStatsCard
<DashboardStatsCard label={label} value={value} />
```

---

## Development Guidelines

### New Feature Requirements
- All new stat/metric displays **must** use `DashboardStatsCard`
- Deviations require Design System team approval
- Custom modifications should extend, not replace, the base component

### Review Checklist
- [ ] Uses standard grid pattern (`grid-cols-2 sm:grid-cols-3 xl:grid-cols-6`)
- [ ] Proper `label` and `value` props provided
- [ ] `variant="percentage"` used for percentage metrics
- [ ] Delta values formatted as percentages
- [ ] Responsive behavior tested
- [ ] Accessibility validated

### Testing Requirements
- Visual regression tests for all breakpoints
- Accessibility audit with screen readers
- Performance testing with large datasets
- Cross-browser compatibility verification

---

## Related Components

| Component | Use Case | Relationship |
|-----------|----------|--------------|
| `TrafficSourceKpiCards` | Analytics with action recommendations | Specialized variant with subLabels |
| `PremiumCard` | Container components | Layout wrapper for card groups |
| `Card` | Base UI component | Foundation used by DashboardStatsCard |

---

## Future Enhancements

### Planned Features
- [ ] Optional `subLabel` prop for action indicators
- [ ] Sparkline chart integration
- [ ] Custom icon support
- [ ] Compact variant for dense displays

### Considerations
- Maintain backward compatibility
- Preserve performance characteristics
- Keep accessibility standards
- Follow design token system

---

## Support

**Design Team:** [Design System Slack Channel]  
**Engineering:** [Component Library Repository]  
**Documentation:** This file and Storybook stories

**Last Review:** January 2025  
**Next Review:** April 2025