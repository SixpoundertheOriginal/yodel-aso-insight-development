import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import type { BrandRiskAnalysis } from '@/services/brand-risk-analysis.service';

interface CompactKeywordSummaryProps {
  keywordScore: number;
  brandRisk: BrandRiskAnalysis | null;
  topClusters: Array<{
    clusterName: string;
    primaryKeyword: string;
    relatedKeywords: string[];
    opportunityScore: number;
  }>;
  highOpportunityCount: number;
}

export const CompactKeywordSummary: React.FC<CompactKeywordSummaryProps> = ({
  keywordScore,
  brandRisk,
  topClusters,
  highOpportunityCount
}) => {
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
    <div className="space-y-4">
      {/* Score Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 mb-1">Visibility Score</p>
            <p className={`text-3xl font-bold ${scoreColor}`}>{keywordScore}/100</p>
          </CardContent>
        </Card>

        {brandRisk && (
          <>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-400 mb-1">Brand Dependency</p>
                <p className="text-3xl font-bold text-foreground">
                  {(brandRisk.brandDependencyRatio * 100).toFixed(0)}%
                </p>
                <Badge className={`mt-1 text-xs ${brandRiskColor}`}>
                  {brandRisk.riskLevel}
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-400 mb-1">High Opportunities</p>
                <p className="text-3xl font-bold text-green-400">{highOpportunityCount}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Brand Risk Warning */}
      {brandRisk && brandRisk.riskLevel !== 'LOW' && (
        <Card className="bg-yellow-500/5 border-yellow-500/30">
          <CardContent className="p-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-400 mb-1">Brand Dependency Alert</p>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {brandRisk.impactAssessment.slice(0, 200)}...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Clusters */}
      {topClusters.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-zinc-400 flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Top Keyword Clusters</span>
          </p>
          {topClusters.slice(0, 3).map((cluster, index) => (
            <Card key={index} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium text-foreground">{cluster.clusterName}</p>
                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                    {(cluster.opportunityScore * 100).toFixed(0)}% Opportunity
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400">
                  Primary: <span className="text-zinc-300">{cluster.primaryKeyword}</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  +{cluster.relatedKeywords.length} related keywords
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
