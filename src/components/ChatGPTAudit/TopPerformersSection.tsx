import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy,
  TrendingUp,
  Target,
  Star,
  Users,
  Crown,
  Medal,
  Award
} from 'lucide-react';

interface TopPerformersProps {
  auditRunId: string;
  organizationId: string;
}

interface AppPerformanceScore {
  app_name: string;
  overall_score: number;
  mention_rate: number;
  avg_ranking_position: number;
  recommendation_strength: number;
  sentiment_score: number;
  total_queries: number;
  mentioned_queries: number;
}

export const TopPerformersSection: React.FC<TopPerformersProps> = ({
  auditRunId,
  organizationId
}) => {
  // Fetch enhanced performance data
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['top-performers', auditRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatgpt_query_results')
        .select(`
          *,
          chatgpt_queries!inner(query_text, query_category)
        `)
        .eq('audit_run_id', auditRunId);

      if (error) throw error;

      // Calculate performance metrics for each "app" mentioned in competitors
      const appMetrics = new Map<string, {
        mentions: number;
        totalQueries: number;
        positions: number[];
        recommendations: number[];
        sentiments: number[];
      }>();

      // Process all query results
      data?.forEach(result => {
        // Add competitors mentioned
        result.competitors_mentioned?.forEach((competitor: string) => {
          if (!appMetrics.has(competitor)) {
            appMetrics.set(competitor, {
              mentions: 0,
              totalQueries: 0,
              positions: [],
              recommendations: [],
              sentiments: []
            });
          }
          const metrics = appMetrics.get(competitor)!;
          metrics.mentions++;
          metrics.sentiments.push(result.sentiment_score || 0);
          
          // Extract recommendation strength from processing metadata if available
          const recStrength = typeof result.processing_metadata === 'object' && result.processing_metadata && 'recommendation_strength' in result.processing_metadata ? Number(result.processing_metadata.recommendation_strength) : 5;
          metrics.recommendations.push(recStrength);
        });

        // Track total queries for mention rate calculation
        const allApps = [...(result.competitors_mentioned || [])];
        allApps.forEach(app => {
          if (appMetrics.has(app)) {
            appMetrics.get(app)!.totalQueries++;
          }
        });
      });

      // Calculate performance scores
      const performers: AppPerformanceScore[] = Array.from(appMetrics.entries())
        .map(([appName, metrics]) => {
          const mentionRate = (metrics.mentions / (data?.length || 1)) * 100;
          const avgPosition = metrics.positions.length > 0 
            ? metrics.positions.reduce((a, b) => a + b, 0) / metrics.positions.length 
            : 0;
          const avgRecommendation = metrics.recommendations.length > 0
            ? metrics.recommendations.reduce((a, b) => a + b, 0) / metrics.recommendations.length
            : 0;
          const avgSentiment = metrics.sentiments.length > 0
            ? metrics.sentiments.reduce((a, b) => a + b, 0) / metrics.sentiments.length
            : 0;

          // Calculate overall score using weighted formula
          const overallScore = (
            (mentionRate / 100) * 0.4 +         // 40% mention rate
            (Math.max(0, 10 - avgPosition) / 10) * 0.3 + // 30% position (inverted)
            (avgRecommendation / 10) * 0.2 +    // 20% recommendation strength
            ((avgSentiment + 1) / 2) * 0.1      // 10% sentiment
          ) * 100;

          return {
            app_name: appName,
            overall_score: Math.round(overallScore),
            mention_rate: Math.round(mentionRate),
            avg_ranking_position: Math.round(avgPosition * 10) / 10,
            recommendation_strength: Math.round(avgRecommendation * 10) / 10,
            sentiment_score: Math.round(avgSentiment * 100) / 100,
            total_queries: data?.length || 0,
            mentioned_queries: metrics.mentions
          };
        })
        .sort((a, b) => b.overall_score - a.overall_score);

      return performers;
    },
    enabled: !!auditRunId
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-400" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <Trophy className="h-5 w-5 text-zinc-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!performanceData || performanceData.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="text-center py-12">
          <Trophy className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Competition Data</h3>
          <p className="text-zinc-400">Run more queries to see competitive rankings</p>
        </CardContent>
      </Card>
    );
  }

  const topPerformers = performanceData.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top 5 Overall Performers */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yodel-orange" />
            <span>Top Performers (ChatGPT Mentions)</span>
          </CardTitle>
          <CardDescription>
            Apps ranked by overall ChatGPT visibility and recommendation strength
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topPerformers.map((performer, index) => (
            <div key={performer.app_name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getRankIcon(index + 1)}
                  <div>
                    <h4 className="font-medium text-white capitalize">{performer.app_name}</h4>
                    <p className="text-sm text-zinc-400">
                      {performer.mentioned_queries} mentions in {performer.total_queries} queries
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getScoreBadgeVariant(performer.overall_score)}>
                    {performer.overall_score}
                  </Badge>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-8">
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">Mention Rate</p>
                  <div className="flex items-center space-x-2">
                    <Progress value={performer.mention_rate} className="h-2 flex-1" />
                    <span className="text-sm text-white">{performer.mention_rate}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">Avg Position</p>
                  <p className="text-sm text-white">
                    {performer.avg_ranking_position > 0 ? `#${performer.avg_ranking_position}` : 'N/A'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">Recommendation</p>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400" />
                    <span className="text-sm text-white">{performer.recommendation_strength}/10</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">Sentiment</p>
                  <p className={`text-sm ${
                    performer.sentiment_score > 0 ? 'text-green-400' : 
                    performer.sentiment_score < 0 ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {performer.sentiment_score > 0 ? '+' : ''}{performer.sentiment_score}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Category Leaders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <Target className="h-4 w-4 text-green-400" />
              <span>Highest Mention Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.slice(0, 3).map((performer, index) => (
              <div key={performer.app_name} className="flex items-center justify-between py-2">
                <span className="text-sm text-zinc-300 capitalize">{performer.app_name}</span>
                <span className="text-sm text-white">{performer.mention_rate}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span>Best Average Position</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers
              .filter(p => p.avg_ranking_position > 0)
              .sort((a, b) => a.avg_ranking_position - b.avg_ranking_position)
              .slice(0, 3)
              .map((performer, index) => (
                <div key={performer.app_name} className="flex items-center justify-between py-2">
                  <span className="text-sm text-zinc-300 capitalize">{performer.app_name}</span>
                  <span className="text-sm text-white">#{performer.avg_ranking_position}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span>Strongest Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers
              .sort((a, b) => b.recommendation_strength - a.recommendation_strength)
              .slice(0, 3)
              .map((performer, index) => (
                <div key={performer.app_name} className="flex items-center justify-between py-2">
                  <span className="text-sm text-zinc-300 capitalize">{performer.app_name}</span>
                  <span className="text-sm text-white">{performer.recommendation_strength}/10</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};