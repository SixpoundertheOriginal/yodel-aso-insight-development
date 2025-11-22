import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet,
  Brain,
  Sparkles,
  FileText,
  Eye
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { formatNumber, getScoreColor, getScoreLabel } from '@/lib/numberFormat';

// Feature flag: Hide metadata editor blocks in ASO AI Audit Slide View
// Does NOT affect Metadata Copilot page (/aso-ai-hub/metadata-copilot)
const ENABLE_METADATA_BLOCKS_IN_AUDIT = import.meta.env.VITE_ENABLE_METADATA_BLOCKS_IN_AUDIT !== 'false';

// Feature flag: Use Metadata Audit V2 UI (unified scoring)
import { AUDIT_METADATA_V2_ENABLED } from '@/config/metadataFeatureFlags';

// Existing Tab Components (REUSE - DO NOT SIMPLIFY)
import { ExecutiveSummaryPanel } from '../NarrativeModules/ExecutiveSummaryPanel';
// DELETED (2025-01-18): KeywordStrategyPanel - keyword intelligence cleanup
// import { KeywordStrategyPanel } from '../NarrativeModules/KeywordStrategyPanel';
// DELETED (2025-01-18): RiskAssessmentPanel - keyword intelligence cleanup
// import { RiskAssessmentPanel } from '../NarrativeModules/RiskAssessmentPanel';
import { EnhancedOverviewTab } from '../ElementAnalysis/EnhancedOverviewTab';
import { MetadataWorkspace } from '../../AsoAiHub/MetadataCopilot/MetadataWorkspace';
import { UnifiedMetadataAuditModule } from '../UnifiedMetadataAuditModule';
// DELETED (2025-01-18): KeywordTrendsTable, SearchDominationTab - keyword intelligence cleanup
// import { KeywordTrendsTable } from '../../KeywordIntelligence/KeywordTrendsTable';
// import { SearchDominationTab } from '../../AsoAiHub/SearchDominationTab';
// Removed: CreativeAnalysisPanel import - creative analysis moved to dedicated module
// DELETED (2025-01-18): CompetitiveKeywordAnalysis - keyword intelligence cleanup
// import { CompetitiveKeywordAnalysis } from '../CompetitiveKeywordAnalysis';
// DELETED (2025-01-18): InlineKeywordPlaceholder - keyword intelligence cleanup
// import { InlineKeywordPlaceholder } from '../KeywordDisabledPlaceholder';
import { SectionWrapper } from './SectionWrapper';

// Types
import type { ScrapedMetadata } from '@/types/aso';

interface SlideViewPanelProps {
  metadata: ScrapedMetadata;
  auditData: {
    overallScore: number;
    metadataScore: number;
    keywordScore: number;
    competitorScore: number;
    opportunityCount: number;
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
    narratives?: {
      executiveSummary: any;
      keywordStrategy: any;
      riskAssessment: any;
      competitorStory: any;
    };
    brandRisk?: any;
  } | null;
  organizationId: string;
  isLoading?: boolean;
}

