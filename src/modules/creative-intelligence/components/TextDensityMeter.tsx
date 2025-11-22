/**
 * Text Density Meter Component
 *
 * Visual meter showing text density and distribution.
 * Displays percentage, density bar, and position indicators.
 *
 * Phase 1B: Screenshot Analysis Integration
 */

import { TextEstimationResult } from '../utils/ocrExtractor';
import { Badge } from '@/components/ui/badge';

interface TextDensityMeterProps {
  textData: TextEstimationResult;
  className?: string;
}

export function TextDensityMeter({ textData, className = '' }: TextDensityMeterProps) {
  const percentage = textData.estimatedTextPercentage;
  const density = textData.textDensity;

  // Determine density level
  let densityLevel: 'low' | 'medium' | 'high';
  let densityColor: string;

  if (density < 0.2) {
    densityLevel = 'low';
    densityColor = 'bg-blue-500';
  } else if (density < 0.4) {
    densityLevel = 'medium';
    densityColor = 'bg-amber-500';
  } else {
    densityLevel = 'high';
    densityColor = 'bg-red-500';
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Text Coverage</span>
        <span className="text-2xl font-bold text-primary">
          {percentage.toFixed(1)}%
        </span>
      </div>

      {/* Density bar */}
      <div className="space-y-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${densityColor} transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="capitalize">{densityLevel} density</span>
          <span>100%</span>
        </div>
      </div>

      {/* Position indicators */}
      <div className="flex gap-2">
        {textData.hasTopText && (
          <Badge variant="outline" className="text-xs">
            Top Section
          </Badge>
        )}
        {textData.hasCenterText && (
          <Badge variant="outline" className="text-xs">
            Center Section
          </Badge>
        )}
        {textData.hasBottomText && (
          <Badge variant="outline" className="text-xs">
            Bottom Section
          </Badge>
        )}
        {!textData.hasTopText && !textData.hasCenterText && !textData.hasBottomText && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            No clear text regions
          </Badge>
        )}
      </div>

      {/* Region count */}
      <div className="text-xs text-muted-foreground">
        {textData.textRegions.length} text-like region{textData.textRegions.length !== 1 ? 's' : ''} detected
      </div>
    </div>
  );
}
