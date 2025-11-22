import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { BrandedLoadingSpinner } from '@/components/ui/LoadingSkeleton';
import { ScrapedMetadata } from '@/types/aso';
import { debug, metadataDigest } from '@/lib/logging';
import { AppElementAnalysisService, ComprehensiveElementAnalysis } from '@/services/app-element-analysis.service';
import { UnifiedNameTitleAnalysisCard } from './UnifiedNameTitleAnalysisCard';
import { SubtitleAnalysisCard } from './SubtitleAnalysisCard';
import { DescriptionAnalysisCard } from './DescriptionAnalysisCard';
// IconAnalysisCard removed - icons are visual assets, not text metadata
// MetadataScoringPanel removed - replaced by UnifiedMetadataAuditModule (V2) in Audit V2 tab

interface EnhancedOverviewTabProps {
  metadata: ScrapedMetadata;
  competitorData?: any[];
  isLoading?: boolean;
}

export const EnhancedOverviewTab: React.FC<EnhancedOverviewTabProps> = ({
  metadata,
  competitorData,
  isLoading = false
}) => {
  const [analysis, setAnalysis] = useState<ComprehensiveElementAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const performAnalysis = async () => {
      if (!metadata) return;

      // Debug-gated log with privacy-safe digest
      debug('ELEMENT-ANALYSIS', 'Metadata received for analysis', metadataDigest(metadata));

      setAnalyzing(true);
      try {
        const result = await AppElementAnalysisService.analyzeAllElements(metadata, competitorData);
        setAnalysis(result);
      } catch (error) {
        console.error('Element analysis failed:', error);
      } finally {
        setAnalyzing(false);
      }
    };

    performAnalysis();
  }, [metadata, competitorData]);

  if (isLoading || analyzing) {
    return <BrandedLoadingSpinner message="Analyzing App Elements" description="Analyzing app elements..." />;
  }

  if (!analysis) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Unable to analyze app elements</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Summary */}
      <Card className="bg-gradient-to-r from-card to-muted border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-400" />
              <span>Element-by-Element ASO Analysis</span>
            </div>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-lg px-3 py-1">
              {analysis.overallScore}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{analysis.appName.score}</div>
              <div className="text-sm text-muted-foreground">App Name</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{analysis.title.score}</div>
              <div className="text-sm text-muted-foreground">Title</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{analysis.subtitle.score}</div>
              <div className="text-sm text-muted-foreground">Subtitle</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{analysis.description.score}</div>
              <div className="text-sm text-muted-foreground">Description</div>
            </div>
            {/* Icon score removed - icons are visual assets, use Creative Intelligence for icon analysis */}
          </div>
        </CardContent>
      </Card>

      {/* Element Analysis Grid - Text Metadata Only */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UnifiedNameTitleAnalysisCard
          appNameAnalysis={analysis.appName}
          titleAnalysis={analysis.title}
          appName={metadata.name}
          title={metadata.title}
        />
        <SubtitleAnalysisCard
          analysis={analysis.subtitle}
          subtitle={metadata.subtitle || ''}
        />
        <DescriptionAnalysisCard
          analysis={analysis.description}
          description={metadata.description || ''}
        />
        {/* Icon analysis removed - icons are visual assets, use Creative Intelligence module */}
      </div>

      {/* Metadata Scoring Panel removed - replaced by UnifiedMetadataAuditModule (V2) in Audit V2 tab */}
      {/* For comprehensive metadata scoring with 15+ rules, benchmarks, and recommendations, use the "Audit V2" tab */}

      {/* Visual analysis removed - use Creative Intelligence module for screenshots and icons */}
    </div>
  );
};