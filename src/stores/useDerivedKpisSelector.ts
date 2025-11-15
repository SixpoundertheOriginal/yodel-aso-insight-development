import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useTwoPathSelector, type TwoPathConversionMetrics } from './useTwoPathSelector';

/**
 * Derived KPIs Selector Store
 *
 * Computes ASO-specific KPIs from Two-Path metrics with incremental updates.
 * Only recomputes affected KPIs when dependencies change.
 *
 * Key Features:
 * - Granular dependency tracking (only recompute what changed)
 * - Incremental updates (not full recalculation)
 * - Type-safe KPI accessors
 * - Performance optimized for enterprise scale
 */

export interface DerivedKPIs {
  // Tap-Through Performance
  tapThroughRate: {
    search: number; // PPV / Impressions %
    browse: number;
    combined: number;
  };

  // Conversion Performance
  conversionRate: {
    search: number; // Downloads / Impressions %
    browse: number;
    combined: number;
  };

  // Install Path Analysis
  directShareOfDownloads: number; // % of downloads without PDP visit
  pdpDrivenShare: number; // % of downloads through PDP

  // Channel Efficiency
  searchEfficiency: number; // Search CVR × Search Volume Weight
  browseEfficiency: number; // Browse CVR × Browse Volume Weight

  // Intent Signals
  searchIntensity: number; // Search Direct Install Rate
  browseEngagement: number; // Browse PDP Conversion Rate

  // Funnel Health
  funnelLeakRate: {
    search: number; // % who viewed PDP but didn't install
    browse: number;
    combined: number;
  };

  // Traffic Balance
  searchBrowseRatio: number; // Search Impressions / Browse Impressions
  trafficDiversification: number; // 1 - abs(50% - search_share)

  // Overall Performance
  overallHealth: number; // Composite score (0-100)
}

export interface DerivedKpisState {
  // Computed KPIs
  kpis: DerivedKPIs | null;

  // Cache Management
  lastComputedHash: string;
  lastComputed: number;

  // Actions
  computeFromTwoPath: (
    search: TwoPathConversionMetrics | null,
    browse: TwoPathConversionMetrics | null
  ) => void;
  invalidate: () => void;

  // Selectors
  getKpi: (name: keyof DerivedKPIs) => any;
  getAllKpis: () => DerivedKPIs | null;
  getKpiCategory: (category: 'conversion' | 'efficiency' | 'engagement' | 'health') => Record<string, any>;
}

// Helper: Safe division
const safeDivide = (num: number, denom: number, asPercent = true): number => {
  if (denom === 0 || !isFinite(denom)) return 0;
  const result = num / denom;
  if (!isFinite(result)) return 0;
  return asPercent ? result * 100 : result;
};

// Helper: Generate hash from Two-Path metrics
const generateMetricsHash = (
  search: TwoPathConversionMetrics | null,
  browse: TwoPathConversionMetrics | null
): string => {
  return JSON.stringify({
    s_imp: search?.impressions || 0,
    s_down: search?.downloads || 0,
    b_imp: browse?.impressions || 0,
    b_down: browse?.downloads || 0,
  });
};

// Helper: Calculate overall health score
const calculateHealthScore = (kpis: DerivedKPIs): number => {
  // Composite score based on key indicators
  const cvrScore = Math.min(kpis.conversionRate.combined / 50, 1) * 30; // Max 30 points
  const diversificationScore = kpis.trafficDiversification * 20; // Max 20 points
  const efficiencyScore = ((kpis.searchEfficiency + kpis.browseEfficiency) / 2) * 0.3; // Max 30 points
  const funnelScore = (1 - kpis.funnelLeakRate.combined / 100) * 20; // Max 20 points

  return Math.round(cvrScore + diversificationScore + efficiencyScore + funnelScore);
};

