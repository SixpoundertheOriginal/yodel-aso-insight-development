/**
 * Competitive Intelligence Tab
 *
 * Main container for competitor analysis features:
 * - Competitor search and selection (max 10)
 * - Auto-suggest based on keyword overlap
 * - Side-by-side comparison (Comparison tab)
 * - Gap analysis: missing keywords, combos, frequency gaps (Gaps tab)
 *
 * Flow:
 * 1. User clicks "Analyze Competitors"
 * 2. Modal opens: search/select competitors
 * 3. Analysis runs (with progress indicator)
 * 4. Results displayed in Comparison and Gaps tabs
 * 5. Competitors saved to app_competitors table (if monitored)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Target, TrendingUp, Search, Loader2, RefreshCw, Clock, History } from 'lucide-react';
import { ScrapedMetadata, UnifiedMetadataAuditResult } from '@/types/aso';
import { CompetitorSearchModal } from './CompetitorSearchModal';
import { ComparisonTable } from './ComparisonTable';
import { GapAnalysisPanels } from './GapAnalysisPanels';
import { CompetitorList } from './CompetitorList';
import { HistoryDialog } from './HistoryDialog';
import { analyzeCompetitors } from '@/services/competitive-analysis-v2.service';
import { useMetadataAuditV2 } from '@/hooks/useMetadataAuditV2';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  AnalyzeCompetitorsData,
  AnalysisProgress,
  SelectedCompetitor,
  CompetitiveIntelligenceTab as TabType,
} from '@/types/competitiveIntelligence';

interface CompetitiveIntelligenceTabProps {
  metadata: ScrapedMetadata | null;
  organizationId: string;
  monitoredAppId?: string;
  auditData?: UnifiedMetadataAuditResult | null; // For auto-suggest
}

export const CompetitiveIntelligenceTab: React.FC<CompetitiveIntelligenceTabProps> = ({
  metadata,
  organizationId,
  monitoredAppId,
  auditData: auditDataProp,
}) => {
  const [selectedTab, setSelectedTab] = useState<TabType>('comparison');
  const [analysisData, setAnalysisData] = useState<AnalyzeCompetitorsData | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress>({
    status: 'idle',
    currentStep: '',
    progress: 0,
  });
  const [selectedCompetitors, setSelectedCompetitors] = useState<SelectedCompetitor[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<{
    isCached: boolean;
    cachedAt?: string;
  }>({ isCached: false });
  const [savedCompetitors, setSavedCompetitors] = useState<Array<{
    relationshipId: string;
    appStoreId: string;
    name: string;
    iconUrl: string | null;
    developer: string | null;
    priority: number;
    lastComparedAt: string | null;
  }>>([]);
  const [effectiveMonitoredAppId, setEffectiveMonitoredAppId] = useState<string | undefined>(monitoredAppId);

  // Get audit data for auto-suggest (use prop if provided, otherwise fetch)
  const { auditResult: fetchedAuditResult } = useMetadataAuditV2({
    metadata,
    organizationId,
    enabled: !auditDataProp && !!metadata?.appId, // Only fetch if not provided
  });

  const auditData = auditDataProp || fetchedAuditResult;

  // Handler: Start analysis when competitors are selected
  const handleStartAnalysis = useCallback(async (competitors: SelectedCompetitor[], forceRefresh: boolean = false) => {
    if (!metadata?.appId) {
      toast.error('No app metadata available');
      return;
    }

    setSelectedCompetitors(competitors);
    setProgress({
      status: 'fetching',
      currentStep: forceRefresh ? 'Refreshing analysis...' : 'Preparing analysis...',
      progress: 0,
    });

    try {
      const result = await analyzeCompetitors({
        targetAppId: metadata.appId,
        competitors,
        organizationId,
        monitoredAppId: effectiveMonitoredAppId, // v2.1: Pass monitored app ID to fetch brand keywords
        targetAudit: auditData, // v2.1: Reuse existing audit (avoid re-audit, ensure consistency)
        forceRefresh, // Bypass cache if refresh requested
        onProgress: (step, progress) => {
          setProgress({
            status: 'analyzing',
            currentStep: step,
            progress,
          });
        },
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAnalysisData(result.data);
      setCacheStatus({
        isCached: result.cached || false,
        cachedAt: result.cachedAt,
      });
      setProgress({
        status: 'complete',
        currentStep: 'Analysis complete!',
        progress: 100,
      });

      const cacheMessage = result.cached ? ' (from cache)' : '';
      toast.success(`Analyzed ${result.data.competitors.length} competitors successfully!${cacheMessage}`);

      // Save competitors to database (if we have a monitored app ID)
      if (effectiveMonitoredAppId) {
        try {
          console.log('[CompetitiveIntelligence] Saving competitors to database...');

          // Upsert competitors (update if exists, insert if not)
          const competitorRecords = competitors.map((competitor) => ({
            organization_id: organizationId,
            target_app_id: effectiveMonitoredAppId,
            competitor_app_store_id: competitor.appStoreId,
            competitor_app_name: competitor.name,
            competitor_app_icon: competitor.iconUrl,
            competitor_developer: competitor.developer,
            country: 'us', // TODO: Get from target app's country
            priority: 2, // Default priority (not primary)
            is_active: true,
            last_compared_at: new Date().toISOString(),
          }));

          const { error: upsertError } = await supabase
            .from('app_competitors')
            .upsert(competitorRecords, {
              onConflict: 'organization_id,target_app_id,competitor_app_store_id,country',
              ignoreDuplicates: false, // Update existing records
            });

          if (upsertError) {
            console.error('[CompetitiveIntelligence] Failed to save competitors:', upsertError);
            // Don't fail the whole flow, just log the error
          } else {
            console.log('[CompetitiveIntelligence] ✅ Saved', competitorRecords.length, 'competitors');

            // Update savedCompetitors state with the newly saved competitors
            const savedCompetitorsData = competitorRecords.map((record, index) => ({
              relationshipId: '', // Will be filled by auto-load on next render
              appStoreId: record.competitor_app_store_id,
              name: record.competitor_app_name,
              iconUrl: record.competitor_app_icon,
              developer: record.competitor_developer,
              priority: record.priority,
              lastComparedAt: record.last_compared_at,
            }));
            setSavedCompetitors(savedCompetitorsData);
          }
        } catch (error: any) {
          console.error('[CompetitiveIntelligence] Error saving competitors:', error);
          // Don't fail the whole flow
        }
      }
    } catch (error: any) {
      console.error('[CompetitiveIntelligence] Analysis error:', error);
      setProgress({
        status: 'error',
        currentStep: '',
        progress: 0,
        error: error.message || 'An unexpected error occurred',
      });
      toast.error(`Analysis failed: ${error.message}`);
    }
  }, [metadata?.appId, organizationId, effectiveMonitoredAppId, auditData]);

  // Handler: Competitor removed
  const handleCompetitorRemoved = useCallback((appStoreId: string) => {
    // Remove from saved competitors list
    setSavedCompetitors((prev) => prev.filter((c) => c.appStoreId !== appStoreId));

    // Remove from selected competitors
    const remainingCompetitors = selectedCompetitors.filter((c) => c.appStoreId !== appStoreId);
    setSelectedCompetitors(remainingCompetitors);

    // Re-run analysis with remaining competitors if any
    if (remainingCompetitors.length > 0) {
      handleStartAnalysis(remainingCompetitors, true); // Force refresh
    } else {
      // No competitors left, reset analysis data
      setAnalysisData(null);
      setProgress({ status: 'idle', currentStep: '', progress: 0 });
    }
  }, [selectedCompetitors, handleStartAnalysis]);

  // Handler: Competitor priority changed
  const handleCompetitorPriorityChanged = useCallback((appStoreId: string, newPriority: number) => {
    // Update priority in saved competitors list
    setSavedCompetitors((prev) =>
      prev.map((c) => (c.appStoreId === appStoreId ? { ...c, priority: newPriority } : c))
    );
  }, []);

  // Auto-load saved competitors when app metadata is available
  useEffect(() => {
    const loadSavedCompetitors = async () => {
      console.log('[CompetitiveIntelligence] Auto-load effect triggered', {
        hasMetadata: !!metadata,
        appId: metadata?.appId,
        organizationId,
        monitoredAppIdProp: monitoredAppId,
        effectiveMonitoredAppId,
        progressStatus: progress.status,
        hasAnalysisData: !!analysisData,
      });

      if (!metadata?.appId || !organizationId) {
        console.log('[CompetitiveIntelligence] Skipping auto-load: missing metadata or orgId');
        return;
      }

      try {
        // Step 1: Find the monitored_app record for this App Store ID
        // (It might exist even if monitoredAppId prop wasn't passed)
        console.log('[CompetitiveIntelligence] Querying monitored_apps for', metadata.appId);

        const { data: targetApp, error: targetAppError } = await supabase
          .from('monitored_apps')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('app_id', metadata.appId) // Column is named 'app_id', not 'app_store_id'
          .eq('platform', 'ios')
          .maybeSingle();

        console.log('[CompetitiveIntelligence] Monitored app query result:', {
          found: !!targetApp,
          id: targetApp?.id,
          error: targetAppError,
        });

        if (targetAppError) {
          console.error('[CompetitiveIntelligence] Error finding target app:', targetAppError);
          return;
        }

        if (!targetApp) {
          console.log('[CompetitiveIntelligence] No monitored_app found for', metadata.appId);
          return;
        }

        const resolvedMonitoredAppId = monitoredAppId || targetApp.id;
        setEffectiveMonitoredAppId(resolvedMonitoredAppId);

        console.log('[CompetitiveIntelligence] Loading saved competitors for', resolvedMonitoredAppId);

        // Step 2: Query app_competitors table for this target app
        // Note: competitor data is stored directly in app_competitors (denormalized)
        // No join to monitored_apps needed for competitor details
        const { data: savedCompetitors, error } = await supabase
          .from('app_competitors')
          .select(`
            id,
            competitor_app_store_id,
            competitor_app_name,
            competitor_app_icon,
            competitor_developer,
            priority,
            last_compared_at
          `)
          .eq('target_app_id', resolvedMonitoredAppId)
          .eq('is_active', true)
          .order('priority', { ascending: true })
          .order('last_compared_at', { ascending: false, nullsFirst: false });

        if (error) {
          console.error('[CompetitiveIntelligence] Error loading saved competitors:', error);
          return;
        }

        if (!savedCompetitors || savedCompetitors.length === 0) {
          console.log('[CompetitiveIntelligence] No saved competitors found');
          return;
        }

        console.log('[CompetitiveIntelligence] Found', savedCompetitors.length, 'saved competitors');

        // Transform to SelectedCompetitor format for analysis
        const competitors: SelectedCompetitor[] = savedCompetitors.map((sc) => ({
          appStoreId: sc.competitor_app_store_id,
          name: sc.competitor_app_name,
          iconUrl: sc.competitor_app_icon || null,
          developer: sc.competitor_developer || null,
        }));

        // Also store full competitor info for CompetitorList component
        const competitorsWithMetadata = savedCompetitors.map((sc) => ({
          relationshipId: sc.id,
          appStoreId: sc.competitor_app_store_id,
          name: sc.competitor_app_name,
          iconUrl: sc.competitor_app_icon || null,
          developer: sc.competitor_developer || null,
          priority: sc.priority,
          lastComparedAt: sc.last_compared_at,
        }));

        setSavedCompetitors(competitorsWithMetadata);

        if (competitors.length > 0) {
          console.log('[CompetitiveIntelligence] Auto-loading analysis with', competitors.length, 'competitors...');

          // Set competitors (for UI display)
          setSelectedCompetitors(competitors);

          // Automatically trigger analysis (which will use cache if available)
          // Note: We call handleStartAnalysis directly here, not via dependency
          handleStartAnalysis(competitors);
        } else {
          console.log('[CompetitiveIntelligence] No competitors found to auto-load');
        }
      } catch (error) {
        console.error('[CompetitiveIntelligence] Failed to load saved competitors:', error);
      }
    };

    loadSavedCompetitors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata?.appId, organizationId, monitoredAppId]); // Run when these change (handleStartAnalysis intentionally excluded to avoid circular dependency)

  // No metadata = show empty state
  if (!metadata || !metadata.appId) {
    return (
      <>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Competitive Intelligence
            </CardTitle>
            <CardDescription>
              Analyze competitors to identify keyword opportunities and gaps
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-zinc-600 mb-4" />
            <p className="text-zinc-500 text-center max-w-md">
              Import or search for an app to analyze competitors
            </p>
          </CardContent>
        </Card>

        {/* Competitor Search Modal */}
        <CompetitorSearchModal
          open={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onStartAnalysis={handleStartAnalysis}
          initialSelected={selectedCompetitors}
          targetAppName={metadata?.name}
          keywordFrequency={auditData?.keywordFrequency}
          maxSuggestions={5}
        />
      </>
    );
  }

  // No analysis yet = show CTA
  if (!analysisData && progress.status === 'idle') {
    return (
      <>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            Competitive Intelligence
          </CardTitle>
          <CardDescription>
            Analyze up to 10 competitors to identify keyword opportunities and gaps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CTA Section */}
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-8">
            <div className="flex items-start gap-6">
              <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/30">
                <Search className="h-8 w-8 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-zinc-200 mb-2">
                  Find Algorithmic Visibility Opportunities
                </h3>
                <p className="text-zinc-400 mb-4 leading-relaxed">
                  Analyze your competitors' title and subtitle to discover:
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-zinc-300">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span><strong>Missing Keywords:</strong> High-value keywords your competitors use but you don't</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-zinc-300">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span><strong>Missing Combos:</strong> Powerful keyword combinations to add to your metadata</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-zinc-300">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span><strong>Frequency Gaps:</strong> Keywords you underutilize compared to competitors</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-zinc-300">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span><strong>Opportunity Scores:</strong> ROI-ranked recommendations for quick wins</span>
                  </li>
                </ul>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => {
                      console.log('[CompetitiveIntelligence] Button clicked');
                      console.log('[CompetitiveIntelligence] Current metadata:', metadata);
                      console.log('[CompetitiveIntelligence] Opening competitor search modal');
                      setShowSearchModal(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Select Competitors
                  </Button>
                  <p className="text-xs text-zinc-500">
                    Analysis takes ~5-10 seconds for up to 10 apps
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-zinc-800/40 border-zinc-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300">Focus: Title + Subtitle</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Analyzes algorithmic visibility factors only. Description analysis coming soon.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-800/40 border-zinc-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300">Auto-Suggest</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Find competitors using the same keywords from your Strategic Keyword Frequency panel.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-800/40 border-zinc-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300">Monitored Apps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {monitoredAppId
                    ? 'Competitors are saved and monitored along with this app.'
                    : 'Monitor this app to track competitors over time.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Competitor Search Modal */}
      <CompetitorSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onStartAnalysis={handleStartAnalysis}
        initialSelected={selectedCompetitors}
        targetAppName={metadata?.name}
        keywordFrequency={auditData?.keywordFrequency}
        maxSuggestions={5}
      />
    </>
    );
  }

  // Analysis in progress
  if (progress.status !== 'idle' && progress.status !== 'complete') {
    return (
      <>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Competitive Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-purple-400 animate-spin mb-4" />
            <p className="text-zinc-300 font-medium mb-2">{progress.currentStep}</p>
            <div className="w-full max-w-md bg-zinc-800 rounded-full h-2 mb-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">{progress.progress}% complete</p>
          </CardContent>
        </Card>

        {/* Competitor Search Modal */}
        <CompetitorSearchModal
          open={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onStartAnalysis={handleStartAnalysis}
          initialSelected={selectedCompetitors}
          targetAppName={metadata?.name}
          keywordFrequency={auditData?.keywordFrequency}
          maxSuggestions={5}
        />
      </>
    );
  }

  // Analysis error
  if (progress.status === 'error') {
    return (
      <>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Competitive Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-400 font-medium mb-2">Analysis Failed</p>
            <p className="text-zinc-500 text-sm text-center max-w-md mb-4">
              {progress.error || 'An unknown error occurred'}
            </p>
            <Button
              onClick={() => {
                setProgress({ status: 'idle', currentStep: '', progress: 0 });
                setAnalysisData(null);
              }}
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>

        {/* Competitor Search Modal */}
        <CompetitorSearchModal
          open={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onStartAnalysis={handleStartAnalysis}
          initialSelected={selectedCompetitors}
          targetAppName={metadata?.name}
          keywordFrequency={auditData?.keywordFrequency}
          maxSuggestions={5}
        />
      </>
    );
  }

  // Analysis complete - show results
  return (
    <div className="space-y-6">
      {/* Header with summary */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-mono tracking-wide uppercase text-zinc-200 flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-400" />
                Competitive Intelligence
              </CardTitle>
              <CardDescription className="text-zinc-400 mt-1 flex items-center gap-3">
                <span>Analyzing {analysisData?.competitors.length || 0} competitors vs {analysisData?.targetApp.name}</span>
                {cacheStatus.isCached && cacheStatus.cachedAt && (
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Cached {new Date(cacheStatus.cachedAt).toLocaleTimeString()}
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowHistoryDialog(true)}
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="View analysis history"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button
                onClick={() => handleStartAnalysis(selectedCompetitors, true)}
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Refresh analysis (bypass cache)"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => setShowSearchModal(true)}
                variant="outline"
                size="sm"
                className="border-purple-500/30 hover:bg-purple-500/10"
              >
                <Search className="h-4 w-4 mr-2" />
                Change Competitors
              </Button>
            </div>
          </div>
        </CardHeader>
        {analysisData && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Missing Keywords</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {analysisData.gapAnalysis.summary.totalMissingKeywords}
                </p>
              </div>
              <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Missing Combos</p>
                <p className="text-2xl font-bold text-blue-400">
                  {analysisData.gapAnalysis.summary.totalMissingCombos}
                </p>
              </div>
              <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Frequency Gaps</p>
                <p className="text-2xl font-bold text-purple-400">
                  {analysisData.gapAnalysis.summary.totalFrequencyGaps}
                </p>
              </div>
              <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Competitors</p>
                <p className="text-2xl font-bold text-zinc-300">
                  {analysisData.competitors.length}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Competitor List Management */}
      {effectiveMonitoredAppId && savedCompetitors.length > 0 && (
        <CompetitorList
          competitors={savedCompetitors}
          monitoredAppId={effectiveMonitoredAppId}
          organizationId={organizationId}
          onCompetitorRemoved={handleCompetitorRemoved}
          onCompetitorPriorityChanged={handleCompetitorPriorityChanged}
        />
      )}

      {/* Tabs: Comparison vs Gaps */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as TabType)}>
        <TabsList className="grid grid-cols-2 bg-zinc-900 border-zinc-800">
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="gaps">Gaps & Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4 mt-6">
          {analysisData && <ComparisonTable data={analysisData} />}
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4 mt-6">
          {analysisData && <GapAnalysisPanels gapAnalysis={analysisData.gapAnalysis} />}
        </TabsContent>
      </Tabs>

      {/* Competitor Search Modal */}
      <CompetitorSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onStartAnalysis={handleStartAnalysis}
        initialSelected={selectedCompetitors}
        targetAppName={metadata?.name}
        keywordFrequency={auditData?.keywordFrequency}
        maxSuggestions={5}
      />

      {/* History Dialog */}
      {effectiveMonitoredAppId && (
        <HistoryDialog
          open={showHistoryDialog}
          onClose={() => setShowHistoryDialog(false)}
          monitoredAppId={effectiveMonitoredAppId}
          organizationId={organizationId}
        />
      )}
    </div>
  );
};
