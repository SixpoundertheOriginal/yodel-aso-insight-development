import React from 'react';

interface ExecutiveMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  details?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'excellent' | 'good' | 'warning' | 'critical';
}

export const ExecutiveMetricCard: React.FC<ExecutiveMetricCardProps> = ({
  title,
  value,
  subtitle,
  details,
  trend,
  status,
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'stable':
        return '→';
      default:
        return '';
    }
  };

  return (
    <div className="executive-metric-card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {title}
          </h3>
          <div className="mt-2">
            <div className={`text-2xl font-bold ${getStatusColor(status)}`}>{value}</div>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{subtitle}</p>
            )}
            {details && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{details}</p>
            )}
          </div>
        </div>
        {trend && <div className="text-lg">{getTrendIcon(trend)}</div>}
      </div>
    </div>
  );
};

export default ExecutiveMetricCard;
