import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Shield, Award, Maximize, Users, TestTube } from 'lucide-react';
import { IconAnalysis } from '@/services/app-element-analysis.service';

interface IconAnalysisCardProps {
  analysis: IconAnalysis;
  iconUrl?: string;
  appName?: string;
}

export const IconAnalysisCard: React.FC<IconAnalysisCardProps> = ({
  analysis,
  iconUrl,
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
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <span>Icon Analysis</span>
          </div>
          <Badge className={getScoreBadgeColor(analysis.score)}>
            {analysis.score}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Icon Display */}
        <div className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
          {iconUrl ? (
            <div className="flex gap-3 items-center">
              <img
                src={iconUrl}
                alt={`${appName} icon`}
                className="w-16 h-16 rounded-xl border border-zinc-700"
              />
              <img
                src={iconUrl}
                alt={`${appName} icon small`}
                className="w-8 h-8 rounded-lg border border-zinc-700"
              />
              <img
                src={iconUrl}
                alt={`${appName} icon tiny`}
                className="w-4 h-4 rounded border border-zinc-700"
              />
            </div>
          ) : (
            <div className="w-16 h-16 bg-zinc-800 rounded-xl border border-zinc-700 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-zinc-500" />
            </div>
          )}
          <div>
            <div className="text-sm text-zinc-400">App Icon Preview</div>
            <div className="text-xs text-zinc-500 mt-1">
              Different sizes show scalability
            </div>
          </div>
        </div>

        {/* Core Metrics */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Brand Recognition</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(analysis.brandRecognition)}`}>
                {analysis.brandRecognition}%
              </span>
            </div>
            <Progress value={analysis.brandRecognition} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Category Fit</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(analysis.categoryAppropriateness)}`}>
                {analysis.categoryAppropriateness}%
              </span>
            </div>
            <Progress value={analysis.categoryAppropriateness} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Visual Distinctiveness</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(analysis.visualDistinctiveness)}`}>
                {analysis.visualDistinctiveness}%
              </span>
            </div>
            <Progress value={analysis.visualDistinctiveness} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Maximize className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Scalability</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(analysis.scalability)}`}>
                {analysis.scalability}%
              </span>
            </div>
            <Progress value={analysis.scalability} className="h-2" />
          </div>
        </div>

        {/* Icon Quality Assessment */}
        <div>
          <div className="text-sm text-zinc-400 mb-2">Quality Assessment</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-zinc-800/30 rounded">
              <div className="text-zinc-500 mb-1">Brand</div>
              <div className="text-zinc-300">
                {analysis.brandRecognition >= 80 ? 'Strong Identity' :
                 analysis.brandRecognition >= 60 ? 'Good Recognition' : 'Weak Branding'}
              </div>
            </div>
            <div className="p-2 bg-zinc-800/30 rounded">
              <div className="text-zinc-500 mb-1">Category</div>
              <div className="text-zinc-300">
                {analysis.categoryAppropriateness >= 80 ? 'Perfect Fit' :
                 analysis.categoryAppropriateness >= 60 ? 'Good Match' : 'Poor Alignment'}
              </div>
            </div>
            <div className="p-2 bg-zinc-800/30 rounded">
              <div className="text-zinc-500 mb-1">Uniqueness</div>
              <div className="text-zinc-300">
                {analysis.visualDistinctiveness >= 80 ? 'Highly Distinctive' :
                 analysis.visualDistinctiveness >= 60 ? 'Moderately Unique' : 'Generic Design'}
              </div>
            </div>
            <div className="p-2 bg-zinc-800/30 rounded">
              <div className="text-zinc-500 mb-1">Scalability</div>
              <div className="text-zinc-300">
                {analysis.scalability >= 80 ? 'Excellent' :
                 analysis.scalability >= 60 ? 'Good' : 'Poor'}
              </div>
            </div>
          </div>
        </div>

        {/* A/B Testing Opportunities */}
        {analysis.abTestingOpportunities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TestTube className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">A/B Test Ideas</span>
            </div>
            <div className="space-y-1">
              {analysis.abTestingOpportunities.map((opportunity, index) => (
                <div key={index} className="text-sm text-zinc-300 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
                  {opportunity}
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
              <div key={index} className="text-sm text-zinc-400 p-2 bg-zinc-800/30 rounded border-l-2 border-cyan-400">
                {rec}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};