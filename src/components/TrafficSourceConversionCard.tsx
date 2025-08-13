import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import DeltaIndicator from '@/components/ui/DeltaIndicator';
import { getTrafficSourceColor } from '@/utils/trafficSourceColors';
import type { TrafficSource } from '@/hooks/useMockAsoData';

interface Props {
  source: TrafficSource;
}

const formatNumber = (num: number): string => num.toLocaleString();

const calculateCVR = (impressions: number, downloads: number, views: number): number => {
  if (views > 0) return (downloads / views) * 100;
  if (impressions > 0) return (downloads / impressions) * 100;
  return 0;
};

export const TrafficSourceConversionCard: React.FC<Props> = ({ source }) => {
  const impressions = source.metrics.impressions.value;
  const downloads = source.metrics.downloads.value;
  const views = source.metrics.product_page_views.value;
  const cvr = calculateCVR(impressions, downloads, views);
  const delta = views > 0 ? source.metrics.product_page_cvr.delta : source.metrics.impressions_cvr.delta;
  const cardColor = getTrafficSourceColor(source.name);

  return (
    <Card
      className="bg-zinc-900 border border-zinc-700 rounded-md shadow-md"
      style={{ borderLeft: `4px solid ${cardColor}` }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-100">{source.name}</h3>
          <DeltaIndicator value={delta} />
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-100">
          {cvr.toFixed(1)}%
        </div>
        <div className="text-xs text-gray-400">Conversion Rate</div>
        <div className="mt-2 text-xs text-gray-400">
          {formatNumber(impressions)} impressions<br />
          {formatNumber(downloads)} downloads
        </div>
      </CardContent>
    </Card>
  );
};

export default TrafficSourceConversionCard;

