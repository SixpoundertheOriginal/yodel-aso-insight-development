import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreativeAnalysisWithAI, ScreenshotAnalysis } from '@/services/creative-analysis.service';
import { ColorPaletteDisplay } from './ColorPaletteDisplay';
import { MessageAnalysisPanel } from './MessageAnalysisPanel';
import { ScreenshotAnalysisCard } from './ScreenshotAnalysisCard';
import { PatternRecognitionSummary } from './PatternRecognitionSummary';

interface CreativeAnalysisResultsProps {
  analysis: CreativeAnalysisWithAI;
  keyword: string;
}

export const CreativeAnalysisResults: React.FC<CreativeAnalysisResultsProps> = ({
  analysis,
  keyword
}) => {
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
    <div className="space-y-6">
      {/* Pattern Recognition Summary */}
      {analysis.patterns && (
        <PatternRecognitionSummary 
          patterns={analysis.patterns} 
          keyword={keyword} 
        />
      )}

      {/* Individual Screenshot Analysis */}
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
    </div>
  );
};