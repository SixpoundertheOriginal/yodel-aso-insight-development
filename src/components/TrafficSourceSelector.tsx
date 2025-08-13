import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface TrafficSourceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  selectedSources: string[];
  onSelectedSourcesChange: (sources: string[]) => void;
  availableSources: string[];
  className?: string;
}

const TRAFFIC_SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'organic', label: 'Organic Sources' },
  { value: 'paid', label: 'Paid Sources' },
  { value: 'individual', label: 'Individual Sources' },
];

export const TrafficSourceSelector: React.FC<TrafficSourceSelectorProps> = ({
  value,
  onChange,
  selectedSources,
  onSelectedSourcesChange,
  availableSources,
  className = '',
}) => {
  const allSelected = selectedSources.length === availableSources.length;

  const toggleSource = (source: string) => {
    if (selectedSources.includes(source)) {
      onSelectedSourcesChange(selectedSources.filter((s) => s !== source));
    } else {
      onSelectedSourcesChange([...selectedSources, source]);
    }
  };

  const summaryText = allSelected
    ? 'All Selected'
    : selectedSources.length === 0
    ? 'None Selected'
    : selectedSources.join(', ');

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48 h-8 bg-zinc-800 border-zinc-700 text-foreground">
          <SelectValue placeholder="Select Source" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          {TRAFFIC_SOURCE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-foreground hover:bg-zinc-700">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value === 'individual' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 bg-zinc-800 border-zinc-700 text-foreground">
              {summaryText}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="bg-zinc-800 border-zinc-700 p-2 w-56">
            {availableSources.map((source) => (
              <label key={source} className="flex items-center space-x-2 p-1">
                <Checkbox
                  checked={selectedSources.includes(source)}
                  onCheckedChange={() => toggleSource(source)}
                  className="border-zinc-600 data-[state=checked]:bg-yodel-orange data-[state=checked]:border-yodel-orange"
                />
                <span className="text-sm text-foreground">{source}</span>
              </label>
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default TrafficSourceSelector;
