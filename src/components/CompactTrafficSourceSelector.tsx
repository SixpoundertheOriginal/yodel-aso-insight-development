import { useMemo } from 'react';
import { ChevronDown, Signal } from 'lucide-react';
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
 * Compact Traffic Source Selector Component
 *
 * Space-efficient dropdown for traffic source filtering with multi-select support.
 * Replaces the large slider-based picker with a compact dropdown.
 *
 * Features:
 * - Multi-select with checkboxes
 * - "All Sources" option (empty array)
 * - Data availability indicators
 * - Displays count (e.g., "2 sources")
 * - Disabled state for sources with no data
 */

interface CompactTrafficSourceSelectorProps {
  availableTrafficSources: string[];
  selectedSources: string[];
  onSelectionChange: (sources: string[]) => void;
  isLoading?: boolean;
}

const TRAFFIC_SOURCE_LABELS: Record<string, string> = {
  'Apple_Search_Ads': 'Apple Search Ads',
  'App_Store_Browse': 'App Store Browse',
  'App_Store_Search': 'App Store Search',
  'App_Referrer': 'App Referrer',
  'Web_Referrer': 'Web Referrer',
  'Event_Notification': 'Event Notification',
  'Institutional_Purchase': 'Institutional Purchase',
  'Unavailable': 'Unavailable'
};

const ALL_TRAFFIC_SOURCES = Object.keys(TRAFFIC_SOURCE_LABELS);

export function CompactTrafficSourceSelector({
  availableTrafficSources = [],
  selectedSources = [],
  onSelectionChange,
  isLoading = false
}: CompactTrafficSourceSelectorProps) {

  const trafficSources = useMemo(() => {
    return ALL_TRAFFIC_SOURCES.map(source => ({
      source,
      displayName: TRAFFIC_SOURCE_LABELS[source] || source,
      hasData: availableTrafficSources.includes(source)
    }));
  }, [availableTrafficSources]);

  const availableCount = trafficSources.filter(s => s.hasData).length;
  const isAllSelected = selectedSources.length === 0;

  const displayText = isAllSelected
    ? `All Sources (${availableCount})`
    : selectedSources.length === 1
    ? TRAFFIC_SOURCE_LABELS[selectedSources[0]] || selectedSources[0]
    : `${selectedSources.length} sources`;

  const handleToggleSource = (source: string) => {
    if (isAllSelected) {
      // Was "All", now select just this one
      onSelectionChange([source]);
    } else {
      const newSelection = selectedSources.includes(source)
        ? selectedSources.filter(s => s !== source)
        : [...selectedSources, source];

      onSelectionChange(newSelection);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange([]); // Empty array = all sources
  };

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
            <Signal className="h-3.5 w-3.5" />
            <span className="truncate">{displayText}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[280px]" align="start">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Traffic Sources</span>
          <Badge variant="secondary" className="ml-2">
            {availableCount} available
          </Badge>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Select All */}
        <DropdownMenuCheckboxItem
          checked={isAllSelected}
          onCheckedChange={handleSelectAll}
          className="font-medium"
        >
          All Sources
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Individual Sources */}
        <div className="max-h-[300px] overflow-y-auto">
          {trafficSources.map((ts) => (
            <DropdownMenuCheckboxItem
              key={ts.source}
              checked={!isAllSelected && selectedSources.includes(ts.source)}
              onCheckedChange={() => ts.hasData && handleToggleSource(ts.source)}
              disabled={!ts.hasData}
              className={cn(!ts.hasData && "opacity-50")}
            >
              <div className="flex items-center justify-between w-full">
                <span>{ts.displayName}</span>
                {ts.hasData ? (
                  <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400">
                    Has data
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No data
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
