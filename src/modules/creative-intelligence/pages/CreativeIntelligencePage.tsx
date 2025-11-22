/**
 * Creative Intelligence Page
 *
 * Main page for the Creative Intelligence module.
 * Entry point for screenshot analysis, creative insights, and strategy building.
 *
 * Phase 0: Placeholder UI (21.11.2025)
 * Phase 1A: App selector integration (21.11.2025)
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WandSparkles, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScreenshotGrid } from '../components/ScreenshotGrid';
import { CompetitorGrid } from '../components/CompetitorGrid';
import { CreativeInsightsPanel } from '../components/CreativeInsightsPanel';
import { useCreativeAnalysis } from '../hooks/useCreativeAnalysis';
import { useCreativeApp } from '../hooks/useCreativeApp';
import { useCreativeIntelligence } from '@/hooks/useCreativeIntelligence';
import { AppSelectorModal } from '../components/AppSelectorModal';
import { ScreenshotAnalysisPanel } from '../components/ScreenshotAnalysisPanel';
import { AiCreativeInsightsPanel } from '../components/AiCreativeInsightsPanel';
import { CreativeScoreCard } from '../components/CreativeScoreCard';
import { CreativeSummaryCard } from '../components/CreativeSummaryCard';
import { metadataOrchestrator } from '@/services/metadata-adapters';
import { ScrapedMetadata } from '@/types/aso';
import { analyzeBatch, ScreenshotAnalysisResult, getBatchSummary } from '../services/screenshotAnalysisService';
import { aiCreativeInsightsService, AiCreativeInsights } from '../services/aiCreativeInsightsService';
import { usePermissions } from '@/hooks/usePermissions';
import { isAIInsightsEnabled } from '@/constants/features';
import { extractCategory } from '@/lib/metadata/extract-category';

export function CreativeIntelligencePage() {
  const [searchParams] = useSearchParams();
  const { isSuperAdmin } = usePermissions();

  const {
    screenshots,
    competitors,
    insights,
    isLoading,
    error,
    fetchScreenshots,
    fetchCompetitors,
  } = useCreativeAnalysis();

  const {
    selectedApp,
    isModalOpen,
    openSelector,
    closeSelector,
    selectApp,
  } = useCreativeApp();

  const [metadata, setMetadata] = useState<ScrapedMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Analysis state - MUST be declared before being used in useMemo
  const [analysisResults, setAnalysisResults] = useState<ScreenshotAnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [useAdvancedOcr, setUseAdvancedOcr] = useState(false);

  // Extract and normalize category from metadata using shared extractor
  const category = useMemo(() => {
    return extractCategory(metadata);
  }, [metadata]);

  // Use Creative Intelligence Registry for scoring (now category-aware)
  const {
    calculateWeightedScore,
    getPerformanceTier,
  } = useCreativeIntelligence(category);

  // Calculate overall score and tier when analysis is complete
  const { overallScore, performanceTier } = useMemo(() => {
    if (analysisResults.length === 0) {
      return { overallScore: undefined, performanceTier: undefined };
    }

    // Simple score calculation (CreativeScoreCard does more detailed version)
    const avgScore = analysisResults.reduce((sum, result) => {
      return sum + (result.layout?.layoutScore || 50);
    }, 0) / analysisResults.length;

    const scores = {
      visual: Math.round(avgScore),
      text: Math.round(avgScore * 0.9),
      messaging: Math.round(avgScore * 0.85),
      engagement: Math.round(avgScore * 0.95),
    };

    const score = calculateWeightedScore(scores);
    const tier = getPerformanceTier(score);

    return { overallScore: score, performanceTier: tier };
  }, [analysisResults, calculateWeightedScore, getPerformanceTier]);

  // Phase 3: AI Creative Insights state
  const [aiInsights, setAiInsights] = useState<AiCreativeInsights | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Check if AI insights are enabled (Yodel staff only)
  const canAccessAiInsights = isAIInsightsEnabled(isSuperAdmin);

  // Handle appId query param from CreativeSnapshot bridge
  useEffect(() => {
    const appIdFromUrl = searchParams.get('appId');

    if (appIdFromUrl) {
      console.log('[CreativeIntelligence] Received appId from URL:', appIdFromUrl);

      // Auto-load metadata if we have an appId
      loadMetadata(appIdFromUrl);

      // Set a placeholder selected app to prevent modal from opening
      selectApp({
        appId: appIdFromUrl,
        name: 'Loading...',
        icon: ''
      });
    } else if (!selectedApp) {
      // Only open modal if no appId param and no selected app
      openSelector();
    }
  }, [searchParams]);

  // Load metadata when app is selected (but not if already loaded from URL param)
  useEffect(() => {
    const appIdFromUrl = searchParams.get('appId');

    // Only load if we have a selected app and it's not already being loaded from URL
    if (selectedApp && !appIdFromUrl && selectedApp.name !== 'Loading...') {
      loadMetadata(selectedApp.appId);
    }
  }, [selectedApp]);

  const loadMetadata = async (appId: string) => {
    setIsLoadingMetadata(true);
    setMetadataError(null);

    try {
      console.log('[CreativeIntelligence] Loading metadata for:', appId);

      const result = await metadataOrchestrator.fetchMetadata(appId, {
        country: 'us'
      });

      console.log('[CreativeIntelligence] Metadata loaded:', {
        name: result.name,
        appId: result.appId,
        screenshots: result.screenshots?.length || 0
      });

      setMetadata(result as ScrapedMetadata);
    } catch (err: any) {
      console.error('[CreativeIntelligence] Failed to load metadata:', err);
      setMetadataError(err.message || 'Failed to load app metadata');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // Run analysis when metadata with screenshots is loaded
  useEffect(() => {
    if (metadata?.screenshots && metadata.screenshots.length > 0) {
      runAnalysis(metadata.screenshots);
    }
  }, [metadata]);

  const runAnalysis = async (screenshots: string[]) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResults([]);

    try {
      console.log('[CreativeIntelligence] Starting analysis of', screenshots.length, 'screenshots');
      console.log('[CreativeIntelligence] Advanced OCR:', useAdvancedOcr ? 'enabled' : 'disabled');

      const batchResult = await analyzeBatch(screenshots, useAdvancedOcr);

      if (batchResult.errorCount > 0) {
        console.warn('[CreativeIntelligence] Some screenshots failed to analyze:', batchResult.errors);
        setAnalysisError(`${batchResult.errorCount} screenshot(s) failed to analyze`);
      }

      console.log('[CreativeIntelligence] Analysis complete:', {
        success: batchResult.successCount,
        errors: batchResult.errorCount,
        time: batchResult.totalProcessingTime
      });

      setAnalysisResults(batchResult.results);

      // Log summary
      const summary = getBatchSummary(batchResult);
      console.log('[CreativeIntelligence] Batch summary:', summary);
    } catch (err: any) {
      console.error('[CreativeIntelligence] Analysis failed:', err);
      setAnalysisError(err.message || 'Failed to analyze screenshots');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Phase 3: Generate AI Creative Insights
  const generateAiInsights = async () => {
    if (!metadata || analysisResults.length === 0) {
      console.warn('[CreativeIntelligence] Cannot generate insights: missing metadata or analysis');
      return;
    }

    setIsGeneratingInsights(true);
    setInsightsError(null);

    try {
      console.log('[CreativeIntelligence] Generating AI creative insights...');

      const insights = await aiCreativeInsightsService.generateCreativeInsights({
        metadata,
        screenshots: metadata.screenshots || [],
        analysisResults
      });

      console.log('[CreativeIntelligence] AI insights generated successfully');
      setAiInsights(insights);
    } catch (err: any) {
      console.error('[CreativeIntelligence] Failed to generate AI insights:', err);
      setInsightsError(err.message || 'Failed to generate AI insights');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* App Selector Modal */}
      <AppSelectorModal
        isOpen={isModalOpen}
        onClose={closeSelector}
        onSelect={selectApp}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <WandSparkles className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Creative Intelligence</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Screenshot analysis, creative insights, and strategic recommendations
          </p>
        </div>
        <Button variant="outline" onClick={openSelector}>
          Change App
        </Button>
      </div>

      {/* Selected App Metadata */}
      {selectedApp && (
        <Card>
          <CardHeader>
            <CardTitle>Selected App</CardTitle>
            <CardDescription>
              App metadata loaded from orchestrator
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMetadata ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading app metadata...</span>
              </div>
            ) : metadataError ? (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                {metadataError}
              </div>
            ) : metadata ? (
              <div className="space-y-4">
                {/* App Header */}
                <div className="flex items-start gap-4">
                  {metadata.icon && (
                    <img
                      src={metadata.icon}
                      alt={metadata.name}
                      className="w-20 h-20 rounded-lg border border-border"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{metadata.name}</h3>
                    {metadata.subtitle && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {metadata.subtitle}
                      </p>
                    )}
                    {metadata.developer && (
                      <p className="text-xs text-muted-foreground mt-1">
                        by {metadata.developer}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>App ID: {metadata.appId}</span>
                      {metadata.applicationCategory && (
                        <span>Category: {metadata.applicationCategory}</span>
                      )}
                      {metadata.rating && (
                        <span>Rating: {metadata.rating.toFixed(1)} ⭐</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Screenshots Preview */}
                {metadata.screenshots && metadata.screenshots.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Screenshots ({metadata.screenshots.length})</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {metadata.screenshots.slice(0, 5).map((url, idx) => (
                        <div key={idx} className="aspect-[9/16] bg-muted rounded border border-border overflow-hidden">
                          <img
                            src={url}
                            alt={`Screenshot ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {metadata.screenshots.length > 5 && (
                        <div className="aspect-[9/16] bg-muted rounded border border-border flex items-center justify-center text-xs text-muted-foreground">
                          +{metadata.screenshots.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted rounded p-3">
                    No screenshots available for this app
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Creative Summary Card */}
      {!isAnalyzing && analysisResults.length > 0 && metadata && (
        <CreativeSummaryCard
          metadata={metadata}
          analysisResults={analysisResults}
          overallScore={overallScore}
          performanceTier={performanceTier}
          category={category}
        />
      )}

      {/* Screenshot Analysis Results */}
      {selectedApp && metadata && metadata.screenshots && metadata.screenshots.length > 0 && (
        <>
          {/* Analysis Status */}
          {isAnalyzing && (
            <Card className="border-primary">
              <CardContent className="py-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <div className="font-medium">Analyzing screenshots...</div>
                    <div className="text-sm text-muted-foreground">
                      Processing {metadata.screenshots.length} screenshot{metadata.screenshots.length !== 1 ? 's' : ''} with AI
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Error */}
          {analysisError && !isAnalyzing && (
            <Card className="border-destructive">
              <CardContent className="py-4">
                <div className="text-sm text-destructive">
                  ⚠️ {analysisError}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {!isAnalyzing && analysisResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Screenshot Analysis Results</h2>
                <Badge variant="outline" className="text-xs">
                  {analysisResults.length} screenshot{analysisResults.length !== 1 ? 's' : ''} analyzed
                </Badge>
              </div>

              {analysisResults.map((result, idx) => (
                <ScreenshotAnalysisPanel
                  key={idx}
                  analysis={result}
                  screenshotUrl={result.screenshotUrl}
                />
              ))}
            </div>
          )}

          {/* Creative Intelligence Registry Score Card (Phase 1) */}
          {!isAnalyzing && analysisResults.length > 0 && metadata && (
            <CreativeScoreCard
              metadata={metadata}
              analysisResults={analysisResults}
            />
          )}

          {/* Phase 3: AI Creative Insights Section (Yodel Staff Only) */}
          {canAccessAiInsights && !isAnalyzing && analysisResults.length > 0 && (
            <>
              {/* Generate Insights Button */}
              {!aiInsights && !isGeneratingInsights && (
                <div className="flex items-center justify-center py-6">
                  <Button
                    onClick={generateAiInsights}
                    size="lg"
                    className="gap-2"
                  >
                    <Sparkles className="h-5 w-5" />
                    Generate AI Creative Insights
                  </Button>
                </div>
              )}

              {/* AI Insights Panel */}
              <AiCreativeInsightsPanel
                insights={aiInsights}
                isLoading={isGeneratingInsights}
                error={insightsError}
              />
            </>
          )}
        </>
      )}

      {/* Placeholder: Future Sections */}
      {selectedApp && metadata && (
        <>

          {/* Competitor Grid Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Competitor Analysis</CardTitle>
              <CardDescription>
                Compare with competitor creatives (Phase 2)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Competitor analysis coming in Phase 2
              </div>
            </CardContent>
          </Card>

          {/* Insights Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Creative Insights</CardTitle>
              <CardDescription>
                AI-generated creative recommendations (Phase 4)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                AI insights coming in Phase 4
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
