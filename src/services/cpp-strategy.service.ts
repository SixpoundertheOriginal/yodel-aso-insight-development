
import { supabase } from '@/integrations/supabase/client';
import { ScrapedMetadata, CppConfig, CppStrategyData, CppTheme } from '@/types/aso';
import { securityService } from './security.service';
import { SecurityContext } from '@/types/security';

// New interface for ambiguous search results
export interface AmbiguousSearchResult {
  isAmbiguous: boolean;
  candidates: ScrapedMetadata[];
  searchTerm: string;
}

// Interface for CPP analysis configuration  
export interface CppAnalysisConfig {
  organizationId: string;
  includeScreenshotAnalysis?: boolean;
  generateThemes?: boolean;
  includeCompetitorAnalysis?: boolean;
  debugMode?: boolean;
}

class CppStrategyService {
  private cache = new Map<string, { data: CppStrategyData; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private auditLogger = { log: async (entry: any) => console.log('Audit:', entry) }; // Simplified for now

  private sanitizeInput(input: string): string {
    return input.trim().slice(0, 500); // Basic sanitization
  }

  /**
   * Search for apps with rich metadata for selection (Phase 1)
   */
  async searchAppsForCpp(
    searchTerm: string,
    config: CppAnalysisConfig,
    securityContext: SecurityContext
  ): Promise<AmbiguousSearchResult> {
    const sanitizedSearchTerm = this.sanitizeInput(searchTerm);
    
    console.log('🔍 [CPP-SEARCH] Searching for apps with rich metadata:', sanitizedSearchTerm);

    // Audit log for search
    await this.auditLogger.log({
      organizationId: config.organizationId,
      userId: securityContext.userId,
      action: 'cpp-search-started',
      resourceType: 'cpp-search',
      details: { searchTerm: sanitizedSearchTerm },
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent
    });

    try {
      // Call app-store-scraper WITH rich metadata extraction for proper app selection
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('app-store-scraper', {
        body: { 
          searchTerm: sanitizedSearchTerm, 
          organizationId: config.organizationId,
          analyzeCpp: false, // Don't analyze, just get rich metadata for selection
          includeIntelligence: true, // Get rich app data like ASO AI Audit
          includeMetadata: true, // Full metadata extraction
          cacheResults: true,
          securityContext
        },
      });

      if (invokeError) {
        console.error('❌ [CPP-SEARCH] Function invocation error:', invokeError);
        throw new Error(`CPP search service unavailable: ${invokeError.message}`);
      }

      if (responseData.error) {
        console.error('❌ [CPP-SEARCH] Search error:', responseData.error);
        throw new Error(responseData.error);
      }

      // Handle multiple apps found (ambiguous search)
      if (responseData.isAmbiguous && responseData.candidates && responseData.candidates.length > 1) {
        console.log(`🎯 [CPP-SEARCH] ${responseData.candidates.length} apps found with rich metadata, showing selection modal`);
        return {
          isAmbiguous: true,
          candidates: responseData.candidates,
          searchTerm: sanitizedSearchTerm
        };
      }

      // Handle single app found - still show in modal for user confirmation
      if (responseData.candidates && responseData.candidates.length === 1) {
        console.log('✅ [CPP-SEARCH] Single app found with rich metadata, showing for user confirmation');
        return {
          isAmbiguous: false,
          candidates: responseData.candidates,
          searchTerm: sanitizedSearchTerm
        };
      }

      // Fallback - no candidates found
      console.warn('⚠️ [CPP-SEARCH] No candidates found in response');
      throw new Error('No apps found matching your search criteria');

    } catch (error: any) {
      console.error('❌ [CPP-SEARCH] Search failed:', error);
      throw error;
    }
  }

  /**
   * Generate CPP strategy from selected app (Phase 2)
   */
  async generateCppStrategy(searchTerm: string, config: CppAnalysisConfig, securityContext: SecurityContext): Promise<CppStrategyData> {
    const sanitizedSearchTerm = this.sanitizeInput(searchTerm);

    // Audit logging
    await this.auditLogger.log({
      organizationId: config.organizationId,
      userId: securityContext.userId,
      action: 'cpp-analysis-started',
      resourceType: 'cpp-analysis',
      details: {
        searchTerm: sanitizedSearchTerm,
        config: {
          includeScreenshotAnalysis: config.includeScreenshotAnalysis,
          generateThemes: config.generateThemes,
          includeCompetitorAnalysis: config.includeCompetitorAnalysis
        }
      },
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent
    });

    const cacheKey = `${config.organizationId}-${sanitizedSearchTerm}-cpp`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📦 [CPP-CACHE] Using cached strategy for:', sanitizedSearchTerm);
      return cached.data;
    }

    console.log('🚀 [CPP-STRATEGY] Starting CPP analysis for selected app:', sanitizedSearchTerm);

    try {
      // Call enhanced app-store-scraper with CPP analysis
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('app-store-scraper', {
        body: { 
          searchTerm: sanitizedSearchTerm, 
          organizationId: config.organizationId,
          analyzeCpp: true, // Now we DO want analysis
          includeScreenshotAnalysis: config.includeScreenshotAnalysis !== false,
          generateThemes: config.generateThemes !== false,
          includeCompetitorAnalysis: config.includeCompetitorAnalysis,
          securityContext
        },
      });

      if (invokeError) {
        console.error('❌ [CPP-STRATEGY] Function invocation error:', invokeError);
        throw new Error(`CPP analysis service unavailable: ${invokeError.message}`);
      }

      if (responseData.error) {
        console.error('❌ [CPP-STRATEGY] Analysis error:', responseData.error);
        throw new Error(responseData.error);
      }

      // In analysis mode, we should not get ambiguous results
      if (responseData.isAmbiguous) {
        console.error('❌ [CPP-STRATEGY] Unexpected ambiguous response during analysis');
        throw new Error('Analysis failed: Multiple apps returned when specific analysis was requested');
      }

      // Transform the enhanced metadata into CPP strategy
      const cppStrategy = this.transformToCppStrategy(responseData);
      
      // Cache the result with organization isolation
      this.cache.set(cacheKey, {
        data: cppStrategy,
        timestamp: Date.now()
      });

      // Success audit log
      await this.auditLogger.log({
        organizationId: config.organizationId,
        userId: securityContext.userId,
        action: 'cpp-analysis-completed',
        resourceType: 'cpp-analysis',
        details: {
          searchTerm: sanitizedSearchTerm,
          themesGenerated: cppStrategy.suggestedThemes.length,
          screenshotsAnalyzed: cppStrategy.originalApp.screenshots.length
        },
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent
      });

      console.log('✅ [CPP-STRATEGY] Analysis complete:', cppStrategy.suggestedThemes.length, 'themes generated');
      return cppStrategy;

    } catch (error) {
      // Error audit log
      await this.auditLogger.log({
        organizationId: config.organizationId,
        userId: securityContext.userId,
        action: 'cpp-analysis-failed',
        resourceType: 'cpp-analysis',
        details: {
          searchTerm: sanitizedSearchTerm,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent
      });

      console.error('❌ [CPP-STRATEGY] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate CPP strategy for a specific selected app
   */
  async selectAppForCppStrategy(selectedApp: ScrapedMetadata, config: CppAnalysisConfig, securityContext: SecurityContext): Promise<CppStrategyData> {
    console.log('🎯 [CPP-STRATEGY] Analyzing selected app:', selectedApp.name);

    try {
      // Generate CPP strategy directly from the selected app metadata
      const cppStrategy = this.transformToCppStrategy(selectedApp);
      
      // Cache the result
      const cacheKey = `${config.organizationId}-${selectedApp.appId}-cpp-selected`;
      this.cache.set(cacheKey, {
        data: cppStrategy,
        timestamp: Date.now()
      });

      // Success audit log
      await this.auditLogger.log({
        organizationId: config.organizationId,
        userId: securityContext.userId,
        action: 'cpp-app-selected',
        resourceType: 'cpp-analysis',
        details: {
          selectedAppId: selectedApp.appId,
          selectedAppName: selectedApp.name,
          themesGenerated: cppStrategy.suggestedThemes.length
        },
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent
      });

      return cppStrategy;
    } catch (error) {
      console.error('❌ [CPP-STRATEGY] Selected app analysis failed:', error);
      throw error;
    }
  }

  /**
   * Transform enhanced metadata into CPP strategy data with security validation
   */
  private transformToCppStrategy(metadata: ScrapedMetadata): CppStrategyData {
    // Sanitize all text inputs
    const sanitizedName = this.sanitizeInput(metadata.name || 'Unknown App');
    
    // Use the CPP-specific data from the enhanced scraper response
    const suggestedThemes = metadata.suggestedCppThemes || this.generateFallbackThemes(metadata);
    const screenshotAnalysis = metadata.screenshotAnalysis || [];
    
    return {
      originalApp: {
        name: sanitizedName,
        screenshots: screenshotAnalysis
      },
      suggestedThemes,
      competitorInsights: metadata.competitorScreenshots,
      recommendations: {
        primaryTheme: suggestedThemes[0]?.name || 'Feature Showcase',
        alternativeThemes: suggestedThemes.slice(1, 3).map(t => t.name) || [],
        keyDifferentiators: this.extractKeyDifferentiators(metadata)
      }
    };
  }

  private generateFallbackThemes(metadata: ScrapedMetadata): CppTheme[] {
    const appName = metadata.name || 'App';
    const category = metadata.applicationCategory || 'Productivity';

    return [
      {
        id: 'feature-showcase',
        name: 'Feature Showcase',
        tagline: `Discover ${appName}'s powerful capabilities`,
        targetAudience: 'Power users seeking advanced functionality',
        valueHook: 'Comprehensive tool for serious users',
        searchTerms: [category.toLowerCase(), 'features', 'advanced'],
        visualStyle: {
          mood: 'professional',
          colors: ['primary', 'secondary'],
          focusFeatures: ['core features', 'advanced tools']
        }
      },
      {
        id: 'lifestyle-integration',
        name: 'Lifestyle Integration',
        tagline: `${appName} fits seamlessly into your routine`,
        targetAudience: 'Casual users wanting easy integration',
        valueHook: 'Effortless part of your daily life',
        searchTerms: [category.toLowerCase(), 'daily', 'lifestyle'],
        visualStyle: {
          mood: 'friendly',
          colors: ['warm', 'inviting'],
          focusFeatures: ['ease of use', 'daily workflow']
        }
      },
      {
        id: 'results-focused',
        name: 'Results & Achievement',
        tagline: `Achieve your goals with ${appName}`,
        targetAudience: 'Goal-oriented users focused on outcomes',
        valueHook: 'Proven results and measurable success',
        searchTerms: [category.toLowerCase(), 'results', 'achievement'],
        visualStyle: {
          mood: 'bold',
          colors: ['success', 'achievement'],
          focusFeatures: ['progress tracking', 'goal achievement']
        }
      }
    ];
  }

  private extractKeyDifferentiators(metadata: ScrapedMetadata): string[] {
    const features = new Set<string>();
    
    // Extract from screenshot analysis
    metadata.screenshotAnalysis?.forEach(screenshot => {
      screenshot.analysis.features?.forEach((feature: string) => {
        const sanitizedFeature = this.sanitizeInput(feature);
        if (sanitizedFeature.length > 0) {
          features.add(sanitizedFeature);
        }
      });
    });
    
    // Add fallback differentiators if no features found
    if (features.size === 0) {
      features.add('Intuitive user interface');
      features.add('Powerful functionality');
      features.add('Seamless experience');
    }
    
    return Array.from(features).slice(0, 5);
  }

  generateThemeVariations(baseTheme: CppTheme): CppTheme[] {
    const variations: CppTheme[] = [];
    
    // Mood variations
    const moodVariations = ['professional', 'playful', 'minimalist', 'bold'];
    moodVariations.forEach((mood, index) => {
      if (mood !== baseTheme.visualStyle.mood) {
        variations.push({
          ...baseTheme,
          id: `${baseTheme.id}-${mood}`,
          name: `${baseTheme.name} (${mood})`,
          visualStyle: {
            ...baseTheme.visualStyle,
            mood
          }
        });
      }
    });
    
    return variations.slice(0, 2); // Return top 2 variations
  }

  exportStrategy(strategy: CppStrategyData, format: 'json' | 'csv' | 'notion'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(strategy, null, 2);
      case 'csv':
        return this.convertToCsv(strategy);
      case 'notion':
        return this.convertToNotionMarkdown(strategy);
      default:
        return JSON.stringify(strategy, null, 2);
    }
  }

  private convertToCsv(strategy: CppStrategyData): string {
    const headers = ['Theme Name', 'Tagline', 'Target Audience', 'Value Hook', 'Search Terms'];
    const rows = strategy.suggestedThemes.map(theme => [
      theme.name,
      theme.tagline,
      theme.targetAudience,
      theme.valueHook,
      theme.searchTerms.join('; ')
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertToNotionMarkdown(strategy: CppStrategyData): string {
    let markdown = `# CPP Strategy for ${strategy.originalApp.name}\n\n`;
    
    markdown += `## Recommended Themes\n\n`;
    strategy.suggestedThemes.forEach((theme, index) => {
      markdown += `### ${index + 1}. ${theme.name}\n`;
      markdown += `- **Tagline**: ${theme.tagline}\n`;
      markdown += `- **Target Audience**: ${theme.targetAudience}\n`;
      markdown += `- **Value Hook**: ${theme.valueHook}\n`;  
      markdown += `- **Search Terms**: ${theme.searchTerms.join(', ')}\n\n`;
    });
    
    return markdown;
  }

  clearCache(organizationId?: string): void {
    if (organizationId) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(organizationId));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
}

export const cppStrategyService = new CppStrategyService();
