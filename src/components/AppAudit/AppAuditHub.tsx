
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isDebugTarget } from '@/lib/debugTargets';
import { Brain, Target, TrendingUp, FileText, RefreshCw, Download, AlertTriangle, Users, Palette, FileSpreadsheet } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { MetadataImporter } from '../AsoAiHub/MetadataCopilot/MetadataImporter';
import { MetadataWorkspace } from '../AsoAiHub/MetadataCopilot/MetadataWorkspace';
import { KeywordClustersPanel } from '../KeywordIntelligence/KeywordClustersPanel';
import { RankDistributionChart } from '../KeywordIntelligence/RankDistributionChart';
import { KeywordTrendsTable } from '../KeywordIntelligence/KeywordTrendsTable';
import { CompetitiveKeywordAnalysis } from './CompetitiveKeywordAnalysis';
import { CreativeAnalysisPanel } from './CreativeAnalysisPanel';
import { SearchDominationTab } from '../AsoAiHub/SearchDominationTab';
import { EnhancedOverviewTab } from './ElementAnalysis/EnhancedOverviewTab';
import { useEnhancedAppAudit } from '@/hooks/useEnhancedAppAudit';
import { ScrapedMetadata } from '@/types/aso';
import { toast } from 'sonner';

interface AppAuditHubProps {
  organizationId: string;
  onAppScraped?: (metadata: ScrapedMetadata) => void; // Optional callback for unified page
}

export const AppAuditHub: React.FC<AppAuditHubProps> = ({ organizationId, onAppScraped }) => {
  const [importedMetadata, setImportedMetadata] = useState<ScrapedMetadata | null>(null);
  const [activeTab, setActiveTab] = useState('import');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const {
    auditData,
    isLoading,
    isRefreshing,
    lastUpdated,
    refreshAudit,
    generateAuditReport
  } = useEnhancedAppAudit({
    organizationId,
    appId: importedMetadata?.appId,
    metadata: importedMetadata,
    enabled: !!importedMetadata
  });

  const handleMetadataImport = (metadata: ScrapedMetadata, orgId: string) => {
    const debug = isDebugTarget(metadata);
    console.log('🎯 [APP-AUDIT] App imported:', metadata.name, debug ? '(debug target)' : '');
    setImportedMetadata(metadata);
    setActiveTab('overview');
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

  if (!importedMetadata) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">App Audit Hub</h1>
          <p className="text-zinc-400 text-lg max-w-3xl mx-auto">
            Comprehensive ASO analysis combining metadata optimization and keyword intelligence. 
            Import your app to get started with competitor analysis, keyword gaps, and optimization recommendations.
          </p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center space-x-2">
              <Brain className="h-6 w-6 text-yodel-orange" />
              <span>Import App for Audit</span>
            </CardTitle>
            <CardDescription>
              Enter your app's App Store URL to begin comprehensive ASO analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetadataImporter onImportSuccess={handleMetadataImport} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Keyword Analysis</h3>
              <p className="text-zinc-400 text-sm">
                Discover ranking opportunities, analyze competitor keywords, and identify gaps in your strategy.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Metadata Optimization</h3>
              <p className="text-zinc-400 text-sm">
                Optimize your app title, subtitle, and keywords with AI-powered suggestions and competitor insights.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <Palette className="h-12 w-12 text-pink-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Creative Analysis</h3>
              <p className="text-zinc-400 text-sm">
                AI-powered visual analysis of app icons, screenshots, and in-app events for optimization insights.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Competitive Intelligence</h3>
              <p className="text-zinc-400 text-sm">
                Track competitor performance, monitor metadata changes, and stay ahead of market trends.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with App Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {importedMetadata.icon && (
            <img 
              src={importedMetadata.icon} 
              alt={importedMetadata.name}
              className="w-16 h-16 rounded-xl"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {importedMetadata.name}
              {isDebugTarget(importedMetadata) && (
                <Badge variant="outline" className="text-xs border-yodel-orange text-yodel-orange">Debug</Badge>
              )}
            </h1>
            <p className="text-zinc-400">
              {importedMetadata.applicationCategory} • {importedMetadata.locale}
              {lastUpdated && (
                <span className="ml-2 text-zinc-500 text-sm">
                  • Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
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

      {/* Enhanced Audit Score Overview */}
      {auditData && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-yodel-orange" />
                <span className="text-sm text-zinc-400">Overall Score</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {auditData.overallScore}/100
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {auditData.overallScore >= 80 ? 'Excellent' : 
                 auditData.overallScore >= 60 ? 'Good' : 
                 auditData.overallScore >= 40 ? 'Fair' : 'Needs Work'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-400" />
                <span className="text-sm text-zinc-400">Metadata</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {auditData.metadataScore}/100
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Title, Subtitle, Keywords
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-zinc-400">Keywords</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {auditData.keywordScore}/100
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Rankings & Visibility
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-pink-400" />
                <span className="text-sm text-zinc-400">Creative</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                75/100
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Visual Assets
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-zinc-400">Competitive</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {auditData.competitorScore}/100
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Market Position
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm text-zinc-400">Opportunities</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {auditData.opportunityCount}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Action Items
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Audit Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7 bg-zinc-900 border-zinc-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="search-domination">Search Domination</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="creative">Creative</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <EnhancedOverviewTab
            metadata={importedMetadata}
            competitorData={auditData?.competitorAnalysis}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="search-domination" className="space-y-6">
          <SearchDominationTab
            scrapedAppData={importedMetadata}
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="metadata" className="space-y-6">
          <MetadataWorkspace 
            initialData={importedMetadata} 
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <KeywordTrendsTable
            trends={auditData?.keywordTrends || []}
            isLoading={isLoading}
            onTimeframeChange={() => {}}
            selectedTimeframe={30}
          />
        </TabsContent>

        <TabsContent value="creative" className="space-y-6">
          <CreativeAnalysisPanel
            metadata={importedMetadata}
            competitorData={auditData?.competitorAnalysis}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          <CompetitiveKeywordAnalysis
            competitorData={auditData?.competitorAnalysis || []}
            userKeywords={auditData?.currentKeywords || []}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yodel-orange" />
                <span>Priority Recommendations</span>
              </CardTitle>
              <CardDescription>
                AI-powered optimization suggestions based on comprehensive analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditData?.recommendations?.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-zinc-800/50 rounded-lg mb-3">
                  <Badge className={`mt-1 ${
                    rec.priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                    {rec.priority}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{rec.title}</h4>
                      <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                        {rec.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">{rec.description}</p>
                    {'impact' in rec && (
                      <div className="mt-2">
                        <div className="text-xs text-zinc-500">Expected Impact: {rec.impact}%</div>
                        <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-yodel-orange h-1.5 rounded-full" 
                            style={{ width: `${rec.impact}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
