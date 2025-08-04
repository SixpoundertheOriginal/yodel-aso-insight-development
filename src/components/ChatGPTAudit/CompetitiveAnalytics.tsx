import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Trophy,
  Download,
  BarChart3,
  Users2,
  Star,
  AlertTriangle,
  Calendar,
  FileText
} from 'lucide-react';

interface CompetitiveAnalyticsProps {
  organizationId: string;
}

interface TrendData {
  date: string;
  visibility_score: number;
  mention_rate: number;
  avg_position: number;
  total_queries: number;
}

interface CompetitorData {
  name: string;
  mentions: number;
  categories: string[];
  threat_level: 'high' | 'medium' | 'low';
}

export const CompetitiveAnalytics: React.FC<CompetitiveAnalyticsProps> = ({
  organizationId
}) => {
  // Fetch visibility trends over time
  const { data: trendsData } = useQuery({
    queryKey: ['visibility-trends', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatgpt_visibility_scores')
        .select(`
          calculated_at,
          overall_score,
          mention_rate,
          avg_position,
          chatgpt_audit_runs!inner(total_queries)
        `)
        .eq('organization_id', organizationId)
        .order('calculated_at', { ascending: true })
        .limit(30);

      if (error) throw error;
      
      return data?.map(item => ({
        date: new Date(item.calculated_at).toLocaleDateString(),
        visibility_score: item.overall_score || 0,
        mention_rate: item.mention_rate || 0,
        avg_position: item.avg_position || 0,
        total_queries: item.chatgpt_audit_runs?.total_queries || 0
      })) as TrendData[];
    },
    enabled: !!organizationId
  });

  // Fetch competitor analysis
  const { data: competitorData } = useQuery({
    queryKey: ['competitor-analysis', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatgpt_query_results')
        .select(`
          competitors_mentioned,
          chatgpt_queries!inner(query_category)
        `)
        .eq('organization_id', organizationId);

      if (error) throw error;

      // Process competitor mentions
      const competitorMap = new Map<string, { mentions: number; categories: Set<string> }>();
      
      data?.forEach(result => {
        result.competitors_mentioned?.forEach(competitor => {
          if (!competitorMap.has(competitor)) {
            competitorMap.set(competitor, { mentions: 0, categories: new Set() });
          }
          const entry = competitorMap.get(competitor)!;
          entry.mentions++;
          entry.categories.add(result.chatgpt_queries.query_category);
        });
      });

      // Convert to array and calculate threat levels
      return Array.from(competitorMap.entries())
        .map(([name, data]) => ({
          name,
          mentions: data.mentions,
          categories: Array.from(data.categories),
          threat_level: data.mentions > 10 ? 'high' : data.mentions > 5 ? 'medium' : 'low'
        } as CompetitorData))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 10);
    },
    enabled: !!organizationId
  });

  // Export functionality
  const handleExportResults = async () => {
    try {
      const { data, error } = await supabase
        .from('chatgpt_query_results')
        .select(`
          *,
          chatgpt_queries!inner(query_text, query_category),
          chatgpt_audit_runs!inner(name, app_id)
        `)
        .eq('organization_id', organizationId);

      if (error) throw error;

      // Format data for CSV export
      const csvData = data?.map(result => ({
        'Audit Name': result.chatgpt_audit_runs.name,
        'App ID': result.chatgpt_audit_runs.app_id,
        'Query': result.chatgpt_queries.query_text,
        'Category': result.chatgpt_queries.query_category,
        'App Mentioned': result.app_mentioned ? 'Yes' : 'No',
        'Mention Position': result.mention_position || 'N/A',
        'Mention Context': result.mention_context || 'N/A',
        'Visibility Score': result.visibility_score || 0,
        'Sentiment Score': result.sentiment_score || 0,
        'Competitors': result.competitors_mentioned?.join(', ') || 'None',
        'Cost (USD)': (result.cost_cents / 100).toFixed(3),
        'Tokens Used': result.tokens_used || 0,
        'Date': new Date(result.created_at).toLocaleDateString()
      })) || [];

      // Convert to CSV and download
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatgpt-visibility-results-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400 bg-red-900/20 border-red-700/50';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/50';
      default: return 'text-green-400 bg-green-900/20 border-green-700/50';
    }
  };

  const getThreatIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Target className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const calculateTrend = () => {
    if (!trendsData || trendsData.length < 2) return null;
    
    const recent = trendsData.slice(-5);
    const earlier = trendsData.slice(-10, -5);
    
    if (recent.length === 0 || earlier.length === 0) return null;
    
    const recentAvg = recent.reduce((sum, item) => sum + item.visibility_score, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, item) => sum + item.visibility_score, 0) / earlier.length;
    
    return recentAvg - earlierAvg;
  };

  const trend = calculateTrend();

  return (
    <div className="space-y-6">
      {/* Export Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics & Insights</h2>
          <p className="text-zinc-400">Competitive analysis and performance trends</p>
        </div>
        <Button onClick={handleExportResults} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Results
        </Button>
      </div>

      {/* Trend Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yodel-orange" />
              <div>
                <p className="text-sm text-zinc-400">Latest Score</p>
                <p className="text-2xl font-bold text-foreground">
                  {trendsData?.[trendsData.length - 1]?.visibility_score || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {trend !== null && trend > 0 ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
              <div>
                <p className="text-sm text-zinc-400">Trend</p>
                <p className={`text-2xl font-bold ${trend !== null && trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trend !== null ? (trend > 0 ? '+' : '') + trend.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-zinc-400">Audits Run</p>
                <p className="text-2xl font-bold text-foreground">
                  {trendsData?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users2 className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-sm text-zinc-400">Competitors</p>
                <p className="text-2xl font-bold text-foreground">
                  {competitorData?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Performance Trends</span>
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Visibility score trends over your last {trendsData?.length || 0} audits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendsData && trendsData.length > 0 ? (
            <div className="space-y-4">
              {trendsData.slice(-10).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Calendar className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm text-zinc-300">{item.date}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">Score: {item.visibility_score}</p>
                      <p className="text-xs text-zinc-400">Mention Rate: {item.mention_rate}%</p>
                    </div>
                    <div className="w-24">
                      <Progress value={item.visibility_score} className="h-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No trend data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competitive Analysis */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <Users2 className="h-5 w-5" />
            <span>Competitive Landscape</span>
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Apps that frequently appear in ChatGPT responses alongside your queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {competitorData && competitorData.length > 0 ? (
            <div className="space-y-4">
              {competitorData.map((competitor, index) => (
                <div key={competitor.name} className={`p-4 rounded-lg border ${getThreatLevelColor(competitor.threat_level)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-zinc-400 text-sm">#{index + 1}</span>
                        {getThreatIcon(competitor.threat_level)}
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{competitor.name}</h4>
                        <p className="text-sm text-zinc-400">{competitor.mentions} mentions</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={getThreatLevelColor(competitor.threat_level)}>
                      {competitor.threat_level} threat
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {competitor.categories.map(category => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users2 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No competitor data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Information */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Export & Reporting</span>
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Download comprehensive reports of your visibility audit results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">Complete Audit Results</h4>
                <p className="text-sm text-zinc-400">CSV export with all query results, scores, and metrics</p>
              </div>
              <Button onClick={handleExportResults} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};