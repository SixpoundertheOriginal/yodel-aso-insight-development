import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { fetchAppReviews } from '@/utils/itunesReviews';
import { extractReviewIntelligence, analyzeEnhancedSentiment } from '@/engines/review-intelligence.engine';
import { competitorReviewIntelligenceService, type CompetitorApp, type CompetitiveIntelligence } from '@/services/competitor-review-intelligence.service';
import { EnhancedReviewItem } from '@/types/review-intelligence.types';
import { toast } from 'sonner';
import { useMonitoredApps } from './useMonitoredApps';
import { reviewIntelligenceService } from '@/services/review-intelligence.service';
import { supabase } from '@/config/supabase';

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
  organizationId?: string; // NEW: For accessing cached data
  maxReviewsPerApp?: number; // Default: 500
}

export const useCompetitorComparison = (config: ComparisonConfig | null) => {
  const [progress, setProgress] = useState<Record<string, number>>({});

  return useQuery({
    queryKey: ['competitor-comparison', config],
    queryFn: async (): Promise<CompetitiveIntelligence> => {
      if (!config) {
        throw new Error('Configuration required');
      }

      const maxReviews = config.maxReviewsPerApp || 500;
      const { organizationId } = config;

      console.log('🚀 [Comparison ENHANCED] Starting optimized analysis...');

      const allApps = [
        { id: config.primaryAppId, name: config.primaryAppName },
        ...config.competitorAppIds.map((id, idx) => ({
          id,
          name: config.competitorAppNames[idx]
        }))
      ];

      // Step 1: Try to use cached data for monitored apps (OPTIMIZATION)
      let monitoredAppsMap = new Map<string, any>();

      if (organizationId) {
        console.log('🔍 [Comparison] Checking for monitored apps with cached data...');

        const { data: monitoredApps } = await supabase
          .from('monitored_apps')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('primary_country', config.country)
          .in('app_store_id', allApps.map(a => a.id));

        if (monitoredApps) {
          monitoredApps.forEach(app => {
            monitoredAppsMap.set(app.app_store_id, app);
          });
          console.log(`✅ [Comparison] Found ${monitoredApps.length} monitored apps with potential cached data`);
        }
      }

      // Step 2: Fetch reviews (use cache when available, fallback to direct fetch)
      console.log('🔍 [Comparison] Fetching reviews for all apps...');

      const fetchPromises = allApps.map(async (app, index) => {
        try {
          setProgress(prev => ({ ...prev, [app.id]: 0 }));

          const monitoredApp = monitoredAppsMap.get(app.id);

          // TRY CACHED REVIEWS FIRST (FAST PATH)
          if (monitoredApp && organizationId) {
            console.log(`⚡ [Comparison] Attempting cached reviews for ${app.name}...`);

            const { data: cachedReviews } = await supabase
              .from('monitored_app_reviews')
              .select('*')
              .eq('monitored_app_id', monitoredApp.id)
              .order('fetched_at', { ascending: false })
              .limit(maxReviews);

            if (cachedReviews && cachedReviews.length > 0) {
              // Check if cache is fresh (< 24 hours old)
              const latestFetch = new Date(cachedReviews[0].fetched_at);
              const hoursSinceFetch = (Date.now() - latestFetch.getTime()) / (1000 * 60 * 60);

              if (hoursSinceFetch < 24) {
                console.log(`✅ [Comparison] Using ${cachedReviews.length} cached reviews for ${app.name} (${hoursSinceFetch.toFixed(1)}h old)`);
                setProgress(prev => ({ ...prev, [app.id]: 100 }));

                // Return cached reviews (already enhanced with sentiment/themes)
                return cachedReviews.map(r => ({
                  review_id: r.review_id,
                  title: r.title,
                  text: r.review_text,
                  rating: r.rating,
                  version: r.version,
                  author: r.author_name,
                  updated_at: r.review_date,
                  country: r.country,
                  app_id: r.app_store_id,
                  sentiment: r.enhanced_sentiment?.overall || (r.rating >= 4 ? 'positive' : r.rating <= 2 ? 'negative' : 'neutral'),
                  enhancedSentiment: r.enhanced_sentiment,
                  extractedThemes: r.extracted_themes || [],
                  mentionedFeatures: r.mentioned_features || [],
                  identifiedIssues: r.identified_issues || [],
                  businessImpact: r.business_impact || (r.rating <= 2 ? 'high' : r.rating === 3 ? 'medium' : 'low')
                } as EnhancedReviewItem));
              } else {
                console.log(`⚠️ [Comparison] Cache for ${app.name} is stale (${hoursSinceFetch.toFixed(1)}h old), fetching fresh data...`);
              }
            }
          }

          // FALLBACK: Direct fetch from iTunes RSS (SLOW PATH)
          console.log(`🌐 [Comparison] Fetching fresh reviews from iTunes for ${app.name}...`);

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
          console.log(`✅ [Comparison] Fetched ${reviews.length} fresh reviews for ${app.name}`);

          return reviews.slice(0, maxReviews);
        } catch (error) {
          console.error(`❌ [Comparison] Failed to fetch ${app.name}:`, error);
          toast.error(`Failed to fetch reviews for ${app.name}`);
          return [];
        }
      });

      const allReviews = await Promise.all(fetchPromises);

      // Step 3: Enhance reviews if not already enhanced (from direct fetch)
      console.log('🤖 [Comparison] Processing reviews...');

      const analyzeReviews = (reviews: any[]): EnhancedReviewItem[] => {
        return reviews.map(review => {
          // Skip if already enhanced (from cache)
          if (review.enhancedSentiment && review.extractedThemes) {
            return review as EnhancedReviewItem;
          }

          // Enhance fresh reviews
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

      // Step 4: Try to use pre-computed intelligence snapshots (OPTIMIZATION)
      console.log('🧠 [Comparison] Extracting intelligence...');

      const getIntelligenceForApp = async (reviews: EnhancedReviewItem[], appId: string, appName: string) => {
        const monitoredApp = monitoredAppsMap.get(appId);

        // TRY INTELLIGENCE SNAPSHOT FIRST (FAST PATH)
        if (monitoredApp && organizationId) {
          try {
            console.log(`⚡ [Comparison] Attempting cached intelligence for ${appName}...`);

            const intelligenceDashboard = await reviewIntelligenceService.getIntelligenceForApp(
              monitoredApp.id,
              organizationId
            );

            if (intelligenceDashboard && intelligenceDashboard.intelligence) {
              console.log(`✅ [Comparison] Using cached intelligence for ${appName} (${intelligenceDashboard.metadata.reviewsAnalyzed} reviews)`);
              return intelligenceDashboard.intelligence;
            }
          } catch (error) {
            console.log(`⚠️ [Comparison] No cached intelligence for ${appName}, computing fresh...`);
          }
        }

        // FALLBACK: Extract intelligence from reviews (SLOW PATH)
        console.log(`🔄 [Comparison] Computing fresh intelligence for ${appName}...`);
        return extractReviewIntelligence(reviews);
      };

      const [primaryIntelligence, ...competitorIntelligences] = await Promise.all([
        getIntelligenceForApp(primaryAppReviews, config.primaryAppId, config.primaryAppName),
        ...competitorReviews.map((reviews, idx) =>
          getIntelligenceForApp(reviews, config.competitorAppIds[idx], config.competitorAppNames[idx])
        )
      ]);

      // Step 5: Build CompetitorApp objects
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

      // Step 6: Generate competitive intelligence
      console.log('🎯 [Comparison] Generating competitive intelligence...');
      const intelligence = await competitorReviewIntelligenceService.analyzeCompetitors(
        primaryApp,
        competitors
      );

      console.log('✅ [Comparison] Analysis complete!', {
        featureGaps: intelligence.featureGaps.length,
        opportunities: intelligence.opportunities.length,
        strengths: intelligence.strengths.length,
        threats: intelligence.threats.length,
        cacheHits: monitoredAppsMap.size,
        totalApps: allApps.length
      });

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
