/**
 * Unified Metadata Audit Module
 *
 * Main container for the Metadata Audit V2 UI.
 * Performs client-side scoring using MetadataAuditEngine (no API calls).
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { MetadataAuditEngine } from '@/engine/metadata/metadataAuditEngine';
import type { ScrapedMetadata } from '@/types/aso';
import type { UnifiedMetadataAuditResult } from './types';
import { MetadataScoreCard } from './MetadataScoreCard';
import { ElementDetailCard } from './ElementDetailCard';
import { KeywordCoverageCard } from './KeywordCoverageCard';
import { ComboCoverageCard } from './ComboCoverageCard';
import { SearchIntentAnalysisCard } from './SearchIntentAnalysisCard';
import { RecommendationsPanel } from './RecommendationsPanel';
import { useIntentIntelligence } from '@/hooks/useIntentIntelligence';
import { AUTOCOMPLETE_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';
import { MOCK_PIMSLEUR_AUDIT } from './mockAuditResult';

interface UnifiedMetadataAuditModuleProps {
  metadata: ScrapedMetadata;
  useMockData?: boolean; // For development/testing
}

export const UnifiedMetadataAuditModule: React.FC<UnifiedMetadataAuditModuleProps> = ({
  metadata,
  useMockData = false,
}) => {
  const [auditResult, setAuditResult] = useState<UnifiedMetadataAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use mock data if specified
    if (useMockData) {
      setAuditResult(MOCK_PIMSLEUR_AUDIT);
      return;
    }

    // Validate metadata
    if (!metadata) {
      setError('No metadata available for audit');
      return;
    }

    try {
      // Run client-side scoring engine (instant, synchronous)
      const result = MetadataAuditEngine.evaluate(metadata);
      setAuditResult(result);
      setError(null);
    } catch (err) {
      console.error('Metadata audit engine failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setAuditResult(null);
    }
  }, [metadata, useMockData]);

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

  // No data available
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
      {/* Overall Score Card */}
      <MetadataScoreCard auditResult={auditResult} />

      {/* ASO Ranking Recommendations (title + subtitle) */}
      <div>
        <h3 className="text-base font-normal tracking-wide uppercase text-zinc-300 mb-3 flex items-center gap-2">
          <div className="h-[2px] w-8 bg-orange-500/40" />
          🎯 ASO RANKING RECOMMENDATIONS
          <div className="flex-1 h-[2px] bg-gradient-to-r from-orange-500/40 to-transparent" />
        </h3>
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
        />

        <ElementDetailCard
          elementResult={auditResult.elements.subtitle}
          elementDisplayName="Subtitle"
          metadata={metadata}
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
        />

        {/* Conversion Recommendations */}
        <RecommendationsPanel
          recommendations={auditResult.conversionRecommendations || []}
          type="conversion"
        />
      </div>

      {/* Keyword & Combo Coverage - Side by Side */}
      <div className="space-y-4">
        <h3 className="text-base font-normal tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <div className="h-[2px] w-8 bg-orange-500/40" />
          COVERAGE ANALYSIS
          <div className="flex-1 h-[2px] bg-gradient-to-r from-orange-500/40 to-transparent" />
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <KeywordCoverageCard keywordCoverage={auditResult.keywordCoverage} />
          <ComboCoverageCard comboCoverage={auditResult.comboCoverage} />
        </div>

        {/* Search Intent Analysis (Full Width) */}
        {AUTOCOMPLETE_INTELLIGENCE_ENABLED && !isIntentLoading && intentClusters.length > 0 && (
          <SearchIntentAnalysisCard
            clusters={intentClusters}
            auditSignals={intentAuditSignals}
            totalKeywords={intentStatistics.totalKeywords}
          />
        )}
      </div>
    </div>
  );
};
