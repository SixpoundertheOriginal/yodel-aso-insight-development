import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, TrendingUp, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import type { ExecutiveSummaryNarrative } from '@/services/narrative-engine.service';

interface ExecutiveSummaryPanelProps {
  narrative: ExecutiveSummaryNarrative | null;
  overallScore: number;
  isLoading?: boolean;
}

export const ExecutiveSummaryPanel: React.FC<ExecutiveSummaryPanelProps> = ({
  narrative,
  overallScore,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Sparkles className="h-12 w-12 text-yodel-orange mx-auto mb-4 animate-pulse" />
          <p className="text-zinc-400 text-lg">Generating AI-powered executive summary...</p>
          <p className="text-zinc-500 text-sm mt-2">Analyzing audit data and market context</p>
        </CardContent>
      </Card>
    );
  }

  if (!narrative) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">Executive summary not available</p>
          <p className="text-zinc-500 text-sm mt-2">Unable to generate narrative insights at this time</p>
        </CardContent>
      </Card>
    );
  }

  const scoreColor =
    overallScore >= 80 ? 'text-green-400' :
    overallScore >= 60 ? 'text-blue-400' :
    overallScore >= 40 ? 'text-yellow-400' : 'text-red-400';

  const scoreBadgeColor =
    overallScore >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
    overallScore >= 60 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
    overallScore >= 40 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
    'bg-red-500/20 text-red-400 border-red-500/30';

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-yodel-orange/10 to-zinc-900 border-yodel-orange/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-yodel-orange" />
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Executive Summary
                </CardTitle>
                <CardDescription className="text-zinc-400 mt-1">
                  AI-powered analysis of your ASO audit
                </CardDescription>
              </div>
            </div>
            <Badge className={`text-lg px-4 py-2 ${scoreBadgeColor}`}>
              {overallScore}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <h3 className={`text-2xl font-bold ${scoreColor} mb-2`}>
              {narrative.headline}
            </h3>
            <p className="text-zinc-300 text-lg leading-relaxed">
              {narrative.overviewParagraph}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Findings Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <span>Key Findings</span>
          </CardTitle>
          <CardDescription>
            Critical insights from comprehensive ASO analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {narrative.keyFindings.map((finding, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800/70 transition-colors"
              >
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-zinc-200 leading-relaxed">{finding}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Priority Recommendation Card */}
      <Card className="bg-gradient-to-br from-yodel-orange/5 to-zinc-900 border-yodel-orange/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yodel-orange" />
            <span>Priority Recommendation</span>
          </CardTitle>
          <CardDescription>
            The single most impactful action to take now
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-900/50 rounded-lg p-6 border-l-4 border-yodel-orange">
            <p className="text-zinc-100 text-lg font-medium leading-relaxed">
              {narrative.priorityRecommendation}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Market Context Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <span>Market Context</span>
          </CardTitle>
          <CardDescription>
            Category landscape and competitive dynamics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-800/30 rounded-lg p-6">
            <p className="text-zinc-300 leading-relaxed">
              {narrative.marketContext}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Attribution */}
      <div className="flex items-center justify-center space-x-2 text-zinc-500 text-sm">
        <Sparkles className="h-4 w-4" />
        <span>Powered by AI • Generated from comprehensive audit data</span>
      </div>
    </div>
  );
};
