# Component Refactor Outline - Review Management Module

## 📋 Quick Reference

This document provides detailed code-level changes for each component being refactored.

**Related Documents:**
- `IMPLEMENTATION_PLAN.md` - Comprehensive strategy and testing
- `ROLLBACK_STRATEGY.md` - Emergency rollback procedures

---

## 🗂️ File Change Overview

### Files to Modify (3 files)

```
src/
├── components/
│   └── reviews/
│       ├── narrative/
│       │   └── ExecutiveNarrativeSummary.tsx    [MODIFY] Lines 164-218 removed
│       └── ReviewIntelligenceSummary.tsx         [MODIFY] Lines 56-65 removed, new content added
└── pages/
    └── growth-accelerators/
        └── reviews.tsx                           [MODIFY] Lines 1794, 1810 - add headers
```

---

## 🔧 Component 1: ExecutiveNarrativeSummary.tsx

**File Path:** `src/components/reviews/narrative/ExecutiveNarrativeSummary.tsx`

### Current Structure (BEFORE)

```tsx
export const ExecutiveNarrativeSummary: React.FC<ExecutiveNarrativeSummaryProps> = ({
  appName,
  totalReviews,
  averageRating,
  positivePercentage,
  sentimentDistribution,
  topThemes,
  criticalAlerts,
  dateRange
}) => {
  return (
    <Card className={...}>
      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Executive Summary</h3>
                {/* ⬆️ CHANGE THIS TITLE */}
                <p className="text-xs text-muted-foreground">AI-powered review intelligence</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={...}>
            {sentimentHealth.icon}
            {sentimentHealth.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Narrative Overview - KEEP THIS */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          ...
        </div>

        {/* ❌ REMOVE THIS ENTIRE SECTION (Lines 164-218) */}
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Sentiment */}
          <div className="p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Smile className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Sentiment
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{positivePercentage}%</span>
              <span className="text-xs text-muted-foreground">positive</span>
            </div>
          </div>

          {/* Rating */}
          <div className="p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Rating
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{averageRating.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">/ 5.0</span>
            </div>
          </div>

          {/* Trend */}
          <div className="p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              {positivePercentage >= 70 ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Trend
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-2xl font-bold",
                positivePercentage >= 70 ? "text-success" : "text-destructive"
              )}>
                {positivePercentage >= 70 ? '↑' : '↓'}
              </span>
              <span className="text-xs text-muted-foreground">
                {positivePercentage >= 70 ? 'Strong' : 'Concerning'}
              </span>
            </div>
          </div>
        </div>

        {/* Key Insights - KEEP THIS */}
        {keyInsights.length > 0 && (
          <div className="space-y-3">
            ...
          </div>
        )}

        {/* Critical Alerts - KEEP THIS */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-3">
            ...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### New Structure (AFTER)

```tsx
export const ExecutiveNarrativeSummary: React.FC<ExecutiveNarrativeSummaryProps> = ({
  appName,
  totalReviews,
  averageRating,
  positivePercentage,
  sentimentDistribution,
  topThemes,
  criticalAlerts,
  dateRange
}) => {
  return (
    <Card className={...}>
      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  Executive Summary: Review Performance
                </h3>
                {/* ⬆️ UPDATED TITLE */}
                <p className="text-xs text-muted-foreground">
                  High-level insights and key findings
                </p>
                {/* ⬆️ UPDATED SUBTITLE */}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={...}>
            {sentimentHealth.icon}
            {sentimentHealth.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Narrative Overview - KEPT */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-primary/10 mt-0.5">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold mb-2">At a Glance</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {narrative}
              </p>
            </div>
          </div>
        </div>

        {/* ✅ Quick Stats Grid REMOVED - Metrics shown in Executive Summary Cards above */}

        {/* Key Insights - KEPT */}
        {keyInsights.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              <h4 className="text-sm font-semibold">Key Insights</h4>
            </div>
            <div className="space-y-2">
              {keyInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border hover:border-primary/30 transition-colors"
                >
                  {insight.icon}
                  <span className="text-sm flex-1">{insight.text}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical Alerts - KEPT */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h4 className="text-sm font-semibold text-destructive">Critical Alerts</h4>
            </div>
            <div className="space-y-2">
              {criticalAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-destructive">{alert.message}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 hover:bg-destructive/10"
                      >
                        View Details
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### Change Summary

| Change Type | Details |
|-------------|---------|
| **Removed** | Quick Stats Grid (3 metric cards: Sentiment, Rating, Trend) |
| **Updated** | Component title: "Executive Summary" → "Executive Summary: Review Performance" |
| **Updated** | Subtitle: "AI-powered review intelligence" → "High-level insights and key findings" |
| **Kept** | Narrative Overview section |
| **Kept** | Key Insights section |
| **Kept** | Critical Alerts section |
| **Kept** | Sentiment Health Badge |

### Lines to Remove

**Lines 164-218:** Entire "Quick Stats Grid" section including all 3 metric cards

---

## 🔧 Component 2: ReviewIntelligenceSummary.tsx

**File Path:** `src/components/reviews/ReviewIntelligenceSummary.tsx`

### Current Structure (BEFORE)

```tsx
export function ReviewIntelligenceSummary({
  intelligence,
  insights,
  analytics
}: ReviewIntelligenceSummaryProps) {
  const summary = generateSummaryText(intelligence, insights, analytics);
  const ratingImpact = calculatePotentialRatingImpact(insights);
  const satisfactionLevel = getSatisfactionLevel(analytics.positivePercentage);

  return (
    <Card className="border-accent/30 bg-card shadow-md relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 blur-3xl bg-gradient-to-br from-accent to-accent/50 pointer-events-none" />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-accent" />
            <CardTitle className="text-xl">AI Intelligence Summary</CardTitle>
            {/* ⬆️ CHANGE THIS TITLE */}
          </div>
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/30">
            {analytics.totalReviews} reviews analyzed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        {/* Summary Text - KEEP THIS */}
        <div className="prose prose-sm max-w-none">
          <p className="text-base leading-relaxed text-text-secondary">
            {summary}
          </p>
        </div>

        {/* ❌ CHANGE THIS SECTION */}
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-accent/30">
          {/* ❌ REMOVE: User Satisfaction (Line 56-65) */}
          <MetricCard
            icon={<ThumbsUp className="w-5 h-5" />}
            label="User Satisfaction"
            value={`${analytics.positivePercentage}%`}
            trend={satisfactionLevel.trend}
            subtitle={satisfactionLevel.label}
            variant={satisfactionLevel.variant}
          />

          {/* ✅ KEEP: Critical Issues */}
          <MetricCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Critical Issues"
            value={insights.priorityIssues.filter(i => i.urgency === 'immediate' || i.urgency === 'high').length.toString()}
            trend={insights.priorityIssues.length > 3 ? 'down' : insights.priorityIssues.length > 0 ? 'neutral' : 'up'}
            subtitle={insights.priorityIssues.length === 0 ? 'No urgent issues' : 'Require attention'}
            variant={insights.priorityIssues.length > 3 ? 'danger' : insights.priorityIssues.length > 0 ? 'warning' : 'success'}
          />

          {/* ✅ KEEP: Rating Impact Potential */}
          <MetricCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Potential Impact"
            value={`${ratingImpact > 0 ? '+' : ''}${ratingImpact.toFixed(1)}★`}
            trend={ratingImpact > 0.2 ? 'up' : ratingImpact < 0 ? 'down' : 'neutral'}
            subtitle="If key issues resolved"
            variant={ratingImpact > 0.2 ? 'success' : 'neutral'}
          />
        </div>

        {/* Top Themes Preview - KEEP THIS */}
        {intelligence.themes.length > 0 && (
          <div className="pt-4 border-t border-accent/30">
            <p className="text-sm font-medium text-text-secondary mb-2">Top Discussion Themes:</p>
            <div className="flex flex-wrap gap-2">
              {intelligence.themes.slice(0, 5).map((theme, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={...}
                >
                  {theme.theme} ({theme.frequency})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### New Structure (AFTER)

```tsx
export function ReviewIntelligenceSummary({
  intelligence,
  insights,
  analytics
}: ReviewIntelligenceSummaryProps) {
  const summary = generateSummaryText(intelligence, insights, analytics);
  const ratingImpact = calculatePotentialRatingImpact(insights);

  return (
    <Card className="border-accent/30 bg-card shadow-md relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 blur-3xl bg-gradient-to-br from-accent to-accent/50 pointer-events-none" />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-accent" />
            <CardTitle className="text-xl">AI Intelligence: Deep Dive</CardTitle>
            {/* ⬆️ UPDATED TITLE */}
          </div>
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/30">
            {analytics.totalReviews} reviews analyzed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        {/* ✅ NEW: Lightweight summary line */}
        <div className="text-sm text-muted-foreground border-b border-border pb-3 mb-1">
          Analyzing <strong className="text-text-primary font-semibold">{analytics.totalReviews.toLocaleString()}</strong> reviews
          ({analytics.positivePercentage}% positive, {analytics.averageRating.toFixed(1)}★ average)
        </div>

        {/* Summary Text - KEPT */}
        <div className="prose prose-sm max-w-none">
          <p className="text-base leading-relaxed text-text-secondary">
            {summary}
          </p>
        </div>

        {/* ✅ UPDATED: Key Metrics Grid (2 columns instead of 3) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-accent/30">
          {/* ✅ User Satisfaction REMOVED */}

          {/* ✅ KEPT: Critical Issues */}
          <MetricCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Critical Issues"
            value={insights.priorityIssues.filter(i => i.urgency === 'immediate' || i.urgency === 'high').length.toString()}
            trend={insights.priorityIssues.length > 3 ? 'down' : insights.priorityIssues.length > 0 ? 'neutral' : 'up'}
            subtitle={insights.priorityIssues.length === 0 ? 'No urgent issues' : 'Require attention'}
            variant={insights.priorityIssues.length > 3 ? 'danger' : insights.priorityIssues.length > 0 ? 'warning' : 'success'}
          />

          {/* ✅ KEPT: Rating Impact Potential */}
          <MetricCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Potential Impact"
            value={`${ratingImpact > 0 ? '+' : ''}${ratingImpact.toFixed(1)}★`}
            trend={ratingImpact > 0.2 ? 'up' : ratingImpact < 0 ? 'down' : 'neutral'}
            subtitle="If key issues resolved"
            variant={ratingImpact > 0.2 ? 'success' : 'neutral'}
          />
        </div>

        {/* Top Themes Preview - KEPT */}
        {intelligence.themes.length > 0 && (
          <div className="pt-4 border-t border-accent/30">
            <p className="text-sm font-medium text-text-secondary mb-2">Top Discussion Themes:</p>
            <div className="flex flex-wrap gap-2">
              {intelligence.themes.slice(0, 5).map((theme, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={`${
                    theme.sentiment > 0.3 ? 'bg-success/10 border-success/30 text-success' :
                    theme.sentiment < -0.3 ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                    'bg-muted/10 border-muted/30 text-text-tertiary'
                  }`}
                >
                  {theme.theme} ({theme.frequency})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Change Summary

| Change Type | Details |
|-------------|---------|
| **Added** | Lightweight summary line: "Analyzing X reviews (Y% positive, Z★ average)" |
| **Removed** | User Satisfaction MetricCard (duplicate of Positive % in Executive Summary) |
| **Updated** | Component title: "AI Intelligence Summary" → "AI Intelligence: Deep Dive" |
| **Updated** | Grid layout: 3 columns → 2 columns |
| **Removed** | `satisfactionLevel` calculation (no longer needed) |
| **Kept** | AI-generated summary text |
| **Kept** | Critical Issues metric card |
| **Kept** | Potential Impact metric card |
| **Kept** | Top Discussion Themes section |

### Lines to Remove/Modify

- **Line 40:** Update title from "AI Intelligence Summary" to "AI Intelligence: Deep Dive"
- **Lines 47-53:** Add new summary line before summary text
- **Lines 56-65:** Remove User Satisfaction MetricCard
- **Line 56:** Change grid from `grid-cols-1 md:grid-cols-3` to `grid-cols-1 md:grid-cols-2`
- **Line 31:** Remove `satisfactionLevel` calculation (no longer used)

---

## 🔧 Component 3: reviews.tsx (Main Page)

**File Path:** `src/pages/growth-accelerators/reviews.tsx`

### Current Structure (BEFORE)

```tsx
{/* Lines 1687-1793: Executive Summary Cards */}
<div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
  {/* Total Reviews, App Store Rating, Avg Rating, Positive %, Period Total */}
</div>

{/* Lines 1796-1808: Executive Narrative Summary */}
{reviews.length > 0 && reviewIntelligence && actionableInsights && (
  <ExecutiveNarrativeSummary
    appName={selectedApp.name}
    totalReviews={summary.total}
    averageRating={summary.avg}
    positivePercentage={summary.posPct}
    sentimentDistribution={reviewAnalytics.sentimentDistribution}
    topThemes={reviewIntelligence.themes.slice(0, 3)}
    criticalAlerts={actionableInsights.alerts.filter(a => a.severity === 'critical')}
    dateRange={{ start: fromDate, end: toDate }}
  />
)}

{/* ❌ MISSING: Visual separator and section header */}

{/* Lines 1810-1830: AI Intelligence Hub */}
{reviews.length > 0 && reviewIntelligence && actionableInsights && (
  <div className="space-y-6 mt-6">
    {/* AI Summary */}
    <ReviewIntelligenceSummary
      intelligence={reviewIntelligence}
      insights={actionableInsights}
      analytics={reviewAnalytics}
    />
    ...
  </div>
)}
```

### New Structure (AFTER)

```tsx
{/* Lines 1687-1793: Executive Summary Cards - NO CHANGES */}
<div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
  {/* Total Reviews, App Store Rating, Avg Rating, Positive %, Period Total */}
</div>

{/* Lines 1796-1808: Executive Narrative Summary - NO CHANGES TO USAGE */}
{reviews.length > 0 && reviewIntelligence && actionableInsights && (
  <ExecutiveNarrativeSummary
    appName={selectedApp.name}
    totalReviews={summary.total}
    averageRating={summary.avg}
    positivePercentage={summary.posPct}
    sentimentDistribution={reviewAnalytics.sentimentDistribution}
    topThemes={reviewIntelligence.themes.slice(0, 3)}
    criticalAlerts={actionableInsights.alerts.filter(a => a.severity === 'critical')}
    dateRange={{ start: fromDate, end: toDate }}
  />
)}

{/* ✅ NEW: Visual separator and section header */}
{reviews.length > 0 && reviewIntelligence && actionableInsights && (
  <>
    <Separator className="my-8" />
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
          <Brain className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review Intelligence</h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered analysis of sentiment, themes, issues, and opportunities
          </p>
        </div>
      </div>
    </div>
  </>
)}

{/* Lines 1810-1830: AI Intelligence Hub - UPDATED COMMENT */}
{reviews.length > 0 && reviewIntelligence && actionableInsights && (
  <div className="space-y-6">
    {/* AI Intelligence Deep Dive */}
    <ReviewIntelligenceSummary
      intelligence={reviewIntelligence}
      insights={actionableInsights}
      analytics={reviewAnalytics}
    />

    {/* Product Friction & Strengths */}
    <ProductFrictionStrengths
      issuePatterns={reviewIntelligence.issuePatterns}
      featureMentions={reviewIntelligence.featureMentions}
      totalReviews={reviews.length}
    />

    {/* AI Recommendations */}
    <AIRecommendationsPanel insights={actionableInsights} />
  </div>
)}
```

### Change Summary

| Change Type | Details |
|-------------|---------|
| **Added** | Visual separator (`<Separator />`) between Executive and Intelligence sections |
| **Added** | Section header: "Review Intelligence" with Brain icon |
| **Added** | Section description: "AI-powered analysis of sentiment, themes, issues, and opportunities" |
| **Updated** | Comment: "AI Intelligence Hub" → "AI Intelligence Deep Dive" |
| **Removed** | `mt-6` from intelligence hub div (replaced with proper section header) |

### Lines to Add

**After line 1808 (after ExecutiveNarrativeSummary):**

```tsx
{/* Visual separator and section header */}
{reviews.length > 0 && reviewIntelligence && actionableInsights && (
  <>
    <Separator className="my-8" />
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
          <Brain className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review Intelligence</h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered analysis of sentiment, themes, issues, and opportunities
          </p>
        </div>
      </div>
    </div>
  </>
)}
```

**Update line 1810 comment:**
```tsx
// OLD:
{/* AI Intelligence Hub - ALWAYS visible when reviews loaded */}

// NEW:
{/* AI Intelligence Deep Dive */}
```

**Update line 1812 - remove `mt-6` class:**
```tsx
// OLD:
<div className="space-y-6 mt-6">

// NEW:
<div className="space-y-6">
```

---

## 📦 Import Statement Verification

### ExecutiveNarrativeSummary.tsx

**No import changes needed.** All imports already present:

```tsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Smile,
  Frown,
  AlertTriangle,
  Star,        // ❌ Can be removed (no longer used after removing Quick Stats)
  MessageSquare,
  ArrowRight,
  Lightbulb,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
```

**Optional cleanup:** Remove unused `Star` import after refactor.

### ReviewIntelligenceSummary.tsx

**No import changes needed.** All imports already present:

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, Minus, AlertCircle, ThumbsUp } from 'lucide-react';
import type { ReviewIntelligence, ActionableInsights, ReviewAnalytics } from '@/types/review-intelligence.types';
```

**Optional cleanup:** Remove unused `ThumbsUp` import after refactor (was used in removed User Satisfaction card).

### reviews.tsx

**Verify `Separator` import exists:**

```tsx
import { Separator } from '@/components/ui/separator';
```

✅ Already present at line 27.

---

## 🧪 Testing Checklist

### Visual Verification

```
[ ] ExecutiveNarrativeSummary no longer shows 3 metric cards (Sentiment/Rating/Trend)
[ ] ExecutiveNarrativeSummary title reads "Executive Summary: Review Performance"
[ ] ReviewIntelligenceSummary shows summary line: "Analyzing X reviews..."
[ ] ReviewIntelligenceSummary shows only 2 metric cards (Critical Issues + Potential Impact)
[ ] ReviewIntelligenceSummary title reads "AI Intelligence: Deep Dive"
[ ] Clear visual separator between Executive and Intelligence sections
[ ] Section header "Review Intelligence" displays with Brain icon
[ ] No duplicate Positive % metric shown
[ ] No duplicate narrative text shown
```

### Functional Verification

```
[ ] All TypeScript compilation succeeds
[ ] No console errors in browser
[ ] Date range filtering still works
[ ] Sentiment filtering still works
[ ] All metrics calculate correctly
[ ] Theme Analysis page still receives correct data
[ ] Dark mode renders correctly
[ ] Mobile responsive layout intact
[ ] Tablet responsive layout intact
```

### Data Flow Verification

```
[ ] filteredReviews prop flows correctly to all components
[ ] reviewIntelligence data structure unchanged
[ ] actionableInsights data structure unchanged
[ ] reviewAnalytics calculations unchanged
[ ] No TypeScript errors for removed props
```

---

## 🔄 Git Workflow

### Step 1: Verify Branch

```bash
git branch --show-current
# Should output: claude/review-management-refactor-011CV2bHw1zWunNvvtFByTfm
```

### Step 2: Create Backup

```bash
# Create backup branch before making changes
git checkout -b backup/review-management-before-refactor
git checkout claude/review-management-refactor-011CV2bHw1zWunNvvtFByTfm
```

### Step 3: Make Changes

Edit the 3 files as outlined above.

### Step 4: Test Locally

```bash
npm run dev
# Test in browser thoroughly
```

### Step 5: Commit

```bash
git add src/components/reviews/narrative/ExecutiveNarrativeSummary.tsx
git add src/components/reviews/ReviewIntelligenceSummary.tsx
git add src/pages/growth-accelerators/reviews.tsx

git commit -m "refactor: Eliminate duplicate metrics in Review Management

Component Changes:
- ExecutiveNarrativeSummary: Remove Quick Stats Grid (Sentiment/Rating/Trend)
- ReviewIntelligenceSummary: Remove User Satisfaction card, add summary line
- reviews.tsx: Add section header and visual separator

Benefits:
- Clearer information hierarchy
- No duplicate metrics
- Better visual separation between story and diagnostic layers
- Improved user experience

Files modified: 3
Breaking changes: None
Test coverage: Manual testing completed"
```

### Step 6: Push

```bash
git push -u origin claude/review-management-refactor-011CV2bHw1zWunNvvtFByTfm
```

---

## 📸 Visual Comparison Guide

### BEFORE: Duplication Issue

```
┌─────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY CARDS (5 metrics)       │
│  [Total] [App Store] [Avg★] [Pos%] [Period]│
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  EXECUTIVE NARRATIVE SUMMARY                │
│  ├─ Narrative text                          │
│  ├─ [Sentiment %] [Rating] [Trend] ← DUPE! │
│  ├─ Key Insights                            │
│  └─ Critical Alerts                         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  AI INTELLIGENCE SUMMARY                    │
│  ├─ Summary text                            │
│  ├─ [User Satisfaction] ← DUPE!             │
│  ├─ [Critical Issues]                       │
│  ├─ [Potential Impact]                      │
│  └─ Top Themes                              │
└─────────────────────────────────────────────┘
```

**Issues:**
- Positive % shown twice (Executive Cards + Executive Narrative)
- Rating shown twice (Executive Cards + Executive Narrative)
- Sentiment shown twice (Executive Cards + AI Intelligence as "User Satisfaction")

### AFTER: Clean Hierarchy

```
┌─────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY CARDS (5 metrics)       │
│  [Total] [App Store] [Avg★] [Pos%] [Period]│
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY: REVIEW PERFORMANCE      │
│  ├─ Narrative text                          │
│  ├─ Key Insights ✅                         │
│  └─ Critical Alerts ✅                      │
└─────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REVIEW INTELLIGENCE
AI-powered analysis of sentiment, themes...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────┐
│  AI INTELLIGENCE: DEEP DIVE                 │
│  ├─ "Analyzing 50 reviews (88% pos, 4.5★)" │
│  ├─ Summary text                            │
│  ├─ [Critical Issues] ✅                    │
│  ├─ [Potential Impact] ✅                   │
│  └─ Top Themes                              │
└─────────────────────────────────────────────┘
```

**Improvements:**
- ✅ No duplicate metrics
- ✅ Clear visual separation
- ✅ Lightweight summary line provides context
- ✅ Each section has distinct purpose

---

## 📚 Quick Reference: What Changes?

| Component | What's Removed | What's Added | What's Kept |
|-----------|---------------|--------------|-------------|
| **ExecutiveNarrativeSummary** | Quick Stats Grid (3 cards) | Updated title + subtitle | Narrative, Key Insights, Critical Alerts |
| **ReviewIntelligenceSummary** | User Satisfaction card | Summary line, updated title | AI text, Critical Issues, Potential Impact, Themes |
| **reviews.tsx** | Nothing | Section header + separator | All existing functionality |

---

**Document Version:** 1.0
**Last Updated:** 2025-11-11
**Status:** Ready for Implementation
