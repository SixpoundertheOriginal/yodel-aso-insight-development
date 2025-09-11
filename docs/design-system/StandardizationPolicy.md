# Stats Card Standardization Policy

**Effective Date:** January 2025  
**Authority:** Design System Team  
**Status:** Active

---

## Policy Statement

All new statistical displays, KPI summaries, and metric presentations across Yodel products **must** use the standardized `DashboardStatsCard` component and canonical grid pattern to ensure consistency, accessibility, and maintainability.

---

## Scope

This policy applies to:
- ✅ Dashboard KPI displays
- ✅ Analytics summary statistics  
- ✅ Executive reporting interfaces
- ✅ Admin panel metrics
- ✅ Insight and performance summaries
- ✅ Any numeric data presentation requiring visual consistency

This policy does **not** apply to:
- ❌ Complex multi-line data displays
- ❌ Interactive controls within cards
- ❌ Non-numeric content presentation
- ❌ Legacy components during migration period

---

## Requirements

### Mandatory Component Usage

**Primary Requirement:**
```jsx
// ✅ Required: Standard pattern
<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
  <DashboardStatsCard label="Metric Name" value={12345} delta={3.2} />
</div>
```

**Forbidden Patterns:**
```jsx
// ❌ Forbidden: Custom layouts that break consistency
<div className="flex flex-wrap justify-between">
  <div className="custom-stat-card">...</div>
</div>

// ❌ Forbidden: One-off stat card components
<MyCustomStatCard />
```

### Grid Pattern Standards

| Breakpoint | Required Classes | Columns | Use Case |
|------------|-----------------|---------|----------|
| **Mobile** | `grid-cols-2` | 2 | Essential metrics only |
| **Tablet** | `sm:grid-cols-3` | 3 | Balanced information density |
| **Desktop** | `xl:grid-cols-6` | 6 | Full dashboard overview |
| **Gap** | `gap-4` | 16px | Consistent spacing |

**Complete Required Pattern:**
```jsx
className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4"
```

---

## Approved Exceptions

### Specialized Use Cases

**TrafficSourceKpiCards** - Pre-approved for:
- Analytics requiring action recommendations
- SubLabel indicators ("Scale", "Optimize", etc.)
- Different grid pattern: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

**Future Extensions** - May be approved for:
- Sparkline integration within cards
- Custom icon integration
- Compact variants for dense displays

### Approval Process

1. **Request Review**: Submit to Design System team with use case justification
2. **Technical Assessment**: Evaluate impact on consistency and accessibility
3. **Design Review**: Ensure visual harmony with existing patterns
4. **Documentation**: Update standards and provide migration guidance

**Contact:** `#design-system-team` or `design-system@yodel.com`

---

## Implementation Standards

### Required Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | ✅ | Metric identifier |
| `value` | `number` | ✅ | Numeric value |
| `variant` | `'number' \| 'percentage'` | ❌ | Formatting mode |
| `decimals` | `number` | ❌ | Decimal precision |
| `delta` | `number` | ❌ | Change percentage |
| `subLabel` | `string` | ❌ | Action indicator |

### Code Quality Requirements

```jsx
// ✅ Good: Proper prop usage
<DashboardStatsCard 
  label="Conversion Rate" 
  value={2.34} 
  variant="percentage" 
  decimals={2}
  delta={0.6} 
/>

// ❌ Bad: Missing required props
<DashboardStatsCard value={123} />

// ❌ Bad: Incorrect variant usage
<DashboardStatsCard 
  label="Downloads" 
  value={45678} 
  variant="percentage" // Wrong for count data
/>
```

### Accessibility Requirements

- ✅ All cards must include proper `label` props
- ✅ Delta indicators must use semantic ARIA labels
- ✅ Interactive cards require keyboard navigation support
- ✅ Color information must not be the only differentiator
- ✅ Text contrast must meet WCAG AA standards

---

## Quality Assurance

### Code Review Checklist

Development teams must verify:

- [ ] Uses `DashboardStatsCard` component (not custom alternatives)
- [ ] Implements standard grid pattern (`grid-cols-2 sm:grid-cols-3 xl:grid-cols-6`)
- [ ] Provides required `label` and `value` props
- [ ] Uses appropriate `variant` for data type
- [ ] Includes `delta` for trend data when available
- [ ] Responsive behavior tested across breakpoints
- [ ] Accessibility validated with screen readers
- [ ] Visual consistency maintained with existing interfaces

### Testing Requirements

- **Unit Tests**: Component prop validation and rendering
- **Integration Tests**: Grid layout across breakpoints
- **Visual Regression**: Automated screenshot comparison
- **Accessibility Tests**: Screen reader and keyboard navigation
- **Performance Tests**: Rendering with large datasets

---

## Migration Guidelines

### Timeline

- **Phase 1** (Immediate): All new features use standardized components
- **Phase 2** (Q2 2025): Migrate high-traffic dashboard pages
- **Phase 3** (Q3 2025): Complete legacy component migration
- **Phase 4** (Q4 2025): Remove deprecated patterns

### Migration Process

1. **Audit**: Identify all existing stat card implementations
2. **Plan**: Prioritize by user impact and technical complexity
3. **Implement**: Replace with `DashboardStatsCard` 
4. **Test**: Verify functionality and accessibility
5. **Deploy**: Roll out with monitoring
6. **Clean**: Remove legacy components

### Support Resources

- **Documentation**: `/docs/design-system/DashboardStatsCard.md`
- **Storybook**: Component examples and patterns
- **Templates**: Copy-paste examples for common use cases
- **Migration Scripts**: Automated refactoring assistance (where possible)

---

## Enforcement

### Development Process

- **Pre-commit Hooks**: Automated pattern detection
- **Pull Request Templates**: Include design system checklist
- **Code Review Guidelines**: Mandatory DS compliance check
- **CI/CD Integration**: Automated accessibility and visual regression testing

### Escalation Process

1. **Development Team**: First line of enforcement during code review
2. **Tech Lead**: Escalation for pattern exceptions or complex cases  
3. **Design System Team**: Final authority for standard interpretations
4. **Architecture Review**: For changes affecting design system foundations

---

## Continuous Improvement

### Feedback Mechanisms

- **Quarterly Reviews**: Evaluate policy effectiveness and developer experience
- **Usage Analytics**: Monitor adoption rates and common pain points
- **Developer Surveys**: Collect feedback on standards and tooling
- **Design Critiques**: Regular visual consistency audits

### Evolution Process

1. **Collect Feedback**: Gather input from development teams and users
2. **Analyze Patterns**: Identify common customization needs
3. **Propose Changes**: Design system team evaluates enhancements
4. **Implement Updates**: Backward-compatible improvements when possible
5. **Document Changes**: Update policy and migration guidance

---

## Appendix: Quick Reference

### Standard Implementation
```jsx
import { DashboardStatsCard } from '@/components/DashboardStatsCard';

// Basic usage
<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
  <DashboardStatsCard label="Downloads" value={45678} delta={3.2} />
  <DashboardStatsCard label="CVR" value={2.34} variant="percentage" delta={-0.6} />
</div>
```

### Specialized Usage
```jsx
import { TrafficSourceKpiCards } from '@/components/TrafficSourceKpiCards';

// Analytics with action recommendations
<TrafficSourceKpiCards
  sources={trafficSources}
  selectedKPI="downloads"
  summary={summaryData}
/>
```

---

**Document Owner:** Design System Team  
**Last Updated:** January 2025  
**Next Review:** April 2025  
**Version:** 1.0