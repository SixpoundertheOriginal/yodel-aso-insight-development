/**
 * Combination Opportunity Matrix
 * Shows combinations possible inside each locale (locale-bound only)
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { LocaleMetadata } from '@/types/multiLocaleMetadata';
import { LOCALE_NAMES } from '@/types/multiLocaleMetadata';

interface CombinationMatrixProps {
  locales: LocaleMetadata[];
}

export const CombinationMatrix: React.FC<CombinationMatrixProps> = ({ locales }) => {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base font-medium text-zinc-200">
          🧩 Combination Opportunity Matrix
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Combinations possible inside each locale (keywords from different locales never combine)
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locales.map(locale => {
            const hasCombos = locale.combinations.length > 0;
            const tier1Count = locale.stats.tier1Combos;
            const tier2Count = locale.stats.tier2Combos;
            const tier3PlusCount = locale.stats.tier3PlusCombos;

            return (
              <Card
                key={locale.locale}
                className={`p-4 ${
                  locale.locale === 'EN_US'
                    ? 'border-emerald-500/30 bg-emerald-900/10'
                    : 'border-zinc-700 bg-zinc-900/30'
                }`}
              >
                {/* Locale Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-zinc-200">
                    {LOCALE_NAMES[locale.locale]}
                  </h4>
                  {locale.locale === 'EN_US' && (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                      PRIMARY
                    </Badge>
                  )}
                </div>

                {/* Tier Breakdown */}
                {hasCombos ? (
                  <div className="space-y-2 mb-3">
                    {tier1Count > 0 && (
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400">
                          🔥 Tier 1
                        </Badge>
                        <span className="text-sm font-medium text-emerald-400">{tier1Count}</span>
                      </div>
                    )}
                    {tier2Count > 0 && (
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs border-blue-400/40 text-blue-400">
                          💎 Tier 2
                        </Badge>
                        <span className="text-sm font-medium text-blue-400">{tier2Count}</span>
                      </div>
                    )}
                    {tier3PlusCount > 0 && (
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                          ⚡ Tier 3+
                        </Badge>
                        <span className="text-sm font-medium text-zinc-400">{tier3PlusCount}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3">
                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                      No combos
                    </Badge>
                  </div>
                )}

                {/* Sample Combos */}
                {hasCombos && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Sample Combos:</p>
                    <div className="flex flex-wrap gap-1">
                      {locale.combinations
                        .slice(0, 3)
                        .map(combo => (
                          <Badge
                            key={combo.id}
                            variant="outline"
                            className="text-[10px] border-zinc-700 text-zinc-300"
                          >
                            {combo.text}
                          </Badge>
                        ))}
                    </div>
                    {locale.combinations.length > 3 && (
                      <span className="text-[10px] text-zinc-500">
                        +{locale.combinations.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Empty Locale Warning */}
                {!hasCombos && (locale.title || locale.subtitle || locale.keywords) && (
                  <Alert className="bg-amber-500/10 border-amber-500/20 mt-2">
                    <AlertDescription className="text-[10px] text-amber-400">
                      Metadata entered but no combos generated. Check for stopwords or single-word entries.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Opportunities */}
                {locale.fetchStatus === 'not_available' && (
                  <Alert className="bg-blue-500/10 border-blue-500/20 mt-2">
                    <AlertDescription className="text-[10px] text-blue-400">
                      💡 Not available in this locale but still usable for ASO testing
                    </AlertDescription>
                  </Alert>
                )}
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
