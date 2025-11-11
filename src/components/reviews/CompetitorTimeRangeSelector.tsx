/**
 * COMPETITOR TIME RANGE SELECTOR
 *
 * Global time range control for all competitor analysis charts
 * Syncs with useCompetitorChartFilters store
 */

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCompetitorChartFilters, TimeRange } from '@/hooks/useCompetitorChartFilters';

interface CompetitorTimeRangeSelectorProps {
  className?: string;
  showLabel?: boolean;
}

const TIME_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days', description: 'Recent short-term trends' },
  { value: '30d', label: 'Last 30 days', description: 'Monthly performance snapshot' },
  { value: '90d', label: 'Last 90 days', description: 'Quarterly trends and patterns' },
  { value: '1y', label: 'Last year', description: 'Annual performance overview' },
  { value: 'all', label: 'All time', description: 'Up to 2 years of historical data' },
  { value: 'custom', label: 'Custom range', description: 'Select specific date range' },
];

export const CompetitorTimeRangeSelector: React.FC<CompetitorTimeRangeSelectorProps> = ({
  className,
  showLabel = true,
}) => {
  const {
    timeRange,
    customStartDate,
    customEndDate,
    setTimeRange,
    setCustomDateRange,
  } = useCompetitorChartFilters();

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(
    customStartDate ? new Date(customStartDate) : undefined
  );
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(
    customEndDate ? new Date(customEndDate) : undefined
  );

  const handleTimeRangeChange = (value: TimeRange) => {
    if (value === 'custom') {
      setIsCustomOpen(true);
    } else {
      setTimeRange(value);
    }
  };

  const handleApplyCustomRange = () => {
    if (tempStartDate && tempEndDate) {
      setCustomDateRange(
        tempStartDate.toISOString(),
        tempEndDate.toISOString()
      );
      setIsCustomOpen(false);
    }
  };

  const handleCancelCustomRange = () => {
    setIsCustomOpen(false);
    // Reset to previous custom dates or clear
    setTempStartDate(customStartDate ? new Date(customStartDate) : undefined);
    setTempEndDate(customEndDate ? new Date(customEndDate) : undefined);
  };

  const currentOption = TIME_RANGE_OPTIONS.find(opt => opt.value === timeRange);
  const isCustomRange = timeRange === 'custom';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showLabel && (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Range</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Applies to all charts below. Historical data is aggregated from daily snapshots.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <Select value={timeRange} onValueChange={handleTimeRangeChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          {TIME_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom Date Range Popover */}
      {isCustomRange && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal',
                !customStartDate && !customEndDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customStartDate && customEndDate ? (
                <>
                  {format(new Date(customStartDate), 'MMM d, yyyy')} -{' '}
                  {format(new Date(customEndDate), 'MMM d, yyyy')}
                </>
              ) : (
                <span>Pick date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              {/* Start Date */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Start Date
                </label>
                <Calendar
                  mode="single"
                  selected={tempStartDate}
                  onSelect={setTempStartDate}
                  disabled={(date) =>
                    date > new Date() || (tempEndDate ? date > tempEndDate : false)
                  }
                  initialFocus
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  End Date
                </label>
                <Calendar
                  mode="single"
                  selected={tempEndDate}
                  onSelect={setTempEndDate}
                  disabled={(date) =>
                    date > new Date() || (tempStartDate ? date < tempStartDate : false)
                  }
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelCustomRange}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyCustomRange}
                  disabled={!tempStartDate || !tempEndDate}
                  className="flex-1"
                >
                  Apply Range
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Current Selection Info */}
      {currentOption && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-muted-foreground hidden sm:block">
                {currentOption.description}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Data shown: {currentOption.description}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
