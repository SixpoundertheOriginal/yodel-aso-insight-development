/**
 * Keyword Combo Workbench Store
 *
 * Centralized state management for the interactive keyword combination workbench.
 * Manages editing, sorting, filtering, and bulk operations for combo analysis.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

export type SortColumn = 'text' | 'source' | 'type' | 'length' | 'competition' | 'appRanking' | 'popularity';
export type SortDirection = 'asc' | 'desc';
export type IntentClass = 'learning' | 'outcome' | 'brand' | 'noise';
export type SourceFilter = 'all' | 'title' | 'subtitle' | 'cross-element';
export type TypeFilter = 'all' | 'brand' | 'generic' | 'low-value';
export type LengthFilter = 'all' | '2' | '3';

interface KeywordComboState {
  // Combo data (derived from comboCoverage, with client-side edits)
  combos: ClassifiedCombo[];
  setCombos: (combos: ClassifiedCombo[]) => void;
  addCombo: (combo: ClassifiedCombo) => void;
  removeCombo: (comboText: string) => void;

  // Custom keywords (user-added)
  customKeywords: ClassifiedCombo[];
  setCustomKeywords: (keywords: ClassifiedCombo[]) => void;
  addCustomKeyword: (keyword: string) => boolean;
  addCustomKeywords: (keywords: string[]) => { added: number; duplicates: string[] };
  removeCustomKeyword: (text: string) => void;

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
  lengthFilter: LengthFilter;
  setLengthFilter: (length: LengthFilter) => void;
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
  customKeywords: [],
  editingComboIndex: null,
  sortColumn: 'relevance' as SortColumn,
  sortDirection: 'desc' as SortDirection,
  searchQuery: '',
  sourceFilter: 'all' as SourceFilter,
  typeFilter: 'all' as TypeFilter,
  intentFilter: 'all' as 'all' | IntentClass,
  lengthFilter: 'all' as LengthFilter,
  hideNoise: true,
  selectedIndices: new Set<number>(),
};

export const useKeywordComboStore = create<KeywordComboState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // Actions
      setCombos: (combos) => set({ combos }),

      addCombo: (combo) =>
        set((state) => {
          // Check if combo already exists
          const exists = state.combos.some((c) => c.text === combo.text);
          if (exists) return state;
          return { combos: [...state.combos, combo] };
        }),

      removeCombo: (comboText) =>
        set((state) => ({
          combos: state.combos.filter((c) => c.text !== comboText),
        })),

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

      setLengthFilter: (length) => set({ lengthFilter: length }),

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
        set((state) => {
          // Select all indices from merged combos + customKeywords
          const allCombos = [...state.combos, ...state.customKeywords];
          return {
            selectedIndices: new Set(allCombos.map((_, i) => i)),
          };
        }),

      deselectAll: () => set({ selectedIndices: new Set() }),

      // Custom keywords actions
      setCustomKeywords: (keywords) => set({ customKeywords: keywords }),

      addCustomKeyword: (keyword) => {
        const state = get();
        const normalized = keyword.trim().toLowerCase();

        if (!normalized) return false;
        if (normalized.length > 100) return false;

        // Check for duplicates in both combos and customKeywords
        const existsInCombos = state.combos.some(
          (c) => c.text.toLowerCase() === normalized
        );
        const existsInCustom = state.customKeywords.some(
          (c) => c.text.toLowerCase() === normalized
        );

        if (existsInCombos || existsInCustom) return false;

        // Create new custom keyword combo
        const newCombo: ClassifiedCombo = {
          text: keyword.trim(),
          source: 'custom',
          type: 'generic', // Default, will be classified
          relevanceScore: 0,
          brandClassification: 'generic',
        };

        set((state) => ({
          customKeywords: [...state.customKeywords, newCombo],
        }));

        return true;
      },

      addCustomKeywords: (keywords) => {
        const state = get();
        let added = 0;
        const duplicates: string[] = [];

        for (const keyword of keywords) {
          const normalized = keyword.trim().toLowerCase();

          if (!normalized || normalized.length > 100) continue;

          // Check for duplicates
          const existsInCombos = state.combos.some(
            (c) => c.text.toLowerCase() === normalized
          );
          const existsInCustom = state.customKeywords.some(
            (c) => c.text.toLowerCase() === normalized
          );

          if (existsInCombos || existsInCustom) {
            duplicates.push(keyword.trim());
            continue;
          }

          // Create new custom keyword combo
          const newCombo: ClassifiedCombo = {
            text: keyword.trim(),
            source: 'custom',
            type: 'generic',
            relevanceScore: 0,
            brandClassification: 'generic',
          };

          set((state) => ({
            customKeywords: [...state.customKeywords, newCombo],
          }));

          added++;
        }

        return { added, duplicates };
      },

      removeCustomKeyword: (text) =>
        set((state) => ({
          customKeywords: state.customKeywords.filter((k) => k.text !== text),
        })),

      // Computed selectors
      getFilteredCombos: () => {
        const state = get();
        // Merge auto-generated combos with custom keywords
        let filtered = [...state.combos, ...state.customKeywords];

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

        // Filter by length
        if (state.lengthFilter !== 'all') {
          const targetLength = parseInt(state.lengthFilter);
          // Exact match (2 or 3 words)
          filtered = filtered.filter((c) => c.text.split(' ').length === targetLength);
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
