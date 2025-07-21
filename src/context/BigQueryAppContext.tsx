
import React, { createContext, useContext, useState, useEffect } from 'react';

interface BigQueryAppContextType {
  selectedApps: string[];
  setSelectedApps: (apps: string[]) => void;
}

const BigQueryAppContext = createContext<BigQueryAppContextType | undefined>(undefined);

export const BigQueryAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ✅ PHASE 3: Start with stable fallback instead of empty array
  const [selectedApps, setSelectedApps] = useState<string[]>(['TUI']);

  // ✅ PHASE 3: Enhanced initialization logging
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] [BigQueryAppContext] Context initialized with apps:`, selectedApps);
    
    // If needed, could load from localStorage or API here
    // For now, maintain ['TUI'] as default to prevent context switching
  }, []);

  // ✅ PHASE 3: Log app selection changes
  const handleSetSelectedApps = (apps: string[]) => {
    console.log(`[${new Date().toISOString()}] [BigQueryAppContext] App selection changing:`, {
      from: selectedApps,
      to: apps
    });
    setSelectedApps(apps);
  };

  return (
    <BigQueryAppContext.Provider value={{ selectedApps, setSelectedApps: handleSetSelectedApps }}>
      {children}
    </BigQueryAppContext.Provider>
  );
};

export const useBigQueryAppSelection = () => {
  const context = useContext(BigQueryAppContext);
  if (context === undefined) {
    throw new Error('useBigQueryAppSelection must be used within a BigQueryAppProvider');
  }
  return context;
};
