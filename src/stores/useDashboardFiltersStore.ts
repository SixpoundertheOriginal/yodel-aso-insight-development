import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Dashboard Filters Store
 *
 * Centralized state management for all dashboard filters.
 * Persists user preferences to localStorage for session recovery.
 *
 * Key Features:
 * - Stable query key generation (prevents unnecessary React Query refetches)
 * - Filter state persistence across page refreshes
 * - Atomic filter updates (no cascading re-renders)
 */

export interface DateRange {
  start: string;  // ISO date format: YYYY-MM-DD
  end: string;
}

export interface DashboardFiltersState {
  // Primary Filters
  organizationId: string;
  dateRange: DateRange;
  selectedAppIds: string[];
  selectedMarkets: string[];
  selectedTrafficSources: string[];

  // UI State
  granularity: 'daily' | 'weekly' | 'monthly';
  comparisonMode: boolean;
  comparisonDateRange: DateRange | null;

  // Actions
  setOrganizationId: (id: string) => void;
  setDateRange: (range: DateRange) => void;
  setAppIds: (ids: string[]) => void;
  setMarkets: (markets: string[]) => void;
  setTrafficSources: (sources: string[]) => void;
  setGranularity: (granularity: 'daily' | 'weekly' | 'monthly') => void;
  setComparisonMode: (enabled: boolean) => void;
  setComparisonDateRange: (range: DateRange | null) => void;
  resetFilters: () => void;

  // Computed Selectors
  getQueryKey: () => string[];
  hasFiltersChanged: (previous: Partial<DashboardFiltersState>) => boolean;
}

const INITIAL_STATE = {
  organizationId: '',
  dateRange: { start: '', end: '' },
  selectedAppIds: [],
  selectedMarkets: [],
  selectedTrafficSources: [],
  granularity: 'daily' as const,
  comparisonMode: false,
  comparisonDateRange: null,
};

export const useDashboardFiltersStore = create<DashboardFiltersState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // Actions
      setOrganizationId: (id) => {
        set({ organizationId: id });
        // Clear filters when organization changes
        get().resetFilters();
      },

      setDateRange: (range) => set({ dateRange: range }),

      setAppIds: (ids) => set({ selectedAppIds: ids }),

      setMarkets: (markets) => set({ selectedMarkets: markets }),

      setTrafficSources: (sources) => set({ selectedTrafficSources: sources }),

      setGranularity: (granularity) => set({ granularity }),

      setComparisonMode: (enabled) => set({ comparisonMode: enabled }),

      setComparisonDateRange: (range) => set({ comparisonDateRange: range }),

      resetFilters: () => set({
        selectedAppIds: [],
        selectedMarkets: [],
        selectedTrafficSources: [],
        comparisonMode: false,
        comparisonDateRange: null,
      }),

      // Computed Selectors
      getQueryKey: () => {
        const state = get();

        // Generate stable query key for React Query
        // NOTE: Traffic sources intentionally included for granular caching
        return [
          'enterprise-analytics-v2',
          state.organizationId,
          state.dateRange.start,
          state.dateRange.end,
          state.selectedAppIds.sort().join(',') || 'auto-discover',
          state.selectedTrafficSources.sort().join(',') || 'all',
          state.granularity,
        ];
      },

      hasFiltersChanged: (previous) => {
        const current = get();

        // Compare relevant filter fields
        return (
          current.dateRange.start !== previous.dateRange?.start ||
          current.dateRange.end !== previous.dateRange?.end ||
          JSON.stringify(current.selectedAppIds.sort()) !== JSON.stringify(previous.selectedAppIds?.sort()) ||
          JSON.stringify(current.selectedTrafficSources.sort()) !== JSON.stringify(previous.selectedTrafficSources?.sort()) ||
          current.granularity !== previous.granularity
        );
      },
    }),
    {
      name: 'yodel-dashboard-filters',

      // Only persist user preferences, not org-specific data
      partialize: (state) => ({
        granularity: state.granularity,
        comparisonMode: state.comparisonMode,
        // Note: Don't persist dateRange, appIds, trafficSources
        // These should reset to defaults on page load
      }),
    }
  )
);

// Selector hooks for optimized component subscriptions
export const useDateRange = () => useDashboardFiltersStore((state) => state.dateRange);
export const useTrafficSources = () => useDashboardFiltersStore((state) => state.selectedTrafficSources);
export const useAppIds = () => useDashboardFiltersStore((state) => state.selectedAppIds);
export const useGranularity = () => useDashboardFiltersStore((state) => state.granularity);
