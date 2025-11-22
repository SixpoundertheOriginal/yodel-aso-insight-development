/**
 * Creative Intelligence Registry - Type Definitions
 *
 * Defines all TypeScript interfaces for the Creative Intelligence Registry system.
 * These types support theme classification, metric scoring, validators, and rubrics.
 *
 * @module creative-intelligence.types
 */

/**
 * Visual theme for creative elements
 */
export interface CreativeTheme {
  id: string;
  name: string;
  description: string;
  categories: string[];
  characteristics: {
    visualDensity: 'low' | 'medium' | 'high';
    colorPalette: 'muted' | 'vibrant' | 'gradient' | 'monochrome';
    typography: 'minimal' | 'bold' | 'decorative';
    composition: 'centered' | 'asymmetric' | 'grid' | 'dynamic';
    textRatio: number;
    ctaPresence: boolean;
  };
  benchmarks: {
    topPerformingApps: string[];
    avgScore: number;
    categoryFit: Record<string, number>;
  };
  aiPromptHints: string[];
}

/**
 * Scoring criteria for a specific performance tier
 */
export interface ScoringCriteria {
  min: number;
  description: string;
}

/**
 * Focus area for creative analysis
 */
export interface CreativeFocusArea {
  id: string;
  description: string;
}

/**
 * Creative metric for scoring
 */
export interface CreativeMetric {
  id: string;
  name: string;
  description: string;
  category: 'visual' | 'text' | 'messaging' | 'engagement';
  weight: number;
  elementTypes: ('screenshots' | 'icon' | 'preview-video' | 'description')[];
  scoringCriteria: {
    excellent: ScoringCriteria;
    good: ScoringCriteria;
    average: ScoringCriteria;
    poor: ScoringCriteria;
  };
  calculationMethod: 'ai' | 'rule-based' | 'hybrid';
  aiPromptTemplate?: string;
  focusAreas: CreativeFocusArea[];
}

/**
 * Validation result for creative element
 */
export interface ValidationResult {
  passed: boolean;
  score: number;
  message: string;
  suggestion?: string;
  autoFixAction?: string;
}

/**
 * Creative element to be validated
 */
export interface CreativeElement {
  type: 'screenshot' | 'icon' | 'preview-video' | 'description';
  screenshots?: any[];
  description?: string;
  width?: number;
  height?: number;
  detectedTheme?: { id: string; name: string };
  appCategory?: string;
}

/**
 * Validator function type
 */
export type ValidatorFunction = (element: CreativeElement) => ValidationResult;

/**
 * Creative validator
 */
export interface CreativeValidator {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'technical' | 'content' | 'best-practice';
  elementTypes: ('screenshots' | 'icon' | 'preview-video' | 'description')[];
  validate: ValidatorFunction;
  autoFixAvailable: boolean;
}

/**
 * Category-specific scoring rubric
 */
export interface CategoryScoringRubric {
  category: string;
  weights: {
    visual: number;
    text: number;
    messaging: number;
    engagement: number;
  };
  themePreferences: string[];
  minRequirements: {
    screenshotCount: number;
    descriptionLength: number;
    iconResolution: [number, number];
  };
  competitiveThresholds: {
    excellent: number;
    good: number;
    average: number;
  };
}

/**
 * Performance tier for scoring
 */
export type PerformanceTier = 'excellent' | 'good' | 'average' | 'poor';

/**
 * Score breakdown by metric category
 */
export interface ScoreBreakdown {
  visual: number;
  text: number;
  messaging: number;
  engagement: number;
  overall: number;
}

/**
 * Complete creative analysis result
 */
export interface CreativeAnalysisResult {
  appId: string;
  appName: string;
  category?: string;
  scores: ScoreBreakdown;
  performanceTier: PerformanceTier;
  detectedTheme?: CreativeTheme;
  validationResults: ValidationResult[];
  recommendations: string[];
  competitivePosition?: {
    percentile: number;
    vsAverage: number;
  };
}
