

export interface ScrapedMetadata {
  name: string;
  url: string;
  appId: string;
  title: string;
  subtitle: string;
  description?: string;
  applicationCategory?: string;
  locale: string;
  icon?: string;
  [key: string]: unknown;
  developer?: string;
  rating?: number;
  reviews?: number;
  price?: string;

  // Source-specific metadata fields (Phase B enhancement)
  appStoreName?: string;        // From App Store HTML <h1> only
  appStoreSubtitle?: string;    // From App Store HTML <h2> only
  fallbackName?: string;        // From iTunes API trackName (parsed)
  fallbackSubtitle?: string;    // From iTunes API trackName (parsed)
  _htmlExtraction?: boolean;    // True if data came from HTML scraping

  // Subtitle extraction telemetry (Phase C: DOM extraction)
  subtitleSource?: 'dom' | 'fallback' | 'none' | null;  // Method used to extract subtitle

  // Creative assets
  screenshots?: string[]; // Primary field - array of screenshot URLs
  /** @deprecated Use screenshots (plural) instead - kept for backward compatibility */
  screenshot?: string;
  
  // Enhanced ASO Intelligence Fields
  searchContext?: {
    query: string;
    type: 'url' | 'keyword' | 'brand';
    totalResults: number;
    category: string;
    country: string;
  };
  
  asoIntelligence?: {
    keywordDifficulty?: number;
    marketSaturation?: number;
    trendingScore?: number;
    opportunities: string[];
  };
  
  competitorData?: CompetitorData[];
  marketInsights?: {
    totalCompetitors: number;
    category: string;
    searchType?: string;
    marketPosition: string;
  };
  
  // CPP Enhancement Fields
  screenshotAnalysis?: import('./cpp').ScreenshotAnalysis[];
  suggestedCppThemes?: import('./cpp').CppTheme[];
  competitorScreenshots?: import('./cpp').CompetitorScreenshot[];
}

export interface CompetitorData {
  id: string;
  name: string;
  title: string;
  subtitle?: string;
  keywords?: string;
  description?: string;
  category: string;
  rating?: number;
  reviews?: number;
  reviewCount?: number; // Added missing property
  icon?: string;
  developer?: string;
}

export interface CompetitorKeywordAnalysis {
  keyword: string;
  frequency: number;
  percentage: number;
  apps: string[];
}

export interface MetadataField {
  title: string;
  subtitle: string;
  keywords: string;
}

export interface MetadataScore {
  overall: number;
  title: number;
  subtitle: number;
  keywords: number;
  breakdown: {
    characterUsage: number;
    keywordDensity: number;
    uniqueness: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  sanitized: ScrapedMetadata;
}

export interface ImportConfig {
  organizationId: string;
  validateData?: boolean;
  includeCaching?: boolean;
  debugMode?: boolean;
  // Enhanced competitive intelligence options
  includeCompetitors?: boolean; // Added missing property
  maxCompetitors?: number;
  includeKeywordAnalysis?: boolean;
}

export interface ExportFormat {
  format: 'json' | 'csv' | 'xlsx';
  includeMetadata?: boolean;
  includeAnalytics?: boolean;
}

export interface KeywordData {
  keyword: string;
  volume?: number;
  difficulty?: number;
  relevancy?: number;
  chance?: number;
  rank?: number | null;
  maxReach?: number;
  results?: number;
  kei?: number;
}

// ASO Intelligence Types
export interface AsoIntelligence {
  keywordDifficulty: number;
  marketSaturation: number;
  trendingScore: number;
  opportunities: string[];
  competitorStrength?: number;
  marketGaps?: string[];
  recommendedKeywords?: string[];
}

export interface SearchContext {
  query: string;
  type: 'url' | 'keyword' | 'brand' | 'auto';
  totalResults: number;
  category: string;
  country: string;
  processingTime?: string;
}

// Re-export CPP types for convenience
export type { ScreenshotAnalysis, CppTheme, CompetitorScreenshot, CppStrategyData, CppConfig } from './cpp';

// Metrics and Insight Types
export interface MetricsData {
  summary: {
    impressions: { value: number; delta: number };
    downloads: { value: number; delta: number };
    product_page_views: { value: number; delta: number };
    cvr: { value: number; delta: number };
  };
  timeseriesData: TimeSeriesPoint[];
  trafficSources: TrafficSource[];
  metadata?: {
    totalRows: number;
    executionTime: number;
    cacheHit: boolean;
    availableTrafficSources: string[];
    isDemo?: boolean;
  };
}

export interface TimeSeriesPoint {
  date: string;
  impressions: number;
  downloads: number;
  product_page_views: number | null;
  conversion_rate: number;
}

export interface TrafficSource {
  traffic_source: string;
  traffic_source_display: string;
  impressions: number;
  downloads: number;
  product_page_views: number | null;
  conversion_rate: number;
}

export interface FilterContext {
  dateRange: {
    start: string;
    end: string;
  };
  trafficSources: string[];
  selectedApps: string[];
}

export interface EnhancedAsoInsight {
  id?: string;
  title: string;
  description: string;
  type: 'cvr_analysis' | 'impression_trends' | 'traffic_source_performance' |
        'keyword_optimization' | 'competitive_analysis' | 'seasonal_pattern' |
        'performance_alert' | 'configuration';
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  actionable_recommendations: string[];
  metrics_impact: {
    impressions?: string;
    downloads?: string;
    conversion_rate?: string;
  };
  related_kpis: string[];
  implementation_effort?: 'low' | 'medium' | 'high';
  expected_timeline?: string;
  is_user_requested?: boolean;
  created_at?: string;
}

