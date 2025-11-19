import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Smartphone, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useRecentApps } from '@/hooks/useRecentApps';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

/**
 * Compact App Selector Component - Dual Mode Edition
 *
 * Modern app selector with two modes:
 * 1. Single App Mode: Radio buttons, 1-click selection, immediate apply
 * 2. Compare Apps Mode: Checkboxes, multi-select, Apply button required
 *
 * Features:
 * - Mode switching via segmented control
 * - Recent apps section (last 5 selected)
 * - Mode persistence in localStorage
 * - One-time onboarding tooltip
 * - Mobile-friendly and accessible
 *
 * UX Improvements:
 * - Single app selection: 7 clicks → 1 click
 * - App switching: 2 clicks → 1 click
 * - Mode discovery: Explicit segmented control
 */

interface AppInfo {
  app_id: string;
  app_name?: string;
}

interface CompactAppSelectorProps {
  availableApps: AppInfo[];
  selectedAppIds: string[];
  onSelectionChange: (appIds: string[]) => void;
  isLoading?: boolean;
}

type SelectorMode = 'single' | 'compare';

const MODE_STORAGE_KEY = 'dashboard_v2_app_selector_mode';
const ONBOARDING_STORAGE_KEY = 'app_selector_onboarding_shown';

function getStoredMode(): SelectorMode {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === 'single' || stored === 'compare') {
      return stored;
    }
  } catch (error) {
    console.error('[APP-SELECTOR] Failed to load mode from localStorage:', error);
  }
  return 'single'; // Default to single mode
}

function saveMode(mode: SelectorMode): void {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch (error) {
    console.error('[APP-SELECTOR] Failed to save mode to localStorage:', error);
  }
}

function shouldShowOnboarding(): boolean {
  try {
    const shown = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return shown !== 'true';
  } catch (error) {
    return false;
  }
}

function markOnboardingShown(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch (error) {
    console.error('[APP-SELECTOR] Failed to mark onboarding shown:', error);
  }
}

