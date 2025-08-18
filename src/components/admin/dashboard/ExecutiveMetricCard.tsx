import React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface ExecutiveMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  details?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'excellent' | 'good' | 'warning' | 'critical';
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const ExecutiveMetricCard: React.FC<ExecutiveMetricCardProps> = ({
  title,
  value,
  subtitle,
  details,
  trend,
  status,
  icon: IconComponent,
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-400';
      case 'good':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-gray-300';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {IconComponent && <IconComponent className="w-4 h-4 text-gray-400" />}
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              {title}
            </h3>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold ${getStatusColor(status)}`}>{value}</div>
            {subtitle && (
              <p className="text-sm text-gray-300 mt-1">{subtitle}</p>
            )}
            {details && (
              <p className="text-xs text-gray-500 mt-1">{details}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">{getTrendIcon(trend)}</div>
      </div>
    </div>
  );
};

export default ExecutiveMetricCard;
