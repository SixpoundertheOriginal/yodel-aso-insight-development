import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { RankingDetailsModal } from './RankingDetailsModal';
import { RankingsTabContent } from './RankingsTabContent';
import { VisibilitySummaryCards } from './VisibilitySummaryCards';
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
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';

interface VisibilityResultsProps {
  auditRunId: string;
  organizationId: string;
}

interface QueryResult {
  id: string;
  query_text: string;
  query_category: string;
  response_text: string;
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
  overall_score: number;
  mention_rate: number;
  avg_position: number;
  positive_mentions: number;
  neutral_mentions: number;
  negative_mentions: number;
  top_competitors: string[];
  category_scores: Record<string, number>;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'mentioned' | 'not-mentioned'>('all');

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
        <VisibilitySummaryCards queryResults={[]} isLoading={true} />
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
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

  // Filter and search logic
  const filteredResults = queryResults.filter(result => {
    const matchesSearch = searchQuery === '' || 
      result.query_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.response_text.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'mentioned' && getEntityMentionStatus(result)) ||
      (filterStatus === 'not-mentioned' && !getEntityMentionStatus(result));
    
    return matchesSearch && matchesFilter;
  });

  // Check if entity tracking is enabled - safely parse topic_data
  const topicData = auditRun?.topic_data as any;
  const hasEntityTracking = topicData?.entityToTrack;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <VisibilitySummaryCards queryResults={queryResults} isLoading={loadingResults} />

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="mentioned">Mentioned Only</SelectItem>
            <SelectItem value="not-mentioned">Not Mentioned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900 border-zinc-800">
          <TabsTrigger value="all">All Results ({queryResults.length})</TabsTrigger>
          <TabsTrigger value="mentioned">Mentioned ({mentionedResults.length})</TabsTrigger>
          <TabsTrigger value="not-mentioned">Not Mentioned ({queryResults.length - mentionedResults.length})</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredResults.map(result => (
            <Card key={result.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getMentionContextIcon(result.mention_context)}
                      <Badge variant="outline" className="text-xs">
                        {result.query_category}
                      </Badge>
                      {/* Scores in header */}
                      {getEntityMentionStatus(result) && (
                        <div className="flex items-center space-x-2">
                          <Badge variant={getScoreBadgeVariant(result.visibility_score)} className="text-xs">
                            Visibility: {result.visibility_score}
                          </Badge>
                          <Badge 
                            variant={result.sentiment_score > 0 ? 'default' : result.sentiment_score < 0 ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            Sentiment: {result.sentiment_score > 0 ? '+' : ''}{result.sentiment_score.toFixed(1)}
                          </Badge>
                        </div>
                      )}
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
                {/* Quick Summary - Always visible */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${getEntityMentionStatus(result) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                     <span className="text-sm text-muted-foreground">
                      {getEntityMentionStatus(result) ? 'Mentioned' : 'Not Mentioned'}
                      {result.mention_position && ` (Position #${result.mention_position})`}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {result.tokens_used} tokens • ${(result.cost_cents / 100).toFixed(3)}
                  </div>
                </div>

                {/* Expanded Details - Progressive disclosure */}
                {expandedResults.has(result.id) && (
                  <div className="space-y-4 border-t border-border pt-4">
                    {/* Full Response */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground">ChatGPT Response:</h5>
                      <div className="p-4 bg-muted/50 border border-border rounded-md">
                        <p className="text-sm text-foreground leading-relaxed">
                          {result.response_text}
                        </p>
                      </div>
                    </div>

                    {/* Competitors if mentioned */}
                    {result.competitors_mentioned && result.competitors_mentioned.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-muted-foreground">Competitors Mentioned:</h5>
                        <div className="flex flex-wrap gap-2">
                          {result.competitors_mentioned.map((competitor, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {competitor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
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
            rankingSnapshots={rankingSnapshots || []}
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