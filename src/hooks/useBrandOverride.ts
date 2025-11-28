/**
 * Brand Override Hook
 *
 * Manages user-defined brand overrides per app.
 * Stores in localStorage as global setting for each app.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'aso-audit-brand-overrides';

interface BrandOverrides {
  [appId: string]: string;
}

/**
 * Get brand overrides from localStorage
 */
function getBrandOverrides(): BrandOverrides {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to parse brand overrides from localStorage:', error);
    return {};
  }
}

/**
 * Save brand overrides to localStorage
 */
function saveBrandOverrides(overrides: BrandOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.error('Failed to save brand overrides to localStorage:', error);
  }
}

/**
 * Custom hook for managing brand override for a specific app
 *
 * @param appId - Unique identifier for the app (e.g., app store ID or app name)
 * @returns [brandOverride, setBrandOverride, clearBrandOverride]
 */
export function useBrandOverride(appId: string | undefined): [
  string | null,
  (brand: string) => void,
  () => void
] {
  const [brandOverride, setBrandOverrideState] = useState<string | null>(null);

  // Load brand override on mount
  useEffect(() => {
    if (!appId) {
      setBrandOverrideState(null);
      return;
    }

    const overrides = getBrandOverrides();
    const override = overrides[appId] || null;
    setBrandOverrideState(override);
  }, [appId]);

  // Set brand override
  const setBrandOverride = useCallback((brand: string) => {
    if (!appId) {
      console.warn('Cannot set brand override without appId');
      return;
    }

    const overrides = getBrandOverrides();
    overrides[appId] = brand;
    saveBrandOverrides(overrides);
    setBrandOverrideState(brand);
  }, [appId]);

  // Clear brand override
  const clearBrandOverride = useCallback(() => {
    if (!appId) {
      console.warn('Cannot clear brand override without appId');
      return;
    }

    const overrides = getBrandOverrides();
    delete overrides[appId];
    saveBrandOverrides(overrides);
    setBrandOverrideState(null);
  }, [appId]);

  return [brandOverride, setBrandOverride, clearBrandOverride];
}
