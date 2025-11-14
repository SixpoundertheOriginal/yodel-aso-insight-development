import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Target, Palette, Users, Shield, AlertTriangle, Sparkles, FileSpreadsheet, Brain } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { SlideSection } from './SlideSection';
import { CompactExecutiveSummary } from './CompactExecutiveSummary';
import { CompactKeywordSummary } from './CompactKeywordSummary';
import { CompactMetadataSummary } from './CompactMetadataSummary';
import { CompactCreativeSummary } from './CompactCreativeSummary';
import { CompactCompetitorSummary } from './CompactCompetitorSummary';
import { CompactRiskSummary } from './CompactRiskSummary';
import { ActionItemsSummary } from './ActionItemsSummary';
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
    currentKeywords: string[];
    metadataAnalysis: any;
    competitorAnalysis: any[];
    recommendations: any[];
    narratives?: {
      executiveSummary: any;
      keywordStrategy: any;
      riskAssessment: any;
      competitorStory: any;
    };
    brandRisk?: any;
  } | null;
  isLoading?: boolean;
}

export const SlideViewPanel: React.FC<SlideViewPanelProps> = ({
  metadata,
  auditData,
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

      const filename = `${metadata.name.replace(/[^a-z0-9]/gi, '_')}_ASO_Slide_View_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      // Restore styles
      element.style.cssText = originalStyles;

      console.log('✅ [SLIDE-VIEW] PDF export completed successfully');
      toast.success('Slide View PDF downloaded successfully');

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

  const highOpportunityCount = auditData.currentKeywords?.filter(k =>
    auditData.keywordClusters?.some(cluster =>
      cluster.relatedKeywords?.includes(k) && cluster.opportunityScore > 0.7
    )
  ).length || auditData.opportunityCount || 0;

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
          {isExporting ? 'Generating PDF...' : 'Export Slide View to PDF'}
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
          <SlideSection icon={Brain} title="KPI Summary" iconColor="text-yodel-orange" />
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
        </div>

        {/* Executive Summary */}
        <div>
          <SlideSection icon={Sparkles} title="Executive Summary" iconColor="text-yodel-orange" />
          <CompactExecutiveSummary
            narrative={auditData.narratives?.executiveSummary || null}
            overallScore={auditData.overallScore}
          />
        </div>

        {/* Metadata Summary */}
        <div>
          <SlideSection icon={FileText} title="Metadata Summary" iconColor="text-green-400" />
          <CompactMetadataSummary
            metadataScore={auditData.metadataScore}
            metadataAnalysis={auditData.metadataAnalysis}
          />
        </div>

        {/* Keyword Summary */}
        <div>
          <SlideSection icon={Target} title="Keyword Summary" iconColor="text-blue-400" />
          <CompactKeywordSummary
            keywordScore={auditData.keywordScore}
            brandRisk={auditData.brandRisk || null}
            topClusters={auditData.keywordClusters?.slice(0, 3) || []}
            highOpportunityCount={highOpportunityCount}
          />
        </div>

        {/* Creative Summary */}
        <div>
          <SlideSection icon={Palette} title="Creative Summary" iconColor="text-pink-400" />
          <CompactCreativeSummary metadata={metadata} creativeScore={75} />
        </div>

        {/* Competitor Summary */}
        <div>
          <SlideSection icon={Users} title="Competitor Summary" iconColor="text-purple-400" />
          <CompactCompetitorSummary
            competitorScore={auditData.competitorScore}
            competitorCount={auditData.competitorAnalysis?.length || 0}
            sharedKeywordsCount={Math.floor(auditData.currentKeywords?.length * 0.4) || 0}
            uniqueOpportunitiesCount={highOpportunityCount}
            marketPosition={auditData.narratives?.competitorStory?.marketPosition}
          />
        </div>

        {/* Risk Summary */}
        <div>
          <SlideSection icon={Shield} title="Risk Summary" iconColor="text-orange-400" />
          <CompactRiskSummary narrative={auditData.narratives?.riskAssessment || null} />
        </div>

        {/* Action Items */}
        <div>
          <SlideSection icon={AlertTriangle} title="Priority Action Items" iconColor="text-yodel-orange" />
          <ActionItemsSummary recommendations={auditData.recommendations || []} />
        </div>

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
