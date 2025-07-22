
import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { YodelCard } from './YodelCard';

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  accentColor?: 'orange' | 'blue' | 'green' | 'red' | 'purple' | 'gray';
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
  withHover?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  accentColor = 'orange',
  prefix = '',
  suffix = '',
  tooltip,
  className,
  size = 'md',
  withHover = true,
  ...props
}) => {
  const accentColors = {
    orange: "border-l-yodel-orange from-yodel-orange/10",
    blue: "border-l-yodel-blue from-yodel-blue/10",
    green: "border-l-green-500 from-green-500/10",
    red: "border-l-red-500 from-red-500/10",
    purple: "border-l-purple-500 from-purple-500/10",
    gray: "border-l-gray-500 from-gray-500/10"
  };

  const textColors = {
    orange: "text-yodel-orange",
    blue: "text-yodel-blue",
    green: "text-green-500",
    red: "text-red-500",
    purple: "text-purple-500",
    gray: "text-gray-500"
  };

  const changeColors = {
    positive: "text-green-400",
    negative: "text-red-400",
    neutral: "text-zinc-400"
  };

  const getChangeType = () => {
    if (!change || change === 0) return 'neutral';
    return change > 0 ? 'positive' : 'negative';
  };

  const ChangeIcon = () => {
    const type = getChangeType();
    if (type === 'positive') return <ArrowUpRight className="h-4 w-4" />;
    if (type === 'negative') return <ArrowDownRight className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const formatChange = (value: number) => {
    const absValue = Math.abs(value);
    return `${absValue.toLocaleString(undefined, { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    })}%`;
  };

  const sizes = {
    sm: {
      card: "p-4",
      title: "text-xs",
      value: "text-xl font-bold",
      change: "text-xs"
    },
    md: {
      card: "p-5",
      title: "text-sm",
      value: "text-2xl font-bold",
      change: "text-sm"
    },
    lg: {
      card: "p-6",
      title: "text-base",
      value: "text-3xl font-bold",
      change: "text-sm"
    }
  };

  return (
    <YodelCard 
      className={cn(
        "border-l-4 bg-gradient-to-r to-transparent",
        accentColors[accentColor],
        sizes[size].card,
        className
      )}
      withHover={withHover}
      {...props}
    >
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className={cn("text-zinc-400 font-medium", sizes[size].title)}>{title}</span>
          {icon && <span className={textColors[accentColor]}>{icon}</span>}
        </div>
        
        <div className={cn("text-white mb-1", sizes[size].value)}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </div>
        
        {(change !== undefined || changeLabel) && (
          <div className={cn(
            "flex items-center gap-1", 
            sizes[size].change,
            changeColors[getChangeType()]
          )}>
            <ChangeIcon />
            {change !== undefined && <span>{formatChange(change)}</span>}
            {changeLabel && <span>{changeLabel}</span>}
          </div>
        )}
      </div>
    </YodelCard>
  );
};
