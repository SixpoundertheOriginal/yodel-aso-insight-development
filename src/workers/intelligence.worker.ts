/**
 * ASO Intelligence Layer Web Worker
 *
 * Offloads CPU-intensive intelligence calculations to background thread.
 * Prevents main thread blocking during heavy statistical analysis.
 *
 * Key Features:
 * - Non-blocking calculations (UI remains responsive)
 * - Progressive result streaming (stability → opportunities → scenarios)
 * - Error isolation (worker crashes don't affect UI)
 * - Parallel computation potential (future: multiple workers)
 */

import {
  calculateStabilityScore,
  calculateOpportunityMap,
  simulateOutcomes,
  type TimeSeriesPoint,
  type StabilityScore,
  type OpportunityCandidate,
  type SimulationScenario,
} from '../utils/asoIntelligence';
import type { TwoPathConversionMetrics } from '../utils/twoPathCalculator';
import type { DerivedKPIs } from '../stores/useDerivedKpisSelector';

// Message types
interface ComputeMessage {
  type: 'compute';
  payload: {
    timeseries: TimeSeriesPoint[];
    twoPathMetrics: {
      search: TwoPathConversionMetrics;
      browse: TwoPathConversionMetrics;
      combined: TwoPathConversionMetrics;
    };
    derivedKpis: DerivedKPIs;
  };
}

interface CancelMessage {
  type: 'cancel';
}

type WorkerMessage = ComputeMessage | CancelMessage;

// Response types
interface StabilityResponse {
  type: 'stability';
  data: StabilityScore;
}

interface OpportunitiesResponse {
  type: 'opportunities';
  data: OpportunityCandidate[];
}

interface ScenariosResponse {
  type: 'scenarios';
  data: SimulationScenario[];
}

interface CompleteResponse {
  type: 'complete';
}

interface ErrorResponse {
  type: 'error';
  error: string;
}

interface ProgressResponse {
  type: 'progress';
  step: string;
  progress: number; // 0-100
}

type WorkerResponse =
  | StabilityResponse
  | OpportunitiesResponse
  | ScenariosResponse
  | CompleteResponse
  | ErrorResponse
  | ProgressResponse;

// Worker state
let isCancelled = false;

// Main message handler
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data as ComputeMessage;

  if (type === 'cancel') {
    isCancelled = true;
    console.log('[WORKER] Computation cancelled');
    return;
  }

  if (type === 'compute') {
    isCancelled = false;
    computeIntelligence(payload);
  }
};

// Main computation function
async function computeIntelligence(payload: ComputeMessage['payload']) {
  try {
    const startTime = performance.now();

    console.log('[WORKER] Starting intelligence computation...', {
      timeseriesPoints: payload.timeseries.length,
      hasSearch: !!payload.twoPathMetrics.search,
      hasBrowse: !!payload.twoPathMetrics.browse,
    });

    // Step 1: Stability Score (200ms typical)
    if (isCancelled) return;

    self.postMessage({
      type: 'progress',
      step: 'Analyzing performance stability...',
      progress: 0,
    } as ProgressResponse);

    const stabilityScore = calculateStabilityScore(payload.timeseries);

    self.postMessage({
      type: 'stability',
      data: stabilityScore,
    } as StabilityResponse);

    console.log('[WORKER] Stability Score computed');

    // Step 2: Opportunity Map (150ms typical)
    if (isCancelled) return;

    self.postMessage({
      type: 'progress',
      step: 'Identifying optimization opportunities...',
      progress: 33,
    } as ProgressResponse);

    const opportunities = calculateOpportunityMap(
      payload.derivedKpis,
      payload.twoPathMetrics.search,
      payload.twoPathMetrics.browse
    );

    self.postMessage({
      type: 'opportunities',
      data: opportunities,
    } as OpportunitiesResponse);

    console.log('[WORKER] Opportunity Map computed');

    // Step 3: Outcome Simulations (180ms typical)
    if (isCancelled) return;

    self.postMessage({
      type: 'progress',
      step: 'Simulating improvement scenarios...',
      progress: 66,
    } as ProgressResponse);

    const totalMetrics = {
      impressions: payload.twoPathMetrics.combined.impressions,
      downloads: payload.twoPathMetrics.combined.downloads,
      cvr: payload.twoPathMetrics.combined.total_cvr,
    };

    const scenarios = simulateOutcomes(
      totalMetrics,
      payload.twoPathMetrics.search,
      payload.twoPathMetrics.browse,
      payload.derivedKpis
    );

    self.postMessage({
      type: 'scenarios',
      data: scenarios,
    } as ScenariosResponse);

    console.log('[WORKER] Outcome Simulations computed');

    // Complete
    const totalTime = performance.now() - startTime;

    self.postMessage({
      type: 'complete',
    } as CompleteResponse);

    console.log(`[WORKER] ✅ All intelligence computations complete in ${totalTime.toFixed(2)}ms`);
  } catch (error) {
    console.error('[WORKER] ❌ Error during computation:', error);

    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ErrorResponse);
  }
}

// Export for TypeScript (not used at runtime in worker context)
export {};
