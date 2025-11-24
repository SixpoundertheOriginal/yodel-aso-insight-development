import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { ScrapedMetadata } from '@/types/aso';
import { debug, metadataDigest } from '@/lib/logging';
import { AmbiguousSearchError } from '@/types/search-errors';
import { DataImporter } from '@/components/shared/DataImporter';
import { AppSelectionModal } from '@/components/shared/AsoShared/AppSelectionModal';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, AlertCircle, Search, Zap, Loader2, Target, Settings, Shield, Activity, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PreLaunchModeSelector } from './PreLaunchModeSelector';
import { PreLaunchForm, PreLaunchFormData } from './PreLaunchForm';
import { strategicKeywordResearchService, StrategicKeywordResult } from '@/services/strategic-keyword-research.service';

// Import bulletproof services
import { userExperienceShieldService, LoadingState } from '@/services/user-experience-shield.service';
import { asoSearchService } from '@/services/aso-search.service';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { usePermissions } from '@/hooks/usePermissions';
import { MarketSelector } from '@/components/AppManagement/MarketSelector';
import { DEFAULT_MARKET, type MarketCode } from '@/config/markets';

interface MetadataImporterProps {
  onImportSuccess: (data: ScrapedMetadata, organizationId: string) => void;
  onCompetitorAnalysis?: (searchTerm: string, analysisType: 'brand' | 'keyword' | 'category') => void;
}

