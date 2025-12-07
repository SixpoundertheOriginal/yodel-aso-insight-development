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
import type { UnifiedMetadataAuditResult, GeneratedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { ComboStrength } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { filterCombosByKeyword, type GeneratedCombo as EngineGeneratedCombo } from '@/engine/combos/comboGenerationEngine';
import { EnhancedComboFilters, type ComboFilterState } from './EnhancedComboFilters';
import { KeywordComboTable } from './KeywordComboTable';
import { ComboStrengthTierRow } from './ComboStrengthTierRow';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { exportCombosToCSV, copyAllCombosToClipboard, exportCombosToXLSX, exportCombosToJSON } from '@/utils/comboExporter';
import { isV2_1FeatureEnabled } from '@/config/metadataFeatureFlags';
import { toast } from 'sonner';
import { detectBrand } from '@/utils/brandDetector';
import { useBrandOverride } from '@/hooks/useBrandOverride';
import { NestedCategorySection } from './NestedCategorySection';
import { StrategicKeywordFrequencyPanel } from './StrategicKeywordFrequencyPanel';
import { KeywordSuggestionsBar } from './KeywordSuggestionsBar';
import {
  extractRankingTokens,
  calculateRankingSlotEfficiency,
  analyzeDuplicates,
  createRankingDistributionMap,
} from '@/engine/metadata/utils/rankingTokenExtractor';

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
    brandType: 'generic', // Default to generic only
  });

  // Parse keywords field into array (now comes from props)
  const keywordsFieldKeywords = useMemo(() => {
    const keywordsValue = metadata.keywords || '';
    if (!keywordsValue.trim()) return [];
    return keywordsValue
      .split(',')
      .map(kw => kw.trim().toLowerCase())
      .filter(kw => kw.length > 0);
  }, [metadata.keywords]);

  const {
    setCombos,
    addCombo,
    removeCombo: removeComboFromStore,
    combos,
    setSearchQuery,
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

  // Ranking analysis (Title + Subtitle + Keywords - what actually ranks in App Store)
  const rankingAnalysis = useMemo(() => {
    const tokenSet = extractRankingTokens(metadata.title, metadata.subtitle);
    const efficiency = calculateRankingSlotEfficiency(metadata.title, metadata.subtitle);
    const duplicates = analyzeDuplicates(metadata.title, metadata.subtitle, metadata.keywords || '');
    const distribution = createRankingDistributionMap(metadata.title, metadata.subtitle);

    return { tokenSet, efficiency, duplicates, distribution };
  }, [metadata.title, metadata.subtitle, metadata.keywords]);

  // v2.3: Use backend-generated combos (single source of truth)
  // Backend now generates ALL combos with strength classification
  const [comboAnalysis, setComboAnalysis] = useState(() => {
    const backendCombos = comboCoverage.combos || [];

    // Use backend GeneratedCombo directly - source is already compatible
    const allPossibleCombos: GeneratedCombo[] = backendCombos;

    const existingCombos = allPossibleCombos.filter(c => c.exists);
    const missingCombos = allPossibleCombos.filter(c => !c.exists);

    // Use backend stats directly, with fallback calculation for backwards compatibility
    let stats;
    if (comboCoverage.stats) {
      // Backend provides complete stats - use directly
      stats = {
        totalPossible: comboCoverage.stats.totalPossible,
        existing: comboCoverage.stats.existing,
        missing: comboCoverage.stats.missing,
        coveragePct: comboCoverage.stats.coveragePct,
        // Strength tier breakdowns (all from backend)
        titleConsecutive: comboCoverage.stats.titleConsecutive || 0,
        titleNonConsecutive: comboCoverage.stats.titleNonConsecutive || 0,
        titleKeywordsCross: comboCoverage.stats.titleKeywordsCross || 0,
        crossElement: comboCoverage.stats.crossElement || 0,
        keywordsConsecutive: comboCoverage.stats.keywordsConsecutive || 0,
        subtitleConsecutive: comboCoverage.stats.subtitleConsecutive || 0,
        keywordsSubtitleCross: comboCoverage.stats.keywordsSubtitleCross || 0,
        keywordsNonConsecutive: comboCoverage.stats.keywordsNonConsecutive || 0,
        subtitleNonConsecutive: comboCoverage.stats.subtitleNonConsecutive || 0,
        threeWayCross: comboCoverage.stats.threeWayCross || 0,
      };
    } else {
      // Fallback: Calculate from combos array (backwards compatibility)
      console.warn('[EnhancedKeywordComboWorkbench] Backend stats missing, calculating from combos');
      stats = {
        totalPossible: allPossibleCombos.length,
        existing: existingCombos.length,
        missing: missingCombos.length,
        coveragePct: allPossibleCombos.length > 0
          ? Math.round((existingCombos.length / allPossibleCombos.length) * 100)
          : 0,
        titleConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.TITLE_CONSECUTIVE).length,
        titleNonConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.TITLE_NON_CONSECUTIVE).length,
        titleKeywordsCross: allPossibleCombos.filter(c => c.strength === ComboStrength.TITLE_KEYWORDS_CROSS).length,
        crossElement: allPossibleCombos.filter(c => c.strength === ComboStrength.CROSS_ELEMENT).length,
        keywordsConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.KEYWORDS_CONSECUTIVE).length,
        subtitleConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.SUBTITLE_CONSECUTIVE).length,
        keywordsSubtitleCross: allPossibleCombos.filter(c => c.strength === ComboStrength.KEYWORDS_SUBTITLE_CROSS).length,
        keywordsNonConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.KEYWORDS_NON_CONSECUTIVE).length,
        subtitleNonConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.SUBTITLE_NON_CONSECUTIVE).length,
        threeWayCross: allPossibleCombos.filter(c => c.strength === ComboStrength.THREE_WAY_CROSS).length,
      };
    }

    return {
      allPossibleCombos,
      existingCombos,
      missingCombos,
      recommendedToAdd: missingCombos
        .sort((a, b) => b.strengthScore - a.strengthScore)
        .slice(0, 10),
      stats,
    };
  });

  // v2.3: Recompute combo analysis when backend data changes
  useEffect(() => {
    const backendCombos = comboCoverage.combos || [];

    // Use backend GeneratedCombo directly - source is already compatible
    const allPossibleCombos: GeneratedCombo[] = backendCombos;

    const existingCombos = allPossibleCombos.filter(c => c.exists);
    const missingCombos = allPossibleCombos.filter(c => !c.exists);

    // Use backend stats directly, with fallback calculation for backwards compatibility
    let stats;
    if (comboCoverage.stats) {
      // Backend provides complete stats - use directly
      stats = {
        totalPossible: comboCoverage.stats.totalPossible,
        existing: comboCoverage.stats.existing,
        missing: comboCoverage.stats.missing,
        coveragePct: comboCoverage.stats.coveragePct,
        // Strength tier breakdowns (all from backend)
        titleConsecutive: comboCoverage.stats.titleConsecutive || 0,
        titleNonConsecutive: comboCoverage.stats.titleNonConsecutive || 0,
        titleKeywordsCross: comboCoverage.stats.titleKeywordsCross || 0,
        crossElement: comboCoverage.stats.crossElement || 0,
        keywordsConsecutive: comboCoverage.stats.keywordsConsecutive || 0,
        subtitleConsecutive: comboCoverage.stats.subtitleConsecutive || 0,
        keywordsSubtitleCross: comboCoverage.stats.keywordsSubtitleCross || 0,
        keywordsNonConsecutive: comboCoverage.stats.keywordsNonConsecutive || 0,
        subtitleNonConsecutive: comboCoverage.stats.subtitleNonConsecutive || 0,
        threeWayCross: comboCoverage.stats.threeWayCross || 0,
      };
    } else {
      // Fallback: Calculate from combos array (backwards compatibility)
      console.warn('[EnhancedKeywordComboWorkbench] Backend stats missing in useEffect, calculating from combos');
      stats = {
        totalPossible: allPossibleCombos.length,
        existing: existingCombos.length,
        missing: missingCombos.length,
        coveragePct: allPossibleCombos.length > 0
          ? Math.round((existingCombos.length / allPossibleCombos.length) * 100)
          : 0,
        titleConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.TITLE_CONSECUTIVE).length,
        titleNonConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.TITLE_NON_CONSECUTIVE).length,
        titleKeywordsCross: allPossibleCombos.filter(c => c.strength === ComboStrength.TITLE_KEYWORDS_CROSS).length,
        crossElement: allPossibleCombos.filter(c => c.strength === ComboStrength.CROSS_ELEMENT).length,
        keywordsConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.KEYWORDS_CONSECUTIVE).length,
        subtitleConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.SUBTITLE_CONSECUTIVE).length,
        keywordsSubtitleCross: allPossibleCombos.filter(c => c.strength === ComboStrength.KEYWORDS_SUBTITLE_CROSS).length,
        keywordsNonConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.KEYWORDS_NON_CONSECUTIVE).length,
        subtitleNonConsecutive: allPossibleCombos.filter(c => c.strength === ComboStrength.SUBTITLE_NON_CONSECUTIVE).length,
        threeWayCross: allPossibleCombos.filter(c => c.strength === ComboStrength.THREE_WAY_CROSS).length,
      };
    }

    setComboAnalysis({
      allPossibleCombos,
      existingCombos,
      missingCombos,
      recommendedToAdd: missingCombos
        .sort((a, b) => b.strengthScore - a.strengthScore)
        .slice(0, 10),
      stats,
    });
  }, [comboCoverage.combos, comboCoverage.stats]);

  // Sync EnhancedComboFilters with Zustand store filters
  useEffect(() => {
    // Sync keyword search
    setSearchQuery(filters.keywordSearch);

    // Sync length filter (only 2 and 3 word combos supported)
    if (filters.length === 'all' || filters.length === '2' || filters.length === '3') {
      setLengthFilter(filters.length);
    } else {
      // If EnhancedComboFilters selects 4 or 5+, default to 'all' since we don't support 4+ anymore
      setLengthFilter('all');
    }
  }, [filters.keywordSearch, filters.length, setSearchQuery, setLengthFilter]);

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

    // Filter by keyword search (cast to engine type for compatibility)
    if (filters.keywordSearch) {
      combos = filterCombosByKeyword(combos as unknown as EngineGeneratedCombo[], filters.keywordSearch) as unknown as GeneratedCombo[];
    }

    // Filter by strategic value (using strengthScore)
    if (filters.minStrategicValue > 0) {
      combos = combos.filter(c => (c.strengthScore || 0) >= filters.minStrategicValue);
    }

    // Filter by brand type
    if (filters.brandType === 'generic') {
      combos = combos.filter(c => c.isGeneric);
    } else if (filters.brandType === 'branded') {
      combos = combos.filter(c => c.isBranded);
    }

    return combos;
  }, [comboAnalysis, filters, selection]);

  const handleExportCSV = () => {
    // Convert GeneratedCombo to ClassifiedCombo format for export
    const exportData = filteredCombos.map(c => ({
      text: c.text,
      type: 'generic' as const,
      relevanceScore: Math.round((c.strengthScore || 0) / 25),
      source: c.source as any,
    }));
    exportCombosToCSV(exportData);
  };

  const handleExportXLSX = () => {
    // Convert GeneratedCombo to ClassifiedCombo format for export
    const exportData = filteredCombos.map(c => ({
      text: c.text,
      type: 'generic' as const,
      relevanceScore: Math.round((c.strengthScore || 0) / 25),
      source: c.source as any,
    }));
    exportCombosToXLSX(exportData);
  };

  const handleExportJSON = () => {
    // Convert GeneratedCombo to ClassifiedCombo format for export
    const exportData = filteredCombos.map(c => ({
      text: c.text,
      type: 'generic' as const,
      relevanceScore: Math.round((c.strengthScore || 0) / 25),
      source: c.source as any,
    }));
    exportCombosToJSON(exportData, undefined, false);
  };

  const handleCopyAll = () => {
    const text = filteredCombos.map(c => c.text).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${filteredCombos.length} combos to clipboard`);
  };

  // Handler to add combo to the All Combos Table
  const handleAddCombo = (combo: GeneratedCombo) => {
    addCombo({
      text: combo.text,
      type: 'generic', // Default to generic for user-added combos
      source: 'custom',
      userMarkedAsNoise: false,
      strength: combo.strength,
      exists: combo.exists,
      canStrengthen: combo.canStrengthen,
      strengtheningSuggestion: combo.strengtheningSuggestion,
    } as any);
    // No toast - we show inline undo notification
  };

  // Handler to remove combo from the All Combos Table (for undo)
  const handleRemoveCombo = (comboText: string) => {
    removeComboFromStore(comboText);
    toast.info(`Removed "${comboText}" from table`);
  };

  // Get stats based on current brand filter (uses pre-calculated backend stats)
  const filteredStats = useMemo(() => {
    // Use pre-calculated stats from backend if available
    if (comboCoverage.statsByBrandType) {
      return comboCoverage.statsByBrandType[filters.brandType] || comboCoverage.statsByBrandType.all;
    }

    // Fallback: Use legacy stats (backwards compatibility)
    return comboAnalysis.stats;
  }, [comboCoverage.statsByBrandType, filters.brandType, comboAnalysis.stats]);

  // Filter combos by strength for tier rows (respects brand filter)
  const combosByStrength = useMemo(() => {
    // Apply brand filter first
    let baseCombos = comboAnalysis.allPossibleCombos;
    if (filters.brandType === 'generic') {
      baseCombos = baseCombos.filter(c => c.isGeneric);
    } else if (filters.brandType === 'branded') {
      baseCombos = baseCombos.filter(c => c.isBranded);
    }

    // Then group by strength tier
    return {
      titleConsecutive: baseCombos.filter(c => c.strength === ComboStrength.TITLE_CONSECUTIVE),
      titleNonConsecutive: baseCombos.filter(c => c.strength === ComboStrength.TITLE_NON_CONSECUTIVE),
      titleKeywordsCross: baseCombos.filter(c => c.strength === ComboStrength.TITLE_KEYWORDS_CROSS),
      crossElement: baseCombos.filter(c => c.strength === ComboStrength.CROSS_ELEMENT),
      keywordsConsecutive: baseCombos.filter(c => c.strength === ComboStrength.KEYWORDS_CONSECUTIVE),
      subtitleConsecutive: baseCombos.filter(c => c.strength === ComboStrength.SUBTITLE_CONSECUTIVE),
      keywordsSubtitleCross: baseCombos.filter(c => c.strength === ComboStrength.KEYWORDS_SUBTITLE_CROSS),
      keywordsNonConsecutive: baseCombos.filter(c => c.strength === ComboStrength.KEYWORDS_NON_CONSECUTIVE),
      subtitleNonConsecutive: baseCombos.filter(c => c.strength === ComboStrength.SUBTITLE_NON_CONSECUTIVE),
      threeWayCross: baseCombos.filter(c => c.strength === ComboStrength.THREE_WAY_CROSS),
    };
  }, [comboAnalysis.allPossibleCombos, filters.brandType]);

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
        high: combos.filter(c => (c.strengthScore || 0) >= 70),
        medium: combos.filter(c => {
          const val = c.strengthScore || 0;
          return val >= 50 && val < 70;
        }),
        low: combos.filter(c => (c.strengthScore || 0) < 50),
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
      </CardHeader>

      <CardContent className="space-y-6">

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
            total: filteredStats.totalPossible,
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

        {/* Header, KPI Cards, Banners, and Distribution moved to ComboKpiSummary component (rendered at top of page) */}

        {/* Strength Breakdown - Phase 2: All 10 Tiers */}
        <div className="border-t border-zinc-800 pt-6 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-medium text-zinc-400">
              Ranking Power Distribution (10-Tier System)
            </p>
            {filters.brandType !== 'all' && (
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-400/30 text-emerald-400 bg-emerald-500/5"
              >
                {filters.brandType === 'generic' ? 'Generic Only' : 'Branded Only'}
              </Badge>
            )}
          </div>

            {/* Tier 1: Strongest */}
            <div className="mb-3">
              <p className="text-[10px] text-zinc-500 uppercase mb-2">🟢 EXCELLENT - Tier 1 (100 pts)</p>
              <ComboStrengthTierRow
                emoji="🔥🔥🔥"
                label="Title (Exact Match)"
                count={filteredStats.titleConsecutive}
                combos={combosByStrength.titleConsecutive}
                onAddCombo={handleAddCombo}
                onRemoveCombo={handleRemoveCombo}
                isComboAdded={isComboAdded}
                totalCombos={filteredStats.totalPossible}
                tierLevel="excellent"
              />
            </div>

            {/* Tier 2: Very Strong */}
            <div className="mb-3">
              <p className="text-[10px] text-zinc-500 uppercase mb-2">🟢 EXCELLENT - Tier 2 (70-85 pts)</p>
              <div className="space-y-2">
                <ComboStrengthTierRow
                  emoji="🔥🔥"
                  label="Title (Non Exact Match)"
                  count={filteredStats.titleNonConsecutive}
                  combos={combosByStrength.titleNonConsecutive}
                  onAddCombo={handleAddCombo}
                  onRemoveCombo={handleRemoveCombo}
                  isComboAdded={isComboAdded}
                  totalCombos={filteredStats.totalPossible}
                  tierLevel="excellent"
                />
                <ComboStrengthTierRow
                  emoji="🔥⚡"
                  label="Title + Keywords Cross"
                  count={filteredStats.titleKeywordsCross || 0}
                  combos={combosByStrength.titleKeywordsCross}
                  onAddCombo={handleAddCombo}
                  onRemoveCombo={handleRemoveCombo}
                  isComboAdded={isComboAdded}
                  totalCombos={filteredStats.totalPossible}
                  tierLevel="excellent"
                />
              </div>
            </div>

            {/* Tier 3: Medium */}
            <div className="mb-3">
              <p className="text-[10px] text-zinc-500 uppercase mb-2">🟡 GOOD - Tier 3 (70 pts)</p>
              <ComboStrengthTierRow
                emoji="⚡"
                label="Title + Subtitle"
                count={filteredStats.crossElement}
                combos={combosByStrength.crossElement}
                onAddCombo={handleAddCombo}
                onRemoveCombo={handleRemoveCombo}
                isComboAdded={isComboAdded}
                totalCombos={filteredStats.totalPossible}
                tierLevel="good"
              />
            </div>

            {/* Tier 4: Weak */}
            <div className="mb-3">
              <p className="text-[10px] text-zinc-500 uppercase mb-2">🟠 NEEDS IMPROVEMENT - Tier 4 (50 pts)</p>
              <div className="space-y-2">
                <ComboStrengthTierRow
                  emoji="💤"
                  label="Keywords (Exact Match)"
                  count={filteredStats.keywordsConsecutive || 0}
                  combos={combosByStrength.keywordsConsecutive}
                  onAddCombo={handleAddCombo}
                  onRemoveCombo={handleRemoveCombo}
                  isComboAdded={isComboAdded}
                  totalCombos={filteredStats.totalPossible}
                  tierLevel="needs-improvement"
                />
                <ComboStrengthTierRow
                  emoji="💤"
                  label="Subtitle (Exact Match)"
                  count={filteredStats.subtitleConsecutive}
                  combos={combosByStrength.subtitleConsecutive}
                  onAddCombo={handleAddCombo}
                  onRemoveCombo={handleRemoveCombo}
                  isComboAdded={isComboAdded}
                  totalCombos={filteredStats.totalPossible}
                  tierLevel="needs-improvement"
                />
              </div>
            </div>

            {/* Tier 5: Very Weak */}
            <div className="mb-3">
              <p className="text-[10px] text-zinc-500 uppercase mb-2">🟠 NEEDS IMPROVEMENT - Tier 5 (30-35 pts)</p>
              <div className="space-y-2">
                <ComboStrengthTierRow
                  emoji="💤⚡"
                  label="Keywords + Subtitle Cross"
                  count={filteredStats.keywordsSubtitleCross || 0}
                  combos={combosByStrength.keywordsSubtitleCross}
                  onAddCombo={handleAddCombo}
                  onRemoveCombo={handleRemoveCombo}
                  isComboAdded={isComboAdded}
                  totalCombos={filteredStats.totalPossible}
                  tierLevel="needs-improvement"
                />
                <ComboStrengthTierRow
                  emoji="💤💤"
                  label="Keywords (Non Exact Match)"
                  count={filteredStats.keywordsNonConsecutive || 0}
                  combos={combosByStrength.keywordsNonConsecutive}
                  onAddCombo={handleAddCombo}
                  onRemoveCombo={handleRemoveCombo}
                  isComboAdded={isComboAdded}
                  totalCombos={filteredStats.totalPossible}
                  tierLevel="needs-improvement"
                />
                <ComboStrengthTierRow
                  emoji="💤💤"
                  label="Subtitle (Non Exact Match)"
                  count={filteredStats.subtitleNonConsecutive}
                  combos={combosByStrength.subtitleNonConsecutive}
                  onAddCombo={handleAddCombo}
                  onRemoveCombo={handleRemoveCombo}
                  isComboAdded={isComboAdded}
                  totalCombos={filteredStats.totalPossible}
                  tierLevel="needs-improvement"
                />
              </div>
            </div>

            {/* Tier 6: Weakest */}
            <div className="mb-3">
              <p className="text-[10px] text-zinc-500 uppercase mb-2">🔴 CRITICAL - Tier 6 (20 pts)</p>
              <ComboStrengthTierRow
                emoji="💤💤💤"
                label="All Fields Combined"
                count={filteredStats.threeWayCross || 0}
                combos={combosByStrength.threeWayCross}
                onAddCombo={handleAddCombo}
                onRemoveCombo={handleRemoveCombo}
                isComboAdded={isComboAdded}
                totalCombos={filteredStats.totalPossible}
                tierLevel="critical"
              />
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

        {/* Keywords Field Input moved to KeywordsInputCard (rendered in element cards section) */}

        {/* Strategic Keyword Frequency Analysis */}
        <StrategicKeywordFrequencyPanel
          combos={combos}
        />

        {/* Contextual Pro Tips */}
        <div className="pt-4 space-y-2 border-t border-zinc-800">
          {filters.keywordSearch && (
            <p className="text-xs text-zinc-500 italic">
              💡 <span className="font-medium">Pro Tip:</span> "{filters.keywordSearch}" appears in{' '}
              {filteredCombos.length} combos with{' '}
              {Math.round((filteredCombos.filter(c => c.exists).length / filteredCombos.length) * 100)}% coverage.
              {filteredCombos.filter(c => !c.exists && (c.strengthScore || 0) >= 70).length > 0 && (
                <> Focus on high-value missing combos like "
                {filteredCombos.filter(c => !c.exists && (c.strengthScore || 0) >= 70).slice(0, 2).map(c => c.text).join('", "')}"
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
