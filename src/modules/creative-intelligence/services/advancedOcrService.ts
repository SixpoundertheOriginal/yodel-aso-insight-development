/**
 * Advanced OCR Service
 *
 * Real text extraction using Tesseract.js.
 * Replaces estimation-only OCR from Phase 1B with actual text reading.
 *
 * Phase 2: Advanced OCR Integration
 */

import Tesseract, { createWorker, Worker } from 'tesseract.js';

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OcrLine {
  text: string;
  confidence: number;
  words: OcrWord[];
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OcrResult {
  text: string; // Full extracted text
  confidence: number; // Average confidence
  lines: OcrLine[];
  words: OcrWord[];
  processingTime: number; // in milliseconds
}

export interface OcrProgress {
  status: string;
  progress: number; // 0-1
}

/**
 * Advanced OCR Service using Tesseract.js
 */
class AdvancedOcrService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize Tesseract worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        console.log('[AdvancedOCR] Initializing Tesseract worker...');

        this.worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract') {
              console.log(`[AdvancedOCR] ${m.status}: ${(m.progress * 100).toFixed(0)}%`);
            }
          }
        });

        this.isInitialized = true;
        console.log('[AdvancedOCR] Tesseract worker initialized successfully');
      } catch (error) {
        console.error('[AdvancedOCR] Failed to initialize Tesseract:', error);
        this.isInitialized = false;
        this.worker = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Extract text from image URL
   */
  async extractText(
    imageUrl: string,
    onProgress?: (progress: OcrProgress) => void
  ): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      // Ensure worker is initialized
      await this.initialize();

      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }

      console.log('[AdvancedOCR] Starting text extraction for:', imageUrl);

      // Perform OCR
      const result = await this.worker.recognize(imageUrl, {
        logger: (m) => {
          if (onProgress) {
            onProgress({
              status: m.status,
              progress: m.progress
            });
          }
        }
      });

      const processingTime = Date.now() - startTime;

      // Extract structured data
      const lines: OcrLine[] = result.data.lines.map(line => ({
        text: line.text,
        confidence: line.confidence,
        words: line.words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })),
        bbox: line.bbox
      }));

      const words: OcrWord[] = result.data.words.map(word => ({
        text: word.text,
        confidence: word.confidence,
        bbox: word.bbox
      }));

      const ocrResult: OcrResult = {
        text: result.data.text.trim(),
        confidence: result.data.confidence / 100, // Normalize to 0-1
        lines,
        words,
        processingTime
      };

      console.log('[AdvancedOCR] Text extraction complete:', {
        textLength: ocrResult.text.length,
        words: words.length,
        lines: lines.length,
        confidence: (ocrResult.confidence * 100).toFixed(1) + '%',
        processingTime: processingTime + 'ms'
      });

      return ocrResult;
    } catch (error) {
      console.error('[AdvancedOCR] Text extraction failed:', error);
      throw new Error(
        `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract text from multiple images in batch
   */
  async extractTextBatch(
    imageUrls: string[],
    onProgress?: (completed: number, total: number, current: OcrProgress) => void
  ): Promise<OcrResult[]> {
    console.log(`[AdvancedOCR] Starting batch OCR for ${imageUrls.length} images`);

    const results: OcrResult[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const result = await this.extractText(
          imageUrls[i],
          (progress) => {
            if (onProgress) {
              onProgress(i, imageUrls.length, progress);
            }
          }
        );
        results.push(result);
      } catch (error) {
        console.error(`[AdvancedOCR] Failed to process image ${i}:`, error);
        // Push empty result on failure
        results.push({
          text: '',
          confidence: 0,
          lines: [],
          words: [],
          processingTime: 0
        });
      }
    }

    console.log(`[AdvancedOCR] Batch OCR complete: ${results.length} results`);
    return results;
  }

  /**
   * Clean up worker resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      console.log('[AdvancedOCR] Terminating Tesseract worker...');
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.initPromise = null;
      console.log('[AdvancedOCR] Worker terminated');
    }
  }

  /**
   * Get initialization status
   */
  getStatus(): { initialized: boolean; hasWorker: boolean } {
    return {
      initialized: this.isInitialized,
      hasWorker: this.worker !== null
    };
  }
}

// Singleton instance
export const advancedOcrService = new AdvancedOcrService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    advancedOcrService.terminate();
  });
}
