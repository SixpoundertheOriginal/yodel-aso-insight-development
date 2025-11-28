/**
 * Workbench Selection Context
 *
 * Manages multi-select state for keywords and combos from element cards.
 * Enables "View in Workbench" functionality to filter Enhanced Keyword Combo Workbench.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface WorkbenchSelection {
  keywords: string[];
  combos: string[];
  sourceElement: 'title' | 'subtitle' | 'both' | null;
}

export interface WorkbenchSelectionContextValue {
  selection: WorkbenchSelection;
  addKeyword: (keyword: string, source: 'title' | 'subtitle') => void;
  removeKeyword: (keyword: string) => void;
  toggleKeyword: (keyword: string, source: 'title' | 'subtitle') => void;
  addCombo: (combo: string, source: 'title' | 'subtitle') => void;
  removeCombo: (combo: string) => void;
  toggleCombo: (combo: string, source: 'title' | 'subtitle') => void;
  clearSelection: () => void;
  clearKeywords: () => void;
  clearCombos: () => void;
  hasSelection: boolean;
  isKeywordSelected: (keyword: string) => boolean;
  isComboSelected: (combo: string) => boolean;
  viewInWorkbench: () => void;
  workbenchRef: React.RefObject<HTMLDivElement>;
}

const WorkbenchSelectionContext = createContext<WorkbenchSelectionContextValue | undefined>(undefined);

export const WorkbenchSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selection, setSelection] = useState<WorkbenchSelection>({
    keywords: [],
    combos: [],
    sourceElement: null,
  });

  const workbenchRef = useRef<HTMLDivElement>(null);

  // Determine combined source element
  const determineSourceElement = useCallback(
    (newSource: 'title' | 'subtitle', currentSource: 'title' | 'subtitle' | 'both' | null): 'title' | 'subtitle' | 'both' => {
      if (!currentSource) return newSource;
      if (currentSource === newSource) return newSource;
      return 'both';
    },
    []
  );

  // Add keyword
  const addKeyword = useCallback((keyword: string, source: 'title' | 'subtitle') => {
    setSelection((prev) => {
      if (prev.keywords.includes(keyword)) return prev;
      return {
        ...prev,
        keywords: [...prev.keywords, keyword],
        sourceElement: determineSourceElement(source, prev.sourceElement),
      };
    });
  }, [determineSourceElement]);

  // Remove keyword
  const removeKeyword = useCallback((keyword: string) => {
    setSelection((prev) => {
      const keywords = prev.keywords.filter((k) => k !== keyword);
      return {
        ...prev,
        keywords,
        sourceElement: keywords.length === 0 && prev.combos.length === 0 ? null : prev.sourceElement,
      };
    });
  }, []);

  // Toggle keyword
  const toggleKeyword = useCallback((keyword: string, source: 'title' | 'subtitle') => {
    setSelection((prev) => {
      const isSelected = prev.keywords.includes(keyword);
      if (isSelected) {
        const keywords = prev.keywords.filter((k) => k !== keyword);
        return {
          ...prev,
          keywords,
          sourceElement: keywords.length === 0 && prev.combos.length === 0 ? null : prev.sourceElement,
        };
      } else {
        return {
          ...prev,
          keywords: [...prev.keywords, keyword],
          sourceElement: determineSourceElement(source, prev.sourceElement),
        };
      }
    });
  }, [determineSourceElement]);

  // Add combo
  const addCombo = useCallback((combo: string, source: 'title' | 'subtitle') => {
    setSelection((prev) => {
      if (prev.combos.includes(combo)) return prev;
      return {
        ...prev,
        combos: [...prev.combos, combo],
        sourceElement: determineSourceElement(source, prev.sourceElement),
      };
    });
  }, [determineSourceElement]);

  // Remove combo
  const removeCombo = useCallback((combo: string) => {
    setSelection((prev) => {
      const combos = prev.combos.filter((c) => c !== combo);
      return {
        ...prev,
        combos,
        sourceElement: prev.keywords.length === 0 && combos.length === 0 ? null : prev.sourceElement,
      };
    });
  }, []);

  // Toggle combo
  const toggleCombo = useCallback((combo: string, source: 'title' | 'subtitle') => {
    setSelection((prev) => {
      const isSelected = prev.combos.includes(combo);
      if (isSelected) {
        const combos = prev.combos.filter((c) => c !== combo);
        return {
          ...prev,
          combos,
          sourceElement: prev.keywords.length === 0 && combos.length === 0 ? null : prev.sourceElement,
        };
      } else {
        return {
          ...prev,
          combos: [...prev.combos, combo],
          sourceElement: determineSourceElement(source, prev.sourceElement),
        };
      }
    });
  }, [determineSourceElement]);

  // Clear all selection
  const clearSelection = useCallback(() => {
    setSelection({
      keywords: [],
      combos: [],
      sourceElement: null,
    });
  }, []);

  // Clear keywords only
  const clearKeywords = useCallback(() => {
    setSelection((prev) => ({
      ...prev,
      keywords: [],
      sourceElement: prev.combos.length === 0 ? null : prev.sourceElement,
    }));
  }, []);

  // Clear combos only
  const clearCombos = useCallback(() => {
    setSelection((prev) => ({
      ...prev,
      combos: [],
      sourceElement: prev.keywords.length === 0 ? null : prev.sourceElement,
    }));
  }, []);

  // Check if has selection
  const hasSelection = selection.keywords.length > 0 || selection.combos.length > 0;

  // Check if keyword is selected
  const isKeywordSelected = useCallback(
    (keyword: string) => selection.keywords.includes(keyword),
    [selection.keywords]
  );

  // Check if combo is selected
  const isComboSelected = useCallback(
    (combo: string) => selection.combos.includes(combo),
    [selection.combos]
  );

  // Scroll to workbench
  const viewInWorkbench = useCallback(() => {
    if (workbenchRef.current) {
      workbenchRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, []);

  const value: WorkbenchSelectionContextValue = {
    selection,
    addKeyword,
    removeKeyword,
    toggleKeyword,
    addCombo,
    removeCombo,
    toggleCombo,
    clearSelection,
    clearKeywords,
    clearCombos,
    hasSelection,
    isKeywordSelected,
    isComboSelected,
    viewInWorkbench,
    workbenchRef,
  };

  return (
    <WorkbenchSelectionContext.Provider value={value}>
      {children}
    </WorkbenchSelectionContext.Provider>
  );
};

export const useWorkbenchSelection = (): WorkbenchSelectionContextValue => {
  const context = useContext(WorkbenchSelectionContext);
  if (!context) {
    throw new Error('useWorkbenchSelection must be used within WorkbenchSelectionProvider');
  }
  return context;
};