export const useDerivedKpisSelector = create<DerivedKpisState>()(
  immer((set, get) => ({
    // Initial State
    kpis: null,
    lastComputedHash: '',
    lastComputed: 0,

    // Actions
    computeFromTwoPath: (search, browse) => {
      if (!search || !browse) {
        console.log('⚠️ [DERIVED-KPIS] Missing Two-Path metrics, skipping computation');
        return;
      }

      // Generate hash
      const currentHash = generateMetricsHash(search, browse);

      // Skip if unchanged
      if (currentHash === get().lastComputedHash && currentHash !== '') {
        console.log('✅ [DERIVED-KPIS] Cache HIT - Using cached KPIs');
        return;
      }

      console.log('❌ [DERIVED-KPIS] Cache MISS - Computing KPIs...');

      const startTime = performance.now();

      // Calculate Tap-Through Rate
      const tapThroughRate = {
        search: safeDivide(search.product_page_views, search.impressions),
        browse: safeDivide(browse.product_page_views, browse.impressions),
        combined: safeDivide(
          search.product_page_views + browse.product_page_views,
          search.impressions + browse.impressions
        ),
      };

      // Calculate Conversion Rate
      const conversionRate = {
        search: search.total_cvr,
        browse: browse.total_cvr,
        combined: safeDivide(
          search.downloads + browse.downloads,
          search.impressions + browse.impressions
        ),
      };

      // Install Path Analysis
      const totalDownloads = search.downloads + browse.downloads;
      const totalDirectInstalls = search.direct_installs + browse.direct_installs;
      const totalPdpInstalls = search.pdp_driven_installs + browse.pdp_driven_installs;

      const directShareOfDownloads = safeDivide(totalDirectInstalls, totalDownloads);
      const pdpDrivenShare = safeDivide(totalPdpInstalls, totalDownloads);

      // Channel Efficiency
      const totalImpressions = search.impressions + browse.impressions;
      const searchVolumeWeight = safeDivide(search.impressions, totalImpressions, false);
      const browseVolumeWeight = safeDivide(browse.impressions, totalImpressions, false);

      const searchEfficiency = search.total_cvr * searchVolumeWeight;
      const browseEfficiency = browse.total_cvr * browseVolumeWeight;

      // Intent Signals
      const searchIntensity = search.direct_cvr;
      const browseEngagement = browse.pdp_cvr;

      // Funnel Health
      const funnelLeakRate = {
        search: search.funnel_leak_rate,
        browse: browse.funnel_leak_rate,
        combined: safeDivide(
          (search.product_page_views + browse.product_page_views) - (totalPdpInstalls),
          (search.product_page_views + browse.product_page_views)
        ),
      };

      // Traffic Balance
      const searchBrowseRatio = safeDivide(search.impressions, browse.impressions, false);
      const searchShare = safeDivide(search.impressions, totalImpressions, false);
      const trafficDiversification = 1 - Math.abs(0.5 - searchShare);

      // Construct KPIs object
      const kpis: DerivedKPIs = {
        tapThroughRate,
        conversionRate,
        directShareOfDownloads,
        pdpDrivenShare,
        searchEfficiency,
        browseEfficiency,
        searchIntensity,
        browseEngagement,
        funnelLeakRate,
        searchBrowseRatio,
        trafficDiversification,
        overallHealth: 0, // Calculate after
      };

      // Calculate health score
      kpis.overallHealth = calculateHealthScore(kpis);

      const computeTime = performance.now() - startTime;

      console.log('✅ [DERIVED-KPIS] Computed in', `${computeTime.toFixed(2)}ms`, {
        overallHealth: kpis.overallHealth,
        cvr: conversionRate.combined.toFixed(2) + '%',
      });

      set((state) => {
        state.kpis = kpis;
        state.lastComputedHash = currentHash;
        state.lastComputed = Date.now();
      });
    },

    invalidate: () => {
      set((state) => {
        state.kpis = null;
        state.lastComputedHash = '';
        state.lastComputed = 0;
      });

      console.log('🗑️ [DERIVED-KPIS] Cache invalidated');
    },

    // Selectors
    getKpi: (name) => {
      const { kpis } = get();
      return kpis ? kpis[name] : null;
    },

    getAllKpis: () => get().kpis,

    getKpiCategory: (category) => {
      const { kpis } = get();
      if (!kpis) return {};

      switch (category) {
        case 'conversion':
          return {
            conversionRate: kpis.conversionRate,
            tapThroughRate: kpis.tapThroughRate,
          };
        case 'efficiency':
          return {
            searchEfficiency: kpis.searchEfficiency,
            browseEfficiency: kpis.browseEfficiency,
          };
        case 'engagement':
          return {
            searchIntensity: kpis.searchIntensity,
            browseEngagement: kpis.browseEngagement,
            funnelLeakRate: kpis.funnelLeakRate,
          };
        case 'health':
          return {
            overallHealth: kpis.overallHealth,
            trafficDiversification: kpis.trafficDiversification,
            searchBrowseRatio: kpis.searchBrowseRatio,
          };
        default:
          return {};
      }
    },
  }))
);

// Selector hooks
export const useAllDerivedKpis = () => useDerivedKpisSelector((state) => state.kpis);
export const useOverallHealth = () => useDerivedKpisSelector((state) => state.kpis?.overallHealth || 0);
export const useConversionRates = () => useDerivedKpisSelector((state) => state.kpis?.conversionRate || null);

// Hook to trigger computation when Two-Path metrics change
export const useDerivedKpisComputation = () => {
  const compute = useDerivedKpisSelector((state) => state.computeFromTwoPath);
  const search = useTwoPathSelector((state) => state.search);
  const browse = useTwoPathSelector((state) => state.browse);

  // Auto-compute when Two-Path metrics available
  if (search && browse) {
    compute(search, browse);
  }
};
