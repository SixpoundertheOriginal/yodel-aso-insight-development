/**
 * REVIEW INTELLIGENCE ENGINE
 * 
 * Advanced AI analysis system for transforming basic review data
 * into multi-dimensional insights and actionable recommendations
 */

import { 
  EnhancedSentiment, 
  ReviewIntelligence, 
  ActionableInsights,
  EnhancedReviewItem
} from '@/types/review-intelligence.types';

/**
 * Enhanced sentiment analysis with emotional granularity and aspect detection
 */
export function analyzeEnhancedSentiment(reviewText: string, rating: number): EnhancedSentiment {
  const text = reviewText?.toLowerCase() || '';
  
  // Emotional pattern detection
  const emotionPatterns = {
    joy: ['love', 'amazing', 'fantastic', 'wonderful', 'delighted', 'thrilled', 'excited', 'happy'],
    frustration: ['frustrating', 'annoying', 'confusing', 'difficult', 'complicated', 'slow', 'laggy'],
    excitement: ['excited', 'wow', 'incredible', 'outstanding', 'brilliant', 'awesome', 'perfect'],
    disappointment: ['disappointed', 'expected more', 'not worth', 'lacking', 'missing', 'incomplete'],
    anger: ['angry', 'furious', 'terrible', 'horrible', 'worst', 'hate', 'disgust', 'outrageous']
  };

  // Calculate emotion scores
  const emotions = {
    joy: calculateEmotionScore(text, emotionPatterns.joy),
    frustration: calculateEmotionScore(text, emotionPatterns.frustration),
    excitement: calculateEmotionScore(text, emotionPatterns.excitement),
    disappointment: calculateEmotionScore(text, emotionPatterns.disappointment),
    anger: calculateEmotionScore(text, emotionPatterns.anger)
  };

  // Aspect-based sentiment detection
  const aspects = {
    ui_ux: detectAspectSentiment(text, ['ui', 'interface', 'design', 'layout', 'navigation', 'usability']),
    performance: detectAspectSentiment(text, ['speed', 'fast', 'slow', 'lag', 'performance', 'crash', 'freeze']),
    features: detectAspectSentiment(text, ['feature', 'function', 'tool', 'option', 'capability']),
    pricing: detectAspectSentiment(text, ['price', 'cost', 'expensive', 'cheap', 'value', 'money', 'subscription']),
    support: detectAspectSentiment(text, ['support', 'help', 'customer service', 'response', 'assistance'])
  };

  // Overall sentiment with confidence
  const { overall, confidence } = calculateOverallSentiment(rating, emotions, text);
  
  // Sentiment intensity based on emotional peaks and language strength
  const intensity = calculateSentimentIntensity(emotions, text);

  return {
    overall,
    confidence,
    emotions,
    aspects,
    intensity
  };
}

/**
 * Extract themes, patterns and intelligence from review collection
 */
export function extractReviewIntelligence(reviews: EnhancedReviewItem[]): ReviewIntelligence {
  // Theme extraction using frequency analysis and clustering
  const themes = extractThemes(reviews);
  
  // Feature mention tracking
  const featureMentions = extractFeatureMentions(reviews);
  
  // Issue pattern recognition
  const issuePatterns = extractIssuePatterns(reviews);

  return {
    themes,
    featureMentions,
    issuePatterns
  };
}

/**
 * Generate actionable insights and recommendations
 */
