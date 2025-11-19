
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdvancedKeywordIntelligence } from './useAdvancedKeywordIntelligence';
import { useEnhancedKeywordAnalytics } from './useEnhancedKeywordAnalytics';
import { semanticClusteringService } from '@/services/semantic-clustering.service';
import { metadataScoringService } from '@/services/metadata-scoring.service';
import { narrativeEngineService } from '@/services/narrative-engine.service';
import { brandRiskAnalysisService, type BrandRiskAnalysis } from '@/services/brand-risk-analysis.service';
import { auditScoringEngine } from '@/services/audit-scoring-engine.service';
import type {
  ExecutiveSummaryNarrative,
  KeywordStrategyNarrative,
  RiskAssessmentNarrative,
  CompetitorStoryNarrative
} from '@/services/narrative-engine.service';
import { ScrapedMetadata } from '@/types/aso';
import { supabase } from '@/integrations/supabase/client';
import { AUDIT_KEYWORDS_ENABLED } from '@/config/auditFeatureFlags';

interface EnhancedAuditData {
  overallScore: number;
  metadataScore: number;
  keywordScore: number;
  competitorScore: number;
  creativeScore: number; // NEW: Phase 2.6 - Creative score from scoring engine
  opportunityCount: number;
  rankDistribution: any;
  keywordClusters: any[];
  keywordTrends: any[];
  competitorAnalysis: any[];
  currentKeywords: string[];
  metadataAnalysis: any;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    category: 'metadata' | 'keywords' | 'competitors';
    impact: number;
  }>;
  // NEW: Narrative fields
  narratives?: {
    executiveSummary: ExecutiveSummaryNarrative | null;
    keywordStrategy: KeywordStrategyNarrative | null;
    riskAssessment: RiskAssessmentNarrative | null;
    competitorStory: CompetitorStoryNarrative | null;
  };
  // NEW: Brand risk analysis
  brandRisk?: BrandRiskAnalysis;
}

interface UseEnhancedAppAuditProps {
  organizationId: string;
  appId?: string;
  metadata?: ScrapedMetadata;
  enabled?: boolean;
}

