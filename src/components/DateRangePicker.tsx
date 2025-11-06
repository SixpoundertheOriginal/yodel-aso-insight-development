import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Date Range Picker Component
 *
 * Professional date range selector with:
 * - Common presets (Last 7/30/90 days, This/Last month)
 * - Custom range selection with dual calendars
 * - Auto-refetch when range changes
 *
 * @example
 * const [dateRange, setDateRange] = useState({
 *   start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
 *   end: format(new Date(), 'yyyy-MM-dd')
 * });
 *
 * <DateRangePicker
 *   dateRange={dateRange}
 *   onDateRangeChange={setDateRange}
 * />
 */

interface DateRange {
  start: string; // ISO format: 'YYYY-MM-DD'
  end: string;   // ISO format: 'YYYY-MM-DD'
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
}

const presets = [
  {
    label: 'Last 7 days',
    getValue: () => ({
      start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Last 90 days',
    getValue: () => ({
      start: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    })
  },
  {
    label: 'This month',
    getValue: () => ({
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Last month',
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      };
    }
  }
];

export function DateRangePicker({ dateRange, onDateRangeChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    console.log('📅 [DatePicker] Preset selected:', preset.label, range);
    onDateRangeChange(range);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const range = {
        start: format(customStart, 'yyyy-MM-dd'),
        end: format(customEnd, 'yyyy-MM-dd')
      };
      console.log('📅 [DatePicker] Custom range applied:', range);
      onDateRangeChange(range);
      setIsOpen(false);
      setCustomStart(undefined);
      setCustomEnd(undefined);
    }
  };

  const handleClear = () => {
    setCustomStart(undefined);
    setCustomEnd(undefined);
  };

  // Format display text in a user-friendly way
  const formatDisplayDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const displayText = `${formatDisplayDate(dateRange.start)} - ${formatDisplayDate(dateRange.end)}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal bg-zinc-900 border-zinc-800 hover:bg-zinc-800',
            !dateRange && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="text-zinc-200">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-zinc-900 border-zinc-800"
        align="start"
        side="bottom"
      >
        <div className="flex">
          {/* Presets Sidebar */}
          <div className="flex flex-col gap-1 border-r border-zinc-800 p-3 bg-zinc-900/50">
            <div className="text-sm font-medium mb-2 text-zinc-300">Quick Select</div>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Range Calendars */}
          <div className="p-4 bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-zinc-300">Custom Range</div>
              {(customStart || customEnd) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-6 px-2 text-xs hover:bg-zinc-800"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex gap-4">
              {/* Start Date Calendar */}
              <div>
                <div className="text-xs text-zinc-400 mb-2">Start Date</div>
                <Calendar
                  mode="single"
                  selected={customStart}
                  onSelect={setCustomStart}
                  className="bg-zinc-900 border border-zinc-800 rounded-md"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center text-zinc-300",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-zinc-400 rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-zinc-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-zinc-800 rounded-md text-zinc-300",
                    day_selected: "bg-yodel-orange text-zinc-900 hover:bg-yodel-orange hover:text-zinc-900 focus:bg-yodel-orange focus:text-zinc-900",
                    day_today: "bg-zinc-800 text-zinc-100",
                    day_outside: "text-zinc-600 opacity-50",
                    day_disabled: "text-zinc-600 opacity-50",
                    day_range_middle: "aria-selected:bg-zinc-800 aria-selected:text-zinc-100",
                    day_hidden: "invisible",
                  }}
                />
              </div>

              {/* End Date Calendar */}
              <div>
                <div className="text-xs text-zinc-400 mb-2">End Date</div>
                <Calendar
                  mode="single"
                  selected={customEnd}
                  onSelect={setCustomEnd}
                  disabled={(date) => (customStart ? date < customStart : false)}
                  className="bg-zinc-900 border border-zinc-800 rounded-md"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center text-zinc-300",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-zinc-400 rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-zinc-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-zinc-800 rounded-md text-zinc-300",
                    day_selected: "bg-yodel-orange text-zinc-900 hover:bg-yodel-orange hover:text-zinc-900 focus:bg-yodel-orange focus:text-zinc-900",
                    day_today: "bg-zinc-800 text-zinc-100",
                    day_outside: "text-zinc-600 opacity-50",
                    day_disabled: "text-zinc-600 opacity-50",
                    day_range_middle: "aria-selected:bg-zinc-800 aria-selected:text-zinc-100",
                    day_hidden: "invisible",
                  }}
                />
              </div>
            </div>

            {/* Apply Button */}
            <div className="mt-4">
              <Button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="w-full bg-yodel-orange hover:bg-orange-600 text-zinc-900"
                size="sm"
              >
                Apply Custom Range
              </Button>
              {customStart && customEnd && (
                <p className="text-xs text-zinc-400 mt-2 text-center">
                  {format(customStart, 'MMM dd, yyyy')} - {format(customEnd, 'MMM dd, yyyy')}
                </p>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
