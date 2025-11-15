import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  StabilityScore,
  OpportunityCandidate,
  SimulationScenario,
  TimeSeriesPoint,
} from '@/utils/asoIntelligence';
import type { TwoPathConversionMetrics } from '@/utils/twoPathCalculator';
import type { DerivedKPIs } from '@/stores/useDerivedKpisSelector';

/**
 * Intelligence Worker Hook
 *
 * React hook for managing Web Worker-based intelligence calculations.
 * Provides progressive loading, cancellation, and automatic cleanup.
 *
 * Key Features:
 * - Non-blocking calculations (no UI freeze)
 * - Progressive result streaming
 * - Automatic worker cleanup on unmount
 * - Error handling with fallback
 */

export interface IntelligenceResults {
  stabilityScore: StabilityScore | null;
  opportunities: OpportunityCandidate[];
  scenarios: SimulationScenario[];
}

export interface IntelligenceWorkerState {
  results: IntelligenceResults;
  isComputing: boolean;
  progress: number; // 0-100
  currentStep: string;
  error: Error | null;
}

export interface ComputePayload {
  timeseries: TimeSeriesPoint[];
  twoPathMetrics: {
    search: TwoPathConversionMetrics;
    browse: TwoPathConversionMetrics;
    combined: TwoPathConversionMetrics;
  };
  derivedKpis: DerivedKPIs;
}

export function useIntelligenceWorker() {
  const [state, setState] = useState<IntelligenceWorkerState>({
    results: {
      stabilityScore: null,
      opportunities: [],
      scenarios: [],
    },
    isComputing: false,
    progress: 0,
    currentStep: '',
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);

  // Initialize worker on mount
  useEffect(() => {
    try {
      // Create worker using Vite's ?worker syntax
      const worker = new Worker(
        new URL('../workers/intelligence.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      worker.onmessage = (e: MessageEvent) => {
        const { type, data, error, step, progress } = e.data;

        switch (type) {
          case 'stability':
            setState((prev) => ({
              ...prev,
              results: {
                ...prev.results,
                stabilityScore: data,
              },
            }));
            break;

          case 'opportunities':
            setState((prev) => ({
              ...prev,
              results: {
                ...prev.results,
                opportunities: data,
              },
            }));
            break;

          case 'scenarios':
            setState((prev) => ({
              ...prev,
              results: {
                ...prev.results,
                scenarios: data,
              },
            }));
            break;

          case 'progress':
            setState((prev) => ({
              ...prev,
              currentStep: step,
              progress,
            }));
            break;

          case 'complete':
            setState((prev) => ({
              ...prev,
              isComputing: false,
              progress: 100,
              currentStep: 'Complete',
            }));
            console.log('✅ [INTELLIGENCE-WORKER] All computations complete');
            break;

          case 'error':
            setState((prev) => ({
              ...prev,
              isComputing: false,
              error: new Error(error),
            }));
            console.error('❌ [INTELLIGENCE-WORKER] Error:', error);
            break;

          default:
            console.warn('[INTELLIGENCE-WORKER] Unknown message type:', type);
        }
      };

      // Set up error handler
      worker.onerror = (error) => {
        console.error('❌ [INTELLIGENCE-WORKER] Worker error:', error);
        setState((prev) => ({
          ...prev,
          isComputing: false,
          error: new Error('Worker crashed'),
        }));
      };

      workerRef.current = worker;

      console.log('✅ [INTELLIGENCE-WORKER] Worker initialized');

      // Cleanup on unmount
      return () => {
        console.log('🗑️ [INTELLIGENCE-WORKER] Terminating worker');
        worker.terminate();
        workerRef.current = null;
      };
    } catch (error) {
      console.error('❌ [INTELLIGENCE-WORKER] Failed to initialize worker:', error);
      setState((prev) => ({
        ...prev,
        error: new Error('Failed to initialize worker'),
      }));
    }
  }, []);

  // Compute intelligence
  const computeIntelligence = useCallback((payload: ComputePayload) => {
    if (!workerRef.current) {
      console.error('❌ [INTELLIGENCE-WORKER] Worker not initialized');
      return;
    }

    // Reset state
    setState({
      results: {
        stabilityScore: null,
        opportunities: [],
        scenarios: [],
      },
      isComputing: true,
      progress: 0,
      currentStep: 'Starting...',
      error: null,
    });

    // Post message to worker
    workerRef.current.postMessage({
      type: 'compute',
      payload,
    });

    console.log('📤 [INTELLIGENCE-WORKER] Computation started', {
      timeseriesPoints: payload.timeseries.length,
    });
  }, []);

  // Cancel computation
  const cancelComputation = useCallback(() => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({ type: 'cancel' });

    setState((prev) => ({
      ...prev,
      isComputing: false,
      currentStep: 'Cancelled',
    }));

    console.log('🚫 [INTELLIGENCE-WORKER] Computation cancelled');
  }, []);

  return {
    // Results
    stabilityScore: state.results.stabilityScore,
    opportunities: state.results.opportunities,
    scenarios: state.results.scenarios,

    // Status
    isComputing: state.isComputing,
    progress: state.progress,
    currentStep: state.currentStep,
    error: state.error,

    // Actions
    computeIntelligence,
    cancelComputation,
  };
}
