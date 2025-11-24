
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isDebugTarget } from '@/lib/debugTargets';
import { debug, metadataDigest } from '@/lib/logging';
import { RefreshCw, Download, FileSpreadsheet, Sparkles, Loader2, Bookmark } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { MetadataImporter } from '../AsoAiHub/MetadataCopilot/MetadataImporter';
import { MetadataWorkspace } from '../AsoAiHub/MetadataCopilot/MetadataWorkspace';
import { KeywordDisabledPlaceholder } from './KeywordDisabledPlaceholder';
import { MonitorAppButton } from './MonitorAppButton';
import { MarketSwitcher } from './MarketSwitcher';
import { MarketSelector } from '@/components/AppManagement/MarketSelector';
import { useEnhancedAppAudit } from '@/hooks/useEnhancedAppAudit';
import { useMonitoredAudit } from '@/hooks/useMonitoredAudit';
import { useSaveMonitoredApp } from '@/hooks/useMonitoredAppForAudit';
import { usePersistAuditSnapshot } from '@/hooks/usePersistAuditSnapshot';
import { useMarketManagement } from '@/hooks/useMarketManagement';
import { AppStoreIntegrationService } from '@/services/appstore-integration.service';
import { MarketCacheService } from '@/services/marketCache.service';
import { ScrapedMetadata } from '@/types/aso';
import { toast } from 'sonner';
import { AUDIT_KEYWORDS_ENABLED, isTabVisible } from '@/config/auditFeatureFlags';
import { getScoreLabel } from '@/lib/scoringUtils';
import { useEffect, useRef } from 'react';
import { AUDIT_METADATA_V2_ENABLED } from '@/config/metadataFeatureFlags';
import { AuditV2View } from './AuditV2View';
import type { MarketCode } from '@/config/markets';

// Feature flag: Hide metadata editor blocks in ASO AI Audit
// Does NOT affect Metadata Copilot page (/aso-ai-hub/metadata-copilot)
const ENABLE_METADATA_BLOCKS_IN_AUDIT = import.meta.env.VITE_ENABLE_METADATA_BLOCKS_IN_AUDIT !== 'false';

interface AppAuditHubProps {
  organizationId: string;
  onAppScraped?: (metadata: ScrapedMetadata) => void; // Optional callback for unified page
  mode?: 'live' | 'monitored'; // NEW: Mode determines behavior
  monitoredAppId?: string; // NEW: ID of monitored app (for monitored mode)
}

