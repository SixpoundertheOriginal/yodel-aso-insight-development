import React, { createContext, useContext, useReducer, useEffect } from 'react';

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
      return {
        ...state,
        ...action.payload
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
    dispatch({ type: 'START_PROCESSING', payload: { auditRunId } });
  };

  const stopProcessing = () => {
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

  return (
    <AuditProcessingContext.Provider value={{
      state,
      startProcessing,
      stopProcessing,
      updateProgress,
      addLog,
      updateStats,
      clearState,
      canResume
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