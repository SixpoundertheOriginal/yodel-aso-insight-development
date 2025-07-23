import { supabase } from '@/integrations/supabase/client';

export interface CompetitorApp {
  id: string;
  app_id: string;
  app_name: string;
  developer_name?: string;
  ranking_position: number;
  rating_score?: number;
  rating_count?: number;
  category?: string;
  title_keywords: string[];
  subtitle_keywords: string[];
  description_keywords: string[];
  ai_keyword_analysis?: any;
  competitive_strengths?: string;
  positioning_summary?: string;
}

export interface CompetitiveAnalysis {
  id: string;
  search_term: string;
  search_type: string;
  total_apps_analyzed: number;
  analysis_status: string;
  ai_summary?: string;
  insights?: any;
  analysis_date: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export interface CompetitiveInsights {
  summary: string;
  marketPositioning: {
    commonStrategies: string[];
    uniquePositions: string[];
    marketGaps: string[];
  };
  keywordInsights: {
    topKeywords: string[];
    underutilizedKeywords: string[];
    emergingTrends: string[];
  };
  competitiveOpportunities: {
    rankingOpportunities: string[];
    differentiationAreas: string[];
    marketEntry: string[];
  };
  ratingAndReviewInsights: {
    averageRating: number;
    ratingDistribution: string;
    reviewPatterns: string[];
  };
}

class EnhancedCompetitiveIntelligenceService {
  /**
   * Run comprehensive competitive analysis
   */
  async analyzeCompetitors(
    searchTerm: string, 
    analysisType: 'brand' | 'keyword' | 'category',
    organizationId: string,
    maxCompetitors: number = 10
  ): Promise<{
    analysisId: string;
    competitorApps: CompetitorApp[];
    insights: CompetitiveInsights;
    summary: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('competitive-intelligence', {
        body: {
          searchTerm,
          analysisType,
          organizationId,
          maxCompetitors
        }
      });

      if (error) {
        throw new Error(`Failed to analyze competitors: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Enhanced competitive analysis error:', error);
      throw error;
    }
  }

  /**
   * Get stored competitive analysis
   */
  async getAnalysis(analysisId: string): Promise<CompetitiveAnalysis | null> {
    try {
      const { data, error } = await supabase
        .from('competitor_analysis')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error) {
        console.error('Failed to fetch analysis:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Get analysis error:', error);
      return null;
    }
  }

  /**
   * Get competitor apps for an analysis
   */
  async getCompetitorApps(analysisId: string): Promise<CompetitorApp[]> {
    try {
      const { data, error } = await supabase
        .from('competitor_apps')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('ranking_position', { ascending: true });

      if (error) {
        console.error('Failed to fetch competitor apps:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get competitor apps error:', error);
      return [];
    }
  }

  /**
   * Get recent analyses for organization
   */
  async getRecentAnalyses(organizationId: string, limit: number = 10): Promise<CompetitiveAnalysis[]> {
    try {
      const { data, error } = await supabase
        .from('competitor_analysis')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch recent analyses:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get recent analyses error:', error);
      return [];
    }
  }

  /**
   * Search existing analyses
   */
  async searchAnalyses(
    organizationId: string, 
    searchTerm?: string, 
    analysisType?: string
  ): Promise<CompetitiveAnalysis[]> {
    try {
      let query = supabase
        .from('competitor_analysis')
        .select('*')
        .eq('organization_id', organizationId);

      if (searchTerm) {
        query = query.ilike('search_term', `%${searchTerm}%`);
      }

      if (analysisType) {
        query = query.eq('search_type', analysisType);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Failed to search analyses:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Search analyses error:', error);
      return [];
    }
  }

  /**
   * Get keyword intelligence for competitor apps
   */
  async getKeywordIntelligence(competitorAppId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('competitor_keyword_intelligence')
        .select('*')
        .eq('competitor_app_id', competitorAppId)
        .order('relevance_score', { ascending: false });

      if (error) {
        console.error('Failed to fetch keyword intelligence:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get keyword intelligence error:', error);
      return [];
    }
  }

  /**
   * Get competitive trends
   */
  async getCompetitiveTrends(organizationId: string, searchTerm: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('competitive_trends')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('search_term', searchTerm)
        .order('trend_date', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Failed to fetch competitive trends:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get competitive trends error:', error);
      return [];
    }
  }

  /**
   * Generate executive summary from insights
   */
  generateExecutiveSummary(insights: CompetitiveInsights): string {
    if (!insights || !insights.summary) {
      return 'Competitive analysis completed. Review detailed insights for strategic recommendations.';
    }

    const keywordCount = insights.keywordInsights?.topKeywords?.length || 0;
    const opportunityCount = insights.competitiveOpportunities?.rankingOpportunities?.length || 0;
    
    return `${insights.summary} Analysis identified ${keywordCount} key market keywords and ${opportunityCount} strategic opportunities for competitive advantage.`;
  }

  /**
   * Extract top keywords from competitor analysis
   */
  extractTopKeywords(competitorApps: CompetitorApp[]): { keyword: string; frequency: number }[] {
    const keywordMap = new Map<string, number>();

    competitorApps.forEach(app => {
      const allKeywords = [
        ...(app.title_keywords || []),
        ...(app.subtitle_keywords || []),
        ...(app.description_keywords || []).slice(0, 5) // Limit description keywords
      ];

      allKeywords.forEach(keyword => {
        if (keyword && keyword.length > 2) {
          keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 1);
        }
      });
    });

    return Array.from(keywordMap.entries())
      .map(([keyword, frequency]) => ({ keyword, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }
}

export const enhancedCompetitiveIntelligenceService = new EnhancedCompetitiveIntelligenceService();