/**
 * Search Intent Coverage Card
 *
 * Displays intent intelligence data for Title or Subtitle elements.
 * Shows intent distribution, coverage score, and keyword groupings by intent type.
 *
 * Phase 4: UI Integration for Autocomplete Intelligence
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, Target, TrendingUp, Search, ShoppingCart } from 'lucide-react';
import type { IntentSignals } from '@/services/intent-intelligence.service';

interface SearchIntentCoverageCardProps {
  /** Intent signals data from useIntentCoverage hook */
  intentSignals: IntentSignals;

  /** Element type (for display name) */
  elementType: 'title' | 'subtitle';

  /** Keywords for this element */
  keywords: string[];
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
      return 'border-purple-400/30 text-purple-400';
    case 'informational':
      return 'border-blue-400/30 text-blue-400';
    case 'commercial':
      return 'border-emerald-400/30 text-emerald-400';
    case 'transactional':
      return 'border-orange-400/30 text-orange-400';
    default:
      return 'border-zinc-400/30 text-zinc-400';
  }
}

/**
 * Get coverage score color
 */
function getCoverageScoreColor(score: number): string {
  if (score >= 75) return 'border-emerald-400/30 text-emerald-400';
  if (score >= 50) return 'border-yellow-400/30 text-yellow-400';
  return 'border-red-400/30 text-red-400';
}

/**
 * SearchIntentCoverageCard Component
 */
export const SearchIntentCoverageCard: React.FC<SearchIntentCoverageCardProps> = ({
  intentSignals,
  elementType,
  keywords,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const elementDisplayName = elementType === 'title' ? 'Title' : 'Subtitle';

  // Get dominant intent
  const dominantIntent = intentSignals.dominantIntent || 'unknown';
  const DominantIcon = getIntentIcon(dominantIntent);

  // Get coverage score (0-100)
  const coverageScore = intentSignals.coverageScore || 0;
  const coverageColor = getCoverageScoreColor(coverageScore);

  // Get intent distribution
  const distribution = intentSignals.intentDistribution || {
    navigational: 0,
    informational: 0,
    commercial: 0,
    transactional: 0,
  };

  // Group keywords by intent type (for display)
  const navigationalKeywords = intentSignals.navigationalKeywords || [];
  const informationalKeywords = intentSignals.informationalKeywords || [];
  const commercialKeywords = intentSignals.commercialKeywords || [];
  const transactionalKeywords = intentSignals.transactionalKeywords || [];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader
        className="cursor-pointer hover:bg-zinc-800/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DominantIcon className="h-4 w-4" />
              {elementDisplayName} Search Intent Coverage
            </CardTitle>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-400" />
            )}
          </div>
          <Badge variant="outline" className={`text-sm px-3 py-1 ${coverageColor}`}>
            {coverageScore}/100
          </Badge>
        </div>

        {/* Coverage progress bar */}
        <Progress value={coverageScore} className="h-2 mt-2" />
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-5 pt-6">
          {/* Dominant Intent Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 uppercase">Dominant Intent:</span>
            <Badge
              variant="outline"
              className={`text-sm ${getIntentBadgeColor(dominantIntent)}`}
            >
              <DominantIcon className="h-3 w-3 mr-1.5" />
              {dominantIntent.charAt(0).toUpperCase() + dominantIntent.slice(1)}
            </Badge>
          </div>

          {/* Intent Distribution Grid */}
          <div>
            <div className="text-sm font-medium text-zinc-300 mb-3">
              Intent Distribution
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Navigational */}
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3 w-3 text-purple-400" />
                  <div className="text-xs text-zinc-500 uppercase">Navigational</div>
                </div>
                <div className="text-lg font-bold text-purple-400">
                  {Math.round(distribution.navigational)}%
                </div>
                <p className="text-xs text-zinc-500 mt-1">Brand searches</p>
              </div>

              {/* Informational */}
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-2 mb-1">
                  <Search className="h-3 w-3 text-blue-400" />
                  <div className="text-xs text-zinc-500 uppercase">Informational</div>
                </div>
                <div className="text-lg font-bold text-blue-400">
                  {Math.round(distribution.informational)}%
                </div>
                <p className="text-xs text-zinc-500 mt-1">Discovery/learning</p>
              </div>

              {/* Commercial */}
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <div className="text-xs text-zinc-500 uppercase">Commercial</div>
                </div>
                <div className="text-lg font-bold text-emerald-400">
                  {Math.round(distribution.commercial)}%
                </div>
                <p className="text-xs text-zinc-500 mt-1">Comparison/evaluation</p>
              </div>

              {/* Transactional */}
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="h-3 w-3 text-orange-400" />
                  <div className="text-xs text-zinc-500 uppercase">Transactional</div>
                </div>
                <div className="text-lg font-bold text-orange-400">
                  {Math.round(distribution.transactional)}%
                </div>
                <p className="text-xs text-zinc-500 mt-1">Download intent</p>
              </div>
            </div>
          </div>

          {/* Keywords Grouped by Intent */}
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            <div className="text-sm font-medium text-zinc-300">
              Keywords by Intent Type
            </div>

            {/* Navigational Keywords */}
            {navigationalKeywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-purple-400" />
                  <span className="text-xs text-zinc-400 uppercase">
                    Navigational ({navigationalKeywords.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {navigationalKeywords.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs border-purple-400/30 text-purple-400"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Informational Keywords */}
            {informationalKeywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-zinc-400 uppercase">
                    Informational ({informationalKeywords.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {informationalKeywords.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs border-blue-400/30 text-blue-400"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Commercial Keywords */}
            {commercialKeywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-zinc-400 uppercase">
                    Commercial ({commercialKeywords.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {commercialKeywords.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs border-emerald-400/30 text-emerald-400"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Transactional Keywords */}
            {transactionalKeywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-orange-400" />
                  <span className="text-xs text-zinc-400 uppercase">
                    Transactional ({transactionalKeywords.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {transactionalKeywords.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs border-orange-400/30 text-orange-400"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {navigationalKeywords.length === 0 &&
              informationalKeywords.length === 0 &&
              commercialKeywords.length === 0 &&
              transactionalKeywords.length === 0 && (
                <div className="text-sm text-zinc-500 italic">
                  No intent data available for these keywords.
                </div>
              )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
