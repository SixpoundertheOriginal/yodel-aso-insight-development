/**
 * LLM Optimization Tab
 *
 * Analyzes app description for LLM discoverability in ChatGPT, Claude, Perplexity.
 * Phase 1: Rule-based analysis with manual trigger
 * Phase 2: AI-powered optimization (coming soon)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, RefreshCw, Info, Brain, Zap, Clock } from 'lucide-react';
import { cn, tacticalEffects, auditTypography, auditSpacing } from '@/design-registry';
import { toast } from 'sonner';

import { LLMVisibilityScoreCard } from './LLMVisibilityScoreCard';
import { LLMFindingsPanel } from './LLMFindingsPanel';
import { LLMSnippetLibrary } from './LLMSnippetLibrary';
import { LLMClusterCoverageChart } from './LLMClusterCoverageChart';
import { LLMIntentCoverageMatrix } from './LLMIntentCoverageMatrix';

import {
  analyzeLLMVisibilityForApp,
  getLatestLLMVisibilityAnalysis,
  descriptionNeedsAnalysis,
} from '@/services/llm-visibility.service';
import type { LLMVisibilityAnalysis } from '@/engine/llmVisibility/llmVisibility.types';
import type { ScrapedMetadata } from '@/types/aso';

interface LLMOptimizationTabProps {
  metadata: ScrapedMetadata;
  organizationId: string;
  monitoredAppId?: string;
}

export const LLMOptimizationTab: React.FC<LLMOptimizationTabProps> = ({
  metadata,
  organizationId,
  monitoredAppId,
}) => {
  const [analysis, setAnalysis] = useState<LLMVisibilityAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsAnalysis, setNeedsAnalysis] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

  // Load existing analysis on mount
  useEffect(() => {
    loadExistingAnalysis();
  }, [metadata.appId, metadata.description]);

  const loadExistingAnalysis = async () => {
    if (!monitoredAppId) {
      setIsLoading(false);
      setNeedsAnalysis(true);
      return;
    }

    try {
      setIsLoading(true);

      // Try to load latest analysis
      const latest = await getLatestLLMVisibilityAnalysis(monitoredAppId);

      if (latest) {
        setAnalysis(latest);
        setLastAnalyzedAt(latest.score.analyzed_at);

        // Check if description has changed since last analysis
        const requiresReanalysis = await descriptionNeedsAnalysis(
          monitoredAppId,
          metadata.description || '',
          '1.0.0'
        );

        setNeedsAnalysis(requiresReanalysis);
      } else {
        setNeedsAnalysis(true);
      }
    } catch (error) {
      console.error('[LLM Optimization] Failed to load analysis:', error);
      setNeedsAnalysis(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async (forceRefresh = false) => {
    if (!metadata.description) {
      toast.error('No description found to analyze');
      return;
    }

    setIsAnalyzing(true);

    try {
      console.log('[LLM Optimization] Analyzing description...');

      const result = await analyzeLLMVisibilityForApp({
        organizationId,
        monitoredAppId: monitoredAppId || metadata.appId,
        description: metadata.description,
        metadata: {
          title: metadata.title,
          subtitle: metadata.subtitle,
          vertical: metadata.vertical,
          market: metadata.locale,
        },
        forceRefresh,
      });

      setAnalysis(result.analysis);
      setLastAnalyzedAt(result.analysis.score.analyzed_at);
      setNeedsAnalysis(false);

      if (result.cacheHit) {
        toast.success('Analysis loaded from cache (instant)');
      } else {
        toast.success(`Analysis complete! Overall score: ${result.analysis.score.overall}/100`);
      }
    } catch (error: any) {
      console.error('[LLM Optimization] Analysis failed:', error);
      toast.error(`Analysis failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-sm text-zinc-400">Loading analysis...</p>
        </div>
      </div>
    );
  }

  // No description state
  if (!metadata.description) {
    return (
      <Card className={cn(
        "border-zinc-800 bg-zinc-950/50",
        tacticalEffects.glassPanel.light
      )}>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Brain className="h-12 w-12 text-zinc-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                No Description Found
              </h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                This app doesn't have a description to analyze. LLM Optimization requires
                an App Store description to analyze discoverability.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state (no analysis yet)
  if (!analysis && !isAnalyzing) {
    return (
      <div className="space-y-6">
        {/* Info Banner */}
        <Alert className="border-cyan-800/30 bg-cyan-950/20">
          <Info className="h-4 w-4 text-cyan-400" />
          <AlertDescription className="text-cyan-200/80">
            <strong>LLM Optimization</strong> analyzes how well your app description performs
            when users ask ChatGPT, Claude, or Perplexity for app recommendations.
            <br />
            <span className="text-xs text-cyan-300/60 mt-1 block">
              Phase 1: Rule-based analysis • Phase 2 (coming soon): AI-powered rewriting
            </span>
          </AlertDescription>
        </Alert>

        {/* CTA Card */}
        <Card className={cn(
          "relative overflow-hidden",
          tacticalEffects.glassPanel.medium,
          tacticalEffects.gridOverlay.className
        )}>
          {/* Corner brackets */}
          <div className={cn(
            tacticalEffects.cornerBracket.topLeft,
            tacticalEffects.cornerBracket.colors.cyan,
            tacticalEffects.cornerBracket.animated
          )} />
          <div className={cn(
            tacticalEffects.cornerBracket.bottomRight,
            tacticalEffects.cornerBracket.colors.cyan,
            tacticalEffects.cornerBracket.animated
          )} />

          <CardContent className="py-12 relative z-10">
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <Sparkles className="h-8 w-8 text-cyan-400" style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))' }} />
              </div>

              <div>
                <h3 className={cn("mb-3", auditTypography.section.main)}>
                  Analyze for LLM Discoverability
                </h3>
                <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
                  Get a comprehensive analysis of how well your app description is structured
                  for LLM-powered search engines. Discover what makes your app discoverable
                  when users ask AI assistants for recommendations.
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={() => handleAnalyze(false)}
                  size="lg"
                  className={cn(
                    "bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400",
                    "text-white font-semibold px-8",
                    "shadow-lg shadow-cyan-500/20",
                    "transition-all duration-200",
                    "hover:shadow-xl hover:shadow-cyan-500/30",
                    "hover:scale-105"
                  )}
                >
                  <Brain className="h-5 w-5 mr-2" />
                  Analyze Description
                </Button>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Instant Results</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5 text-cyan-400" />
                  <span>6 Analysis Dimensions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Actionable Insights</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Analysis view
  return (
    <div className="space-y-6">
      {/* Header with Re-analyze button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("mb-1", auditTypography.section.main)}>
            LLM Visibility Analysis
          </h2>
          {lastAnalyzedAt && (
            <p className="text-xs text-zinc-500 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Last analyzed: {new Date(lastAnalyzedAt).toLocaleString()}
              {needsAnalysis && (
                <Badge variant="outline" className="ml-2 text-orange-400 border-orange-400/30">
                  Description changed
                </Badge>
              )}
            </p>
          )}
        </div>

        <Button
          onClick={() => handleAnalyze(true)}
          variant="outline"
          size="sm"
          disabled={isAnalyzing}
          className={cn(
            "border-cyan-800/50 hover:border-cyan-600/70",
            "hover:bg-cyan-950/30",
            "text-cyan-300"
          )}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-analyze
            </>
          )}
        </Button>
      </div>

      {analysis && (
        <>
          {/* Score Card */}
          <LLMVisibilityScoreCard analysis={analysis} />

          {/* Findings & Recommendations */}
          <LLMFindingsPanel findings={analysis.findings} />

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cluster Coverage */}
            <LLMClusterCoverageChart clusterCoverage={analysis.cluster_coverage} />

            {/* Intent Coverage */}
            <LLMIntentCoverageMatrix intentCoverage={analysis.intent_coverage} />
          </div>

          {/* Snippet Library */}
          <LLMSnippetLibrary snippets={analysis.snippets} />
        </>
      )}
    </div>
  );
};
