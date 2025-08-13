import React from 'react';
import type { ProcessedTrafficSource } from '@/utils/processTrafficSourceCVR';

interface Props {
  data: ProcessedTrafficSource;
}

export const TrafficSourceCVRCard: React.FC<Props> = ({ data }) => {
  const {
    displayName,
    cvr,
    cvrLabel,
    formula,
    impressions,
    downloads,
    productPageViews,
    denominator,
    color,
  } = data;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-md shadow-md overflow-hidden" data-testid={`traffic-source-card-${displayName}`}>
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-100">{displayName}</h4>
        </div>
        <div className="text-2xl font-bold text-gray-100">{cvr.toFixed(1)}%</div>
        <div className="text-xs text-gray-400">{cvrLabel}</div>
        <div className="text-xs text-gray-400">{formula}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>
            <span className="block text-gray-300">{impressions.toLocaleString()}</span>
            <span>Impressions</span>
          </div>
          <div>
            <span className="block text-gray-300">{downloads.toLocaleString()}</span>
            <span>Downloads</span>
          </div>
          {productPageViews > 0 && (
            <div>
              <span className="block text-gray-300">{productPageViews.toLocaleString()}</span>
              <span>Page Views</span>
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {downloads.toLocaleString()} ÷ {denominator.toLocaleString()} = {cvr.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export default TrafficSourceCVRCard;

