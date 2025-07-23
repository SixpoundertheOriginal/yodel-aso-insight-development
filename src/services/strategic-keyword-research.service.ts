import { supabase } from '@/integrations/supabase/client';
import { DiscoveredKeyword, KeywordDiscoveryService } from 'supabase/functions/app-store-scraper/services/keyword-discovery.service';

export interface PreLaunchAppData {
  appName: string;
  appConcept: string;
  targetCategory: string;
  targetAudience: string;
  keyFeatures: string;
  differentiators: string;
  targetCountry: string;
}

export interface CategoryIntelligence {
  category: string;
  topApps: Array<{
    name: string;
    appId: string;
    rank: number;
    description: string;
    keywords: string[];
  }>;
  commonKeywords: string[];
  trendingKeywords: string[];
  competitionLevel: 'low' | 'medium' | 'high';
  opportunityKeywords: string[];
}

export interface StrategicKeywordResult {
  discoveredKeywords: DiscoveredKeyword[];
  categoryIntelligence: CategoryIntelligence;
  strategicRecommendations: {
    primaryKeywords: string[];
    secondaryKeywords: string[];
    longTailKeywords: string[];
    positioning: string;
    differentiationStrategy: string;
  };
  aiGeneratedMetadata: {
    title: string;
    subtitle: string;
    description: string;
    keywords: string;
  };
}

class StrategicKeywordResearchService {
  private keywordDiscoveryService = new KeywordDiscoveryService();

