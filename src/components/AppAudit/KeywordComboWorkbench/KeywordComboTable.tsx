/**
 * Keyword Combo Table
 *
 * Main table component displaying all combos with sortable columns.
 */

import React from 'react';
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
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { KeywordComboRow } from './KeywordComboRow';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import type { SortColumn } from '@/stores/useKeywordComboStore';

export const KeywordComboTable: React.FC = () => {
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

  const SortableHeader: React.FC<{ column: SortColumn; children: React.ReactNode }> = ({ column, children }) => (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleSort(column)}
        className="h-8 px-2 font-mono text-xs uppercase tracking-wider text-zinc-400 hover:text-zinc-300"
      >
        {children}
        <span className="ml-1">{getSortIcon(column)}</span>
      </Button>
    </TableHead>
  );

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="max-h-[600px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-8">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectAll();
                    } else {
                      deselectAll();
                    }
                  }}
                />
              </TableHead>
              <SortableHeader column="text">Combo</SortableHeader>
              <SortableHeader column="type">Type</SortableHeader>
              <SortableHeader column="source">Source</SortableHeader>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-400">Intent</TableHead>
              <SortableHeader column="relevance">Score</SortableHeader>
              <SortableHeader column="length">Length</SortableHeader>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCombos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <p className="text-sm">No combos match your filters</p>
                    <p className="text-xs">Try adjusting your search or filter settings</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedCombos.map((combo, idx) => (
                <KeywordComboRow
                  key={`${combo.text}-${idx}`}
                  combo={combo}
                  index={idx}
                  isSelected={selectedIndices.has(idx)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
