/**
 * Unified Metadata Audit Module
 *
 * Main container for the Metadata Audit V2 UI.
 * Performs client-side scoring using MetadataAuditEngine (no API calls).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2 } from 'lucide-react';
import { MetadataAuditEngine } from '@/engine/metadata/metadataAuditEngine';
import { KpiEngine } from '@/engine/metadata/kpi/kpiEngine';
import type { ScrapedMetadata } from '@/types/aso';
import type { UnifiedMetadataAuditResult } from './types';
import { MetadataScoreCard } from './MetadataScoreCard';
import { ElementDetailCard } from './ElementDetailCard';
import { KeywordCoverageCard } from './KeywordCoverageCard';
import { EnhancedKeywordComboWorkbench } from '../KeywordComboWorkbench/EnhancedKeywordComboWorkbench';
import { SearchIntentAnalysisCard } from './SearchIntentAnalysisCard';
import { RecommendationsPanel } from './RecommendationsPanel';
import { MetadataKpiGrid } from '../MetadataKpi';
import { VerticalOverviewPanel } from './VerticalOverviewPanel';
import { VerticalBenchmarksPanel } from './VerticalBenchmarksPanel';
import { VerticalConversionDriversPanel } from './VerticalConversionDriversPanel';
import { useIntentIntelligence } from '@/hooks/useIntentIntelligence';
import { useCachedRuleSet } from '@/hooks/useCachedRuleSet';
import { AUTOCOMPLETE_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';
import { MOCK_PIMSLEUR_AUDIT } from './mockAuditResult';
import {
  MetadataOpportunityDeltaChart,
  MetadataDimensionRadar,
  SlotUtilizationBars,
  TokenMixDonut,
  SeverityDonut,
  EfficiencySparkline,
  DiscoveryFootprintMap,
  SemanticDensityGauge,
  HookDiversityWheel,
} from './charts';
import { IntentEngineDiagnosticsPanel } from './IntentEngineDiagnosticsPanel';
import type { MergedRuleSet } from '@/engine/asoBible/ruleset.types';
import {
  CompetitorManagementPanel,
  CompetitorComparisonTable,
  CompetitorComparisonSummary,
} from '@/components/CompetitorAnalysis';
import { useCompetitorAnalysis } from '@/hooks/useCompetitorAnalysis';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { computeBrandRatioStats } from '@/engine/metadata/utils/brandNoiseHelpers';

const DEFAULT_DISCOVERY_THRESHOLDS = {
  excellent: 5,
  good: 3,
  moderate: 1,
};

interface UnifiedMetadataAuditModuleProps {
  metadata: ScrapedMetadata;
  useMockData?: boolean; // For development/testing
  targetAppId?: string; // For competitor analysis
  organizationId?: string; // For competitor analysis

  // Comparison mode
  isCompetitor?: boolean; // Is this a competitor view?
  baselineAudit?: UnifiedMetadataAuditResult | null; // Your app's audit to compare against
  competitorName?: string; // Name of the competitor
}

export const UnifiedMetadataAuditModule: React.FC<UnifiedMetadataAuditModuleProps> = ({
  metadata,
  useMockData = false,
  targetAppId,
  organizationId,
  isCompetitor = false,
  baselineAudit = null,
  competitorName,
}) => {
  const [auditResult, setAuditResult] = useState<UnifiedMetadataAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper: Calculate delta for comparison
  const getDelta = (competitorValue: number | undefined, baselineValue: number | undefined): { value: number; label: string; isPositive: boolean } | null => {
    if (!isCompetitor || !baselineAudit || competitorValue === undefined || baselineValue === undefined) {
      return null;
    }
    const delta = competitorValue - baselineValue;
    const isPositive = delta > 0;
    const label = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
    return { value: delta, label, isPositive };
  };

  // Competitor Analysis Hook
  const competitorAnalysis = useCompetitorAnalysis({
    targetAppId: targetAppId || '',
    organizationId: organizationId || '',
    targetAudit: auditResult,
    targetMetadata: {
      title: metadata?.title || '',
      subtitle: metadata?.subtitle || '',
      description: metadata?.description || '',
    },
    autoLoad: !!targetAppId && !!organizationId && !!auditResult,
    ruleConfig: {
      vertical: metadata?.applicationCategory,
      market: undefined, // Could be extracted from metadata if available
    },
  });

  // Phase 20 + Phase 2A + Phase 1.2: Load active rule set with React Query caching
  // Performance Optimization: Prevents database hit on every audit evaluation
  const { data: activeRuleSet, isLoading: isRuleSetLoading } = useCachedRuleSet({
    appId: metadata?.appId,
    category: metadata?.applicationCategory,
    title: metadata?.title,
    subtitle: metadata?.subtitle,
    description: metadata?.description,
    locale: metadata?.locale || 'en-US',
    enabled: !!metadata,
  });

  useEffect(() => {
    // Use mock data if specified
    if (useMockData) {
      setAuditResult(MOCK_PIMSLEUR_AUDIT);
      setIsLoading(false);
      return;
    }

    // Validate metadata
    if (!metadata) {
      setError('No metadata available for audit');
      setIsLoading(false);
      return;
    }

    // Wait for ruleset to load (Performance Phase 1.2)
    if (isRuleSetLoading) {
      setIsLoading(true);
      return;
    }

    // Phase 15.7: Now async to support Bible config loading
    // Phase 1.2: Pass cached ruleset to avoid database hit
    const runAudit = async () => {
      setIsLoading(true);
      try {
        // Run client-side scoring engine (now async for Bible integration)
        // Performance: Pass cached ruleset to skip database query
        const result = await MetadataAuditEngine.evaluate(metadata, {
          cachedRuleSet: activeRuleSet || undefined,
        });
        setAuditResult(result);
        setError(null);
      } catch (err) {
        console.error('Metadata audit engine failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setAuditResult(null);
      } finally {
        setIsLoading(false);
      }
    };

    runAudit();
  }, [metadata, useMockData, activeRuleSet, isRuleSetLoading]);

  // Intent Intelligence Integration (MUST be called on every render - React Hooks Rule)
  // Extract keywords safely, defaulting to empty arrays when auditResult is null
  const titleKeywords = auditResult?.keywordCoverage.titleKeywords || [];
  const subtitleKeywords = auditResult?.keywordCoverage.subtitleNewKeywords || [];
  const allKeywords = [...titleKeywords, ...subtitleKeywords];

  // Fetch intent intelligence data
  // enabled=false when error or no auditResult, so no data fetching happens
  const {
    clusters: intentClusters,
    auditSignals: intentAuditSignals,
    statistics: intentStatistics,
    isLoading: isIntentLoading,
  } = useIntentIntelligence({
    titleKeywords,
    subtitleKeywords,
    platform: 'ios',
    region: metadata?.locale?.split('-')[1]?.toLowerCase() || 'us',
    enabled: AUTOCOMPLETE_INTELLIGENCE_ENABLED && !error && !!auditResult && allKeywords.length > 0,
  });

  // KPI Engine Integration (Phase 1 + Phase 18)
  // Compute 43 KPIs across 6 families for metadata quality assessment
  const kpiResult = useMemo(() => {
    if (!auditResult || !metadata) return null;

    try {
      return KpiEngine.evaluate({
        title: metadata.title || '',
        subtitle: metadata.subtitle || '',
        platform: 'ios',
        locale: metadata.locale || 'us',
        comboCoverage: auditResult.comboCoverage,
        // Phase 18: Pass intent coverage from Search Intent Coverage Engine (Phase 17)
        intentCoverage: auditResult.intentCoverage,
        // Optional: Can add brand + intent signals when available
      });
    } catch (err) {
      console.error('KPI Engine evaluation failed:', err);
      return null;
    }
  }, [auditResult, metadata]);

  // Compute metadata dimension scores from existing data (for visualization)
  const metadataDimensionScores = useMemo(() => {
    if (!auditResult) return null;

    // Derive dimension scores from element scores and existing metrics
    const titleScore = auditResult.elements.title.score;
    const subtitleScore = auditResult.elements.subtitle.score;
    const avgElementScore = (titleScore + subtitleScore) / 2;

    // Compute brand balance from combos
    const brandStats = computeBrandRatioStats(
      [
        ...(auditResult.comboCoverage.titleCombosClassified || []),
        ...(auditResult.comboCoverage.subtitleNewCombosClassified || []),
      ],
      auditResult.comboCoverage.lowValueCombos
    );
    const { branded: brandCount, generic: genericCount, lowValue: noiseCount } = brandStats;

    const brandBalance = brandStats.totalMeaningful > 0
      ? Math.min(100, brandStats.genericRatio * 100 + 30)
      : 50;

    // Phase 18.5: Extract Intent Quality score from KPI Engine
    const intentQualityScore = kpiResult?.families?.intent_quality?.score || 0;

    const coverageStats = auditResult.comboCoverage.stats;
    let discoveryScore = Math.min(100, genericCount * 15);

    if (coverageStats) {
      const thresholds = coverageStats.thresholds || DEFAULT_DISCOVERY_THRESHOLDS;
      const pct = coverageStats.coveragePct || 0;
      if (pct >= thresholds.excellent) {
        discoveryScore = 100;
      } else if (pct >= thresholds.good) {
        discoveryScore = 75;
      } else if (pct >= thresholds.moderate) {
        discoveryScore = 50;
      } else {
        discoveryScore = 20;
      }
    }

    return {
      relevance: avgElementScore, // Average of title + subtitle scores
      discovery: discoveryScore,
      structure: titleScore, // Title score reflects structure quality
      brandBalance: brandBalance,
      intentQuality: intentQualityScore, // Intent Quality family score from KPI Engine
    };
  }, [auditResult, kpiResult]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            <p className="text-sm text-emerald-400 font-medium">Generating Audit...</p>
            <p className="text-xs text-zinc-500">Analyzing metadata and computing scores</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-zinc-900 border-red-400/30">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3 text-center max-w-md">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400 mb-1">Audit Failed</p>
              <p className="text-xs text-zinc-400">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data available (should not happen if loading is handled correctly)
  if (!auditResult) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-8 w-8 text-zinc-400" />
            <p className="text-sm text-zinc-400">No audit data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competitor Header (if in comparison mode) */}
      {isCompetitor && competitorName && (
        <Card className="bg-violet-900/10 border-violet-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-violet-500/40 text-violet-300 px-3 py-1">
                  📊 COMPETITOR
                </Badge>
                <h2 className="text-xl font-bold text-foreground">{competitorName}</h2>
              </div>
              {auditResult?.kpis?.overall_score !== undefined && baselineAudit?.kpis?.overall_score !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">vs Your App:</span>
                  {(() => {
                    const delta = getDelta(auditResult.kpis.overall_score, baselineAudit.kpis.overall_score);
                    if (!delta) return null;
                    return (
                      <Badge
                        variant="outline"
                        className={delta.isPositive ? 'border-green-500/40 text-green-400' : 'border-red-500/40 text-red-400'}
                      >
                        {delta.label}
                      </Badge>
                    );
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Score Card */}
      <MetadataScoreCard auditResult={auditResult} baselineAudit={baselineAudit} isCompetitor={isCompetitor} />

      {/* Intent Engine Diagnostics (DEV ONLY) */}
      <IntentEngineDiagnosticsPanel
        auditResult={auditResult}
        patternsLoaded={auditResult.intentEngineDiagnostics?.patternsLoaded}
        fallbackMode={auditResult.intentEngineDiagnostics?.fallbackMode}
        cacheTtlRemaining={auditResult.intentEngineDiagnostics?.cacheTtlRemaining}
      />

      {/* ======================================================================
          PHASE 21 — VERTICAL INTELLIGENCE LAYER
          ====================================================================== */}
      {auditResult.verticalContext && (
        <div className="space-y-4 mt-6">
          <div className="relative">
            <h3 className="text-base font-mono tracking-wide uppercase text-zinc-300 mb-3 flex items-center gap-2">
              <div className="h-[2px] w-8 bg-violet-500/40" />
              VERTICAL INTELLIGENCE LAYER
              <div className="flex-1 h-[2px] bg-gradient-to-r from-violet-500/40 to-transparent" />
            </h3>
            <p className="text-xs text-zinc-500 mb-4 -mt-2">
              Vertical-specific insights, benchmarks, and conversion drivers
            </p>
          </div>

          {/* Row 1: Overview + Benchmarks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <VerticalOverviewPanel verticalContext={auditResult.verticalContext} />
            <VerticalBenchmarksPanel verticalContext={auditResult.verticalContext} auditResult={auditResult} />
          </div>

          {/* Row 2: Conversion Drivers */}
          <VerticalConversionDriversPanel verticalContext={auditResult.verticalContext} auditResult={auditResult} />
        </div>
      )}

      {/* ======================================================================
          CHAPTER 1 — METADATA HEALTH
          ====================================================================== */}
      {metadataDimensionScores && (
        <div className="space-y-4 mt-6">
          <div className="relative">
            <h3 className="text-base font-mono tracking-wide uppercase text-zinc-300 mb-3 flex items-center gap-2">
              <div className="h-[2px] w-8 bg-cyan-500/40" />
              CHAPTER 1 — METADATA HEALTH
              <div className="flex-1 h-[2px] bg-gradient-to-r from-cyan-500/40 to-transparent" />
            </h3>
            <p className="text-xs text-zinc-500 mb-4 -mt-2">
              Overall metadata quality, dimension balance, and optimization opportunities
            </p>
          </div>

          {/* Row 1: Opportunity Delta + Dimension Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetadataOpportunityDeltaChart
              keywordCoverageScore={auditResult.keywordCoverage.totalUniqueKeywords * 5}
              comboCoverageScore={Math.min(100, auditResult.comboCoverage.totalCombos * 8)}
              intentCoverageScore={intentStatistics.coverageScore || 0}
              metadataDimensionScores={metadataDimensionScores}
            />
            <MetadataDimensionRadar metadataDimensionScores={metadataDimensionScores} />
          </div>

          {/* Row 2: Discovery Footprint */}
          <DiscoveryFootprintMap
            comboCoverage={auditResult.comboCoverage}
            intentDiagnostics={auditResult.intentCoverage?.diagnostics}
          />
        </div>
      )}

      {/* Metadata KPI Engine (Phase 1: 34 KPIs across 6 families) */}
      {kpiResult && (
        <div>
          <h3 className="text-base font-normal tracking-wide uppercase text-zinc-300 mb-3 flex items-center gap-2">
            <div className="h-[2px] w-8 bg-emerald-500/40" />
            📊 METADATA KPI ANALYSIS
            <div className="flex-1 h-[2px] bg-gradient-to-r from-emerald-500/40 to-transparent" />
          </h3>
          <MetadataKpiGrid kpiResult={kpiResult} />
        </div>
      )}

      {/* ======================================================================
          CHAPTER 3 — RANKING DRIVERS & GAPS
          ====================================================================== */}
      <div className="space-y-4 mt-6">
        <div className="relative">
          <h3 className="text-base font-mono tracking-wide uppercase text-zinc-300 mb-3 flex items-center gap-2">
            <div className="h-[2px] w-8 bg-orange-500/40" />
            CHAPTER 3 — RANKING DRIVERS & GAPS
            <div className="flex-1 h-[2px] bg-gradient-to-r from-orange-500/40 to-transparent" />
          </h3>
          <p className="text-xs text-zinc-500 mb-4 -mt-2">
            Actionable recommendations prioritized by severity and ranking impact
          </p>
        </div>

        {/* Severity Donut */}
        {auditResult.topRecommendations.length > 0 && (
          <SeverityDonut recommendations={auditResult.topRecommendations} />
        )}

        <RecommendationsPanel
          recommendations={auditResult.topRecommendations}
          type="ranking"
          comboCoverage={auditResult.comboCoverage}
          intentRecommendations={intentAuditSignals?.recommendations || []}
        />
      </div>

      {/* Element Detail Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-normal tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <div className="h-[2px] w-8 bg-orange-500/40" />
          ASO RANKING ELEMENTS
          <div className="flex-1 h-[2px] bg-gradient-to-r from-orange-500/40 to-transparent" />
        </h3>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest -mt-2 mb-3">
          These elements directly influence App Store search ranking
        </p>

        <ElementDetailCard
          elementResult={auditResult.elements.title}
          elementDisplayName="Title"
          metadata={metadata}
          auditResult={auditResult}
          baselineAudit={baselineAudit}
          isCompetitor={isCompetitor}
        />

        <ElementDetailCard
          elementResult={auditResult.elements.subtitle}
          elementDisplayName="Subtitle"
          metadata={metadata}
          auditResult={auditResult}
          baselineAudit={baselineAudit}
          isCompetitor={isCompetitor}
        />
      </div>

      {/* Conversion Intelligence Section */}
      <div className="space-y-4">
        <h3 className="text-base font-normal tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <div className="h-[2px] w-8 bg-orange-500/40" />
          💰 CONVERSION INTELLIGENCE
          <div className="flex-1 h-[2px] bg-gradient-to-r from-orange-500/40 to-transparent" />
        </h3>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest -mt-2 mb-3">
          Description does NOT influence App Store ranking • Evaluated for conversion quality only
        </p>

        <ElementDetailCard
          elementResult={auditResult.elements.description}
          elementDisplayName="Description (Conversion Only)"
          metadata={metadata}
          baselineAudit={baselineAudit}
          isCompetitor={isCompetitor}
        />

        {/* Conversion Recommendations */}
        <RecommendationsPanel
          recommendations={auditResult.conversionRecommendations || []}
          type="conversion"
        />
      </div>

      {/* ======================================================================
          CHAPTER 2 — COVERAGE MECHANICS
          ====================================================================== */}
      <div className="space-y-4 mt-6">
        <div className="relative">
          <h3 className="text-base font-mono tracking-wide uppercase text-zinc-300 mb-3 flex items-center gap-2">
            <div className="h-[2px] w-8 bg-emerald-500/40" />
            CHAPTER 2 — COVERAGE MECHANICS
            <div className="flex-1 h-[2px] bg-gradient-to-r from-emerald-500/40 to-transparent" />
          </h3>
          <p className="text-xs text-zinc-500 mb-4 -mt-2">
            Keyword distribution, slot utilization, semantic density, and hook diversity analysis
          </p>
        </div>

        {/* Row 1: Keyword Coverage Card + Slot Utilization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <KeywordCoverageCard keywordCoverage={auditResult.keywordCoverage} />
          <SlotUtilizationBars
            keywordCoverage={auditResult.keywordCoverage}
            platform={metadata.platform}
          />
        </div>

        {/* Row 2: Token Mix + Efficiency + Hook Diversity */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <TokenMixDonut keywordCoverage={auditResult.keywordCoverage} />
          <EfficiencySparkline
            keywordCoverage={auditResult.keywordCoverage}
            platform={metadata.platform}
          />
          <SemanticDensityGauge comboCoverage={auditResult.comboCoverage} />
        </div>

        {/* Row 3: Hook Diversity Wheel */}
        <HookDiversityWheel
          comboCoverage={auditResult.comboCoverage}
          keywordCoverage={auditResult.keywordCoverage}
          activeRuleSet={activeRuleSet || undefined}
        />

        {/* Row 4: Enhanced Keyword Combo Workbench (Full Width) */}
        <EnhancedKeywordComboWorkbench
          comboCoverage={auditResult.comboCoverage}
          keywordCoverage={auditResult.keywordCoverage}
          metadata={{
            title: metadata.title || '',
            subtitle: metadata.subtitle || '',
          }}
        />

        {/* Row 5: Search Intent Analysis (Full Width) */}
        {AUTOCOMPLETE_INTELLIGENCE_ENABLED && !isIntentLoading && intentClusters.length > 0 && (
          <SearchIntentAnalysisCard
            clusters={intentClusters}
            auditSignals={intentAuditSignals}
            totalKeywords={intentStatistics.totalKeywords}
          />
        )}
      </div>

      {/* ======================================================================
          CHAPTER 4 — COMPETITIVE INTELLIGENCE
          ====================================================================== */}
      {!isCompetitor && targetAppId && organizationId && (
        <div className="space-y-6 mt-12">
          <div className="relative">
            <h3 className="text-base font-mono tracking-wide uppercase text-zinc-300 mb-3 flex items-center gap-2">
              <div className="h-[2px] w-8 bg-violet-500/40" />
              CHAPTER 4 — COMPETITIVE INTELLIGENCE
              <div className="flex-1 h-[2px] bg-gradient-to-r from-violet-500/40 to-transparent" />
            </h3>
            <p className="text-xs text-zinc-500 mb-6 -mt-2">
              Compare your metadata against competitors using ASO Bible analysis • Discover gaps, opportunities, and winning strategies
            </p>
          </div>

          {/* Competitor Management Panel */}
          <CompetitorManagementPanel
            targetAppId={targetAppId}
            organizationId={organizationId}
            onCompetitorsUpdated={() => {
              competitorAnalysis.loadCompetitors();
            }}
            onAnalyzeClick={(audits) => {
              competitorAnalysis.runComparison(audits);
            }}
          />

          {/* Comparison View: Tabs */}
          {competitorAnalysis.hasAudits && competitorAnalysis.competitorAudits.length > 0 && auditResult && (
            <Tabs defaultValue="comparison" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="comparison" className="text-sm">
                  📊 Comparison
                </TabsTrigger>
                <TabsTrigger value="individual" className="text-sm">
                  📋 Individual Audits
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Comparison Mode */}
              <TabsContent value="comparison" className="space-y-6">
                {/* Comparison Summary */}
                <CompetitorComparisonSummary
                  baselineApp={{
                    id: targetAppId,
                    name: metadata.name || metadata.title,
                    audit: auditResult,
                    isBaseline: true,
                  }}
                  competitorApps={competitorAnalysis.competitorAudits.map((comp) => ({
                    id: comp.competitorId,
                    name: comp.metadata.name || comp.metadata.title,
                    audit: comp.audit ?? comp.auditData ?? null,
                  }))}
                />

                {/* Comparison Table */}
                <CompetitorComparisonTable
                  baselineApp={{
                    id: targetAppId,
                    name: metadata.name || metadata.title,
                    audit: auditResult,
                    isBaseline: true,
                  }}
                  competitorApps={competitorAnalysis.competitorAudits.map((comp) => ({
                    id: comp.competitorId,
                    name: comp.metadata.name || comp.metadata.title,
                    audit: comp.audit ?? comp.auditData ?? null,
                  }))}
                  platform={metadata.platform}
                />
              </TabsContent>

              {/* Tab 2: Individual Audits (Original Stacked View) */}
              <TabsContent value="individual" className="space-y-8">
                {/* Your App Audit */}
                <div className="border-t-2 border-emerald-500/20 pt-8">
                  <Card className="bg-emerald-900/10 border-emerald-500/30 p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                        Your App
                      </Badge>
                      <span className="text-sm text-zinc-300 font-medium">
                        {metadata.name || metadata.title}
                      </span>
                    </div>
                  </Card>
                  {/* Reference to full audit above - no duplication */}
                  <p className="text-xs text-zinc-400 italic">
                    See full audit above (CHAPTER 1-3)
                  </p>
                </div>

                {/* Competitor Audits */}
                {competitorAnalysis.competitorAudits.map((competitorAudit) => (
                  <div key={competitorAudit.competitorId} className="border-t-2 border-violet-500/20 pt-8">
                    <UnifiedMetadataAuditModule
                      metadata={{
                        ...competitorAudit.metadata,
                        title: competitorAudit.metadata.name || competitorAudit.metadata.title,
                        appStoreSubtitle: competitorAudit.metadata.subtitle,
                        subtitle: competitorAudit.metadata.subtitle,
                        description: competitorAudit.metadata.description,
                        appId: competitorAudit.metadata.appStoreId,
                        icon: competitorAudit.metadata.iconUrl || '',
                        locale: competitorAudit.metadata.country || 'us',
                        applicationCategory: competitorAudit.metadata.category || undefined,
                        developer: competitorAudit.metadata.developerName || undefined,
                        sellerName: competitorAudit.metadata.developerName || undefined,
                      }}
                      isCompetitor={true}
                      baselineAudit={auditResult}
                      competitorName={competitorAudit.metadata.name}
                    />
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}

          {/* Empty State - Encourage Adding Competitors */}
          {!competitorAnalysis.hasCompetitors && !competitorAnalysis.loading && (
            <div className="p-8 bg-violet-900/10 rounded-lg border border-violet-500/20 text-center">
              <p className="text-sm text-violet-300 mb-2">
                📊 Add competitors to unlock competitive insights
              </p>
              <p className="text-xs text-zinc-400">
                Compare your metadata against top competitors, discover keyword gaps, and get ASO Brain-powered recommendations
              </p>
            </div>
          )}

          {/* Needs Audit State */}
          {competitorAnalysis.hasCompetitors && competitorAnalysis.needsAudit && !competitorAnalysis.auditing && (
            <div className="p-6 bg-amber-900/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-300 mb-2">
                ⚡ Audit your competitors to see comparison results
              </p>
              <p className="text-xs text-zinc-400 mb-4">
                Click "Audit All" above to analyze competitor metadata using the same ASO Brain engine
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
