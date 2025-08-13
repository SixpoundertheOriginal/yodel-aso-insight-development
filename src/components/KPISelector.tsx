import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface KPIOption {
  id: string;
  label: string;
  description: string;
}

export const KPI_OPTIONS: KPIOption[] = [
  { id: 'all', label: 'All KPIs', description: 'Show all performance metrics' },
  { id: 'impressions', label: 'Impressions', description: 'Times your app appeared in search results' },
  { id: 'downloads', label: 'Downloads', description: 'Total app installations from the App Store' },
  { id: 'product_page_views', label: 'Product Page Views', description: "Users who viewed your app's store page" },
  { id: 'product_page_cvr', label: 'Product Page CVR', description: 'Conversion rate from page view to download' },
  { id: 'impressions_cvr', label: 'Impressions CVR', description: 'Conversion rate from impression to download' },
];

interface KPISelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  includeAllOption?: boolean;
}

export const KPISelector: React.FC<KPISelectorProps> = ({ value, onChange, className = '', includeAllOption = true }) => {
  const options = includeAllOption
    ? KPI_OPTIONS
    : KPI_OPTIONS.filter((option) => option.id !== 'all');
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-48 h-8 bg-zinc-800 border-zinc-700 text-foreground ${className}`}>
        <SelectValue placeholder="Select KPI" />
      </SelectTrigger>
      <SelectContent className="bg-zinc-800 border-zinc-700">
        {options.map((option) => (
          <SelectItem
            key={option.id}
            value={option.id}
            className="text-foreground hover:bg-zinc-700"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default KPISelector;

