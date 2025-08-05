
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, TrendingUp, FileText, RefreshCw, Download, AlertTriangle, Users, Palette, FileSpreadsheet } from 'lucide-react';
import html2pdf from 'html2pdf.js';
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
    console.log('🎯 [APP-AUDIT] App imported:', metadata.name);
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
    if (!importedMetadata || !auditData) return;
    
    setIsExportingPDF(true);
    try {
      // Create a temporary container for PDF generation
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '210mm'; // A4 width
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.color = 'black';
      pdfContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      
      // Generate PDF-optimized content
      pdfContainer.innerHTML = `
        <div style="padding: 20px; font-size: 12px; line-height: 1.4;">
          <!-- Cover Page -->
          <div style="text-align: center; margin-bottom: 40px; page-break-after: always;">
            <h1 style="font-size: 28px; color: #1a1a1a; margin-bottom: 10px;">${importedMetadata.name}</h1>
            <h2 style="font-size: 18px; color: #666; margin-bottom: 20px;">ASO Audit Report</h2>
            <div style="margin: 20px 0;">
              <img src="${importedMetadata.icon}" alt="App Icon" style="width: 80px; height: 80px; border-radius: 12px;" />
            </div>
            <p style="color: #666; margin: 10px 0;">${importedMetadata.applicationCategory} • ${new Date().toLocaleDateString()}</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1a1a1a; margin-bottom: 15px;">Overall Score</h3>
              <div style="font-size: 48px; font-weight: bold; color: ${auditData.overallScore >= 70 ? '#22c55e' : auditData.overallScore >= 40 ? '#f59e0b' : '#ef4444'};">
                ${auditData.overallScore}/100
              </div>
              <p style="color: #666; margin-top: 10px;">
                ${auditData.overallScore >= 80 ? 'Excellent' : auditData.overallScore >= 60 ? 'Good' : auditData.overallScore >= 40 ? 'Fair' : 'Needs Work'}
              </p>
            </div>
          </div>

          <!-- Executive Summary -->
          <div style="margin-bottom: 40px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; margin-bottom: 20px;">Executive Summary</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
              <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #22c55e;">${auditData.metadataScore}/100</div>
                <div style="color: #666; font-size: 11px;">Metadata Score</div>
              </div>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${auditData.keywordScore}/100</div>
                <div style="color: #666; font-size: 11px;">Keyword Score</div>
              </div>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${auditData.competitorScore}/100</div>
                <div style="color: #666; font-size: 11px;">Competitive Score</div>
              </div>
            </div>
          </div>

          <!-- Key Findings -->
          <div style="margin-bottom: 40px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; margin-bottom: 20px;">Key Findings</h2>
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
              <h3 style="color: #ea580c; margin-bottom: 10px;">🎯 Title Analysis</h3>
              <p style="margin: 5px 0;">Current title: "${importedMetadata.title}"</p>
              <p style="margin: 5px 0;">Length: ${importedMetadata.title?.length || 0}/30 characters</p>
              ${(importedMetadata.title?.length || 0) > 30 ? '<p style="color: #dc2626; margin: 5px 0;">⚠️ Title may be truncated in search results</p>' : ''}
            </div>
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
              <h3 style="color: #0284c7; margin-bottom: 10px;">📱 App Store Optimization</h3>
              <p style="margin: 5px 0;">Category: ${importedMetadata.applicationCategory}</p>
              <p style="margin: 5px 0;">Developer: ${importedMetadata.developer || 'Not specified'}</p>
            </div>
          </div>

          <!-- Priority Recommendations -->
          <div style="page-break-before: always;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; margin-bottom: 20px;">Priority Recommendations</h2>
            ${auditData.recommendations?.slice(0, 6).map((rec, index) => `
              <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <span style="background: ${
                    rec.priority === 'high' ? '#fee2e2' : rec.priority === 'medium' ? '#fef3c7' : '#dbeafe'
                  }; color: ${
                    rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#2563eb'
                  }; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">${rec.priority}</span>
                  <span style="margin-left: 10px; color: #666; font-size: 10px;">${rec.category}</span>
                </div>
                <h3 style="color: #1a1a1a; margin-bottom: 8px; font-size: 14px;">${rec.title}</h3>
                <p style="color: #666; margin: 0; font-size: 11px;">${rec.description}</p>
                ${'impact' in rec ? `
                  <div style="margin-top: 10px;">
                    <div style="color: #666; font-size: 10px;">Expected Impact: ${rec.impact}%</div>
                    <div style="background: #e5e5e5; height: 4px; border-radius: 2px; margin-top: 4px;">
                      <div style="background: #f59e0b; height: 4px; border-radius: 2px; width: ${rec.impact}%;"></div>
                    </div>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <!-- Footer -->
          <div style="margin-top: 40px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #e5e5e5; padding-top: 20px;">
            Generated on ${new Date().toLocaleDateString()} • ASO Audit Report • ${importedMetadata.name}
          </div>
        </div>
      `;

      document.body.appendChild(pdfContainer);

      // Configure PDF options
      const opt = {
        margin: [10, 10],
        filename: `${importedMetadata.name.replace(/[^a-z0-9]/gi, '_')}_ASO_Audit_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Generate and download PDF
      await html2pdf().set(opt).from(pdfContainer).save();
      
      // Clean up
      document.body.removeChild(pdfContainer);
      
      toast.success('PDF audit report downloaded successfully');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to generate PDF report. Please try again.');
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
            <h1 className="text-2xl font-bold text-foreground">{importedMetadata.name}</h1>
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