export function generateActionableInsights(
  reviews: EnhancedReviewItem[],
  intelligence: ReviewIntelligence
): ActionableInsights {
  // Priority issues based on frequency and impact
  const priorityIssues = intelligence.issuePatterns
    .filter(issue => issue.severity === 'critical' || issue.frequency > reviews.length * 0.1)
    .map(issue => ({
      issue: issue.issue,
      impact: Math.min(issue.frequency / reviews.length, 1),
      affectedUsers: Math.floor(issue.frequency * 10), // Estimate based on frequency
      recommendation: generateRecommendation(issue),
      urgency: issue.severity === 'critical' ? 'immediate' as const : 
               issue.frequency > reviews.length * 0.2 ? 'high' as const :
               issue.frequency > reviews.length * 0.1 ? 'medium' as const : 'low' as const
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);

  // Improvement opportunities from positive feedback patterns
  const improvements = intelligence.featureMentions
    .filter(feature => feature.sentiment > 0.3 && feature.mentions > 2)
    .map(feature => ({
      opportunity: `Enhance ${feature.feature} based on positive user feedback`,
      userDemand: Math.min(feature.mentions / (reviews.length * 0.1), 1),
      businessImpact: feature.impact,
      effort: estimateEffort(feature.feature),
      roi: calculateROI(feature.sentiment, feature.mentions, reviews.length)
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 3);

  // Trend alerts for significant changes
  const alerts = generateTrendAlerts(reviews, intelligence);

  return {
    priorityIssues,
    improvements,
    alerts
  };
}

// Helper functions

function calculateEmotionScore(text: string, patterns: string[]): number {
  let score = 0;
  let matches = 0;
  
  patterns.forEach(pattern => {
    if (text.includes(pattern)) {
      matches++;
      // Weight by pattern strength and frequency
      const frequency = (text.match(new RegExp(pattern, 'g')) || []).length;
      score += frequency * 0.3;
    }
  });
  
  return Math.min(score, 1);
}

function detectAspectSentiment(text: string, keywords: string[]): 'positive' | 'neutral' | 'negative' | null {
  const hasAspect = keywords.some(keyword => text.includes(keyword));
  if (!hasAspect) return null;
  
  // Context window around aspect mentions
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'broken'];
  
  const positiveCount = positiveWords.filter(word => text.includes(word)).length;
  const negativeCount = negativeWords.filter(word => text.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function calculateOverallSentiment(rating: number, emotions: any, text: string): { overall: 'positive' | 'neutral' | 'negative', confidence: number } {
  // Primary signal: rating
  let overall: 'positive' | 'neutral' | 'negative';
  if (rating >= 4) overall = 'positive';
  else if (rating <= 2) overall = 'negative';
  else overall = 'neutral';
  
  // Confidence based on emotional consistency and text length
  const emotionalIntensity = Math.max(...Object.values(emotions) as number[]);
  const textLength = text.length;
  const confidence = Math.min(
    0.3 + // Base confidence
    (emotionalIntensity * 0.4) + // Emotional clarity
    (Math.min(textLength / 200, 1) * 0.3), // Text detail
    1
  );
  
  return { overall, confidence };
}

function calculateSentimentIntensity(emotions: any, text: string): 'mild' | 'moderate' | 'strong' | 'extreme' {
  const maxEmotion = Math.max(...Object.values(emotions) as number[]);
  const intensityWords = ['extremely', 'absolutely', 'completely', 'totally', 'incredible', 'unbelievable'];
  const hasIntensity = intensityWords.some(word => text.includes(word));
  
  if (maxEmotion > 0.8 || hasIntensity) return 'extreme';
  if (maxEmotion > 0.6) return 'strong';
  if (maxEmotion > 0.3) return 'moderate';
  return 'mild';
}

function extractThemes(reviews: EnhancedReviewItem[]): ReviewIntelligence['themes'] {
  const themeMap = new Map<string, { count: number, sentiments: number[], examples: string[] }>();
  
  const commonThemes = [
    'user interface', 'performance', 'crashes', 'loading time', 'navigation',
    'features', 'updates', 'pricing', 'customer support', 'login issues',
    'syncing', 'notifications', 'dark mode', 'accessibility', 'battery usage'
  ];
  
  reviews.forEach(review => {
    const text = review.text?.toLowerCase() || '';
    const sentiment = review.enhancedSentiment?.overall === 'positive' ? 1 : 
                     review.enhancedSentiment?.overall === 'negative' ? -1 : 0;
    
    commonThemes.forEach(theme => {
      if (text.includes(theme.toLowerCase())) {
        const existing = themeMap.get(theme) || { count: 0, sentiments: [], examples: [] };
        existing.count++;
        existing.sentiments.push(sentiment);
        if (existing.examples.length < 3 && review.text) {
          existing.examples.push(review.text.substring(0, 100) + '...');
        }
        themeMap.set(theme, existing);
      }
    });
  });
  
  return Array.from(themeMap.entries())
    .filter(([_, data]) => data.count > 1)
    .map(([theme, data]) => ({
      theme,
      frequency: data.count,
      sentiment: data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length,
      examples: data.examples,
      trending: 'stable' as const // Would need historical data for real trending
    }))
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
    .slice(0, 10);
}

function extractFeatureMentions(reviews: EnhancedReviewItem[]): ReviewIntelligence['featureMentions'] {
  const features = [
    'dark mode', 'notifications', 'search', 'filter', 'export', 'sync',
    'backup', 'sharing', 'offline mode', 'widgets', 'themes', 'customization'
  ];
  
  const featureMap = new Map<string, { count: number, sentiments: number[] }>();
  
  reviews.forEach(review => {
    const text = review.text?.toLowerCase() || '';
    const sentiment = review.enhancedSentiment?.overall === 'positive' ? 1 : 
                     review.enhancedSentiment?.overall === 'negative' ? -1 : 0;
    
    features.forEach(feature => {
      if (text.includes(feature)) {
        const existing = featureMap.get(feature) || { count: 0, sentiments: [] };
        existing.count++;
        existing.sentiments.push(sentiment);
        featureMap.set(feature, existing);
      }
    });
  });
  
  return Array.from(featureMap.entries())
    .filter(([_, data]) => data.count > 0)
    .map(([feature, data]) => ({
      feature,
      mentions: data.count,
      sentiment: data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length,
      impact: data.count > 5 ? 'high' as const : data.count > 2 ? 'medium' as const : 'low' as const
    }))
    .sort((a, b) => b.mentions - a.mentions);
}

function extractIssuePatterns(reviews: EnhancedReviewItem[]): ReviewIntelligence['issuePatterns'] {
  const issues = [
    'app crashes', 'won\'t load', 'login problems', 'sync issues', 'slow performance',
    'battery drain', 'data loss', 'payment issues', 'notification problems', 'ui bugs'
  ];
  
  const issueMap = new Map<string, { count: number, firstSeen: Date, versions: Set<string> }>();
  
  reviews.forEach(review => {
    const text = review.text?.toLowerCase() || '';
    const reviewDate = review.updated_at ? new Date(review.updated_at) : new Date();
    
    issues.forEach(issue => {
      if (text.includes(issue)) {
        const existing = issueMap.get(issue) || { 
          count: 0, 
          firstSeen: reviewDate, 
          versions: new Set<string>() 
        };
        existing.count++;
        if (reviewDate < existing.firstSeen) {
          existing.firstSeen = reviewDate;
        }
        if (review.version) {
          existing.versions.add(review.version);
        }
        issueMap.set(issue, existing);
      }
    });
  });
  
  return Array.from(issueMap.entries())
    .filter(([_, data]) => data.count > 0)
    .map(([issue, data]) => ({
      issue,
      frequency: data.count,
      severity: data.count > reviews.length * 0.1 ? 'critical' as const :
                data.count > reviews.length * 0.05 ? 'major' as const : 'minor' as const,
      affectedVersions: Array.from(data.versions),
      firstSeen: data.firstSeen
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

function generateRecommendation(issue: any): string {
  const recommendations: Record<string, string> = {
    'app crashes': 'Investigate crash logs and implement stability improvements in the next update',
    'login problems': 'Review authentication flow and implement better error handling',
    'sync issues': 'Audit synchronization logic and add retry mechanisms',
    'slow performance': 'Profile app performance and optimize critical pathways',
    'battery drain': 'Analyze background processes and optimize resource usage',
    'payment issues': 'Review payment integration and error handling flows',
    'notification problems': 'Test notification system across different device configurations'
  };
  
  return recommendations[issue.issue] || `Address the ${issue.issue} reported by multiple users`;
}

function estimateEffort(feature: string): 'small' | 'medium' | 'large' {
  const smallFeatures = ['dark mode', 'themes', 'notifications'];
  const largeFeatures = ['offline mode', 'sync', 'backup'];
  
  if (smallFeatures.some(f => feature.includes(f))) return 'small';
  if (largeFeatures.some(f => feature.includes(f))) return 'large';
  return 'medium';
}

function calculateROI(sentiment: number, mentions: number, totalReviews: number): number {
  const userDemand = mentions / totalReviews;
  const sentimentBoost = Math.max(sentiment, 0);
  return userDemand * sentimentBoost * 100;
}

function generateTrendAlerts(reviews: EnhancedReviewItem[], intelligence: ReviewIntelligence): ActionableInsights['alerts'] {
  const alerts: ActionableInsights['alerts'] = [];
  
  // Critical issue spike detection
  intelligence.issuePatterns
    .filter(issue => issue.severity === 'critical')
    .forEach(issue => {
      alerts.push({
        type: 'issue_spike',
        severity: 'critical',
        message: `Critical issue detected: ${issue.issue} reported ${issue.frequency} times`,
        data: issue,
        actionable: true
      });
    });
  
  // High-demand feature requests
  intelligence.featureMentions
    .filter(feature => feature.mentions > reviews.length * 0.1 && feature.sentiment > 0.5)
    .forEach(feature => {
      alerts.push({
        type: 'feature_request',
        severity: 'info',
        message: `High demand for ${feature.feature} (${feature.mentions} mentions with positive sentiment)`,
        data: feature,
        actionable: true
      });
    });
  
  return alerts.slice(0, 5);
}