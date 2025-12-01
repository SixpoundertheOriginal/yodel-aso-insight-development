/**
 * Enhanced Keyword Combo Workbench
 *
 * Comprehensive combo analysis powered by ASO Bible with:
 * - ALL possible combinations generation
 * - Multiple visualization modes (Table, Matrix, Missing, Frequency)
 * - Advanced filtering and sorting
 * - Strategic recommendations
 * - ASO Bible integration
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, Table, Download, Copy, FileJson, FileSpreadsheet, X } from 'lucide-react';
import { useWorkbenchSelection } from '@/contexts/WorkbenchSelectionContext';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { analyzeAllCombos, filterCombosByKeyword, type GeneratedCombo } from '@/engine/combos/comboGenerationEngine';
import { EnhancedComboFilters, type ComboFilterState } from './EnhancedComboFilters';
import { KeywordComboTable } from './KeywordComboTable';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { exportCombosToCSV, copyAllCombosToClipboard, exportCombosToXLSX, exportCombosToJSON } from '@/utils/comboExporter';
import { isV2_1FeatureEnabled } from '@/config/metadataFeatureFlags';
import { toast } from 'sonner';
import { detectBrand } from '@/utils/brandDetector';
import { useBrandOverride } from '@/hooks/useBrandOverride';
import { NestedCategorySection } from './NestedCategorySection';
import { StrategicKeywordFrequencyPanel } from './StrategicKeywordFrequencyPanel';
import { KeywordSuggestionsBar } from './KeywordSuggestionsBar';

interface EnhancedKeywordComboWorkbenchProps {
  comboCoverage: UnifiedMetadataAuditResult['comboCoverage'];
  keywordCoverage: UnifiedMetadataAuditResult['keywordCoverage'];
  metadata: {
    title: string;
    subtitle: string;
    keywords?: string | null; // App Store Connect keywords field (100 char max)
    appId?: string; // For brand override storage
    country?: string; // For ranking checks (e.g., 'us', 'gb')
  };
}

export const EnhancedKeywordComboWorkbench: React.FC<EnhancedKeywordComboWorkbenchProps> = ({
  comboCoverage,
  keywordCoverage,
  metadata,
}) => {
  const [filters, setFilters] = useState<ComboFilterState>({
    existence: 'all',
    length: 'all',
    keywordSearch: '',
    minStrategicValue: 0,
    source: 'all',
  });

  // Keywords field state (100-char App Store Connect keywords field)
  const [keywordsFieldInput, setKeywordsFieldInput] = useState<string>(metadata.keywords || '');

  // Parse keywords field into array
  const keywordsFieldKeywords = useMemo(() => {
    if (!keywordsFieldInput.trim()) return [];
    return keywordsFieldInput
      .split(',')
      .map(kw => kw.trim().toLowerCase())
      .filter(kw => kw.length > 0);
  }, [keywordsFieldInput]);

  // Phase 2: Progressive Enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementError, setEnhancementError] = useState<string | null>(null);

  const {
    setCombos,
    addCombo,
    combos,
    setSearchQuery,
    setSourceFilter,
    lengthFilter,
    setLengthFilter,
  } = useKeywordComboStore();

  // Workbench selection integration
  const {
    selection,
    workbenchRef,
    removeKeyword,
    removeCombo,
    clearSelection,
    hasSelection,
  } = useWorkbenchSelection();

  // Brand detection and override (Phase 1: Brand Filter)
  const [brandOverride] = useBrandOverride(metadata.appId);
  const appBrand = useMemo(() => {
    return brandOverride || detectBrand(metadata.title);
  }, [metadata.title, brandOverride]);

  // Generate comprehensive combo analysis with brand filtering
  // Phase 1: Client-side instant results (0-100ms)
  // Phase 2: Now includes keywords field (4-element combo generation)
  const [comboAnalysis, setComboAnalysis] = useState(() => {
    // Parse initial keywords for combo analysis
    const initialKeywordsArray = (metadata.keywords || '')
      .split(',')
      .map(kw => kw.trim().toLowerCase())
      .filter(kw => kw.length > 0);

    return analyzeAllCombos(
      keywordCoverage.titleKeywords,
      keywordCoverage.subtitleNewKeywords,
      metadata.title,
      metadata.subtitle,
      initialKeywordsArray,   // NEW: Keywords field keywords array
      metadata.keywords || '', // NEW: Keywords field raw text
      comboCoverage.titleCombosClassified,
      appBrand  // Phase 1: Pass brand to filter branded combos
    );
  });

  // Phase 2: Progressive Enhancement - Enhance from server (200-500ms)
  useEffect(() => {
    const enhanceFromServer = async () => {
      if (!metadata.appId) {
        console.warn('No appId provided, skipping server enhancement');
        return;
      }

      setIsEnhancing(true);
      setEnhancementError(null);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/keyword-suggestions-enhance`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              appId: metadata.appId,
              title: metadata.title,
              subtitle: metadata.subtitle,
              basicSuggestions: comboAnalysis.allPossibleCombos,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Enhancement failed: ${response.statusText}`);
        }

        const enhancedData = await response.json();

        // Merge enhanced data into existing combos
        setComboAnalysis(prev => {
          const enhancedMap = new Map(
            enhancedData.suggestions.map((s: any) => [s.text, s])
          );

          const mergedCombos = prev.allPossibleCombos.map(combo => {
            const enhanced = enhancedMap.get(combo.text);
            if (enhanced) {
              return {
                ...combo,
                strategicValue: enhanced.enhancedStrategicValue,
                searchVolume: enhanced.searchVolumeEstimate,
                competition: enhanced.competitionLevel,
              };
            }
            return combo;
          }).filter(combo => {
            // Filter out competitor-branded combos from server
            const enhanced = enhancedMap.get(combo.text);
            return !enhanced || !enhanced.isCompetitorBranded;
          });

          const existingCombos = mergedCombos.filter(c => c.exists);
          const missingCombos = mergedCombos.filter(c => !c.exists);

          return {
            allPossibleCombos: mergedCombos,
            existingCombos,
            missingCombos,
            recommendedToAdd: missingCombos
              .sort((a, b) => (b.strategicValue || 0) - (a.strategicValue || 0))
              .slice(0, 10),
            stats: {
              ...prev.stats,
              totalPossible: mergedCombos.length,
              existing: existingCombos.length,
              missing: missingCombos.length,
            },
          };
        });

        // Show success message
        const cacheHit = enhancedData.cached;
        const competitorFiltered = enhancedData.stats?.competitorBrandedFiltered || 0;

        toast.success(
          `Suggestions enhanced${cacheHit ? ' (cached)' : ''}! ${
            competitorFiltered > 0 ? `Filtered ${competitorFiltered} competitor brands.` : ''
          }`,
          { duration: 3000 }
        );

      } catch (error) {
        console.error('Failed to enhance suggestions:', error);
        setEnhancementError(error instanceof Error ? error.message : 'Unknown error');

        // Graceful degradation - keep client-side results
        toast.error('Using basic suggestions (enhancement unavailable)', {
          duration: 3000,
        });
      } finally {
        setIsEnhancing(false);
      }
    };

    enhanceFromServer();
  }, [metadata.appId, metadata.title, metadata.subtitle]);

  // Recompute combo analysis when keywords field changes
  useEffect(() => {
    const newAnalysis = analyzeAllCombos(
      keywordCoverage.titleKeywords,
      keywordCoverage.subtitleNewKeywords,
      metadata.title,
      metadata.subtitle,
      keywordsFieldKeywords,
      keywordsFieldInput,
      comboCoverage.titleCombosClassified,
      appBrand
    );
    setComboAnalysis(newAnalysis);
  }, [keywordsFieldInput, keywordsFieldKeywords, keywordCoverage, metadata.title, metadata.subtitle, comboCoverage.titleCombosClassified, appBrand]);

  // Sync EnhancedComboFilters with Zustand store filters
  useEffect(() => {
    // Sync keyword search
    setSearchQuery(filters.keywordSearch);

    // Sync source filter
    if (filters.source === 'all') {
      setSourceFilter('all');
    } else if (filters.source === 'title') {
      setSourceFilter('title');
    } else if (filters.source === 'subtitle') {
      setSourceFilter('subtitle');
    } else if (filters.source === 'both') {
      setSourceFilter('cross-element');
    }

    // Sync length filter (only 2 and 3 word combos supported)
    if (filters.length === 'all' || filters.length === '2' || filters.length === '3') {
      setLengthFilter(filters.length);
    } else {
      // If EnhancedComboFilters selects 4 or 5+, default to 'all' since we don't support 4+ anymore
      setLengthFilter('all');
    }
  }, [filters.keywordSearch, filters.source, filters.length, setSearchQuery, setSourceFilter, setLengthFilter]);

  // Apply filters
  const filteredCombos = useMemo(() => {
    let combos = comboAnalysis.allPossibleCombos;

    // Apply element selection filters (from ElementDetailCard)
    if (selection.keywords.length > 0) {
      combos = combos.filter(combo =>
        selection.keywords.some(kw => combo.text.toLowerCase().includes(kw.toLowerCase()))
      );
    }

    if (selection.combos.length > 0) {
      combos = combos.filter(combo =>
        selection.combos.includes(combo.text)
      );
    }

    // Filter by existence
    if (filters.existence === 'existing') {
      combos = combos.filter(c => c.exists);
    } else if (filters.existence === 'missing') {
      combos = combos.filter(c => !c.exists);
    }

    // Filter by length
    if (filters.length !== 'all') {
      const targetLength = filters.length === '5+' ? 5 : parseInt(filters.length);
      if (filters.length === '5+') {
        combos = combos.filter(c => c.length >= targetLength);
      } else {
        combos = combos.filter(c => c.length === targetLength);
      }
    }

    // Filter by keyword search
    if (filters.keywordSearch) {
      combos = filterCombosByKeyword(combos, filters.keywordSearch);
    }

    // Filter by strategic value
    if (filters.minStrategicValue > 0) {
      combos = combos.filter(c => (c.strategicValue || 0) >= filters.minStrategicValue);
    }

    // Filter by source
    if (filters.source !== 'all') {
      combos = combos.filter(c => c.source === filters.source);
    }

    return combos;
  }, [comboAnalysis, filters, selection]);

  // Initialize legacy table store (for backwards compatibility)
  React.useEffect(() => {
    console.log('[EnhancedKeywordComboWorkbench] comboCoverage data:', {
      titleCombosClassifiedLength: comboCoverage.titleCombosClassified?.length || 0,
      subtitleNewCombosClassifiedLength: comboCoverage.subtitleNewCombosClassified?.length || 0,
      titleCombosLength: comboCoverage.titleCombos?.length || 0,
      subtitleNewCombosLength: comboCoverage.subtitleNewCombos?.length || 0,
    });

    let titleCombos = comboCoverage.titleCombosClassified || [];
    let subtitleCombos = comboCoverage.subtitleNewCombosClassified || [];

    // FALLBACK: If classified arrays are empty, create ClassifiedCombo objects from string arrays
    if (titleCombos.length === 0 && comboCoverage.titleCombos && comboCoverage.titleCombos.length > 0) {
      console.log('[EnhancedKeywordComboWorkbench] Creating ClassifiedCombo objects from titleCombos strings');
      titleCombos = comboCoverage.titleCombos.map(text => ({
        text,
        type: 'generic' as const,
        relevanceScore: 2,
        source: 'title' as const,
      }));
    }

    if (subtitleCombos.length === 0 && comboCoverage.subtitleNewCombos && comboCoverage.subtitleNewCombos.length > 0) {
      console.log('[EnhancedKeywordComboWorkbench] Creating ClassifiedCombo objects from subtitleNewCombos strings');
      subtitleCombos = comboCoverage.subtitleNewCombos.map(text => ({
        text,
        type: 'generic' as const,
        relevanceScore: 2,
        source: 'subtitle' as const,
      }));
    }

    const allCombos = [...titleCombos, ...subtitleCombos];
    console.log('[EnhancedKeywordComboWorkbench] Setting combos to store:', allCombos.length);
    setCombos(allCombos);
  }, [comboCoverage, setCombos]);

  const handleExportCSV = () => {
    // Convert GeneratedCombo to ClassifiedCombo format for export
    const exportData = filteredCombos.map(c => ({
      text: c.text,
      type: 'generic' as const,
      relevanceScore: Math.round((c.strategicValue || 0) / 25),
      source: c.source as any,
    }));
    exportCombosToCSV(exportData);
  };

  const handleExportXLSX = () => {
    // Convert GeneratedCombo to ClassifiedCombo format for export
    const exportData = filteredCombos.map(c => ({
      text: c.text,
      type: 'generic' as const,
      relevanceScore: Math.round((c.strategicValue || 0) / 25),
      source: c.source as any,
    }));
    exportCombosToXLSX(exportData);
  };

  const handleExportJSON = () => {
    // Convert GeneratedCombo to ClassifiedCombo format for export
    const exportData = filteredCombos.map(c => ({
      text: c.text,
      type: 'generic' as const,
      relevanceScore: Math.round((c.strategicValue || 0) / 25),
      source: c.source as any,
    }));
    exportCombosToJSON(exportData, undefined, false);
  };

  const handleCopyAll = () => {
    const text = filteredCombos.map(c => c.text).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${filteredCombos.length} combos to clipboard`);
  };

  // Handler for KeywordSuggestionsBar badge clicks
  const handleLengthFilterClick = (length: '2' | '3' | 'all') => {
    // Update Zustand store directly (which updates the table)
    setLengthFilter(length);

    // Also update local filters for backward compatibility with EnhancedComboFilters
    setFilters(prev => ({
      ...prev,
      length: length
    }));
  };

  const v2_1Enabled = isV2_1FeatureEnabled('COMBO_ENHANCE');

  // Calculate keyword suggestions by category
  // Nested Structure: Length > Value
  const keywordSuggestions = useMemo(() => {
    const all = comboAnalysis.allPossibleCombos;

    // Helper to categorize by value
    const categorizeByValue = (combos: GeneratedCombo[]) => {
      return {
        high: combos.filter(c => (c.strategicValue || 0) >= 70),
        medium: combos.filter(c => {
          const val = c.strategicValue || 0;
          return val >= 50 && val < 70;
        }),
        low: combos.filter(c => (c.strategicValue || 0) < 50),
      };
    };

    // Group by length first
    const twoWord = all.filter(c => c.length === 2);
    const threeWord = all.filter(c => c.length === 3);
    const fourPlus = all.filter(c => c.length >= 4);

    return {
      twoWord: {
        all: twoWord,
        ...categorizeByValue(twoWord),
        total: twoWord.length,
      },
      threeWord: {
        all: threeWord,
        ...categorizeByValue(threeWord),
        total: threeWord.length,
      },
      fourPlus: {
        all: fourPlus,
        ...categorizeByValue(fourPlus),
        total: fourPlus.length,
      },
    };
  }, [comboAnalysis]);

  // Handle adding a suggested combo to the table
  const handleAddCombo = (combo: GeneratedCombo) => {
    addCombo(combo as any);
    toast.success(`Added "${combo.text}" to workbench`);
  };

  // Check if combo is already in the table
  const isComboAdded = (comboText: string) => {
    return combos.some(c => c.text === comboText);
  };

  return (
    <Card ref={workbenchRef} className="relative bg-black/40 backdrop-blur-lg border border-zinc-800/50 rounded-xl hover:border-orange-500/30 transition-all duration-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-violet-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-violet-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-violet-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-violet-400/60" />

      <CardHeader className="pb-4">
        {/* Keywords Field Input - Phase 2 */}
        <div className="mt-4 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
          <label htmlFor="keywords-field" className="block text-xs font-medium text-zinc-400 mb-2">
            App Store Connect Keywords Field (100 chars max)
          </label>
          <div className="relative">
            <textarea
              id="keywords-field"
              value={keywordsFieldInput}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 100) {
                  setKeywordsFieldInput(value);
                }
              }}
              placeholder="meditation,sleep,mindfulness,relaxation,anxiety,stress"
              className="w-full h-20 px-3 py-2 text-sm bg-black/50 border border-zinc-700 rounded-md text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none font-mono"
              maxLength={100}
            />
            <div className="absolute bottom-2 right-2 text-[10px] text-zinc-500">
              {keywordsFieldInput.length}/100
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1.5 italic">
            💡 Comma-separated keywords. Equal ranking weight to subtitle. Used for 4-element combo generation.
          </p>
        </div>

      </CardHeader>

      <CardContent className="space-y-6">
        {/* Strategic Keyword Frequency Analysis */}
        <StrategicKeywordFrequencyPanel
          combos={combos}
        />

        {/* Element Selection Filter (appears when items selected from element cards) */}
        {hasSelection && (
          <div className="p-4 bg-blue-500/10 border-2 border-blue-400/40 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-blue-400/40 text-blue-400">
                  From {selection.sourceElement === 'both' ? 'Title + Subtitle' : selection.sourceElement === 'title' ? 'Title' : 'Subtitle'} Card
                </Badge>
                <span className="text-sm text-zinc-300">
                  {selection.keywords.length} keyword{selection.keywords.length !== 1 ? 's' : ''}, {selection.combos.length} combo{selection.combos.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                className="h-7 text-xs text-zinc-400 hover:text-zinc-300"
              >
                Clear Element Filters ×
              </Button>
            </div>

            {/* Selected Keywords */}
            {selection.keywords.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 uppercase mb-2">
                  Filter by Keywords:
                </div>
                <div className="flex flex-wrap gap-1">
                  {selection.keywords.map((kw, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs border-blue-400/40 text-blue-400 cursor-pointer hover:bg-blue-500/20 transition-colors"
                      onClick={() => removeKeyword(kw)}
                    >
                      {kw}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Combos */}
            {selection.combos.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 uppercase mb-2">
                  Filter by Combos:
                </div>
                <div className="flex flex-wrap gap-1">
                  {selection.combos.map((combo, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs border-violet-400/40 text-violet-400 cursor-pointer hover:bg-violet-500/20 transition-colors"
                      onClick={() => removeCombo(combo)}
                    >
                      {combo}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Filters */}
        <EnhancedComboFilters
          filters={filters}
          onChange={setFilters}
          stats={{
            total: comboAnalysis.stats.totalPossible,
            filtered: filteredCombos.length,
          }}
        />

        {/* Keyword Suggestions Bar - Compact horizontal display */}
        <KeywordSuggestionsBar
          suggestions={{
            twoWord: { total: keywordSuggestions.twoWord.total },
            threeWord: { total: keywordSuggestions.threeWord.total },
          }}
          onLengthFilter={handleLengthFilterClick}
          activeLengthFilter={lengthFilter}
        />

        {/* Top 500 Warning - Phase 2 */}
        {comboAnalysis.stats.limitReached && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">⚠️</span>
              <div>
                <p className="text-xs font-medium text-amber-400 mb-1">Top 500 Limit Reached</p>
                <p className="text-[11px] text-zinc-400">
                  Generated {comboAnalysis.stats.totalGenerated} combinations, showing top 500 by priority score.
                  Combinations are ranked by: Strength (30%), Popularity (25%), Opportunity (20%), Trend (15%), Intent (10%).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Single Unified Table View */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Table className="h-5 w-5 text-violet-400" />
            <h3 className="text-base font-medium text-zinc-300 uppercase tracking-wide">
              All Combos Table
            </h3>
          </div>
          <KeywordComboTable metadata={metadata} />
        </div>

        {/* ENHANCED KEYWORD COMBO WORKBENCH - Title & Stats Section */}
        <div className="border-t border-zinc-800 pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium tracking-wide uppercase text-zinc-300">
                  <Link2 className="h-4 w-4 text-violet-400" />
                  ENHANCED KEYWORD COMBO WORKBENCH
                </CardTitle>
                {/* Phase 2: Enhancement indicator */}
                {isEnhancing && (
                  <Badge variant="outline" className="animate-pulse border-blue-400/40 text-blue-400 text-xs">
                    🔄 Enhancing...
                  </Badge>
                )}
                {enhancementError && (
                  <Badge variant="outline" className="border-yellow-400/40 text-yellow-400 text-xs">
                    ⚠️ Basic mode
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Powered by ASO Bible • All Possible Combinations • Strategic Recommendations
              </p>
            </div>
          </div>

          {/* Summary Stats - Phase 1: Strength-Based Breakdown */}
          <div className="space-y-4">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Total Possible</p>
                <p className="text-2xl font-bold text-violet-400">{comboAnalysis.stats.totalPossible}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Existing</p>
                <p className="text-2xl font-bold text-emerald-400">{comboAnalysis.stats.existing}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Missing</p>
                <p className="text-2xl font-bold text-amber-400">{comboAnalysis.stats.missing}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Coverage</p>
                <p className="text-2xl font-bold text-blue-400">{comboAnalysis.stats.coverage}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Filtered View</p>
                <p className="text-2xl font-bold text-zinc-300">{filteredCombos.length}</p>
              </div>
            </div>

            {/* Strength Breakdown - Phase 2: All 10 Tiers */}
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-xs font-medium text-zinc-400 mb-3">Ranking Power Distribution (10-Tier System)</p>

              {/* Tier 1: Strongest */}
              <div className="mb-3">
                <p className="text-[10px] text-zinc-500 uppercase mb-2">Tier 1: Strongest (100 pts)</p>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">🔥🔥🔥</span>
                      <p className="text-xs text-zinc-400">Title Consecutive</p>
                    </div>
                    <p className="text-xl font-bold text-red-400">{comboAnalysis.stats.titleConsecutive}</p>
                  </div>
                </div>
              </div>

              {/* Tier 2: Very Strong */}
              <div className="mb-3">
                <p className="text-[10px] text-zinc-500 uppercase mb-2">Tier 2: Very Strong (70-85 pts)</p>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-orange-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">🔥🔥</span>
                      <p className="text-xs text-zinc-400">Title Non-Consecutive</p>
                    </div>
                    <p className="text-xl font-bold text-orange-400">{comboAnalysis.stats.titleNonConsecutive}</p>
                  </div>
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">🔥⚡</span>
                      <p className="text-xs text-zinc-400">Title + Keywords Cross</p>
                    </div>
                    <p className="text-xl font-bold text-amber-400">{comboAnalysis.stats.titleKeywordsCross || 0}</p>
                  </div>
                </div>
              </div>

              {/* Tier 3: Medium */}
              <div className="mb-3">
                <p className="text-[10px] text-zinc-500 uppercase mb-2">Tier 3: Medium (70 pts)</p>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">⚡</span>
                      <p className="text-xs text-zinc-400">Cross-Element (Title + Subtitle)</p>
                    </div>
                    <p className="text-xl font-bold text-yellow-400">{comboAnalysis.stats.crossElement}</p>
                  </div>
                </div>
              </div>

              {/* Tier 4: Weak */}
              <div className="mb-3">
                <p className="text-[10px] text-zinc-500 uppercase mb-2">Tier 4: Weak (50 pts)</p>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-cyan-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">💤</span>
                      <p className="text-xs text-zinc-400">Keywords Consecutive</p>
                    </div>
                    <p className="text-xl font-bold text-cyan-400">{comboAnalysis.stats.keywordsConsecutive || 0}</p>
                  </div>
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">💤</span>
                      <p className="text-xs text-zinc-400">Subtitle Consecutive</p>
                    </div>
                    <p className="text-xl font-bold text-blue-400">{comboAnalysis.stats.subtitleConsecutive}</p>
                  </div>
                </div>
              </div>

              {/* Tier 5: Very Weak */}
              <div className="mb-3">
                <p className="text-[10px] text-zinc-500 uppercase mb-2">Tier 5: Very Weak (30-35 pts)</p>
                <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-violet-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">💤⚡</span>
                      <p className="text-xs text-zinc-400">Keywords + Subtitle</p>
                    </div>
                    <p className="text-xl font-bold text-violet-400">{comboAnalysis.stats.keywordsSubtitleCross || 0}</p>
                  </div>
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-indigo-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">💤💤</span>
                      <p className="text-xs text-zinc-400">Keywords Non-Consec</p>
                    </div>
                    <p className="text-xl font-bold text-indigo-400">{comboAnalysis.stats.keywordsNonConsecutive || 0}</p>
                  </div>
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">💤💤</span>
                      <p className="text-xs text-zinc-400">Subtitle Non-Consec</p>
                    </div>
                    <p className="text-xl font-bold text-purple-400">{comboAnalysis.stats.subtitleNonConsecutive}</p>
                  </div>
                </div>
              </div>

              {/* Tier 6: Weakest */}
              <div className="mb-3">
                <p className="text-[10px] text-zinc-500 uppercase mb-2">Tier 6: Weakest (20 pts)</p>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-pink-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">💤💤💤</span>
                      <p className="text-xs text-zinc-400">Three-Way Cross</p>
                    </div>
                    <p className="text-xl font-bold text-pink-400">{comboAnalysis.stats.threeWayCross || 0}</p>
                  </div>
                </div>
              </div>

              {/* Opportunities */}
              <div className="border-t border-zinc-800 pt-3 mt-3">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                  <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-emerald-500/20">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">⬆️</span>
                      <p className="text-xs text-zinc-400">Can Strengthen</p>
                    </div>
                    <p className="text-xl font-bold text-emerald-400">{comboAnalysis.stats.canStrengthen}</p>
                    <p className="text-[10px] text-zinc-500">Strengthening Opportunities</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyAll}
              className="text-xs border-zinc-700 text-zinc-300 hover:border-orange-500/40"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Filtered ({filteredCombos.length})
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="text-xs border-emerald-500/40 text-emerald-400 hover:border-emerald-500"
            >
              <Download className="h-3 w-3 mr-1" />
              Export CSV
            </Button>

            {/* V2.1 Export Buttons */}
            {v2_1Enabled && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportXLSX}
                  className="text-xs border-blue-500/40 text-blue-400 hover:border-blue-500"
                >
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  Export XLSX
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportJSON}
                  className="text-xs border-purple-500/40 text-purple-400 hover:border-purple-500"
                >
                  <FileJson className="h-3 w-3 mr-1" />
                  Export JSON
                </Button>
              </>
            )}

            {comboAnalysis.recommendedToAdd.length > 0 && (
              <Badge variant="outline" className="border-violet-400/30 text-violet-400 text-xs">
                {comboAnalysis.recommendedToAdd.length} Recommendations
              </Badge>
            )}
          </div>
        </div>

        {/* Contextual Pro Tips */}
        <div className="pt-4 space-y-2 border-t border-zinc-800">
          {filters.keywordSearch && (
            <p className="text-xs text-zinc-500 italic">
              💡 <span className="font-medium">Pro Tip:</span> "{filters.keywordSearch}" appears in{' '}
              {filteredCombos.length} combos with{' '}
              {Math.round((filteredCombos.filter(c => c.exists).length / filteredCombos.length) * 100)}% coverage.
              {filteredCombos.filter(c => !c.exists && (c.strategicValue || 0) >= 70).length > 0 && (
                <> Focus on high-value missing combos like "
                {filteredCombos.filter(c => !c.exists && (c.strategicValue || 0) >= 70).slice(0, 2).map(c => c.text).join('", "')}"
                to maximize impact.</>
              )}
            </p>
          )}
          {filters.existence === 'missing' && !filters.keywordSearch && (
            <p className="text-xs text-zinc-500 italic">
              💡 <span className="font-medium">Pro Tip:</span> Viewing {filteredCombos.length} missing combinations.
              Focus on 2-3 word combos with 70+ strategic value - they're easier to incorporate naturally
              while maximizing impact on App Store visibility.
            </p>
          )}
          {filters.existence === 'existing' && !filters.keywordSearch && (
            <p className="text-xs text-zinc-500 italic">
              💡 <span className="font-medium">Pro Tip:</span> You're using {filteredCombos.length} combinations.
              Analyze which are in your title vs subtitle to ensure optimal keyword placement for maximum visibility.
              High-value combos should be in your title when possible.
            </p>
          )}
          {filters.minStrategicValue >= 70 && !filters.keywordSearch && (
            <p className="text-xs text-zinc-500 italic">
              💡 <span className="font-medium">Pro Tip:</span> High-value combos (70+) have the strongest potential
              impact on App Store rankings. If missing, prioritize adding them to your title or subtitle where they
              fit naturally with your app's value proposition.
            </p>
          )}
          {!filters.keywordSearch && filters.existence === 'all' && filters.minStrategicValue === 0 && (
            <p className="text-xs text-zinc-500 italic">
              💡 <span className="font-medium">Pro Tip:</span> Use filters to focus your analysis. Search for
              specific keywords, filter by missing combos, or set minimum strategic value to identify high-impact
              opportunities. The Frequency section shows which keywords are underutilized.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