export function CompactAppSelector({
  availableApps = [],
  selectedAppIds = [],
  onSelectionChange,
  isLoading = false
}: CompactAppSelectorProps) {
  const { organizationId } = usePermissions();
  const { recentApps, addRecentApp } = useRecentApps(organizationId || '');
  const { toast } = useToast();

  // Initialize mode based on current selection or stored preference
  const [mode, setMode] = useState<SelectorMode>(() => {
    const storedMode = getStoredMode();
    // If multiple apps selected, force compare mode
    if (selectedAppIds.length > 1) {
      return 'compare';
    }
    return storedMode;
  });

  // Temporary selection for Compare mode (before Apply)
  const [tempSelection, setTempSelection] = useState<string[]>(selectedAppIds);

  // Track if dropdown is open
  const [isOpen, setIsOpen] = useState(false);

  // Show onboarding tooltip
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check onboarding on mount
  useEffect(() => {
    if (shouldShowOnboarding()) {
      setShowOnboarding(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShowOnboarding(false);
        markOnboardingShown();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync tempSelection when selectedAppIds changes externally
  useEffect(() => {
    setTempSelection(selectedAppIds);
  }, [selectedAppIds]);

  // Handle mode switching
  const handleModeChange = (newMode: SelectorMode) => {
    console.log(`[APP-SELECTOR] Mode changed: ${mode} → ${newMode}`);

    if (newMode === 'single' && selectedAppIds.length > 1) {
      // Switching from Compare to Single with multiple apps selected
      // Keep first app, show warning toast
      const firstApp = selectedAppIds[0];
      const appName = availableApps.find(a => a.app_id === firstApp)?.app_name || firstApp;

      toast({
        title: 'Switched to Single App mode',
        description: `Now showing: ${appName}`,
      });

      onSelectionChange([firstApp]);
      setTempSelection([firstApp]);
      addRecentApp(firstApp);
    } else if (newMode === 'compare' && selectedAppIds.length === 1) {
      // Switching from Single to Compare
      // Keep current selection as starting point
      setTempSelection(selectedAppIds);
    }

    setMode(newMode);
    saveMode(newMode);
  };

  // Handle single app selection (immediate apply)
  const handleSingleSelect = (appId: string) => {
    console.log(`[APP-SELECTOR] Single mode: Selected "${appId}"`);
    onSelectionChange([appId]);
    addRecentApp(appId);
    setIsOpen(false); // Close dropdown immediately
  };

  // Handle compare mode checkbox toggle
  const handleCompareToggle = (appId: string) => {
    const newSelection = tempSelection.includes(appId)
      ? tempSelection.filter(id => id !== appId)
      : [...tempSelection, appId];

    setTempSelection(newSelection);
  };

  // Handle "All Apps" toggle in Compare mode
  const handleSelectAll = () => {
    const isAllSelected = tempSelection.length === availableApps.length;
    if (isAllSelected) {
      // Deselect all → keep only first app
      setTempSelection([availableApps[0]?.app_id]);
    } else {
      // Select all
      setTempSelection(availableApps.map(app => app.app_id));
    }
  };

  // Apply selection in Compare mode
  const handleApply = () => {
    if (tempSelection.length === 0) {
      toast({
        title: 'No apps selected',
        description: 'Please select at least one app.',
        variant: 'destructive',
      });
      return;
    }

    console.log(`[APP-SELECTOR] Compare mode: Applied ${tempSelection.length} apps`);
    onSelectionChange(tempSelection);

    // Add to recent apps (add first app only to avoid clutter)
    if (tempSelection.length > 0) {
      addRecentApp(tempSelection[0]);
    }

    setIsOpen(false);
  };

  // Cancel selection in Compare mode
  const handleCancel = () => {
    setTempSelection(selectedAppIds); // Revert to previous selection
    setIsOpen(false);
  };

  // Filter recent apps to only show available ones
  const validRecentApps = useMemo(() => {
    return recentApps.filter(appId =>
      availableApps.some(app => app.app_id === appId)
    );
  }, [recentApps, availableApps]);

  // Display text for button
  const isAllSelected = selectedAppIds.length === availableApps.length && availableApps.length > 0;
  const displayText = isAllSelected
    ? `All Apps (${availableApps.length})`
    : selectedAppIds.length === 1
    ? availableApps.find(a => a.app_id === selectedAppIds[0])?.app_name || selectedAppIds[0]
    : `${selectedAppIds.length} of ${availableApps.length}`;

  // Dismiss onboarding
  const dismissOnboarding = () => {
    setShowOnboarding(false);
    markOnboardingShown();
  };

  if (availableApps.length === 0) {
    return (
      <Button variant="outline" disabled size="sm">
        <Smartphone className="h-3.5 w-3.5 mr-2" />
        No apps available
      </Button>
    );
  }

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="min-w-[180px] justify-between"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5" />
              <span className="truncate">{displayText}</span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-[320px]" align="start">
          {/* Segmented Control for Mode Switching */}
          <div className="px-2 py-3">
            <SegmentedControl
              value={mode}
              onValueChange={(value) => handleModeChange(value as SelectorMode)}
              options={[
                { value: 'single', label: 'Single App' },
                { value: 'compare', label: 'Compare Apps' }
              ]}
              className="w-full"
            />
          </div>

          <DropdownMenuSeparator />

          {/* Single App Mode */}
          {mode === 'single' && (
            <>
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Select App</span>
                <Badge variant="secondary" className="ml-2">
                  {availableApps.length} available
                </Badge>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Recent Apps Section */}
              {validRecentApps.length > 0 && (
                <>
                  <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Star className="h-3 w-3" />
                    Recent
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={selectedAppIds[0] || ''}
                    onValueChange={handleSingleSelect}
                  >
                    {validRecentApps.slice(0, 5).map((appId) => {
                      const app = availableApps.find(a => a.app_id === appId);
                      if (!app) return null;

                      return (
                        <DropdownMenuRadioItem key={`recent-${appId}`} value={appId}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {app.app_name || app.app_id}
                            </span>
                            {app.app_name && app.app_name !== app.app_id && (
                              <span className="text-xs text-muted-foreground">
                                {app.app_id}
                              </span>
                            )}
                          </div>
                        </DropdownMenuRadioItem>
                      );
                    })}
                  </DropdownMenuRadioGroup>

                  <DropdownMenuSeparator />
                </>
              )}

              {/* All Apps Section */}
              <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Smartphone className="h-3 w-3" />
                All Apps
              </DropdownMenuLabel>
              <div className="max-h-[300px] overflow-y-auto">
                <DropdownMenuRadioGroup
                  value={selectedAppIds[0] || ''}
                  onValueChange={handleSingleSelect}
                >
                  {availableApps.map((app) => (
                    <DropdownMenuRadioItem key={app.app_id} value={app.app_id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {app.app_name || app.app_id}
                        </span>
                        {app.app_name && app.app_name !== app.app_id && (
                          <span className="text-xs text-muted-foreground">
                            {app.app_id}
                          </span>
                        )}
                      </div>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </div>
            </>
          )}

          {/* Compare Apps Mode */}
          {mode === 'compare' && (
            <>
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Compare Apps</span>
                <Badge variant="secondary" className="ml-2">
                  {tempSelection.length}/{availableApps.length}
                </Badge>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Select All */}
              <DropdownMenuCheckboxItem
                checked={tempSelection.length === availableApps.length}
                onCheckedChange={handleSelectAll}
                className="font-medium"
              >
                All Apps
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />

              {/* Individual Apps */}
              <div className="max-h-[300px] overflow-y-auto">
                {availableApps.map((app) => (
                  <DropdownMenuCheckboxItem
                    key={app.app_id}
                    checked={tempSelection.includes(app.app_id)}
                    onCheckedChange={() => handleCompareToggle(app.app_id)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {app.app_name || app.app_id}
                      </span>
                      {app.app_name && app.app_name !== app.app_id && (
                        <span className="text-xs text-muted-foreground">
                          {app.app_id}
                        </span>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </div>

              <DropdownMenuSeparator />

              {/* Apply/Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 px-2 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApply}
                  disabled={tempSelection.length === 0}
                  className="h-8 bg-yodel-orange hover:bg-yodel-orange/90"
                >
                  Apply Changes
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Onboarding Tooltip */}
      {showOnboarding && (
        <div className="absolute top-full left-0 mt-2 w-[320px] z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yodel-orange/10 flex items-center justify-center">
                <span className="text-lg">💡</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 mb-1">
                  New App Selector
                </p>
                <p className="text-xs text-zinc-400">
                  Use <span className="font-semibold text-zinc-200">Single App</span> for focused analysis,{' '}
                  <span className="font-semibold text-zinc-200">Compare Apps</span> to benchmark multiple apps.
                </p>
              </div>
              <button
                onClick={dismissOnboarding}
                className="flex-shrink-0 text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
