import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, TrendingUp, Target, Lightbulb, Copy } from 'lucide-react';
import { ScrapedMetadata } from '@/types/aso';
import { useCompetitiveAnalysis } from '@/hooks/useCompetitiveAnalysis';
import { useToast } from '@/hooks/use-toast';

interface CompetitiveAnalysisPanelProps {
  initialData: ScrapedMetadata;
  organizationId: string;
  onApplyInsight?: (insight: string, field: 'title' | 'subtitle' | 'keywords') => void;
}

export const CompetitiveAnalysisPanel: React.FC<CompetitiveAnalysisPanelProps> = ({
  initialData,
  organizationId,
  onApplyInsight
}) => {
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);
  const { toast } = useToast();
  
  const {
    isAnalyzing,
    currentAnalysis,
    runAnalysis,
    showDashboard
  } = useCompetitiveAnalysis({ organizationId });

  // Auto-trigger analysis on first load
  useEffect(() => {
    if (!hasRunAnalysis && initialData.applicationCategory) {
      handleAutoAnalysis();
    }
  }, [initialData.applicationCategory, hasRunAnalysis]);

  const handleAutoAnalysis = async () => {
    try {
      setHasRunAnalysis(true);
      await runAnalysis(
        initialData.applicationCategory || initialData.name,
        'category',
        8
      );
    } catch (error) {
      console.error('Auto analysis failed:', error);
    }
  };

  const handleManualAnalysis = async () => {
    try {
      await runAnalysis(
        initialData.name,
        'brand',
        10
      );
    } catch (error) {
      console.error('Manual analysis failed:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard.",
    });
  };

  const applyInsight = (insight: string, field: 'title' | 'subtitle' | 'keywords') => {
    if (onApplyInsight) {
      onApplyInsight(insight, field);
      toast({
        title: "Insight Applied",
        description: `Competitive insight has been applied to ${field}.`,
      });
    }
  };

  if (!currentAnalysis && !isAnalyzing && !hasRunAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-yodel-orange" />
            <span>Competitive Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Analyze competitors in your category to identify opportunities and optimize your metadata.
          </p>
          <div className="flex flex-col space-y-2">
            <Button onClick={handleAutoAnalysis} className="w-full">
              Analyze Category: {initialData.applicationCategory}
            </Button>
            <Button variant="outline" onClick={handleManualAnalysis} className="w-full">
              Analyze App: {initialData.name}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-yodel-orange animate-spin" />
            <span>Analyzing Competitors</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Scanning app stores...</span>
              <span>Processing</span>
            </div>
            <Progress value={75} className="w-full" />
          </div>
          <p className="text-sm text-muted-foreground">
            Finding competitors and analyzing their metadata strategies.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!currentAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span>Analysis Failed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Unable to complete competitive analysis. Please try again.
          </p>
          <Button onClick={handleAutoAnalysis} variant="outline" className="w-full">
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { competitorApps, insights } = currentAnalysis;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-yodel-orange" />
            <span>Competitive Intelligence</span>
          </div>
          <Badge variant="secondary">{competitorApps.length} Apps</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="opportunities">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Market Analysis</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Competitors: {competitorApps.length}</div>
                  <div>Avg Rating: {insights.ratingAndReviewInsights?.averageRating?.toFixed(1) || 'N/A'}</div>
                  <div>Market Type: Competitive</div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Your Position</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Category: {initialData.applicationCategory}</div>
                  <div>Current Title: {initialData.title?.substring(0, 25)}...</div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Top Competitors</p>
              {competitorApps.slice(0, 4).map((app, index) => (
                <div key={app.app_id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{app.app_name}</p>
                    <p className="text-xs text-muted-foreground">{app.developer_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs">#{index + 1}</div>
                    <div className="text-xs text-muted-foreground">
                      {app.rating_score ? `${app.rating_score}★` : 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            {insights.keywordInsights?.emergingTrends && insights.keywordInsights.emergingTrends.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-medium">Trending Keywords</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {insights.keywordInsights.emergingTrends.slice(0, 8).map((keyword, index) => (
                    <div key={index} className="flex items-center space-x-1">
                      <Badge variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        onClick={() => copyToClipboard(keyword)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.keywordInsights?.underutilizedKeywords && insights.keywordInsights.underutilizedKeywords.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4 text-yodel-orange" />
                  <p className="text-sm font-medium">Opportunity Keywords</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {insights.keywordInsights.underutilizedKeywords.slice(0, 8).map((keyword, index) => (
                    <div key={index} className="flex items-center space-x-1">
                      <Badge variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        onClick={() => applyInsight(keyword, 'keywords')}
                      >
                        <Target className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <div className="space-y-4">
              {insights.marketPositioning?.commonStrategies && insights.marketPositioning.commonStrategies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Market Strategies</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {insights.marketPositioning.commonStrategies.slice(0, 3).map((strategy, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-yodel-orange">•</span>
                        <span>{strategy}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {insights.marketPositioning?.marketGaps && insights.marketPositioning.marketGaps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Opportunities</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {insights.marketPositioning.marketGaps.slice(0, 3).map((gap, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-green-500">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex space-x-2">
              <Button onClick={handleManualAnalysis} variant="outline" size="sm" className="flex-1">
                Re-analyze
              </Button>
              <Button onClick={handleAutoAnalysis} size="sm" className="flex-1">
                Category Analysis
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};