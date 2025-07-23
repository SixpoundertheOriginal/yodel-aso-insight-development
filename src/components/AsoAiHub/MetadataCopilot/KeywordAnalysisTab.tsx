import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, Copy, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KeywordAnalysisResult {
  keyword: string;
  topApps: {
    appName: string;
    position: number;
    title: string;
    rating: number;
    titleStrategy: string;
  }[];
  insights: {
    titleLength: { avg: number; range: string };
    commonTitleWords: string[];
    ratingDistribution: { avg: number; min: number; max: number };
    strategies: string[];
  };
}

interface KeywordAnalysisTabProps {
  competitorApps: any[];
  onApplyInsight?: (insight: string, field: 'title' | 'subtitle' | 'keywords') => void;
}

export const KeywordAnalysisTab: React.FC<KeywordAnalysisTabProps> = ({
  competitorApps,
  onApplyInsight
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<KeywordAnalysisResult | null>(null);
  const { toast } = useToast();

  const analyzeKeyword = async () => {
    if (!searchKeyword.trim()) return;

    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Filter apps that might rank for this keyword
    const relevantApps = competitorApps
      .filter(app => {
        const titleLower = (app.app_name || '').toLowerCase();
        const keywordLower = searchKeyword.toLowerCase();
        return titleLower.includes(keywordLower) || 
               (app.title_keywords || []).some(kw => kw.toLowerCase().includes(keywordLower));
      })
      .slice(0, 10);

    if (relevantApps.length === 0) {
      toast({
        title: "No relevant apps found",
        description: `No competitors found ranking for "${searchKeyword}". Try a broader keyword.`,
        variant: "destructive"
      });
      setIsAnalyzing(false);
      return;
    }

    // Analyze the apps
    const topApps = relevantApps.map((app, index) => ({
      appName: app.app_name,
      position: index + 1,
      title: app.app_name,
      rating: app.rating_score || 0,
      titleStrategy: analyzeTitleStrategy(app.app_name, searchKeyword)
    }));

    const titles = topApps.map(app => app.title);
    const ratings = topApps.map(app => app.rating).filter(r => r > 0);
    
    const insights = {
      titleLength: {
        avg: Math.round(titles.reduce((sum, title) => sum + title.length, 0) / titles.length),
        range: `${Math.min(...titles.map(t => t.length))}-${Math.max(...titles.map(t => t.length))} chars`
      },
      commonTitleWords: extractCommonWords(titles),
      ratingDistribution: {
        avg: ratings.length ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10 : 0,
        min: ratings.length ? Math.min(...ratings) : 0,
        max: ratings.length ? Math.max(...ratings) : 0
      },
      strategies: generateStrategies(topApps, searchKeyword)
    };

    setAnalysisResult({
      keyword: searchKeyword,
      topApps,
      insights
    });

    setIsAnalyzing(false);
  };

  const analyzeTitleStrategy = (title: string, keyword: string): string => {
    const titleLower = title.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    
    if (titleLower.startsWith(keywordLower)) return 'Keyword First';
    if (titleLower.endsWith(keywordLower)) return 'Keyword Last';
    if (titleLower.includes(keywordLower)) return 'Keyword Middle';
    return 'Related Terms';
  };

  const extractCommonWords = (titles: string[]): string[] => {
    const allWords = titles.flatMap(title => 
      title.toLowerCase().split(/\s+/).filter(word => word.length > 2)
    );
    
    const wordFreq = allWords.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordFreq)
      .filter(([, count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([word]) => word);
  };

  const generateStrategies = (apps: any[], keyword: string): string[] => {
    const strategies: string[] = [];
    
    const keywordFirst = apps.filter(app => app.titleStrategy === 'Keyword First').length;
    const highRated = apps.filter(app => app.rating >= 4.0).length;
    
    if (keywordFirst > apps.length * 0.3) {
      strategies.push('Lead with target keyword in title');
    }
    
    if (highRated > apps.length * 0.5) {
      strategies.push('Focus on quality and user satisfaction');
    }
    
    strategies.push('Use clear, descriptive titles');
    strategies.push('Include relevant secondary keywords');
    
    return strategies.slice(0, 4);
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
        description: `Keyword insight has been applied to ${field}.`,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Keyword Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span className="text-sm">Keyword Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter keyword to analyze competitors..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && analyzeKeyword()}
            />
            <Button 
              onClick={analyzeKeyword} 
              disabled={!searchKeyword.trim() || isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Search for specific keywords to see how top apps rank and optimize for them.
          </p>
        </CardContent>
      </Card>

      {/* Analysis Loading */}
      {isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 animate-pulse" />
                <span className="text-sm">Analyzing "{searchKeyword}"...</span>
              </div>
              <Progress value={75} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Finding top ranking apps and analyzing their strategies.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisResult && !isAnalyzing && (
        <>
          {/* Top Ranking Apps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Top Apps for "{analysisResult.keyword}"
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysisResult.topApps.slice(0, 6).map((app, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        #{app.position}
                      </Badge>
                      <p className="text-xs font-medium truncate">{app.appName}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {app.titleStrategy}
                      </Badge>
                      {app.rating > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {app.rating}★
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 ml-2"
                    onClick={() => copyToClipboard(app.title)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Strategy Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title Length Insights */}
              <div className="space-y-2">
                <p className="text-xs font-medium">Title Length</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Average</p>
                    <p className="text-sm font-semibold">{analysisResult.insights.titleLength.avg} chars</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Range</p>
                    <p className="text-sm font-semibold">{analysisResult.insights.titleLength.range}</p>
                  </div>
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                <p className="text-xs font-medium">Rating Analysis</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg</p>
                    <p className="text-sm font-semibold">{analysisResult.insights.ratingDistribution.avg}★</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Min</p>
                    <p className="text-sm font-semibold">{analysisResult.insights.ratingDistribution.min}★</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max</p>
                    <p className="text-sm font-semibold">{analysisResult.insights.ratingDistribution.max}★</p>
                  </div>
                </div>
              </div>

              {/* Common Words */}
              {analysisResult.insights.commonTitleWords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Common Title Words</p>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.insights.commonTitleWords.map((word, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <Badge variant="outline" className="text-xs">
                          {word}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0"
                          onClick={() => applyInsight(word, 'keywords')}
                        >
                          <Target className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategies */}
              <div className="space-y-2">
                <p className="text-xs font-medium">Recommended Strategies</p>
                <ul className="space-y-1">
                  {analysisResult.insights.strategies.map((strategy, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <TrendingUp className="w-3 h-3 text-green-500 mt-0.5" />
                      <span className="text-xs text-muted-foreground">{strategy}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!analysisResult && !isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Enter a keyword above to analyze how top apps rank for it.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};