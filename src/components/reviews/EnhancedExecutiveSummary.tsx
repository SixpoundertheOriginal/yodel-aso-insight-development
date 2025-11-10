import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompetitiveIntelligence } from '@/services/competitor-review-intelligence.service';

interface EnhancedExecutiveSummaryProps {
  intelligence: CompetitiveIntelligence;
}

export const EnhancedExecutiveSummary: React.FC<EnhancedExecutiveSummaryProps> = ({
  intelligence
}) => {
  const { summary, metrics } = intelligence;

  // Calculate deltas
  const ratingDelta = ((metrics.avgRating.yours - metrics.avgRating.average) / metrics.avgRating.average) * 100;
  const sentimentDelta = ((metrics.positiveSentiment.yours - metrics.positiveSentiment.average) / metrics.positiveSentiment.average) * 100;

  // Position badge styling
  const positionStyles = {
    leading: 'bg-green-500/10 text-green-500 border-green-500/50',
    competitive: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
    lagging: 'bg-red-500/10 text-red-500 border-red-500/50'
  };

  const positionIcon = {
    leading: TrendingUp,
    competitive: Minus,
    lagging: TrendingDown
  };

  const PositionIcon = positionIcon[summary.overallPosition];

  return (
    <Card className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-5 blur-3xl bg-gradient-to-br from-orange-500 to-red-600" />

      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold">AI Executive Summary</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Competitive intelligence powered by review analysis
            </p>
          </div>

          <Badge className={cn("text-xs font-bold flex items-center gap-1", positionStyles[summary.overallPosition])}>
            <PositionIcon className="h-3 w-3" />
            {summary.overallPosition.toUpperCase()}
          </Badge>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          {/* Rating Delta */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">Rating Gap</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {metrics.avgRating.yours.toFixed(1)}★
              </span>
              <span className="text-sm text-muted-foreground">
                vs {metrics.avgRating.average.toFixed(1)}★
              </span>
            </div>
            <div className={cn(
              "text-xs font-medium flex items-center gap-1",
              ratingDelta > 0 ? "text-green-500" : "text-red-500"
            )}>
              {ratingDelta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {ratingDelta > 0 ? '+' : ''}{ratingDelta.toFixed(1)}%
            </div>
          </div>

          {/* Sentiment Delta */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">Sentiment Gap</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {(metrics.positiveSentiment.yours * 100).toFixed(0)}%
              </span>
              <span className="text-sm text-muted-foreground">
                vs {(metrics.positiveSentiment.average * 100).toFixed(0)}%
              </span>
            </div>
            <div className={cn(
              "text-xs font-medium flex items-center gap-1",
              sentimentDelta > 0 ? "text-green-500" : "text-red-500"
            )}>
              {sentimentDelta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {sentimentDelta > 0 ? '+' : ''}{sentimentDelta.toFixed(1)}%
            </div>
          </div>

          {/* Top Gap */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">Top Missing Feature</div>
            <div className="text-sm font-semibold truncate">
              {intelligence.featureGaps[0]?.feature || 'None identified'}
            </div>
            {intelligence.featureGaps[0] && (
              <Badge variant="outline" className="text-xs">
                {intelligence.featureGaps[0].userDemand.toUpperCase()} DEMAND
              </Badge>
            )}
          </div>
        </div>

        {/* AI Insight */}
        <Alert className="bg-orange-500/5 border-orange-500/20">
          <Sparkles className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-sm">
            <strong>AI Insight:</strong> {summary.keyInsight}
          </AlertDescription>
        </Alert>

        {/* Top Priority */}
        <div className="pt-2 border-t">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertTriangle className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Top Priority Action
              </div>
              <div className="text-sm font-medium">
                {summary.topPriority}
              </div>
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>Confidence Score: {(summary.confidenceScore * 100).toFixed(0)}%</span>
          <span className="text-xs">
            Based on {intelligence.primaryApp.reviews.length + intelligence.competitors.reduce((sum, c) => sum + c.reviews.length, 0)} reviews
          </span>
        </div>
      </div>
    </Card>
  );
};
