/**
 * ComboInsightsBlock Component
 *
 * Displays strategic insights for keyword combination optimization.
 * Shows top-performing combos, missing clusters, and actionable recommendations.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, AlertCircle, Target } from 'lucide-react';
import type { ClassifiedCombo, OpportunityInsights } from '@/modules/metadata-scoring';

interface ComboInsightsBlockProps {
  /** Top 5 high-impact combos (score > 75) */
  topCombos: ClassifiedCombo[];
  /** Opportunity analysis results */
  opportunities: OpportunityInsights;
  /** New combo contribution stats */
  newComboContribution: {
    count: number;
    avgImpact: number;
  };
}

export const ComboInsightsBlock: React.FC<ComboInsightsBlockProps> = ({
  topCombos,
  opportunities,
  newComboContribution
}) => {
  return (
    <Card className="bg-gradient-to-br from-purple-900/20 via-indigo-900/20 to-purple-900/20 border-purple-400/30">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-purple-400" />
          <CardTitle className="text-lg">Strategic Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top 5 High-Impact Combos */}
        {topCombos.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-300">
                Strongest Combinations
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {topCombos.slice(0, 5).map((combo, idx) => (
                <Badge
                  key={idx}
                  className="text-xs border-emerald-500 text-emerald-500 bg-emerald-900/10"
                >
                  {combo.combo} ({combo.impactScore})
                </Badge>
              ))}
            </div>
            <p className="text-xs text-purple-300/70 mt-2">
              These combinations have the highest SEO/ASO impact potential
            </p>
          </div>
        )}

        {/* Missing Clusters */}
        {opportunities.missingClusters.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-yellow-400" />
              <p className="text-sm font-medium text-yellow-300">
                Opportunities ({opportunities.missingClusters.length})
              </p>
            </div>
            <div className="space-y-2">
              {opportunities.missingClusters.map((cluster, idx) => (
                <div
                  key={idx}
                  className="bg-yellow-900/20 border border-yellow-400/30 rounded p-2"
                >
                  <p className="text-xs text-yellow-300 font-medium">{cluster}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Potential New Combos */}
        {opportunities.potentialCombos.length > 0 && (
          <div>
            <p className="text-xs text-purple-300 mb-2">
              <strong>Suggested additions:</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {opportunities.potentialCombos.slice(0, 5).map((combo, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs border-purple-400/30 text-purple-300"
                >
                  {combo}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* New from Subtitle Contribution */}
        {newComboContribution.count > 0 && (
          <div className="bg-blue-900/20 border border-blue-400/30 rounded p-3">
            <p className="text-sm text-blue-300">
              <strong>Subtitle Contribution:</strong> Your subtitle adds{' '}
              {newComboContribution.count} new combination
              {newComboContribution.count === 1 ? '' : 's'} with an average impact
              score of {newComboContribution.avgImpact}/100.
            </p>
          </div>
        )}

        {/* Estimated Potential Gain */}
        {opportunities.estimatedGain > 0 && (
          <div className="bg-emerald-900/20 border border-emerald-400/30 rounded p-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <p className="text-sm text-emerald-300">
                <strong>Potential Improvement:</strong> +{opportunities.estimatedGain}
                /100 by addressing missing clusters
              </p>
            </div>
          </div>
        )}

        {/* Actionable Recommendations */}
        {opportunities.actionableInsights.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-indigo-400" />
              <p className="text-sm font-medium text-indigo-300">
                Recommendations
              </p>
            </div>
            <div className="space-y-2">
              {opportunities.actionableInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-indigo-900/20 border border-indigo-400/30 rounded p-2"
                >
                  <p className="text-xs text-indigo-300">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Opportunities (Excellent State) */}
        {opportunities.missingClusters.length === 0 &&
          opportunities.actionableInsights.length === 0 && (
            <div className="bg-emerald-900/20 border border-emerald-400/30 rounded p-3">
              <p className="text-sm text-emerald-300">
                <strong>Excellent!</strong> Your metadata covers all major semantic
                clusters with strong combination coverage.
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  );
};
