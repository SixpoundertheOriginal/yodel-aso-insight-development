/**
 * Layout Analyzer Utility
 *
 * Analyzes screenshot layout using simple heuristics.
 * Detects layout patterns, element positioning, visual hierarchy.
 *
 * Phase 1B: Screenshot Analysis Integration
 */

import { TextEstimationResult } from './ocrExtractor';
import { ColorExtractionResult } from './colorExtractor';

export type LayoutType =
  | 'text-heavy'
  | 'image-heavy'
  | 'balanced'
  | 'top-heavy'
  | 'bottom-heavy'
  | 'centered';

export interface LayoutAnalysis {
  layoutType: LayoutType;
  confidence: number;
  textToImageRatio: number;
  visualDensity: number; // 0-1 scale
  hasCTA: boolean;
  ctaPosition?: 'top' | 'center' | 'bottom';
  layoutScore: number; // 0-100 quality score
  insights: string[];
}

/**
 * Analyze screenshot layout
 */
export function analyzeLayout(
  textData: TextEstimationResult,
  colorData: ColorExtractionResult
): LayoutAnalysis {
  const insights: string[] = [];

  // 1. Determine layout type
  const layoutType = determineLayoutType(textData, insights);

  // 2. Calculate text-to-image ratio
  const textToImageRatio = textData.estimatedTextPercentage / 100;

  // 3. Calculate visual density
  const visualDensity = calculateVisualDensity(textData, colorData);

  // 4. Detect CTA (Call-to-Action) presence
  const { hasCTA, ctaPosition } = detectCTA(textData, colorData);

  if (hasCTA) {
    insights.push(`CTA detected in ${ctaPosition} section`);
  }

  // 5. Calculate layout score
  const layoutScore = calculateLayoutScore(
    layoutType,
    textToImageRatio,
    visualDensity,
    hasCTA
  );

  // 6. Determine confidence based on clarity of patterns
  const confidence = calculateLayoutConfidence(textData, colorData);

  // 7. Add quality insights
  if (layoutScore > 75) {
    insights.push('Well-balanced layout with clear hierarchy');
  } else if (layoutScore < 50) {
    insights.push('Layout may benefit from optimization');
  }

  if (visualDensity > 0.7) {
    insights.push('High visual density - may feel cluttered');
  } else if (visualDensity < 0.3) {
    insights.push('Low visual density - clean and spacious');
  }

  return {
    layoutType,
    confidence,
    textToImageRatio,
    visualDensity,
    hasCTA,
    ctaPosition,
    layoutScore,
    insights: insights.slice(0, 4) // Keep top 4 insights
  };
}

/**
 * Determine primary layout type
 */
function determineLayoutType(
  textData: TextEstimationResult,
  insights: string[]
): LayoutType {
  const textDensity = textData.textDensity;
  const { hasTopText, hasBottomText, hasCenterText } = textData;

  // Text-heavy vs image-heavy
  if (textDensity > 0.4) {
    insights.push('High text density detected');
    return 'text-heavy';
  }

  if (textDensity < 0.15) {
    insights.push('Low text density - image-focused');
    return 'image-heavy';
  }

  // Position-based layouts
  if (hasTopText && !hasBottomText && !hasCenterText) {
    insights.push('Content concentrated at top');
    return 'top-heavy';
  }

  if (hasBottomText && !hasTopText && !hasCenterText) {
    insights.push('Content concentrated at bottom');
    return 'bottom-heavy';
  }

  if (hasCenterText && !hasTopText && !hasBottomText) {
    insights.push('Centered content layout');
    return 'centered';
  }

  // Default to balanced
  insights.push('Balanced content distribution');
  return 'balanced';
}

/**
 * Calculate overall visual density
 */
function calculateVisualDensity(
  textData: TextEstimationResult,
  colorData: ColorExtractionResult
): number {
  // Combine text density with color variety
  const textFactor = textData.textDensity;
  const colorFactor = colorData.colorCount / 10; // Normalize to 0-1

  // Visual density is weighted average
  return (textFactor * 0.6 + colorFactor * 0.4);
}

