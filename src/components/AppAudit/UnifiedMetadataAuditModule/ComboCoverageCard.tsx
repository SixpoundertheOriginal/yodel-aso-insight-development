/**
 * Combo Coverage Card
 *
 * Shows n-gram combination distribution across title and subtitle.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, Plus, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';
import type { UnifiedMetadataAuditResult } from './types';

interface ComboCoverageCardProps {
  comboCoverage: UnifiedMetadataAuditResult['comboCoverage'];
}

const getComboTypeBadgeColor = (type: 'branded' | 'generic' | 'low_value'): string => {
  switch (type) {
    case 'branded':
      return 'border-purple-400/30 text-purple-400';
    case 'generic':
      return 'border-emerald-400/30 text-emerald-400';
    case 'low_value':
      return 'border-zinc-700 text-zinc-500';
  }
};

export const ComboCoverageCard: React.FC<ComboCoverageCardProps> = ({ comboCoverage }) => {
  const [showLowValue, setShowLowValue] = useState(false);

  // Use classified combos if available (V2.1+), fall back to legacy strings
  const titleCombosClassified = comboCoverage.titleCombosClassified || comboCoverage.titleCombos.map(text => ({ text, type: 'generic' as const, relevanceScore: 2 }));
  const subtitleCombosClassified = comboCoverage.subtitleNewCombosClassified || comboCoverage.subtitleNewCombos.map(text => ({ text, type: 'generic' as const, relevanceScore: 2 }));
  const lowValueCombos = comboCoverage.lowValueCombos || [];

  // Combine all combos from title + subtitle
  const allCombos = [...titleCombosClassified, ...subtitleCombosClassified];

  // Phase 5: Use brandClassification when available, fallback to legacy type
  const useBrandClassification = AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED && allCombos.some(c => 'brandClassification' in c && c.brandClassification);

  // Separate by brand classification (Phase 5) or legacy type
  const allBranded = useBrandClassification
    ? allCombos.filter(c => 'brandClassification' in c && c.brandClassification === 'brand')
    : allCombos.filter(c => c.type === 'branded');

  const allGeneric = useBrandClassification
    ? allCombos.filter(c => 'brandClassification' in c && c.brandClassification === 'generic')
    : allCombos.filter(c => c.type === 'generic');

  const allCompetitor = useBrandClassification
    ? allCombos.filter(c => 'brandClassification' in c && c.brandClassification === 'competitor')
    : [];

  // Counts for summary
  const brandedCount = allBranded.length;
  const genericCount = allGeneric.length;
  const competitorCount = allCompetitor.length;
  const lowValueCount = lowValueCombos.length;
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-violet-400" />
            Combo Coverage
          </CardTitle>
          <Badge variant="outline" className="text-lg px-4 py-1 border-violet-400/30 text-violet-400">
            {comboCoverage.totalCombos} total
          </Badge>
        </div>
        {/* Summary counts */}
        <div className="mt-3 text-sm text-zinc-400">
          {comboCoverage.totalCombos} combos →{' '}
          <span className="text-purple-400 font-medium">{brandedCount} brand</span> •{' '}
          <span className="text-emerald-400 font-medium">{genericCount} generic</span>
          {useBrandClassification && competitorCount > 0 && (
            <span>
              {' '}•{' '}
              <span className="text-orange-400 font-medium">{competitorCount} competitor</span>
              <span className="text-zinc-600"> (hidden)</span>
            </span>
          )}
          {!useBrandClassification && (
            <span>
              {' '}•{' '}
              <span className="text-zinc-500">{lowValueCount} low-value</span>
              {lowValueCount > 0 && <span className="text-zinc-600"> (hidden by default)</span>}
            </span>
          )}
          {useBrandClassification && lowValueCount > 0 && (
            <span>
              {' '}•{' '}
              <span className="text-zinc-500">{lowValueCount} low-value</span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Intro text */}
        <p className="text-sm text-zinc-400 pb-2 border-b border-zinc-800">
          We group combinations into <span className="text-purple-400 font-medium">brand</span> (includes your app/brand name), <span className="text-emerald-400 font-medium">generic discovery</span> (non-branded)
          {useBrandClassification && competitorCount > 0 && (
            <span>, <span className="text-orange-400 font-medium">competitor</span> (other brand names)</span>
          )}
          , and <span className="text-zinc-500">low-value</span> (numeric/time-based) so you can focus on what actually drives App Store search.
        </p>
        {/* Section A: Brand Coverage */}
        {brandedCount > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-purple-400" />
              <span className="text-sm font-medium text-zinc-300">
                Brand Coverage ({brandedCount} combo{brandedCount !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pl-4 mb-2">
              {allBranded.slice(0, 8).map((combo, idx) => (
                <div key={`branded-${idx}`} className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getComboTypeBadgeColor(combo.type)}`}
                    title="Branded combo"
                  >
                    {combo.text}
                  </Badge>
                  {/* Phase 5: Brand classification badge */}
                  {AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED && 'brandClassification' in combo && combo.brandClassification === 'brand' && (
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  )}
                </div>
              ))}
              {brandedCount > 8 && (
                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                  +{brandedCount - 8} more
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 pl-4 italic">
              Brand combos help returning or brand-aware users find you quickly.
            </p>
          </div>
        )}

        {/* Section B: Generic Discovery Coverage */}
        {genericCount > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium text-zinc-300">
                Generic Discovery Coverage ({genericCount} combo{genericCount !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pl-4 mb-2">
              {allGeneric.slice(0, 10).map((combo, idx) => (
                <div key={`generic-${idx}`} className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getComboTypeBadgeColor(combo.type)}`}
                    title="Generic combo"
                  >
                    {combo.text}
                  </Badge>
                  {/* Phase 5: Brand classification badge (shouldn't appear in generic section, but defensive) */}
                  {AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED && 'brandClassification' in combo && combo.brandClassification === 'brand' && (
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  )}
                </div>
              ))}
              {genericCount > 10 && (
                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                  +{genericCount - 10} more
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 pl-4 italic">
              Generic combos power non-branded search (e.g. "learn spanish", "language lessons").
            </p>
          </div>
        )}

        {/* No combos message */}
        {brandedCount === 0 && genericCount === 0 && lowValueCount === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-500 italic">
              No meaningful combinations detected. Consider adding more descriptive phrases to title/subtitle.
            </p>
          </div>
        )}

        {/* Low-Value Combos (Advanced) */}
        {lowValueCombos.length > 0 && (
          <div className="pt-3 border-t border-zinc-800">
            <button
              onClick={() => setShowLowValue(!showLowValue)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors mb-3"
            >
              {showLowValue ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span>Low-value / time-based combos ({lowValueCount}) (advanced)</span>
            </button>

            {showLowValue && (
              <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <p className="text-xs text-zinc-500 mb-3">
                  Numeric, time-bound, or version-based phrases with limited ranking value (e.g. "in 30 days", "7-day trial", "new version"). These are filtered out to help you focus on intent-driven combos.
                </p>
                <div className="flex flex-wrap gap-2">
                  {lowValueCombos.map((combo, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`text-xs ${getComboTypeBadgeColor(combo.type)}`}
                    >
                      {combo.text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="pt-3 space-y-2">
          <p className="text-xs text-zinc-500 italic">
            Generic discovery coverage is usually the main driver of incremental App Store search. Brand combos support returning users, while low-value combos have minimal ranking impact.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
