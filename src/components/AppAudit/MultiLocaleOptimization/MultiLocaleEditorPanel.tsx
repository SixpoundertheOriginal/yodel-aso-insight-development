/**
 * Multi-Locale Editor Panel
 * Main container for editing all 10 US market locales
 * Includes bulk fetch + individual fetch functionality
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Download, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { LocaleInputCard } from './LocaleInputCard';
import { MultiLocaleMetadataFetcher } from '@/services/multiLocaleMetadataFetcher';
import type { USMarketLocale, LocaleMetadata } from '@/types/multiLocaleMetadata';
import { toast } from 'sonner';

interface MultiLocaleEditorPanelProps {
  appId: string;
  primaryMetadata: {
    title: string;
    subtitle: string;
    keywords: string;
  };
  onRunAudit: (locales: LocaleMetadata[]) => void;
  isAuditing: boolean;
}

// Helper function to create empty locale
function createEmptyLocale(locale: USMarketLocale): LocaleMetadata {
  return {
    locale,
    title: '',
    subtitle: '',
    keywords: '',
    fetchStatus: 'idle',
    isAvailable: true,
    tokens: { title: [], subtitle: [], keywords: [], all: [] },
    combinations: [],
    stats: {
      uniqueTokens: 0,
      totalCombos: 0,
      tier1Combos: 0,
      tier2Combos: 0,
      tier3PlusCombos: 0,
      duplicatedTokens: [],
      wastedChars: 0,
    },
  };
}

export const MultiLocaleEditorPanel: React.FC<MultiLocaleEditorPanelProps> = ({
  appId,
  primaryMetadata,
  onRunAudit,
  isAuditing,
}) => {
  // State for all 10 locales
  const [locales, setLocales] = useState<Record<USMarketLocale, LocaleMetadata>>({
    EN_US: {
      locale: 'EN_US',
      title: primaryMetadata.title,
      subtitle: primaryMetadata.subtitle,
      keywords: primaryMetadata.keywords,
      fetchStatus: 'fetched',
      isAvailable: true,
      tokens: { title: [], subtitle: [], keywords: [], all: [] },
      combinations: [],
      stats: {
        uniqueTokens: 0,
        totalCombos: 0,
        tier1Combos: 0,
        tier2Combos: 0,
        tier3PlusCombos: 0,
        duplicatedTokens: [],
        wastedChars: 0,
      },
    },
    ES_MX: createEmptyLocale('ES_MX'),
    RU: createEmptyLocale('RU'),
    ZH_HANS: createEmptyLocale('ZH_HANS'),
    AR: createEmptyLocale('AR'),
    FR_FR: createEmptyLocale('FR_FR'),
    PT_BR: createEmptyLocale('PT_BR'),
    ZH_HANT: createEmptyLocale('ZH_HANT'),
    VI: createEmptyLocale('VI'),
    KO: createEmptyLocale('KO'),
  });

  const [fetchingLocale, setFetchingLocale] = useState<USMarketLocale | null>(null);
  const [isBulkFetching, setIsBulkFetching] = useState(false);
  const [secondaryExpanded, setSecondaryExpanded] = useState(false);

  // Handle individual locale fetch
  const handleFetchLocale = async (locale: USMarketLocale) => {
    console.log(`[MULTI-LOCALE-EDITOR] Fetching locale: ${locale}`);

    setFetchingLocale(locale);
    setLocales(prev => ({
      ...prev,
      [locale]: { ...prev[locale], fetchStatus: 'fetching' },
    }));

    try {
      const fetchedLocale = await MultiLocaleMetadataFetcher.fetchSingleLocale(appId, locale);

      setLocales(prev => ({
        ...prev,
        [locale]: fetchedLocale,
      }));

      if (fetchedLocale.fetchStatus === 'fetched') {
        toast.success(`✓ Fetched ${locale}`, {
          description: `Title: "${fetchedLocale.title.substring(0, 30)}..."`,
        });
      } else if (fetchedLocale.fetchStatus === 'not_available') {
        toast.warning(`${locale} not available`, {
          description: 'App not available in this locale. You can still enter metadata manually.',
        });
      }
    } catch (error: any) {
      console.error(`[MULTI-LOCALE-EDITOR] Error fetching ${locale}:`, error);
      toast.error(`Failed to fetch ${locale}`, {
        description: error.message,
      });
    } finally {
      setFetchingLocale(null);
    }
  };

  // Handle bulk fetch (all 9 secondary locales)
  const handleBulkFetch = async () => {
    console.log('[MULTI-LOCALE-EDITOR] Starting bulk fetch for 9 secondary locales...');

    setIsBulkFetching(true);

    // Mark all secondary locales as fetching
    setLocales(prev => {
      const updated = { ...prev };
      const secondaryLocales: USMarketLocale[] = ['ES_MX', 'RU', 'ZH_HANS', 'AR', 'FR_FR', 'PT_BR', 'ZH_HANT', 'VI', 'KO'];
      secondaryLocales.forEach(locale => {
        updated[locale] = { ...updated[locale], fetchStatus: 'fetching' };
      });
      return updated;
    });

    try {
      const fetchedLocales = await MultiLocaleMetadataFetcher.fetchAllLocales(appId);

      // Update state with fetched data
      setLocales(prev => {
        const updated = { ...prev };
        fetchedLocales.forEach(locale => {
          updated[locale.locale] = locale;
        });
        return updated;
      });

      const successCount = fetchedLocales.filter(l => l.fetchStatus === 'fetched').length;
      const notAvailableCount = fetchedLocales.filter(l => l.fetchStatus === 'not_available').length;

      toast.success(`Bulk fetch complete`, {
        description: `${successCount} locales fetched, ${notAvailableCount} not available`,
      });

      // Auto-expand secondary locales after bulk fetch
      setSecondaryExpanded(true);

    } catch (error: any) {
      console.error('[MULTI-LOCALE-EDITOR] Bulk fetch error:', error);
      toast.error('Bulk fetch failed', {
        description: error.message,
      });
    } finally {
      setIsBulkFetching(false);
    }
  };

  // Handle locale metadata update
  const handleLocaleUpdate = (
    locale: USMarketLocale,
    field: 'title' | 'subtitle' | 'keywords',
    value: string
  ) => {
    setLocales(prev => ({
      ...prev,
      [locale]: {
        ...prev[locale],
        [field]: value,
      },
    }));
  };

  // Handle run audit
  const handleRunAudit = () => {
    const localeArray = Object.values(locales);
    console.log('[MULTI-LOCALE-EDITOR] Running audit with locales:', localeArray);
    onRunAudit(localeArray);
  };

  // Check if any locale has data
  const hasAnyMetadata = Object.values(locales).some(
    locale => locale.title || locale.subtitle || locale.keywords
  );

  // Count filled locales
  const filledLocalesCount = Object.values(locales).filter(
    locale => locale.title || locale.subtitle || locale.keywords
  ).length;

  const secondaryLocales: USMarketLocale[] = ['ES_MX', 'RU', 'ZH_HANS', 'AR', 'FR_FR', 'PT_BR', 'ZH_HANT', 'VI', 'KO'];

  return (
    <Card className="bg-gradient-to-br from-purple-900/10 via-violet-900/5 to-transparent border border-violet-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
              🌍 Multi-Locale Indexation (US Market)
              <Badge variant="outline" className="text-xs border-violet-500/40 text-violet-400">
                10 Locales
              </Badge>
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-1">
              The US App Store indexes 10 localizations. Edit metadata below to optimize keyword coverage across all locales.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400">
              {filledLocalesCount}/10 Filled
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Banner */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-300 leading-relaxed">
            <strong>💡 How it works:</strong> The US App Store indexes metadata from 10 locales.
            Keywords from different locales <strong>never combine</strong> (locale-bound rule).
            Final US ranking = max(rank across all locales) per keyword.
          </p>
        </div>

        {/* Primary Locale (EN_US) - Always Visible */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <div className="h-[2px] w-6 bg-emerald-500/40" />
            Primary Locale
          </h4>

          <LocaleInputCard
            locale={locales.EN_US}
            isPrimary={true}
            onUpdate={handleLocaleUpdate}
            onFetch={handleFetchLocale}
            isFetching={fetchingLocale === 'EN_US'}
          />
        </div>

        {/* Secondary Locales - Collapsible */}
        <Collapsible open={secondaryExpanded} onOpenChange={setSecondaryExpanded}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <div className="h-[2px] w-6 bg-violet-500/40" />
                Secondary Locales (9)
              </h4>

              <div className="flex items-center gap-2">
                {/* Bulk Fetch Button */}
                <Button
                  onClick={handleBulkFetch}
                  disabled={isBulkFetching}
                  size="sm"
                  variant="outline"
                  className="text-xs border-violet-500/40 text-violet-400 hover:bg-violet-500/10"
                >
                  {isBulkFetching ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Fetching All...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-2" />
                      Fetch All Locales
                    </>
                  )}
                </Button>

                {/* Expand/Collapse Toggle */}
                <CollapsibleTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-zinc-400 hover:text-zinc-300"
                  >
                    {secondaryExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Expand
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {secondaryLocales.map(localeCode => (
                  <LocaleInputCard
                    key={localeCode}
                    locale={locales[localeCode]}
                    isPrimary={false}
                    onUpdate={handleLocaleUpdate}
                    onFetch={handleFetchLocale}
                    isFetching={fetchingLocale === localeCode}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
          <Button
            onClick={handleRunAudit}
            disabled={!hasAnyMetadata || isAuditing}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
          >
            {isAuditing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Multi-Locale Audit...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Multi-Locale Audit & Compare
              </>
            )}
          </Button>
        </div>

        {/* Helper Text */}
        {hasAnyMetadata && !isAuditing && (
          <p className="text-xs text-violet-400 text-center">
            ✨ Ready to analyze - click to see locale coverage, combinations, and fusion rankings
          </p>
        )}
      </CardContent>
    </Card>
  );
};
