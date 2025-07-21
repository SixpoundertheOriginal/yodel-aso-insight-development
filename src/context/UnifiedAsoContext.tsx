
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useUnifiedAsoAnalysis } from '@/hooks/useUnifiedAsoAnalysis';
import { ScrapedMetadata } from '@/types/aso';

export type AsoMode = 'parser' | 'tracking';

interface UnifiedAsoContextType {
  // Mode management
  currentMode: AsoMode;
  setCurrentMode: (mode: AsoMode) => void;
  
  // Unified analysis access
  analysis: ReturnType<typeof useUnifiedAsoAnalysis>;
  
  // Quick access to key states
  isLoading: boolean;
  hasData: boolean;
  importedApp: ScrapedMetadata | null;
  activeTab: string;
  
  // Actions
  switchToTracking: (appId: string) => void;
  switchToParser: () => void;
}

const UnifiedAsoContext = createContext<UnifiedAsoContextType | undefined>(undefined);

interface UnifiedAsoProviderProps {
  children: ReactNode;
  organizationId: string;
}

export const UnifiedAsoProvider: React.FC<UnifiedAsoProviderProps> = ({
  children,
  organizationId
}) => {
  const [currentMode, setCurrentMode] = useState<AsoMode>('parser');
  
  // Use the existing unified analysis hook
  const analysis = useUnifiedAsoAnalysis({ organizationId });
  
  // Quick access helpers
  const isLoading = analysis.isLoading;
  const hasData = analysis.hasData;
  const importedApp = analysis.importedApp;
  const activeTab = analysis.activeTab;
  
  const switchToTracking = useCallback((appId: string) => {
    setCurrentMode('tracking');
    // Additional logic for switching to tracking mode with specific app
    console.log('🔄 [UNIFIED-ASO] Switching to tracking mode for app:', appId);
  }, []);
  
  const switchToParser = useCallback(() => {
    setCurrentMode('parser');
    analysis.resetAnalysis();
    console.log('🔄 [UNIFIED-ASO] Switching to parser mode');
  }, [analysis]);

  return (
    <UnifiedAsoContext.Provider value={{
      currentMode,
      setCurrentMode,
      analysis,
      isLoading,
      hasData,
      importedApp,
      activeTab,
      switchToTracking,
      switchToParser
    }}>
      {children}
    </UnifiedAsoContext.Provider>
  );
};

export const useUnifiedAso = (): UnifiedAsoContextType => {
  const context = useContext(UnifiedAsoContext);
  if (!context) {
    throw new Error('useUnifiedAso must be used within UnifiedAsoProvider');
  }
  return context;
};
