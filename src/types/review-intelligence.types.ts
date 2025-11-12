/**
 * ENHANCED REVIEW INTELLIGENCE TYPES
 * 
 * Multi-dimensional sentiment analysis and actionable insights system
 * for transforming basic review data into enterprise-grade intelligence
 */

export interface EnhancedSentiment {
  // Primary sentiment (existing compatibility)
  overall: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-1 confidence score
  
  // Emotional granularity (NEW)
  emotions: {
    joy: number;          // 0-1 scale
    frustration: number;  // 0-1 scale  
    excitement: number;   // 0-1 scale
    disappointment: number; // 0-1 scale
    anger: number;        // 0-1 scale
  };
  
  // Aspect-based sentiment (NEW)
  aspects: {
    ui_ux: 'positive' | 'neutral' | 'negative' | null;
    performance: 'positive' | 'neutral' | 'negative' | null;
    features: 'positive' | 'neutral' | 'negative' | null;
    pricing: 'positive' | 'neutral' | 'negative' | null;
    support: 'positive' | 'neutral' | 'negative' | null;
  };
  
  // Sentiment intensity (NEW)
  intensity: 'mild' | 'moderate' | 'strong' | 'extreme';
}

export interface GooglePlayMetrics {
  developerResponseRate: number;      // 0-1 percentage of reviews with developer reply
  avgResponseTimeHours: number;       // Average hours to respond to reviews
  reviewsWithReplies: number;         // Count of reviews with developer responses
  helpfulReviewsCount: number;        // Reviews with thumbs_up > 5
  topRepliedThemes: string[];         // Themes most often replied to by developer
}

export interface ReviewIntelligence {
  // Theme extraction (NEW)
  themes: {
    theme: string;           // e.g., "checkout problems"
    frequency: number;       // how often mentioned
    sentiment: number;       // average sentiment for this theme (-1 to 1)
    examples: string[];      // sample review excerpts
    trending: 'up' | 'down' | 'stable'; // trend direction
  }[];

  // Feature mentions (NEW)
  featureMentions: {
    feature: string;         // e.g., "dark mode", "notifications"
    mentions: number;        // times mentioned
    sentiment: number;       // average sentiment (-1 to 1)
    impact: 'high' | 'medium' | 'low'; // user impact level
  }[];

  // Issue patterns (NEW)
  issuePatterns: {
    issue: string;          // e.g., "app crashes on startup"
    frequency: number;      // how often reported
    severity: 'critical' | 'major' | 'minor';
    affectedVersions: string[]; // if determinable
    firstSeen: Date;        // when first reported
  }[];

  // Google Play specific metrics (Android only)
  googlePlayMetrics?: GooglePlayMetrics;
}

export interface ActionableInsights {
  // Priority issues (NEW)
  priorityIssues: {
    issue: string;          // "Users report checkout failures"
    impact: number;         // 0-1 impact score
    affectedUsers: number;  // estimated user count
    recommendation: string; // specific action to take
    urgency: 'immediate' | 'high' | 'medium' | 'low';
  }[];
  
  // Improvement opportunities (NEW)  
  improvements: {
    opportunity: string;    // "Add dark mode feature"
    userDemand: number;    // 0-1 demand score based on mentions
    businessImpact: 'high' | 'medium' | 'low';
    effort: 'small' | 'medium' | 'large'; // estimated effort
    roi: number;           // potential ROI score
  }[];
  
  // Trend alerts (NEW)
  alerts: {
    type: 'sentiment_drop' | 'issue_spike' | 'feature_request' | 'competitive_mention';
    severity: 'critical' | 'warning' | 'info';
    message: string;       // human-readable alert
    data: any;            // supporting data
    actionable: boolean;   // requires immediate action
  }[];
}

export interface InsightCard {
  title: string;           // e.g., "Critical Issues This Week"
  insight: string;         // AI-generated summary
  metrics: {
    primary: { value: number; label: string; trend?: 'up' | 'down' };
    secondary: { value: number; label: string; trend?: 'up' | 'down' }[];
  };
  actions: {
    label: string;         // "View Related Reviews"
    action: string;        // function to call
  }[];
  urgency: 'high' | 'medium' | 'low';
}

// Enhanced review item with intelligence
export interface EnhancedReviewItem {
  // Original fields
  review_id: string;
  title: string;
  text: string;
  rating: number;
  version?: string;
  author?: string;
  updated_at?: string;
  review_date?: string;
  country: string;
  app_id: string;
  platform?: 'ios' | 'android';  // Platform (iOS or Android)

  // Google Play specific fields (Android only)
  developer_reply?: string;
  developer_reply_date?: string;
  thumbs_up_count?: number;
  reviewer_language?: string;

  // Enhanced intelligence fields
  enhancedSentiment?: EnhancedSentiment;
  extractedThemes?: string[];
  mentionedFeatures?: string[];
  identifiedIssues?: string[];
  businessImpact?: 'high' | 'medium' | 'low';
}

export interface ReviewAnalytics {
  totalReviews: number;
  averageRating: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  positivePercentage: number; // Convenience field for positive sentiment percentage
  emotionalProfile: {
    joy: number;
    frustration: number;
    excitement: number;
    disappointment: number;
    anger: number;
  };
  topThemes: string[];
  criticalIssues: number;
  trendingTopics: string[];
}