import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { RankingDetailsModal } from './RankingDetailsModal';
import { RankingsTabContent } from './RankingsTabContent';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Users, 
  MessageSquare,
  Star,
  Trophy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

interface VisibilityResultsProps {
  auditRunId: string;
  organizationId: string;
}

interface QueryResult {
  id: string;
  query_text: string;
  query_category: string;
  chatgpt_response: string; // Match DB column name
  app_mentioned: boolean;
  mention_position?: number;
  mention_context: string;
  competitors_mentioned: string[];
  sentiment_score: number;
  visibility_score: number;
  tokens_used: number;
  cost_cents: number;
  created_at: string;
  total_entities_in_response?: number;
  entityAnalysis?: any; // Frontend calculated entity analysis
  entity_analysis?: any; // Database stored entity analysis
}

interface VisibilityScore {
  id: string;
  audit_run_id: string;
  entity_name: string;
  organization_id: string;
  overall_score: number;
  mention_rate: number;
  mention_count: number;
  avg_position: number;
  average_position: number;
  visibility_score: number;
  sentiment_score: number;
  calculated_at: string;
  created_at: string;
}

interface RankingSnapshot {
  id: string;
  audit_run_id: string;
  entity_name: string;
  organization_id: string;
  snapshot_date: string;
  ranking_position: number;
  mention_count: number;
  avg_position: number;
  visibility_score: number;
  sentiment_score: number;
  created_at: string;
}

