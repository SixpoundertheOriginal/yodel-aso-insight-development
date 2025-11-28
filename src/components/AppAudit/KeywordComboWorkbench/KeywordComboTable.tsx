/**
 * Keyword Combo Table
 *
 * Main table component displaying all combos with sortable columns.
 */

import React, { useState, useEffect } from 'react';
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
import { ArrowUp, ArrowDown, ChevronsUpDown, Columns, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Copy, Download, PlusCircle, Loader2, SearchX } from 'lucide-react';
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
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import type { SortColumn } from '@/stores/useKeywordComboStore';

interface ColumnVisibility {
  status: boolean;
  type: boolean;
  priority: boolean;
  semantic: boolean;
  novelty: boolean;
  noise: boolean;
  source: boolean;
  length: boolean;
}

// Sortable header component
const SortableHeader: React.FC<{
  column: SortColumn;
  children: React.ReactNode;
  onClick: () => void;
  sortIcon: React.ReactNode;
}> = ({ column, children, onClick, sortIcon }) => (
  <TableHead>
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-8 px-2 font-mono text-xs uppercase tracking-wider text-zinc-400 hover:text-zinc-300"
    >
      {children}
      <span className="ml-1">{sortIcon}</span>
    </Button>
  </TableHead>
);

export const KeywordComboTable: React.FC = () => {
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
    status: true,
    type: true,
    priority: true,
    semantic: true,
    novelty: true,
    noise: true,
    source: true,
    length: true,
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
  } = useKeywordComboStore();

  const sortedCombos = getSortedCombos();
  const allSelected = sortedCombos.length > 0 && selectedIndices.size === sortedCombos.length;
  const someSelected = selectedIndices.size > 0 && !allSelected;

  // Pagination logic
  const totalCombos = sortedCombos.length;
  const totalPages = Math.ceil(totalCombos / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalCombos);
  const paginatedCombos = sortedCombos.slice(startIndex, endIndex);

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
    const text = selectedCombos.map(c => c.text).join('\n');
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
          <ToggleGroup type="single" value={density} onValueChange={(val) => val && setDensity(val as any)}>
            <ToggleGroupItem value="compact" className="text-xs px-3 h-8">
              Compact
            </ToggleGroupItem>
            <ToggleGroupItem value="comfortable" className="text-xs px-3 h-8">
              Comfortable
            </ToggleGroupItem>
            <ToggleGroupItem value="spacious" className="text-xs px-3 h-8">
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
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-8">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => {
              if (checked) {
                selectAll();
              } else {
                deselectAll();
              }
            }}
          />
              </TableHead>
              <SortableHeader column="text" onClick={() => handleSort('text')} sortIcon={getSortIcon('text')}>
                Combo
              </SortableHeader>
              {visibleColumns.status && (
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-400">Status</TableHead>
              )}
              {visibleColumns.type && (
                <SortableHeader column="type" onClick={() => handleSort('type')} sortIcon={getSortIcon('type')}>
                  Type
                </SortableHeader>
              )}
              {visibleColumns.priority && (
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-400">Priority</TableHead>
              )}
              {visibleColumns.semantic && (
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-400">Semantic</TableHead>
              )}
              {visibleColumns.novelty && (
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-400">Novelty</TableHead>
              )}
              {visibleColumns.noise && (
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-400">Noise</TableHead>
              )}
              {visibleColumns.source && (
                <SortableHeader column="source" onClick={() => handleSort('source')} sortIcon={getSortIcon('source')}>
                  Source
                </SortableHeader>
              )}
              {visibleColumns.length && (
                <SortableHeader column="length" onClick={() => handleSort('length')} sortIcon={getSortIcon('length')}>
                  Length
                </SortableHeader>
              )}
              <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-400">Actions</TableHead>
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
                return (
                  <KeywordComboRow
                    key={`${combo.text}-${actualIdx}`}
                    combo={combo}
                    index={actualIdx}
                    isSelected={selectedIndices.has(actualIdx)}
                    visibleColumns={visibleColumns}
                    density={density}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
};
