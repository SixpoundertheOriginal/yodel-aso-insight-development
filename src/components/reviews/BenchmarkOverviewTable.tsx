import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, TrendingUp, Smile, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompetitiveIntelligence } from '@/services/competitor-review-intelligence.service';

interface BenchmarkOverviewTableProps {
  intelligence: CompetitiveIntelligence;
}

export const BenchmarkOverviewTable: React.FC<BenchmarkOverviewTableProps> = ({
  intelligence
}) => {
  const { metrics, primaryApp, competitors } = intelligence;

  // Calculate total reviews
  const yourReviews = primaryApp.reviews.length;
  const competitorReviews = competitors.map(c => c.reviews.length);
  const avgCompetitorReviews = competitorReviews.reduce((a, b) => a + b, 0) / competitors.length;
  const topCompetitorReviews = Math.max(...competitorReviews);

  const benchmarks = [
    {
      metric: 'Avg Rating',
      icon: Star,
      yourValue: metrics.avgRating.yours.toFixed(1),
      competitorAvg: metrics.avgRating.average.toFixed(1),
      topCompetitor: Math.max(...metrics.avgRating.competitors).toFixed(1),
      delta: ((metrics.avgRating.yours - metrics.avgRating.average) / metrics.avgRating.average) * 100,
      unit: '★',
      direction: 'higher_better' as const,
    },
    {
      metric: 'Total Reviews',
      icon: MessageSquare,
      yourValue: yourReviews.toLocaleString(),
      competitorAvg: Math.round(avgCompetitorReviews).toLocaleString(),
      topCompetitor: topCompetitorReviews.toLocaleString(),
      delta: ((yourReviews - avgCompetitorReviews) / avgCompetitorReviews) * 100,
      unit: '',
      direction: 'higher_better' as const,
    },
    {
      metric: 'Positive Sentiment',
      icon: Smile,
      yourValue: (metrics.positiveSentiment.yours * 100).toFixed(0) + '%',
      competitorAvg: (metrics.positiveSentiment.average * 100).toFixed(0) + '%',
      topCompetitor: (Math.max(...metrics.positiveSentiment.competitors) * 100).toFixed(0) + '%',
      delta: ((metrics.positiveSentiment.yours - metrics.positiveSentiment.average) / metrics.positiveSentiment.average) * 100,
      unit: '',
      direction: 'higher_better' as const,
    },
    {
      metric: 'Issue Rate',
      icon: AlertTriangle,
      yourValue: metrics.issueFrequency.yours.toFixed(1) + '%',
      competitorAvg: metrics.issueFrequency.average.toFixed(1) + '%',
      topCompetitor: Math.min(...metrics.issueFrequency.competitors).toFixed(1) + '%',
      delta: ((metrics.issueFrequency.yours - metrics.issueFrequency.average) / metrics.issueFrequency.average) * 100,
      unit: '',
      direction: 'lower_better' as const,
    },
  ];

  const getDeltaColor = (delta: number, direction: 'higher_better' | 'lower_better') => {
    const isGood = direction === 'higher_better' ? delta > 0 : delta < 0;
    return isGood ? 'text-green-500' : 'text-red-500';
  };

  const getDeltaStatus = (delta: number, direction: 'higher_better' | 'lower_better') => {
    const isGood = direction === 'higher_better' ? delta > 0 : delta < 0;
    if (Math.abs(delta) > 20) return isGood ? 'excellent' : 'poor';
    if (Math.abs(delta) > 10) return isGood ? 'good' : 'bad';
    return 'neutral';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Benchmark Overview</h3>
          <p className="text-xs text-muted-foreground">
            Your app vs {competitors.length} competitor{competitors.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                Metric
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Your App
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Comp Avg
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Top Comp
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((benchmark, idx) => {
              const Icon = benchmark.icon;
              const deltaColor = getDeltaColor(benchmark.delta, benchmark.direction);
              const status = getDeltaStatus(benchmark.delta, benchmark.direction);

              return (
                <tr
                  key={idx}
                  className={cn(
                    "border-b last:border-b-0 hover:bg-muted/30 transition-colors",
                    status === 'excellent' && "bg-green-500/5",
                    status === 'poor' && "bg-red-500/5"
                  )}
                >
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{benchmark.metric}</span>
                    </div>
                  </td>
                  <td className="text-right py-4 px-2">
                    <span className="text-sm font-bold">{benchmark.yourValue}</span>
                  </td>
                  <td className="text-right py-4 px-2">
                    <span className="text-sm text-muted-foreground">{benchmark.competitorAvg}</span>
                  </td>
                  <td className="text-right py-4 px-2">
                    <span className="text-sm text-muted-foreground">{benchmark.topCompetitor}</span>
                  </td>
                  <td className="text-right py-4 px-2">
                    <Badge variant="outline" className={cn("text-xs font-bold", deltaColor)}>
                      {benchmark.delta > 0 ? '+' : ''}{benchmark.delta.toFixed(0)}%
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Legend: <span className="text-green-500">Green</span> = Better | <span className="text-red-500">Red</span> = Worse
          </span>
          <span>
            Based on latest review analysis
          </span>
        </div>
      </div>
    </Card>
  );
};
