import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet,
  Brain,
  Sparkles,
  Target,
  FileText,
  Palette,
  Users,
  Shield,
  AlertTriangle,
  TrendingUp,
  Eye
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

// Existing Tab Components (REUSE - DO NOT SIMPLIFY)
import { ExecutiveSummaryPanel } from '../NarrativeModules/ExecutiveSummaryPanel';
import { KeywordStrategyPanel } from '../NarrativeModules/KeywordStrategyPanel';
import { RiskAssessmentPanel } from '../NarrativeModules/RiskAssessmentPanel';
import { EnhancedOverviewTab } from '../ElementAnalysis/EnhancedOverviewTab';
import { MetadataWorkspace } from '../../AsoAiHub/MetadataCopilot/MetadataWorkspace';
import { KeywordTrendsTable } from '../../KeywordIntelligence/KeywordTrendsTable';
import { SearchDominationTab } from '../../AsoAiHub/SearchDominationTab';
import { CreativeAnalysisPanel } from '../CreativeAnalysisPanel';
import { CompetitiveKeywordAnalysis } from '../CompetitiveKeywordAnalysis';
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

  const scoreColor =
    auditData.overallScore >= 80 ? 'text-green-400' :
    auditData.overallScore >= 60 ? 'text-blue-400' :
    auditData.overallScore >= 40 ? 'text-yellow-400' : 'text-red-400';

  const scoreLabel =
    auditData.overallScore >= 80 ? 'Excellent' :
    auditData.overallScore >= 60 ? 'Good' :
    auditData.overallScore >= 40 ? 'Fair' : 'Needs Work';

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
      <div ref={slideViewRef} className="space-y-10 bg-zinc-950 p-8 rounded-lg">

        {/* Header */}
        <div className="text-center space-y-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center justify-center space-x-3 mb-2">
            {metadata.icon && (
              <img
                src={metadata.icon}
                alt={metadata.name}
                className="w-16 h-16 rounded-xl border-2 border-zinc-700"
              />
            )}
            <div className="text-left">
              <h1 className="text-3xl font-bold text-foreground">{metadata.name}</h1>
              <p className="text-zinc-400 text-sm">
                {metadata.applicationCategory} • {metadata.locale}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-4">
            <Badge className={`text-xl px-6 py-2 ${scoreColor} bg-zinc-900/50 border-zinc-700`}>
              Overall Score: {auditData.overallScore}/100
            </Badge>
            <Badge variant="outline" className="text-sm px-4 py-1 border-zinc-700">
              {scoreLabel}
            </Badge>
          </div>
        </div>

        {/* KPI Summary */}
        <div>
          <SectionWrapper icon={Brain} title="KPI Summary" iconColor="text-yodel-orange">
            <div className="grid grid-cols-6 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-zinc-400 mb-1">Overall</p>
                  <p className={`text-3xl font-bold ${scoreColor}`}>{auditData.overallScore}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-zinc-400 mb-1">Metadata</p>
                  <p className="text-3xl font-bold text-green-400">{auditData.metadataScore}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-zinc-400 mb-1">Keywords</p>
                  <p className="text-3xl font-bold text-blue-400">{auditData.keywordScore}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-zinc-400 mb-1">Creative</p>
                  <p className="text-3xl font-bold text-pink-400">75</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-zinc-400 mb-1">Competitive</p>
                  <p className="text-3xl font-bold text-purple-400">{auditData.competitorScore}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-zinc-400 mb-1">Opportunities</p>
                  <p className="text-3xl font-bold text-green-400">{auditData.opportunityCount}</p>
                </CardContent>
              </Card>
            </div>
          </SectionWrapper>
        </div>

        {/* Section 1: Executive Summary */}
        <SectionWrapper icon={Sparkles} title="Executive Summary" iconColor="text-yodel-orange">
          <ExecutiveSummaryPanel
            narrative={auditData.narratives?.executiveSummary || null}
            overallScore={auditData.overallScore}
            isLoading={false}
          />
        </SectionWrapper>

        {/* Section 2: Element-by-Element Overview */}
        <SectionWrapper icon={Eye} title="Element-by-Element ASO Analysis" iconColor="text-blue-400">
          <EnhancedOverviewTab
            metadata={metadata}
            competitorData={auditData.competitorAnalysis}
            isLoading={false}
          />
        </SectionWrapper>

        {/* Section 3: Keyword Strategy */}
        <SectionWrapper icon={Target} title="Keyword Strategy" iconColor="text-blue-400">
          <KeywordStrategyPanel
            narrative={auditData.narratives?.keywordStrategy || null}
            brandRisk={auditData.brandRisk || null}
            keywordScore={auditData.keywordScore}
            isLoading={false}
          />
        </SectionWrapper>

        {/* Section 4: Metadata Workspace */}
        <SectionWrapper icon={FileText} title="Metadata Analysis" iconColor="text-green-400">
          <MetadataWorkspace
            initialData={metadata}
            organizationId={organizationId}
          />
        </SectionWrapper>

        {/* Section 5: Keyword Trends */}
        <SectionWrapper icon={TrendingUp} title="Keyword Trends" iconColor="text-purple-400">
          <KeywordTrendsTable
            trends={auditData.keywordTrends || []}
            isLoading={false}
            onTimeframeChange={() => {}}
            selectedTimeframe={30}
          />
        </SectionWrapper>

        {/* Section 6: Search Domination */}
        <SectionWrapper icon={Target} title="Search Domination Analysis" iconColor="text-orange-400">
          <SearchDominationTab
            scrapedAppData={metadata}
            organizationId={organizationId}
          />
        </SectionWrapper>

        {/* Section 7: Creative Analysis */}
        <SectionWrapper icon={Palette} title="Creative Analysis" iconColor="text-pink-400">
          <CreativeAnalysisPanel
            metadata={metadata}
            competitorData={auditData.competitorAnalysis}
            isLoading={false}
          />
        </SectionWrapper>

        {/* Section 8: Competitive Analysis */}
        <SectionWrapper icon={Users} title="Competitive Keyword Analysis" iconColor="text-purple-400">
          <CompetitiveKeywordAnalysis
            competitorData={auditData.competitorAnalysis || []}
            userKeywords={auditData.currentKeywords || []}
            isLoading={false}
          />
        </SectionWrapper>

        {/* Section 9: Risk Assessment */}
        <SectionWrapper icon={Shield} title="Risk Assessment" iconColor="text-orange-400">
          <RiskAssessmentPanel
            narrative={auditData.narratives?.riskAssessment || null}
            isLoading={false}
          />
        </SectionWrapper>

        {/* Section 10: Priority Recommendations */}
        <SectionWrapper icon={AlertTriangle} title="Priority Action Items" iconColor="text-yodel-orange">
          <div className="space-y-3">
            {auditData.recommendations?.map((rec, index) => (
              <Card
                key={index}
                className="bg-gradient-to-r from-zinc-900 to-transparent border-l-4 border-yodel-orange"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start space-x-3 flex-1">
                      <Badge className={`mt-1 ${
                        rec.priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-foreground">{rec.title}</h4>
                          <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-600">
                            {rec.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{rec.description}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Impact</p>
                        <p className={`text-lg font-bold ${
                          rec.priority === 'high' ? 'text-red-400' :
                          rec.priority === 'medium' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`}>{rec.impact}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        rec.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                        rec.priority === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                        'bg-gradient-to-r from-blue-500 to-blue-400'
                      }`}
                      style={{ width: `${rec.impact}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionWrapper>

        {/* Footer */}
        <div className="pt-6 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-3 w-3" />
              <span>AI-Powered ASO Audit • Generated by Yodel ASO Insight</span>
            </div>
            <span>Generated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
