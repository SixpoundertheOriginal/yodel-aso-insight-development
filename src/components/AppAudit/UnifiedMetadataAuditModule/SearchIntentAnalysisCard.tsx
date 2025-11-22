/**
 * Search Intent Analysis Card
 *
 * Displays aggregated intent intelligence for all keywords (title + subtitle).
 * Shows intent clusters, distribution, and recommendations.
 *
 * Phase 4: UI Integration for Autocomplete Intelligence
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  Search,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';
import type { IntentCluster, IntentAuditSignals } from '@/services/intent-intelligence.service';
import type { EnrichedIntentCluster } from '@/services/brand-intelligence.service';

interface SearchIntentAnalysisCardProps {
  /** Intent clusters from useIntentIntelligence hook (may be EnrichedIntentCluster in Phase 5) */
  clusters: IntentCluster[] | EnrichedIntentCluster[];

  /** Audit signals from useIntentIntelligence hook */
  auditSignals: IntentAuditSignals | null;

  /** Total unique keywords analyzed */
  totalKeywords: number;
}

/**
 * Get icon for intent type
 */
function getIntentIcon(intentType: string) {
  switch (intentType) {
    case 'navigational':
      return Target;
    case 'informational':
      return Search;
    case 'commercial':
      return TrendingUp;
    case 'transactional':
      return ShoppingCart;
    default:
      return Target;
  }
}

/**
 * Get badge color for intent type
 */
function getIntentBadgeColor(intentType: string): string {
  switch (intentType) {
    case 'navigational':
      return 'border-purple-400/30 text-purple-400 bg-purple-900/10';
    case 'informational':
      return 'border-blue-400/30 text-blue-400 bg-blue-900/10';
    case 'commercial':
      return 'border-emerald-400/30 text-emerald-400 bg-emerald-900/10';
    case 'transactional':
      return 'border-orange-400/30 text-orange-400 bg-orange-900/10';
    default:
      return 'border-zinc-400/30 text-zinc-400 bg-zinc-900/10';
  }
}

/**
 * Get diversity score color
 */
function getDiversityScoreColor(score: number): string {
  if (score >= 75) return 'border-emerald-400/30 text-emerald-400';
  if (score >= 50) return 'border-yellow-400/30 text-yellow-400';
  return 'border-red-400/30 text-red-400';
}

/**
 * SearchIntentAnalysisCard Component
 */
