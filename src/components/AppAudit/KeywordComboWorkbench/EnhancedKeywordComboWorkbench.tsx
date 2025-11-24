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
import { Link2, Table, Grid3x3, AlertTriangle, BarChart3, Download, Copy } from 'lucide-react';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { analyzeAllCombos, filterCombosByKeyword, type GeneratedCombo } from '@/engine/combos/comboGenerationEngine';
import { EnhancedComboFilters, type ComboFilterState } from './EnhancedComboFilters';
import { ComboMatrixView } from './ComboMatrixView';
import { MissingCombosView } from './MissingCombosView';
import { KeywordFrequencyView } from './KeywordFrequencyView';
import { KeywordComboTable } from './KeywordComboTable';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { exportCombosToCSV, copyAllCombosToClipboard } from '@/utils/comboExporter';
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

  const { setCombos } = useKeywordComboStore();

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
  }, [comboAnalysis, filters]);

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

  const handleCopyAll = () => {
    const text = filteredCombos.map(c => c.text).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${filteredCombos.length} combos to clipboard`);
  };

  return (
    <Card className="relative bg-black/40 backdrop-blur-lg border border-zinc-800/50 rounded-xl hover:border-orange-500/30 transition-all duration-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
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

          {comboAnalysis.recommendedToAdd.length > 0 && (
            <Badge variant="outline" className="border-violet-400/30 text-violet-400 text-xs">
              {comboAnalysis.recommendedToAdd.length} Recommendations
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enhanced Filters */}
        <EnhancedComboFilters
          filters={filters}
          onChange={setFilters}
          stats={{
            total: comboAnalysis.stats.totalPossible,
            filtered: filteredCombos.length,
          }}
        />

        {/* All Views - No Tabs */}
        <div className="space-y-8">
          {/* Missing Combos View */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-violet-400" />
              <h3 className="text-base font-medium text-zinc-300 uppercase tracking-wide">
                Missing Opportunities
              </h3>
            </div>
            <MissingCombosView
              missingCombos={comboAnalysis.missingCombos}
              recommendedCombos={comboAnalysis.recommendedToAdd}
            />
          </div>

          {/* Keyword Frequency View */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-violet-400" />
              <h3 className="text-base font-medium text-zinc-300 uppercase tracking-wide">
                Keyword Frequency Analysis
              </h3>
            </div>
            <KeywordFrequencyView
              titleKeywords={keywordCoverage.titleKeywords}
              subtitleKeywords={keywordCoverage.subtitleNewKeywords}
              combos={filteredCombos}
            />
          </div>

          {/* Matrix View */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Grid3x3 className="h-5 w-5 text-violet-400" />
              <h3 className="text-base font-medium text-zinc-300 uppercase tracking-wide">
                Combination Matrix
              </h3>
            </div>
            <ComboMatrixView
              titleKeywords={keywordCoverage.titleKeywords}
              subtitleKeywords={keywordCoverage.subtitleNewKeywords}
              combos={filteredCombos}
            />
          </div>

          {/* Table View */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Table className="h-5 w-5 text-violet-400" />
              <h3 className="text-base font-medium text-zinc-300 uppercase tracking-wide">
                All Combos Table
              </h3>
            </div>
            <KeywordComboTable />
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
