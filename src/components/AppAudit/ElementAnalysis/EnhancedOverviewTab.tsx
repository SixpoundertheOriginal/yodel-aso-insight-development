import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { BrandedLoadingSpinner } from '@/components/ui/LoadingSkeleton';
import { ScrapedMetadata } from '@/types/aso';
import { AppElementAnalysisService, ComprehensiveElementAnalysis } from '@/services/app-element-analysis.service';
import { UnifiedNameTitleAnalysisCard } from './UnifiedNameTitleAnalysisCard';
import { SubtitleAnalysisCard } from './SubtitleAnalysisCard';
import { DescriptionAnalysisCard } from './DescriptionAnalysisCard';
import { ScreenshotAnalysisCard } from './ScreenshotAnalysisCard';
import { IconAnalysisCard } from './IconAnalysisCard';

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-400">{analysis.screenshots.score}</div>
              <div className="text-sm text-muted-foreground">Screenshots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{analysis.icon.score}</div>
              <div className="text-sm text-muted-foreground">Icon</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Element Analysis Grid */}
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
        <ScreenshotAnalysisCard 
          analysis={analysis.screenshots} 
          screenshotUrls={
            metadata.screenshots || 
            (Array.isArray(metadata.screenshot) ? metadata.screenshot : metadata.screenshot ? [metadata.screenshot] : [])
          } 
        />
        <IconAnalysisCard 
          analysis={analysis.icon} 
          iconUrl={metadata.icon}
          appName={metadata.name} 
        />
      </div>
    </div>
  );
};