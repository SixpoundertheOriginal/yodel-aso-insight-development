import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

interface InsightCardProps {
  title: string;
  subtitle: string;
  preview: string;
  href: string;
  icon: LucideIcon;
  type?:
    | 'traffic-performance'
    | 'anomaly-detection'
    | 'correlations'
    | 'efficiency'
    | 'patterns'
    | string;
  status?: 'optimization-needed' | 'critical' | 'healthy' | string;
  metrics?: {
    scale: number;
    optimize: number;
    investigate: number;
    expand: number;
  };
}

const getIconBackground = (type?: string) => {
  switch (type) {
    case 'traffic-performance':
      return 'bg-orange-500/20';
    case 'anomaly-detection':
      return 'bg-red-500/20';
    case 'correlations':
      return 'bg-blue-500/20';
    case 'efficiency':
      return 'bg-green-500/20';
    case 'patterns':
      return 'bg-purple-500/20';
    default:
      return 'bg-gray-500/20';
  }
};

const getIconColor = (type?: string) => {
  switch (type) {
    case 'traffic-performance':
      return 'text-orange-400';
    case 'anomaly-detection':
      return 'text-red-400';
    case 'correlations':
      return 'text-blue-400';
    case 'efficiency':
      return 'text-green-400';
    case 'patterns':
      return 'text-purple-400';
    default:
      return 'text-gray-400';
  }
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'critical':
      return 'bg-red-500 text-white';
    case 'optimization-needed':
      return 'bg-orange-500 text-white';
    case 'healthy':
      return 'bg-green-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const InsightCard: React.FC<InsightCardProps> = ({
  title,
  subtitle,
  preview,
  href,
  icon: Icon,
  status,
  metrics,
  type,
}) => {
  return (
    <Link
      to={href}
      className={`group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-orange-500 rounded-xl p-6 transition-all duration-200 cursor-pointer transform hover:scale-105 ${
        status === 'critical' ? 'border-red-500/50 bg-red-900/10' : ''
      } ${
        status === 'optimization-needed'
          ? 'border-orange-500/50 bg-orange-900/10'
          : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${getIconBackground(type)}`}>
            <Icon className={`h-6 w-6 ${getIconColor(type)}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors">
              {title}
            </h3>
            <p className="text-gray-400 text-sm">{subtitle}</p>
          </div>
        </div>
        {status && (
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(status)}`}>
            {status.replace('-', ' ').toUpperCase()}
          </div>
        )}
      </div>

      {metrics && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-400 capitalize">{key}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-700 rounded-lg p-3 mb-4">
        <div className="text-sm text-gray-300">{preview}</div>
      </div>

      <div className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
        View Details
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
};

export default InsightCard;

