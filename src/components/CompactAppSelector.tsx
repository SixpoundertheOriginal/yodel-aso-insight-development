import { ChevronDown, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

/**
 * Compact App Selector Component
 *
 * Space-efficient dropdown for app selection with multi-select support.
 * Replaces the large slider-based picker with a compact dropdown.
 *
 * Features:
 * - Multi-select with checkboxes
 * - "All Apps" option
 * - Displays count (e.g., "3 of 8")
 * - Shows app names and IDs
 * - Data availability indicators
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

export function CompactAppSelector({
  availableApps = [],
  selectedAppIds = [],
  onSelectionChange,
  isLoading = false
}: CompactAppSelectorProps) {

  const isAllSelected = selectedAppIds.length === availableApps.length && availableApps.length > 0;

  const displayText = isAllSelected
    ? `All Apps (${availableApps.length})`
    : selectedAppIds.length === 1
    ? availableApps.find(a => a.app_id === selectedAppIds[0])?.app_name || selectedAppIds[0]
    : `${selectedAppIds.length} of ${availableApps.length}`;

  const handleToggleApp = (appId: string) => {
    const newSelection = selectedAppIds.includes(appId)
      ? selectedAppIds.filter(id => id !== appId)
      : [...selectedAppIds, appId];

    // Keep at least one app selected
    onSelectionChange(newSelection.length > 0 ? newSelection : [availableApps[0]?.app_id]);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all → keep only first app
      onSelectionChange([availableApps[0]?.app_id]);
    } else {
      // Select all
      onSelectionChange(availableApps.map(app => app.app_id));
    }
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
    <DropdownMenu>
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

      <DropdownMenuContent className="w-[280px]" align="start">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Select Apps</span>
          <Badge variant="secondary" className="ml-2">
            {selectedAppIds.length}/{availableApps.length}
          </Badge>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Select All */}
        <DropdownMenuCheckboxItem
          checked={isAllSelected}
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
              checked={selectedAppIds.includes(app.app_id)}
              onCheckedChange={() => handleToggleApp(app.app_id)}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
