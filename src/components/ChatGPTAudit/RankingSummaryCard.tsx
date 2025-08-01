import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp, Users } from 'lucide-react';

interface RankingSummaryCardProps {
  entityName: string;
  auditResults: Array<{
    id: string;
    query_text: string;
    ranking_context?: {
      position?: number;
      total_entities?: number;
      ranking_type?: string;
      competitors?: string[];
    };
    mention_position?: number;
    visibility_score?: number;
  }>;
}

interface RankingSummary {
  totalRankings: number;
  bestRanking?: number;
  averageRanking?: number;
  topThreeCount: number;
  totalCompetitors: number;
  trendDirection: 'up' | 'down' | 'stable' | 'unknown';
}

export const RankingSummaryCard: React.FC<RankingSummaryCardProps> = ({
  entityName,
  auditResults
}) => {
  const calculateRankingSummary = (): RankingSummary => {
    const rankedResults = auditResults.filter(result => 
      result.ranking_context?.position || result.mention_position
    );

    if (rankedResults.length === 0) {
      return {
        totalRankings: 0,
        topThreeCount: 0,
        totalCompetitors: 0,
        trendDirection: 'unknown'
      };
    }

    const positions = rankedResults.map(result => 
      result.ranking_context?.position || result.mention_position || 0
    ).filter(pos => pos > 0);

    const bestRanking = Math.min(...positions);
    const averageRanking = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    const topThreeCount = positions.filter(pos => pos <= 3).length;
    
    // Count unique competitors across all results
    const allCompetitors = new Set<string>();
    rankedResults.forEach(result => {
      if (result.ranking_context?.competitors) {
        result.ranking_context.competitors.forEach(comp => allCompetitors.add(comp));
      }
    });

    // Simple trend calculation (could be enhanced with historical data)
    const visibilityScores = auditResults
      .map(r => r.visibility_score || 0)
      .filter(score => score > 0);
    
    let trendDirection: 'up' | 'down' | 'stable' | 'unknown' = 'unknown';
    if (visibilityScores.length >= 2) {
      const firstHalf = visibilityScores.slice(0, Math.floor(visibilityScores.length / 2));
      const secondHalf = visibilityScores.slice(Math.floor(visibilityScores.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg + 5) {
        trendDirection = 'up';
      } else if (firstAvg > secondAvg + 5) {
        trendDirection = 'down';
      } else {
        trendDirection = 'stable';
      }
    }

    return {
      totalRankings: rankedResults.length,
      bestRanking,
      averageRanking,
      topThreeCount,
      totalCompetitors: allCompetitors.size,
      trendDirection
    };
  };

  const summary = calculateRankingSummary();

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      case 'stable':
        return <div className="h-4 w-4 border-b-2 border-yellow-500" />;
      default:
        return <div className="h-4 w-4 border border-gray-400 rounded-full" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      case 'stable':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  if (summary.totalRankings === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-blue-400" />
            <span>Ranking Summary</span>
            <Badge variant="outline">No Rankings</Badge>
          </CardTitle>
          <CardDescription>
            Competitive positioning for "{entityName}"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Medal className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              No clear rankings detected in the responses.
            </p>
            <p className="text-xs mt-1">
              Try queries that typically produce ranked lists or top recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-blue-400" />
          <span>Ranking Summary</span>
          <Badge variant="secondary">{summary.totalRankings} rankings</Badge>
        </CardTitle>
        <CardDescription>
          Competitive positioning for "{entityName}"
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Ranking Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary flex items-center justify-center space-x-1">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span>#{summary.bestRanking}</span>
            </div>
            <div className="text-xs text-muted-foreground">Best Ranking</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">#{Math.round(summary.averageRanking || 0)}</div>
            <div className="text-xs text-muted-foreground">Average Ranking</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary flex items-center justify-center space-x-1">
              <Award className="h-5 w-5 text-yellow-500" />
              <span>{summary.topThreeCount}</span>
            </div>
            <div className="text-xs text-muted-foreground">Top 3 Positions</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary flex items-center justify-center space-x-1">
              <Users className="h-5 w-5 text-blue-400" />
              <span>{summary.totalCompetitors}</span>
            </div>
            <div className="text-xs text-muted-foreground">Unique Competitors</div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-primary flex items-center space-x-2">
            <Medal className="h-4 w-4" />
            <span>Performance Overview</span>
          </h4>
          <div className="p-4 bg-background/50 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Competitive Positioning</span>
              <div className={`flex items-center space-x-1 ${getTrendColor(summary.trendDirection)}`}>
                {getTrendIcon(summary.trendDirection)}
                <span className="text-xs capitalize">{summary.trendDirection}</span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-foreground">
              <p>
                <span className="font-medium">"{entityName}"</span> achieved rankings in{' '}
                <span className="font-medium text-primary">{summary.totalRankings}</span> queries
              </p>
              
              {summary.bestRanking && summary.bestRanking <= 3 && (
                <p className="text-green-600">
                  Secured a top-3 position with #{summary.bestRanking} ranking
                </p>
              )}
              
              {summary.topThreeCount > 0 && (
                <p className="text-blue-600">
                  Appeared in top 3 positions {summary.topThreeCount} time{summary.topThreeCount !== 1 ? 's' : ''}
                </p>
              )}
              
              {summary.totalCompetitors > 0 && (
                <p className="text-muted-foreground">
                  Competing against {summary.totalCompetitors} other entities across all rankings
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">Visibility Strength</div>
            <div className="text-blue-600 dark:text-blue-400">
              {summary.topThreeCount > 0 
                ? `Strong visibility with ${summary.topThreeCount} top-3 positions`
                : summary.bestRanking && summary.bestRanking <= 10
                  ? "Good visibility in search results"
                  : "Improvement opportunities available"
              }
            </div>
          </div>
          
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="font-medium text-green-700 dark:text-green-300 mb-1">Competitive Position</div>
            <div className="text-green-600 dark:text-green-400">
              {summary.averageRanking && summary.averageRanking <= 5
                ? "Strong competitive position"
                : summary.averageRanking && summary.averageRanking <= 10
                  ? "Moderate competitive position" 
                  : "Growth opportunity identified"
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};