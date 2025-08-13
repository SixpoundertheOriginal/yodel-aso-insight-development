import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TrafficSourceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const TRAFFIC_SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'individual', label: 'Individual Sources' },
  { value: 'organic', label: 'Organic Sources' },
  { value: 'paid', label: 'Paid Sources' },
  { value: 'external', label: 'External Sources' },
];

export const TrafficSourceSelector: React.FC<TrafficSourceSelectorProps> = ({ value, onChange, className = '' }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className={`w-48 h-8 bg-zinc-800 border-zinc-700 text-foreground ${className}`}>
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
);

export default TrafficSourceSelector;
