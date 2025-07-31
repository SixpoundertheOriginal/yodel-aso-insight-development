import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
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
  Minus
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

interface ProcessedRanking {
  queryId: string;
  queryText: string;
  category: string;
  entityPosition?: number;
  totalEntities?: number;
  competitors: string[];
  visibilityScore: number;
  mentionContext: string;
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

  // Process and combine ranking data from multiple sources
  const processedRankings = useMemo(() => {
    const rankings: ProcessedRanking[] = [];
    
    queryResults.forEach(result => {
      // Check if this query has ranking data
      const hasRanking = result.mention_position && result.mention_context === 'ranked_list';
      
      if (hasRanking) {
        rankings.push({
          queryId: result.id,
          queryText: result.query_text,
          category: result.query_category,
          entityPosition: result.mention_position,
          totalEntities: result.entity_analysis?.total_entities || result.total_entities_in_response,
          competitors: result.competitors_mentioned || [],
          visibilityScore: result.visibility_score,
          mentionContext: result.mention_context
        });
      }
    });
    
    return rankings;
  }, [queryResults]);

  // Calculate competitive intelligence metrics
  const competitiveMetrics = useMemo(() => {
    if (processedRankings.length === 0) {
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

    const positions = processedRankings.map(r => r.entityPosition).filter(p => p) as number[];
    const bestPosition = Math.min(...positions);
    const averagePosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    
    // Market share calculations
    const marketShare = {
      top1: processedRankings.filter(r => r.entityPosition === 1).length,
      top3: processedRankings.filter(r => r.entityPosition && r.entityPosition <= 3).length,
      top5: processedRankings.filter(r => r.entityPosition && r.entityPosition <= 5).length,
      top10: processedRankings.filter(r => r.entityPosition && r.entityPosition <= 10).length,
    };

    // Competitor frequency analysis
    const competitorFrequency = new Map<string, number>();
    processedRankings.forEach(ranking => {
      ranking.competitors.forEach(competitor => {
        const count = competitorFrequency.get(competitor) || 0;
        competitorFrequency.set(competitor, count + 1);
      });
    });

    return {
      totalRankings: processedRankings.length,
      bestPosition,
      averagePosition,
      marketShare,
      competitorFrequency,
      totalCompetitors: competitorFrequency.size
    };
  }, [processedRankings]);

  // Filter and sort rankings
  const filteredRankings = useMemo(() => {
    let filtered = processedRankings.filter(ranking => {
      const matchesSearch = ranking.queryText.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ranking.competitors.some(comp => comp.toLowerCase().includes(searchTerm.toLowerCase()));
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
          return b.competitors.length - a.competitors.length;
        case 'query':
          return a.queryText.localeCompare(b.queryText);
        default:
          return 0;
      }
    });

    return filtered;
  }, [processedRankings, searchTerm, categoryFilter, sortBy]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(queryResults.map(r => r.query_category));
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

  if (processedRankings.length === 0) {
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
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

      {/* Rankings Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Detailed Rankings</span>
            <Badge variant="secondary">{filteredRankings.length} queries</Badge>
          </CardTitle>
          <CardDescription>Query-by-query competitive landscape analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300">Position</TableHead>
                <TableHead className="text-zinc-300">Query</TableHead>
                <TableHead className="text-zinc-300">Category</TableHead>
                <TableHead className="text-zinc-300">Total Entities</TableHead>
                <TableHead className="text-zinc-300">Visibility Score</TableHead>
                <TableHead className="text-zinc-300">Top Competitors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRankings.map((ranking) => (
                <TableRow key={ranking.queryId} className="border-zinc-800">
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPositionIcon(ranking.entityPosition)}
                      <Badge variant={getPositionBadgeVariant(ranking.entityPosition)}>
                        #{ranking.entityPosition || 'N/A'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm text-white font-medium truncate" title={ranking.queryText}>
                      {ranking.queryText}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ranking.category.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {ranking.totalEntities || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-white">{ranking.visibilityScore}</span>
                      <Progress value={ranking.visibilityScore} className="w-16 h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {ranking.competitors.slice(0, 3).map((competitor, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {competitor}
                        </Badge>
                      ))}
                      {ranking.competitors.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{ranking.competitors.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};