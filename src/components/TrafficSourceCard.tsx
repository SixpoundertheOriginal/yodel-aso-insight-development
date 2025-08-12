import React from 'react';
import { ChevronRight } from 'lucide-react';
import DeltaIndicator from './ui/DeltaIndicator';

interface TrafficSourceCardProps {
  source: {
    name: string;
    displayName?: string;
    downloads: number;
    delta: number;
  };
  quadrant: 'scale' | 'optimize' | 'investigate' | 'expand';
}

const colorMap: Record<string, string> = {
  'App Store Search': 'bg-blue-500',
  'App Store Browse': 'bg-green-500',
  'Web Referrer': 'bg-purple-500',
  'Apple Search Ads': 'bg-yellow-500',
  'App Referrer': 'bg-red-500',
};

const getSourceColor = (name: string) => colorMap[name] || 'bg-gray-400';

const formatNumber = (num: number): string => num.toLocaleString();

export const TrafficSourceCard: React.FC<TrafficSourceCardProps> = ({ source }) => {
  return (
    <div className="group bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getSourceColor(source.name)}`}></div>
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
