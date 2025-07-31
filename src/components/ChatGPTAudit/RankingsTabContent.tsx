import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Trophy, 
  Medal, 
  Award, 
  Users, 
  Target, 
  TrendingUp,
  Search,
  Filter,
  BarChart3,
  Crown,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Eye,
  Hash
} from 'lucide-react';

interface QueryResult {
  id: string;
  query_text: string;
  query_category: string;
  mention_position?: number;
  mention_context: string;
  competitors_mentioned: string[];
  visibility_score: number;
  entity_analysis?: any;
  total_entities_in_response?: number;
}

interface RankingSnapshot {
  id: string;
  entity_name: string;
  position?: number;
  total_positions?: number;
  competitors: any; // Can be Json from database
  query_id: string;
  ranking_type?: string;
  ranking_context?: string;
}

interface RankingsTabContentProps {
  auditRunId: string;
  entityName: string;
  queryResults: QueryResult[];
  rankingSnapshots: RankingSnapshot[];
}

interface QueryRanking {
  queryId: string;
  queryText: string;
  category: string;
  entityPosition?: number;
  totalEntities?: number;
  visibilityScore: number;
  allEntities: Array<{
    name: string;
    position: number;
    isTarget: boolean;
  }>;
}

export const RankingsTabContent: React.FC<RankingsTabContentProps> = ({
  auditRunId,
  entityName,
  queryResults,
  rankingSnapshots
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('position');
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());

  // Process query-centric rankings
  const queryRankings = useMemo(() => {
    const rankings: QueryRanking[] = [];
    
    queryResults.forEach(result => {
      // Check if this query has ranking data
      const hasRanking = result.mention_position && result.mention_context === 'ranked_list';
      
      if (hasRanking) {
        let allEntities: Array<{name: string; position: number; isTarget: boolean}> = [];
        
        // Priority 1: Use structured entities from entity_analysis (most complete data)
        if (result.entity_analysis?.structured_entities && result.entity_analysis.structured_entities.length > 0) {
          allEntities = result.entity_analysis.structured_entities.map((entity: any, index: number) => ({
            name: entity.name,
            position: entity.position || index + 1,
            isTarget: entity.name.toLowerCase() === entityName.toLowerCase()
          }));
        } 
        // Priority 2: Fall back to ranking snapshots
        else {
          const querySnapshots = rankingSnapshots.filter(snapshot => 
            snapshot.query_id === result.id
          );
          
          allEntities = querySnapshots
            .filter(snapshot => snapshot.position && snapshot.entity_name)
            .map(snapshot => ({
              name: snapshot.entity_name,
              position: snapshot.position!,
              isTarget: snapshot.entity_name.toLowerCase() === entityName.toLowerCase()
            }))
            .sort((a, b) => a.position - b.position);
          
          // Priority 3: Final fallback to competitors_mentioned
          if (allEntities.length === 0 && result.competitors_mentioned) {
            allEntities = result.competitors_mentioned.map((competitor, index) => ({
              name: competitor,
              position: index + 1,
              isTarget: competitor.toLowerCase() === entityName.toLowerCase()
            }));
          }
        }
        
        // Sort by position and ensure we show top 10
        allEntities.sort((a, b) => a.position - b.position);
        
        rankings.push({
          queryId: result.id,
          queryText: result.query_text,
          category: result.query_category,
          entityPosition: result.mention_position,
          totalEntities: result.entity_analysis?.structured_entities?.length || result.total_entities_in_response || allEntities.length,
          visibilityScore: result.visibility_score,
          allEntities: allEntities.slice(0, 10) // Top 10 only
        });
      }
    });
    
    return rankings;
  }, [queryResults, rankingSnapshots, entityName]);

  // Calculate competitive intelligence metrics
  const competitiveMetrics = useMemo(() => {
    if (queryRankings.length === 0) {
      return {
        totalRankings: 0,
        bestPosition: null,
        averagePosition: null,
        marketShare: {
          top1: 0,
          top3: 0,
          top5: 0,
          top10: 0
        },
        competitorFrequency: new Map(),
        totalCompetitors: 0
      };
    }

    const positions = queryRankings.map(r => r.entityPosition).filter(p => p) as number[];
    const bestPosition = Math.min(...positions);
    const averagePosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    
    // Market share calculations
    const marketShare = {
      top1: queryRankings.filter(r => r.entityPosition === 1).length,
      top3: queryRankings.filter(r => r.entityPosition && r.entityPosition <= 3).length,
      top5: queryRankings.filter(r => r.entityPosition && r.entityPosition <= 5).length,
      top10: queryRankings.filter(r => r.entityPosition && r.entityPosition <= 10).length,
    };

    // Competitor frequency analysis
    const competitorFrequency = new Map<string, number>();
    queryRankings.forEach(ranking => {
      ranking.allEntities.forEach(entity => {
        if (!entity.isTarget) {
          const count = competitorFrequency.get(entity.name) || 0;
          competitorFrequency.set(entity.name, count + 1);
        }
      });
    });

    return {
      totalRankings: queryRankings.length,
      bestPosition,
      averagePosition,
      marketShare,
      competitorFrequency,
      totalCompetitors: competitorFrequency.size
    };
  }, [queryRankings]);

  // Filter and sort rankings
  const filteredRankings = useMemo(() => {
    let filtered = queryRankings.filter(ranking => {
      const matchesSearch = ranking.queryText.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ranking.allEntities.some(entity => entity.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || ranking.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'position':
          return (a.entityPosition || 999) - (b.entityPosition || 999);
        case 'visibility':
          return b.visibilityScore - a.visibilityScore;
        case 'competitors':
          return b.allEntities.length - a.allEntities.length;
        case 'query':
          return a.queryText.localeCompare(b.queryText);
        default:
          return 0;
      }
    });

    return filtered;
  }, [queryRankings, searchTerm, categoryFilter, sortBy]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(queryResults.map(r => r.query_category).filter(Boolean));
    return Array.from(cats);
  }, [queryResults]);

  // Get top competitors by frequency
  const topCompetitors = useMemo(() => {
    return Array.from(competitiveMetrics.competitorFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
  }, [competitiveMetrics.competitorFrequency]);

  const getPositionBadgeVariant = (position?: number) => {
    if (!position) return 'outline';
    if (position === 1) return 'default';
    if (position <= 3) return 'secondary';
    return 'outline';
  };

  const getPositionIcon = (position?: number) => {
    if (!position) return <Minus className="h-4 w-4" />;
    if (position === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (position <= 3) return <Medal className="h-4 w-4 text-orange-500" />;
    return <Trophy className="h-4 w-4 text-blue-500" />;
  };

  const toggleQueryExpansion = (queryId: string) => {
    const newExpanded = new Set(expandedQueries);
    if (newExpanded.has(queryId)) {
      newExpanded.delete(queryId);
    } else {
      newExpanded.add(queryId);
    }
    setExpandedQueries(newExpanded);
  };

  if (queryRankings.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="text-center py-12">
          <Trophy className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Rankings Data</h3>
          <p className="text-zinc-400">No ranking results were detected in the audit responses</p>
          <p className="text-zinc-500 text-sm mt-2">Try queries that typically produce ranked lists or recommendations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competitive Intelligence Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-zinc-400">Best Position</p>
                <p className="text-2xl font-bold text-white">
                  #{competitiveMetrics.bestPosition || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-zinc-400">Avg Position</p>
                <p className="text-2xl font-bold text-white">
                  #{competitiveMetrics.averagePosition ? competitiveMetrics.averagePosition.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-zinc-400">Top 3 Count</p>
                <p className="text-2xl font-bold text-white">
                  {competitiveMetrics.marketShare.top3}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-sm text-zinc-400">Competitors</p>
                <p className="text-2xl font-bold text-white">
                  {competitiveMetrics.totalCompetitors}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Share Analysis */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Market Position Analysis</span>
          </CardTitle>
          <CardDescription>Share of voice across different ranking tiers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300">#1 Position</span>
                <span className="text-zinc-400">{competitiveMetrics.marketShare.top1}/{competitiveMetrics.totalRankings}</span>
              </div>
              <Progress 
                value={(competitiveMetrics.marketShare.top1 / competitiveMetrics.totalRankings) * 100} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300">Top 3</span>
                <span className="text-zinc-400">{competitiveMetrics.marketShare.top3}/{competitiveMetrics.totalRankings}</span>
              </div>
              <Progress 
                value={(competitiveMetrics.marketShare.top3 / competitiveMetrics.totalRankings) * 100} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300">Top 5</span>
                <span className="text-zinc-400">{competitiveMetrics.marketShare.top5}/{competitiveMetrics.totalRankings}</span>
              </div>
              <Progress 
                value={(competitiveMetrics.marketShare.top5 / competitiveMetrics.totalRankings) * 100} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300">Top 10</span>
                <span className="text-zinc-400">{competitiveMetrics.marketShare.top10}/{competitiveMetrics.totalRankings}</span>
              </div>
              <Progress 
                value={(competitiveMetrics.marketShare.top10 / competitiveMetrics.totalRankings) * 100} 
                className="h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Competitors */}
      {topCompetitors.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Top Competitors</span>
              <Badge variant="outline">{topCompetitors.length} detected</Badge>
            </CardTitle>
            <CardDescription>Most frequently mentioned competitors across all rankings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topCompetitors.map(([competitor, frequency], index) => (
                <div key={competitor} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-zinc-700 rounded-full text-xs text-zinc-300">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-white">{competitor}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-zinc-400">{frequency} mentions</span>
                    <Progress 
                      value={(frequency / competitiveMetrics.totalRankings) * 100} 
                      className="w-16 h-2" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search queries or competitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
                <TrendingUp className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="position">Best Position</SelectItem>
                <SelectItem value="visibility">Visibility Score</SelectItem>
                <SelectItem value="competitors">Competitor Count</SelectItem>
                <SelectItem value="query">Query Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Query Rankings Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Query Rankings</span>
            <Badge variant="secondary">{filteredRankings.length} queries</Badge>
          </CardTitle>
          <CardDescription>Click on any query to see the full top 10 entities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredRankings.map((ranking) => (
              <Collapsible 
                key={ranking.queryId} 
                open={expandedQueries.has(ranking.queryId)}
                onOpenChange={() => toggleQueryExpansion(ranking.queryId)}
              >
                <CollapsibleTrigger asChild>
                  <div className="w-full p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:bg-zinc-800/70 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex items-center space-x-2">
                          {expandedQueries.has(ranking.queryId) ? 
                            <ChevronDown className="h-4 w-4 text-zinc-400" /> : 
                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                          }
                          {getPositionIcon(ranking.entityPosition)}
                          <Badge variant={getPositionBadgeVariant(ranking.entityPosition)} className="min-w-12">
                            #{ranking.entityPosition || 'N/A'}
                          </Badge>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate" title={ranking.queryText}>
                            {ranking.queryText}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {ranking.category?.replace('_', ' ') || 'Unknown'}
                            </Badge>
                            <span className="text-xs text-zinc-400">
                              {ranking.totalEntities} entities
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Eye className="h-4 w-4 text-zinc-400" />
                          <div className="w-16 bg-zinc-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${Math.min(ranking.visibilityScore * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-400 min-w-10">
                            {(ranking.visibilityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                          View Top 10
                        </Button>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-2 p-4 bg-zinc-900/70 border border-zinc-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Hash className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-medium text-white">Top 10 Entities</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ranking.allEntities.map((entity, index) => (
                        <div 
                          key={`${entity.name}-${entity.position}`}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            entity.isTarget 
                              ? 'bg-blue-900/30 border-blue-700/50' 
                              : 'bg-zinc-800/50 border-zinc-600/50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                              entity.position === 1 ? 'bg-yellow-500 text-black' :
                              entity.position <= 3 ? 'bg-orange-500 text-white' :
                              entity.position <= 5 ? 'bg-blue-500 text-white' :
                              'bg-zinc-600 text-zinc-200'
                            }`}>
                              {entity.position}
                            </div>
                            <span className={`text-sm font-medium ${
                              entity.isTarget ? 'text-blue-300' : 'text-white'
                            }`}>
                              {entity.name}
                              {entity.isTarget && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  You
                                </Badge>
                              )}
                            </span>
                          </div>
                          
                          {entity.position <= 3 && (
                            <div className="flex items-center">
                              {entity.position === 1 && <Crown className="h-4 w-4 text-yellow-500" />}
                              {entity.position === 2 && <Medal className="h-4 w-4 text-orange-500" />}
                              {entity.position === 3 && <Award className="h-4 w-4 text-orange-600" />}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {ranking.allEntities.length === 0 && (
                      <p className="text-center text-zinc-400 py-4">
                        No detailed entity data available for this query
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
            
            {filteredRankings.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400">No queries match your current filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};