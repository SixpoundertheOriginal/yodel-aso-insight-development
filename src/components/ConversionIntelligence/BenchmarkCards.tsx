import React, { useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import { BenchmarkMetric } from '@/hooks/useBigQueryData';

interface BenchmarkCardProps {
  metric: BenchmarkMetric;
  isSelected: boolean;
  onClick: (metricId: BenchmarkMetric['id']) => void;
  loading?: boolean;
  disabled?: boolean;
}

const BenchmarkCard: React.FC<BenchmarkCardProps> = ({
  metric,
  isSelected,
  onClick,
  loading = false,
  disabled = false
}) => {
  const handleCardClick = useCallback(() => {
    if (!loading && !disabled) {
      onClick(metric.id);
    }
  }, [metric.id, onClick, loading, disabled]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  }, [handleCardClick]);

  return (
    <div
      className={`
        benchmark-card relative cursor-pointer transition-all duration-200 ease-in-out
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
        ${loading ? 'pointer-events-none opacity-60' : ''}
        ${disabled ? 'pointer-events-none opacity-40' : ''}
        border rounded-lg p-4 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500
      `}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-label={`Select ${metric.name} for benchmark analysis`}
      aria-describedby={`${metric.id}-description`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">
          {metric.name}
        </h3>
        <div className={`text-xs px-2 py-1 rounded ${
          metric.currentValue > metric.benchmarkValue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {metric.currentValue > metric.benchmarkValue ? 'Above' : 'Below'} Benchmark
        </div>
      </div>

      <div className="mb-2">
        <div className="text-2xl font-bold text-gray-900">
          {metric.currentValue.toFixed(1)}{metric.unit}
        </div>
        <div className="text-xs text-gray-500">Current Performance</div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Industry Avg:</span>
          <span className="font-medium">
            {metric.benchmarkValue.toFixed(1)}{metric.unit}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Trend:</span>
          <span className={`font-medium flex items-center ${
            metric.trend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {metric.trend >= 0 ? '↗' : '↘'} {Math.abs(metric.trend).toFixed(1)}%
          </span>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div id={`${metric.id}-description`} className="sr-only">
        {metric.description}
      </div>
    </div>
  );
};

const BenchmarkCards: React.FC<{
  metrics: BenchmarkMetric[];
  selectedMetric: BenchmarkMetric['id'];
  onMetricSelect: (metricId: BenchmarkMetric['id']) => void;
  loading?: boolean;
}> = ({ metrics, selectedMetric, onMetricSelect, loading = false }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => (
        <BenchmarkCard
          key={metric.id}
          metric={metric}
          isSelected={selectedMetric === metric.id}
          onClick={onMetricSelect}
          loading={loading}
        />
      ))}
    </div>
  );
};

export default BenchmarkCards;
