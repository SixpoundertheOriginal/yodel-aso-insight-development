/**
 * Search Intent Coverage Card
 *
 * Displays intent intelligence data for Title or Subtitle elements.
 * Shows intent distribution, coverage score, and keyword groupings by intent type.
 *
 * Phase 17: Bible-driven Search Intent Coverage
 * - Primary: Uses Bible Intent Engine patterns (intentCoverage from audit result)
 * - Fallback: Legacy Autocomplete Intelligence (for migration compatibility)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, Target, TrendingUp, Search, ShoppingCart, AlertCircle, Brain } from 'lucide-react';
import type { IntentSignals } from '@/services/intent-intelligence.service';
import type { SearchIntentCoverageResult } from '@/engine/asoBible/searchIntentCoverageEngine';
import { AUTOCOMPLETE_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';

interface SearchIntentCoverageCardProps {
  /** Bible-driven coverage data (Phase 17 - PRIMARY) */
  bibleCoverage?: SearchIntentCoverageResult;

  /** Intent signals data from useIntentCoverage hook (LEGACY - Fallback) */
  intentSignals?: IntentSignals;

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
  bibleCoverage,
  intentSignals,
  elementType,
  keywords,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const elementDisplayName = elementType === 'title' ? 'Title' : 'Subtitle';

  // Phase 17: Prefer Bible-driven coverage, fall back to legacy Autocomplete Intelligence
  const usingBibleCoverage = !!bibleCoverage;

  // Get coverage score (0-100)
  let coverageScore = 0;
  let distribution = {
    navigational: 0,
    informational: 0,
    commercial: 0,
    transactional: 0,
  };
  let navigationalKeywords: string[] = [];
  let informationalKeywords: string[] = [];
  let commercialKeywords: string[] = [];
  let transactionalKeywords: string[] = [];
  let dominantIntent = 'unknown';
  let fallbackMode = false;

  if (usingBibleCoverage) {
    // Phase 17: Use Bible-driven coverage
    coverageScore = bibleCoverage.score;
    distribution = {
      navigational: bibleCoverage.distributionPercentage.navigational,
      informational: bibleCoverage.distributionPercentage.informational,
      commercial: bibleCoverage.distributionPercentage.commercial,
      transactional: bibleCoverage.distributionPercentage.transactional,
    };
    fallbackMode = bibleCoverage.fallbackMode;

    // Group tokens by intent type
    navigationalKeywords = bibleCoverage.classifiedTokensList
      .filter(t => t.intentType === 'navigational')
      .map(t => t.token);
    informationalKeywords = bibleCoverage.classifiedTokensList
      .filter(t => t.intentType === 'informational')
      .map(t => t.token);
    commercialKeywords = bibleCoverage.classifiedTokensList
      .filter(t => t.intentType === 'commercial')
      .map(t => t.token);
    transactionalKeywords = bibleCoverage.classifiedTokensList
      .filter(t => t.intentType === 'transactional')
      .map(t => t.token);

    // Determine dominant intent from distribution
    const intentCounts = [
      { type: 'navigational' as const, count: bibleCoverage.distribution.navigational },
      { type: 'informational' as const, count: bibleCoverage.distribution.informational },
      { type: 'commercial' as const, count: bibleCoverage.distribution.commercial },
      { type: 'transactional' as const, count: bibleCoverage.distribution.transactional },
    ];
    const sorted = intentCounts.sort((a, b) => b.count - a.count);
    dominantIntent = sorted[0].count > 0 ? sorted[0].type : 'unknown';
  } else if (intentSignals) {
    // Legacy: Use Autocomplete Intelligence
    dominantIntent = intentSignals.dominantIntent || 'unknown';
    coverageScore = intentSignals.coverageScore || 0;
    distribution = intentSignals.intentDistribution || distribution;
    navigationalKeywords = intentSignals.navigationalKeywords || [];
    informationalKeywords = intentSignals.informationalKeywords || [];
    commercialKeywords = intentSignals.commercialKeywords || [];
    transactionalKeywords = intentSignals.transactionalKeywords || [];
  }

  const DominantIcon = getIntentIcon(dominantIntent);
  const coverageColor = getCoverageScoreColor(coverageScore);

  // Detect empty states
  const hasIntentData =
    navigationalKeywords.length > 0 ||
    informationalKeywords.length > 0 ||
    commercialKeywords.length > 0 ||
    transactionalKeywords.length > 0;

  // ENGINE FAILURE: Keywords exist but no intent data returned (registry empty or Edge Function failed)
  const engineFailure = keywords.length > 0 && !hasIntentData && coverageScore === 0;

  // GENUINE NO INTENT: Engine worked but found no intent keywords
  const noIntentDetected = keywords.length > 0 && !hasIntentData && !engineFailure;

  return (
    <Card className="relative bg-black/60 backdrop-blur-lg border-zinc-700/70 border-2 border-dashed">
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
          <div className="flex items-center gap-2">
            {/* Phase 17: Bible Engine Indicator */}
            {usingBibleCoverage && (
              <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400">
                <Brain className="h-3 w-3 mr-1" />
                Bible
              </Badge>
            )}
            {/* Fallback Mode Warning */}
            {fallbackMode && (
              <Badge variant="outline" className="text-xs border-yellow-400/30 text-yellow-400">
                Minimal Patterns
              </Badge>
            )}
            {/* Coverage Score */}
            <Badge variant="outline" className={`text-sm px-3 py-1 ${coverageColor}`}>
              {coverageScore}/100
            </Badge>
          </div>
        </div>

        {/* Coverage progress bar */}
        <Progress value={coverageScore} className="h-2 mt-2" />
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-5 pt-6">
          {/* STATE A: ENGINE FAILURE (ALWAYS VISIBLE) */}
          {engineFailure && (
            <div className="p-4 bg-red-900/10 border-l-4 border-l-red-500 border border-red-400/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-400 mb-2 tracking-wide">
                    No Intent Data Available
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                    We could not classify your {elementDisplayName.toLowerCase()} keywords with the current intent engine.
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mb-1.5 font-medium">
                    This may indicate:
                  </p>
                  <ul className="text-[11px] text-zinc-400 leading-relaxed space-y-1 ml-4 list-disc">
                    <li>Empty <code className="text-red-300 font-mono text-[10px]">search_intent_registry</code> database table</li>
                    <li>Edge Function connectivity issues</li>
                    <li>Keywords too generic/specific to classify</li>
                  </ul>
                  <p className="text-[10px] text-zinc-500 mt-3 italic">
                    💡 Check browser console for detailed diagnostic logs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STATE B: GENUINE NO INTENT DETECTED */}
          {noIntentDetected && (
            <div className="p-4 bg-yellow-900/10 border-l-4 border-l-yellow-500 border border-yellow-400/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-400 mb-2 tracking-wide">
                    No Search Intent Found
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                    Your {elementDisplayName.toLowerCase()} metadata does not contain discovery, commercial, transactional or learning keywords.
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    💡 Consider adding phrases like <span className="text-yellow-300 font-medium">'learn spanish'</span>, <span className="text-yellow-300 font-medium">'language lessons'</span>, or <span className="text-yellow-300 font-medium">'best language app'</span> to broaden search coverage.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* NORMAL STATE: Dominant Intent Badge */}
          {hasIntentData && (
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
          )}

          {/* Intent Distribution Grid (hidden on engine failure) */}
          {!engineFailure && (
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
          )}

          {/* Keywords Grouped by Intent (hidden on engine failure) */}
          {!engineFailure && (
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
          )}
        </CardContent>
      )}
    </Card>
  );
};