export const useEnhancedAppAudit = ({
  organizationId,
  appId,
  metadata,
  enabled = true
}: UseEnhancedAppAuditProps) => {
  const [auditData, setAuditData] = useState<EnhancedAuditData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAuditRunning, setIsAuditRunning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Add refs to prevent infinite loops
  const auditRunningRef = useRef(false);
  const lastAuditMetadataRef = useRef<string>('');
  const auditCooldownRef = useRef(0);
  const auditCooldown = 3000; // 3 second cooldown between audits

  // Use existing intelligence hooks (pass scraped metadata to skip database queries)
  // SKIP keyword hooks when AUDIT_KEYWORDS_ENABLED is false
  const advancedKI = useAdvancedKeywordIntelligence({
    organizationId,
    targetAppId: appId,
    enabled: AUDIT_KEYWORDS_ENABLED && enabled && !!appId,
    scrapedMetadata: metadata // NEW: Pass scraped metadata to skip database queries
  });

  const enhancedAnalytics = useEnhancedKeywordAnalytics({
    organizationId,
    appId,
    enabled: AUDIT_KEYWORDS_ENABLED && enabled && !!appId
  });

  // Get competitor data (SKIP for scraped metadata - no database)
  const { data: competitorData } = useQuery({
    queryKey: ['competitor-data', organizationId, appId],
    queryFn: async () => {
      if (!appId) return [];

      const { data } = await supabase
        .from('keyword_ranking_snapshots' as any) // competitor_keywords doesn't exist, using fallback
        .select('keyword, rank, search_volume, difficulty_score')
        .eq('organization_id', organizationId)
        .eq('app_id', appId)
        .limit(100);

      return (data as any || []);
    },
    enabled: enabled && !!appId && !metadata, // Skip database query if using scraped metadata
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // FIXED: Create truly stable dependencies to prevent infinite re-renders
  const stableDependencies = useMemo(() => {
    const currentMetadataSignature = metadata ? `${metadata.appId}-${metadata.name}-${metadata.title}` : '';

    // When using scraped metadata, skip waiting for analytics/competitor data (database queries)
    const usingScrapedMetadata = !!metadata;

    return {
      hasValidData: !!metadata && !!appId && !!organizationId,
      metadataSignature: currentMetadataSignature,
      // When keywords disabled, always mark as ready (don't wait for keyword data)
      keywordDataReady: AUDIT_KEYWORDS_ENABLED
        ? (advancedKI.keywordData.length > 0 && !advancedKI.isLoading)
        : true,
      // Skip analytics check if using scraped metadata (no database) OR keywords disabled
      analyticsReady: (!AUDIT_KEYWORDS_ENABLED || usingScrapedMetadata)
        ? true
        : (!!enhancedAnalytics.rankDistribution && !enhancedAnalytics.isLoading),
      // Skip competitor check if using scraped metadata (no database) OR keywords disabled
      competitorDataReady: (!AUDIT_KEYWORDS_ENABLED || usingScrapedMetadata)
        ? true
        : !!competitorData,
      lastSignature: lastAuditMetadataRef.current,
      usingScrapedMetadata
    };
  }, [
    metadata?.appId,
    metadata?.name,
    metadata?.title,
    appId,
    organizationId,
    advancedKI.keywordData.length,
    advancedKI.isLoading,
    enhancedAnalytics.rankDistribution?.visibility_score, // Use specific property to avoid object reference issues
    enhancedAnalytics.isLoading,
    competitorData?.length
  ]);

  const generateEnhancedAudit = useCallback(async () => {
    // CRITICAL: Multiple guard checks to prevent infinite loops
    if (!stableDependencies.hasValidData) {
      console.log('🚫 [ENHANCED-AUDIT] Skipping - invalid data');
      return;
    }

    if (auditRunningRef.current || isAuditRunning) {
      console.log('🚫 [ENHANCED-AUDIT] Skipping - audit already running');
      return;
    }

    // Check if metadata changed
    if (stableDependencies.metadataSignature === stableDependencies.lastSignature) {
      console.log('🚫 [ENHANCED-AUDIT] Skipping - metadata unchanged');
      return;
    }

    // Check cooldown
    const now = Date.now();
    if (now - auditCooldownRef.current < auditCooldown) {
      console.log('🚫 [ENHANCED-AUDIT] Skipping - cooldown active');
      return;
    }

    // Check if we have enough data to proceed
    if (!stableDependencies.keywordDataReady && !stableDependencies.analyticsReady) {
      console.log('🚫 [ENHANCED-AUDIT] Skipping - waiting for data to load');
      return;
    }

    auditRunningRef.current = true;
    setIsAuditRunning(true);
    auditCooldownRef.current = now;
    lastAuditMetadataRef.current = stableDependencies.metadataSignature;

    try {
      console.log('🔍 [ENHANCED-AUDIT] Starting audit for', metadata?.name,
        AUDIT_KEYWORDS_ENABLED ? '(full mode)' : '(metadata-only mode)');

      // Generate semantic clusters from real keyword data (SKIP if keywords disabled)
      const clusteringResult = AUDIT_KEYWORDS_ENABLED
        ? await semanticClusteringService.generateClusters(advancedKI.keywordData, organizationId)
        : { clusters: [], totalKeywords: 0 };

      // Analyze metadata quality (use empty keyword list if keywords disabled)
      const metadataAnalysis = await metadataScoringService.analyzeMetadata(
        metadata!,
        metadata?.competitorData || [],
        AUDIT_KEYWORDS_ENABLED ? advancedKI.keywordData.map(k => k.keyword) : []
      );

      // Calculate enhanced scores using centralized scoring engine
      const metadataScore = metadataAnalysis.scores.overall;

      const scores = auditScoringEngine.calculateAllScores({
        metadata: metadata!,
        metadataScore,
        keywordData: AUDIT_KEYWORDS_ENABLED ? advancedKI.keywordData : [],
        analyticsData: AUDIT_KEYWORDS_ENABLED ? enhancedAnalytics.rankDistribution : undefined,
        competitorData: AUDIT_KEYWORDS_ENABLED ? competitorData : [],
      });

      const { overall: overallScore, keyword: keywordScore, competitor: competitorScore, creative: creativeScore } = scores;

      // Calculate opportunities (keywords-aware)
      const highOpportunityKeywords = AUDIT_KEYWORDS_ENABLED
        ? advancedKI.keywordData.filter(k => k.opportunity === 'high').length
        : 0;
      const metadataOpportunities = metadataAnalysis.recommendations.filter(r => r.priority === 'high').length;
      const opportunityCount = highOpportunityKeywords + metadataOpportunities;

      // Generate comprehensive recommendations (skip keyword recommendations if disabled)
      const recommendations = [
        // Metadata recommendations (always included)
        ...metadataAnalysis.recommendations.map(rec => ({
          priority: rec.priority,
          title: rec.issue,
          description: rec.suggestion,
          category: 'metadata' as const,
          impact: rec.impact
        })),
        // Keyword recommendations (SKIP if keywords disabled)
        ...(AUDIT_KEYWORDS_ENABLED && highOpportunityKeywords > 0 ? [{
          priority: 'high' as const,
          title: 'High-Opportunity Keywords Available',
          description: `${highOpportunityKeywords} keywords identified with high ranking potential`,
          category: 'keywords' as const,
          impact: 90
        }] : []),
        // Competitor recommendations (SKIP if keywords disabled)
        ...(AUDIT_KEYWORDS_ENABLED && competitorData && competitorData.length > 5 ? [{
          priority: 'medium' as const,
          title: 'Competitive Keyword Gaps',
          description: `Analyze ${competitorData.length} competitor keywords for opportunities`,
          category: 'competitors' as const,
          impact: 70
        }] : [])
      ].sort((a, b) => b.impact - a.impact);

      // NEW: Analyze brand risk (SKIP if keywords disabled)
      const brandRisk = AUDIT_KEYWORDS_ENABLED
        ? (() => {
            console.log('🔍 [ENHANCED-AUDIT] Analyzing brand risk...');
            return brandRiskAnalysisService.analyzeBrandDependency(
              advancedKI.keywordData.map(k => k.keyword),
              metadata!.name,
              metadata!.title
            );
          })()
        : undefined;

      // NEW: Generate AI narratives (async - run in parallel)
      // SKIP keyword-dependent narratives when keywords disabled
      console.log('📝 [ENHANCED-AUDIT] Generating AI narratives...',
        AUDIT_KEYWORDS_ENABLED ? '(all narratives)' : '(metadata-only narratives)');

      const narrativePromises = {
        // Executive summary (always generated, uses metadata-only data when keywords disabled)
        executiveSummary: narrativeEngineService.generateExecutiveSummary(
          metadata!,
          { overall: overallScore, metadata: metadataScore, keyword: keywordScore, competitor: competitorScore },
          opportunityCount,
          recommendations.slice(0, 5)
        ).catch(err => {
          console.error('Failed to generate executive summary:', err);
          return null;
        }),

        // Keyword strategy (SKIP if keywords disabled)
        keywordStrategy: AUDIT_KEYWORDS_ENABLED && brandRisk
          ? narrativeEngineService.generateKeywordStrategy(
              metadata!,
              clusteringResult.clusters.slice(0, 5),
              brandRisk.brandDependencyRatio,
              enhancedAnalytics.rankDistribution?.visibility_score || keywordScore,
              advancedKI.keywordData.filter(k => k.rank <= 10).map(k => k.keyword)
            ).catch(err => {
              console.error('Failed to generate keyword strategy:', err);
              return null;
            })
          : Promise.resolve(null),

        // Risk assessment (SKIP if keywords disabled - requires brand risk)
        riskAssessment: AUDIT_KEYWORDS_ENABLED && brandRisk
          ? narrativeEngineService.generateRiskAssessment(
              metadata!,
              brandRisk.brandDependencyRatio,
              advancedKI.keywordData.length,
              metadataScore,
              competitorScore
            ).catch(err => {
              console.error('Failed to generate risk assessment:', err);
              return null;
            })
          : Promise.resolve(null),

        // Competitor story (SKIP if keywords disabled)
        competitorStory: AUDIT_KEYWORDS_ENABLED
          ? narrativeEngineService.generateCompetitorStory(
              metadata!,
              competitorData?.length || 0,
              advancedKI.keywordData.length,
              competitorScore,
              [], // TODO: Calculate shared keywords
              []  // TODO: Calculate unique opportunities
            ).catch(err => {
              console.error('Failed to generate competitor story:', err);
              return null;
            })
          : Promise.resolve(null)
      };

      const narratives = {
        executiveSummary: await narrativePromises.executiveSummary,
        keywordStrategy: await narrativePromises.keywordStrategy,
        riskAssessment: await narrativePromises.riskAssessment,
        competitorStory: await narrativePromises.competitorStory
      };

      console.log('✅ [ENHANCED-AUDIT] Narratives generated:', {
        executiveSummary: !!narratives.executiveSummary,
        keywordStrategy: !!narratives.keywordStrategy,
        riskAssessment: !!narratives.riskAssessment,
        competitorStory: !!narratives.competitorStory
      });

      const enhancedAuditData: EnhancedAuditData = {
        overallScore,
        metadataScore,
        keywordScore,
        competitorScore,
        creativeScore, // NEW: Phase 2.6 - From scoring engine
        opportunityCount,
        // Use safe defaults when keywords disabled
        rankDistribution: AUDIT_KEYWORDS_ENABLED ? enhancedAnalytics.rankDistribution : null,
        keywordClusters: clusteringResult.clusters,
        keywordTrends: AUDIT_KEYWORDS_ENABLED ? enhancedAnalytics.keywordTrends : [],
        competitorAnalysis: AUDIT_KEYWORDS_ENABLED ? (competitorData || []) : [],
        currentKeywords: AUDIT_KEYWORDS_ENABLED ? advancedKI.keywordData.map(k => k.keyword) : [],
        metadataAnalysis,
        recommendations,
        // NEW: Add narratives and brand risk
        narratives,
        brandRisk
      };

      setAuditData(enhancedAuditData);
      setLastUpdated(new Date());

      console.log('✅ [ENHANCED-AUDIT] Audit completed:', {
        overallScore,
        clusters: clusteringResult.clusters.length,
        recommendations: recommendations.length
      });

    } catch (error) {
      console.error('❌ [ENHANCED-AUDIT] Failed to generate audit:', error);
    } finally {
      auditRunningRef.current = false;
      setIsAuditRunning(false);
    }
  }, [
    stableDependencies.hasValidData,
    stableDependencies.metadataSignature,
    stableDependencies.keywordDataReady,
    stableDependencies.analyticsReady,
    metadata,
    organizationId,
    advancedKI.keywordData,
    enhancedAnalytics.rankDistribution,
    enhancedAnalytics.keywordTrends,
    competitorData,
    isAuditRunning
  ]);

  // FIXED: Controlled effect with proper dependencies and guards
  useEffect(() => {
    if (!enabled || !stableDependencies.hasValidData) {
      return;
    }

    // Only trigger if data is ready and metadata changed
    if (stableDependencies.keywordDataReady || stableDependencies.analyticsReady) {
      if (stableDependencies.metadataSignature !== stableDependencies.lastSignature) {
        const timeoutId = setTimeout(() => {
          generateEnhancedAudit();
        }, 1000); // Small delay to prevent rapid-fire execution

        return () => clearTimeout(timeoutId);
      }
    }
  }, [
    enabled,
    stableDependencies.hasValidData,
    stableDependencies.keywordDataReady,
    stableDependencies.analyticsReady,
    stableDependencies.metadataSignature,
    generateEnhancedAudit
  ]);

  const refreshAudit = useCallback(async () => {
    if (!appId || auditRunningRef.current || isAuditRunning) {
      console.log('🚫 [ENHANCED-AUDIT] Refresh blocked - audit running or no appId');
      return;
    }
    
    setIsRefreshing(true);
    try {
      // Refresh underlying data
      await Promise.all([
        advancedKI.refreshKeywordData(),
        enhancedAnalytics.refreshAll?.()
      ]);
      
      // Reset signature to force regeneration
      lastAuditMetadataRef.current = '';
      auditCooldownRef.current = 0;
      
      // Regenerate audit
      await generateEnhancedAudit();
    } finally {
      setIsRefreshing(false);
    }
  }, [appId, advancedKI.refreshKeywordData, enhancedAnalytics.refreshAll, generateEnhancedAudit, isAuditRunning]);

  const generateAuditReport = useCallback(async () => {
    if (!auditData || !appId || !metadata) {
      throw new Error('No audit data available');
    }
    
    return {
      appId,
      appName: metadata.name,
      timestamp: new Date(),
      scores: {
        overall: auditData.overallScore,
        metadata: auditData.metadataScore,
        keywords: auditData.keywordScore,
        competitor: auditData.competitorScore
      },
      opportunities: auditData.opportunityCount,
      recommendations: auditData.recommendations,
      clusterAnalysis: {
        totalClusters: auditData.keywordClusters.length,
        topClusters: auditData.keywordClusters.slice(0, 3)
      },
      competitiveAnalysis: {
        trackedCompetitors: auditData.competitorAnalysis.length,
        keywordGaps: auditData.competitorAnalysis.length
      },
      data: auditData
    };
  }, [auditData, appId, metadata]);

  const isLoading = advancedKI.isLoading || enhancedAnalytics.isLoading || (!auditData && !isAuditRunning);

  return {
    auditData,
    isLoading,
    isRefreshing,
    isAuditRunning, // Expose this for external components
    lastUpdated,
    refreshAudit,
    generateAuditReport,
    // Expose individual services for advanced usage
    clusteringService: semanticClusteringService,
    metadataService: metadataScoringService
  };
};
