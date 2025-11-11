/**
 * EMOTIONAL PROFILE CHART
 *
 * Visualizes emotional breakdown beyond basic positive/neutral/negative sentiment
 * Shows granular emotional intensity across 5 dimensions
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EmotionalProfileChartProps {
  emotions: {
    joy: number;         // 0-1 scale
    frustration: number; // 0-1 scale
    excitement: number;  // 0-1 scale
    disappointment: number; // 0-1 scale
    anger: number;       // 0-1 scale
  };
  totalReviews: number;
  onEmotionClick?: (emotion: string) => void;
  className?: string;
}

interface EmotionConfig {
  key: keyof EmotionalProfileChartProps['emotions'];
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
}

const EMOTION_CONFIG: EmotionConfig[] = [
  {
    key: 'joy',
    label: 'Joy',
    icon: '😊',
    color: 'hsl(var(--success))',
    bgColor: 'bg-success/10',
    textColor: 'text-success'
  },
  {
    key: 'excitement',
    label: 'Excitement',
    icon: '🎉',
    color: 'hsl(var(--primary))',
    bgColor: 'bg-primary/10',
    textColor: 'text-primary'
  },
  {
    key: 'frustration',
    label: 'Frustration',
    icon: '😐',
    color: 'hsl(var(--warning))',
    bgColor: 'bg-warning/10',
    textColor: 'text-warning'
  },
  {
    key: 'disappointment',
    label: 'Disappointment',
    icon: '😞',
    color: 'hsl(var(--muted))',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground'
  },
  {
    key: 'anger',
    label: 'Anger',
    icon: '😡',
    color: 'hsl(var(--destructive))',
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive'
  }
];

export const EmotionalProfileChart: React.FC<EmotionalProfileChartProps> = ({
  emotions,
  totalReviews,
  onEmotionClick,
  className
}) => {
  // Sort emotions by intensity (highest first)
  const sortedEmotions = EMOTION_CONFIG
    .map(config => ({
      ...config,
      value: emotions[config.key],
      percentage: Math.round(emotions[config.key] * 100)
    }))
    .sort((a, b) => b.value - a.value);

  // Get dominant emotion
  const dominantEmotion = sortedEmotions[0];

  return (
    <div className={cn("space-y-4 pt-4 border-t border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Emotional Intensity</h4>
          <p className="text-xs text-muted-foreground">
            Granular sentiment analysis across {totalReviews} reviews
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "px-2 py-1 text-xs",
            dominantEmotion.bgColor,
            dominantEmotion.textColor
          )}
        >
          {dominantEmotion.icon} Dominant: {dominantEmotion.label}
        </Badge>
      </div>

      {/* Emotion Bars */}
      <div className="space-y-3">
        {sortedEmotions.map((emotion) => (
          <div
            key={emotion.key}
            className={cn(
              "group transition-all duration-200",
              onEmotionClick && "cursor-pointer hover:scale-[1.01]"
            )}
            onClick={() => onEmotionClick?.(emotion.key)}
          >
            {/* Emotion Label Row */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{emotion.icon}</span>
                <span className="text-sm font-medium">{emotion.label}</span>
              </div>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                emotion.textColor
              )}>
                {emotion.percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
                  emotion.bgColor,
                  "group-hover:opacity-90"
                )}
                style={{
                  width: `${emotion.percentage}%`,
                  background: `linear-gradient(90deg, ${emotion.color} 0%, ${emotion.color}99 100%)`
                }}
              />
              {/* Subtle shine effect on hover */}
              {onEmotionClick && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </div>

            {/* Review count indicator */}
            <div className="mt-1 text-xs text-muted-foreground">
              ~{Math.round(totalReviews * emotion.value)} reviews
            </div>
          </div>
        ))}
      </div>

      {/* Interpretation Legend */}
      <div className="pt-3 border-t border-border/50">
        <p className="text-xs text-muted-foreground leading-relaxed">
          💡 <strong>Insight:</strong> {getEmotionalInsight(sortedEmotions, totalReviews)}
        </p>
      </div>
    </div>
  );
};

// Helper function to generate contextual insights
function getEmotionalInsight(
  emotions: Array<{ label: string; value: number; key: string }>,
  totalReviews: number
): string {
  const [primary, secondary] = emotions;

  // High joy
  if (primary.key === 'joy' && primary.value > 0.6) {
    return `Users overwhelmingly express joy (${Math.round(primary.value * 100)}%). This indicates strong product-market fit and user satisfaction.`;
  }

  // High excitement
  if (primary.key === 'excitement' && primary.value > 0.5) {
    return `High excitement levels suggest users are engaged with new features or recent updates. Capitalize on this momentum.`;
  }

  // High frustration
  if (primary.key === 'frustration' && primary.value > 0.4) {
    return `${Math.round(primary.value * 100)}% frustration signals UX friction or feature gaps. Prioritize usability improvements.`;
  }

  // High anger
  if (primary.key === 'anger' && primary.value > 0.3) {
    return `Anger levels require immediate attention. Review critical issues affecting ${Math.round(totalReviews * primary.value)} users.`;
  }

  // High disappointment
  if (primary.key === 'disappointment' && primary.value > 0.4) {
    return `Disappointment indicates unmet expectations. Align product messaging with actual capabilities.`;
  }

  // Mixed emotions
  if (Math.abs(primary.value - secondary.value) < 0.15) {
    return `Emotions are evenly split between ${primary.label.toLowerCase()} and ${secondary.label.toLowerCase()}. User experience is inconsistent.`;
  }

  // Default
  return `Primary emotion is ${primary.label.toLowerCase()} (${Math.round(primary.value * 100)}%), followed by ${secondary.label.toLowerCase()} (${Math.round(secondary.value * 100)}%).`;
}
