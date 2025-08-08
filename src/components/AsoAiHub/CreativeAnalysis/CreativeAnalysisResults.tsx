import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreativeAnalysisWithAI, type AppInfo } from '@/services/creative-analysis.service';
import { ScreenshotAnalysisCard } from './ScreenshotAnalysisCard';
import { PatternRecognitionSummary } from './PatternRecognitionSummary';
import { FirstImpressionPanel } from './FirstImpressionPanel';

interface CreativeAnalysisResultsProps {
  analysis: CreativeAnalysisWithAI;
  keyword: string;
  apps?: AppInfo[];
}

export const CreativeAnalysisResults: React.FC<CreativeAnalysisResultsProps> = ({
  analysis,
  keyword,
  apps
}) => {
  const { primaryAnalysis, competitorAnalyses, primaryAppInfo, competitorAppInfo } = useMemo(() => {
    if (!apps || apps.length === 0) {
      return {
        primaryAnalysis: analysis,
        competitorAnalyses: [],
        primaryAppInfo: undefined,
        competitorAppInfo: undefined,
      };
    }

    const analysisMap = new Map<string, CreativeAnalysisWithAI>();
    apps.forEach(app => {
      analysisMap.set(app.appId, { success: true, individual: [] });
    });

    analysis.individual.forEach(item => {
      const appAnalysis = analysisMap.get(item.appId);
      if (appAnalysis) {
        appAnalysis.individual.push(item);
      }
    });

    const orderedAnalyses = apps.map(app => analysisMap.get(app.appId) || { success: true, individual: [] });

    return {
      primaryAnalysis: orderedAnalyses[0],
      competitorAnalyses: orderedAnalyses.slice(1),
      primaryAppInfo: apps[0],
      competitorAppInfo: apps.slice(1),
    };
  }, [analysis, apps]);
  if (!analysis.success || analysis.individual.length === 0) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Badge variant="destructive">Failed</Badge>
            <p className="text-foreground">
              {analysis.error || 'No analysis results available'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="analysis" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
        <TabsTrigger value="analysis" className="data-[state=active]:bg-zinc-700">
          Analysis
        </TabsTrigger>
        <TabsTrigger value="first" className="data-[state=active]:bg-zinc-700">
          First Impression
        </TabsTrigger>
      </TabsList>
      <TabsContent value="analysis" className="space-y-6 mt-6">
        {analysis.patterns && (
          <PatternRecognitionSummary
            patterns={analysis.patterns}
            keyword={keyword}
            analysisCount={analysis.individual.length}
          />
        )}

        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-zinc-100">
            Screenshot Analysis Results
          </h3>

          {analysis.individual.map((screenshot, index) => (
            <ScreenshotAnalysisCard
              key={`${screenshot.appId}-${index}`}
              analysis={screenshot}
              index={index}
            />
          ))}
        </div>
      </TabsContent>
      <TabsContent value="first" className="mt-6">
        <FirstImpressionPanel
          analysis={primaryAnalysis}
          competitorAnalyses={competitorAnalyses}
          appInfo={primaryAppInfo}
          competitorAppInfo={competitorAppInfo}
        />
      </TabsContent>
    </Tabs>
  );
};
