
const DEBUG_LEVELS = {
  SILENT: 0,     // Production - errors only
  BASIC: 1,      // Development - essential logs
  VERBOSE: 2,    // Deep debugging - full diagnostics
} as const;

type DebugLevel = typeof DEBUG_LEVELS[keyof typeof DEBUG_LEVELS];

const getDebugLevel = (): DebugLevel => {
  // Always silent in production
  if (process.env.NODE_ENV === 'production') {
    return DEBUG_LEVELS.SILENT;
  }
  
  // Check localStorage for development debug level
  try {
    const stored = localStorage.getItem('aso_debug_level');
    if (stored) {
      const level = parseInt(stored);
      if (level >= 0 && level <= 2) {
        return level as DebugLevel;
      }
    }
  } catch (error) {
    // Fallback if localStorage is not available
  }
  
  // Default to BASIC for development
  return DEBUG_LEVELS.BASIC;
};

// Debug utility functions
export const debugLog = {
  // Always show errors regardless of debug level
  error: (message: string, data?: any) => {
    console.error(message, data);
  },
  
  // Show warnings in development basic mode and above
  warn: (message: string, data?: any) => {
    if (getDebugLevel() >= DEBUG_LEVELS.BASIC) {
      console.warn(message, data);
    }
  },
  
  // Show info logs only in verbose mode
  info: (message: string, data?: any) => {
    if (getDebugLevel() >= DEBUG_LEVELS.VERBOSE) {
      console.log(message, data);
    }
  },
  
  // Show verbose logs only in verbose mode
  verbose: (message: string, data?: any) => {
    if (getDebugLevel() >= DEBUG_LEVELS.VERBOSE) {
      console.log(message, data);
    }
  }
};

// Helper functions for development
export const setDebugLevel = (level: keyof typeof DEBUG_LEVELS) => {
  try {
    localStorage.setItem('aso_debug_level', DEBUG_LEVELS[level].toString());
    console.log(`Debug level set to: ${level}`);
  } catch (error) {
    console.error('Failed to set debug level:', error);
  }
};

export const getCurrentDebugLevel = (): string => {
  const level = getDebugLevel();
  return Object.keys(DEBUG_LEVELS).find(key => DEBUG_LEVELS[key as keyof typeof DEBUG_LEVELS] === level) || 'SILENT';
};

// Development helper - expose to window for easy debugging
if (process.env.NODE_ENV === 'development') {
  (window as any).asoDebug = {
    setLevel: setDebugLevel,
    getLevel: getCurrentDebugLevel,
    levels: DEBUG_LEVELS
  };
}
