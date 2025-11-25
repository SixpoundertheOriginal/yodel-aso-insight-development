/**
 * KPI Tooltip Component
 *
 * Displays help icon with tooltip for metadata KPIs.
 * Shows user-friendly explanations from kpiDefinitions.ts
 */

import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getTooltipText, getFullExplanation, explainGap } from '@/constants/kpiDefinitions';
import { cn } from '@/lib/utils';

interface KpiTooltipProps {
  metricId: string;
  currentScore?: number; // Optional: if provided, shows gap interpretation
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  showFullExplanation?: boolean; // If true, shows long-form explanation
}

export const KpiTooltip: React.FC<KpiTooltipProps> = ({
  metricId,
  currentScore,
  className,
  iconSize = 'sm',
  showFullExplanation = false,
}) => {
  const iconSizeClass = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[iconSize];

  const content = showFullExplanation
    ? getFullExplanation(metricId)
    : currentScore !== undefined
    ? explainGap(metricId, currentScore)
    : getTooltipText(metricId);

  if (!content) {
    return null; // No definition available
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "text-zinc-500 hover:text-zinc-300 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-400/50",
              className
            )}
            onClick={(e) => e.stopPropagation()} // Prevent parent click handlers
          >
            <HelpCircle className={iconSizeClass} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className={cn(
            "max-w-sm p-4 bg-zinc-900 border-zinc-700 text-zinc-100",
            showFullExplanation && "max-w-md"
          )}
        >
          <div className="space-y-2 text-sm leading-relaxed whitespace-pre-line">
            {content}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Inline KPI Label with Tooltip
 *
 * Convenience component that combines label text with help icon
 */
interface KpiLabelWithTooltipProps {
  label: string;
  metricId: string;
  currentScore?: number;
  className?: string;
}

export const KpiLabelWithTooltip: React.FC<KpiLabelWithTooltipProps> = ({
  label,
  metricId,
  currentScore,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span>{label}</span>
      <KpiTooltip metricId={metricId} currentScore={currentScore} />
    </div>
  );
};
