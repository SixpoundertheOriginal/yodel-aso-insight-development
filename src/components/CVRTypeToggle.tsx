import React from 'react';
import { Info } from 'lucide-react';
import type { CVRType } from '@/utils/processTrafficSourceCVR';

interface CVRTypeToggleProps {
  currentType: CVRType;
  onTypeChange: (type: CVRType) => void;
}

export const CVRTypeToggle: React.FC<CVRTypeToggleProps> = ({ currentType, onTypeChange }) => {
  const cvrTypes: { id: CVRType; label: string; description: string; tooltip: string }[] = [
    {
      id: 'impression',
      label: 'Impression CVR',
      description: 'Downloads ÷ Impressions',
      tooltip: 'Overall listing performance - how many people who see your app actually download it'
    },
    {
      id: 'productpage',
      label: 'Product Page CVR',
      description: 'Downloads ÷ Product Page Views',
      tooltip: 'Page conversion performance - how many people who visit your app page download it'
    }
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-100">Conversion Rate Type</h4>
        <div className="flex items-center text-gray-400 text-sm">
          <Info className="w-4 h-4 mr-1" />
          <span>Choose conversion rate calculation method</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {cvrTypes.map((type) => (
          <button
            key={type.id}
            className={`p-4 rounded-md border-2 transition-colors text-left ${
              currentType === type.id
                ? 'bg-emerald-800 border-emerald-600'
                : 'bg-zinc-800 border-transparent hover:border-zinc-500'
            }`}
            onClick={() => onTypeChange(type.id)}
            title={type.tooltip}
          >
            <span className="block font-semibold text-gray-100">{type.label}</span>
            <span className="block text-sm text-gray-400">{type.description}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-700 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">Impression CVR:</span>
          <span className="text-gray-400">Typical range 5-15%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Product Page CVR:</span>
          <span className="text-gray-400">Typical range 15-40%</span>
        </div>
      </div>
    </div>
  );
};

export default CVRTypeToggle;