export const AppAuditHub: React.FC<AppAuditHubProps> = ({
  organizationId,
  onAppScraped,
  mode = 'live',
  monitoredAppId
}) => {
  const [importedMetadata, setImportedMetadata] = useState<ScrapedMetadata | null>(null);
  const [activeTab, setActiveTab] = useState('audit-v2');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<MarketCode | null>(null);
  const [appMarkets, setAppMarkets] = useState<any[]>([]);
  const [isChangingMarket, setIsChangingMarket] = useState(false);

  // Internal state to track newly monitored app (for auto-switching to monitored mode)
  const [internalMonitoredAppId, setInternalMonitoredAppId] = useState<string | null>(null);

  // Determine effective mode and app ID (internal state overrides props)
  const effectiveMode = internalMonitoredAppId ? 'monitored' : mode;
  const effectiveMonitoredAppId = internalMonitoredAppId || monitoredAppId;

  // Callback when app is successfully monitored (to auto-switch to monitored mode)
  const handleAppMonitored = (monitoredAppId: string) => {
    console.log('[AppAuditHub] App monitored, switching to monitored mode:', monitoredAppId);
    setInternalMonitoredAppId(monitoredAppId);
  };

  // Market management for loading markets
  const { getAppMarkets } = useMarketManagement();

  // ========================================================================
  // MONITORED MODE: Fetch cached audit data
  // ========================================================================
  const {
    data: monitoredAuditData,
    isLoading: isLoadingMonitored,
    error: monitoredError
  } = useMonitoredAudit(
    effectiveMode === 'monitored' ? effectiveMonitoredAppId : undefined,
    effectiveMode === 'monitored' ? organizationId : undefined,
    selectedMarket || undefined
  );

  // Load markets when in monitored mode
  useEffect(() => {
    if (effectiveMode === 'monitored' && effectiveMonitoredAppId) {
      loadMarkets();
    }
  }, [effectiveMode, effectiveMonitoredAppId]);

  const loadMarkets = async () => {
    if (!effectiveMonitoredAppId) return;

    const markets = await getAppMarkets(effectiveMonitoredAppId);
    setAppMarkets(markets);

    // Auto-select first market if none selected
    if (!selectedMarket && markets.length > 0) {
      setSelectedMarket(markets[0].market_code as MarketCode);
    }
  };

  const handleMarketChange = async (market: MarketCode) => {
    if (mode === 'monitored') {
      // Monitored mode: just switch to the cached market
      setSelectedMarket(market);
      sessionStorage.setItem(`audit-market-${monitoredAppId}`, market);
      toast.success(`Switched to ${market.toUpperCase()} market`);
    } else if (mode === 'live' && importedMetadata) {
      // Live mode: re-fetch app metadata from new market
      setIsChangingMarket(true);
      try {
        console.log(`🌍 [MARKET-CHANGE] Re-fetching app from ${market.toUpperCase()} market`);

        const result = await AppStoreIntegrationService.searchApp(
          importedMetadata.appId,
          organizationId,
          market
        );

        if (!result.success || !result.data?.[0]) {
          throw new Error(result.error || 'Failed to fetch app from new market');
        }

        const newMetadata = result.data[0];

        // Update metadata with new market data
        setImportedMetadata(null); // Force re-render
        setImportedMetadata({
          ...newMetadata,
          locale: market
        } as ScrapedMetadata);

        // Update selected market and persist
        setSelectedMarket(market);
        sessionStorage.setItem(`audit-market-${importedMetadata.appId}`, market);

        toast.success(`Switched to ${market.toUpperCase()} market and refreshed data`);
      } catch (error: any) {
        console.error('[MARKET-CHANGE] Failed to re-fetch app:', error);
        toast.error(`Failed to switch market: ${error.message}`);
      } finally {
        setIsChangingMarket(false);
      }
    }
  };

  const { mutate: rerunAudit, isPending: isRerunning } = useSaveMonitoredApp();

  // ========================================================================
  // AUDIT PERSISTENCE: Auto-save audit results to database
  // ========================================================================
  const { mutate: persistAudit, isPending: isPersisting } = usePersistAuditSnapshot();
  const lastPersistedScoreRef = useRef<number | null>(null);

  // ========================================================================
  // LIVE MODE: Use enhanced audit (existing flow)
  // ========================================================================
  const {
    auditData,
    isLoading,
    isRefreshing,
    isAuditRunning,
    lastUpdated,
    refreshAudit,
    generateAuditReport
  } = useEnhancedAppAudit({
    organizationId,
    appId: importedMetadata?.appId,
    metadata: importedMetadata,
    enabled: effectiveMode === 'live' && !!importedMetadata // Only enable in live mode
  });

  // ========================================================================
  // AUTO-PERSIST AUDIT: Save to cache when audit completes
  // ========================================================================
  useEffect(() => {
    if (
      effectiveMode === 'live' &&
      auditData &&
      importedMetadata &&
      !isPersisting &&
      auditData.overallScore !== lastPersistedScoreRef.current
    ) {
      console.log('[AppAuditHub] Auto-persisting audit results to database...');

      persistAudit({
        organizationId,
        app_id: importedMetadata.appId,
        platform: (importedMetadata.platform as 'ios' | 'android') || 'ios',
        locale: importedMetadata.locale || 'us',
        metadata: importedMetadata,
        auditData,
        updateMonitoredApp: false // Don't update monitored_apps yet (user hasn't clicked "Monitor App")
      });

      lastPersistedScoreRef.current = auditData.overallScore;
    }
  }, [auditData?.overallScore, importedMetadata?.appId, mode, isPersisting]);

  const handleMetadataImport = (metadata: ScrapedMetadata, orgId: string) => {
    const isDebug = isDebugTarget(metadata);
    console.log('🎯 [APP-AUDIT] App imported:', metadata.name, isDebug ? '(debug target)' : '');

    // Debug-gated diagnostic log with privacy-safe digest
    debug('IMPORT', 'AppAuditHub received metadata', metadataDigest(metadata));
    debug('COMPONENT-PROPS', 'AppAuditHub.handleMetadataImport', metadataDigest(metadata));

    // Phase E: Force clean state by resetting to null BEFORE setting new metadata
    // This prevents Zustand from merging old and new metadata fields
    setImportedMetadata(null);
    setImportedMetadata(metadata);

    // Set market from imported metadata (persisted per app)
    const marketFromMetadata = (metadata.locale as MarketCode) || 'gb';
    setSelectedMarket(marketFromMetadata);
    sessionStorage.setItem(`audit-market-${metadata.appId}`, marketFromMetadata);

    setActiveTab('audit-v2'); // Show Audit V2 as default
    toast.success(`Started comprehensive audit for ${metadata.name}`);

    // Share scraped data with unified page
    onAppScraped?.(metadata);
  };

  const handleExportReport = async () => {
    if (!importedMetadata) return;
    
    try {
      const report = await generateAuditReport();
      // Create downloadable report
      const reportData = JSON.stringify(report, null, 2);
      const blob = new Blob([reportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${importedMetadata.name}-audit-report.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Audit report downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate audit report');
    }
  };

  const handleExportPDF = async () => {
    if (!importedMetadata || !auditData) {
      console.error('❌ No metadata or audit data available for PDF export');
      toast.error('No audit data available for PDF export');
      return;
    }
    
    console.log('🔍 Starting PDF generation...', {
      appName: importedMetadata.name,
      hasAuditData: !!auditData,
      overallScore: auditData.overallScore
    });
    
    setIsExportingPDF(true);
    
    try {
      // Wait for dashboard to be fully rendered
      console.log('⏳ Waiting for dashboard elements...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find the main audit dashboard container
      const dashboardElement = document.querySelector('.space-y-6') as HTMLElement;
      
      if (!dashboardElement) {
        console.error('❌ Dashboard element not found');
        throw new Error('Dashboard element not found. Please ensure the audit is fully loaded.');
      }
      
      console.log('✅ Dashboard element found, capturing screenshot...');
      
      // Temporarily modify styles for better PDF rendering
      const originalStyles = dashboardElement.style.cssText;
      dashboardElement.style.backgroundColor = '#ffffff';
      dashboardElement.style.color = '#000000';
      dashboardElement.style.width = '1200px';
      dashboardElement.style.padding = '20px';
      
      // Hide elements that shouldn't be in PDF
      const elementsToHide = [
        '.export-button',
        'button',
        '.nav-button',
        '.sidebar'
      ];
      
      const hiddenElements: HTMLElement[] = [];
      elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
        elements.forEach(el => {
          if (el.style.display !== 'none') {
            hiddenElements.push(el);
            el.style.display = 'none';
          }
        });
      });
      
      console.log('📸 Capturing dashboard as image...');
      
      // Capture the dashboard as an image with high quality
      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: dashboardElement.scrollWidth,
        height: dashboardElement.scrollHeight,
        logging: false
      });
      
      console.log('✅ Screenshot captured successfully, creating PDF...');
      
      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 0.95);
      
      // Calculate dimensions to fit A4 page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(availableWidth / (imgWidth * 0.75), availableHeight / (imgHeight * 0.75));
      
      const scaledWidth = (imgWidth * 0.75) * ratio;
      const scaledHeight = (imgHeight * 0.75) * ratio;
      
      // Center the image on the page
      const xOffset = margin + (availableWidth - scaledWidth) / 2;
      const yOffset = margin;
      
      // Add header
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`ASO Audit Report - ${importedMetadata.name}`, margin, margin - 2);
      
      // Add the main image
      pdf.addImage(imgData, 'PNG', xOffset, yOffset + 5, scaledWidth, scaledHeight);
      
      // Add footer
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      const footerText = `Generated on ${new Date().toLocaleDateString()} • Overall Score: ${auditData.overallScore}/100`;
      pdf.text(footerText, margin, pdfHeight - 5);
      
      // If the image is too tall, add additional pages
      if (scaledHeight > availableHeight - 10) {
        const pagesNeeded = Math.ceil(scaledHeight / (availableHeight - 10));
        
        for (let i = 1; i < pagesNeeded; i++) {
          pdf.addPage();
          const pageYOffset = -(availableHeight - 10) * i;
          pdf.addImage(imgData, 'PNG', xOffset, yOffset + pageYOffset, scaledWidth, scaledHeight);
          
          // Add page number
          pdf.setFontSize(8);
          pdf.setTextColor(128, 128, 128);
          pdf.text(`Page ${i + 1}`, pdfWidth - 20, pdfHeight - 5);
        }
      }
      
      // Generate filename
      const filename = `${importedMetadata.name.replace(/[^a-z0-9]/gi, '_')}_ASO_Audit_${new Date().toISOString().split('T')[0]}.pdf`;
      
      console.log('✅ PDF generated successfully, downloading...');
      
      // Download the PDF
      pdf.save(filename);
      
      // Restore original styles
      dashboardElement.style.cssText = originalStyles;
      
      // Restore hidden elements
      hiddenElements.forEach(el => {
        el.style.display = '';
      });
      
      console.log('✅ PDF export completed successfully');
      toast.success('PDF audit report downloaded successfully');
      
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      toast.error(`Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleRefresh = async () => {
    await refreshAudit();
    toast.success('Audit data refreshed');
  };

  const handleRerunMonitoredAudit = () => {
    if (!monitoredAuditData) return;

    const { monitoredApp, metadataCache } = monitoredAuditData;

    rerunAudit({
      organizationId,
      app_id: monitoredApp.app_id,
      platform: monitoredApp.platform as 'ios' | 'android',
      app_name: monitoredApp.app_name,
      locale: monitoredApp.locale || 'us',
      bundle_id: monitoredApp.bundle_id,
      app_icon_url: monitoredApp.app_icon_url,
      developer_name: monitoredApp.developer_name,
      category: monitoredApp.category,
      audit_enabled: true,
      // Include cached metadata if available to prevent re-fetch
      metadata: metadataCache ? {
        title: metadataCache.title || monitoredApp.app_name,
        subtitle: metadataCache.subtitle || null,
        description: metadataCache.description || null,
        developer_name: metadataCache.developer_name || null,
        app_icon_url: metadataCache.app_icon_url || null,
        screenshots: metadataCache.screenshots || [],
      } : undefined
    });
  };

  // ========================================================================
  // MONITORED MODE: Render cached audit
  // ========================================================================
  if (mode === 'monitored') {
    if (isLoadingMonitored) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-yodel-orange" />
          <span className="ml-3 text-zinc-400">Loading monitored audit...</span>
        </div>
      );
    }

    if (monitoredError || !monitoredAuditData) {
      return (
        <div className="text-center py-12 bg-zinc-900/30 rounded-lg border border-zinc-800">
          <h3 className="text-xl font-semibold text-foreground mb-2">Failed to Load Audit</h3>
          <p className="text-zinc-400">{monitoredError?.message || 'Monitored app not found or access denied'}</p>
        </div>
      );
    }

    // Convert cached data to ScrapedMetadata format for rendering
    const { monitoredApp, metadataCache, latestSnapshot } = monitoredAuditData;
    const cachedMetadata: ScrapedMetadata = {
      name: monitoredApp.app_name,
      appId: monitoredApp.app_id,
      title: metadataCache?.title || monitoredApp.app_name,
      subtitle: metadataCache?.subtitle || '',
      description: metadataCache?.description || '',
      applicationCategory: monitoredApp.category || '',
      locale: monitoredApp.locale || 'us',
      icon: metadataCache?.app_icon_url || monitoredApp.app_icon_url || '',
      url: `https://apps.apple.com/app/id${monitoredApp.app_id}`,
      developer: metadataCache?.developer_name || monitoredApp.developer_name || '',
      screenshots: metadataCache?.screenshots || [],
      subtitleSource: 'cache' as const,
      platform: (monitoredApp.platform as 'ios' | 'android') || 'ios',
      sellerName: metadataCache?.developer_name || monitoredApp.developer_name || ''
    } as ScrapedMetadata;

    // Use cached metadata for importedMetadata to render the audit view
    // This bypasses the importer and shows the cached audit
    // (Implementation continues below with the existing rendering logic)
  }

  // ========================================================================
  // LIVE MODE: Show importer if no metadata
  // ========================================================================
  if (mode === 'live' && !importedMetadata) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Import App</h2>
          <MetadataImporter onImportSuccess={handleMetadataImport} />
        </div>
      </div>
    );
  }

  // Determine which metadata to use for rendering
  const displayMetadata: ScrapedMetadata = effectiveMode === 'monitored' && monitoredAuditData
    ? (() => {
        const { monitoredApp, metadataCache } = monitoredAuditData;
        return {
          name: monitoredApp.app_name,
          appId: monitoredApp.app_id,
          title: metadataCache?.title || monitoredApp.app_name,
          subtitle: metadataCache?.subtitle || '',
          description: metadataCache?.description || '',
          applicationCategory: monitoredApp.category || '',
          locale: monitoredApp.locale || 'us',
          icon: metadataCache?.app_icon_url || monitoredApp.app_icon_url || '',
          url: `https://apps.apple.com/app/id${monitoredApp.app_id}`,
          developer: metadataCache?.developer_name || monitoredApp.developer_name || '',
          screenshots: metadataCache?.screenshots || [],
          subtitleSource: 'cache' as const,
          sellerName: metadataCache?.developer_name || monitoredApp.developer_name || ''
        } as ScrapedMetadata;
      })()
    : importedMetadata;

  if (!displayMetadata) {
    return null; // Should never happen - guarded above
  }

  return (
    <div className="space-y-6">
      {/* Header with App Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {displayMetadata.icon && (
            <img
              src={displayMetadata.icon}
              alt={displayMetadata.name}
              className="w-16 h-16 rounded-xl"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {displayMetadata.name}
              {mode === 'monitored' && (
                <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400">Monitored</Badge>
              )}
              {isDebugTarget(displayMetadata) && (
                <Badge variant="outline" className="text-xs border-yodel-orange text-yodel-orange">Debug</Badge>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {displayMetadata.subtitle ? (
                <>
                  <p className="text-zinc-300 text-sm font-medium">
                    {displayMetadata.subtitle}
                  </p>
                  {displayMetadata.subtitleSource && (
                    <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
                      Source: {displayMetadata.subtitleSource}
                    </span>
                  )}
                </>
              ) : (
                <p className="text-zinc-500 text-sm italic">No subtitle set</p>
              )}
            </div>
            <p className="text-zinc-400 mt-1">
              {displayMetadata.applicationCategory} • {displayMetadata.locale}
              {lastUpdated && mode === 'live' && (
                <span className="ml-2 text-zinc-500 text-sm">
                  • Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              {mode === 'monitored' && monitoredAuditData?.monitoredApp.latest_audit_at && (
                <span className="ml-2 text-zinc-500 text-sm">
                  • Last audit: {new Date(monitoredAuditData.monitoredApp.latest_audit_at).toLocaleString()}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Market Switcher - Show in both live and monitored modes */}
          {mode === 'monitored' && appMarkets.length > 0 && selectedMarket && (
            <MarketSwitcher
              markets={appMarkets}
              selectedMarket={selectedMarket}
              onMarketChange={handleMarketChange}
            />
          )}

          {/* Live mode market switcher - single market selector */}
          {mode === 'live' && importedMetadata && selectedMarket && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Market:</span>
              <MarketSelector
                value={selectedMarket}
                onChange={handleMarketChange}
                disabled={isChangingMarket || isRefreshing || isAuditRunning}
              />
              {isChangingMarket && (
                <Loader2 className="h-4 w-4 animate-spin text-yodel-orange" />
              )}
            </div>
          )}

          {mode === 'monitored' ? (
            <Button
              onClick={handleRerunMonitoredAudit}
              disabled={isRerunning}
              variant="outline"
              size="sm"
              className="text-yodel-orange border-yodel-orange/30 hover:bg-yodel-orange/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRerunning ? 'animate-spin' : ''}`} />
              {isRerunning ? 'Re-running Audit...' : 'Re-run Audit'}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>

              {/* Monitor App Button (live mode only) - GATED BY AUDIT COMPLETION */}
              {isAuditRunning ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="border-emerald-400/30 text-emerald-400"
                >
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Audit...
                </Button>
              ) : auditData ? (
                <MonitorAppButton
                  app_id={displayMetadata.appId}
                  platform="ios"
                  app_name={displayMetadata.name}
                  locale={displayMetadata.locale}
                  bundle_id={displayMetadata.appId}
                  app_icon_url={displayMetadata.icon}
                  developer_name={displayMetadata.sellerName || displayMetadata.developer}
                  category={displayMetadata.applicationCategory}
                  primary_country={displayMetadata.locale}
                  metadata={displayMetadata}
                  auditData={auditData} // ✅ Guaranteed to exist
                  onMonitored={handleAppMonitored} // ✅ Auto-switch to monitored mode
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="border-emerald-400/30 text-emerald-400 opacity-50"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Waiting for Audit...
                </Button>
              )}
            </>
          )}

          <Button
            onClick={handleExportPDF}
            disabled={isExportingPDF || !auditData}
            variant="outline"
            size="sm"
            className="text-red-400 border-red-400/30 hover:bg-red-400/10"
          >
            <FileSpreadsheet className={`h-4 w-4 mr-2 ${isExportingPDF ? 'animate-pulse' : ''}`} />
            {isExportingPDF ? 'Generating PDF...' : 'Export PDF'}
          </Button>
          <Button
            onClick={handleExportReport}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Main Audit Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`grid w-full ${
          AUDIT_KEYWORDS_ENABLED
            ? 'grid-cols-11'
            : (() => {
                const metadataTabCount = ENABLE_METADATA_BLOCKS_IN_AUDIT ? 1 : 0;
                const auditV2TabCount = AUDIT_METADATA_V2_ENABLED ? 1 : 0;
                const totalCols = metadataTabCount + auditV2TabCount;
                return `grid-cols-${totalCols}`;
              })()
        } bg-zinc-900 border-zinc-800`}>
          {/* Metadata tab: Hidden in ASO AI Audit when ENABLE_METADATA_BLOCKS_IN_AUDIT=false */}
          {/* Does NOT affect Metadata Copilot page - that uses MetadataWorkspace directly */}
          {ENABLE_METADATA_BLOCKS_IN_AUDIT && isTabVisible('metadata') && (
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          )}
          {/* Audit V2 tab: New unified metadata audit module (default view) */}
          {AUDIT_METADATA_V2_ENABLED && isTabVisible('audit-v2') && (
            <TabsTrigger value="audit-v2" className="flex items-center space-x-1">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Audit V2</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Metadata tab: Hidden in ASO AI Audit when ENABLE_METADATA_BLOCKS_IN_AUDIT=false */}
        {/* Does NOT affect Metadata Copilot page - that uses MetadataWorkspace directly */}
        {ENABLE_METADATA_BLOCKS_IN_AUDIT && (
          <TabsContent value="metadata" className="space-y-6">
            <MetadataWorkspace
              initialData={importedMetadata}
              organizationId={organizationId}
            />
          </TabsContent>
        )}

        {/* Audit V2 tab: New unified metadata audit module (feature-flagged) */}
        {AUDIT_METADATA_V2_ENABLED && (
          <TabsContent value="audit-v2" className="space-y-6">
            <AuditV2View
              metadata={displayMetadata}
              monitored_app_id={effectiveMode === 'monitored' && monitoredAuditData ? monitoredAuditData.monitoredApp.id : undefined}
              mode={mode}
              organizationId={organizationId}
            />
          </TabsContent>
        )}

        {/* DELETED (2025-01-18): Competitors, Risk Assessment, Recommendations tabs - keyword intelligence cleanup */}
        {/* DELETED (2025-11-21): Creative tab - moved to dedicated Creative Intelligence module */}
      </Tabs>
    </div>
  );
};
