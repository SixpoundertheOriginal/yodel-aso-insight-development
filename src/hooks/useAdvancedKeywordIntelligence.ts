
import { useState, useEffect, useCallback } from 'react';
import { enhancedKeywordDataPipelineService } from '@/services/enhanced-keyword-data-pipeline.service';
import { useEnhancedQueries } from './useEnhancedQueries';

export interface KeywordData {
  keyword: string;
  rank: number;
  searchVolume: number;
  difficulty: number;
  trend: 'up' | 'down' | 'stable';
  opportunity: 'high' | 'medium' | 'low';
  competitorRank: number;
  volumeHistory: any[];
  source: string;
  contextualReason?: string;
  relevanceScore?: number;
}

export interface KeywordStats {
  totalKeywords: number;
  highOpportunityKeywords: number;
  avgDifficulty: number;
  totalSearchVolume: number;
}

export interface KeywordFilters {
  minVolume: number;
  maxDifficulty: number;
  trend: 'all' | 'up' | 'down' | 'stable';
  opportunity: 'all' | 'high' | 'medium' | 'low';
}

// Export aliases for backward compatibility
export type AdvancedKeywordData = KeywordData;
export type KeywordIntelligenceStats = KeywordStats;

interface UseAdvancedKeywordIntelligenceProps {
  organizationId: string;
  targetAppId?: string;
  enabled?: boolean;
  scrapedMetadata?: any; // NEW: Pass scraped metadata to skip database queries
}

export const useAdvancedKeywordIntelligence = ({
  organizationId,
  targetAppId,
  enabled = true,
  scrapedMetadata // NEW: Use scraped metadata instead of database
}: UseAdvancedKeywordIntelligenceProps) => {
  const [keywordData, setKeywordData] = useState<KeywordData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('');
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [volumeTrends, setVolumeTrends] = useState<any[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<KeywordFilters>({
    minVolume: 0,
    maxDifficulty: 10,
    trend: 'all',
    opportunity: 'all'
  });

  // Get app data from enhanced queries (SKIP if scrapedMetadata provided)
  const {
    selectedApp,
    clusters,
    isLoadingApp,
    appError
  } = useEnhancedQueries({
    organizationId,
    appId: targetAppId,
    enabled: enabled && !scrapedMetadata // Skip database queries if metadata provided
  });

  // Use scraped metadata or database app data
  const appData = scrapedMetadata || selectedApp;

  // Generate enhanced keyword data when app changes
  useEffect(() => {
    if (!enabled || !targetAppId) {
      console.log('🔄 [ADVANCED-KI] Disabled or no targetAppId');
      return;
    }

    // Skip if waiting for database query (only when not using scraped metadata)
    if (!scrapedMetadata && (!selectedApp || isLoadingApp)) {
      console.log('🔄 [ADVANCED-KI] Waiting for app data from database');
      return;
    }

    // Skip if no app data available at all
    if (!appData) {
      console.log('🔄 [ADVANCED-KI] No app data available');
      return;
    }

    generateKeywordData();
  }, [targetAppId, appData, organizationId, enabled, isLoadingApp, scrapedMetadata]);

  const generateKeywordData = useCallback(async () => {
    if (!targetAppId || !appData) return;

    try {
      setIsLoading(true);
      setHasErrors(false);
      setTransitionError(null);
      setIsTransitioning(true);

      console.log('🎯 [ADVANCED-KI] Generating enhanced keywords for:', appData.app_name || appData.name);

      const enhancedKeywords = await enhancedKeywordDataPipelineService
        .getEnhancedKeywordData(organizationId, targetAppId, appData);

      setKeywordData(enhancedKeywords);
      setLastUpdated(new Date());
      setHasErrors(false);

      console.log('✅ [ADVANCED-KI] Enhanced keywords loaded:', enhancedKeywords.length);

    } catch (error) {
      console.error('❌ [ADVANCED-KI] Error generating keywords:', error);
      setHasErrors(true);
      setTransitionError(error instanceof Error ? error.message : 'Unknown error');
      
      // Set fallback data on error
      setKeywordData([
        {
          keyword: 'mobile application',
          rank: 20,
          searchVolume: 1000,
          difficulty: 5.0,
          trend: 'stable',
          opportunity: 'medium',
          competitorRank: 15,
          volumeHistory: [],
          source: 'error_fallback',
          contextualReason: 'Fallback due to generation error'
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsTransitioning(false);
    }
  }, [targetAppId, appData, organizationId]);

  const refreshKeywordData = useCallback(async () => {
    if (!targetAppId) return;
    
    // Clear cache and regenerate
    enhancedKeywordDataPipelineService.clearCache(targetAppId);
    await generateKeywordData();
  }, [targetAppId, generateKeywordData]);

  // Load volume trends for selected keyword
  useEffect(() => {
    if (!selectedKeyword) {
      setVolumeTrends([]);
      return;
    }

    setIsLoadingTrends(true);
    
    // Generate mock volume trends for the selected keyword
    const mockTrends = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      
      const baseVolume = keywordData.find(k => k.keyword === selectedKeyword)?.searchVolume || 1000;
      const variation = (Math.random() - 0.5) * 0.3;
      
      return {
        date: date.toISOString().split('T')[0],
        volume: Math.max(100, Math.round(baseVolume * (1 + variation)))
      };
    });

    setTimeout(() => {
      setVolumeTrends(mockTrends);
      setIsLoadingTrends(false);
    }, 500);
  }, [selectedKeyword, keywordData]);

  // Filter keywords based on current filters
  const filteredKeywordData = keywordData.filter(keyword => {
    if (keyword.searchVolume < filters.minVolume) return false;
    if (keyword.difficulty > filters.maxDifficulty) return false;
    if (filters.trend !== 'all' && keyword.trend !== filters.trend) return false;
    if (filters.opportunity !== 'all' && keyword.opportunity !== filters.opportunity) return false;
    return true;
  });

  // Calculate stats from filtered keyword data
  const stats: KeywordStats = {
    totalKeywords: filteredKeywordData.length,
    highOpportunityKeywords: filteredKeywordData.filter(k => k.opportunity === 'high').length,
    avgDifficulty: filteredKeywordData.length > 0 
      ? filteredKeywordData.reduce((sum, k) => sum + k.difficulty, 0) / filteredKeywordData.length 
      : 0,
    totalSearchVolume: filteredKeywordData.reduce((sum, k) => sum + k.searchVolume, 0)
  };

  return {
    // Data
    keywordData: filteredKeywordData,
    clusters: clusters || [],
    selectedApp,
    stats,
    lastUpdated,
    volumeTrends,
    selectedKeyword,
    filters,
    
    // States
    isLoading: isLoading || isLoadingApp,
    hasErrors: hasErrors || !!appError,
    isLoadingTrends,
    isTransitioning,
    transitionError,
    
    // Actions
    refreshKeywordData,
    generateKeywordData,
    setSelectedKeyword,
    setFilters
  };
};
