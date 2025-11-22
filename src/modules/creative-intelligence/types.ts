/**
 * Creative Intelligence Module - Type Definitions
 *
 * Core types for the Creative Intelligence system.
 * Handles screenshot analysis, creative insights, competitor comparison,
 * and historical tracking.
 *
 * Phase 0: Infrastructure scaffolding (21.11.2025)
 */

/**
 * Screenshot metadata from App Store
 */
export interface Screenshot {
  id: string;
  appId: string;
  url: string;
  index: number;
  deviceType: 'iphone' | 'ipad';
  width: number;
  height: number;
  fetchedAt: Date;
  locale?: string;
}

/**
 * Creative analysis result (stub for future OCR/CV integration)
 */
export interface CreativeAnalysis {
  screenshotId: string;
  appId: string;

  // Future: OCR text extraction
  extractedText?: string[];

  // Future: Visual theme classification
  theme?: CreativeTheme;

  // Future: Element detection
  elements?: CreativeElement[];

  // Metadata
  analyzedAt: Date;
  version: string;
}

/**
 * Creative theme classification (stub for future ML model)
 */
export interface CreativeTheme {
  primary: string;
  secondary?: string;
  confidence: number;
  colors: string[];
  style: 'minimal' | 'vibrant' | 'dark' | 'light' | 'gradient' | 'photo' | 'illustration';
}

/**
 * Detected creative element (stub for future CV model)
 */
export interface CreativeElement {
  type: 'text' | 'button' | 'icon' | 'image' | 'badge' | 'rating';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  text?: string;
}

/**
 * Competitor screenshot for comparison
 */
export interface CompetitorScreenshot {
  competitorAppId: string;
  competitorName: string;
  screenshots: Screenshot[];
  lastFetched: Date;
}

/**
 * Screenshot diff result (for historical tracking)
 */
export interface ScreenshotDiff {
  screenshotId: string;
  previousScreenshotId: string;
  appId: string;
  diffType: 'added' | 'removed' | 'modified';
  changes: ScreenshotChange[];
  detectedAt: Date;
}

/**
 * Individual change in screenshot
 */
export interface ScreenshotChange {
  type: 'text' | 'layout' | 'color' | 'element';
  description: string;
  confidence: number;
}

/**
 * Creative insights (AI-generated recommendations)
 */
export interface CreativeInsight {
  id: string;
  appId: string;
  category: 'messaging' | 'design' | 'layout' | 'cta' | 'social-proof' | 'features';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  evidence: string[];
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Creative strategy recommendations
 */
export interface CreativeStrategy {
  appId: string;
  targetAudience: string;
  recommendedThemes: CreativeTheme[];
  messagingFramework: MessagingFramework;
  designPrinciples: string[];
  competitorAnalysis: CompetitorAnalysis[];
  actionItems: ActionItem[];
  generatedAt: Date;
}

/**
 * Messaging framework
 */
export interface MessagingFramework {
  primaryValue: string;
  secondaryValues: string[];
  callsToAction: string[];
  socialProof: string[];
}

/**
 * Competitor creative analysis
 */
export interface CompetitorAnalysis {
  competitorAppId: string;
  competitorName: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
}

/**
 * Action item for creative strategy
 */
export interface ActionItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

/**
 * Fetch options for creative data
 */
export interface CreativeFetchOptions {
  appId: string;
  country?: string;
  includeCompetitors?: boolean;
  competitorAppIds?: string[];
  fetchHistory?: boolean;
}

/**
 * Creative analysis request
 */
export interface CreativeAnalysisRequest {
  screenshots: Screenshot[];
  analysisType: 'ocr' | 'theme' | 'elements' | 'full';
  options?: {
    detectText?: boolean;
    detectTheme?: boolean;
    detectElements?: boolean;
  };
}

/**
 * Creative storage operation result
 */
export interface CreativeStorageResult {
  success: boolean;
  recordsStored: number;
  errors?: string[];
}
