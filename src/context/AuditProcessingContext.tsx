
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
  auditRunId: null
};

const STORAGE_KEY = 'audit_processing_state';

function processingReducer(state: ProcessingState, action: ProcessingAction): ProcessingState {
  switch (action.type) {
    case 'START_PROCESSING':
      return {
        ...state,
        isProcessing: true,
        auditRunId: action.payload.auditRunId,
        currentQueryIndex: 0
      };
    
    case 'STOP_PROCESSING':
      return {
        ...state,
        isProcessing: false
      };
    
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        currentQueryIndex: action.payload.currentQueryIndex
      };
    
    case 'ADD_LOG':
      const newLogs = [action.payload, ...state.logs.slice(0, 19)]; // Keep last 20 logs
      return {
        ...state,
        logs: newLogs
      };
    
    case 'UPDATE_STATS':
      return {
        ...state,
        processingStats: {
          ...state.processingStats,
          ...action.payload
        }
      };
    
    case 'RESTORE_STATE':
      // Preserve isProcessing if currently processing to prevent race conditions
      const preserveProcessing = state.isProcessing && state.auditRunId === action.payload.auditRunId;
      return {
        ...state,
        ...action.payload,
        isProcessing: preserveProcessing ? state.isProcessing : (action.payload.isProcessing || false)
      };
    
    case 'CLEAR_STATE':
      return initialState;
    
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
    dispatch({ type: 'START_PROCESSING', payload: { auditRunId } });
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
      console.log('[CONTEXT] Saving state to database:', { isProcessing: state.isProcessing, currentQueryIndex: state.currentQueryIndex });
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
    // Don't load state if currently processing to prevent race conditions
    if (state.isProcessing && state.auditRunId === auditRunId) {
      console.log('[CONTEXT] Skipping database load - currently processing');
      return;
    }

    try {
      console.log('[CONTEXT] Loading state from database for audit:', auditRunId);
      const { data, error } = await DatabaseService.getProcessingState(auditRunId, { organizationId });
      if (!error && data && typeof data === 'object' && !Array.isArray(data)) {
        const dbState = data as any;
        console.log('[CONTEXT] Loaded state from database:', { isProcessing: dbState.isProcessing });
        dispatch({ type: 'RESTORE_STATE', payload: {
          auditRunId,
          currentQueryIndex: dbState.currentQueryIndex || 0,
          logs: dbState.logs || [],
          processingStats: dbState.processingStats || initialState.processingStats,
          isProcessing: dbState.isProcessing || false
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
