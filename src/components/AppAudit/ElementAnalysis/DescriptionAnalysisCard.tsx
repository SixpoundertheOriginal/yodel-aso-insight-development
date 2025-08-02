import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlignLeft, Zap, BookOpen, MousePointer, Users } from 'lucide-react';
import { DescriptionAnalysis } from '@/services/app-element-analysis.service';

interface DescriptionAnalysisCardProps {
  analysis: DescriptionAnalysis;
  description: string;
}

export const DescriptionAnalysisCard: React.FC<DescriptionAnalysisCardProps> = ({
  analysis,
  description
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

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <AlignLeft className="h-5 w-5 text-orange-400" />
            <span>Description Analysis</span>
          </div>
          <Badge className={getScoreBadgeColor(analysis.score)}>
            {analysis.score}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Description Preview */}
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <div className="text-sm text-zinc-400 mb-1">Current Description</div>
          <div className="text-sm text-zinc-300 leading-relaxed">
            {description ? truncateText(description) : 'No description available'}
          </div>
          {description && description.length > 150 && (
            <div className="text-xs text-zinc-500 mt-2">
              Showing first 150 characters of {description.length} total
            </div>
          )}
        </div>

        {/* Core Metrics */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Hook Strength</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(analysis.hookStrength)}`}>
                {analysis.hookStrength}%
              </span>
            </div>
            <Progress value={analysis.hookStrength} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Feature Mentions</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(analysis.featureMentions)}`}>
                {analysis.featureMentions}%
              </span>
            </div>
            <Progress value={analysis.featureMentions} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Call-to-Action</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(analysis.callToActionStrength)}`}>
                {analysis.callToActionStrength}%
              </span>
            </div>
            <Progress value={analysis.callToActionStrength} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Readability</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.readabilityScore)}`}>
                {analysis.readabilityScore}%
              </span>
            </div>
            <Progress value={analysis.readabilityScore} className="h-2" />
          </div>
        </div>

        {/* Keywords */}
        {analysis.keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-zinc-400">Keywords Found</span>
              <Badge variant="outline" className="text-xs text-zinc-400">
                {analysis.keywords.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
              {analysis.keywords.slice(0, 10).map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs text-zinc-300 border-zinc-600">
                  {keyword}
                </Badge>
              ))}
              {analysis.keywords.length > 10 && (
                <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
                  +{analysis.keywords.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Competitive Gaps */}
        {analysis.competitiveGaps.length > 0 && (
          <div>
            <div className="text-sm text-zinc-400 mb-2">Competitive Opportunities</div>
            <div className="space-y-1">
              {analysis.competitiveGaps.map((gap, index) => (
                <div key={index} className="text-sm text-zinc-300 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                  {gap}
                </div>
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

        {/* Recommendations */}
        <div>
          <div className="text-sm font-medium text-zinc-300 mb-2">Recommendations</div>
          <div className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="text-sm text-zinc-400 p-2 bg-zinc-800/30 rounded border-l-2 border-orange-400">
                {rec}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};