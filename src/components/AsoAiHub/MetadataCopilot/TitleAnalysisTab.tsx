import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Copy, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TitleAnalysisData {
  averageLength: number;
  lengthDistribution: { range: string; count: number; percentage: number }[];
  commonKeywords: { keyword: string; frequency: number; percentage: number }[];
  titlePatterns: { pattern: string; examples: string[]; count: number }[];
  competitorTitles: { appName: string; title: string; length: number; keywords: string[] }[];
}

interface TitleAnalysisTabProps {
  competitorApps: any[];
  currentTitle?: string;
  onApplyInsight?: (insight: string, field: 'title' | 'subtitle' | 'keywords') => void;
}

export const TitleAnalysisTab: React.FC<TitleAnalysisTabProps> = ({
  competitorApps,
  currentTitle = '',
  onApplyInsight
}) => {
  const { toast } = useToast();

  // Analyze competitor titles
  const analyzeTitles = (): TitleAnalysisData => {
    const titles = competitorApps.map(app => ({
      appName: app.app_name || '',
      title: app.app_name || '',
      length: (app.app_name || '').length,
      keywords: app.title_keywords || []
    }));

    const lengths = titles.map(t => t.length);
    const averageLength = lengths.length > 0 ? Math.round(lengths.reduce((sum, len) => sum + len, 0) / lengths.length) : 0;

    // Length distribution
    const lengthDistribution = [
      { range: '0-15', count: 0, percentage: 0 },
      { range: '16-25', count: 0, percentage: 0 },
      { range: '26-35', count: 0, percentage: 0 },
      { range: '36+', count: 0, percentage: 0 }
    ];

    lengths.forEach(len => {
      if (len <= 15) lengthDistribution[0].count++;
      else if (len <= 25) lengthDistribution[1].count++;
      else if (len <= 35) lengthDistribution[2].count++;
      else lengthDistribution[3].count++;
    });

    lengthDistribution.forEach(dist => {
      dist.percentage = titles.length > 0 ? Math.round((dist.count / titles.length) * 100) : 0;
    });

    // Common keywords analysis
    const allKeywords = titles.flatMap(t => t.keywords);
    const keywordFreq = allKeywords.reduce((acc, keyword) => {
      acc[keyword] = (acc[keyword] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonKeywords = Object.entries(keywordFreq)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([keyword, frequency]) => ({
        keyword,
        frequency: frequency as number,
        percentage: titles.length > 0 ? Math.round(((frequency as number) / titles.length) * 100) : 0
      }));

    // Title patterns
    const titlePatterns = [
      {
        pattern: 'App Name + Descriptor',
        examples: titles.filter(t => t.title.includes(' - ') || t.title.includes(': ')).slice(0, 3).map(t => t.title),
        count: titles.filter(t => t.title.includes(' - ') || t.title.includes(': ')).length
      },
      {
        pattern: 'Simple App Name',
        examples: titles.filter(t => t.title.split(' ').length <= 2).slice(0, 3).map(t => t.title),
        count: titles.filter(t => t.title.split(' ').length <= 2).length
      },
      {
        pattern: 'Compound Name',
        examples: titles.filter(t => t.title.split(' ').length >= 3 && !t.title.includes(' - ') && !t.title.includes(': ')).slice(0, 3).map(t => t.title),
        count: titles.filter(t => t.title.split(' ').length >= 3 && !t.title.includes(' - ') && !t.title.includes(': ')).length
      }
    ];

    return {
      averageLength,
      lengthDistribution,
      commonKeywords,
      titlePatterns,
      competitorTitles: titles
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard.",
    });
  };

  const applyInsight = (insight: string) => {
    if (onApplyInsight) {
      onApplyInsight(insight, 'title');
      toast({
        title: "Insight Applied",
        description: "Title insight has been applied.",
      });
    }
  };

  const analysis = analyzeTitles();
  const currentTitleLength = currentTitle.length;

  return (
    <div className="space-y-4">
      {/* Title Length Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Title Length Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Average Length</p>
              <p className="text-lg font-semibold">{analysis.averageLength} chars</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your Title</p>
              <p className="text-lg font-semibold text-yodel-orange">{currentTitleLength} chars</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs font-medium">Length Distribution</p>
            {analysis.lengthDistribution.map((dist, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{dist.range} chars</span>
                  <span>{dist.percentage}% ({dist.count} apps)</span>
                </div>
                <Progress value={dist.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Common Title Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {analysis.commonKeywords.map((item, index) => (
              <div key={index} className="flex items-center space-x-1">
                <Badge variant="outline" className="text-xs">
                  {item.keyword} ({item.percentage}%)
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0"
                  onClick={() => copyToClipboard(item.keyword)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0"
                  onClick={() => applyInsight(item.keyword)}
                >
                  <Target className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Title Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Title Patterns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.titlePatterns.map((pattern, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs font-medium">{pattern.pattern}</p>
                <Badge variant="secondary" className="text-xs">
                  {pattern.count} apps
                </Badge>
              </div>
              {pattern.examples.length > 0 && (
                <div className="space-y-1">
                  {pattern.examples.map((example, exIndex) => (
                    <div key={exIndex} className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate flex-1 mr-2">
                        {example}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        onClick={() => copyToClipboard(example)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Competitor Titles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Competitor Titles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysis.competitorTitles.slice(0, 5).map((comp, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{comp.title}</p>
                <p className="text-xs text-muted-foreground">{comp.length} chars</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 ml-2"
                onClick={() => copyToClipboard(comp.title)}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};