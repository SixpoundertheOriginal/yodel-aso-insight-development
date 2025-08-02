import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Users, Search } from 'lucide-react';
import { AppNameAnalysis } from '@/services/app-element-analysis.service';

interface AppNameAnalysisCardProps {
  analysis: AppNameAnalysis;
  appName: string;
}

export const AppNameAnalysisCard: React.FC<AppNameAnalysisCardProps> = ({
  analysis,
  appName
}) => {
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

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-400" />
            <span>App Name Analysis</span>
          </div>
          <Badge className={getScoreBadgeColor(analysis.score)}>
            {analysis.score}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* App Name Display */}
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <div className="text-sm text-zinc-400 mb-1">Current App Name</div>
          <div className="text-lg font-semibold text-white">{appName}</div>
        </div>

        {/* Core Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Memorability</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.memorability)}`}>
                {analysis.memorability}%
              </span>
            </div>
            <Progress value={analysis.memorability} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Brand Strength</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.brandStrength)}`}>
                {analysis.brandStrength}%
              </span>
            </div>
            <Progress value={analysis.brandStrength} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Uniqueness</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.uniqueness)}`}>
                {analysis.uniqueness}%
              </span>
            </div>
            <Progress value={analysis.uniqueness} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Search Visibility</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.searchVisibility)}`}>
                {analysis.searchVisibility}%
              </span>
            </div>
            <Progress value={analysis.searchVisibility} className="h-2" />
          </div>
        </div>

        {/* Keywords */}
        {analysis.keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">Extracted Keywords</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs text-zinc-300 border-zinc-600">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Competitor Comparison */}
        {analysis.competitorComparison && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">vs Competitors</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-emerald-500/10 rounded">
                <div className="text-emerald-400 font-medium">
                  {analysis.competitorComparison.better}%
                </div>
                <div className="text-zinc-500">Better</div>
              </div>
              <div className="text-center p-2 bg-yellow-500/10 rounded">
                <div className="text-yellow-400 font-medium">
                  {analysis.competitorComparison.similar}%
                </div>
                <div className="text-zinc-500">Similar</div>
              </div>
              <div className="text-center p-2 bg-red-500/10 rounded">
                <div className="text-red-400 font-medium">
                  {analysis.competitorComparison.worse}%
                </div>
                <div className="text-zinc-500">Worse</div>
              </div>
            </div>
          </div>
        )}

        {/* Key Insights */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Key Insights</span>
          </div>
          <div className="space-y-1">
            {analysis.insights.map((insight, index) => (
              <div key={index} className="text-sm text-zinc-300 flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                {insight}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <div className="text-sm font-medium text-zinc-300 mb-2">Recommendations</div>
          <div className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="text-sm text-zinc-400 p-2 bg-zinc-800/30 rounded border-l-2 border-blue-400">
                {rec}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};