export const MetadataImporter: React.FC<MetadataImporterProps> = ({ onImportSuccess, onCompetitorAnalysis }) => {
  const [mode, setMode] = useState<'selector' | 'existing' | 'pre-launch'>('selector');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const { isSuperAdmin, selectedOrganizationId } = useSuperAdmin();
  const { isSuperAdmin: isSuperAdminFromPermissions } = usePermissions();

  // Debug panel visibility: only super admins can see internal diagnostics
  const showDebugPanels = isSuperAdmin || isSuperAdminFromPermissions;

  const [lastError, setLastError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'auto' | 'keyword' | 'brand' | 'url'>('auto');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketCode>(DEFAULT_MARKET); // GB by default

  // App selection modal state
  const [showAppSelection, setShowAppSelection] = useState(false);
  const [appCandidates, setAppCandidates] = useState<ScrapedMetadata[]>([]);
  const [pendingSearchTerm, setPendingSearchTerm] = useState<string>('');

  // Bulletproof error handling state
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    stage: 'initial',
    message: '',
    progress: 0,
    showRetry: false
  });

  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(process.env.NODE_ENV === 'development');

  const { toast } = useToast();
  const queryClient = useQueryClient(); // Phase E: React Query cache management

  // ENHANCED: Use debounced search hook for bulletproof search operations
  const { debouncedSearch, isSearching, cancelSearch } = useDebouncedSearch({
    delay: 800, // Slightly longer delay for complex search operations
    onSearch: async (input: string) => {
      console.log('🔍 [DEBOUNCED-SEARCH] Executing bulletproof search for:', input);
      await performBulletproofSearch(input);
    }
  });

  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        debug('METADATA-IMPORTER', 'Fetching user organization');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (isSuperAdmin) {
            // Super admin can operate platform-wide without selecting an org
            const effectiveOrg = selectedOrganizationId || '__platform__';
            setOrganizationId(effectiveOrg);
            if (selectedOrganizationId) {
              debug('METADATA-IMPORTER', 'Super admin context', { organizationId: selectedOrganizationId });
            } else {
              debug('METADATA-IMPORTER', 'Super admin using platform scope');
            }
          } else {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('organization_id')
              .eq('id', user.id)
              .single();

            if (error) {
              console.error('❌ [METADATA-IMPORTER] Profile fetch error:', error);
              throw error;
            }

            if (profile?.organization_id) {
              setOrganizationId(profile.organization_id);
              debug('METADATA-IMPORTER', 'Organization ID found', { organizationId: profile.organization_id });
            } else {
              console.warn('⚠️ [METADATA-IMPORTER] User has no organization_id.');
              toast({
                title: 'Organization Setup Required',
                description: 'Your account needs to be associated with an organization. Please contact support.',
                variant: 'destructive',
              });
            }
          }
        } else {
          console.warn('⚠️ [METADATA-IMPORTER] User not authenticated.');
          toast({
            title: 'Authentication Required',
            description: 'Please log in to import app data.',
            variant: 'destructive',
          });
        }
      } catch (err: any) {
        console.error("❌ [METADATA-IMPORTER] Error fetching user profile/organization:", err);
        toast({
          title: 'Could not load your profile. Please refresh and try again.',
          variant: 'destructive'
        });
      }
    };
    fetchOrgId();

    // Load system health if in debug mode
    if (showDebugInfo) {
      loadSystemHealth();
    }
  }, [toast, showDebugInfo, isSuperAdmin, selectedOrganizationId]);

  const loadSystemHealth = async () => {
    try {
      const health = asoSearchService.getSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      console.warn('[HEALTH-CHECK] Could not load system health:', error);
    }
  };

  // ENHANCED: Main search logic extracted for debounced usage
  const performBulletproofSearch = async (input: string) => {
    if (!organizationId) {
      toast({
        title: 'Organization Missing',
        description: 'Cannot perform import without organization context. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    setLastError(null);
    setPendingSearchTerm(input);

    // Phase E: Clear any cached metadata BEFORE fetching new data
    console.log('[PHASE E] Removing stale metadata from React Query cache');
    queryClient.removeQueries({ queryKey: ['metadata'] });

    // Add to search history
    setSearchHistory(prev => {
      const newHistory = [input, ...prev.filter(item => item !== input)].slice(0, 5);
      return newHistory;
    });

    try {
      console.log('📤 [METADATA-IMPORTER] Calling bulletproof asoSearchService.search...');
      console.log(`🌍 [METADATA-IMPORTER] Searching in market: ${selectedMarket.toUpperCase()}`);

      const searchResult = await asoSearchService.search(input, {
        organizationId,
        includeIntelligence: true,
        cacheResults: true,
        debugMode: process.env.NODE_ENV === 'development',
        country: selectedMarket, // Pass selected market to search
        onLoadingUpdate: (state: LoadingState) => {
          setLoadingState(state);
          console.log('🛡️ [UX-SHIELD] Loading state update:', state);
        }
      });

      console.log('✅ [METADATA-IMPORTER] Bulletproof search successful:', searchResult);

      // Enhanced success message with recovery info
      const { searchContext } = searchResult;
      let successMessage = `Successfully imported ${searchResult.targetApp.name}`;

      if (searchContext.source === 'cache') {
        successMessage += ' from cache';
      } else if (searchContext.source === 'fallback') {
        successMessage += ' via intelligent fallback';
      } else if (searchContext.source === 'similar') {
        successMessage += ' using similar match';
      }

      if (searchContext.backgroundRetries > 0) {
        successMessage += ` (${searchContext.backgroundRetries} automatic retries)`;
      }

      successMessage += ` in ${searchContext.responseTime}ms`;

      toast({
        title: 'Import Successful! 🎉',
        description: successMessage,
      });

      // Show performance notification for fast results
      if (searchContext.responseTime < 1000) {
        setTimeout(() => {
          toast({
            title: '⚡ Lightning Fast Search',
            description: `Found results in ${searchContext.responseTime}ms using optimized pathways`,
          });
        }, 2000);
      }

      // Debug-gated log for fresh metadata with privacy-safe digest
      debug('METADATA-IMPORT', 'Using fresh metadata', metadataDigest(searchResult.targetApp));

      // ENTERPRISE FIX: Override metadata.locale with searchContext.country
      // This ensures the audit page displays the correct market (the one we searched)
      // instead of the app's primary locale from App Store API
      const metadataWithCorrectMarket = {
        ...searchResult.targetApp,
        locale: searchContext.country // Override with searched market (e.g., 'gb' not 'us')
      };

      console.log(`🌍 [MARKET-FIX] Overriding locale: ${searchResult.targetApp.locale} → ${searchContext.country}`);

      onImportSuccess(metadataWithCorrectMarket, organizationId);

      // Phase E: Invalidate queries after successful import to force fresh data
      queryClient.invalidateQueries({ queryKey: ['metadata', searchResult.targetApp.appId] });

    } catch (error: any) {
      console.error('❌ [METADATA-IMPORTER] Bulletproof search failed:', error);
      
      // Handle AmbiguousSearchError for user selection
      if (error instanceof AmbiguousSearchError) {
        console.log('🎯 [METADATA-IMPORTER] Multiple apps found - showing selection modal');
        console.log(`📋 [METADATA-IMPORTER] User can choose from ${error.candidates.length} options`);
        setAppCandidates(error.candidates);
        setShowAppSelection(true);
        return;
      }
      
      // All other errors are handled by UX shield
      const errorMessage = error.message || 'An unknown error occurred during import.';
      setLastError(errorMessage);
      
      // Enhanced error display with context
      toast({
        title: 'Search Failed',
        description: errorMessage,
        variant: 'destructive',
      });

    } finally {
      if (!showAppSelection) {
        userExperienceShieldService.reset();
        setLoadingState({
          isLoading: false,
          stage: 'initial',
          message: '',
          progress: 0,
          showRetry: false
        });
      }
    }
  };

  // ENHANCED: Updated main import handler to use debounced search
  const handleImport = async (input: string) => {
    if (!input || input.trim().length === 0) {
      toast({
        title: 'Empty Search',
        description: 'Please enter keywords, app name, or App Store URL to search.',
        variant: 'destructive'
      });
      return;
    }

    const trimmedInput = input.trim();
    console.log('🚀 [METADATA-IMPORTER] Triggering debounced bulletproof import for:', trimmedInput);

    // Use debounced search instead of direct search
    await debouncedSearch(trimmedInput);
  };

  // Handle app selection from modal
  const handleAppSelection = async (selectedApp: ScrapedMetadata) => {
    setShowAppSelection(false);

    try {
      console.log('✅ [METADATA-IMPORTER] User selected app:', selectedApp.name);

      // DIAGNOSTIC: Log name/title/subtitle BEFORE calling onImportSuccess
      console.log('[DIAGNOSTIC-IMPORT-MetadataImporter] BEFORE onImportSuccess:', {
        'selectedApp.name': selectedApp.name,
        'selectedApp.title': selectedApp.title,
        'selectedApp.subtitle': selectedApp.subtitle,
        'selectedApp._source': (selectedApp as any)._source
      });

      // Phase E: Add diagnostic log for fresh metadata
      console.log('[PHASE E CONFIRM] Using fresh metadata from modal selection:', {
        name: selectedApp.name,
        subtitle: selectedApp.subtitle,
        source: (selectedApp as any)._source
      });

      // ENTERPRISE FIX: Override metadata.locale with selected market
      // When user selects from multiple apps, ensure locale matches the searched market
      const metadataWithCorrectMarket = {
        ...selectedApp,
        locale: selectedMarket // Override with selected market from dropdown
      };

      console.log(`🌍 [MARKET-FIX] Manual selection - setting locale: ${selectedMarket}`);

      toast({
        title: 'App Selected! 🎉',
        description: `Successfully imported ${selectedApp.name}`,
      });

      onImportSuccess(metadataWithCorrectMarket, organizationId!);

      // Phase E: Invalidate queries after manual app selection
      queryClient.invalidateQueries({ queryKey: ['metadata', selectedApp.appId] });

    } catch (error: any) {
      console.error('❌ [METADATA-IMPORTER] App selection processing failed:', error);
      toast({
        title: 'Processing Failed',
        description: 'Failed to process selected app. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAppCandidates([]);
      setPendingSearchTerm('');
    }
  };

  // Handle modal cancel
  const handleAppSelectionCancel = () => {
    setShowAppSelection(false);
    setAppCandidates([]);
    setPendingSearchTerm('');
    
    // Cancel any pending search operations
    cancelSearch();
    
    toast({
      title: 'Search Cancelled',
      description: 'App selection was cancelled. Try a more specific search term.',
    });
  };

  // Handle pre-launch form submission
  const handlePreLaunchSubmit = async (formData: PreLaunchFormData) => {
    if (!organizationId) {
      toast({
        title: 'Organization Missing',
        description: 'Cannot perform strategic research without organization context.',
        variant: 'destructive'
      });
      return;
    }

    setLastError(null);
    
    try {
      console.log('🚀 [PRE-LAUNCH] Starting strategic research for:', formData.appName);
      
      // Generate strategic research
      const result = await strategicKeywordResearchService.generateStrategicResearch(
        organizationId,
        formData,
        (progress, message) => {
          setLoadingState({
            isLoading: true,
            stage: 'searching',
            message,
            progress,
            showRetry: false
          });
        }
      );
      
      // Convert to format expected by MetadataWorkspace
      const mockScrapedData: ScrapedMetadata = {
        name: formData.appName,
        title: result.aiGeneratedMetadata.title,
        subtitle: result.aiGeneratedMetadata.subtitle,
        description: result.aiGeneratedMetadata.description,
        appId: 'pre-launch',
        url: '',
        locale: 'en-US'
      };
      
      toast({
        title: 'Strategic Research Complete! 🎯',
        description: `Generated optimized metadata strategy for ${formData.appName}`,
      });
      
      onImportSuccess(mockScrapedData, organizationId);
      
    } catch (error: any) {
      console.error('❌ [PRE-LAUNCH] Strategic research failed:', error);
      setLastError(error.message);
      
      toast({
        title: 'Strategic Research Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingState({
        isLoading: false,
        stage: 'initial',
        message: '',
        progress: 0,
        showRetry: false
      });
    }
  };

  // Handle mode selection
  const handleModeSelect = (selectedMode: 'existing' | 'pre-launch') => {
    setMode(selectedMode);
    setLastError(null);
  };

  // Handle back to mode selector
  const handleBackToSelector = () => {
    setMode('selector');
    setLastError(null);
  };

  const getSearchTypeDescription = () => {
    switch (searchType) {
      case 'keyword':
        return 'Search by category or functionality (e.g., "fitness tracker", "language learning")';
      case 'brand':
        return 'Search by specific app name (e.g., "Instagram", "TikTok")';
      case 'url':
        return 'Import directly from App Store URL';
      default:
        return 'Auto-detect search type from your input';
    }
  };

  const getPlaceholderText = () => {
    switch (searchType) {
      case 'keyword':
        return 'Try: "meditation apps", "photo editors", "language learning"...';
      case 'brand':
        return 'Try: "Instagram", "TikTok", "Duolingo"...';
      case 'url':
        return 'https://apps.apple.com/app/...';
      default:
        return 'Enter keywords, app name, or App Store URL...';
    }
  };

  const handleQuickSearch = (searchTerm: string) => {
    handleImport(searchTerm);
  };

  // ENHANCED: Determine loading state from multiple sources
  const isImporting = isSearching || loadingState.isLoading || showAppSelection;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {lastError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{mode === 'pre-launch' ? 'Research Error' : 'Search Error'}:</strong> {lastError}
          </AlertDescription>
        </Alert>
      )}

      {/* Mode Selection */}
      {mode === 'selector' && (
        <PreLaunchModeSelector onModeSelect={handleModeSelect} />
      )}

      {/* Pre-Launch Mode */}
      {mode === 'pre-launch' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBackToSelector}
              className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to mode selection</span>
            </button>
          </div>
          
          <PreLaunchForm 
            onSubmit={handlePreLaunchSubmit}
            isLoading={loadingState.isLoading}
            loadingProgress={loadingState.progress}
            loadingMessage={loadingState.message}
          />
        </div>
      )}

      {/* Existing App Mode - Original Content */}
      {mode === 'existing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToSelector}
              className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to mode selection</span>
            </button>
            <Badge variant="outline" className="text-xs">Existing App Mode</Badge>
          </div>

          {/* Loading State Display */}
          {(loadingState.isLoading || isSearching) && (
            <>
              {/* Normal user: Simple loading message */}
              {!showDebugPanels && (
                <div className="flex items-center space-x-2 text-sm text-zinc-300 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching for apps...</span>
                </div>
              )}

              {/* Super admin: Full debug panel */}
              {showDebugPanels && (
                <Card className="bg-zinc-900/70 border-zinc-700">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-foreground">
                            {isSearching ? 'Debounced Search Active' : 'Bulletproof Search Active'}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {isSearching ? 'debouncing' : loadingState.stage}
                        </Badge>
                      </div>

                      <Progress value={isSearching ? 25 : loadingState.progress} className="h-2" />

                      <div className="flex items-center space-x-2 text-sm text-zinc-300">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          {isSearching ? 'Processing search request...' : loadingState.message}
                        </span>
                      </div>

                      {loadingState.stage === 'fallback' && (
                        <div className="text-xs text-zinc-400">
                          Using intelligent fallback methods for best results...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* System Health Dashboard */}
          {showDebugPanels && systemHealth && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Activity className="w-5 h-5 mr-2 text-green-500" />
                  Bulletproof System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-400">Overall Health:</span>
                    <div className="font-medium text-foreground">
                      {Math.round(systemHealth.circuitBreakers.overallHealth * 100)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Cache Hit Rate:</span>
                    <div className="font-medium text-foreground">
                      {Math.round(systemHealth.cacheStats.hitRate * 100)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Healthy Components:</span>
                    <div className="font-medium text-foreground">
                      {systemHealth.circuitBreakers.healthyComponents}/{systemHealth.circuitBreakers.totalComponents}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Recovery Success:</span>
                    <div className="font-medium text-foreground">
                      {systemHealth.recoveryStats.successfulRecoveries} ops
                    </div>
                  </div>
                </div>
                
                {systemHealth.failureAnalytics.trends.degrading && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      System performance is degrading - automatic recovery in progress
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search Type Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Search Type
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'auto', label: 'Auto-Detect', icon: Zap },
                { value: 'keyword', label: 'Keywords', icon: Search },
                { value: 'brand', label: 'App Name', icon: Sparkles },
                { value: 'url', label: 'URL', icon: AlertCircle }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setSearchType(value as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    searchType === value
                      ? 'bg-yodel-orange text-foreground'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {getSearchTypeDescription()}
            </p>
          </div>

          {/* Market Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              App Store Market
            </label>
            <MarketSelector
              value={selectedMarket}
              onChange={setSelectedMarket}
              disabled={isImporting}
              placeholder="🇬🇧 United Kingdom"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Select the App Store market to search and fetch metadata from (default: United Kingdom)
            </p>
          </div>
          
          {/* Main Search Interface */}
          <DataImporter
            title="Bulletproof ASO Intelligence Search"
            description="Discover apps with bulletproof search and intelligent fallbacks"
            placeholder={getPlaceholderText()}
            onImport={handleImport}
            isLoading={isImporting || !organizationId}
            icon={isImporting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Shield className="w-4 h-4 ml-2" />}
          />

          {/* Quick Search Suggestions */}
          {!isImporting && searchHistory.length === 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-300">Quick Search Examples:</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  'fitness apps',
                  'meditation',
                  'language learning',
                  'photo editor',
                  'Instagram',
                  'TikTok'
                ].map((term) => (
                  <button
                    key={term}
                    onClick={() => handleQuickSearch(term)}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-300">Recent Searches:</h4>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((term, index) => (
                  <button
                    key={`${term}-${index}`}
                    onClick={() => handleQuickSearch(term)}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Feature Highlights */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-zinc-800/30 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2">🛡️ Bulletproof Search</h4>
              <p className="text-xs text-zinc-400">
                99%+ success rate with intelligent fallback chain, circuit breakers, and auto-recovery
              </p>
            </div>
            <div className="bg-zinc-800/30 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2">🧠 ASO Intelligence</h4>
              <p className="text-xs text-zinc-400">
                Smart market insights and optimization opportunities
              </p>
            </div>
          </div>
          
          {/* Enhanced Development Debug Info */}
          {showDebugPanels && (
            <div className="mt-4 bg-zinc-800/50 p-3 rounded text-xs text-zinc-300 space-y-1">
              <div><strong>ASO Intelligence Platform v8.1.0-debounced-search</strong></div>
              <div>Organization ID: {organizationId || 'Not loaded'}</div>
              <div>Search Type: {searchType}</div>
              <div>Is Importing: {isImporting ? 'Yes' : 'No'}</div>
              <div>Is Searching (Debounced): {isSearching ? 'Yes' : 'No'}</div>
              <div>Loading Stage: {loadingState.stage}</div>
              <div>Loading Progress: {loadingState.progress}%</div>
              <div>Show App Selection: {showAppSelection ? 'Yes' : 'No'}</div>
              <div>App Candidates: {appCandidates.length}</div>
              <div className="text-green-400">✅ Phase 1 Complete - Infinite loop prevention active</div>
              <div className="text-green-400">✅ Debounced search implemented</div>
              <div className="text-green-400">✅ Enhanced audit stability</div>
              <div className="text-green-400">✅ Circuit breaker protection</div>
              <div className="text-green-400">✅ Operation cooldowns</div>
              {lastError && <div className="text-red-400">❌ Last Error: {lastError}</div>}
              {systemHealth && (
                <div className="text-blue-400">📊 System Health: {Math.round(systemHealth.circuitBreakers.overallHealth * 100)}%</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* App Selection Modal */}
      <AppSelectionModal
        isOpen={showAppSelection}
        candidates={appCandidates}
        searchTerm={pendingSearchTerm}
        onSelect={handleAppSelection}
        onClose={handleAppSelectionCancel}
        mode="analyze"
        onCompetitorAnalysis={onCompetitorAnalysis}
        showCompetitorAnalysis={!!onCompetitorAnalysis}
      />
    </div>
  );
};
