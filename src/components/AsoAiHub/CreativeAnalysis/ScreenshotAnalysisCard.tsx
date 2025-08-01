import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScreenshotAnalysis } from '@/services/creative-analysis.service';
import { ColorPaletteDisplay } from './ColorPaletteDisplay';
import { MessageAnalysisPanel } from './MessageAnalysisPanel';
import { Eye, Palette, MessageSquare, Layout } from 'lucide-react';

interface ScreenshotAnalysisCardProps {
  analysis: ScreenshotAnalysis;
  index: number;
}

export const ScreenshotAnalysisCard: React.FC<ScreenshotAnalysisCardProps> = ({
  analysis,
  index
}) => {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-100">
          <Eye className="w-5 h-5" />
          {analysis.appName} - Screenshot Analysis
          <Badge variant="secondary" className="ml-auto">
            {Math.round(analysis.confidence * 100)}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Screenshot Image */}
        <div className="flex justify-center">
          <img
            src={analysis.screenshotUrl}
            alt={`${analysis.appName} screenshot`}
            className="rounded-lg border border-zinc-700 max-w-[200px] h-auto"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Color Palette */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-medium text-zinc-200">
              <Palette className="w-4 h-4" />
              Color Palette
            </h4>
            <ColorPaletteDisplay colorPalette={analysis.colorPalette} />
          </div>

          {/* Message Analysis */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-medium text-zinc-200">
              <MessageSquare className="w-4 h-4" />
              Message Analysis
            </h4>
            <MessageAnalysisPanel messageAnalysis={analysis.messageAnalysis} />
          </div>
        </div>

        {/* Visual Hierarchy */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-medium text-zinc-200">
            <Layout className="w-4 h-4" />
            Visual Hierarchy & Layout
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-zinc-400 mb-2">Focal Point:</p>
              <p className="text-zinc-300">{analysis.visualHierarchy.focal_point}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-400 mb-2">Layout Type:</p>
              <Badge variant="outline" className="text-zinc-300 border-zinc-600">
                {analysis.visualHierarchy.layout_type}
              </Badge>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-zinc-400 mb-2">Visual Flow:</p>
            <div className="flex flex-wrap gap-2">
              {analysis.visualHierarchy.visual_flow.map((step, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {i + 1}. {step}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Design Patterns & UI Elements */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-zinc-400 mb-2">Design Patterns:</p>
            <div className="flex flex-wrap gap-2">
              {analysis.designPatterns.map((pattern, i) => (
                <Badge key={i} variant="outline" className="text-xs text-zinc-300 border-zinc-600">
                  {pattern}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-sm text-zinc-400 mb-2">UI Elements:</p>
            <div className="flex flex-wrap gap-2">
              {analysis.visualHierarchy.ui_elements.map((element, i) => (
                <Badge key={i} variant="outline" className="text-xs text-zinc-300 border-zinc-600">
                  {element}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Extracted Text */}
        {analysis.textContent.length > 0 && (
          <div>
            <p className="text-sm text-zinc-400 mb-2">Extracted Text:</p>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex flex-wrap gap-2">
                {analysis.textContent.map((text, i) => (
                  <span key={i} className="text-sm text-zinc-300 bg-zinc-700 px-2 py-1 rounded">
                    "{text}"
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};