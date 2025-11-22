/**
 * OCR Results Panel Component
 *
 * Displays extracted text from Tesseract.js OCR.
 * Shows full text, confidence scores, word count, and individual words.
 *
 * Phase 2: Advanced OCR Integration
 */

import { OcrResult } from '../services/advancedOcrService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scroll, CheckCircle2, AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface OcrResultsPanelProps {
  ocr: OcrResult;
  className?: string;
}

export function OcrResultsPanel({ ocr, className = '' }: OcrResultsPanelProps) {
  // Calculate confidence level
  const confidencePercent = (ocr.confidence * 100).toFixed(1);
  const confidenceLevel = ocr.confidence > 0.8 ? 'high' : ocr.confidence > 0.6 ? 'medium' : 'low';

  // Get confidence color
  const confidenceColor =
    confidenceLevel === 'high'
      ? 'text-green-700 bg-green-100 border-green-300'
      : confidenceLevel === 'medium'
      ? 'text-amber-700 bg-amber-100 border-amber-300'
      : 'text-red-700 bg-red-100 border-red-300';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scroll className="h-5 w-5" />
            Extracted Text (OCR)
          </CardTitle>
          <div className="flex items-center gap-2">
            {confidenceLevel === 'high' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            <Badge variant="outline" className={confidenceColor}>
              {confidencePercent}% confidence
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded bg-muted text-center">
            <div className="text-xs text-muted-foreground">Words</div>
            <div className="text-lg font-semibold">{ocr.words.length}</div>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <div className="text-xs text-muted-foreground">Lines</div>
            <div className="text-lg font-semibold">{ocr.lines.length}</div>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <div className="text-xs text-muted-foreground">Processing</div>
            <div className="text-lg font-semibold">{ocr.processingTime}ms</div>
          </div>
        </div>

        {/* Extracted text */}
        {ocr.text.trim().length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Full Text:</div>
            <div className="p-3 rounded-md bg-muted border border-border text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {ocr.text}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-md bg-muted border border-border text-center text-sm text-muted-foreground">
            No text detected in this screenshot
          </div>
        )}

        {/* Detailed word list (accordion) */}
        {ocr.words.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="words">
              <AccordionTrigger className="text-sm">
                View All Words ({ocr.words.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {ocr.words.map((word, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted text-sm"
                    >
                      <span className="font-mono">{word.text}</span>
                      <Badge
                        variant="outline"
                        className={
                          word.confidence > 0.8
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : word.confidence > 0.6
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }
                      >
                        {(word.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Info note */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p>
            ℹ️ Text extracted using Tesseract.js OCR engine. Confidence scores indicate recognition accuracy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