  /**
   * Main orchestrator for pre-launch strategic research
   */
  async generateStrategicResearch(
    organizationId: string,
    appData: PreLaunchAppData,
    onProgress?: (progress: number, message: string) => void
  ): Promise<StrategicKeywordResult> {
    console.log('🚀 [STRATEGIC] Starting pre-launch research for:', appData.appName);
    
    try {
      // Phase 1: Category Intelligence (25%)
      onProgress?.(25, 'Analyzing category landscape and top performers...');
      const categoryIntelligence = await this.analyzeCategoryIntelligence(appData);
      
      // Phase 2: Strategic Keyword Discovery (50%)
      onProgress?.(50, 'Discovering strategic keywords and opportunities...');
      const discoveredKeywords = await this.discoverStrategicKeywords(organizationId, appData, categoryIntelligence);
      
      // Phase 3: Strategic Recommendations (75%)
      onProgress?.(75, 'Generating positioning strategy and recommendations...');
      const strategicRecommendations = await this.generateStrategicRecommendations(appData, discoveredKeywords, categoryIntelligence);
      
      // Phase 4: AI Metadata Generation (100%)
      onProgress?.(90, 'Creating optimized metadata with AI...');
      const aiGeneratedMetadata = await this.generateOptimizedMetadata(appData, discoveredKeywords, strategicRecommendations);
      
      onProgress?.(100, 'Strategic research complete!');
      
      return {
        discoveredKeywords,
        categoryIntelligence,
        strategicRecommendations,
        aiGeneratedMetadata
      };
      
    } catch (error) {
      console.error('❌ [STRATEGIC] Research failed:', error);
      throw new Error(`Strategic research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze category intelligence by researching top apps
   */
  private async analyzeCategoryIntelligence(appData: PreLaunchAppData): Promise<CategoryIntelligence> {
    console.log('📊 [STRATEGIC] Analyzing category:', appData.targetCategory);
    
    // Get category-specific top apps using edge function
    const { data: topAppsData, error } = await supabase.functions.invoke('app-store-scraper', {
      body: {
        action: 'category_analysis',
        category: appData.targetCategory,
        country: appData.targetCountry,
        limit: 20
      }
    });

    if (error) {
      console.warn('⚠️ [STRATEGIC] Failed to fetch top apps, using fallback data');
    }

    // Process top apps data (real or mock)
    const topApps = topAppsData?.apps || this.getMockTopApps(appData.targetCategory);
    
    // Extract common keywords from successful apps
    const allKeywords: string[] = [];
    topApps.forEach((app: any) => {
      if (app.keywords) {
        allKeywords.push(...app.keywords);
      }
      // Extract keywords from app names and descriptions
      if (app.name) {
        allKeywords.push(...this.extractKeywordsFromText(app.name));
      }
      if (app.description) {
        allKeywords.push(...this.extractKeywordsFromText(app.description).slice(0, 5));
      }
    });

    // Count keyword frequency
    const keywordFrequency = this.countKeywordFrequency(allKeywords);
    const commonKeywords = Object.entries(keywordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([keyword]) => keyword);

    // Generate trending keywords based on category
    const trendingKeywords = this.generateCategoryTrendingKeywords(appData.targetCategory);
    
    // Identify opportunity keywords (less common but relevant)
    const opportunityKeywords = this.identifyOpportunityKeywords(appData, keywordFrequency);
    
    // Assess competition level
    const competitionLevel = this.assessCompetitionLevel(topApps);

    return {
      category: appData.targetCategory,
      topApps: topApps.slice(0, 10),
      commonKeywords,
      trendingKeywords,
      competitionLevel,
      opportunityKeywords
    };
  }

  /**
   * Discover strategic keywords using enhanced research
   */
  private async discoverStrategicKeywords(
    organizationId: string,
    appData: PreLaunchAppData,
    categoryIntelligence: CategoryIntelligence
  ): Promise<DiscoveredKeyword[]> {
    console.log('🔍 [STRATEGIC] Discovering strategic keywords...');
    
    // Create strategic keyword discovery options
    const discoveryOptions = {
      organizationId,
      targetApp: {
        name: appData.appName,
        appId: 'pre-launch',
        category: appData.targetCategory,
        description: appData.appConcept,
        subtitle: appData.keyFeatures.split(',')[0]?.trim() || ''
      },
      seedKeywords: [
        ...categoryIntelligence.commonKeywords.slice(0, 10),
        ...categoryIntelligence.trendingKeywords,
        ...categoryIntelligence.opportunityKeywords,
        ...this.extractKeywordsFromText(appData.appConcept),
        ...this.extractKeywordsFromText(appData.keyFeatures)
      ],
      country: appData.targetCountry,
      maxKeywords: 75
    };

    // Use the enhanced keyword discovery service
    const discoveredKeywords = await this.keywordDiscoveryService.discoverKeywords(discoveryOptions);
    
    // Enhance with strategic scoring based on app concept
    return this.enhanceWithStrategicScoring(discoveredKeywords, appData, categoryIntelligence);
  }

  /**
   * Generate strategic recommendations based on research
   */
  private async generateStrategicRecommendations(
    appData: PreLaunchAppData,
    keywords: DiscoveredKeyword[],
    categoryIntelligence: CategoryIntelligence
  ) {
    // Categorize keywords by strategic value
    const highVolumeKeywords = keywords.filter(k => k.estimatedVolume > 2000).slice(0, 10);
    const lowCompetitionKeywords = keywords.filter(k => k.difficulty < 5).slice(0, 15);
    const brandKeywords = keywords.filter(k => k.keyword.includes(appData.appName.toLowerCase()));
    
    // Primary keywords (high volume, medium competition)
    const primaryKeywords = keywords
      .filter(k => k.estimatedVolume > 1500 && k.difficulty < 6)
      .slice(0, 8)
      .map(k => k.keyword);

    // Secondary keywords (good volume, lower competition)
    const secondaryKeywords = keywords
      .filter(k => k.estimatedVolume > 800 && k.difficulty < 5)
      .slice(0, 12)
      .map(k => k.keyword);

    // Long tail keywords (specific, lower competition)
    const longTailKeywords = keywords
      .filter(k => k.keyword.split(' ').length >= 3 && k.difficulty < 4)
      .slice(0, 10)
      .map(k => k.keyword);

    // Generate positioning strategy
    const positioning = this.generatePositioningStrategy(appData, categoryIntelligence);
    
    // Generate differentiation strategy
    const differentiationStrategy = this.generateDifferentiationStrategy(appData, categoryIntelligence);

    return {
      primaryKeywords,
      secondaryKeywords,
      longTailKeywords,
      positioning,
      differentiationStrategy
    };
  }

  /**
   * Generate optimized metadata using AI
   */
  private async generateOptimizedMetadata(
    appData: PreLaunchAppData,
    keywords: DiscoveredKeyword[],
    recommendations: any
  ) {
    console.log('🤖 [STRATEGIC] Generating AI-optimized metadata...');
    
    // Call AI metadata generation edge function
    const { data: metadataResult, error } = await supabase.functions.invoke('ai-insights-generator', {
      body: {
        action: 'generate_strategic_metadata',
        appData,
        keywords: keywords.slice(0, 30),
        recommendations,
        context: 'pre-launch-strategic'
      }
    });

    if (error || !metadataResult) {
      console.warn('⚠️ [STRATEGIC] AI generation failed, using template approach');
      return this.generateTemplateMetadata(appData, keywords, recommendations);
    }

    return metadataResult.metadata;
  }

  // Helper methods
  private extractKeywordsFromText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isCommonWord(word))
      .slice(0, 10);
  }

  private countKeywordFrequency(keywords: string[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    keywords.forEach(keyword => {
      const normalized = keyword.toLowerCase().trim();
      frequency[normalized] = (frequency[normalized] || 0) + 1;
    });
    return frequency;
  }

  private generateCategoryTrendingKeywords(category: string): string[] {
    const trendingMap: Record<string, string[]> = {
      productivity: ['ai assistant', 'automation', 'workflow', 'remote work'],
      health_fitness: ['wellness', 'mindfulness', 'home workout', 'nutrition'],
      education: ['online learning', 'skill development', 'micro learning'],
      entertainment: ['short video', 'interactive', 'personalized'],
      social_networking: ['community', 'creator tools', 'video chat'],
      finance: ['crypto', 'investment', 'budgeting', 'fintech']
    };
    
    return trendingMap[category] || ['mobile', 'user friendly', 'innovative'];
  }

  private identifyOpportunityKeywords(appData: PreLaunchAppData, keywordFrequency: Record<string, number>): string[] {
    // Look for keywords with medium frequency (not oversaturated, but proven valuable)
    const opportunities = Object.entries(keywordFrequency)
      .filter(([keyword, freq]) => freq >= 2 && freq <= 5)
      .filter(([keyword]) => keyword.length > 3)
      .sort(([,a], [,b]) => a - b)
      .slice(0, 10)
      .map(([keyword]) => keyword);
    
    return opportunities;
  }

  private assessCompetitionLevel(topApps: any[]): 'low' | 'medium' | 'high' {
    // Simple heuristic based on number of established apps
    if (topApps.length > 15) return 'high';
    if (topApps.length > 8) return 'medium';
    return 'low';
  }

  private enhanceWithStrategicScoring(
    keywords: DiscoveredKeyword[],
    appData: PreLaunchAppData,
    categoryIntelligence: CategoryIntelligence
  ): DiscoveredKeyword[] {
    return keywords.map(keyword => {
      let strategicScore = keyword.relevanceScore;
      
      // Boost keywords that appear in successful category apps
      if (categoryIntelligence.commonKeywords.includes(keyword.keyword)) {
        strategicScore += 2;
      }
      
      // Boost opportunity keywords
      if (categoryIntelligence.opportunityKeywords.includes(keyword.keyword)) {
        strategicScore += 3;
      }
      
      // Boost trending keywords
      if (categoryIntelligence.trendingKeywords.includes(keyword.keyword)) {
        strategicScore += 1.5;
      }
      
      // Boost keywords that match app concept
      if (appData.appConcept.toLowerCase().includes(keyword.keyword)) {
        strategicScore += 2.5;
      }
      
      return {
        ...keyword,
        relevanceScore: strategicScore
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private generatePositioningStrategy(appData: PreLaunchAppData, categoryIntelligence: CategoryIntelligence): string {
    const competitionText = categoryIntelligence.competitionLevel === 'high' 
      ? 'highly competitive' 
      : categoryIntelligence.competitionLevel === 'medium' 
        ? 'moderately competitive' 
        : 'emerging';
    
    return `Position ${appData.appName} as a ${appData.differentiators ? 'differentiated' : 'innovative'} solution in the ${competitionText} ${appData.targetCategory} space. Focus on ${appData.targetAudience || 'target users'} who need ${appData.appConcept.split('.')[0]?.toLowerCase()}. Emphasize unique value propositions that address gaps in current market offerings.`;
  }

  private generateDifferentiationStrategy(appData: PreLaunchAppData, categoryIntelligence: CategoryIntelligence): string {
    return `Differentiate through ${appData.differentiators || 'unique features and user experience'}. Target underserved keywords: ${categoryIntelligence.opportunityKeywords.slice(0, 3).join(', ')}. Avoid direct competition with oversaturated terms: ${categoryIntelligence.commonKeywords.slice(0, 2).join(', ')}.`;
  }

  private generateTemplateMetadata(appData: PreLaunchAppData, keywords: DiscoveredKeyword[], recommendations: any) {
    const topKeywords = keywords.slice(0, 5).map(k => k.keyword);
    
    return {
      title: `${appData.appName} - ${topKeywords[0] || appData.targetCategory}`,
      subtitle: `${topKeywords.slice(1, 3).join(' • ')} for ${appData.targetAudience || 'everyone'}`,
      description: `${appData.appConcept}\n\nKey features:\n${appData.keyFeatures}\n\n${appData.differentiators ? `What makes us different: ${appData.differentiators}` : ''}`,
      keywords: recommendations.primaryKeywords.concat(recommendations.secondaryKeywords).slice(0, 20).join(', ')
    };
  }

  private getMockTopApps(category: string) {
    // Mock data for development/fallback
    return [
      { name: `Top ${category} App 1`, appId: 'mock1', rank: 1, description: `Leading ${category} solution`, keywords: [`${category} app`, 'mobile'] },
      { name: `Top ${category} App 2`, appId: 'mock2', rank: 2, description: `Popular ${category} tool`, keywords: [`${category} tool`, 'user friendly'] },
      { name: `Top ${category} App 3`, appId: 'mock3', rank: 3, description: `Innovative ${category} platform`, keywords: [`${category} platform`, 'innovative'] }
    ];
  }

  private isCommonWord(word: string): boolean {
    const commonWords = ['the', 'and', 'for', 'with', 'your', 'you', 'are', 'can', 'will', 'app'];
    return commonWords.includes(word.toLowerCase());
  }
}

export const strategicKeywordResearchService = new StrategicKeywordResearchService();