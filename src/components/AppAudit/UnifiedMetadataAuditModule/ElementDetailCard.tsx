/**
 * Element Detail Card
 *
 * Expandable card showing detailed analysis for a single metadata element.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { RuleResultsTable } from './RuleResultsTable';
import { SearchIntentCoverageCard } from './SearchIntentCoverageCard';
import { useIntentCoverage } from '@/hooks/useIntentIntelligence';
import { AUTOCOMPLETE_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';
import type { ElementScoringResult } from './types';
import type { ScrapedMetadata } from '@/types/aso';

interface ElementDetailCardProps {
  elementResult: ElementScoringResult;
  elementDisplayName: string;
  metadata: ScrapedMetadata;
}

export const ElementDetailCard: React.FC<ElementDetailCardProps> = ({
  elementResult,
  elementDisplayName,
  metadata: rawMetadata,
}) => {
  // Title and Subtitle always start expanded, Description starts collapsed
  const initiallyExpanded = elementResult.element === 'title' || elementResult.element === 'subtitle';
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [showAdvancedKeywords, setShowAdvancedKeywords] = useState(false);
  const { score, ruleResults, recommendations, insights, metadata: elementMetadata, element } = elementResult;

  // Check if this is the description element (conversion only)
  const isConversionElement = element === 'description';

  // Get the actual text content for this element
  const elementText = element === 'title'
    ? rawMetadata.title
    : element === 'subtitle'
    ? rawMetadata.subtitle
    : rawMetadata.description;

  // Format platform + locale
  const platformLocale = `iOS • ${rawMetadata.locale || 'en-US'}`;

  // Character usage percentage
  const charUsagePercent = Math.round(
    (elementMetadata.characterUsage / elementMetadata.maxCharacters) * 100
  );

  // Score color
  const scoreColor =
    score >= 80
      ? 'border-emerald-400/30 text-emerald-400'
      : score >= 60
      ? 'border-yellow-400/30 text-yellow-400'
      : 'border-red-400/30 text-red-400';

  // Intent Intelligence Integration (Title and Subtitle only)
  const shouldShowIntentCoverage =
    AUTOCOMPLETE_INTELLIGENCE_ENABLED &&
    !isConversionElement &&
    elementMetadata.keywords &&
    elementMetadata.keywords.length > 0;

  // Fetch intent coverage data
  const { coverage: intentCoverage, isLoading: isIntentLoading } = useIntentCoverage(
    element === 'title' ? elementMetadata.keywords : [],
    element === 'subtitle' ? elementMetadata.keywords : [],
    'ios',
    rawMetadata.locale?.split('-')[1]?.toLowerCase() || 'us',
    shouldShowIntentCoverage
  );

  // Determine which intent signals to show (title or subtitle)
  const intentSignalsForElement =
    element === 'title'
      ? intentCoverage?.title
      : element === 'subtitle'
      ? intentCoverage?.subtitle
      : null;

  return (
    <Card className="group relative bg-zinc-900 border-zinc-800 transition-all duration-300 hover:border-zinc-700 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)]">
      {/* Subtle corner accents */}
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader
        className="cursor-pointer hover:bg-zinc-800/30 transition-all duration-300"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{elementDisplayName}</CardTitle>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-400" />
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-400">
              {elementMetadata.characterUsage}/{elementMetadata.maxCharacters} chars ({charUsagePercent}%)
            </div>
            <Badge variant="outline" className={`text-lg px-4 py-1 ${scoreColor}`}>
              {score}/100
            </Badge>
          </div>
        </div>

        {/* Character usage progress bar */}
        <Progress value={charUsagePercent} className="h-2 mt-2" />
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 pt-6">
          {/* Raw Metadata Details */}
          <div className="pb-4 border-b border-zinc-800">
            <div className="space-y-3">
              {/* Element Text */}
              <div>
                <div className="text-xs text-zinc-500 uppercase mb-1.5">
                  {element === 'description' ? 'Description Preview' : `Full ${elementDisplayName}`}
                </div>
                <div className="text-sm text-zinc-200 font-medium">
                  {element === 'description'
                    ? (elementText && elementText.length > 200
                        ? `${elementText.slice(0, 200)}...`
                        : elementText || 'Not available')
                    : elementText || 'Not available'}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Characters</div>
                  <div className="text-sm text-zinc-300">
                    {elementMetadata.characterUsage} / {elementMetadata.maxCharacters}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Developer</div>
                  <div className="text-sm text-zinc-300">{rawMetadata.developer || 'Not available'}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Category</div>
                  <div className="text-sm text-zinc-300">{rawMetadata.applicationCategory || 'Not available'}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Platform</div>
                  <div className="text-sm text-zinc-300">{platformLocale}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Intelligence Metrics (Description Only) */}
          {isConversionElement && (
            <div>
              <div className="mb-3">
                <p className="text-sm text-zinc-400">
                  Description does not directly impact keyword ranking. Evaluated for conversion quality only.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hook Strength */}
                {(() => {
                  const hookRule = ruleResults.find(r => r.ruleId === 'description_hook_strength');
                  return hookRule ? (
                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="text-xs text-zinc-500 uppercase mb-2">Hook Strength</div>
                      <div className="text-2xl font-bold text-zinc-200 mb-1">{hookRule.score}/100</div>
                      <p className="text-xs text-zinc-400">{hookRule.message}</p>
                    </div>
                  ) : null;
                })()}

                {/* Readability */}
                {(() => {
                  const readabilityRule = ruleResults.find(r => r.ruleId === 'description_readability');
                  return readabilityRule ? (
                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="text-xs text-zinc-500 uppercase mb-2">Readability</div>
                      <div className="text-2xl font-bold text-zinc-200 mb-1">{readabilityRule.score}/100</div>
                      <p className="text-xs text-zinc-400">{readabilityRule.message}</p>
                    </div>
                  ) : null;
                })()}

                {/* Feature Depth */}
                {(() => {
                  const featureRule = ruleResults.find(r => r.ruleId === 'description_feature_mentions');
                  return featureRule ? (
                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="text-xs text-zinc-500 uppercase mb-2">Feature Depth</div>
                      <div className="text-2xl font-bold text-zinc-200 mb-1">{featureRule.score}/100</div>
                      <p className="text-xs text-zinc-400">{featureRule.message}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {/* Benchmark Comparison */}
          {elementMetadata.benchmarkComparison && (
            <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-300">
                  Category Benchmark
                </span>
                <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                  {elementMetadata.benchmarkComparison.tier}
                </Badge>
              </div>
              <p className="text-sm text-zinc-400">
                {elementMetadata.benchmarkComparison.message}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {elementMetadata.benchmarkComparison.insight}
              </p>
            </div>
          )}

          {/* Keywords */}
          {elementMetadata.keywords && elementMetadata.keywords.length > 0 && (
            <div>
              {isConversionElement ? (
                // For description: collapsible advanced view
                <div>
                  <button
                    onClick={() => setShowAdvancedKeywords(!showAdvancedKeywords)}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    {showAdvancedKeywords ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span>View extracted tokens (advanced)</span>
                  </button>
                  {showAdvancedKeywords && (
                    <div className="mt-3 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-zinc-300">
                          Keywords ({elementMetadata.keywords.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {elementMetadata.keywords.map((keyword, idx) => (
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
                </div>
              ) : (
                // For title/subtitle: normal view
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-zinc-300">
                      Keywords ({elementMetadata.keywords.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {elementMetadata.keywords.map((keyword, idx) => (
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
            </div>
          )}

          {/* Combos */}
          {elementMetadata.combos && elementMetadata.combos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-zinc-300">
                  Combos ({elementMetadata.combos.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {elementMetadata.combos.slice(0, 10).map((combo, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs border-violet-400/30 text-violet-400"
                  >
                    {combo}
                  </Badge>
                ))}
                {elementMetadata.combos.length > 10 && (
                  <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                    +{elementMetadata.combos.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Insights (Passed Rules) */}
          {insights.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">
                  Insights ({insights.length})
                </span>
              </div>
              <div className="space-y-2">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-emerald-900/10 rounded border border-emerald-400/20"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-300">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations (Failed Rules) */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">
                  Recommendations ({recommendations.length})
                </span>
              </div>
              <div className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-orange-900/10 rounded border border-orange-400/20"
                  >
                    <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-300">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rule Results Table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-zinc-300">
                Rule Evaluation ({ruleResults.length} rules)
              </span>
            </div>
            <RuleResultsTable rules={ruleResults} />
          </div>

          {/* Search Intent Coverage (Title and Subtitle only) */}
          {shouldShowIntentCoverage && intentSignalsForElement && !isIntentLoading && (
            <div className="pt-2 border-t border-zinc-800">
              <SearchIntentCoverageCard
                intentSignals={intentSignalsForElement}
                elementType={element as 'title' | 'subtitle'}
                keywords={elementMetadata.keywords}
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
