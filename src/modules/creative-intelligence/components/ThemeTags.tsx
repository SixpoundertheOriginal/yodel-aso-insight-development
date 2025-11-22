/**
 * Theme Tags Component
 *
 * Displays theme classification as visual tags/badges.
 * Shows primary and secondary themes with confidence and descriptions.
 *
 * Phase 1B: Screenshot Analysis Integration
 */

import { ThemeClassification, getThemeDescription, getThemeColor } from '../utils/themeClassifier';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface ThemeTagsProps {
  theme: ThemeClassification;
  showReasons?: boolean;
  className?: string;
}

export function ThemeTags({ theme, showReasons = false, className = '' }: ThemeTagsProps) {
  const confidencePercent = (theme.confidence * 100).toFixed(0);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Primary theme */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Visual Theme</span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-md border text-sm font-medium capitalize ${getThemeColor(theme.primary)}`}
          >
            {theme.primary}
          </div>
          <Badge variant="secondary" className="text-xs">
            {confidencePercent}% confidence
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          {getThemeDescription(theme.primary)}
        </p>
      </div>

      {/* Secondary theme */}
      {theme.secondary && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Secondary theme:</span>
          <div
            className={`inline-block px-2 py-1 rounded-md border text-xs font-medium capitalize ${getThemeColor(theme.secondary)}`}
          >
            {theme.secondary}
          </div>
        </div>
      )}

      {/* Reasons */}
      {showReasons && theme.reasons.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-border">
          <span className="text-xs font-medium text-muted-foreground">Analysis:</span>
          <ul className="space-y-1">
            {theme.reasons.map((reason, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
