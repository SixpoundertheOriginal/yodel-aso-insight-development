import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MetricOption {
  value: string;
  label: string;
  description: string;
}

interface MetricSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  { value: 'downloads', label: 'Downloads', description: 'App installs and downloads' },
  { value: 'impressions', label: 'Impressions', description: 'Times your app was seen' },
  { value: 'product_page_views', label: 'Product Page Views', description: 'App store page visits' }
];

export const MetricSelector: React.FC<MetricSelectorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const selectedOption = METRIC_OPTIONS.find(option => option.value === value);

  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Compare Metric
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48">
          <SelectValue>
            {selectedOption?.label || 'Select metric...'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {METRIC_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default MetricSelector;
