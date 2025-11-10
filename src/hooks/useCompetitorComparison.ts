import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { fetchAppReviews } from '@/utils/itunesReviews';
import { extractReviewIntelligence, analyzeEnhancedSentiment } from '@/engines/review-intelligence.engine';
import { competitorReviewIntelligenceService, type CompetitorApp, type CompetitiveIntelligence } from '@/services/competitor-review-intelligence.service';
import { competitorAnalysisCacheService } from '@/services/competitor-analysis-cache.service';
import { EnhancedReviewItem } from '@/types/review-intelligence.types';
import { toast } from 'sonner';
import { useMonitoredApps } from './useMonitoredApps';

interface ComparisonConfig {
  primaryAppId: string;
  primaryAppName: string;
  primaryAppIcon: string;
  primaryAppRating: number;
  primaryAppReviewCount: number;

  competitorAppIds: string[];
  competitorAppNames: string[];
  competitorAppIcons: string[];
  competitorAppRatings: number[];
  competitorAppReviewCounts: number[];

  country: string;
  organizationId: string;
  maxReviewsPerApp?: number; // Default: 500
  forceRefresh?: boolean; // Bypass cache
}

export const useCompetitorComparison = (config: ComparisonConfig | null) => {
  const [progress, setProgress] = useState<Record<string, number>>({});

  return useQuery({
    queryKey: ['competitor-comparison', config],
    queryFn: async (): Promise<CompetitiveIntelligence> => {
      if (!config) {
        throw new Error('Configuration required');
      }

      const startTime = Date.now();
      const maxReviews = config.maxReviewsPerApp || 500;

      // Step 0: Check cache first (unless force refresh)
      if (!config.forceRefresh) {
        console.log('🔍 [Comparison] Checking cache...');
        const cachedResult = await competitorAnalysisCacheService.getCache(
          config.organizationId,
          config.primaryAppId,
          config.competitorAppIds,
          config.country
        );

        if (cachedResult) {
          const cacheMetadata = await competitorAnalysisCacheService.checkCache(
            config.organizationId,
            config.primaryAppId,
            config.competitorAppIds,
            config.country
          );

          if (cacheMetadata.ageSeconds) {
            const ageFormatted = competitorAnalysisCacheService.formatCacheAge(cacheMetadata.ageSeconds);
            toast.success(`Loaded from cache (${ageFormatted})`);
          }

          console.log('✅ [Comparison] Returning cached analysis');
          return cachedResult;
        }
      } else {
        console.log('🔄 [Comparison] Force refresh - bypassing cache');
        // Delete existing cache
        await competitorAnalysisCacheService.deleteCache(
          config.organizationId,
          config.primaryAppId,
          config.competitorAppIds,
          config.country
        );
      }

      // Step 1: Fetch reviews for all apps in parallel
      console.log('🔍 [Comparison] Fetching reviews for all apps...');

      const allApps = [
        { id: config.primaryAppId, name: config.primaryAppName },
        ...config.competitorAppIds.map((id, idx) => ({
          id,
          name: config.competitorAppNames[idx]
        }))
      ];

      const fetchPromises = allApps.map(async (app) => {
        try {
          setProgress(prev => ({ ...prev, [app.id]: 0 }));

          const result = await fetchAppReviews({
            appId: app.id,
            cc: config.country,
            page: 1,
          });

          let reviews = result.data || [];
          let currentPage = result.currentPage;
          let hasMore = result.hasMore;

          // Fetch more pages if needed
          while (hasMore && reviews.length < maxReviews) {
            setProgress(prev => ({
              ...prev,
              [app.id]: Math.round((reviews.length / maxReviews) * 100)
            }));

            const nextResult = await fetchAppReviews({
              appId: app.id,
              cc: config.country,
              page: currentPage + 1
            });

            reviews = [...reviews, ...(nextResult.data || [])];
            currentPage = nextResult.currentPage;
            hasMore = nextResult.hasMore;
          }

          setProgress(prev => ({ ...prev, [app.id]: 100 }));
          console.log(`✅ [Comparison] Fetched ${reviews.length} reviews for ${app.name}`);

          return reviews.slice(0, maxReviews);
        } catch (error) {
          console.error(`❌ [Comparison] Failed to fetch ${app.name}:`, error);
          toast.error(`Failed to fetch reviews for ${app.name}`);
          return [];
        }
      });

      const allReviews = await Promise.all(fetchPromises);

      // Step 2: Run AI analysis on each app's reviews
      console.log('🤖 [Comparison] Running AI analysis...');

      const analyzeReviews = (reviews: any[]): EnhancedReviewItem[] => {
        return reviews.map(review => {
          const sentiment = analyzeEnhancedSentiment(review.text || '', review.rating);

          // Extract basic themes, features, issues from text
          const text = (review.text || '').toLowerCase();
          const extractedThemes: string[] = [];
          const mentionedFeatures: string[] = [];
          const identifiedIssues: string[] = [];

          // Simple keyword detection for themes
          if (text.includes('crash') || text.includes('bug')) extractedThemes.push('app crashes');
          if (text.includes('slow') || text.includes('lag')) extractedThemes.push('performance issues');
          if (text.includes('ad') || text.includes('ads')) extractedThemes.push('ads');
          if (text.includes('price') || text.includes('expensive')) extractedThemes.push('pricing concerns');
          if (text.includes('support') || text.includes('help')) extractedThemes.push('customer support');

          // Simple feature detection
          if (text.includes('dark mode')) mentionedFeatures.push('dark mode');
          if (text.includes('notification')) mentionedFeatures.push('notifications');
          if (text.includes('sync')) mentionedFeatures.push('sync');
          if (text.includes('export')) mentionedFeatures.push('export data');
          if (text.includes('search')) mentionedFeatures.push('search functionality');

          // Simple issue detection
          if (text.includes('crash')) identifiedIssues.push('app crashes');
          if (text.includes("can't login") || text.includes("won't login")) identifiedIssues.push('login failures');
          if (text.includes('slow') || text.includes('laggy')) identifiedIssues.push('performance lag');

          return {
            ...review,
            sentiment: sentiment.overall,
            enhancedSentiment: sentiment,
            extractedThemes,
            mentionedFeatures,
            identifiedIssues,
            businessImpact: review.rating <= 2 ? 'high' : review.rating === 3 ? 'medium' : 'low'
          } as EnhancedReviewItem;
        });
      };

      const primaryAppReviews = analyzeReviews(allReviews[0]);
      const competitorReviews = allReviews.slice(1).map(reviews => analyzeReviews(reviews));

      // Extract intelligence for each app
      const primaryIntelligence = extractReviewIntelligence(primaryAppReviews);
      const competitorIntelligences = competitorReviews.map(reviews =>
        extractReviewIntelligence(reviews)
      );

      // Step 3: Build CompetitorApp objects
      const primaryApp: CompetitorApp = {
        appId: config.primaryAppId,
        appName: config.primaryAppName,
        appIcon: config.primaryAppIcon,
        rating: config.primaryAppRating,
        reviewCount: config.primaryAppReviewCount,
        reviews: primaryAppReviews,
        intelligence: primaryIntelligence
      };

      const competitors: CompetitorApp[] = config.competitorAppIds.map((id, idx) => ({
        appId: id,
        appName: config.competitorAppNames[idx],
        appIcon: config.competitorAppIcons[idx],
        rating: config.competitorAppRatings[idx],
        reviewCount: config.competitorAppReviewCounts[idx],
        reviews: competitorReviews[idx],
        intelligence: competitorIntelligences[idx]
      }));

      // Step 4: Generate competitive intelligence
      console.log('🎯 [Comparison] Generating competitive intelligence...');
      const intelligence = await competitorReviewIntelligenceService.analyzeCompetitors(
        primaryApp,
        competitors,
        config.organizationId, // NEW: Pass organizationId for semantic insights
        config.country          // NEW: Pass country for semantic insights
      );

      console.log('✅ [Comparison] Analysis complete!', {
        featureGaps: intelligence.featureGaps.length,
        opportunities: intelligence.opportunities.length,
        strengths: intelligence.strengths.length,
        threats: intelligence.threats.length
      });

      // Step 5: Save to cache
      const analysisDuration = Date.now() - startTime;
      console.log(`💾 [Comparison] Saving to cache (took ${analysisDuration}ms)...`);

      await competitorAnalysisCacheService.saveCache(
        config.organizationId,
        config.primaryAppId,
        config.competitorAppIds,
        config.country,
        intelligence,
        analysisDuration
      );

      return intelligence;
    },
    enabled: !!config,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false
  });
};

// Helper hook for quick competitor selection from monitored apps
export const useCompetitorSelection = (organizationId: string, country: string) => {
  const { data: monitoredApps } = useMonitoredApps(organizationId);

  const competitors = useMemo(() => {
    return monitoredApps?.filter(app =>
      app.tags?.includes('competitor') &&
      app.primary_country === country
    ) || [];
  }, [monitoredApps, country]);

  return { competitors };
};
