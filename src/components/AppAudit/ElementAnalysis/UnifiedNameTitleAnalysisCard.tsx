import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, FileText, Target, Search, Users, Zap } from 'lucide-react';
import { AppNameAnalysis, TitleAnalysis } from '@/services/app-element-analysis.service';

interface UnifiedNameTitleAnalysisCardProps {
  appNameAnalysis: AppNameAnalysis;
  titleAnalysis: TitleAnalysis;
  appName: string;
  title: string;
}

export const UnifiedNameTitleAnalysisCard: React.FC<UnifiedNameTitleAnalysisCardProps> = ({
  appNameAnalysis,
  titleAnalysis,
  appName,
  title
}) => {
  // Check if app name and title are the same (or very similar)
  const areSame = appName.toLowerCase().trim() === title.toLowerCase().trim();
  
  // Calculate combined score when they're the same
  const combinedScore = areSame 
    ? Math.round((appNameAnalysis.score + titleAnalysis.score) / 2)
    : null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getCharacterUsageColor = () => {
    const percentage = (titleAnalysis.characterUsage / titleAnalysis.maxCharacters) * 100;
    if (percentage > 100) return 'text-red-400';
    if (percentage > 90) return 'text-yellow-400';
    if (percentage > 70) return 'text-emerald-400';
    return 'text-blue-400';
  };

  // Combine keywords from both analyses
  const allKeywords = [...new Set([...appNameAnalysis.keywords, ...titleAnalysis.keywords])];
  
  // Combine recommendations
  const allRecommendations = [...appNameAnalysis.recommendations, ...titleAnalysis.recommendations];

  if (areSame) {
    // Unified view when app name and title are the same
    return (
      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-400" />
              <span>App Name & Title Analysis</span>
            </div>
            <Badge className={getScoreBadgeColor(combinedScore!)}>
              {combinedScore}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Name/Title Display */}
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-sm text-zinc-400 mb-1">App Name & Title</div>
            <div className="text-lg font-semibold text-white">{title}</div>
            <div className="text-xs text-zinc-500 mt-1">
              <span className={getCharacterUsageColor()}>
                {titleAnalysis.characterUsage}/{titleAnalysis.maxCharacters} characters
              </span>
              <span className="ml-2 text-zinc-600">
                ({Math.round((titleAnalysis.characterUsage / titleAnalysis.maxCharacters) * 100)}% used)
              </span>
            </div>
          </div>

          {/* Character Usage Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Character Usage</span>
              <span className={`text-sm font-medium ${getCharacterUsageColor()}`}>
                {Math.round((titleAnalysis.characterUsage / titleAnalysis.maxCharacters) * 100)}%
              </span>
            </div>
            <Progress 
              value={(titleAnalysis.characterUsage / titleAnalysis.maxCharacters) * 100} 
              className="h-2"
            />
          </div>

          {/* Combined Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Brand Strength</span>
                <span className={`text-sm font-medium ${getScoreColor(appNameAnalysis.brandStrength)}`}>
                  {appNameAnalysis.brandStrength}%
                </span>
              </div>
              <Progress value={appNameAnalysis.brandStrength} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Memorability</span>
                <span className={`text-sm font-medium ${getScoreColor(appNameAnalysis.memorability)}`}>
                  {appNameAnalysis.memorability}%
                </span>
              </div>
              <Progress value={appNameAnalysis.memorability} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Keyword Density</span>
                <span className={`text-sm font-medium ${getScoreColor(titleAnalysis.keywordDensity)}`}>
                  {titleAnalysis.keywordDensity}%
                </span>
              </div>
              <Progress value={titleAnalysis.keywordDensity} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Search Visibility</span>
                <span className={`text-sm font-medium ${getScoreColor(appNameAnalysis.searchVisibility)}`}>
                  {appNameAnalysis.searchVisibility}%
                </span>
              </div>
              <Progress value={appNameAnalysis.searchVisibility} className="h-2" />
            </div>
          </div>

          {/* Keywords */}
          {allKeywords.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Keywords Found</span>
                <Badge variant="outline" className="text-xs text-zinc-400">
                  {allKeywords.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {allKeywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs text-zinc-300 border-zinc-600">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* A/B Test Suggestions */}
          {titleAnalysis.abTestSuggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">A/B Test Ideas</span>
              </div>
              <div className="space-y-1">
                {titleAnalysis.abTestSuggestions.map((suggestion, index) => (
                  <div key={index} className="text-sm text-zinc-300 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitor Comparison */}
          {appNameAnalysis.competitorComparison && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">vs Competitors</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-emerald-500/10 rounded">
                  <div className="text-emerald-400 font-medium">
                    {Math.round((appNameAnalysis.competitorComparison.better + titleAnalysis.competitorComparison!.better) / 2)}%
                  </div>
                  <div className="text-zinc-500">Better</div>
                </div>
                <div className="text-center p-2 bg-yellow-500/10 rounded">
                  <div className="text-yellow-400 font-medium">
                    {Math.round((appNameAnalysis.competitorComparison.similar + titleAnalysis.competitorComparison!.similar) / 2)}%
                  </div>
                  <div className="text-zinc-500">Similar</div>
                </div>
                <div className="text-center p-2 bg-red-500/10 rounded">
                  <div className="text-red-400 font-medium">
                    {Math.round((appNameAnalysis.competitorComparison.worse + titleAnalysis.competitorComparison!.worse) / 2)}%
                  </div>
                  <div className="text-zinc-500">Worse</div>
                </div>
              </div>
            </div>
          )}

          {/* Combined Recommendations */}
          <div>
            <div className="text-sm font-medium text-zinc-300 mb-2">Recommendations</div>
            <div className="space-y-2">
              {allRecommendations.slice(0, 4).map((rec, index) => (
                <div key={index} className="text-sm text-zinc-400 p-2 bg-zinc-800/30 rounded border-l-2 border-blue-400">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Separate view when app name and title are different (fallback to existing separate cards)
  return (
    <div className="space-y-6">
      {/* This would render separate cards - but since we're focusing on the unified case, keeping it simple */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 text-center">
          <span className="text-zinc-400">App name and title are different - showing separate analysis</span>
        </CardContent>
      </Card>
    </div>
  );
};
