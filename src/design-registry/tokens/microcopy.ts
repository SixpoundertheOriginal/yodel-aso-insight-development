/**
 * DESIGN REGISTRY: Microcopy Standards
 *
 * Standardized text for common UI patterns (loading, errors, empty states).
 * Ensures consistent tone and messaging across the application.
 *
 * @packageDocumentation
 */

/**
 * Microcopy standards for UI text
 */
export const microcopy = {
  /**
   * Loading states
   * Used in: All components with async data
   */
  loading: {
    data: 'Loading data...',
    analytics: 'Loading analytics...',
    chart: 'Loading chart...',
    insights: 'Generating insights...',
    processing: 'Processing...',
    default: 'Loading...',
  },

  /**
   * Empty/zero states
   * Used in: Cards with no data, empty lists
   */
  empty: {
    noData: 'No data available for the selected period',
    noRecords: 'No records found',
    insufficientData: 'Insufficient data for analysis',
    noResults: 'No results found',
    comingSoon: 'Coming soon',
    selectPeriod: 'Select a date range to view data',
  },

  /**
   * Error messages
   * Used in: Error states, failed requests
   */
  error: {
    generic: 'Something went wrong',
    loadingFailed: 'Failed to load data',
    networkError: 'Network error. Please check your connection.',
    unauthorized: 'You don\'t have permission to view this data',
    notFound: 'Data not found',
    retry: 'Retry',
    reload: 'Reload',
  },

  /**
   * Success messages
   * Used in: Successful actions, confirmations
   */
  success: {
    saved: 'Changes saved successfully',
    updated: 'Updated successfully',
    deleted: 'Deleted successfully',
    copied: 'Copied to clipboard',
  },

  /**
   * Data indicators
   * Used in: Dashboard indicators, status displays
   */
  indicator: {
    /**
     * Live data indicator with record count
     * @param recordCount - Number of records
     * @returns Formatted indicator text
     */
    live: (recordCount: number): string => {
      if (recordCount === 0) {
        return 'No data available';
      }
      return `Live Data • ${recordCount.toLocaleString()} records`;
    },

    /**
     * Filtered data indicator
     * @param recordCount - Number of filtered records
     * @returns Formatted indicator text
     */
    filtered: (recordCount: number): string => {
      return `${recordCount.toLocaleString()} filtered records`;
    },

    /** Cached data indicator */
    cached: 'Cached data',

    /** Real-time data indicator */
    realtime: 'Real-time data',

    /** Last updated indicator */
    lastUpdated: (timestamp: string): string => {
      return `Last updated: ${timestamp}`;
    },
  },

  /**
   * Section naming patterns
   * Used in: Dashboard sections, page sections
   */
  sections: {
    kpi: 'Executive KPIs',
    organicVisibility: 'ASO Organic Visibility',
    intelligence: 'Intelligence Layer',
    intelligenceLayer: 'ASO Intelligence Layer',
    analysis: 'Analysis',
    insights: 'Insights',
    performance: 'Performance Metrics',
    twoPath: 'Two-Path Conversion Analysis',
    derivedKpis: 'Derived ASO KPIs',
    charts: 'Analytics & Insights',
    traditional: 'Traditional Analytics',
  },

  /**
   * Action labels
   * Used in: Buttons, links, CTAs
   */
  actions: {
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    retry: 'Retry',
    refresh: 'Refresh',
    reload: 'Reload',
    learnMore: 'Learn More',
    showMore: 'Show More',
    showLess: 'Show Less',
    export: 'Export',
    download: 'Download',
  },

  /**
   * Confirmation messages
   * Used in: Delete confirmations, destructive actions
   */
  confirmations: {
    delete: 'Are you sure you want to delete this item?',
    deleteMultiple: (count: number): string => {
      return `Are you sure you want to delete ${count} items?`;
    },
    unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
  },

  /**
   * Time-based messages
   * Used in: Relative time displays
   */
  time: {
    justNow: 'Just now',
    minutesAgo: (minutes: number): string => {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    },
    hoursAgo: (hours: number): string => {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    },
    daysAgo: (days: number): string => {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    },
  },
} as const;

/**
 * Type exports
 */
export type Microcopy = typeof microcopy;
export type LoadingMessages = typeof microcopy.loading;
export type EmptyMessages = typeof microcopy.empty;
export type ErrorMessages = typeof microcopy.error;
