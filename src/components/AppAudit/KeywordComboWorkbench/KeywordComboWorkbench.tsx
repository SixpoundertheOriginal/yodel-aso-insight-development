/**
 * Keyword Combo Workbench
 *
 * Interactive workbench for analyzing, editing, and exporting keyword combinations.
 * Replaces the legacy ComboCoverageCard with full CRUD functionality.
 *
 * Features:
 * - Editable combos (inline editing)
 * - Sortable columns
 * - Advanced filtering (source, type, intent, search)
 * - Copy single/all combos
 * - Export to CSV
 * - Mark combos as noise
 * - Expandable rows with tokenization + metadata
 */

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, Download, Copy, Trash2 } from 'lucide-react';
import { KeywordComboFilters } from './KeywordComboFilters';
import { KeywordComboTable } from './KeywordComboTable';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { exportCombosToCSV, copyAllCombosToClipboard, copySelectedCombos } from '@/utils/comboExporter';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';
import { KeywordCoverageCard } from '../UnifiedMetadataAuditModule/KeywordCoverageCard';
import { ComboHeatmap } from '../UnifiedMetadataAuditModule/charts/ComboHeatmap';

interface KeywordComboWorkbenchProps {
  comboCoverage: UnifiedMetadataAuditResult['comboCoverage'];
  keywordCoverage?: UnifiedMetadataAuditResult['keywordCoverage']; // Optional for compact card
}

export const KeywordComboWorkbench: React.FC<KeywordComboWorkbenchProps> = ({ comboCoverage, keywordCoverage }) => {
  const {
    setCombos,
    getSortedCombos,
    getFilteredCombos,
    selectedIndices,
    deselectAll,
  } = useKeywordComboStore();

  // Initialize combos from prop data
  useEffect(() => {
    const titleCombos = comboCoverage.titleCombosClassified || [];
    const subtitleCombos = comboCoverage.subtitleNewCombosClassified || [];
    const allCombos = [...titleCombos, ...subtitleCombos];

    setCombos(allCombos);
  }, [comboCoverage, setCombos]);

  const sortedCombos = getSortedCombos();
  const filteredCombos = getFilteredCombos();
  const selectedCombos = sortedCombos.filter((_, idx) => selectedIndices.has(idx));

  // Brand/generic/competitor counts (Phase 5 aware)
  const useBrandClassification = AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED && sortedCombos.some(c => 'brandClassification' in c && c.brandClassification);

  let brandCount = 0;
  let genericCount = 0;
  let competitorCount = 0;

  if (useBrandClassification) {
    brandCount = sortedCombos.filter(c => 'brandClassification' in c && c.brandClassification === 'brand').length;
    genericCount = sortedCombos.filter(c => 'brandClassification' in c && c.brandClassification === 'generic').length;
    competitorCount = sortedCombos.filter(c => 'brandClassification' in c && c.brandClassification === 'competitor').length;
  } else {
    brandCount = sortedCombos.filter(c => c.type === 'branded').length;
    genericCount = sortedCombos.filter(c => c.type === 'generic').length;
  }

  const lowValueCount = (comboCoverage.lowValueCombos || []).length;

  const handleExportCSV = () => {
    exportCombosToCSV(sortedCombos);
  };

  const handleCopyAll = () => {
    copyAllCombosToClipboard(sortedCombos);
  };

  const handleCopySelected = () => {
    copySelectedCombos(selectedCombos);
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
              KEYWORD COMBO WORKBENCH
            </CardTitle>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Interactive analysis • Editable • Sortable • Exportable
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-xl font-mono font-normal px-4 py-1 border-violet-400/30 text-violet-400"
            style={{
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            }}
          >
            {comboCoverage.totalCombos}
          </Badge>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 text-xs text-zinc-400 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-medium">{brandCount}</span> <span className="text-zinc-500">brand</span>
            <span className="text-zinc-700">•</span>
            <span className="text-emerald-400 font-medium">{genericCount}</span> <span className="text-zinc-500">generic</span>
            {useBrandClassification && competitorCount > 0 && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="text-orange-400 font-medium">{competitorCount}</span> <span className="text-zinc-500">competitor</span>
              </>
            )}
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-500 font-medium">{lowValueCount}</span> <span className="text-zinc-600">low-value</span>
          </div>
          <div className="text-zinc-700">|</div>
          <div className="text-zinc-500">
            Showing <span className="text-zinc-300 font-medium">{filteredCombos.length}</span> of{' '}
            <span className="text-zinc-300 font-medium">{sortedCombos.length}</span> combos
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
            Copy All ({sortedCombos.length})
          </Button>

          {selectedCombos.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopySelected}
                className="text-xs border-orange-500/40 text-orange-400 hover:border-orange-500"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Selected ({selectedCombos.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={deselectAll}
                className="text-xs border-zinc-700 text-zinc-400"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Deselect
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs border-emerald-500/40 text-emerald-400 hover:border-emerald-500"
          >
            <Download className="h-3 w-3 mr-1" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-0 pt-0">
        {/* Compact Keyword Coverage Card */}
        {keywordCoverage && (
          <div className="mb-6 pb-4 border-b border-zinc-800/40">
            <KeywordCoverageCard keywordCoverage={keywordCoverage} compact />
          </div>
        )}

        {/* Combo Heatmap */}
        <div className="mb-6">
          <ComboHeatmap comboCoverage={comboCoverage} topN={10} />
        </div>

        {/* Filters */}
        <KeywordComboFilters />

        {/* Table */}
        <KeywordComboTable />

        {/* Footer Help Text */}
        <div className="pt-4 space-y-2 border-t border-zinc-800 mt-4">
          <p className="text-xs text-zinc-500 italic">
            💡 <span className="font-medium">Pro Tip:</span> Click a combo to edit inline. Mark irrelevant combos as "noise" to filter them out. Export to CSV for deeper analysis in your keyword research tools.
          </p>
          <p className="text-xs text-zinc-500">
            Generic discovery combos drive incremental App Store search. Brand combos support returning users. Low-value combos have minimal ranking impact.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
