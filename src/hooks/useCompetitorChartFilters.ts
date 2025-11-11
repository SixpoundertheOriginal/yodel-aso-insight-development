/**
 * COMPETITOR CHART FILTERS HOOK
 *
 * Global state management for competitor analysis charts
 * Manages time range selection and competitor visibility across all charts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

export interface CompetitorFilter {
  appId: string;
  appName: string;
  appIcon: string;
  isVisible: boolean;
  isPrimary: boolean;
}

interface CompetitorChartFiltersState {
  // Time range
  timeRange: TimeRange;
  customStartDate: string | null;
  customEndDate: string | null;

  // Competitor visibility
  competitors: CompetitorFilter[];

  // Actions
  setTimeRange: (range: TimeRange) => void;
  setCustomDateRange: (startDate: string, endDate: string) => void;
  setCompetitors: (competitors: CompetitorFilter[]) => void;
  toggleCompetitor: (appId: string) => void;
  showAllCompetitors: () => void;
  hideAllCompetitors: () => void;
  resetToTopN: (n: number) => void;

  // Computed
  getVisibleCompetitors: () => CompetitorFilter[];
  getDateRange: () => { startDate: Date; endDate: Date };
}

/**
 * Calculate date range based on time range selection
 */
function calculateDateRange(
  timeRange: TimeRange,
  customStartDate: string | null,
  customEndDate: string | null
): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  let startDate = new Date();

  switch (timeRange) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case 'custom':
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        return { startDate, endDate: new Date(customEndDate) };
      }
      // Fallback to 30 days if custom dates not set
      startDate.setDate(endDate.getDate() - 30);
      break;
    case 'all':
      // Go back 2 years max for "all time"
      startDate.setFullYear(endDate.getFullYear() - 2);
      break;
  }

  return { startDate, endDate };
}

/**
 * Zustand store for competitor chart filters
 * Persists time range selection to localStorage
 */
export const useCompetitorChartFilters = create<CompetitorChartFiltersState>()(
  persist(
    (set, get) => ({
      // Initial state
      timeRange: '30d',
      customStartDate: null,
      customEndDate: null,
      competitors: [],

      // Actions
      setTimeRange: (range) => {
        set({ timeRange: range });
      },

      setCustomDateRange: (startDate, endDate) => {
        set({
          timeRange: 'custom',
          customStartDate: startDate,
          customEndDate: endDate
        });
      },

      setCompetitors: (competitors) => {
        set({ competitors });
      },

      toggleCompetitor: (appId) => {
        set((state) => ({
          competitors: state.competitors.map((comp) =>
            comp.appId === appId
              ? { ...comp, isVisible: !comp.isVisible }
              : comp
          )
        }));
      },

      showAllCompetitors: () => {
        set((state) => ({
          competitors: state.competitors.map((comp) => ({
            ...comp,
            isVisible: true
          }))
        }));
      },

      hideAllCompetitors: () => {
        set((state) => ({
          competitors: state.competitors.map((comp) => ({
            ...comp,
            isVisible: comp.isPrimary // Keep primary app always visible
          }))
        }));
      },

      resetToTopN: (n) => {
        set((state) => ({
          competitors: state.competitors.map((comp, idx) => ({
            ...comp,
            isVisible: comp.isPrimary || idx < n
          }))
        }));
      },

      // Computed
      getVisibleCompetitors: () => {
        return get().competitors.filter((comp) => comp.isVisible);
      },

      getDateRange: () => {
        const { timeRange, customStartDate, customEndDate } = get();
        return calculateDateRange(timeRange, customStartDate, customEndDate);
      }
    }),
    {
      name: 'competitor-chart-filters',
      partialize: (state) => ({
        timeRange: state.timeRange,
        customStartDate: state.customStartDate,
        customEndDate: state.customEndDate
        // Don't persist competitors - they're session-specific
      })
    }
  )
);
