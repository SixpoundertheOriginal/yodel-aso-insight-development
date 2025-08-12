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
  status?: 'optimization-needed' | 'critical' | string;
  metrics?: {
    scale: number;
    optimize: number;
    investigate: number;
    expand: number;
  };
}

const statusStyles: Record<string, string> = {
  'optimization-needed': 'border-orange-500',
  critical: 'border-red-500',
};

const InsightCard: React.FC<InsightCardProps> = ({
  title,
  subtitle,
  preview,
  href,
  icon: Icon,
  status,
  metrics,
}) => {
  return (
    <Link
      to={href}
      className={`block bg-white rounded-xl border p-6 hover:shadow-md transition-shadow ${status ? statusStyles[status] : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Icon className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400" />
      </div>
      <p className="mt-4 text-sm text-gray-700">{preview}</p>
      {metrics && (
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{metrics.scale}</div>
            <div className="text-xs text-gray-500">Scale</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{metrics.optimize}</div>
            <div className="text-xs text-gray-500">Optimize</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{metrics.investigate}</div>
            <div className="text-xs text-gray-500">Investigate</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{metrics.expand}</div>
            <div className="text-xs text-gray-500">Expand</div>
          </div>
        </div>
      )}
    </Link>
  );
};

export default InsightCard;

