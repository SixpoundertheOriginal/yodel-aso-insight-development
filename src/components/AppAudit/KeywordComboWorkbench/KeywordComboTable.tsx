/**
 * Keyword Combo Table
 *
 * Main table component displaying all combos with sortable columns.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUp, ArrowDown, ChevronsUpDown, Columns, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Copy, Download, PlusCircle, Loader2, SearchX, RefreshCw } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { KeywordComboRow } from './KeywordComboRow';
import { CustomKeywordInput } from './CustomKeywordInput';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import type { SortColumn } from '@/stores/useKeywordComboStore';
import type { ComboRankingData } from '@/hooks/useBatchComboRankings';
import { useKeywordPopularity, getPopularityEmoji, getPopularityColor } from '@/hooks/useKeywordPopularity';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

interface ColumnVisibility {
  status: boolean;
  type: boolean;
  priority: boolean;
  semantic: boolean;
  novelty: boolean;
  noise: boolean;
  source: boolean;
  length: boolean;
  competition: boolean;
}

// Sortable header component with Batman Arkham Knight tactical styling
const SortableHeader: React.FC<{
  column: SortColumn;
  children: React.ReactNode;
  onClick: () => void;
  sortIcon: React.ReactNode;
}> = ({ column, children, onClick, sortIcon }) => (
  <TableHead className="border-b-2 border-dashed border-orange-500/30">
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 px-2 font-mono text-[9px] font-light uppercase tracking-[0.25em] text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10 hover:shadow-[0_0_10px_rgba(249,115,22,0.15)] transition-all"
    >
      {children}
      <span className="ml-1.5">{sortIcon}</span>
    </Button>
  </TableHead>
);

interface KeywordComboTableProps {
  metadata?: {
    appId?: string;
    country?: string;
  };
}

export const KeywordComboTable: React.FC<KeywordComboTableProps> = ({ metadata }) => {
  // DEBUG: Log metadata on mount
  useEffect(() => {
    console.log('[KeywordComboTable] 🔍 Metadata received:', {
      metadata,
      hasAppId: !!metadata?.appId,
      hasCountry: !!metadata?.country,
      appId: metadata?.appId,
      country: metadata?.country,
    });
  }, [metadata]);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
    status: false,      // Hidden by default (V2.1 feature - no data yet)
    type: true,
    priority: true,     // Phase 2: Now visible by default (priority scoring complete)
    semantic: false,    // Hidden by default (V2.1 feature - no data yet)
    novelty: false,     // Hidden by default (V2.1 feature - no data yet)
    noise: false,       // Hidden by default (V2.1 feature - no data yet)
    source: true,
    length: true,
    competition: true,
  });

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  // Pagination and density state
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    sortColumn,
    sortDirection,
    setSorting,
    getSortedCombos,
    selectedIndices,
    selectAll,
    deselectAll,
    setCustomKeywords,
    customKeywords,
  } = useKeywordComboStore();

  const sortedCombos = getSortedCombos();

  // Load custom keywords from database on mount
  useEffect(() => {
    const loadCustomKeywords = async () => {
      if (!metadata?.appId) return;

      try {
        const { data, error } = await supabase
          .from('custom_keywords')
          .select('keyword, added_at')
          .eq('app_id', metadata.appId)
          .eq('platform', 'ios')
          .order('added_at', { ascending: false });

        if (error) {
          console.error('[KeywordComboTable] Failed to load custom keywords:', error);
          return;
        }

        if (data && data.length > 0) {
          const customCombos: ClassifiedCombo[] = data.map((row) => ({
            text: row.keyword,
            source: 'custom',
            type: 'generic',
            relevanceScore: 0,
            brandClassification: 'generic',
          }));

          setCustomKeywords(customCombos);
          console.log(`[KeywordComboTable] ✅ Loaded ${customCombos.length} custom keywords`);
        }
      } catch (error) {
        console.error('[KeywordComboTable] Error loading custom keywords:', error);
      }
    };

    loadCustomKeywords();
  }, [metadata?.appId, setCustomKeywords]);

  // Phase 2: Table-level caching with 24h expiry
  const [cachedRankings, setCachedRankings] = useState<Map<string, ComboRankingData>>(new Map());
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number | null>(null);
  const [isFetchingRankings, setIsFetchingRankings] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Check if cache is still valid (< 24 hours old)
  const isCacheValid = useMemo(() => {
    if (!lastFetchTimestamp) return false;

    const now = Date.now();
    const cacheAge = now - lastFetchTimestamp;
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    return cacheAge < CACHE_TTL;
  }, [lastFetchTimestamp]);

  // Get all unique combos (for fetching, independent of sort/filter)
  // MUST include both auto-generated combos AND custom keywords
  const allUniqueComboTexts = useMemo(() => {
    const allCombos = useKeywordComboStore.getState().combos;
    const allCustom = useKeywordComboStore.getState().customKeywords;
    const merged = [...allCombos, ...allCustom];
    return merged.map(c => c.text);
  }, [customKeywords]); // Re-compute when custom keywords change

  // Fetch rankings with cache validity check
  const fetchRankingsIfNeeded = useCallback(async (force = false) => {
    // Skip if cache is valid and not forcing refresh
    if (isCacheValid && !force && cachedRankings.size > 0) {
      console.log('[KeywordComboTable] ✅ Using cached rankings (valid for 24h)');
      return;
    }

    if (!metadata?.appId || allUniqueComboTexts.length === 0) {
      console.warn('[KeywordComboTable] ⚠️ Cannot fetch: missing appId or combos');
      return;
    }

    try {
      setIsFetchingRankings(true);
      setFetchError(null);

      console.log(`[KeywordComboTable] 📡 Fetching rankings for ${allUniqueComboTexts.length} combos...`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Get organization_id
      const { data: appData } = await supabase
        .from('monitored_apps')
        .select('organization_id')
        .eq('app_id', metadata.appId)
        .eq('platform', 'ios')
        .single();

      if (!appData) {
        // Fallback to user's org for ephemeral mode
        const { data: userData } = await supabase
          .from('user_roles')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .single();

        if (!userData) {
          throw new Error('No organization found');
        }
      }

      const organizationId = appData?.organization_id;

      // Fetch from edge function (returns from combo_rankings_cache)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-combo-rankings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            appId: metadata.appId,
            combos: allUniqueComboTexts,
            country: metadata.country || 'us',
            platform: 'ios',
            organizationId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.results) {
        const newRankings = new Map<string, ComboRankingData>();

        for (const rankingResult of result.results) {
          console.log(`[KeywordComboTable] 📥 API returned combo: "${rankingResult.combo}", totalResults: ${rankingResult.totalResults}`);
          newRankings.set(rankingResult.combo, {
            position: rankingResult.position,
            isRanking: rankingResult.isRanking,
            snapshotDate: rankingResult.checkedAt,
            trend: rankingResult.trend,
            positionChange: rankingResult.positionChange,
            visibilityScore: null,
            totalResults: rankingResult.totalResults ?? null,
          });
        }

        setCachedRankings(newRankings);
        setLastFetchTimestamp(Date.now());

        console.log(`[KeywordComboTable] ✅ Cached ${newRankings.size} rankings (valid for 24h)`);
        console.log(`[KeywordComboTable] 🔑 Cache keys:`, Array.from(newRankings.keys()).slice(0, 10));
      } else {
        throw new Error(result.error?.message || 'Failed to fetch rankings');
      }
    } catch (error: any) {
      console.error('[KeywordComboTable] ❌ Failed to fetch rankings:', error);
      setFetchError(error.message);
    } finally {
      setIsFetchingRankings(false);
    }
  }, [metadata?.appId, metadata?.country, allUniqueComboTexts, isCacheValid, cachedRankings.size]);

  // Auto-fetch on mount or when app/country changes
  useEffect(() => {
    fetchRankingsIfNeeded();
  }, [fetchRankingsIfNeeded]);

  // Debug: Log rankings when they change
  useEffect(() => {
    console.log(`[KeywordComboTable] Cached rankings: ${cachedRankings.size} entries`);
    if (cachedRankings.size > 0) {
      const firstEntry = Array.from(cachedRankings.entries())[0];
      console.log(`[KeywordComboTable] First ranking:`, firstEntry);
    }
  }, [cachedRankings]);

  // Fetch popularity scores for all visible combos
  const { scores: popularityScores, isLoading: popularityLoading } = useKeywordPopularity(
    allUniqueComboTexts,
    metadata?.country || 'us'
  );

  // DEBUG: Log popularity data
  useEffect(() => {
    console.log('[KeywordComboTable] 🎯 Popularity data:', {
      scoresSize: popularityScores.size,
      isLoading: popularityLoading,
      country: metadata?.country || 'us',
      comboCount: allUniqueComboTexts.length,
      firstScore: popularityScores.size > 0 ? Array.from(popularityScores.entries())[0] : null,
    });
  }, [popularityScores, popularityLoading, metadata?.country, allUniqueComboTexts.length]);

  // Apply competition or appRanking sorting if needed (secondary sort since ranking data is external)
  const finalSortedCombos = useMemo(() => {
    if (sortColumn === 'competition') {
      // Sort by competition (totalResults)
      return [...sortedCombos].sort((a, b) => {
        const aResults = cachedRankings.get(a.text)?.totalResults ?? Infinity;
        const bResults = cachedRankings.get(b.text)?.totalResults ?? Infinity;

        // Ascending: low competition first (easier to rank)
        // Descending: high competition first
        if (sortDirection === 'asc') {
          return aResults - bResults;
        } else {
          return bResults - aResults;
        }
      });
    } else if (sortColumn === 'appRanking') {
      // Sort by app ranking position
      return [...sortedCombos].sort((a, b) => {
        const aPosition = cachedRankings.get(a.text)?.position ?? Infinity;
        const bPosition = cachedRankings.get(b.text)?.position ?? Infinity;

        // Ascending: best ranking first (1, 2, 3..., null)
        // Descending: worst ranking first (null, ...150, 3, 2, 1)
        if (sortDirection === 'asc') {
          return aPosition - bPosition;
        } else {
          return bPosition - aPosition;
        }
      });
    } else if (sortColumn === 'popularity') {
      // Sort by popularity score
      return [...sortedCombos].sort((a, b) => {
        const aScore = popularityScores.get(a.text.toLowerCase())?.popularity_score ?? 0;
        const bScore = popularityScores.get(b.text.toLowerCase())?.popularity_score ?? 0;

        // Ascending: low popularity first
        // Descending: high popularity first (most common use case)
        if (sortDirection === 'asc') {
          return aScore - bScore;
        } else {
          return bScore - aScore;
        }
      });
    } else {
      return sortedCombos;
    }
  }, [sortedCombos, sortColumn, sortDirection, cachedRankings, popularityScores]);

  const allSelected = finalSortedCombos.length > 0 && selectedIndices.size === finalSortedCombos.length;
  const someSelected = selectedIndices.size > 0 && !allSelected;

  // Pagination logic
  const totalCombos = finalSortedCombos.length;
  const totalPages = Math.ceil(totalCombos / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalCombos);
  const paginatedCombos = finalSortedCombos.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [totalCombos]);

  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));
  const goToLastPage = () => setCurrentPage(totalPages);

  // Density-based row height
  const getRowHeight = () => {
    switch (density) {
      case 'compact': return 'h-8';
      case 'comfortable': return 'h-12';
      case 'spacious': return 'h-16';
      default: return 'h-12';
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction
      setSorting(column, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to desc for new column
      setSorting(column, 'desc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="h-3 w-3 text-zinc-500" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-orange-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-orange-400" />
    );
  };

  // Bulk actions
  const selectedCombos = sortedCombos.filter((_, idx) => selectedIndices.has(idx));

  const handleCopySelected = () => {
    const text = selectedCombos.map(c => c.text).join(', ');
    navigator.clipboard.writeText(text);
  };

  const handleExportSelected = () => {
    const csv = ['Combo,Type,Priority,Source,Length']
      .concat(
        selectedCombos.map(c =>
          `"${c.text}","${c.type}","${(c as any).priorityScore || '-'}","${c.source || '-'}","${c.text.length}"`
        )
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combos-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddToTitle = () => {
    // This would integrate with the metadata editing system
    console.log('Add to Title:', selectedCombos.map(c => c.text));
    // TODO: Implement metadata update logic
  };

  const handleAddToSubtitle = () => {
    // This would integrate with the metadata editing system
    console.log('Add to Subtitle:', selectedCombos.map(c => c.text));
    // TODO: Implement metadata update logic
  };

  return (
    <div className="space-y-4">
      {/* Custom Keyword Input */}
      {metadata?.appId && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <CustomKeywordInput appId={metadata.appId} platform="ios" />
        </div>
      )}

      {/* Bulk Actions Banner */}
      {selectedIndices.size > 0 && (
        <div className="flex items-center justify-between bg-violet-500/10 border border-violet-500/30 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-violet-300">
              {selectedIndices.size} combo{selectedIndices.size !== 1 ? 's' : ''} selected
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={deselectAll}
              className="h-7 text-xs text-zinc-400 hover:text-zinc-300"
            >
              Clear selection
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopySelected}
              className="h-8 border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy Selected
            </Button>
            {metadata?.appId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchRankingsIfNeeded(true)}
                disabled={isFetchingRankings}
                className="h-8 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                title={isCacheValid ? 'Force refresh rankings' : 'Cache expired - refresh needed'}
              >
                {isFetchingRankings ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Refresh Rankings {!isCacheValid && cachedRankings.size > 0 && '⚠️'}
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportSelected}
              className="h-8 border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
            >
              <Download className="h-3 w-3 mr-2" />
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddToTitle}
              className="h-8 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
            >
              <PlusCircle className="h-3 w-3 mr-2" />
              Add to Title
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddToSubtitle}
              className="h-8 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20"
            >
              <PlusCircle className="h-3 w-3 mr-2" />
              Add to Subtitle
            </Button>
          </div>
        </div>
      )}

      {/* Pagination & Density Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Density Controls */}
          <ToggleGroup type="single" value={density} onValueChange={(val) => val && setDensity(val as any)} className="gap-1">
            <ToggleGroupItem
              value="compact"
              className="text-xs px-2.5 h-7 rounded-md data-[state=on]:bg-violet-500/20 data-[state=on]:text-violet-300 data-[state=on]:border-violet-500/40"
            >
              Compact
            </ToggleGroupItem>
            <ToggleGroupItem
              value="comfortable"
              className="text-xs px-2.5 h-7 rounded-md data-[state=on]:bg-violet-500/20 data-[state=on]:text-violet-300 data-[state=on]:border-violet-500/40"
            >
              Comfortable
            </ToggleGroupItem>
            <ToggleGroupItem
              value="spacious"
              className="text-xs px-2.5 h-7 rounded-md data-[state=on]:bg-violet-500/20 data-[state=on]:text-violet-300 data-[state=on]:border-violet-500/40"
            >
              Spacious
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Rows per page */}
          <Select value={rowsPerPage.toString()} onValueChange={(val) => setRowsPerPage(parseInt(val))}>
            <SelectTrigger className="w-32 h-8 border-zinc-700 text-zinc-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="25">25 rows</SelectItem>
              <SelectItem value="50">50 rows</SelectItem>
              <SelectItem value="100">100 rows</SelectItem>
              <SelectItem value="250">250 rows</SelectItem>
            </SelectContent>
          </Select>

          {/* Showing X-Y of Z */}
          <span className="text-sm text-zinc-400">
            Showing {startIndex + 1}-{endIndex} of {totalCombos}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Pagination Buttons */}
          <Button
            size="sm"
            variant="outline"
            onClick={goToFirstPage}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 border-zinc-700 text-zinc-300 disabled:opacity-30"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 border-zinc-700 text-zinc-300 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-zinc-400 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0 border-zinc-700 text-zinc-300 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={goToLastPage}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0 border-zinc-700 text-zinc-300 disabled:opacity-30"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

          {/* Column Visibility Controls */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:border-violet-500/40 h-8 ml-2">
                <Columns className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </PopoverTrigger>
          <PopoverContent className="w-56 bg-zinc-900 border-zinc-700" align="end">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-300">Visible Columns</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-status"
                    checked={visibleColumns.status}
                    onCheckedChange={() => toggleColumn('status')}
                  />
                  <label htmlFor="col-status" className="text-sm text-zinc-400 cursor-pointer">
                    Status
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-type"
                    checked={visibleColumns.type}
                    onCheckedChange={() => toggleColumn('type')}
                  />
                  <label htmlFor="col-type" className="text-sm text-zinc-400 cursor-pointer">
                    Type
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-priority"
                    checked={visibleColumns.priority}
                    onCheckedChange={() => toggleColumn('priority')}
                  />
                  <label htmlFor="col-priority" className="text-sm text-zinc-400 cursor-pointer">
                    Priority Score
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-semantic"
                    checked={visibleColumns.semantic}
                    onCheckedChange={() => toggleColumn('semantic')}
                  />
                  <label htmlFor="col-semantic" className="text-sm text-zinc-400 cursor-pointer">
                    Semantic
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-novelty"
                    checked={visibleColumns.novelty}
                    onCheckedChange={() => toggleColumn('novelty')}
                  />
                  <label htmlFor="col-novelty" className="text-sm text-zinc-400 cursor-pointer">
                    Novelty
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-noise"
                    checked={visibleColumns.noise}
                    onCheckedChange={() => toggleColumn('noise')}
                  />
                  <label htmlFor="col-noise" className="text-sm text-zinc-400 cursor-pointer">
                    Noise
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-source"
                    checked={visibleColumns.source}
                    onCheckedChange={() => toggleColumn('source')}
                  />
                  <label htmlFor="col-source" className="text-sm text-zinc-400 cursor-pointer">
                    Source
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-length"
                    checked={visibleColumns.length}
                    onCheckedChange={() => toggleColumn('length')}
                  />
                  <label htmlFor="col-length" className="text-sm text-zinc-400 cursor-pointer">
                    Length
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-competition"
                    checked={visibleColumns.competition}
                    onCheckedChange={() => toggleColumn('competition')}
                  />
                  <label htmlFor="col-competition" className="text-sm text-zinc-400 cursor-pointer">
                    Competition
                  </label>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      </div>

      {/* Batman Arkham Knight Tactical Table Container */}
      <div className="relative bg-black/60 backdrop-blur-xl border-2 border-dashed border-orange-500/50 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(249,115,22,0.15),inset_0_0_30px_rgba(0,0,0,0.4)]">
        {/* L-shaped tactical corner brackets (smaller) */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-orange-500/70 z-20" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-orange-500/70 z-20" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-orange-500/70 z-20" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-orange-500/70 z-20" />
        
        {/* Tactical grid overlay pattern (24px × 24px) */}
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_1px_1px,rgba(249,115,22,0.08)_1px,transparent_0)] bg-[length:24px_24px] z-0" />
        
        <div className="relative max-h-[600px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-black/90 backdrop-blur-2xl z-10 border-b-2 border-dashed border-orange-500/50 shadow-[0_2px_10px_rgba(249,115,22,0.1)]">
            <TableRow className="border-zinc-800/60 hover:bg-transparent">
              <TableHead className="w-12 px-0 text-center">
                <div className="flex items-center justify-center h-full font-mono text-[10px] tracking-widest text-zinc-500">#</div>
              </TableHead>
              <TableHead className="w-12 px-0 text-center">
                <div className="flex items-center justify-center h-full">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectAll();
                      } else {
                        deselectAll();
                      }
                    }}
                    className="rounded-full data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                  />
                </div>
              </TableHead>
              <SortableHeader column="text" onClick={() => handleSort('text')} sortIcon={getSortIcon('text')}>
                ▸ COMBO
              </SortableHeader>
              {visibleColumns.status && (
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">◇ STATUS</TableHead>
              )}
              {visibleColumns.type && (
                <SortableHeader column="type" onClick={() => handleSort('type')} sortIcon={getSortIcon('type')}>
                  ▸ TYPE
                </SortableHeader>
              )}
              {visibleColumns.priority && (
                <SortableHeader column="relevance" onClick={() => handleSort('relevance')} sortIcon={getSortIcon('relevance')}>
                  ▸ PRIORITY
                </SortableHeader>
              )}
              {visibleColumns.semantic && (
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">◇ SEMANTIC</TableHead>
              )}
              {visibleColumns.novelty && (
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">◇ NOVELTY</TableHead>
              )}
              {visibleColumns.noise && (
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">◇ NOISE</TableHead>
              )}
              {visibleColumns.source && (
                <SortableHeader column="source" onClick={() => handleSort('source')} sortIcon={getSortIcon('source')}>
                  ▸ SOURCE
                </SortableHeader>
              )}
              {visibleColumns.competition && (
                <SortableHeader column="competition" onClick={() => handleSort('competition')} sortIcon={getSortIcon('competition')}>
                  ▸ COMPETITION
                </SortableHeader>
              )}
              {visibleColumns.length && (
                <SortableHeader column="length" onClick={() => handleSort('length')} sortIcon={getSortIcon('length')}>
                  ▸ LENGTH
                </SortableHeader>
              )}
              <SortableHeader column="popularity" onClick={() => handleSort('popularity')} sortIcon={getSortIcon('popularity')}>
                ▸ POPULARITY
              </SortableHeader>
              <SortableHeader column="appRanking" onClick={() => handleSort('appRanking')} sortIcon={getSortIcon('appRanking')}>
                ▸ APP RANKING
              </SortableHeader>
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">◇ ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                    <p className="text-sm text-zinc-400">Loading combos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedCombos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <div className="rounded-full bg-zinc-800/50 p-4">
                      <SearchX className="h-8 w-8 text-zinc-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-400">No combos found</p>
                      <p className="text-xs text-zinc-500">Try adjusting your search or filter settings</p>
                    </div>
                    {selectedIndices.size > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={deselectAll}
                        className="mt-2 border-zinc-700 text-zinc-400"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCombos.map((combo, paginatedIdx) => {
                const actualIdx = startIndex + paginatedIdx;
                const rankingData = cachedRankings.get(combo.text);

                // Debug: Log custom keywords specifically
                if (combo.source === 'custom') {
                  console.log('[KeywordComboTable] 🔍 Custom keyword lookup:', {
                    comboText: combo.text,
                    comboSource: combo.source,
                    rankingData: rankingData,
                    hasData: rankingData !== undefined,
                    totalResults: rankingData?.totalResults,
                    position: rankingData?.position,
                    cacheHasKey: cachedRankings.has(combo.text),
                    cacheKeys: Array.from(cachedRankings.keys()).filter(k => k.toLowerCase().includes(combo.text.toLowerCase()))
                  });
                }

                // Debug: Log first combo's lookup
                if (paginatedIdx === 0 && cachedRankings.size > 0) {
                  console.log('[KeywordComboTable] First combo lookup:', {
                    comboText: combo.text,
                    rankingData: rankingData,
                    hasData: rankingData !== undefined,
                    totalResults: rankingData?.totalResults,
                    mapKeys: Array.from(cachedRankings.keys()).slice(0, 3)
                  });
                }

                return (
                  <KeywordComboRow
                    key={`${combo.text}-${actualIdx}`}
                    combo={combo}
                    index={actualIdx}
                    isSelected={selectedIndices.has(actualIdx)}
                    visibleColumns={visibleColumns}
                    density={density}
                    metadata={metadata}
                    rankingData={rankingData}
                    rankingsLoading={isFetchingRankings && !cachedRankings.has(combo.text)}
                    popularityData={popularityScores.get(combo.text.toLowerCase())}
                    popularityLoading={popularityLoading}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
        
        {/* L-shaped corner brackets (bottom) */}
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-orange-500/60" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-orange-500/60" />
      </div>
    </div>
  );
};
