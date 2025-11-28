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

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, Table, Download, Copy, FileJson, FileSpreadsheet, X, ChevronDown, ChevronRight, Plus, CheckCircle } from 'lucide-react';
import { useWorkbenchSelection } from '@/contexts/WorkbenchSelectionContext';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { analyzeAllCombos, filterCombosByKeyword, type GeneratedCombo } from '@/engine/combos/comboGenerationEngine';
import { EnhancedComboFilters, type ComboFilterState } from './EnhancedComboFilters';
import { KeywordComboTable } from './KeywordComboTable';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { exportCombosToCSV, copyAllCombosToClipboard, exportCombosToXLSX, exportCombosToJSON } from '@/utils/comboExporter';
import { isV2_1FeatureEnabled } from '@/config/metadataFeatureFlags';
import { toast } from 'sonner';

interface EnhancedKeywordComboWorkbenchProps {
  comboCoverage: UnifiedMetadataAuditResult['comboCoverage'];
  keywordCoverage: UnifiedMetadataAuditResult['keywordCoverage'];
  metadata: {
    title: string;
    subtitle: string;
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

  // Keyword suggestion expansion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    missing: false,
    highValue: false,
    mediumValue: false,
    lowValue: false,
    longTail: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const { setCombos, addCombo, combos } = useKeywordComboStore();

  // Workbench selection integration
  const {
    selection,
    workbenchRef,
    removeKeyword,
    removeCombo,
    clearSelection,
    hasSelection,
  } = useWorkbenchSelection();

  // Generate comprehensive combo analysis
  const comboAnalysis = useMemo(() => {
    return analyzeAllCombos(
      keywordCoverage.titleKeywords,
      keywordCoverage.subtitleNewKeywords,
      metadata.title,
      metadata.subtitle,
      comboCoverage.titleCombosClassified
    );
  }, [keywordCoverage, metadata, comboCoverage]);

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
    const titleCombos = comboCoverage.titleCombosClassified || [];
    const subtitleCombos = comboCoverage.subtitleNewCombosClassified || [];
    const allCombos = [...titleCombos, ...subtitleCombos];
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

  const v2_1Enabled = isV2_1FeatureEnabled('COMBO_ENHANCE');

  // Calculate keyword suggestions by category
  const keywordSuggestions = useMemo(() => {
    const all = comboAnalysis.allPossibleCombos;

    return {
      missing: all.filter(c => !c.exists),
      highValue: all.filter(c => (c.strategicValue || 0) >= 70),
      mediumValue: all.filter(c => {
        const val = c.strategicValue || 0;
        return val >= 50 && val < 70;
      }),
      lowValue: all.filter(c => (c.strategicValue || 0) < 50 && (c.strategicValue || 0) > 0),
      longTail: all.filter(c => c.length >= 3),
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-medium tracking-wide uppercase text-zinc-300">
              <Link2 className="h-4 w-4 text-violet-400" />
              ENHANCED KEYWORD COMBO WORKBENCH
            </CardTitle>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Powered by ASO Bible • All Possible Combinations • Strategic Recommendations
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
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
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Keyword Suggestions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-zinc-400 uppercase">Keyword Suggestions:</span>
            <span className="text-[10px] text-zinc-500">Click to add to workbench</span>
          </div>

          {/* Missing Opportunities */}
          {keywordSuggestions.missing.length > 0 && (
            <div className="p-4 bg-orange-500/5 rounded-lg border border-orange-400/20">
              <div
                className="flex items-center justify-between cursor-pointer mb-3"
                onClick={() => toggleSection('missing')}
              >
                <div className="flex items-center gap-2">
                  {expandedSections.missing ? <ChevronDown className="h-4 w-4 text-orange-400" /> : <ChevronRight className="h-4 w-4 text-orange-400" />}
                  <span className="text-sm font-medium text-orange-300">
                    🚨 Missing Opportunities ({keywordSuggestions.missing.length})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {keywordSuggestions.missing.slice(0, expandedSections.missing ? undefined : 10).map((combo, idx) => {
                  const isAdded = isComboAdded(combo.text);
                  return (
                    <Badge
                      key={idx}
                      onClick={() => !isAdded && handleAddCombo(combo)}
                      className={`cursor-pointer transition-all ${
                        isAdded
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40 cursor-not-allowed'
                          : 'bg-orange-500/10 text-orange-300 border-orange-400/30 hover:bg-orange-500/20 hover:scale-105'
                      }`}
                    >
                      {isAdded ? <CheckCircle className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                      {combo.text}
                      {combo.strategicValue !== undefined && (
                        <span className="ml-1 text-[10px] opacity-70">({combo.strategicValue})</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
              {keywordSuggestions.missing.length > 10 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); toggleSection('missing'); }}
                  className="mt-3 text-xs text-orange-400 hover:text-orange-300"
                >
                  {expandedSections.missing ? 'Show Less' : `View ${keywordSuggestions.missing.length - 10} More`}
                </Button>
              )}
            </div>
          )}

          {/* High Value */}
          {keywordSuggestions.highValue.length > 0 && (
            <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-400/20">
              <div
                className="flex items-center justify-between cursor-pointer mb-3"
                onClick={() => toggleSection('highValue')}
              >
                <div className="flex items-center gap-2">
                  {expandedSections.highValue ? <ChevronDown className="h-4 w-4 text-emerald-400" /> : <ChevronRight className="h-4 w-4 text-emerald-400" />}
                  <span className="text-sm font-medium text-emerald-300">
                    ⭐ High Value 70+ ({keywordSuggestions.highValue.length})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {keywordSuggestions.highValue.slice(0, expandedSections.highValue ? undefined : 10).map((combo, idx) => {
                  const isAdded = isComboAdded(combo.text);
                  return (
                    <Badge
                      key={idx}
                      onClick={() => !isAdded && handleAddCombo(combo)}
                      className={`cursor-pointer transition-all ${
                        isAdded
                          ? 'bg-emerald-500/40 text-emerald-300 border-emerald-400/60 cursor-not-allowed'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/20 hover:scale-105'
                      }`}
                    >
                      {isAdded ? <CheckCircle className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                      {combo.text}
                      {combo.strategicValue !== undefined && (
                        <span className="ml-1 text-[10px] opacity-70">({combo.strategicValue})</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
              {keywordSuggestions.highValue.length > 10 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); toggleSection('highValue'); }}
                  className="mt-3 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  {expandedSections.highValue ? 'Show Less' : `View ${keywordSuggestions.highValue.length - 10} More`}
                </Button>
              )}
            </div>
          )}

          {/* Medium Value */}
          {keywordSuggestions.mediumValue.length > 0 && (
            <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-400/20">
              <div
                className="flex items-center justify-between cursor-pointer mb-3"
                onClick={() => toggleSection('mediumValue')}
              >
                <div className="flex items-center gap-2">
                  {expandedSections.mediumValue ? <ChevronDown className="h-4 w-4 text-blue-400" /> : <ChevronRight className="h-4 w-4 text-blue-400" />}
                  <span className="text-sm font-medium text-blue-300">
                    📊 Medium Value 50-69 ({keywordSuggestions.mediumValue.length})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {keywordSuggestions.mediumValue.slice(0, expandedSections.mediumValue ? undefined : 10).map((combo, idx) => {
                  const isAdded = isComboAdded(combo.text);
                  return (
                    <Badge
                      key={idx}
                      onClick={() => !isAdded && handleAddCombo(combo)}
                      className={`cursor-pointer transition-all ${
                        isAdded
                          ? 'bg-blue-500/40 text-blue-300 border-blue-400/60 cursor-not-allowed'
                          : 'bg-blue-500/10 text-blue-300 border-blue-400/30 hover:bg-blue-500/20 hover:scale-105'
                      }`}
                    >
                      {isAdded ? <CheckCircle className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                      {combo.text}
                      {combo.strategicValue !== undefined && (
                        <span className="ml-1 text-[10px] opacity-70">({combo.strategicValue})</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
              {keywordSuggestions.mediumValue.length > 10 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); toggleSection('mediumValue'); }}
                  className="mt-3 text-xs text-blue-400 hover:text-blue-300"
                >
                  {expandedSections.mediumValue ? 'Show Less' : `View ${keywordSuggestions.mediumValue.length - 10} More`}
                </Button>
              )}
            </div>
          )}

          {/* Long-Tail */}
          {keywordSuggestions.longTail.length > 0 && (
            <div className="p-4 bg-purple-500/5 rounded-lg border border-purple-400/20">
              <div
                className="flex items-center justify-between cursor-pointer mb-3"
                onClick={() => toggleSection('longTail')}
              >
                <div className="flex items-center gap-2">
                  {expandedSections.longTail ? <ChevronDown className="h-4 w-4 text-purple-400" /> : <ChevronRight className="h-4 w-4 text-purple-400" />}
                  <span className="text-sm font-medium text-purple-300">
                    📏 Long-Tail 3+ ({keywordSuggestions.longTail.length})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {keywordSuggestions.longTail.slice(0, expandedSections.longTail ? undefined : 10).map((combo, idx) => {
                  const isAdded = isComboAdded(combo.text);
                  return (
                    <Badge
                      key={idx}
                      onClick={() => !isAdded && handleAddCombo(combo)}
                      className={`cursor-pointer transition-all ${
                        isAdded
                          ? 'bg-purple-500/40 text-purple-300 border-purple-400/60 cursor-not-allowed'
                          : 'bg-purple-500/10 text-purple-300 border-purple-400/30 hover:bg-purple-500/20 hover:scale-105'
                      }`}
                    >
                      {isAdded ? <CheckCircle className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                      {combo.text}
                      {combo.strategicValue !== undefined && (
                        <span className="ml-1 text-[10px] opacity-70">({combo.strategicValue})</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
              {keywordSuggestions.longTail.length > 10 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); toggleSection('longTail'); }}
                  className="mt-3 text-xs text-purple-400 hover:text-purple-300"
                >
                  {expandedSections.longTail ? 'Show Less' : `View ${keywordSuggestions.longTail.length - 10} More`}
                </Button>
              )}
            </div>
          )}
        </div>

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

        {/* Single Unified Table View */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Table className="h-5 w-5 text-violet-400" />
            <h3 className="text-base font-medium text-zinc-300 uppercase tracking-wide">
              All Combos Table
            </h3>
          </div>
          <KeywordComboTable />
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
