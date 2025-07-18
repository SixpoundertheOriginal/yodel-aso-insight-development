
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { DatabaseService } from '@/lib/services/database.service';

interface ProcessingState {
  isProcessing: boolean;
  currentQueryIndex: number;
  logs: string[];
  processingStats: {
    totalQueries: number;
    completedQueries: number;
    failedQueries: number;
    avgResponseTime: number;
    totalCost: number;
    estimatedTimeRemaining: number;
  };
  auditRunId: string | null;
  lastStateUpdate: number; // Add timestamp to track state updates
}

interface ProcessingAction {
  type: 'START_PROCESSING' | 'STOP_PROCESSING' | 'UPDATE_PROGRESS' | 'ADD_LOG' | 'UPDATE_STATS' | 'RESTORE_STATE' | 'CLEAR_STATE';
  payload?: any;
}

const initialState: ProcessingState = {
  isProcessing: false,
  currentQueryIndex: 0,
  logs: [],
  processingStats: {
    totalQueries: 0,
    completedQueries: 0,
    failedQueries: 0,
    avgResponseTime: 0,
    totalCost: 0,
    estimatedTimeRemaining: 0
  },
  auditRunId: null,
  lastStateUpdate: Date.now()
};

const STORAGE_KEY = 'audit_processing_state';

function processingReducer(state: ProcessingState, action: ProcessingAction): ProcessingState {
  switch (action.type) {
    case 'START_PROCESSING':
      console.log('[CONTEXT-REDUCER] START_PROCESSING called for audit:', action.payload.auditRunId);
      const startState = {
        ...state,
        isProcessing: true,
        auditRunId: action.payload.auditRunId,
        currentQueryIndex: 0,
        lastStateUpdate: Date.now()
      };
      console.log('[CONTEXT-REDUCER] START_PROCESSING result - isProcessing:', startState.isProcessing);
      return startState;
    
    case 'STOP_PROCESSING':
      console.log('[CONTEXT-REDUCER] STOP_PROCESSING called');
      return {
        ...state,
        isProcessing: false,
        lastStateUpdate: Date.now()
      };
    
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        currentQueryIndex: action.payload.currentQueryIndex,
        lastStateUpdate: Date.now()
      };
    
    case 'ADD_LOG':
      const newLogs = [action.payload, ...state.logs.slice(0, 19)]; // Keep last 20 logs
      return {
        ...state,
        logs: newLogs,
        lastStateUpdate: Date.now()
      };
    
    case 'UPDATE_STATS':
      return {
        ...state,
        processingStats: {
          ...state.processingStats,
          ...action.payload
        },
        lastStateUpdate: Date.now()
      };
    
    case 'RESTORE_STATE':
      const restoredData = action.payload;
      const currentTime = Date.now();
      
      console.log('[CONTEXT-REDUCER] RESTORE_STATE called');
      console.log('[CONTEXT-REDUCER] Current state - isProcessing:', state.isProcessing, 'auditRunId:', state.auditRunId);
      console.log('[CONTEXT-REDUCER] Restored data - isProcessing:', restoredData.isProcessing, 'auditRunId:', restoredData.auditRunId);
      
      // CRITICAL: Don't overwrite active processing state with stale database state
      // If we're currently processing and it's the same audit, preserve the processing state
      const shouldPreserveProcessing = state.isProcessing && 
                                     state.auditRunId === restoredData.auditRunId &&
                                     state.lastStateUpdate > (restoredData.lastStateUpdate || 0);
      
      if (shouldPreserveProcessing) {
        console.log('[CONTEXT-REDUCER] PRESERVING active processing state, ignoring stale database state');
        return {
          ...state,
          // Only restore non-processing related data
          logs: restoredData.logs || state.logs,
          processingStats: restoredData.processingStats || state.processingStats,
          currentQueryIndex: Math.max(state.currentQueryIndex, restoredData.currentQueryIndex || 0),
          lastStateUpdate: currentTime
        };
      }
      
      console.log('[CONTEXT-REDUCER] RESTORING state from database');
      return {
        ...state,
        ...restoredData,
        // Always update timestamp and ensure boolean conversion
        isProcessing: Boolean(restoredData.isProcessing),
        lastStateUpdate: currentTime
      };
    
    case 'CLEAR_STATE':
      console.log('[CONTEXT-REDUCER] CLEAR_STATE called');
      return {
        ...initialState,
        lastStateUpdate: Date.now()
      };
    
    default:
      return state;
  }
}

interface AuditProcessingContextType {
  state: ProcessingState;
  startProcessing: (auditRunId: string) => void;
  stopProcessing: () => void;
  updateProgress: (currentQueryIndex: number) => void;
  addLog: (message: string) => void;
  updateStats: (stats: Partial<ProcessingState['processingStats']>) => void;
  clearState: () => void;
  canResume: (auditRunId: string) => boolean;
  saveToDatabase: (auditRunId: string, organizationId: string) => Promise<void>;
  loadFromDatabase: (auditRunId: string, organizationId: string) => Promise<void>;
}

