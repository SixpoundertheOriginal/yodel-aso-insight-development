/**
 * Theme Classifier Utility
 *
 * Classifies screenshot visual themes using rule-based heuristics.
 * Analyzes color palette, brightness, saturation to determine style.
 *
 * Phase 1B: Screenshot Analysis Integration
 */

import { ColorExtractionResult } from './colorExtractor';

export type ThemeStyle =
  | 'minimal'
  | 'vibrant'
  | 'dark'
  | 'light'
  | 'gradient'
  | 'photo'
  | 'illustration';

export interface ThemeClassification {
  primary: ThemeStyle;
  secondary?: ThemeStyle;
  confidence: number;
  reasons: string[];
}

/**
 * Classify theme based on color analysis
 */
export function classifyTheme(
  colorData: ColorExtractionResult
): ThemeClassification {
  const scores = {
    minimal: 0,
    vibrant: 0,
    dark: 0,
    light: 0,
    gradient: 0,
    photo: 0,
    illustration: 0
  };

  const reasons: string[] = [];

  // Rule 1: Dark theme
  if (colorData.averageBrightness < 0.3) {
    scores.dark += 40;
    reasons.push('Low brightness indicates dark theme');
  } else if (colorData.averageBrightness < 0.4) {
    scores.dark += 20;
  }

  // Rule 2: Light theme
  if (colorData.averageBrightness > 0.7) {
    scores.light += 40;
    reasons.push('High brightness indicates light theme');
  } else if (colorData.averageBrightness > 0.6) {
    scores.light += 20;
  }

  // Rule 3: Minimal theme
  if (colorData.colorCount <= 2) {
    scores.minimal += 30;
    reasons.push('Limited color palette suggests minimal design');
  }

  if (colorData.averageSaturation < 0.2) {
    scores.minimal += 20;
    reasons.push('Low saturation suggests minimal style');
  }

  // Rule 4: Vibrant theme
  if (colorData.averageSaturation > 0.6) {
    scores.vibrant += 40;
    reasons.push('High saturation indicates vibrant colors');
  } else if (colorData.averageSaturation > 0.4) {
    scores.vibrant += 20;
  }

  if (colorData.colorCount >= 4) {
    scores.vibrant += 15;
    reasons.push('Multiple colors suggest vibrant design');
  }

  // Rule 5: Gradient detection
  if (colorData.colorCount >= 3 && colorData.averageSaturation > 0.3) {
    // Check if colors are similar in hue (gradient-like)
    const hasGradient = detectGradientPattern(colorData.dominantColors);
    if (hasGradient) {
      scores.gradient += 35;
      reasons.push('Color progression suggests gradient usage');
    }
  }

  // Rule 6: Photo vs Illustration
  if (colorData.colorCount >= 5) {
    scores.photo += 25;
    reasons.push('High color variety suggests photographic content');
  } else if (colorData.colorCount <= 3 && colorData.averageSaturation > 0.5) {
    scores.illustration += 25;
    reasons.push('Limited saturated colors suggest illustration');
  }

  // Find primary and secondary themes
  const sortedThemes = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  const primary = sortedThemes[0][0] as ThemeStyle;
  const primaryScore = sortedThemes[0][1];

  const secondary = sortedThemes[1][1] > 15
    ? sortedThemes[1][0] as ThemeStyle
    : undefined;

  // Calculate confidence (normalize score to 0-1)
  const confidence = Math.min(primaryScore / 100, 1);

  // Add final reason
  if (confidence > 0.7) {
    reasons.push(`Strong ${primary} theme detected`);
  } else if (confidence > 0.4) {
    reasons.push(`Moderate ${primary} theme detected`);
  } else {
    reasons.push(`Weak ${primary} theme detected`);
  }

  return {
    primary,
    secondary,
    confidence,
    reasons: reasons.slice(0, 3) // Keep top 3 reasons
  };
}

/**
 * Detect gradient pattern in color palette
 */
function detectGradientPattern(
  colors: Array<{ hex: string; rgb: { r: number; g: number; b: number } }>
): boolean {
  if (colors.length < 2) return false;

  // Check if colors form a gradual progression
  for (let i = 0; i < colors.length - 1; i++) {
    const c1 = colors[i].rgb;
    const c2 = colors[i + 1].rgb;

    // Calculate color distance
    const distance = Math.sqrt(
      Math.pow(c2.r - c1.r, 2) +
      Math.pow(c2.g - c1.g, 2) +
      Math.pow(c2.b - c1.b, 2)
    );

    // Gradient colors should be relatively close (not too different)
    if (distance < 150 && distance > 30) {
      return true;
    }
  }

  return false;
}

/**
 * Get theme description for display
 */
export function getThemeDescription(style: ThemeStyle): string {
  const descriptions: Record<ThemeStyle, string> = {
    minimal: 'Clean, simple design with limited color palette',
    vibrant: 'Bold, energetic colors with high saturation',
    dark: 'Dark color scheme, suitable for low-light viewing',
    light: 'Bright, airy design with light backgrounds',
    gradient: 'Smooth color transitions and gradient effects',
    photo: 'Photographic content with natural color variety',
    illustration: 'Illustrated graphics with stylized colors'
  };

  return descriptions[style];
}

/**
 * Get theme color (for badge display)
 */
export function getThemeColor(style: ThemeStyle): string {
  const colors: Record<ThemeStyle, string> = {
    minimal: 'bg-slate-100 text-slate-700 border-slate-300',
    vibrant: 'bg-pink-100 text-pink-700 border-pink-300',
    dark: 'bg-slate-800 text-slate-100 border-slate-700',
    light: 'bg-blue-50 text-blue-700 border-blue-200',
    gradient: 'bg-purple-100 text-purple-700 border-purple-300',
    photo: 'bg-green-100 text-green-700 border-green-300',
    illustration: 'bg-orange-100 text-orange-700 border-orange-300'
  };

  return colors[style];
}
