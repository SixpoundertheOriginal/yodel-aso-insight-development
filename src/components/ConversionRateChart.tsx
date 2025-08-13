import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ProcessedTrafficSource, CVRType } from '@/utils/processTrafficSourceCVR';

interface Props {
  data: ProcessedTrafficSource[];
  cvrType: CVRType;
}

export const ConversionRateChart: React.FC<Props> = ({ data, cvrType }) => {
  const chartTitle =
    cvrType === 'impression'
      ? 'Impression Conversion Rate by Traffic Source'
      : 'Product Page Conversion Rate by Traffic Source';

  const chartSubtitle =
    cvrType === 'impression'
      ? 'Downloads ÷ impressions for each traffic source'
      : 'Downloads ÷ product page views for each traffic source';

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-md p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100">{chartTitle}</h3>
        <p className="text-sm text-gray-400">{chartSubtitle}</p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="displayName"
            tick={{ fill: '#D1D5DB', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={80}
          />
          <YAxis
            tick={{ fill: '#D1D5DB', fontSize: 12 }}
            label={{
              value: `${cvrType === 'impression' ? 'Impression' : 'Product Page'} CVR (%)`,
              angle: -90,
              position: 'insideLeft',
            }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.375rem' }}
            formatter={(value, _name, entry: any) => [`${(value as number).toFixed(1)}%`, entry.payload.cvrLabel]}
            labelFormatter={(label) => label as string}
            labelStyle={{ color: '#F9FAFB' }}
          />
          <Bar dataKey="cvr" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ConversionRateChart;

