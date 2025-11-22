/**
 * Screenshot Analysis Panel Component
 *
 * Main panel displaying complete screenshot analysis results.
 * Shows colors, text density, theme, layout, and OCR (Phase 2) in expandable cards.
 *
 * Phase 1B: Screenshot Analysis Integration
 * Phase 2: Advanced OCR Integration
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronDown, Palette, Type, Sparkles, Layout, Clock, TrendingUp, Scroll } from 'lucide-react';
import { ScreenshotAnalysisResult } from '../services/screenshotAnalysisService';
import { ColorPaletteStrip } from './ColorPaletteStrip';
import { TextDensityMeter } from './TextDensityMeter';
import { ThemeTags } from './ThemeTags';
import { OcrResultsPanel } from './OcrResultsPanel';
import { getLayoutDescription, getLayoutColor } from '../utils/layoutAnalyzer';

interface ScreenshotAnalysisPanelProps {
  analysis: ScreenshotAnalysisResult;
  screenshotUrl: string;
  className?: string;
}

export function ScreenshotAnalysisPanel({
  analysis,
  screenshotUrl,
  className = ''
}: ScreenshotAnalysisPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Screenshot Analysis
            </CardTitle>
            <CardDescription>
              AI-powered visual and layout analysis
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
            <ChevronDown
              className={`ml-1 h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted border border-border">
            <div className="text-xs text-muted-foreground mb-1">Processing Time</div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-sm font-semibold">{analysis.processingTime}ms</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted border border-border">
            <div className="text-xs text-muted-foreground mb-1">Colors</div>
            <div className="flex items-center gap-1">
              <Palette className="h-3 w-3 text-primary" />
              <span className="text-sm font-semibold">{analysis.colors.colorCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted border border-border">
            <div className="text-xs text-muted-foreground mb-1">Text Coverage</div>
            <div className="flex items-center gap-1">
              <Type className="h-3 w-3 text-primary" />
              <span className="text-sm font-semibold">
                {analysis.text.estimatedTextPercentage.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted border border-border">
            <div className="text-xs text-muted-foreground mb-1">Layout Score</div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-sm font-semibold">{analysis.layout.layoutScore}/100</span>
            </div>
          </div>
        </div>

        {/* Quick insights */}
        {!isExpanded && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge
                variant="outline"
                className={`capitalize ${getLayoutColor(analysis.layout.layoutType)}`}
              >
                {analysis.layout.layoutType}
              </Badge>
              <span className="text-muted-foreground">layout</span>
            </div>

            {analysis.layout.insights.length > 0 && (
              <p className="text-xs text-muted-foreground">
                💡 {analysis.layout.insights[0]}
              </p>
            )}
          </div>
        )}

        {/* Detailed analysis (expandable) */}
        {isExpanded && (
          <Accordion type="multiple" className="w-full">
            {/* Color Analysis */}
            <AccordionItem value="colors">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span>Color Palette</span>
                  <Badge variant="secondary" className="text-xs">
                    {analysis.colors.colorCount} colors
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <ColorPaletteStrip colors={analysis.colors.dominantColors} />

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground">Brightness:</span>
                      <span className="ml-1 font-medium">
                        {(analysis.colors.averageBrightness * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground">Saturation:</span>
                      <span className="ml-1 font-medium">
                        {(analysis.colors.averageSaturation * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Text Analysis */}
            <AccordionItem value="text">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <span>Text Density</span>
                  <Badge variant="secondary" className="text-xs">
                    {analysis.text.estimatedTextPercentage.toFixed(0)}%
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <TextDensityMeter textData={analysis.text} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* OCR Results (Phase 2) */}
            {analysis.ocr && (
              <AccordionItem value="ocr">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Scroll className="h-4 w-4" />
                    <span>Extracted Text (OCR)</span>
                    <Badge variant="secondary" className="text-xs">
                      {analysis.ocr.words.length} words
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        analysis.ocr.confidence > 0.8
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : analysis.ocr.confidence > 0.6
                          ? 'bg-amber-100 text-amber-700 border-amber-300'
                          : 'bg-red-100 text-red-700 border-red-300'
                      }
                    >
                      {(analysis.ocr.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    {/* Extracted text preview */}
                    {analysis.ocr.text.trim().length > 0 ? (
                      <div className="p-3 rounded-md bg-muted border border-border text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {analysis.ocr.text}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No text detected
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Theme Analysis */}
            <AccordionItem value="theme">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Visual Theme</span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {analysis.theme.primary}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <ThemeTags theme={analysis.theme} showReasons />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Layout Analysis */}
            <AccordionItem value="layout">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  <span>Layout Analysis</span>
                  <Badge variant="secondary" className="text-xs">
                    Score: {analysis.layout.layoutScore}/100
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {/* Layout type */}
                  <div className="space-y-1">
                    <div
                      className={`inline-block px-3 py-1.5 rounded-md border text-sm font-medium capitalize ${getLayoutColor(analysis.layout.layoutType)}`}
                    >
                      {analysis.layout.layoutType}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getLayoutDescription(analysis.layout.layoutType)}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground">Text/Image Ratio:</span>
                      <span className="ml-1 font-medium">
                        {(analysis.layout.textToImageRatio * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground">Visual Density:</span>
                      <span className="ml-1 font-medium">
                        {(analysis.layout.visualDensity * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* CTA detection */}
                  {analysis.layout.hasCTA && (
                    <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200 text-xs">
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        CTA Detected
                      </Badge>
                      <span className="text-green-700">
                        in {analysis.layout.ctaPosition} section
                      </span>
                    </div>
                  )}

                  {/* Insights */}
                  {analysis.layout.insights.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Insights:</span>
                      <ul className="space-y-1">
                        {analysis.layout.insights.map((insight, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
