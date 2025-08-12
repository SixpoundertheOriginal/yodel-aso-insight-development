import React from 'react';
import { ChevronRight } from 'lucide-react';
import DeltaIndicator from './ui/DeltaIndicator';
import { getTrafficSourceColor } from '@/utils/trafficSourceColors';

interface TrafficSourceCardProps {
  source: {
    name: string;
    displayName?: string;
    downloads: number;
    delta: number;
  };
  quadrant: 'scale' | 'optimize' | 'investigate' | 'expand';
}

const formatNumber = (num: number): string => num.toLocaleString();

export const TrafficSourceCard: React.FC<TrafficSourceCardProps> = ({ source }) => {
  const cardColor = getTrafficSourceColor(source.name);

  return (
    <div
      className="group bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer"
      style={{ borderLeft: `4px solid ${cardColor}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">
            {source.displayName || source.name}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-500">
          Downloads: {formatNumber(source.downloads)}
        </span>
        <DeltaIndicator value={source.delta} />
      </div>
    </div>
  );
};

export default TrafficSourceCard;
