/**
 * Screenshot Analysis Service
 *
 * Orchestrates all screenshot analysis utilities:
 * - Color extraction
 * - Text estimation (Phase 1B) or Advanced OCR (Phase 2)
 * - Theme classification
 * - Layout analysis
 *
 * Phase 1B: Screenshot Analysis Integration
 * Phase 2: Advanced OCR Integration
 */

import { extractColors, ColorExtractionResult } from '../utils/colorExtractor';
import { estimateText, TextEstimationResult } from '../utils/ocrExtractor';
import { classifyTheme, ThemeClassification } from '../utils/themeClassifier';
import { analyzeLayout, LayoutAnalysis } from '../utils/layoutAnalyzer';
import { advancedOcrService, OcrResult } from './advancedOcrService';

export interface ScreenshotAnalysisResult {
  screenshotUrl: string;
  screenshotIndex: number;
  colors: ColorExtractionResult;
  text: TextEstimationResult;
  ocr?: OcrResult; // Phase 2: Real OCR result
  theme: ThemeClassification;
  layout: LayoutAnalysis;
  analyzedAt: Date;
  processingTime: number; // in milliseconds
}

export interface BatchAnalysisResult {
  results: ScreenshotAnalysisResult[];
  totalProcessingTime: number;
  successCount: number;
  errorCount: number;
  errors?: Array<{ index: number; error: string }>;
}

/**
 * Analyze a single screenshot
 *
 * @param useAdvancedOcr - If true, uses Tesseract.js for real text extraction (Phase 2)
 */
export async function analyzeScreenshot(
  screenshotUrl: string,
  screenshotIndex: number,
  useAdvancedOcr: boolean = false
): Promise<ScreenshotAnalysisResult> {
  const startTime = Date.now();

  try {
    console.log(`[ScreenshotAnalysis] Analyzing screenshot ${screenshotIndex}:`, screenshotUrl);
    console.log(`[ScreenshotAnalysis] Advanced OCR: ${useAdvancedOcr ? 'enabled' : 'disabled'}`);

    // Run analysis pipeline
    // 1. Extract colors (fast: ~50-100ms)
    const colors = await extractColors(screenshotUrl, 5);
    console.log(`[ScreenshotAnalysis] Colors extracted:`, colors.dominantColors.length);

    // 2. Text analysis
    let text: TextEstimationResult;
    let ocr: OcrResult | undefined;

    if (useAdvancedOcr) {
      // Phase 2: Real OCR using Tesseract.js (~2-5 seconds)
      console.log(`[ScreenshotAnalysis] Running advanced OCR...`);
      ocr = await advancedOcrService.extractText(screenshotUrl);
      console.log(`[ScreenshotAnalysis] OCR complete: "${ocr.text.substring(0, 50)}..." (${ocr.words.length} words)`);

      // Also run estimation for compatibility
      text = await estimateText(screenshotUrl);
    } else {
      // Phase 1B: Estimation only (~100-200ms)
      text = await estimateText(screenshotUrl);
      console.log(`[ScreenshotAnalysis] Text estimated: ${text.estimatedTextPercentage.toFixed(1)}%`);
    }

    // 3. Classify theme (instant: based on color data)
    const theme = classifyTheme(colors);
    console.log(`[ScreenshotAnalysis] Theme classified: ${theme.primary}`);

    // 4. Analyze layout (instant: based on text + color data)
    const layout = analyzeLayout(text, colors);
    console.log(`[ScreenshotAnalysis] Layout analyzed: ${layout.layoutType}`);

    const processingTime = Date.now() - startTime;
    console.log(`[ScreenshotAnalysis] Analysis complete in ${processingTime}ms`);

    return {
      screenshotUrl,
      screenshotIndex,
      colors,
      text,
      ocr,
      theme,
      layout,
      analyzedAt: new Date(),
      processingTime
    };
  } catch (error) {
    console.error(`[ScreenshotAnalysis] Failed to analyze screenshot ${screenshotIndex}:`, error);
    throw new Error(
      `Analysis failed for screenshot ${screenshotIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Analyze multiple screenshots in batch
 *
 * @param useAdvancedOcr - If true, uses Tesseract.js for real text extraction (Phase 2)
 */
export async function analyzeBatch(
  screenshotUrls: string[],
  useAdvancedOcr: boolean = false
): Promise<BatchAnalysisResult> {
  const batchStartTime = Date.now();
  console.log(`[ScreenshotAnalysis] Starting batch analysis of ${screenshotUrls.length} screenshots`);
  console.log(`[ScreenshotAnalysis] Advanced OCR: ${useAdvancedOcr ? 'enabled' : 'disabled'}`);

  const results: ScreenshotAnalysisResult[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Process screenshots sequentially to avoid overloading browser
  for (let i = 0; i < screenshotUrls.length; i++) {
    try {
      const result = await analyzeScreenshot(screenshotUrls[i], i, useAdvancedOcr);
      results.push(result);
    } catch (error) {
      console.error(`[ScreenshotAnalysis] Batch error at index ${i}:`, error);
      errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const totalProcessingTime = Date.now() - batchStartTime;

  console.log(`[ScreenshotAnalysis] Batch complete: ${results.length} success, ${errors.length} errors in ${totalProcessingTime}ms`);

  return {
    results,
    totalProcessingTime,
    successCount: results.length,
    errorCount: errors.length,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Get summary statistics from batch analysis
 */
export function getBatchSummary(batchResult: BatchAnalysisResult): {
  averageTextDensity: number;
  mostCommonTheme: string;
  mostCommonLayout: string;
  averageColorCount: number;
  averageLayoutScore: number;
} {
  if (batchResult.results.length === 0) {
    return {
      averageTextDensity: 0,
      mostCommonTheme: 'unknown',
      mostCommonLayout: 'unknown',
      averageColorCount: 0,
      averageLayoutScore: 0
    };
  }

  // Calculate averages
  const totalTextDensity = batchResult.results.reduce(
    (sum, r) => sum + r.text.textDensity,
    0
  );
  const averageTextDensity = totalTextDensity / batchResult.results.length;

  const totalColorCount = batchResult.results.reduce(
    (sum, r) => sum + r.colors.colorCount,
    0
  );
  const averageColorCount = totalColorCount / batchResult.results.length;

  const totalLayoutScore = batchResult.results.reduce(
    (sum, r) => sum + r.layout.layoutScore,
    0
  );
  const averageLayoutScore = totalLayoutScore / batchResult.results.length;

  // Find most common theme
  const themeCounts = new Map<string, number>();
  batchResult.results.forEach(r => {
    const count = themeCounts.get(r.theme.primary) || 0;
    themeCounts.set(r.theme.primary, count + 1);
  });
  const mostCommonTheme = Array.from(themeCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || 'unknown';

  // Find most common layout
  const layoutCounts = new Map<string, number>();
  batchResult.results.forEach(r => {
    const count = layoutCounts.get(r.layout.layoutType) || 0;
    layoutCounts.set(r.layout.layoutType, count + 1);
  });
  const mostCommonLayout = Array.from(layoutCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || 'unknown';

  return {
    averageTextDensity,
    mostCommonTheme,
    mostCommonLayout,
    averageColorCount,
    averageLayoutScore
  };
}
