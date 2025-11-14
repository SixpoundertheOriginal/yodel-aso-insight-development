import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Target, TrendingUp, AlertTriangle, Lightbulb, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '@/lib/numberFormat';
import type { KeywordStrategyNarrative } from '@/services/narrative-engine.service';
import type { BrandRiskAnalysis } from '@/services/brand-risk-analysis.service';

interface KeywordStrategyPanelProps {
  narrative: KeywordStrategyNarrative | null;
  brandRisk: BrandRiskAnalysis | null;
  keywordScore: number;
  isLoading?: boolean;
}

export const KeywordStrategyPanel: React.FC<KeywordStrategyPanelProps> = ({
  narrative,
  brandRisk,
  keywordScore,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Sparkles className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-zinc-400 text-lg">Generating keyword strategy insights...</p>
          <p className="text-zinc-500 text-sm mt-2">Analyzing clusters and opportunities</p>
        </CardContent>
      </Card>
    );
  }

  if (!narrative) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Target className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">Keyword strategy not available</p>
        </CardContent>
      </Card>
    );
  }

  const scoreColor =
    keywordScore >= 70 ? 'text-green-400' :
    keywordScore >= 50 ? 'text-blue-400' :
    keywordScore >= 30 ? 'text-yellow-400' : 'text-red-400';

  const brandRiskColor =
    !brandRisk || brandRisk.riskLevel === 'LOW' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
    brandRisk.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
    brandRisk.riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
    'bg-red-500/20 text-red-400 border-red-500/30';

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-zinc-900 border-blue-500/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8 text-blue-400" />
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Keyword Strategy
                </CardTitle>
                <CardDescription className="text-zinc-400 mt-1">
                  Strategic analysis of your keyword portfolio
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge className={`text-lg px-4 py-2 ${scoreColor} bg-zinc-800/50 border-zinc-700`}>
                Visibility: {keywordScore}/100
              </Badge>
              {brandRisk && (
                <Badge className={`${brandRiskColor}`}>
                  {brandRisk.riskLevel} Risk
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <p className="text-zinc-300 text-lg leading-relaxed">
              {narrative.strategyOverview}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Brand Dependency Warning (if applicable) */}
      {narrative.brandDependencyWarning && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <AlertDescription className="text-zinc-200 ml-2">
            <strong className="text-yellow-400">Brand Dependency Alert:</strong>{' '}
            {narrative.brandDependencyWarning}
          </AlertDescription>
        </Alert>
      )}

      {/* Brand Risk Details (if available) */}
      {brandRisk && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center space-x-2">
              <AlertTriangle className={`h-5 w-5 ${
                brandRisk.riskLevel === 'LOW' ? 'text-green-400' :
                brandRisk.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                brandRisk.riskLevel === 'HIGH' ? 'text-orange-400' : 'text-red-400'
              }`} />
              <span>Brand Dependency Analysis</span>
            </CardTitle>
            <CardDescription>
              {brandRisk.brandKeywordCount} of {brandRisk.totalKeywords} keywords contain your brand name
              ({formatNumber.ratio(brandRisk.brandDependencyRatio)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-zinc-800/30 rounded-lg p-4">
                <p className="text-zinc-300 leading-relaxed">
                  {brandRisk.impactAssessment}
                </p>
              </div>

              {/* Keyword Distribution */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <div className="text-2xl font-bold text-yodel-orange">
                    {brandRisk.brandKeywordCount}
                  </div>
                  <div className="text-zinc-400 text-sm mt-1">Brand Keywords</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <div className="text-2xl font-bold text-green-400">
                    {brandRisk.genericKeywords.length}
                  </div>
                  <div className="text-zinc-400 text-sm mt-1">Generic Keywords</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cluster Insights */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            <span>Cluster Insights</span>
          </CardTitle>
          <CardDescription>
            What your keyword clusters reveal about positioning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {narrative.clusterInsights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800/70 transition-colors"
              >
                <div className="bg-purple-500/20 rounded-full p-2 flex-shrink-0">
                  <span className="text-purple-400 font-bold text-sm">{index + 1}</span>
                </div>
                <p className="text-zinc-200 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Opportunity Analysis */}
      <Card className="bg-gradient-to-br from-green-500/5 to-zinc-900 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-green-400" />
            <span>Opportunity Analysis</span>
          </CardTitle>
          <CardDescription>
            High-value keywords to target for growth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <p className="text-zinc-300 leading-relaxed whitespace-pre-line">
              {narrative.opportunityAnalysis}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actionable Recommendations */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-yodel-orange" />
            <span>Actionable Recommendations</span>
          </CardTitle>
          <CardDescription>
            Specific steps to improve keyword performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {narrative.actionableRecommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-4 bg-gradient-to-r from-yodel-orange/5 to-transparent rounded-lg border-l-4 border-yodel-orange hover:from-yodel-orange/10 transition-colors"
              >
                <div className="bg-yodel-orange/20 rounded-full p-1.5 flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-yodel-orange" />
                </div>
                <p className="text-zinc-200 leading-relaxed">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Attribution */}
      <div className="flex items-center justify-center space-x-2 text-zinc-500 text-sm">
        <Sparkles className="h-4 w-4" />
        <span>AI-powered keyword strategy analysis</span>
      </div>
    </div>
  );
};