export const VisibilityResults: React.FC<VisibilityResultsProps> = ({
  auditRunId,
  organizationId
}) => {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [selectedRankingData, setSelectedRankingData] = useState<{
    entityName: string;
    rankingDetails: any[];
  } | null>(null);

  // Fetch query results
  const { data: queryResults, isLoading: loadingResults } = useQuery({
    queryKey: ['chatgpt-query-results', auditRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatgpt_query_results')
        .select(`
          *,
          chatgpt_queries!inner(query_text, query_category)
        `)
        .eq('audit_run_id', auditRunId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match QueryResult interface
      return data?.map(result => ({
        ...result,
        query_text: result.chatgpt_queries.query_text,
        query_category: result.chatgpt_queries.query_category
      })) as QueryResult[];
    },
    enabled: !!auditRunId
  });

  // Fetch audit run to get topic data
  const { data: auditRun } = useQuery({
    queryKey: ['chatgpt-audit-run', auditRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatgpt_audit_runs')
        .select('topic_data')
        .eq('id', auditRunId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!auditRunId
  });

  // Fetch visibility scores
  const { data: visibilityScore } = useQuery({
    queryKey: ['chatgpt-visibility-scores', auditRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatgpt_visibility_scores')
        .select('*')
        .eq('audit_run_id', auditRunId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as VisibilityScore | null;
    },
    enabled: !!auditRunId
  });

  // Fetch ranking snapshots for competitive landscape
  const { data: rankingSnapshots } = useQuery({
    queryKey: ['chatgpt-ranking-snapshots', auditRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatgpt_ranking_snapshots')
        .select('*')
        .eq('audit_run_id', auditRunId)
        .order('position', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;
      return data || [];
    },
    enabled: !!auditRunId
  });

  const toggleResultExpansion = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const handleRankingClick = (result: QueryResult) => {
    // Extract ranking details from the entity analysis or ranking context
    const entityName = (auditRun?.topic_data as any)?.entityToTrack || 'Entity';
    const rankingDetails = [{
      position: result.mention_position || 1,
      query: result.query_text,
      totalEntities: result.entity_analysis?.total_entities || result.total_entities_in_response,
      competitors: result.entity_analysis?.competitors || result.competitors_mentioned || []
    }];
    
    setSelectedRankingData({ entityName, rankingDetails });
    setShowRankingModal(true);
  };

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

  const getMentionContextIcon = (context: string) => {
    switch (context) {
      case 'recommended': return <Star className="h-4 w-4 text-green-400" />;
      case 'compared': return <BarChart3 className="h-4 w-4 text-blue-400" />;
      case 'mentioned': return <MessageSquare className="h-4 w-4 text-yellow-400" />;
      default: return <AlertTriangle className="h-4 w-4 text-red-400" />;
    }
  };

  if (loadingResults) {
    return (
      <div className="space-y-6">
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

  if (!queryResults || queryResults.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Results Yet</h3>
          <p className="text-zinc-400">Results will appear here as queries are processed</p>
        </CardContent>
      </Card>
    );
  }

  // UNIFIED DETECTION: Use enhanced entity detection when available
  const getEntityMentionStatus = (result: QueryResult) => {
    // Check both possible field names for entity analysis data
    const entityAnalysis = result.entityAnalysis || result.entity_analysis;
    if (entityAnalysis) {
      return entityAnalysis.entityMentioned;
    }
    return result.app_mentioned;
  };

  const mentionedResults = queryResults.filter(r => getEntityMentionStatus(r));
  const overallVisibilityScore = visibilityScore?.overall_score || 
    (mentionedResults.length > 0 ? Math.round(mentionedResults.reduce((sum, r) => sum + r.visibility_score, 0) / mentionedResults.length) : 0);

  // Check if entity tracking is enabled - safely parse topic_data
  const topicData = auditRun?.topic_data as any;
  const hasEntityTracking = topicData?.entityToTrack;

  return (
    <div className="space-y-6">


      {/* Results Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900 border-zinc-800">
          <TabsTrigger value="all">All Results ({queryResults.length})</TabsTrigger>
          <TabsTrigger value="mentioned">Mentioned ({mentionedResults.length})</TabsTrigger>
          <TabsTrigger value="not-mentioned">Not Mentioned ({queryResults.length - mentionedResults.length})</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {queryResults.map(result => (
            <Card key={result.id} className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getMentionContextIcon(result.mention_context)}
                      <Badge variant="outline" className="text-xs">
                        {result.query_category}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-medium text-foreground">
                      {result.query_text}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleResultExpansion(result.id)}
                  >
                    {expandedResults.has(result.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Quick Summary */}
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${getEntityMentionStatus(result) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                     <span className="text-sm text-zinc-300">
                      {getEntityMentionStatus(result) ? 'Mentioned' : 'Not Mentioned'}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {result.tokens_used} tokens • ${(result.cost_cents / 100).toFixed(3)}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedResults.has(result.id) && (
                  <div className="space-y-4 border-t border-zinc-800 pt-4">
                    {/* Full Response */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-zinc-300">ChatGPT Response:</h5>
                      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-md">
                        <p className="text-sm text-zinc-200 leading-relaxed">
                          {result.chatgpt_response}
                        </p>
                      </div>
                    </div>


                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-zinc-300">Visibility Score</h5>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Score</span>
                            <span className={`text-sm font-medium ${getScoreColor(result.visibility_score)}`}>
                              {result.visibility_score}/100
                            </span>
                          </div>
                          <Progress value={result.visibility_score} className="h-2" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-zinc-300">Sentiment Score</h5>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Sentiment</span>
                            <span className={`text-sm font-medium ${
                              result.sentiment_score > 0 ? 'text-green-400' : 
                              result.sentiment_score < 0 ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {result.sentiment_score.toFixed(2)}
                            </span>
                          </div>
                          <Progress 
                            value={((result.sentiment_score + 1) / 2) * 100} 
                            className="h-2" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="mentioned" className="space-y-4">
          {mentionedResults.map(result => (
            <Card key={result.id} className="bg-green-900/20 border-green-700/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-foreground">Position #{result.mention_position}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.mention_context}
                    </Badge>
                  </div>
                  <Badge variant="default">
                    Score: {result.visibility_score}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-300 mb-2">{result.query_text}</p>
                <p className="text-xs text-green-400">✓ App mentioned as {result.mention_context}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="not-mentioned" className="space-y-4">
          {queryResults.filter(r => !getEntityMentionStatus(r)).map(result => (
            <Card key={result.id} className="bg-red-900/20 border-red-700/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <Badge variant="outline" className="text-xs">
                      {result.query_category}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 mb-2">{result.query_text}</p>
                <p className="text-xs text-red-400">✗ App not mentioned in response</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>


        <TabsContent value="rankings" className="space-y-4">
          <RankingsTabContent 
            auditRunId={auditRunId}
            entityName={hasEntityTracking ? topicData.entityToTrack : 'Target Entity'}
            queryResults={queryResults}
            rankingSnapshots={(rankingSnapshots || []) as any}
          />
        </TabsContent>
      </Tabs>

      {/* Ranking Details Modal */}
      {selectedRankingData && (
        <RankingDetailsModal
          isOpen={showRankingModal}
          onClose={() => {
            setShowRankingModal(false);
            setSelectedRankingData(null);
          }}
          entityName={selectedRankingData.entityName}
          rankingDetails={selectedRankingData.rankingDetails}
        />
      )}
    </div>
  );
};