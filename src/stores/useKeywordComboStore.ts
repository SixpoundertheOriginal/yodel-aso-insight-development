/**
 * Keyword Combo Workbench Store
 *
 * Centralized state management for the interactive keyword combination workbench.
 * Manages editing, sorting, filtering, and bulk operations for combo analysis.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

export type SortColumn = 'text' | 'source' | 'type' | 'relevance' | 'length';
export type SortDirection = 'asc' | 'desc';
export type IntentClass = 'learning' | 'outcome' | 'brand' | 'noise';
export type SourceFilter = 'all' | 'title' | 'subtitle' | 'cross-element';
export type TypeFilter = 'all' | 'brand' | 'generic' | 'low-value';

interface KeywordComboState {
  // Combo data (derived from comboCoverage, with client-side edits)
  combos: ClassifiedCombo[];
  setCombos: (combos: ClassifiedCombo[]) => void;

  // Editing state
  editingComboIndex: number | null;
  setEditingCombo: (index: number | null) => void;
  updateCombo: (index: number, updates: Partial<ClassifiedCombo>) => void;

  // Noise management
  markAsNoise: (index: number) => void;
  unmarkAsNoise: (index: number) => void;

  // Sorting
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  setSorting: (column: SortColumn, direction: SortDirection) => void;

  // Filtering
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sourceFilter: SourceFilter;
  setSourceFilter: (source: SourceFilter) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (type: TypeFilter) => void;
  intentFilter: 'all' | IntentClass;
  setIntentFilter: (intent: 'all' | IntentClass) => void;
  hideNoise: boolean;
  setHideNoise: (hide: boolean) => void;

  // Bulk operations
  selectedIndices: Set<number>;
  toggleSelection: (index: number) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // Computed selectors
  getFilteredCombos: () => ClassifiedCombo[];
  getSortedCombos: () => ClassifiedCombo[];

  // Reset
  reset: () => void;
}

const INITIAL_STATE = {
  combos: [],
  editingComboIndex: null,
  sortColumn: 'relevance' as SortColumn,
  sortDirection: 'desc' as SortDirection,
  searchQuery: '',
  sourceFilter: 'all' as SourceFilter,
  typeFilter: 'all' as TypeFilter,
  intentFilter: 'all' as 'all' | IntentClass,
  hideNoise: true,
  selectedIndices: new Set<number>(),
};

export const useKeywordComboStore = create<KeywordComboState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // Actions
      setCombos: (combos) => set({ combos }),

      setEditingCombo: (index) => set({ editingComboIndex: index }),

      updateCombo: (index, updates) =>
        set((state) => ({
          combos: state.combos.map((combo, i) =>
            i === index ? { ...combo, ...updates } : combo
          ),
        })),

      markAsNoise: (index) =>
        set((state) => ({
          combos: state.combos.map((combo, i) =>
            i === index ? { ...combo, userMarkedAsNoise: true } : combo
          ),
        })),

      unmarkAsNoise: (index) =>
        set((state) => ({
          combos: state.combos.map((combo, i) =>
            i === index ? { ...combo, userMarkedAsNoise: false } : combo
          ),
        })),

      setSorting: (column, direction) =>
        set({ sortColumn: column, sortDirection: direction }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSourceFilter: (source) => set({ sourceFilter: source }),

      setTypeFilter: (type) => set({ typeFilter: type }),

      setIntentFilter: (intent) => set({ intentFilter: intent }),

      setHideNoise: (hide) => set({ hideNoise: hide }),

      toggleSelection: (index) =>
        set((state) => {
          const newSet = new Set(state.selectedIndices);
          if (newSet.has(index)) {
            newSet.delete(index);
          } else {
            newSet.add(index);
          }
          return { selectedIndices: newSet };
        }),

      selectAll: () =>
        set((state) => ({
          selectedIndices: new Set(state.combos.map((_, i) => i)),
        })),

      deselectAll: () => set({ selectedIndices: new Set() }),

      // Computed selectors
      getFilteredCombos: () => {
        const state = get();
        let filtered = [...state.combos];

        // Filter by search query
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter((c) => c.text.toLowerCase().includes(query));
        }

        // Filter by source
        if (state.sourceFilter !== 'all') {
          filtered = filtered.filter((c) => {
            if (state.sourceFilter === 'cross-element') {
              return c.source === 'title+subtitle';
            }
            return c.source === state.sourceFilter;
          });
        }

        // Filter by type
        if (state.typeFilter !== 'all') {
          if (state.typeFilter === 'brand') {
            // Use Phase 5 brand classification if available, fallback to legacy type
            filtered = filtered.filter(
              (c) =>
                ('brandClassification' in c && c.brandClassification === 'brand') ||
                c.type === 'branded'
            );
          } else if (state.typeFilter === 'generic') {
            filtered = filtered.filter(
              (c) =>
                ('brandClassification' in c && c.brandClassification === 'generic') ||
                c.type === 'generic'
            );
          } else {
            filtered = filtered.filter((c) => c.type === state.typeFilter);
          }
        }

        // Filter by intent (if implemented)
        if (state.intentFilter !== 'all') {
          filtered = filtered.filter((c) => {
            const intentClass = (c as any).intentClass;
            return intentClass === state.intentFilter;
          });
        }

        // Hide noise
        if (state.hideNoise) {
          filtered = filtered.filter((c) => !(c as any).userMarkedAsNoise);
        }

        return filtered;
      },

      getSortedCombos: () => {
        const state = get();
        const filtered = state.getFilteredCombos();
        const sorted = [...filtered].sort((a, b) => {
          switch (state.sortColumn) {
            case 'text':
              return a.text.localeCompare(b.text);
            case 'source': {
              const sourceA = a.source || 'unknown';
              const sourceB = b.source || 'unknown';
              return sourceA.localeCompare(sourceB);
            }
            case 'type':
              return a.type.localeCompare(b.type);
            case 'relevance':
              return a.relevanceScore - b.relevanceScore;
            case 'length':
              return a.text.length - b.text.length;
            default:
              return 0;
          }
        });

        return state.sortDirection === 'desc' ? sorted.reverse() : sorted;
      },

      reset: () => set({ ...INITIAL_STATE, combos: get().combos }),
    }),
    {
      name: 'keyword-combo-workbench',
      partialize: (state) => ({
        // Only persist UI preferences, not combo data
        sortColumn: state.sortColumn,
        sortDirection: state.sortDirection,
        hideNoise: state.hideNoise,
      }),
    }
  )
);
