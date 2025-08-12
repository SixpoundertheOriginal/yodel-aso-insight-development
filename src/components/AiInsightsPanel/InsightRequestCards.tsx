import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, Eye, Target, Search, Calendar } from 'lucide-react';

interface RequestType {
  type: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

interface InsightRequestCardsProps {
  onRequestInsight: (type: string) => void;
  isLoading?: boolean;
  layout?: 'default' | 'compact';
}

const requestTypes: RequestType[] = [
  {
    type: 'cvr_analysis',
    title: 'Conversion Rate Analysis',
    description: 'Analyze conversion rates by source',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-indigo-500'
  },
  {
    type: 'impression_trends',
    title: 'Impression Trends',
    description: 'Explore impression patterns',
    icon: Eye,
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    type: 'traffic_source_performance',
    title: 'Traffic Source Performance',
    description: 'Compare sources and optimize',
    icon: Target,
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    type: 'keyword_optimization',
    title: 'Keyword Optimization',
    description: 'Improve keyword rankings',
    icon: Search,
    gradient: 'from-orange-500 to-amber-500'
  },
  {
    type: 'seasonal_pattern',
    title: 'Seasonal Patterns',
    description: 'Identify seasonal trends',
    icon: Calendar,
    gradient: 'from-pink-500 to-rose-500'
  }
];

export const InsightRequestCards: React.FC<InsightRequestCardsProps> = ({
  onRequestInsight,
  isLoading = false,
  layout = 'default'
}) => {
  const gridClass = layout === 'compact'
    ? 'grid grid-cols-1 gap-2'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

  const cardClass = layout === 'compact'
    ? 'p-3 hover:bg-muted/50 transition-colors'
    : 'p-4 hover:shadow-md transition-shadow';

  return (
    <div className={gridClass}>
      {requestTypes.map((request) => (
        <Card
          key={request.type}
          className={`cursor-pointer border border-border ${cardClass} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => onRequestInsight(request.type)}
        >
          <div className="flex items-start gap-3">
            <div className={`${layout === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br ${request.gradient} rounded-lg flex items-center justify-center`}>
              <request.icon className={`${layout === 'compact' ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold ${layout === 'compact' ? 'text-xs' : 'text-sm'} text-foreground`}>
                {request.title}
              </h4>
              {layout !== 'compact' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {request.description}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