export const SearchIntentAnalysisCard: React.FC<SearchIntentAnalysisCardProps> = ({
  clusters,
  auditSignals,
  totalKeywords,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  // Get intent diversity score (0-100)
  const intentDiversity = auditSignals?.intentDiversity || 0;
  const diversityColor = getDiversityScoreColor(intentDiversity);

  // Sort clusters by count (descending)
  const sortedClusters = [...clusters].sort((a, b) => b.count - a.count);

  // Get recommendations
  const recommendations = auditSignals?.recommendations || [];

  // Phase 5: Brand Intelligence Summary
  // Check if clusters are enriched with brand data
  const isEnriched = AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED && sortedClusters.length > 0 && 'brandKeywords' in sortedClusters[0];
  let totalBrandKeywords = 0;
  let totalGenericKeywords = 0;
  let totalCompetitorKeywords = 0;

  if (isEnriched) {
    sortedClusters.forEach((cluster) => {
      const enriched = cluster as EnrichedIntentCluster;
      totalBrandKeywords += enriched.brandKeywords?.length || 0;
      totalGenericKeywords += enriched.genericKeywords?.length || 0;
      totalCompetitorKeywords += enriched.competitorKeywords?.length || 0;
    });
  }

  return (
    <Card className="relative bg-black/60 backdrop-blur-lg border-zinc-700/70 border-2 border-dashed hover:border-orange-500/40 transition-all duration-300">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-400/60" />
      
      <CardHeader
        className="cursor-pointer hover:bg-zinc-800/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-normal tracking-wide uppercase text-zinc-300 flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-400" />
              SEARCH INTENT INTELLIGENCE
            </CardTitle>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-400" />
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-400">
              {totalKeywords} keywords analyzed
            </div>
            {/* Phase 5: Brand presence summary */}
            {isEnriched && (totalBrandKeywords > 0 || totalCompetitorKeywords > 0) && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span>
                  {totalBrandKeywords} brand • {totalGenericKeywords} generic
                  {totalCompetitorKeywords > 0 && (
                    <span className="text-orange-400"> • {totalCompetitorKeywords} competitor</span>
                  )}
                </span>
              </div>
            )}
            <Badge variant="outline" className={`text-sm px-3 py-1 ${diversityColor}`}>
              Diversity: {intentDiversity}/100
            </Badge>
          </div>
        </div>

        {/* Diversity progress bar */}
        <Progress value={intentDiversity} className="h-2 mt-2" />
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 pt-6">
          {/* Intent Clusters */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-zinc-300">
                Intent Distribution ({sortedClusters.length} types detected)
              </span>
            </div>

            <div className="space-y-3">
              {sortedClusters.map((cluster) => {
                const Icon = getIntentIcon(cluster.intent_type);
                const badgeColor = getIntentBadgeColor(cluster.intent_type);
                const percentage = totalKeywords > 0 ? Math.round((cluster.count / totalKeywords) * 100) : 0;

                return (
                  <div key={cluster.intent_type} className="space-y-2">
                    {/* Cluster Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium text-zinc-300 capitalize">
                          {cluster.intent_type}
                        </span>
                        <Badge variant="outline" className={`text-xs ${badgeColor}`}>
                          {cluster.count} keywords • {percentage}%
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-500">
                        Avg confidence: {Math.round((cluster as any).avgConfidence || (cluster as any).avg_confidence || 0)}%
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <Progress value={percentage} className="h-1.5" />

                    {/* Keywords (collapsed by default) */}
                    {showAllKeywords && cluster.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 pl-6 pt-1">
                        {cluster.keywords.map((keyword, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={`text-xs ${badgeColor}`}
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty State */}
              {sortedClusters.length === 0 && (
                <div className="text-sm text-zinc-500 italic py-4">
                  No intent data available. Intent intelligence is disabled or no keywords were analyzed.
                </div>
              )}
            </div>

            {/* Toggle All Keywords */}
            {sortedClusters.length > 0 && (
              <div className="pt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllKeywords(!showAllKeywords);
                  }}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  {showAllKeywords ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span>{showAllKeywords ? 'Hide' : 'Show'} all keywords by intent</span>
                </button>
              </div>
            )}
          </div>

          {/* Intent Signals Summary */}
          {auditSignals && (
            <div className="pt-4 border-t border-zinc-800">
              <div className="text-sm font-medium text-zinc-300 mb-3">
                Intent Signals Summary
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Brand Keywords */}
                <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-3 w-3 text-purple-400" />
                    <div className="text-xs text-zinc-500 uppercase">Brand</div>
                  </div>
                  <div className="text-lg font-bold text-purple-400">
                    {auditSignals.brandKeywordCount}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Navigational</p>
                </div>

                {/* Discovery Keywords */}
                <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="h-3 w-3 text-blue-400" />
                    <div className="text-xs text-zinc-500 uppercase">Discovery</div>
                  </div>
                  <div className="text-lg font-bold text-blue-400">
                    {auditSignals.discoveryKeywordCount}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Info + Commercial</p>
                </div>

                {/* Conversion Keywords */}
                <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-3 w-3 text-orange-400" />
                    <div className="text-xs text-zinc-500 uppercase">Conversion</div>
                  </div>
                  <div className="text-lg font-bold text-orange-400">
                    {auditSignals.conversionKeywordCount}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Transactional</p>
                </div>

                {/* Intent Diversity */}
                <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <div className="text-xs text-zinc-500 uppercase">Diversity</div>
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    {auditSignals.intentDiversity}/100
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Balance score</p>
                </div>
              </div>
            </div>
          )}

          {/* Strategic Recommendations */}
          {recommendations.length > 0 && (
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">
                  Intent Recommendations ({recommendations.length})
                </span>
              </div>
              <div className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 bg-orange-900/10 rounded border border-orange-400/20"
                  >
                    <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-300">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success State */}
          {recommendations.length === 0 && auditSignals && intentDiversity >= 50 && (
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-start gap-2 p-3 bg-emerald-900/10 rounded border border-emerald-400/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-400 mb-1">
                    Good Intent Diversity
                  </p>
                  <p className="text-sm text-zinc-300">
                    Your keywords cover multiple stages of the user journey. This helps reach both
                    brand-aware and discovery users.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
