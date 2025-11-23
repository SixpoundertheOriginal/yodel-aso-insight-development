/**
 * Recommendation Card
 *
 * Presentational component for displaying a single recommendation with
 * category badge, severity styling, and clean message formatting.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/design-registry';
import { getSeverityColors, getCategoryColors, type RecommendationSeverity } from './utils';
import { AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface RecommendationCardProps {
  category: string;
  severity: RecommendationSeverity;
  message: string;
  index: number;  // For staggered animation
}

/**
 * Get icon for severity level
 */
const getSeverityIcon = (severity: RecommendationSeverity) => {
  switch (severity) {
    case 'critical':
      return AlertTriangle;
    case 'strong':
      return AlertCircle;
    case 'moderate':
      return Info;
    case 'optional':
      return Info;
    case 'success':
      return CheckCircle2;
  }
};

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  category,
  severity,
  message,
  index
}) => {
  const severityColors = getSeverityColors(severity);
  const categoryColors = getCategoryColors(category);
  const SeverityIcon = getSeverityIcon(severity);

  return (
    <div
      className={cn(
        "group relative flex flex-col",
        "p-3 rounded-lg",
        "bg-black/30 backdrop-blur-sm",
        "border",
        severityColors.border,
        "transition-all duration-200",
        "hover:bg-black/40",
        "animate-in fade-in slide-in-from-left-2"
      )}
      style={{
        animationDelay: `${index * 30}ms`,
        animationFillMode: 'both',
        boxShadow: `0 0 0 rgba(0,0,0,0)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = severityColors.glow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
      }}
    >
      {/* Corner Accents */}
      <div className={cn(
        "absolute top-0 right-0 w-3 h-3",
        "border-t-2 border-r-2",
        severityColors.border,
        "opacity-40 group-hover:opacity-100",
        "transition-opacity duration-300"
      )} />
      <div className={cn(
        "absolute bottom-0 left-0 w-3 h-3",
        "border-b-2 border-l-2",
        severityColors.border,
        "opacity-40 group-hover:opacity-100",
        "transition-opacity duration-300"
      )} />

      {/* Header: Category + Severity Badges */}
      <div className="flex items-center justify-between mb-2">
        {/* Category Badge */}
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] leading-none tracking-wide uppercase font-mono h-5 px-2 rounded-md",
            categoryColors.border,
            categoryColors.text,
            categoryColors.bg
          )}
        >
          {category}
        </Badge>

        {/* Severity Badge with Icon */}
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] leading-none tracking-wide uppercase font-mono h-5 px-2 rounded-md flex items-center gap-1",
            severityColors.border,
            severityColors.text,
            severityColors.bg
          )}
        >
          <SeverityIcon className="h-3 w-3" />
          {severity}
        </Badge>
      </div>

      {/* Message Body */}
      <p className={cn(
        "text-xs leading-relaxed",
        "text-zinc-300",
        "group-hover:text-zinc-200",
        "transition-colors duration-200"
      )}>
        {message}
      </p>

      {/* Subtle Gradient Overlay on Hover */}
      <div className={cn(
        "absolute inset-0 rounded-lg pointer-events-none",
        "opacity-0 group-hover:opacity-5",
        "transition-opacity duration-300",
        severityColors.bg
      )} />
    </div>
  );
};
