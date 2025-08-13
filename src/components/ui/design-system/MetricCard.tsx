
import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { EnterpriseMetricCard } from '@/lib/design-system';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
    trend: 'up' | 'down';
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  variant = 'default',
  className
}) => {
  // Convert legacy props to new enterprise format
  const delta = change ? {
    value: change.value,
    period: change.period,
    trend: change.trend === 'up' ? 'positive' as const : 'negative' as const
  } : undefined;

  const enterpriseVariant = variant === 'default' ? 'default' : 
                           variant === 'success' ? 'success' :
                           variant === 'warning' ? 'warning' : 'error';

  return (
    <EnterpriseMetricCard
      title={title}
      value={value}
      delta={delta}
      icon={icon}
      variant={enterpriseVariant}
      className={className}
    />
  );
};