export const SlideViewPanel: React.FC<SlideViewPanelProps> = ({
  metadata,
  auditData,
  organizationId,
  isLoading = false
}) => {
  const slideViewRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!slideViewRef.current || !auditData) {
      toast.error('Unable to export: audit data not available');
      return;
    }

    setIsExporting(true);

    try {
      console.log('🔍 [SLIDE-VIEW] Starting PDF export...');
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = slideViewRef.current;

      // Temporarily adjust styles for PDF
      const originalStyles = element.style.cssText;
      element.style.backgroundColor = '#09090b'; // zinc-950
      element.style.width = '1200px';
      element.style.padding = '40px';

      console.log('📸 [SLIDE-VIEW] Capturing slide view...');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#09090b',
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        logging: false
      });

      console.log('✅ [SLIDE-VIEW] Canvas captured, generating PDF...');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 0.95);

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = (pdfWidth - margin * 2) / (imgWidth * 0.264583); // Convert px to mm

      const scaledWidth = pdfWidth - margin * 2;
      const scaledHeight = (imgHeight * 0.264583) * ratio;

      let yOffset = margin;
      let remainingHeight = scaledHeight;
      let sourceY = 0;

      // Add pages as needed
      while (remainingHeight > 0) {
        const pageHeight = Math.min(remainingHeight, pdfHeight - margin * 2);

        if (sourceY > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          imgData,
          'PNG',
          margin,
          yOffset,
          scaledWidth,
          scaledHeight,
          undefined,
          'FAST'
        );

        remainingHeight -= (pdfHeight - margin * 2);
        sourceY += (pdfHeight - margin * 2);
        yOffset = -(pdfHeight - margin * 2);
      }

      const filename = `${metadata.name.replace(/[^a-z0-9]/gi, '_')}_ASO_Complete_Audit_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      // Restore styles
      element.style.cssText = originalStyles;

      console.log('✅ [SLIDE-VIEW] PDF export completed successfully');
      toast.success('Complete audit slide view PDF downloaded successfully');

    } catch (error) {
      console.error('❌ [SLIDE-VIEW] PDF export failed:', error);
      toast.error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !auditData) {
    return (
      <div className="space-y-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Sparkles className="h-12 w-12 text-yodel-orange mx-auto mb-4 animate-pulse" />
            <p className="text-zinc-400 text-lg">Generating comprehensive audit slide view...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use centralized score color and label utilities
  const scoreColor = getScoreColor(auditData.overallScore);
  const scoreLabel = getScoreLabel(auditData.overallScore);

  return (
    <div className="space-y-8">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExportPDF}
          disabled={isExporting}
          variant="outline"
          size="lg"
          className="text-red-400 border-red-400/30 hover:bg-red-400/10"
        >
          <FileSpreadsheet className={`h-5 w-5 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
          {isExporting ? 'Generating PDF...' : 'Export Complete Audit to PDF'}
        </Button>
      </div>

      {/* Slide View Content */}
      <div ref={slideViewRef} className="space-y-12 bg-zinc-950 p-8 rounded-lg">

        {/* Header */}
        <div className="text-center space-y-6 pb-8 border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent rounded-t-lg -m-8 p-8 mb-12">
          <div className="flex items-center justify-center space-x-4">
            {metadata.icon && (
              <img
                src={metadata.icon}
                alt={metadata.name}
                className="w-20 h-20 rounded-2xl border-2 border-zinc-700 shadow-lg"
              />
            )}
            <div className="text-center">
              <h1 className="text-4xl font-bold text-foreground mb-1">{metadata.name}</h1>
              <div className="flex items-center justify-center gap-2 mb-2">
                {metadata.subtitle ? (
                  <>
                    <p className="text-zinc-300 text-lg font-medium">
                      {metadata.subtitle}
                    </p>
                    {metadata.subtitleSource && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
                        Source: {metadata.subtitleSource}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-zinc-500 text-base italic">No subtitle set</p>
                )}
              </div>
              <p className="text-zinc-400 text-base">
                {metadata.applicationCategory} • {metadata.locale}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-4">
            <Badge className={`text-xl px-6 py-2 ${scoreColor} bg-zinc-900/50 border-zinc-700`}>
              Overall Score: {formatNumber.score(auditData.overallScore)}/100
            </Badge>
            <Badge variant="outline" className="text-base px-4 py-1.5 border-zinc-700 text-zinc-300">
              {scoreLabel}
            </Badge>
          </div>
        </div>

        {/* KPI Summary */}
        <div>
          <SectionWrapper icon={Brain} title="Performance Metrics" iconColor="text-emerald-400">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-5 text-center min-h-[100px] flex flex-col justify-center">
                  <p className="text-sm text-zinc-400 mb-2 font-medium">Overall</p>
                  <p className={`text-3xl font-bold ${scoreColor}`}>{formatNumber.score(auditData.overallScore)}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-5 text-center min-h-[100px] flex flex-col justify-center">
                  <p className="text-sm text-zinc-400 mb-2 font-medium">Metadata</p>
                  <p className={`text-3xl font-bold ${getScoreColor(auditData.metadataScore)}`}>{formatNumber.score(auditData.metadataScore)}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-5 text-center min-h-[100px] flex flex-col justify-center">
                  <p className="text-sm text-zinc-400 mb-2 font-medium">Keywords</p>
                  <p className={`text-3xl font-bold ${getScoreColor(auditData.keywordScore)}`}>{formatNumber.score(auditData.keywordScore)}</p>
                </CardContent>
              </Card>
              {/* Creative score removed - use Creative Intelligence module for visual analysis */}
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-5 text-center min-h-[100px] flex flex-col justify-center">
                  <p className="text-sm text-zinc-400 mb-2 font-medium">Competitive</p>
                  <p className={`text-3xl font-bold ${getScoreColor(auditData.competitorScore)}`}>{formatNumber.score(auditData.competitorScore)}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-5 text-center min-h-[100px] flex flex-col justify-center">
                  <p className="text-sm text-zinc-400 mb-2 font-medium">Opportunities</p>
                  <p className="text-3xl font-bold text-emerald-400">{auditData.opportunityCount}</p>
                </CardContent>
              </Card>
            </div>
          </SectionWrapper>
        </div>

        {/* Section 1: Executive Summary */}
        <SectionWrapper icon={Sparkles} title="Executive Summary" iconColor="text-emerald-400">
          <ExecutiveSummaryPanel
            narrative={auditData.narratives?.executiveSummary || null}
            overallScore={auditData.overallScore}
            isLoading={false}
          />
        </SectionWrapper>

        {/* Section 2: Element-by-Element Overview */}
        <SectionWrapper icon={Eye} title="Element-by-Element Analysis" iconColor="text-blue-400">
          {AUDIT_METADATA_V2_ENABLED ? (
            <UnifiedMetadataAuditModule
              app_id={metadata.app_id}
              platform={metadata.platform}
              locale={metadata.locale}
              monitored_app_id={metadata.id}
            />
          ) : (
            <EnhancedOverviewTab
              metadata={metadata}
              competitorData={auditData.competitorAnalysis}
              isLoading={false}
            />
          )}
        </SectionWrapper>

        {/* Section 3: Keyword Strategy - DELETED (2025-01-18) */}
        {/* DELETED: KeywordStrategyPanel removed - keyword intelligence cleanup
        {AUDIT_KEYWORDS_ENABLED ? (
          <SectionWrapper icon={Target} title="Keyword Strategy" iconColor="text-blue-400">
            <KeywordStrategyPanel
              narrative={auditData.narratives?.keywordStrategy || null}
              brandRisk={auditData.brandRisk || null}
              keywordScore={auditData.keywordScore}
              isLoading={false}
            />
          </SectionWrapper>
        ) : (
          <SectionWrapper icon={Target} title="Keyword Strategy" iconColor="text-zinc-500">
            <InlineKeywordPlaceholder message="Keyword strategy analysis requires keyword intelligence mode" />
          </SectionWrapper>
        )}
        */}

        {/* Section 4: Metadata Analysis - Hidden when ENABLE_METADATA_BLOCKS_IN_AUDIT=false */}
        {/* Does NOT affect Metadata Copilot page - that uses MetadataWorkspace directly */}
        {ENABLE_METADATA_BLOCKS_IN_AUDIT && (
          <SectionWrapper icon={FileText} title="Metadata Optimization" iconColor="text-emerald-400">
            <MetadataWorkspace
              initialData={metadata}
              organizationId={organizationId}
            />
          </SectionWrapper>
        )}

        {/* Section 5: Keyword Trends - DELETED (2025-01-18) */}
        {/* DELETED: KeywordTrendsTable removed - keyword intelligence cleanup
        {AUDIT_KEYWORDS_ENABLED ? (
          <SectionWrapper icon={TrendingUp} title="Keyword Trends" iconColor="text-blue-400">
            <KeywordTrendsTable
              trends={auditData.keywordTrends || []}
              isLoading={false}
              onTimeframeChange={() => {}}
              selectedTimeframe={30}
            />
          </SectionWrapper>
        ) : (
          <SectionWrapper icon={TrendingUp} title="Keyword Trends" iconColor="text-zinc-500">
            <InlineKeywordPlaceholder message="Keyword trend analysis requires keyword intelligence mode" />
          </SectionWrapper>
        )}
        */}

        {/* Section 6: Search Domination - DELETED (2025-01-18) */}
        {/* DELETED: SearchDominationTab removed - keyword intelligence cleanup
        {AUDIT_KEYWORDS_ENABLED ? (
          <SectionWrapper icon={Target} title="Search Visibility Analysis" iconColor="text-blue-400">
            <SearchDominationTab
              scrapedAppData={metadata}
              organizationId={organizationId}
            />
          </SectionWrapper>
        ) : (
          <SectionWrapper icon={Target} title="Search Visibility Analysis" iconColor="text-zinc-500">
            <InlineKeywordPlaceholder message="Search visibility analysis requires keyword intelligence mode" />
          </SectionWrapper>
        )}
        */}

        {/* DELETED (2025-11-21): Section 7: Creative Analysis - moved to dedicated Creative Intelligence module */}
        {/* DELETED (2025-01-18): Sections 8, 9, 10 - Competitive Analysis, Risk Assessment, Priority Action Items - keyword intelligence cleanup */}

        {/* Footer */}
        <div className="pt-8 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>AI-Powered ASO Audit • Generated by Yodel ASO Insight</span>
            </div>
            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
