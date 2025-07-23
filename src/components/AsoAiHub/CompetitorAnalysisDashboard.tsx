import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Users, 
  Star, 
  Lightbulb,
  BarChart3,
  Eye,
  MessageSquare
} from 'lucide-react';
import { enhancedCompetitiveIntelligenceService, CompetitorApp, CompetitiveInsights } from '@/services/enhanced-competitive-intelligence.service';
import { useToast } from '@/hooks/use-toast';

interface CompetitorAnalysisDashboardProps {
  searchTerm: string;
  analysisType: 'brand' | 'keyword' | 'category';
  organizationId: string;
  onClose?: () => void;
}

export function CompetitorAnalysisDashboard({ 
  searchTerm, 
  analysisType, 
  organizationId, 
  onClose 
}: CompetitorAnalysisDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{
    analysisId: string;
    competitorApps: CompetitorApp[];
    insights: CompetitiveInsights;
    summary: string;
  } | null>(null);
  const { toast } = useToast();

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await enhancedCompetitiveIntelligenceService.analyzeCompetitors(
        searchTerm,
        analysisType,
        organizationId,
        10
      );
      setAnalysis(result);
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${result.competitorApps.length} competitors for "${searchTerm}"`,
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze competitors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Competitive Intelligence Analysis
          </CardTitle>
          <CardDescription>
            Analyze top competitors for "{searchTerm}" to discover market insights and opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Eye className="h-4 w-4" />
              <span>Market Positioning</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Target className="h-4 w-4" />
              <span>Keyword Strategy</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Lightbulb className="h-4 w-4" />
              <span>Growth Opportunities</span>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={runAnalysis} size="lg" className="min-w-[200px]">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analyze Top 10 Competitors
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="text-center py-12">
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <div>
              <h3 className="font-semibold">Analyzing Competitors...</h3>
              <p className="text-sm text-muted-foreground">
                Fetching and analyzing top competitors for "{searchTerm}"
              </p>
            </div>
            <Progress value={65} className="w-full max-w-sm mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const { competitorApps, insights, summary } = analysis;
  const topKeywords = enhancedCompetitiveIntelligenceService.extractTopKeywords(competitorApps);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Competitive Analysis: {searchTerm}
              </CardTitle>
              <CardDescription className="mt-2">
                {summary}
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Competitors</p>
                <p className="text-2xl font-bold">{competitorApps.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Keywords</p>
                <p className="text-2xl font-bold">{topKeywords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Avg Rating</p>
                <p className="text-2xl font-bold">
                  {(competitorApps.reduce((sum, app) => sum + (app.rating_score || 0), 0) / competitorApps.length).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Market Type</p>
                <p className="text-2xl font-bold capitalize">{analysisType}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis */}
      <Tabs defaultValue="competitors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="competitors">Top Competitors</TabsTrigger>
          <TabsTrigger value="keywords">Keyword Insights</TabsTrigger>
          <TabsTrigger value="positioning">Market Position</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Competing Apps</CardTitle>
              <CardDescription>
                Apps ranking highest for "{searchTerm}"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {competitorApps.slice(0, 10).map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary">#{app.ranking_position}</Badge>
                      <div>
                        <h4 className="font-semibold">{app.app_name}</h4>
                        <p className="text-sm text-muted-foreground">{app.developer_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{app.rating_score}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {app.rating_count?.toLocaleString()} reviews
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Intelligence</CardTitle>
              <CardDescription>
                Most frequently used keywords by competitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {topKeywords.map(({ keyword, frequency }) => (
                  <div key={keyword} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">{keyword}</span>
                    <Badge variant="secondary">{frequency}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {insights.keywordInsights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trending Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights.keywordInsights.emergingTrends?.map((trend, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{trend}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Underutilized Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights.keywordInsights.underutilizedKeywords?.map((keyword, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{keyword}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="positioning" className="space-y-4">
          {insights.marketPositioning && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Common Strategies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.marketPositioning.commonStrategies?.map((strategy, index) => (
                      <div key={index} className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-sm">{strategy}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Market Gaps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.marketPositioning.marketGaps?.map((gap, index) => (
                      <div key={index} className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-sm">{gap}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          {insights.competitiveOpportunities && (
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ranking Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.competitiveOpportunities.rankingOpportunities?.map((opportunity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border-l-4 border-primary bg-primary/5 rounded-r-lg">
                        <Target className="h-5 w-5 text-primary mt-0.5" />
                        <p className="text-sm">{opportunity}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Differentiation Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.competitiveOpportunities.differentiationAreas?.map((area, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 rounded-r-lg">
                        <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <p className="text-sm">{area}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}