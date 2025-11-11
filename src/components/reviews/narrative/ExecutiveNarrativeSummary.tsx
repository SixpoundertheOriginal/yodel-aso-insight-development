/**
 * EXECUTIVE NARRATIVE SUMMARY
 *
 * Narrative-driven executive summary for review analysis
 * Replaces static metrics with actionable insights and storytelling
 */

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
  Star,
  MessageSquare,
  ArrowRight,
  Lightbulb,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutiveNarrativeSummaryProps {
  appName: string;
  totalReviews: number;
  averageRating: number;
  positivePercentage: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topThemes: Array<{
    theme: string;
    frequency: number;
    sentiment: number;
    trending: 'up' | 'down' | 'stable';
  }>;
  criticalAlerts: Array<{
    type: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
  }>;
  dateRange?: { start: string; end: string };
}

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

  // Generate narrative text
  const narrative = useMemo(() => {
    const period = calculatePeriod(dateRange);
    const sentimentTrend = calculateSentimentTrend(positivePercentage);
    const dominantEmotion = getDominantEmotion(positivePercentage);

    return `Your app ${appName} has received ${totalReviews.toLocaleString()} reviews ${period}. ${positivePercentage}% of users express ${dominantEmotion} sentiment, with an average rating of ${averageRating.toFixed(2)}/5.0. ${sentimentTrend}`;
  }, [appName, totalReviews, positivePercentage, averageRating, dateRange]);

  // Key insights from themes
  const keyInsights = useMemo(() => {
    const insights: { icon: React.ReactNode; text: string; type: 'positive' | 'negative' | 'neutral' }[] = [];

    // Find top positive theme
    const positiveTheme = topThemes.find(t => t.sentiment >= 4);
    if (positiveTheme) {
      insights.push({
        icon: <Smile className="h-4 w-4 text-success" />,
        text: `Users love: ${positiveTheme.theme}`,
        type: 'positive'
      });
    }

    // Find top negative theme
    const negativeTheme = topThemes.find(t => t.sentiment <= 2);
    if (negativeTheme) {
      insights.push({
        icon: <Frown className="h-4 w-4 text-destructive" />,
        text: `Users struggle with: ${negativeTheme.theme}`,
        type: 'negative'
      });
    }

    // Find trending theme
    const trendingUpTheme = topThemes.find(t => t.trending === 'up');
    if (trendingUpTheme) {
      insights.push({
        icon: <TrendingUp className="h-4 w-4 text-primary" />,
        text: `Trending topic: ${trendingUpTheme.theme}`,
        type: 'neutral'
      });
    }

    return insights;
  }, [topThemes]);

  // Sentiment health indicator
  const sentimentHealth = getSentimentHealth(positivePercentage);

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      "hover:shadow-lg",
      "bg-gradient-to-br from-card/95 via-card to-primary/5",
      "border-primary/20"
    )}>
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-5 blur-3xl bg-gradient-to-br from-primary to-accent pointer-events-none" />

      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Executive Summary</h3>
                <p className="text-xs text-muted-foreground">AI-powered review intelligence</p>
              </div>
            </div>
          </div>

          {/* Sentiment Health Badge */}
          <Badge
            variant="outline"
            className={cn(
              "px-3 py-1.5 flex items-center gap-2 text-sm font-semibold",
              sentimentHealth.className
            )}
          >
            {sentimentHealth.icon}
            {sentimentHealth.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Narrative Overview */}
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

        {/* Key Insights */}
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

        {/* Critical Alerts */}
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

// Helper functions
function calculatePeriod(dateRange?: { start: string; end: string }): string {
  if (!dateRange || !dateRange.start || !dateRange.end) {
    return 'in total';
  }

  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return 'in the past week';
  if (diffDays <= 30) return 'in the past month';
  if (diffDays <= 90) return 'in the past quarter';
  if (diffDays <= 365) return 'in the past year';
  return `over the past ${Math.floor(diffDays / 30)} months`;
}

function calculateSentimentTrend(positivePercentage: number): string {
  if (positivePercentage >= 80) {
    return 'Your app is performing exceptionally well with strong user satisfaction.';
  } else if (positivePercentage >= 70) {
    return 'User sentiment is generally positive with room for improvement.';
  } else if (positivePercentage >= 50) {
    return 'Sentiment is mixed - addressing key issues could significantly improve ratings.';
  } else {
    return 'User sentiment requires immediate attention to prevent further decline.';
  }
}

function getDominantEmotion(positivePercentage: number): string {
  if (positivePercentage >= 80) return 'highly positive';
  if (positivePercentage >= 70) return 'positive';
  if (positivePercentage >= 50) return 'mixed';
  if (positivePercentage >= 30) return 'concerned';
  return 'frustrated';
}

function getSentimentHealth(positivePercentage: number): {
  label: string;
  icon: React.ReactNode;
  className: string;
} {
  if (positivePercentage >= 80) {
    return {
      label: 'Excellent',
      icon: <Smile className="h-4 w-4" />,
      className: 'border-success/50 text-success bg-success/10'
    };
  } else if (positivePercentage >= 70) {
    return {
      label: 'Good',
      icon: <TrendingUp className="h-4 w-4" />,
      className: 'border-primary/50 text-primary bg-primary/10'
    };
  } else if (positivePercentage >= 50) {
    return {
      label: 'Fair',
      icon: <TrendingDown className="h-4 w-4" />,
      className: 'border-warning/50 text-warning bg-warning/10'
    };
  } else {
    return {
      label: 'Critical',
      icon: <AlertTriangle className="h-4 w-4" />,
      className: 'border-destructive/50 text-destructive bg-destructive/10'
    };
  }
}