const AuditProcessingContext = createContext<AuditProcessingContextType | undefined>(undefined);

export const AuditProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(processingReducer, initialState);

  // Load state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        console.log('[CONTEXT-PROVIDER] Loading state from sessionStorage:', { isProcessing: parsedState.isProcessing });
        dispatch({ type: 'RESTORE_STATE', payload: parsedState });
      } catch (error) {
        console.warn('Failed to restore processing state:', error);
      }
    }
  }, []);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (state.auditRunId) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const startProcessing = (auditRunId: string) => {
    console.log('[CONTEXT] Starting processing for audit:', auditRunId);
    console.log('[CONTEXT] Current state before start - isProcessing:', state.isProcessing);
    
    dispatch({ type: 'START_PROCESSING', payload: { auditRunId } });
    
    // Clear any stale database state when starting new processing
    setTimeout(async () => {
      try {
        // Get organization ID for database operations
        const authResult = await DatabaseService.testAuthContext();
        if (authResult.hasAuth && authResult.organizationId) {
          await DatabaseService.saveProcessingState(auditRunId, {
            currentQueryIndex: 0,
            logs: [],
            processingStats: initialState.processingStats,
            isProcessing: true
          }, { organizationId: authResult.organizationId });
          console.log('[CONTEXT] Cleared stale database state for new processing');
        }
      } catch (error) {
        console.warn('[CONTEXT] Failed to clear stale database state:', error);
      }
    }, 100);
  };

  const stopProcessing = () => {
    console.log('[CONTEXT] Stopping processing');
    dispatch({ type: 'STOP_PROCESSING' });
  };

  const updateProgress = (currentQueryIndex: number) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: { currentQueryIndex } });
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    dispatch({ type: 'ADD_LOG', payload: `[${timestamp}] ${message}` });
  };

  const updateStats = (stats: Partial<ProcessingState['processingStats']>) => {
    dispatch({ type: 'UPDATE_STATS', payload: stats });
  };

  const clearState = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'CLEAR_STATE' });
  };

  const canResume = (auditRunId: string) => {
    return state.auditRunId === auditRunId && state.logs.length > 0;
  };

  const saveToDatabase = async (auditRunId: string, organizationId: string) => {
    try {
      console.log('[CONTEXT] Saving state to database:', { 
        isProcessing: state.isProcessing, 
        currentQueryIndex: state.currentQueryIndex,
        lastStateUpdate: state.lastStateUpdate
      });
      await DatabaseService.saveProcessingState(auditRunId, {
        currentQueryIndex: state.currentQueryIndex,
        logs: state.logs,
        processingStats: state.processingStats,
        isProcessing: state.isProcessing
      }, { organizationId });
    } catch (error) {
      console.error('Failed to save processing state to database:', error);
    }
  };

  const loadFromDatabase = async (auditRunId: string, organizationId: string) => {
    // CRITICAL: Don't load state if currently processing to prevent race conditions
    if (state.isProcessing && state.auditRunId === auditRunId) {
      console.log('[CONTEXT] Skipping database load - currently processing same audit');
      return;
    }

    // Additional guard: Don't load if we just started processing (within last 5 seconds)
    const timeSinceLastUpdate = Date.now() - state.lastStateUpdate;
    if (state.isProcessing && timeSinceLastUpdate < 5000) {
      console.log('[CONTEXT] Skipping database load - recently started processing');
      return;
    }

    try {
      console.log('[CONTEXT] Loading state from database for audit:', auditRunId);
      const { data, error } = await DatabaseService.getProcessingState(auditRunId, { organizationId });
      if (!error && data && typeof data === 'object' && !Array.isArray(data)) {
        const dbState = data as any;
        console.log('[CONTEXT] Loaded state from database:', { 
          isProcessing: dbState.isProcessing,
          lastStateUpdate: dbState.lastStateUpdate,
          currentTimestamp: Date.now()
        });
        
        dispatch({ type: 'RESTORE_STATE', payload: {
          auditRunId,
          currentQueryIndex: dbState.currentQueryIndex || 0,
          logs: dbState.logs || [],
          processingStats: dbState.processingStats || initialState.processingStats,
          isProcessing: dbState.isProcessing || false,
          lastStateUpdate: dbState.lastUpdated ? new Date(dbState.lastUpdated).getTime() : 0
        }});
      }
    } catch (error) {
      console.error('Failed to load processing state from database:', error);
    }
  };

  return (
    <AuditProcessingContext.Provider value={{
      state,
      startProcessing,
      stopProcessing,
      updateProgress,
      addLog,
      updateStats,
      clearState,
      canResume,
      saveToDatabase,
      loadFromDatabase
    }}>
      {children}
    </AuditProcessingContext.Provider>
  );
};

export const useAuditProcessing = () => {
  const context = useContext(AuditProcessingContext);
  if (context === undefined) {
    throw new Error('useAuditProcessing must be used within an AuditProcessingProvider');
  }
  return context;
};
