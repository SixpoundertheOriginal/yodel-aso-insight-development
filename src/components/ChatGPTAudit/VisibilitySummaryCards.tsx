import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Trophy, Users, Minus } from 'lucide-react';

interface QueryResult {
  id: string;
  app_mentioned: boolean;
  mention_position?: number;
  competitors_mentioned: string[];
  visibility_score: number;
  sentiment_score: number;
  created_at: string;
}

interface SummaryStats {
  mentionRate: number;
  avgPosition: number;
  topCompetitor: string;
  trendDirection: 'up' | 'down' | 'stable';
  totalQueries: number;
  mentionedQueries: number;
  avgVisibilityScore: number;
  competitorCount: number;
}

interface VisibilitySummaryCardsProps {
  queryResults: QueryResult[];
  isLoading?: boolean;
}

export const VisibilitySummaryCards: React.FC<VisibilitySummaryCardsProps> = ({
  queryResults,
  isLoading = false
}) => {
  const calculateSummaryStats = (results: QueryResult[]): SummaryStats => {
    if (!results || results.length === 0) {
      return {
        mentionRate: 0,
        avgPosition: 0,
        topCompetitor: 'None',
        trendDirection: 'stable',
        totalQueries: 0,
        mentionedQueries: 0,
        avgVisibilityScore: 0,
        competitorCount: 0
      };
    }

    const mentionedResults = results.filter(r => r.app_mentioned);
    const mentionRate = (mentionedResults.length / results.length) * 100;
    
    // Calculate average position for mentioned results only
    const positionsWithValues = mentionedResults
      .filter(r => r.mention_position && r.mention_position > 0)
      .map(r => r.mention_position!);
    const avgPosition = positionsWithValues.length > 0 
      ? positionsWithValues.reduce((sum, pos) => sum + pos, 0) / positionsWithValues.length
      : 0;

    // Extract and count all competitors
    const allCompetitors = results.flatMap(r => r.competitors_mentioned || []);
    const competitorCounts = allCompetitors.reduce((acc, competitor) => {
      acc[competitor] = (acc[competitor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCompetitor = Object.keys(competitorCounts).length > 0
      ? Object.entries(competitorCounts).sort((a, b) => b[1] - a[1])[0][0]
      : 'None';

    // Calculate average visibility score
    const avgVisibilityScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.visibility_score, 0) / results.length)
      : 0;

    return {
      mentionRate: Math.round(mentionRate * 10) / 10,
      avgPosition: Math.round(avgPosition * 10) / 10,
      topCompetitor,
      trendDirection: 'stable', // TODO: Compare with previous audit when available
      totalQueries: results.length,
      mentionedQueries: mentionedResults.length,
      avgVisibilityScore,
      competitorCount: Object.keys(competitorCounts).length
    };
  };

  const stats = calculateSummaryStats(queryResults);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-400" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getMentionRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-400';
    if (rate >= 50) return 'text-yellow-400';
    if (rate >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
              <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-muted rounded w-12 mb-1 animate-pulse"></div>
              <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Mention Rate */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Mention Rate
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getMentionRateColor(stats.mentionRate)}`}>
            {stats.mentionRate}%
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.mentionedQueries} of {stats.totalQueries} queries
          </p>
        </CardContent>
      </Card>

      {/* Average Position */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Position
          </CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {stats.avgPosition > 0 ? `#${stats.avgPosition}` : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            when mentioned
          </p>
        </CardContent>
      </Card>

      {/* Top Competitor */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top Competitor
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground truncate">
            {stats.topCompetitor}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.competitorCount} total competitors
          </p>
        </CardContent>
      </Card>

      {/* Visibility Score */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Visibility
          </CardTitle>
          {getTrendIcon(stats.trendDirection)}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getScoreColor(stats.avgVisibilityScore)}`}>
            {stats.avgVisibilityScore}
          </div>
          <p className="text-xs text-muted-foreground">
            overall score
          </p>
        </CardContent>
      </Card>
    </div>
  );
};