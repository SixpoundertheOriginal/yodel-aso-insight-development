import { useState } from 'react';
import { ScrapedMetadata } from '@/types/aso';

/**
 * Hook for managing Creative Intelligence app selection state
 *
 * Phase 1A: App selector integration
 * - Manages selected app state
 * - Controls modal visibility
 * - Provides app selection actions
 */
export function useCreativeApp() {
  const [selectedApp, setSelectedApp] = useState<ScrapedMetadata | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openSelector = () => {
    console.log('[useCreativeApp] Opening app selector modal');
    setIsModalOpen(true);
  };

  const closeSelector = () => {
    console.log('[useCreativeApp] Closing app selector modal');
    setIsModalOpen(false);
  };

  const selectApp = (app: ScrapedMetadata) => {
    console.log('[useCreativeApp] App selected:', {
      name: app.name,
      appId: app.appId,
      developer: app.developer
    });
    setSelectedApp(app);
    setIsModalOpen(false);
  };

  const clearApp = () => {
    console.log('[useCreativeApp] Clearing selected app');
    setSelectedApp(null);
  };

  return {
    selectedApp,
    isModalOpen,
    openSelector,
    closeSelector,
    selectApp,
    clearApp,
    setSelectedApp, // For direct state updates if needed
  };
}
