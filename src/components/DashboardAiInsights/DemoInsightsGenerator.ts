import type { EnhancedAsoInsight, MetricsData } from '@/types/aso';
import { INSIGHT_CATEGORIES } from './insightCategories';

export const generateDemoInsights = (metricsData: MetricsData | null): EnhancedAsoInsight[] => {
  if (!metricsData) return [];

  const insights: EnhancedAsoInsight[] = [];
  
  // Get key metrics for contextualization
  const impressions = metricsData.summary?.impressions?.value || 125000;
  const downloads = metricsData.summary?.downloads?.value || 8500;
  const impressionsDelta = metricsData.summary?.impressions?.delta || 15.2;
  const downloadsDelta = metricsData.summary?.downloads?.delta || 8.7;
  
  // Visibility Performance Insight
  insights.push({
    id: 'demo-visibility-1',
    title: 'Search Visibility Trending Up',
    description: `Your app's search visibility has improved by ${Math.abs(impressionsDelta).toFixed(1)}% this period with ${impressions.toLocaleString()} total impressions. Key opportunities in trending keywords could boost discovery by an additional 25-35%.`,
    type: 'impression_trends',
    priority: impressionsDelta > 10 ? 'high' : 'medium',
    confidence: 0.87,
    actionable_recommendations: [
      'Focus on top 10 trending keywords in your category',
      'Optimize app subtitle for seasonal search terms',
      'A/B test screenshots highlighting key features discovered in search'
    ],
    metrics_impact: {
      impressions: `Potential +${Math.round(impressions * 0.3).toLocaleString()} impressions`,
      downloads: `Estimated +${Math.round(downloads * 0.15).toLocaleString()} downloads`,
      conversion_rate: 'Maintain current CVR levels'
    },
    related_kpis: ['impressions', 'search_visibility', 'keyword_rankings'],
    is_user_requested: false,
    created_at: new Date().toISOString(),
    implementation_effort: 'medium',
    expected_timeline: '2-4 weeks'
  });

  // Conversion Performance Insight  
  insights.push({
    id: 'demo-conversion-1',
    title: 'Product Page CVR Optimization',
    description: `Current download rate shows ${downloadsDelta > 0 ? 'positive momentum' : 'room for improvement'} with ${downloadsDelta.toFixed(1)}% change. Users are engaging well with impressions but conversion can be optimized through strategic creative updates.`,
    type: 'cvr_analysis', 
    priority: downloadsDelta < 5 ? 'high' : 'medium',
    confidence: 0.92,
    actionable_recommendations: [
      'Update first 3 screenshots to showcase core value prop',
      'Refresh app preview video with user testimonials', 
      'Optimize app description first paragraph for mobile viewing'
    ],
    metrics_impact: {
      impressions: 'No significant impact expected',
      downloads: `Potential +${Math.round(downloads * 0.18).toLocaleString()} downloads`,
      conversion_rate: 'Target +1.2-2.1% CVR improvement'
    },
    related_kpis: ['downloads', 'product_page_cvr', 'product_page_views'],
    is_user_requested: false, 
    created_at: new Date().toISOString(),
    implementation_effort: 'low',
    expected_timeline: '1-2 weeks'
  });

  // Competitive Insights
  insights.push({
    id: 'demo-competitive-1',
    title: 'Market Position & Opportunities',
    description: `Analysis shows your app is well-positioned in the competitive landscape. ${impressions > 100000 ? 'Strong visibility metrics' : 'Growing visibility'} compared to category benchmarks with key opportunities in untapped keyword segments.`,
    type: 'competitive_analysis',
    priority: 'medium', 
    confidence: 0.83,
    actionable_recommendations: [
      'Target competitor gap keywords with 50K+ monthly volume',
      'Analyze top competitor creative strategies for inspiration',
      'Monitor seasonal trends where competitors show weaknesses'
    ],
    metrics_impact: {
      impressions: `Potential +${Math.round(impressions * 0.25).toLocaleString()} impressions`,
      downloads: `Estimated +${Math.round(downloads * 0.12).toLocaleString()} downloads`, 
      conversion_rate: 'Competitive advantage in key segments'
    },
    related_kpis: ['competitive_index', 'market_share', 'keyword_rankings'],
    is_user_requested: false,
    created_at: new Date().toISOString(),
    implementation_effort: 'high', 
    expected_timeline: '3-6 weeks'
  });

  return insights;
};