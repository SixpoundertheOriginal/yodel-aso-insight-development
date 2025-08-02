import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Image, Eye, Palette, Users, Zap } from 'lucide-react';
import { ScreenshotAnalysis } from '@/services/app-element-analysis.service';

interface ScreenshotAnalysisCardProps {
  analysis: ScreenshotAnalysis;
  screenshotUrls?: string[];
}

export const ScreenshotAnalysisCard: React.FC<ScreenshotAnalysisCardProps> = ({
  analysis,
  screenshotUrls = []
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
            <Image className="h-5 w-5 text-pink-400" />
            <span>Screenshot Analysis</span>
          </div>
          <Badge className={getScoreBadgeColor(analysis.score)}>
            {analysis.score}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Screenshots Preview */}
        {screenshotUrls.length > 0 && (
          <div>
            <div className="text-sm text-zinc-400 mb-2">Screenshots ({screenshotUrls.length})</div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {screenshotUrls.slice(0, 3).map((url, index) => (
                <div key={index} className="flex-shrink-0">
                  <img
                    src={url}
                    alt={`Screenshot ${index + 1}`}
                    className="w-16 h-28 object-cover rounded border border-zinc-700"
                  />
                </div>
              ))}
              {screenshotUrls.length > 3 && (
                <div className="flex-shrink-0 w-16 h-28 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center">
                  <span className="text-xs text-zinc-400">+{screenshotUrls.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Core Metrics */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Visual Messaging</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(analysis.visualMessaging)}`}>
                {analysis.visualMessaging}%
              </span>
            </div>
            <Progress value={analysis.visualMessaging} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Feature Presentation</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(analysis.featurePresentation)}`}>
                {analysis.featurePresentation}%
              </span>
            </div>
            <Progress value={analysis.featurePresentation} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Color Psychology</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(analysis.colorPsychology)}`}>
                {analysis.colorPsychology}%
              </span>
            </div>
            <Progress value={analysis.colorPsychology} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Text Readability</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.textReadability)}`}>
                {analysis.textReadability}%
              </span>
            </div>
            <Progress value={analysis.textReadability} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Conversion Elements</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.conversionElements)}`}>
                {analysis.conversionElements}%
              </span>
            </div>
            <Progress value={analysis.conversionElements} className="h-2" />
          </div>
        </div>

        {/* Visual Analysis Insights */}
        <div>
          <div className="text-sm text-zinc-400 mb-2">Visual Analysis</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-zinc-800/30 rounded">
              <div className="text-zinc-500 mb-1">Messaging</div>
              <div className="text-zinc-300">
                {analysis.visualMessaging >= 80 ? 'Clear & Compelling' :
                 analysis.visualMessaging >= 60 ? 'Good Clarity' : 'Needs Improvement'}
              </div>
            </div>
            <div className="p-2 bg-zinc-800/30 rounded">
              <div className="text-zinc-500 mb-1">Features</div>
              <div className="text-zinc-300">
                {analysis.featurePresentation >= 80 ? 'Well Highlighted' :
                 analysis.featurePresentation >= 60 ? 'Adequately Shown' : 'Unclear Presentation'}
              </div>
            </div>
            <div className="p-2 bg-zinc-800/30 rounded">
              <div className="text-zinc-500 mb-1">Colors</div>
              <div className="text-zinc-300">
                {analysis.colorPsychology >= 80 ? 'Psychologically Effective' :
                 analysis.colorPsychology >= 60 ? 'Good Choice' : 'Could Be Optimized'}
              </div>
            </div>
            <div className="p-2 bg-zinc-800/30 rounded">
              <div className="text-zinc-500 mb-1">Readability</div>
              <div className="text-zinc-300">
                {analysis.textReadability >= 80 ? 'Highly Readable' :
                 analysis.textReadability >= 60 ? 'Readable' : 'Hard to Read'}
              </div>
            </div>
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
              <div key={index} className="text-sm text-zinc-400 p-2 bg-zinc-800/30 rounded border-l-2 border-pink-400">
                {rec}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};