/**
 * Detect CTA (Call-to-Action) presence
 */
function detectCTA(
  textData: TextEstimationResult,
  colorData: ColorExtractionResult
): { hasCTA: boolean; ctaPosition?: 'top' | 'center' | 'bottom' } {
  // CTA heuristics:
  // 1. Bright/vibrant color (high saturation)
  // 2. Located in bottom or center
  // 3. Text present in that region

  const hasVibrantColor = colorData.averageSaturation > 0.5;
  const hasBottomText = textData.hasBottomText;
  const hasCenterText = textData.hasCenterText;

  if (!hasVibrantColor && !hasBottomText && !hasCenterText) {
    return { hasCTA: false };
  }

  // Likely CTA patterns
  if (hasBottomText && hasVibrantColor) {
    return { hasCTA: true, ctaPosition: 'bottom' };
  }

  if (hasCenterText && hasVibrantColor) {
    return { hasCTA: true, ctaPosition: 'center' };
  }

  // Weak CTA detection
  if (hasBottomText) {
    return { hasCTA: true, ctaPosition: 'bottom' };
  }

  return { hasCTA: false };
}

/**
 * Calculate layout quality score (0-100)
 */
function calculateLayoutScore(
  layoutType: LayoutType,
  textToImageRatio: number,
  visualDensity: number,
  hasCTA: boolean
): number {
  let score = 50; // Base score

  // Bonus for balanced layouts
  if (layoutType === 'balanced') {
    score += 20;
  } else if (layoutType === 'text-heavy' || layoutType === 'image-heavy') {
    score += 10;
  }

  // Bonus for good text-to-image ratio (20-60% text is ideal)
  if (textToImageRatio >= 0.2 && textToImageRatio <= 0.6) {
    score += 15;
  } else if (textToImageRatio < 0.1 || textToImageRatio > 0.8) {
    score -= 10;
  }

  // Penalty for extreme visual density
  if (visualDensity > 0.8) {
    score -= 15; // Too cluttered
  } else if (visualDensity < 0.2) {
    score -= 10; // Too empty
  } else if (visualDensity >= 0.4 && visualDensity <= 0.6) {
    score += 10; // Ideal density
  }

  // Bonus for CTA presence
  if (hasCTA) {
    score += 15;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate confidence in layout analysis
 */
function calculateLayoutConfidence(
  textData: TextEstimationResult,
  colorData: ColorExtractionResult
): number {
  let confidence = 0.5; // Base confidence

  // Higher text density = higher confidence in text analysis
  if (textData.textDensity > 0.3) {
    confidence += 0.2;
  }

  // More text regions = higher confidence
  if (textData.textRegions.length >= 5) {
    confidence += 0.15;
  }

  // More colors = higher confidence in visual analysis
  if (colorData.colorCount >= 4) {
    confidence += 0.15;
  }

  return Math.min(confidence, 1);
}

/**
 * Get layout type description
 */
export function getLayoutDescription(layoutType: LayoutType): string {
  const descriptions: Record<LayoutType, string> = {
    'text-heavy': 'High text content with detailed information',
    'image-heavy': 'Visual-first with minimal text overlay',
    'balanced': 'Even distribution of text and visuals',
    'top-heavy': 'Content concentrated in upper section',
    'bottom-heavy': 'Content concentrated in lower section',
    'centered': 'Centrally focused content layout'
  };

  return descriptions[layoutType];
}

/**
 * Get layout color (for badge display)
 */
export function getLayoutColor(layoutType: LayoutType): string {
  const colors: Record<LayoutType, string> = {
    'text-heavy': 'bg-blue-100 text-blue-700 border-blue-300',
    'image-heavy': 'bg-purple-100 text-purple-700 border-purple-300',
    'balanced': 'bg-green-100 text-green-700 border-green-300',
    'top-heavy': 'bg-amber-100 text-amber-700 border-amber-300',
    'bottom-heavy': 'bg-orange-100 text-orange-700 border-orange-300',
    'centered': 'bg-cyan-100 text-cyan-700 border-cyan-300'
  };

  return colors[layoutType];
}
