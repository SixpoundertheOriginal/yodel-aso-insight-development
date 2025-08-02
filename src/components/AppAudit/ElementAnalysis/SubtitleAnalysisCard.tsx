import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Type, Star, Layers, Users } from 'lucide-react';
import { SubtitleAnalysis } from '@/services/app-element-analysis.service';

interface SubtitleAnalysisCardProps {
  analysis: SubtitleAnalysis;
  subtitle: string;
}

export const SubtitleAnalysisCard: React.FC<SubtitleAnalysisCardProps> = ({
  analysis,
  subtitle
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

  const getCharacterUsageColor = () => {
    const percentage = (analysis.characterUsage / analysis.maxCharacters) * 100;
    if (percentage > 100) return 'text-red-400';
    if (percentage > 90) return 'text-yellow-400';
    if (percentage > 70) return 'text-emerald-400';
    return 'text-blue-400';
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-purple-400" />
            <span>Subtitle Analysis</span>
          </div>
          <Badge className={getScoreBadgeColor(analysis.score)}>
            {analysis.score}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Subtitle Display */}
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <div className="text-sm text-zinc-400 mb-1">Current Subtitle</div>
          <div className="text-lg font-semibold text-white">
            {subtitle || 'No subtitle set'}
          </div>
          {subtitle && (
            <div className="text-xs text-zinc-500 mt-1">
              <span className={getCharacterUsageColor()}>
                {analysis.characterUsage}/{analysis.maxCharacters} characters
              </span>
              <span className="ml-2 text-zinc-600">
                ({Math.round((analysis.characterUsage / analysis.maxCharacters) * 100)}% used)
              </span>
            </div>
          )}
        </div>

        {/* Character Usage Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Character Usage</span>
            <span className={`text-sm font-medium ${getCharacterUsageColor()}`}>
              {Math.round((analysis.characterUsage / analysis.maxCharacters) * 100)}%
            </span>
          </div>
          <Progress 
            value={(analysis.characterUsage / analysis.maxCharacters) * 100} 
            className="h-2"
          />
        </div>

        {/* Core Metrics */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Value Proposition</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.valueProposition)}`}>
                {analysis.valueProposition}%
              </span>
            </div>
            <Progress value={analysis.valueProposition} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Feature Highlighting</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.featureHighlighting)}`}>
                {analysis.featureHighlighting}%
              </span>
            </div>
            <Progress value={analysis.featureHighlighting} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Title Complementarity</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.complementarity)}`}>
                {analysis.complementarity}%
              </span>
            </div>
            <Progress value={analysis.complementarity} className="h-2" />
          </div>
        </div>

        {/* Keywords */}
        {analysis.keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">Keywords Found</span>
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

        {/* Complementarity Insights */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Title Alignment</span>
          </div>
          <div className="p-2 bg-zinc-800/30 rounded text-sm text-zinc-300">
            {analysis.complementarity >= 80 
              ? 'Excellent alignment with main title'
              : analysis.complementarity >= 60
              ? 'Good complementarity, minor improvements possible'
              : 'Consider better alignment with main title'
            }
          </div>
        </div>

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

        {/* Recommendations */}
        <div>
          <div className="text-sm font-medium text-zinc-300 mb-2">Recommendations</div>
          <div className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="text-sm text-zinc-400 p-2 bg-zinc-800/30 rounded border-l-2 border-purple-400">
                {rec}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};