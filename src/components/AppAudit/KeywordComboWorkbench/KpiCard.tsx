/**
 * KPI Card - 2026 Enterprise Edition
 *
 * Features:
 * - Dynamic sizing based on importance
 * - Smart highlighting for outliers
 * - Contextual coloring based on performance
 * - Glass morphism with depth
 * - Micro-interactions (hover, loading, animations)
 * - Count-up number animations
 * - Responsive design
 */

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

// ===== TYPES =====

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type CardVariant = 'strength-1' | 'strength-2' | 'coverage-high' | 'coverage-low' | 'efficiency' | 'neutral' | 'warning' | 'critical';
export type PerformanceLevel = 'critical' | 'warning' | 'neutral' | 'good' | 'excellent' | 'perfect';

interface KpiCardProps {
  /** Main metric value */
  value: string | number;
  /** Card label/title */
  label: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Icon (emoji or lucide icon) */
  icon?: React.ReactNode;
  /** Visual variant - determines gradient */
  variant?: CardVariant;
  /** Card size - affects grid span and typography */
  size?: CardSize;
  /** Performance level - auto-colors based on value */
  performance?: PerformanceLevel;
  /** Enable smart highlighting (pulse/glow for outliers) */
  highlight?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Enable number count-up animation */
  animateNumber?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Custom className */
  className?: string;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get grid column span based on card size
 */
const getGridSpan = (size: CardSize): string => {
  const spans = {
    xs: 'col-span-1',
    sm: 'col-span-1',
    md: 'col-span-1',
    lg: 'md:col-span-2',      // 2x width on desktop
    xl: 'md:col-span-2',      // 2x width, could also be row-span-2
  };
  return spans[size];
};

/**
 * Get number size based on card size
 */
const getNumberSize = (size: CardSize): string => {
  return `var(--card-number-${size})`;
};

/**
 * Get gradient background based on variant
 */
const getGradient = (variant: CardVariant): string => {
  const gradients = {
    'strength-1': 'var(--card-gradient-strength-1)',
    'strength-2': 'var(--card-gradient-strength-2)',
    'coverage-high': 'var(--card-gradient-coverage-high)',
    'coverage-low': 'var(--card-gradient-coverage-low)',
    'efficiency': 'var(--card-gradient-efficiency)',
    'neutral': 'var(--card-gradient-neutral)',
    'warning': 'var(--card-gradient-warning)',
    'critical': 'var(--card-gradient-critical)',
  };
  return gradients[variant];
};

/**
 * Get glow effect based on variant
 */
const getGlow = (variant: CardVariant): string => {
  const glows = {
    'strength-1': 'var(--card-glow-strength-1)',
    'strength-2': 'var(--card-glow-strength-2)',
    'coverage-high': 'var(--card-glow-coverage)',
    'coverage-low': 'var(--card-glow-coverage)',
    'efficiency': 'var(--card-glow-efficiency)',
    'neutral': 'none',
    'warning': 'var(--card-glow-strength-2)',
    'critical': 'var(--card-glow-critical)',
  };
  return glows[variant];
};

/**
 * Get performance color
 */
const getPerformanceColor = (performance: PerformanceLevel): string => {
  const colors = {
    critical: 'var(--card-critical)',
    warning: 'var(--card-warning)',
    neutral: 'var(--card-neutral)',
    good: 'var(--card-good)',
    excellent: 'var(--card-excellent)',
    perfect: 'var(--card-perfect)',
  };
  return colors[performance];
};

/**
 * Count-up animation hook
 */
const useCountUp = (end: number, duration: number = 800, enabled: boolean = true) => {
  const [count, setCount] = useState(enabled ? 0 : end);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof end !== 'number') {
      setCount(end);
      return;
    }

    startTimeRef.current = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);

      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - percentage, 3);
      const current = Math.floor(eased * end);

      setCount(current);

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [end, duration, enabled]);

  return count;
};

// ===== COMPONENT =====

export const KpiCard: React.FC<KpiCardProps> = ({
  value,
  label,
  subtitle,
  icon,
  variant = 'neutral',
  size = 'md',
  performance,
  highlight = false,
  isLoading = false,
  animateNumber = true,
  onClick,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Count-up animation for numeric values
  const numericValue = typeof value === 'number' ? value : parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  const isNumeric = !isNaN(numericValue);
  const animatedValue = useCountUp(numericValue, 1000, animateNumber && isNumeric && !isLoading);

  // Determine final display value
  const displayValue = isLoading
    ? '...'
    : isNumeric && animateNumber
    ? String(value).replace(String(numericValue), String(animatedValue))
    : value;

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl',
          'bg-zinc-900/50 border border-zinc-800/50',
          'animate-pulse',
          getGridSpan(size),
          className
        )}
        style={{
          padding: 'var(--card-padding-md)',
        }}
      >
        <div className="space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-20" />
          <div className="h-10 bg-zinc-800 rounded w-24" />
          <div className="h-3 bg-zinc-800 rounded w-32" />
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-zinc-700/10 to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden',
        'backdrop-blur-xl',
        'border transition-all duration-300',
        onClick && 'cursor-pointer',
        highlight && 'animate-pulse',
        getGridSpan(size),
        className
      )}
      style={{
        borderRadius: 'var(--card-radius-lg)',
        padding: 'var(--card-padding-md)',
        background: `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%), ${getGradient(variant)}`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        borderColor: isHovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
        boxShadow: isHovered
          ? `var(--card-elevation-hover), ${getGlow(variant)}`
          : `var(--card-elevation-2), ${highlight ? getGlow(variant) : 'none'}`,
        transform: isHovered ? 'var(--card-hover-lift)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Glass overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          opacity: isHovered ? 1 : 0.5,
          transition: 'opacity var(--card-transition-normal)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 space-y-1">
        {/* Label + Icon */}
        <div className="flex items-center gap-1.5">
          {icon && (
            <span className="text-base leading-none flex-shrink-0">
              {icon}
            </span>
          )}
          <p
            className="text-zinc-400 font-medium uppercase tracking-wide leading-tight"
            style={{
              fontSize: 'var(--card-label-sm)',
            }}
          >
            {label}
          </p>
        </div>

        {/* Value */}
        <p
          className="font-bold leading-none tracking-tight transition-all duration-300"
          style={{
            fontSize: getNumberSize(size),
            color: performance ? getPerformanceColor(performance) : '#FFFFFF',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            transform: isHovered ? 'var(--card-hover-scale-sm)' : 'none',
          }}
        >
          {displayValue}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p
            className="text-zinc-500 leading-tight"
            style={{
              fontSize: 'var(--card-subtitle-xs)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Hover accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300"
        style={{
          background: getGradient(variant),
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
        }}
      />
    </div>
  );
};

// ===== LOADING SKELETON =====

export const KpiCardSkeleton: React.FC<{ size?: CardSize; className?: string }> = ({
  size = 'md',
  className,
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'bg-zinc-900/50 border border-zinc-800/50',
        'animate-pulse',
        getGridSpan(size),
        className
      )}
      style={{
        borderRadius: 'var(--card-radius-lg)',
        padding: 'var(--card-padding-md)',
      }}
    >
      <div className="space-y-3">
        <div className="h-4 bg-zinc-800 rounded w-20" />
        <div className="h-10 bg-zinc-800 rounded w-24" />
        <div className="h-3 bg-zinc-800 rounded w-32" />
      </div>

      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-zinc-700/10 to-transparent" />
    </div>
  );
};
