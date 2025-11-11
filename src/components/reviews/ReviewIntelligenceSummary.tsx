/**
 * REVIEW INTELLIGENCE SUMMARY COMPONENT
 *
 * Displays AI-generated summary of review intelligence with key metrics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, Minus, AlertCircle, ThumbsUp } from 'lucide-react';
import type { ReviewIntelligence, ActionableInsights, ReviewAnalytics } from '@/types/review-intelligence.types';

interface ReviewIntelligenceSummaryProps {
  intelligence: ReviewIntelligence;
  insights: ActionableInsights;
  analytics: ReviewAnalytics;
}

export function ReviewIntelligenceSummary({
  intelligence,
  insights,
  analytics
}: ReviewIntelligenceSummaryProps) {
  // Generate AI summary text
  const summary = generateSummaryText(intelligence, insights, analytics);

  // Calculate rating impact potential
  const ratingImpact = calculatePotentialRatingImpact(insights);

  return (
    <Card className="border-accent/30 bg-card shadow-md relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 blur-3xl bg-gradient-to-br from-accent to-accent/50 pointer-events-none" />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-accent" />
            <CardTitle className="text-xl">AI Intelligence: Deep Dive</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/30">
            {analytics.totalReviews} reviews analyzed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        {/* Lightweight summary line */}
        <div className="text-sm text-muted-foreground border-b border-border pb-3 mb-1">
          Analyzing <strong className="text-text-primary font-semibold">{analytics.totalReviews.toLocaleString()}</strong> reviews
          ({analytics.positivePercentage}% positive, {analytics.averageRating.toFixed(1)}★ average)
        </div>

        {/* Summary Text */}
        <div className="prose prose-sm max-w-none">
          <p className="text-base leading-relaxed text-text-secondary">
            {summary}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-accent/30">
          {/* Critical Issues */}
          <MetricCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Critical Issues"
            value={insights.priorityIssues.filter(i => i.urgency === 'immediate' || i.urgency === 'high').length.toString()}
            trend={insights.priorityIssues.length > 3 ? 'down' : insights.priorityIssues.length > 0 ? 'neutral' : 'up'}
            subtitle={insights.priorityIssues.length === 0 ? 'No urgent issues' : 'Require attention'}
            variant={insights.priorityIssues.length > 3 ? 'danger' : insights.priorityIssues.length > 0 ? 'warning' : 'success'}
          />

          {/* Rating Impact Potential */}
          <MetricCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Potential Impact"
            value={`${ratingImpact > 0 ? '+' : ''}${ratingImpact.toFixed(1)}★`}
            trend={ratingImpact > 0.2 ? 'up' : ratingImpact < 0 ? 'down' : 'neutral'}
            subtitle="If key issues resolved"
            variant={ratingImpact > 0.2 ? 'success' : 'neutral'}
          />
        </div>

        {/* Top Themes Preview */}
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

// Helper Components

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle: string;
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
}

function MetricCard({ icon, label, value, trend, subtitle, variant = 'neutral' }: MetricCardProps) {
  const variantStyles = {
    success: 'bg-success/10 border-success/30 text-success',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    danger: 'bg-destructive/10 border-destructive/30 text-destructive',
    neutral: 'bg-card border-border text-text-secondary'
  };

  const iconColor = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    neutral: 'text-text-tertiary'
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={`p-4 rounded-lg border ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={iconColor[variant]}>
          {icon}
        </div>
        {trend && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-1">{label}</div>
      <div className="text-xs opacity-75 mt-1">{subtitle}</div>
    </div>
  );
}

// Helper Functions

function generateSummaryText(
  intelligence: ReviewIntelligence,
  insights: ActionableInsights,
  analytics: ReviewAnalytics
): string {
  const satisfaction = analytics.positivePercentage;

  // Top issues (up to 3)
  const topIssues = intelligence.issuePatterns
    .slice(0, 3)
    .map(i => i.issue)
    .join(', ');

  // Top strengths (positive feature mentions)
  const topStrengths = intelligence.featureMentions
    .filter(f => f.sentiment > 0.5)
    .slice(0, 2)
    .map(f => f.feature)
    .join(' and ');

  // Calculate potential impact
  const criticalIssues = insights.priorityIssues.filter(i => i.urgency === 'immediate' || i.urgency === 'high').length;
  const totalImpact = insights.priorityIssues.reduce((sum, issue) => sum + (issue.impact || 0), 0);
  const avgCurrentRating = analytics.averageRating;
  const potentialRating = avgCurrentRating + Math.min(totalImpact * 0.5, 1.0);

  // Build summary
  let summary = `User satisfaction is ${satisfaction >= 75 ? 'high' : satisfaction >= 50 ? 'moderate' : 'concerning'} at ${satisfaction}% positive. `;

  if (topIssues) {
    summary += `The most common issues are ${topIssues}. `;
  } else {
    summary += `No significant issues detected. `;
  }

  if (topStrengths) {
    summary += `Users particularly appreciate ${topStrengths}. `;
  }

  if (criticalIssues > 0 && totalImpact > 0.1) {
    summary += `Addressing ${criticalIssues} critical issue${criticalIssues > 1 ? 's' : ''} could improve the app rating from ${avgCurrentRating.toFixed(1)}★ to ${potentialRating.toFixed(1)}★.`;
  } else if (satisfaction >= 80) {
    summary += `The app is performing well with strong user sentiment.`;
  } else {
    summary += `Focus on improving ${topIssues ? 'these key areas' : 'user experience'} to boost ratings.`;
  }

  return summary;
}

function calculatePotentialRatingImpact(insights: ActionableInsights): number {
  // Calculate potential rating gain if priority issues are fixed
  const totalImpact = insights.priorityIssues.reduce((sum, issue) => {
    const urgencyWeight = {
      immediate: 0.4,
      high: 0.3,
      medium: 0.2,
      low: 0.1
    };
    return sum + (issue.impact || 0) * (urgencyWeight[issue.urgency] || 0.1);
  }, 0);

  // Cap at +1.0 star maximum improvement
  return Math.min(totalImpact, 1.0);
}

function getSatisfactionLevel(positivePercentage: number): {
  label: string;
  trend: 'up' | 'down' | 'neutral';
  variant: 'success' | 'warning' | 'danger' | 'neutral';
} {
  if (positivePercentage >= 80) {
    return { label: 'Excellent', trend: 'up', variant: 'success' };
  } else if (positivePercentage >= 65) {
    return { label: 'Good', trend: 'up', variant: 'success' };
  } else if (positivePercentage >= 50) {
    return { label: 'Average', trend: 'neutral', variant: 'warning' };
  } else if (positivePercentage >= 35) {
    return { label: 'Below Average', trend: 'down', variant: 'warning' };
  } else {
    return { label: 'Poor', trend: 'down', variant: 'danger' };
  }
}
