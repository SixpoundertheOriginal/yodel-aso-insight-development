// Enterprise ASO Dashboard Design System - Base Components
// Unified component architecture for visual consistency

import React from 'react';
import { cn } from '@/lib/utils';
import { designTokens } from './tokens';

// Base Card Component - Foundation for ALL dashboard components
export interface BaseCardProps {
  variant?: 'default' | 'metric' | 'chart' | 'summary' | 'glass';
  padding?: keyof typeof designTokens.spacing;
  shadow?: keyof typeof designTokens.shadows;
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
}

export const BaseCard: React.FC<BaseCardProps> = ({
  variant = 'default',
  padding = 'lg',
  shadow = 'md',
  children,
  className,
  animated = false,
}) => {
  const variantStyles = {
    default: 'bg-card border-border',
    metric: 'bg-gradient-to-br from-card/90 to-card/60 border-border/50 backdrop-blur-sm',
    chart: 'bg-card/95 border-border/30 backdrop-blur-md',
    summary: 'bg-gradient-to-r from-card via-card/90 to-card border-border',
    glass: 'bg-card/20 border-white/10 backdrop-blur-lg',
  };

  const paddingValue = designTokens.spacing[padding];
  const shadowValue = designTokens.shadows[shadow];

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-300',
        variantStyles[variant],
        animated && 'hover:scale-[1.02] hover:shadow-xl',
        className
      )}
      style={{
        padding: paddingValue,
        boxShadow: shadowValue,
      }}
    >
      {children}
    </div>
  );
};

// Enterprise Metric Card - Extends BaseCard with metric-specific features
export interface EnterpriseMetricCardProps extends Pick<BaseCardProps, 'padding' | 'shadow' | 'className'> {
  title: string;
  value: number | string;
  delta?: {
    value: number;
    period: string;
    trend: 'positive' | 'negative' | 'neutral';
  };
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'currency';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export const EnterpriseMetricCard: React.FC<EnterpriseMetricCardProps> = ({
  title,
  value,
  delta,
  icon,
  format = 'number',
  variant = 'default',
  padding = 'lg',
  shadow = 'md',
  className,
}) => {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      default:
        return val.toLocaleString();
    }
  };

  const getDeltaColor = (trend: 'positive' | 'negative' | 'neutral'): string => {
    switch (trend) {
      case 'positive':
        return 'text-semantic-success bg-semantic-success/10';
      case 'negative':
        return 'text-semantic-error bg-semantic-error/10';
      default:
        return 'text-muted-foreground bg-muted/10';
    }
  };

  const getVariantAccent = (variant: string): string => {
    switch (variant) {
      case 'success':
        return 'border-l-4 border-l-semantic-success';
      case 'warning':
        return 'border-l-4 border-l-semantic-warning';
      case 'error':
        return 'border-l-4 border-l-semantic-error';
      case 'info':
        return 'border-l-4 border-l-semantic-info';
      default:
        return 'border-l-4 border-l-brand-primary';
    }
  };

  return (
    <BaseCard
      variant="metric"
      padding={padding}
      shadow={shadow}
      animated
      className={cn(
        'relative overflow-hidden group',
        getVariantAccent(variant),
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 
            className="text-sm font-medium text-muted-foreground uppercase tracking-wide"
            style={{ fontSize: designTokens.typography.fontSize.sm }}
          >
            {title}
          </h3>
          {icon && (
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-4">
          <div 
            className="font-bold text-foreground mb-1 tabular-nums"
            style={{ 
              fontSize: designTokens.typography.fontSize['3xl'],
              fontWeight: designTokens.typography.fontWeight.bold,
            }}
          >
            {formatValue(value)}
          </div>
        </div>

        {/* Delta Indicator */}
        {delta && (
          <div className={cn(
            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
            getDeltaColor(delta.trend)
          )}>
            <span className="mr-1">
              {delta.trend === 'positive' ? '↗' : delta.trend === 'negative' ? '↘' : '→'}
            </span>
            {Math.abs(delta.value)}% vs {delta.period}
          </div>
        )}
      </div>
    </BaseCard>
  );
};

// Chart Container - Standardized wrapper for all chart components
export interface ChartContainerProps extends Pick<BaseCardProps, 'padding' | 'shadow' | 'className'> {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  height?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  children,
  actions,
  height = '400px',
  padding = 'lg',
  shadow = 'lg',
  className,
}) => {
  return (
    <BaseCard
      variant="chart"
      padding="sm"
      shadow={shadow}
      className={cn('overflow-hidden', className)}
    >
      {/* Chart Header */}
      <div 
        className="flex items-center justify-between border-b border-border/50 mb-6"
        style={{ padding: designTokens.spacing[padding] }}
      >
        <h3 
          className="font-semibold text-foreground"
          style={{ 
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.semibold,
          }}
        >
          {title}
        </h3>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Chart Content */}
      <div 
        className="relative"
        style={{ 
          height,
          padding: `0 ${designTokens.spacing[padding]}`,
          paddingBottom: designTokens.spacing[padding],
        }}
      >
        {children}
      </div>
    </BaseCard>
  );
};

// Typography Components with consistent hierarchy
export const EnterpriseTypography = {
  PageTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h1 
      className={cn('font-bold text-foreground tracking-tight', className)}
      style={{ 
        fontSize: designTokens.typography.fontSize['3xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
      }}
    >
      {children}
    </h1>
  ),

  SectionTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 
      className={cn('font-semibold text-foreground', className)}
      style={{ 
        fontSize: designTokens.typography.fontSize['2xl'],
        fontWeight: designTokens.typography.fontWeight.semibold,
      }}
    >
      {children}
    </h2>
  ),

  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 
      className={cn('font-semibold text-foreground', className)}
      style={{ 
        fontSize: designTokens.typography.fontSize.lg,
        fontWeight: designTokens.typography.fontWeight.semibold,
      }}
    >
      {children}
    </h3>
  ),

  MetricValue: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span 
      className={cn('font-bold text-foreground tabular-nums', className)}
      style={{ 
        fontSize: designTokens.typography.fontSize['3xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
      }}
    >
      {children}
    </span>
  ),

  BodyText: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p 
      className={cn('text-muted-foreground', className)}
      style={{ 
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.normal,
      }}
    >
      {children}
    </p>
  ),

  Label: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span 
      className={cn('font-medium text-muted-foreground', className)}
      style={{ 
        fontSize: designTokens.typography.fontSize.sm,
        fontWeight: designTokens.typography.fontWeight.medium,
      }}
    >
      {children}
    </span>
  ),
};