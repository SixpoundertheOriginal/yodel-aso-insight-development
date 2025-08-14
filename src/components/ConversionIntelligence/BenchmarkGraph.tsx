import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { BarChart3 as ChartBarIcon } from 'lucide-react';
import { BenchmarkMetric, GraphDataPoint } from '@/hooks/useBigQueryData';

interface BenchmarkGraphProps {
  data: GraphDataPoint[];
  selectedMetric: BenchmarkMetric;
  loading: boolean;
  dateRange: { startDate: string; endDate: string };
  height?: number;
}

const BenchmarkGraph: React.FC<BenchmarkGraphProps> = ({
  data,
  selectedMetric,
  loading,
  dateRange,
  height = 400
}) => {
  const chartConfig = useMemo(() => ({
    data: data,
    margin: { top: 20, right: 30, left: 40, bottom: 60 },
    height: height,
    colors: {
      current: '#3B82F6',
      benchmark: '#9CA3AF',
      industryAverage: '#10B981'
    }
  }), [data, height]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-sm text-gray-500">Loading {selectedMetric.name} data...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-500">
          <ChartBarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <div>No data available for selected period</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedMetric.name} Trends
          </h3>
          <div className="text-sm text-gray-500">
            {dateRange.startDate} to {dateRange.endDate}
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            Your Performance
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400 rounded mr-2"></div>
            Industry Benchmark
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            Industry Average
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartConfig.data} margin={chartConfig.margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          />
          <YAxis
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `${value.toFixed(1)}${selectedMetric.unit}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}${selectedMetric.unit}`,
              name === 'current' ? 'Your Performance' :
              name === 'benchmark' ? 'Industry Benchmark' : 'Industry Average'
            ]}
            labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          />
          <Line
            type="monotone"
            dataKey="current"
            stroke={chartConfig.colors.current}
            strokeWidth={2}
            dot={{ fill: chartConfig.colors.current, r: 4 }}
            activeDot={{ r: 6, stroke: chartConfig.colors.current, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke={chartConfig.colors.benchmark}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: chartConfig.colors.benchmark, r: 3 }}
          />
          {data.some(d => d.industryAverage) && (
            <Line
              type="monotone"
              dataKey="industryAverage"
              stroke={chartConfig.colors.industryAverage}
              strokeWidth={1}
              strokeDasharray="2 2"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BenchmarkGraph;
